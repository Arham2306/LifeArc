import { getPromotionLadderForJob } from '../../career/data/careerLadders';
import {
  getJobTemplateById,
  JOB_CATALOG,
} from '../../career/data/jobCatalog';
import type { JobTemplate, PromotionTier } from '../../career/types';
import type { NpcLifeEvent, NpcProfile } from '../types';
import { getCountryEconomicProfile } from './currencyService';
import {
  evaluatePromotionPursuitDecision,
  evaluateRetirementDecision,
  rankCandidatesDeterministically,
} from './decisionEngine';
import { createDeduplicatedLifeEvent } from './migrationService';
import {
  calculateCareerAmbitionScore,
  evolveNpcPersonality,
} from './personalityService';
import type { SeededPRNG } from './seededPrngService';

const clampStat = (val: number): number => Math.max(0, Math.min(100, Math.round(val)));

/**
 * Generates a deterministic company name from a JobTemplate's `companyNameTemplates`.
 */
export function generateDeterministicCompanyName(
  city: string,
  job: JobTemplate,
  prng: SeededPRNG
): string {
  const template = prng.pick(job.companyNameTemplates) ?? '{city} Enterprise';
  return template.replace('{city}', city || 'Metro');
}

/**
 * Collects all diplomas and degrees earned by an NPC into a normalized set.
 */
export function getNpcEarnedDiplomas(npc: NpcProfile): Set<string> {
  const set = new Set<string>(npc.education.diplomas ?? []);
  if (npc.education.degreeEarned) {
    set.add(npc.education.degreeEarned);
  }
  return set;
}

export interface NpcJobEligibility {
  isEligible: boolean;
  isDegreeMatch: boolean;
  matchedDegreeTitle?: string;
}

/**
 * Evaluates whether an NPC is eligible for a given JobTemplate without mutating any state.
 */
export function evaluateNpcJobEligibility(
  npc: NpcProfile,
  job: JobTemplate
): NpcJobEligibility {
  if (npc.age < job.minAge) {
    return { isEligible: false, isDegreeMatch: false };
  }

  const isFullTimeStudent =
    npc.education.currentStage === 'elementary' ||
    npc.education.currentStage === 'middle_school' ||
    npc.education.currentStage === 'high_school' ||
    npc.education.currentStage === 'university' ||
    npc.education.currentStage === 'professional';

  // Full-time students can only take part-time gigs
  if (isFullTimeStudent && job.type !== 'part_time') {
    return { isEligible: false, isDegreeMatch: false };
  }

  const diplomas = getNpcEarnedDiplomas(npc);
  const matchedDegreeTitle = job.requiredDegreeTitles.find((req) => diplomas.has(req));
  const isDegreeMatch = Boolean(matchedDegreeTitle);

  const requiresStrictDegree =
    job.credentialTier === 'bachelors' ||
    job.credentialTier === 'masters_professional';

  if (requiresStrictDegree && !isDegreeMatch) {
    return { isEligible: false, isDegreeMatch: false };
  }

  if (job.requiresHighSchoolDiploma) {
    const hasHS =
      Array.from(diplomas).some((d) => d.toLowerCase().includes('high school')) ||
      diplomas.size > 0 ||
      npc.education.currentStage === 'graduated';
    if (!hasHS) {
      return { isEligible: false, isDegreeMatch: false };
    }
  }

  if (job.minSmarts && npc.smarts < job.minSmarts) {
    return { isEligible: false, isDegreeMatch: false };
  }
  if (job.minHealth && npc.health < job.minHealth) {
    return { isEligible: false, isDegreeMatch: false };
  }
  if (job.minLooks && npc.looks < job.minLooks) {
    return { isEligible: false, isDegreeMatch: false };
  }

  return {
    isEligible: true,
    isDegreeMatch,
    matchedDegreeTitle,
  };
}

/**
 * Computes the utility score of a job template for an NPC based on their degrees,
 * personality traits, intellect, and financial motivation.
 */
export function scoreJobForNpc(
  npc: NpcProfile,
  job: JobTemplate,
  eligibility: NpcJobEligibility,
  prng: SeededPRNG
): number {
  let score = 30;
  const { personality, smarts, looks, health } = npc;

  // Strong preference for jobs that directly utilize the NPC's earned degree
  if (eligibility.isDegreeMatch) {
    score += 45;
  }
  if (job.credentialTier === 'masters_professional' && eligibility.isDegreeMatch) {
    score += 20;
  }

  // Adults who have finished school prefer full-time careers over part-time gigs
  if (job.type === 'full_time') {
    score += 22;
  } else if (job.type === 'freelance') {
    score += personality.openness >= 68 || personality.riskTolerance >= 68 ? 18 : 8;
  }

  // Salary utility weighted by ambition and materialism
  const salaryUtility = Math.min(35, (job.baseSalary / 120000) * 30);
  score +=
    salaryUtility *
    ((personality.ambition * 0.55 + personality.materialism * 0.45) / 70);

  // Career field alignment with personality
  switch (job.field) {
    case 'technology':
    case 'education_science':
      score += (smarts * 0.2 + personality.openness * 0.15) * 0.4;
      break;
    case 'medicine_healthcare':
      score += (personality.empathy * 0.2 + personality.conscientiousness * 0.2) * 0.4;
      break;
    case 'business_finance':
    case 'law_government':
      score += (personality.ambition * 0.22 + personality.extraversion * 0.18) * 0.4;
      break;
    case 'arts_media':
      score += (personality.openness * 0.25 + looks * 0.15) * 0.4;
      break;
    case 'aviation_transport':
    case 'trades_services':
      score += (health * 0.2 + personality.conscientiousness * 0.2) * 0.4;
      break;
    case 'hospitality_retail':
      score += (personality.extraversion * 0.2 + personality.agreeableness * 0.2) * 0.35;
      break;
  }

  return score + prng.nextInt(-4, 4);
}

/**
 * Selects the highest-utility eligible JobTemplate for an NPC.
 */
export function selectBestJobForNpc(
  npc: NpcProfile,
  prng: SeededPRNG
): JobTemplate | null {
  const eligiblePairs: Array<{ job: JobTemplate; eligibility: NpcJobEligibility }> = [];

  for (const job of JOB_CATALOG) {
    if (npc.career.jobId === job.id) continue;
    const eligibility = evaluateNpcJobEligibility(npc, job);
    if (eligibility.isEligible) {
      eligiblePairs.push({ job, eligibility });
    }
  }

  if (eligiblePairs.length === 0) return null;

  const ranked = rankCandidatesDeterministically(
    eligiblePairs.map((p) => ({ id: p.job.id, job: p.job, eligibility: p.eligibility })),
    (item) => scoreJobForNpc(npc, item.job, item.eligibility, prng)
  );

  return ranked[0]?.candidate.job ?? null;
}

/**
 * Scales a USD catalog salary to the NPC's country currency and PPP multiplier.
 */
export function scaleCatalogSalaryToNpcCountry(
  usdBaseSalary: number,
  countryName: string
): number {
  const econ = getCountryEconomicProfile(countryName);
  return Math.max(1000, Math.round(usdBaseSalary * econ.pppCostMultiplier * econ.usdExchangeRate));
}

/**
 * Resolves the next PromotionTier on the NPC's current job ladder, if any.
 */
function findNextPromotionTier(
  npc: NpcProfile,
  jobTemplate: JobTemplate | undefined
): PromotionTier | null {
  if (!npc.career.jobId) return null;

  const baseSalaryUsd = jobTemplate?.baseSalary ?? 45000;
  const baseTitle = jobTemplate?.title ?? npc.career.title;
  const ladder = getPromotionLadderForJob(npc.career.jobId, baseSalaryUsd, baseTitle);

  const currentIdx = ladder.findIndex((t) => t.title === npc.career.title);
  if (currentIdx === -1) {
    return ladder[0] ?? null;
  }
  if (currentIdx + 1 < ladder.length) {
    return ladder[currentIdx + 1];
  }
  return null;
}

export interface NpcCareerYearResult {
  updatedNpc: NpcProfile;
  lifeEvents: NpcLifeEvent[];
}

/**
 * Advances an NPC's career by one simulation year:
 * - Evaluates configurable retirement (default age 60+) with 40% pension.
 * - Handles job applications for unemployed adults or underemployed recent graduates.
 * - Updates annual performance, evaluates promotion ladders, merit raises, and underperformance terminations.
 * Pure function: never mutates the input NPC or any player state.
 */
export function progressNpcCareerForYear(
  npc: NpcProfile,
  currentYear: number,
  prng: SeededPRNG,
  retirementTargetAge = 60
): NpcCareerYearResult {
  if (!npc.isAlive) {
    return { updatedNpc: npc, lifeEvents: [] };
  }

  // Minors (< 18) and full-time students stay in their educational occupation
  if (
    npc.age < 18 ||
    npc.education.currentStage === 'elementary' ||
    npc.education.currentStage === 'middle_school' ||
    npc.education.currentStage === 'high_school' ||
    npc.education.currentStage === 'university' ||
    npc.education.currentStage === 'professional'
  ) {
    return { updatedNpc: npc, lifeEvents: [] };
  }

  const lifeEvents: NpcLifeEvent[] = [];
  const career = {
    ...npc.career,
    history: [...npc.career.history],
  };
  const finances = { ...npc.finances };
  let personality = { ...npc.personality };
  let happiness = npc.happiness;

  // 1. Already Retired
  if (career.isRetired) {
    career.occupation = 'Retired';
    career.title = 'Retired';
    career.salary = 0;
    finances.annualIncome = career.pensionAnnual;
    return {
      updatedNpc: { ...npc, career, finances },
      lifeEvents,
    };
  }

  // 2. Retirement Check at or above `retirementTargetAge` (default 60)
  if (npc.age >= retirementTargetAge) {
    const isEmployed = Boolean(career.jobId) || career.salary > 0;
    if (isEmployed) {
      // Synthesize a temporary jobId if migrated legacy NPC only had occupation/salary
      const npcForRetireCheck: NpcProfile = {
        ...npc,
        career: {
          ...career,
          jobId: career.jobId ?? 'legacy_occupation',
        },
      };
      const retireDecision = evaluateRetirementDecision(
        npcForRetireCheck,
        retirementTargetAge,
        prng
      );
      const mandatoryAgeReached = npc.age >= retirementTargetAge + 12;

      if (retireDecision.chosen || mandatoryAgeReached) {
        const previousTitle = career.title || career.occupation;
        const previousCompany = career.companyName || `${npc.location.city} Enterprise`;
        const previousSalary = career.salary;

        career.history.push({
          jobId: career.jobId ?? 'legacy_occupation',
          title: previousTitle,
          companyName: previousCompany,
          startYear: currentYear - Math.max(1, career.yearsInRole),
          endYear: currentYear,
          finalSalary: previousSalary,
          reasonForLeaving: 'retired',
        });

        const pension = Math.round(previousSalary * 0.4);
        career.jobId = null;
        career.title = 'Retired';
        career.occupation = 'Retired';
        career.companyName = '';
        career.salary = 0;
        career.yearsInRole = 0;
        career.isRetired = true;
        career.pensionAnnual = pension;
        finances.annualIncome = pension;
        personality = evolveNpcPersonality(personality, 'retirement');
        happiness = clampStat(happiness + 4);

        lifeEvents.push(
          createDeduplicatedLifeEvent({
            npcId: npc.id,
            year: currentYear,
            age: npc.age,
            type: 'retired',
            title: `Retired from ${previousTitle}`,
            description: `${npc.firstName} retired as ${previousTitle} at ${previousCompany} with an annual pension of ${pension.toLocaleString()} ${finances.currency}.`,
            referenceId: 'retirement',
          })
        );

        return {
          updatedNpc: {
            ...npc,
            happiness,
            personality,
            career,
            finances,
          },
          lifeEvents,
        };
      }
    } else if (npc.age >= retirementTargetAge + 5) {
      // Unemployed elder transitions to Retired status
      career.isRetired = true;
      career.title = 'Retired';
      career.occupation = 'Retired';
      return {
        updatedNpc: { ...npc, career, finances },
        lifeEvents,
      };
    }
  }

  // 3. Unemployed Adult -> Job Application
  const isUnemployed =
    (!career.jobId && career.salary <= 0) ||
    career.occupation === 'Unemployed' ||
    career.occupation.includes('Student');

  if (isUnemployed) {
    const ambitionScore = calculateCareerAmbitionScore(npc);
    const financialUrgency = finances.cash <= finances.annualExpenses ? 25 : 0;
    const applyProb = Math.min(0.96, (ambitionScore + financialUrgency + 25) / 110);

    if (prng.chance(applyProb)) {
      const chosenJob = selectBestJobForNpc(npc, prng);
      if (chosenJob) {
        const companyName = generateDeterministicCompanyName(
          npc.location.city,
          chosenJob,
          prng
        );
        const localSalary = scaleCatalogSalaryToNpcCountry(
          chosenJob.baseSalary,
          npc.location.country
        );

        career.jobId = chosenJob.id;
        career.title = chosenJob.title;
        career.occupation = chosenJob.title;
        career.companyName = companyName;
        career.salary = localSalary;
        career.performance = clampStat(
          55 + Math.round(npc.personality.conscientiousness * 0.25) + prng.nextInt(-5, 8)
        );
        career.yearsInRole = 1;
        finances.annualIncome = localSalary;
        happiness = clampStat(happiness + 5);

        lifeEvents.push(
          createDeduplicatedLifeEvent({
            npcId: npc.id,
            year: currentYear,
            age: npc.age,
            type: 'hired',
            title: `Hired as ${chosenJob.title}`,
            description: `${npc.firstName} started working as a ${chosenJob.title} at ${companyName}.`,
            referenceId: chosenJob.id,
          })
        );
      } else {
        career.occupation = 'Unemployed';
        career.title = 'Unemployed';
        career.salary = 0;
        finances.annualIncome = 0;
      }
    } else {
      career.occupation = 'Unemployed';
      career.title = 'Unemployed';
      career.salary = 0;
      finances.annualIncome = 0;
    }

    return {
      updatedNpc: {
        ...npc,
        happiness,
        personality,
        career,
        finances,
      },
      lifeEvents,
    };
  }

  // 4. Employed Adult -> Annual Performance, Promotion Ladder, or Career Switch
  career.yearsInRole += 1;

  const jobTemplate = career.jobId ? getJobTemplateById(career.jobId) : undefined;

  // Check if an NPC who recently earned a university/graduate degree is still stuck in an open_entry or part_time job
  const diplomas = getNpcEarnedDiplomas(npc);
  const hasHigherEdDegree = Array.from(diplomas).some(
    (d) =>
      d.startsWith('B.') ||
      d.startsWith('Master') ||
      d.startsWith('Doctor') ||
      d.startsWith('Juris')
  );
  if (
    hasHigherEdDegree &&
    jobTemplate &&
    (jobTemplate.type === 'part_time' || jobTemplate.credentialTier === 'open_entry')
  ) {
    const upgradedJob = selectBestJobForNpc(npc, prng);
    if (
      upgradedJob &&
      (upgradedJob.credentialTier === 'bachelors' ||
        upgradedJob.credentialTier === 'masters_professional')
    ) {
      career.history.push({
        jobId: career.jobId ?? 'entry_job',
        title: career.title,
        companyName: career.companyName,
        startYear: currentYear - Math.max(1, career.yearsInRole),
        endYear: currentYear,
        finalSalary: career.salary,
        reasonForLeaving: 'resigned',
      });

      const newCompany = generateDeterministicCompanyName(
        npc.location.city,
        upgradedJob,
        prng
      );
      const newSalary = scaleCatalogSalaryToNpcCountry(
        upgradedJob.baseSalary,
        npc.location.country
      );

      career.jobId = upgradedJob.id;
      career.title = upgradedJob.title;
      career.occupation = upgradedJob.title;
      career.companyName = newCompany;
      career.salary = newSalary;
      career.performance = clampStat(68 + prng.nextInt(0, 14));
      career.yearsInRole = 1;
      finances.annualIncome = newSalary;

      lifeEvents.push(
        createDeduplicatedLifeEvent({
          npcId: npc.id,
          year: currentYear,
          age: npc.age,
          type: 'hired',
          title: `Hired as ${upgradedJob.title}`,
          description: `${npc.firstName} transitioned into a career as ${upgradedJob.title} at ${newCompany}.`,
          referenceId: upgradedJob.id,
        })
      );

      return {
        updatedNpc: { ...npc, career, finances },
        lifeEvents,
      };
    }
  }

  // Update workplace performance based on conscientiousness, ambition, smarts, and health
  const targetPerformance = clampStat(
    npc.personality.conscientiousness * 0.45 +
      npc.personality.ambition * 0.25 +
      npc.smarts * 0.2 +
      npc.health * 0.1
  );
  const perfPull = Math.round((targetPerformance - career.performance) * 0.3);
  const promotionPush = evaluatePromotionPursuitDecision(npc, prng);
  const pushBonus = promotionPush.chosen ? prng.nextInt(3, 8) : prng.nextInt(-5, 3);
  career.performance = clampStat(career.performance + perfPull + pushBonus);

  // Underperformance Termination Check (< 18% performance, matching careerService.ts)
  if (career.performance < 18 && prng.chance(0.45)) {
    const terminatedTitle = career.title || career.occupation;
    const terminatedCompany = career.companyName || `${npc.location.city} Corp`;

    career.history.push({
      jobId: career.jobId ?? 'legacy_occupation',
      title: terminatedTitle,
      companyName: terminatedCompany,
      startYear: currentYear - Math.max(1, career.yearsInRole),
      endYear: currentYear,
      finalSalary: career.salary,
      reasonForLeaving: 'terminated',
    });

    career.jobId = null;
    career.title = 'Unemployed';
    career.occupation = 'Unemployed';
    career.companyName = '';
    career.salary = 0;
    career.yearsInRole = 0;
    finances.annualIncome = 0;
    personality = evolveNpcPersonality(personality, 'termination');
    happiness = clampStat(happiness - 10);

    lifeEvents.push(
      createDeduplicatedLifeEvent({
        npcId: npc.id,
        year: currentYear,
        age: npc.age,
        type: 'terminated',
        title: `Terminated from ${terminatedCompany}`,
        description: `${npc.firstName} was let go from their position as ${terminatedTitle} at ${terminatedCompany}.`,
        referenceId: `term_${currentYear}`,
      })
    );

    return {
      updatedNpc: {
        ...npc,
        happiness,
        personality,
        career,
        finances,
      },
      lifeEvents,
    };
  }

  // Evaluate Promotion Ladder
  const nextTier = findNextPromotionTier(npc, jobTemplate);
  if (nextTier) {
    const meetsTenure = career.yearsInRole >= nextTier.minYears;
    const meetsPerf = career.performance >= nextTier.minPerformance;
    const meetsSmarts = !nextTier.minSmarts || npc.smarts >= nextTier.minSmarts;
    const meetsLooks = !nextTier.minLooks || npc.looks >= nextTier.minLooks;
    const meetsDegree =
      !nextTier.requiredDegreeTitles ||
      nextTier.requiredDegreeTitles.length === 0 ||
      nextTier.requiredDegreeTitles.some((req) => diplomas.has(req));

    if (
      meetsTenure &&
      meetsPerf &&
      meetsSmarts &&
      meetsLooks &&
      meetsDegree &&
      promotionPush.chosen
    ) {
      const oldTitle = career.title;
      const oldSalary = career.salary;
      const scaledTierSalary = scaleCatalogSalaryToNpcCountry(
        nextTier.salary,
        npc.location.country
      );
      const newSalary = Math.max(scaledTierSalary, Math.round(oldSalary * 1.18));

      career.history.push({
        jobId: career.jobId ?? 'legacy_occupation',
        title: oldTitle,
        companyName: career.companyName,
        startYear: currentYear - career.yearsInRole,
        endYear: currentYear,
        finalSalary: oldSalary,
        reasonForLeaving: 'promoted',
      });

      career.title = nextTier.title;
      career.occupation = nextTier.title;
      career.salary = newSalary;
      career.yearsInRole = 0;
      finances.annualIncome = newSalary;
      personality = evolveNpcPersonality(personality, 'promotion');
      happiness = clampStat(happiness + 6);

      lifeEvents.push(
        createDeduplicatedLifeEvent({
          npcId: npc.id,
          year: currentYear,
          age: npc.age,
          type: 'promoted',
          title: `Promoted to ${nextTier.title}`,
          description: `${npc.firstName} was promoted to ${nextTier.title} at ${career.companyName} with a salary of ${newSalary.toLocaleString()} ${finances.currency}!`,
          referenceId: nextTier.title,
        })
      );

      return {
        updatedNpc: {
          ...npc,
          happiness,
          personality,
          career,
          finances,
        },
        lifeEvents,
      };
    }
  }

  // Standard annual merit / cost-of-living raise for solid performers
  if (career.performance >= 70 && career.salary > 0) {
    const raiseRate = career.performance >= 88 ? 0.05 : 0.03;
    career.salary = Math.round(career.salary * (1 + raiseRate));
    finances.annualIncome = career.salary;
  } else {
    finances.annualIncome = career.salary;
  }

  return {
    updatedNpc: {
      ...npc,
      happiness,
      personality,
      career,
      finances,
    },
    lifeEvents,
  };
}

