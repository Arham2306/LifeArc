import type { CharacterProfile, LifeEvent, StatEffects } from '../../../types/game';
import type {
  ActiveCareerProfile,
  CareerHistoryEntry,
  EmploymentType,
  JobEligibilityResult,
  JobTemplate,
  PlayerCareerState,
  PromotionTier,
  SortedJobListing,
  WorkplaceActionOutcome,
  YearlyCareerActions,
} from '../types';
import {
  JOB_CATALOG,
  generateCompanyName,
  getJobTemplateById,
} from '../data/jobCatalog';
import { getPromotionLadderForJob } from '../data/careerLadders';
import { applyEffects } from '../../character/services/statService';
import { cohortService } from '../../relationships/services/cohortService';
import { createId } from '../../../utils/id';
import { chance, randomInt } from '../../../utils/random';

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function createInitialYearActions(): YearlyCareerActions {
  return {
    workedHarder: false,
    slackedOff: false,
    askedForRaise: false,
    askedForPromotion: false,
    socializedWithCoworkers: false,
  };
}

export function createInitialCareerState(): PlayerCareerState {
  return {
    currentJob: null,
    history: [],
    totalCareerEarnings: 0,
    rejectedJobIdsThisYear: [],
    yearActions: createInitialYearActions(),
  };
}

/**
 * Checks whether the character holds a High School Diploma (regular or Honors).
 */
export function hasHighSchoolDiploma(character: CharacterProfile): boolean {
  return character.education.diplomas.some((d) =>
    d.toLowerCase().includes('high school diploma')
  );
}

/**
 * Evaluates a character's eligibility for a specific job template, including:
 * - Age threshold (16+ for part-time, 18+ for full-time/freelance)
 * - Degree prerequisite matching (Bachelor's / Master's / Professional)
 * - High School Diploma requirement
 * - Minimum stat cutoffs (Smarts / Health / Looks)
 */
export function evaluateJobEligibility(
  character: CharacterProfile,
  job: JobTemplate
): JobEligibilityResult {
  const { age, stats, education, career } = character;
  const diplomas = education.diplomas;

  const isCurrentJob = career?.currentJob?.jobId === job.id;
  const alreadyRejectedThisYear =
    career?.rejectedJobIdsThisYear?.includes(job.id) ?? false;

  // 1. Age check
  const isAgeEligible = age >= job.minAge;

  // 2. Check if player holds any of the job's relevant/required degrees
  const matchedDegreeTitle = job.requiredDegreeTitles.find((reqTitle) =>
    diplomas.includes(reqTitle)
  );
  const isDegreeMatch = Boolean(matchedDegreeTitle);

  // Strict degree lock applies to 'bachelors' and 'masters_professional' tiers
  const requiresStrictDegree =
    job.credentialTier === 'bachelors' ||
    job.credentialTier === 'masters_professional';

  const hasRequiredDegree = requiresStrictDegree ? isDegreeMatch : true;

  // 3. High School Diploma check
  const hasHSDiploma = job.requiresHighSchoolDiploma
    ? hasHighSchoolDiploma(character) || diplomas.length > 2
    : true;

  // 4. Stat checks
  const meetsSmarts = !job.minSmarts || stats.smarts >= job.minSmarts;
  const meetsHealth = !job.minHealth || stats.health >= job.minHealth;
  const meetsLooks = !job.minLooks || stats.looks >= job.minLooks;
  const meetsStatRequirements = meetsSmarts && meetsHealth && meetsLooks;

  // Determine primary missing requirement label if ineligible
  let missingRequirementLabel: string | undefined;
  if (!isAgeEligible) {
    missingRequirementLabel = `Unlocks at Age ${job.minAge}`;
  } else if (!hasRequiredDegree) {
    missingRequirementLabel = `Requires ${
      job.requiredDegreeShortLabel || job.requiredDegreeTitles[0]
    }`;
  } else if (!hasHSDiploma) {
    missingRequirementLabel = 'Requires High School Diploma';
  } else if (!meetsSmarts) {
    missingRequirementLabel = `Requires ${job.minSmarts} Smarts`;
  } else if (!meetsHealth) {
    missingRequirementLabel = `Requires ${job.minHealth} Health`;
  } else if (!meetsLooks) {
    missingRequirementLabel = `Requires ${job.minLooks} Looks`;
  }

  const isAdmissible =
    isAgeEligible &&
    hasRequiredDegree &&
    hasHSDiploma &&
    meetsStatRequirements;

  return {
    isAdmissible,
    isAgeEligible,
    hasRequiredDegree,
    hasHighSchoolDiploma: hasHSDiploma,
    meetsStatRequirements,
    isDegreeMatch,
    matchedDegreeTitle,
    missingRequirementLabel,
    alreadyRejectedThisYear,
    isCurrentJob,
  };
}

/**
 * Returns the job catalog filtered by age visibility and category,
 * sorted so that jobs matching the player's earned degree(s) appear first,
 * followed by eligible open jobs, followed by degree-locked positions.
 */
export function getSortedJobListings(
  character: CharacterProfile,
  filterType: 'all' | 'recommended' | EmploymentType = 'all'
): SortedJobListing[] {
  const { age } = character;

  // Under 16: no jobs unlocked yet
  if (age < 16) return [];

  // Ages 16–17: only part-time gigs are visible in the active teen market
  // Age 18+: all part-time, full-time, and freelance jobs are visible
  const ageVisibleJobs = JOB_CATALOG.filter((job) => {
    if (age < 18) return job.type === 'part_time';
    return true;
  });

  const listings: SortedJobListing[] = ageVisibleJobs.map((job) => {
    const eligibility = evaluateJobEligibility(character, job);

    // Compute priority score for smart sorting:
    // 1. Active current job: 3000+
    // 2. Degree Match & Admissible (Full-Time Career): 2000+
    // 3. Degree Match & Admissible (Freelance): 1600+
    // 4. Degree Match but missing secondary stat (e.g. Health/Smarts): 1200+
    // 5. Open / Eligible without degree match: 800+
    // 6. Locked (Requires Bachelor's / Master's / Professional Degree): 200+
    let priorityScore = Math.round(job.baseSalary / 1000);

    if (eligibility.isCurrentJob) {
      priorityScore += 3000;
    } else if (eligibility.isDegreeMatch && eligibility.isAdmissible) {
      if (job.credentialTier === 'masters_professional') {
        priorityScore += 2200;
      } else if (job.credentialTier === 'bachelors') {
        priorityScore += 2000;
      } else {
        priorityScore += 1600;
      }
    } else if (eligibility.isDegreeMatch) {
      priorityScore += 1200;
    } else if (eligibility.isAdmissible) {
      if (job.type === 'full_time') {
        priorityScore += 900;
      } else if (job.type === 'freelance') {
        priorityScore += 800;
      } else {
        priorityScore += 700;
      }
    } else {
      priorityScore += 200;
    }

    return {
      job,
      eligibility,
      priorityScore,
    };
  });

  const filtered = listings.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'recommended') {
      return item.eligibility.isDegreeMatch || item.eligibility.isAdmissible;
    }
    return item.job.type === filterType;
  });

  return filtered.sort((a, b) => b.priorityScore - a.priorityScore);
}

export interface JobApplicationOutcome {
  hired: boolean;
  character: CharacterProfile;
  title: string;
  subtitle: string;
  feedbackMessage: string;
  companyName: string;
  salary: number;
}

/**
 * Processes a player's job interview response:
 * - If `selectedOption.isPass` is true: hires the player, archives any previous job,
 *   updates `character.occupation` and `character.career.currentJob`, and logs a life event.
 * - If `selectedOption.isPass` is false: rejects the application for the current year
 *   and records the attempt in `rejectedJobIdsThisYear`.
 */
export function applyForJob(
  character: CharacterProfile,
  jobId: string,
  selectedOptionIndex: number,
  customCompanyName?: string
): JobApplicationOutcome {
  const job = getJobTemplateById(jobId);
  if (!job) {
    return {
      hired: false,
      character,
      title: 'Position Unavailable',
      subtitle: 'Job Market',
      feedbackMessage: 'This job listing is no longer available.',
      companyName: '',
      salary: 0,
    };
  }

  const companyName =
    customCompanyName || generateCompanyName(character.city, job);
  const eligibility = evaluateJobEligibility(character, job);

  if (!eligibility.isAdmissible) {
    return {
      hired: false,
      character,
      title: 'Application Screened Out',
      subtitle: `${job.title} • ${companyName}`,
      feedbackMessage: `Your application did not meet the mandatory requirements (${eligibility.missingRequirementLabel}).`,
      companyName,
      salary: job.baseSalary,
    };
  }

  const option =
    job.interviewQuestion.options[selectedOptionIndex] ||
    job.interviewQuestion.options[0];

  const { age, birthYear } = character;

  if (!option.isPass) {
    const { character: afterReject } = applyEffects(character, {
      happiness: -3,
    });

    const rejectEvent: LifeEvent = {
      id: createId(),
      age,
      year: birthYear + age,
      title: `Rejected for ${job.title}`,
      message: `You interviewed for ${job.title} at ${companyName}, but bombed the interview question! ${option.feedback}`,
      category: 'career',
      icon: '📋',
    };

    return {
      hired: false,
      character: {
        ...afterReject,
        career: {
          ...afterReject.career,
          rejectedJobIdsThisYear: [
            ...afterReject.career.rejectedJobIdsThisYear,
            job.id,
          ],
        },
        timeline: [...afterReject.timeline, rejectEvent],
      },
      title: 'Interview Rejected',
      subtitle: `${job.title} • ${companyName}`,
      feedbackMessage: option.feedback,
      companyName,
      salary: job.baseSalary,
    };
  }

  // Interview passed -> Hire character!
  const prevJob = character.career.currentJob;
  const updatedHistory: CareerHistoryEntry[] = [...character.career.history];

  if (prevJob) {
    updatedHistory.push({
      id: createId(),
      jobId: prevJob.jobId,
      title: prevJob.title,
      companyName: prevJob.companyName,
      type: prevJob.type,
      startAge: prevJob.hiredAge,
      endAge: age,
      finalSalary: prevJob.salary,
      reasonForLeaving: 'switched_jobs',
    });
  }

  const initialPerformance = clamp(
    Math.round(character.stats.smarts * 0.45 + 40 + randomInt(-5, 8))
  );

  const newJobProfile: ActiveCareerProfile = {
    jobId: job.id,
    title: job.title,
    companyName,
    field: job.field,
    type: job.type,
    salary: job.baseSalary,
    yearsInJob: 0,
    performance: initialPerformance,
    hiredAge: age,
    icon: job.icon,
  };

  const { character: afterHire } = applyEffects(character, {
    happiness: 6,
  });

  const hireEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: `Hired as ${job.title}!`,
    message: `You aced your interview with ${companyName} and were hired as a ${job.title} with a starting salary of $${job.baseSalary.toLocaleString()}/yr!`,
    category: 'career',
    icon: job.icon,
  };

  const coworkerCohort = cohortService.generateStageCohort(
    { ...afterHire, career: { ...afterHire.career, currentJob: newJobProfile } },
    'workplace',
    4
  );

  return {
    hired: true,
    character: {
      ...afterHire,
      occupation: job.title,
      career: {
        ...afterHire.career,
        currentJob: newJobProfile,
        history: updatedHistory,
      },
      relationships: [...(afterHire.relationships || []), ...coworkerCohort],
      timeline: [...afterHire.timeline, hireEvent],
    },
    title: 'You’re Hired!',
    subtitle: `${job.title} • ${companyName}`,
    feedbackMessage: option.feedback,
    companyName,
    salary: job.baseSalary,
  };
}

/**
 * Resigns from the character's currently active job.
 */
export function resignFromJob(character: CharacterProfile): {
  character: CharacterProfile;
  message: string;
} {
  const currentJob = character.career.currentJob;
  if (!currentJob) {
    return {
      character,
      message: 'You do not currently have a job to resign from.',
    };
  }

  const { age, birthYear, education } = character;

  const historyEntry: CareerHistoryEntry = {
    id: createId(),
    jobId: currentJob.jobId,
    title: currentJob.title,
    companyName: currentJob.companyName,
    type: currentJob.type,
    startAge: currentJob.hiredAge,
    endAge: age,
    finalSalary: currentJob.salary,
    reasonForLeaving: 'resigned',
  };

  // Fallback occupation when leaving a job
  let nextOccupation = 'Unemployed';
  if (education.currentStage === 'high_school') {
    nextOccupation = 'High School Student';
  } else if (education.currentStage === 'university') {
    nextOccupation = 'University Student';
  } else if (education.currentStage === 'professional_school') {
    nextOccupation = `${education.professionalSchool?.programName || 'Graduate'} Student`;
  } else if (education.currentStage === 'dropped_out' && age < 18) {
    nextOccupation = 'High School Dropout';
  }

  const message = `You handed in your notice and resigned from your position as ${currentJob.title} at ${currentJob.companyName}.`;

  const resignEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: `Resigned from ${currentJob.companyName}`,
    message,
    category: 'career',
    icon: '👋',
  };

  return {
    character: {
      ...character,
      occupation: nextOccupation,
      career: {
        ...character.career,
        currentJob: null,
        history: [...character.career.history, historyEntry],
      },
      timeline: [...character.timeline, resignEvent],
    },
    message,
  };
}

export interface CareerAnnualProgressResult {
  career: PlayerCareerState;
  events: LifeEvent[];
  netPayEarned: number;
  studentLoanPaid: number;
  remainingStudentDebt: number;
  statEffects?: StatEffects;
}

/**
 * Processes 1 year of active employment when aging up:
 * - Resets `rejectedJobIdsThisYear`
 * - Pays annual salary (after standard 20% income tax)
 * - Automatically pays down Student Debt (up to 15% of gross salary or remaining debt)
 * - Increments `yearsInJob` and drifts `performance`
 * - Awards automatic annual cost-of-living / merit raise if performance >= 70
 */
export function progressCareerForYear(
  character: CharacterProfile,
  nextAge: number
): CareerAnnualProgressResult {
  const career = character.career || createInitialCareerState();
  const nextYear = character.birthYear + nextAge;
  const events: LifeEvent[] = [];
  const currentDebt = character.education.studentDebt || 0;

  if (!career.currentJob) {
    return {
      career: {
        ...career,
        rejectedJobIdsThisYear: [],
        yearActions: createInitialYearActions(),
      },
      events,
      netPayEarned: 0,
      studentLoanPaid: 0,
      remainingStudentDebt: currentDebt,
    };
  }

  const job = career.currentJob;
  const grossSalary = job.salary;
  // Standard 20% tax & living withholding for part-time/freelance, 22% for full-time
  const taxRate = job.type === 'full_time' ? 0.22 : 0.15;
  const afterTaxPay = Math.round(grossSalary * (1 - taxRate));

  // Student loan automatic annual installment (if player has student debt)
  let studentLoanPaid = 0;
  let remainingStudentDebt = currentDebt;
  if (currentDebt > 0 && afterTaxPay > 0) {
    const maxInstallment = Math.round(afterTaxPay * 0.2);
    studentLoanPaid = Math.min(currentDebt, Math.max(1500, maxInstallment));
    studentLoanPaid = Math.min(afterTaxPay, studentLoanPaid);
    remainingStudentDebt = Math.max(0, currentDebt - studentLoanPaid);

    if (remainingStudentDebt === 0 && currentDebt > 0) {
      events.push({
        id: createId(),
        age: nextAge,
        year: nextYear,
        title: 'Paid Off Student Loans!',
        message: `With your final payment of $${studentLoanPaid.toLocaleString()} from your ${job.title} salary, you officially paid off 100% of your student debt!`,
        category: 'money',
        icon: '🎉',
      });
    }
  }

  const netPayEarned = afterTaxPay - studentLoanPaid;
  const nextYearsInJob = job.yearsInJob + 1;

  // Drift job performance based on Smarts & Happiness
  const targetPerf = Math.round((character.stats.smarts + character.stats.happiness) / 2);
  const perfDelta = Math.round((targetPerf - job.performance) * 0.15) + randomInt(-4, 5);
  const nextPerformance = clamp(job.performance + perfDelta);

  // Check if employee is terminated due to performance collapsing below 15%
  if (job.performance < 15 || nextPerformance < 15) {
    const firedEntry: CareerHistoryEntry = {
      id: createId(),
      jobId: job.jobId,
      title: job.title,
      companyName: job.companyName,
      type: job.type,
      startAge: job.hiredAge,
      endAge: nextAge,
      finalSalary: job.salary,
      reasonForLeaving: 'fired',
    };

    events.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: `Terminated from ${job.companyName}`,
      message: `Due to sustained poor job performance (${Math.min(job.performance, nextPerformance)}%), management at ${job.companyName} terminated your employment as ${job.title}.`,
      category: 'career',
      icon: '🚨',
    });

    return {
      career: {
        ...career,
        currentJob: null,
        history: [...career.history, firedEntry],
        totalCareerEarnings: career.totalCareerEarnings + netPayEarned,
        rejectedJobIdsThisYear: [],
        yearActions: createInitialYearActions(),
      },
      events,
      netPayEarned,
      studentLoanPaid,
      remainingStudentDebt,
      statEffects: {
        happiness: -20,
      },
    };
  }

  // Check for annual merit raise if performance >= 72
  let nextSalary = job.salary;
  if (nextPerformance >= 72 && job.type === 'full_time') {
    const raisePct = randomInt(4, 7) / 100;
    const raiseAmount = Math.round((job.salary * raisePct) / 500) * 500;
    if (raiseAmount >= 1000) {
      nextSalary = job.salary + raiseAmount;
      events.push({
        id: createId(),
        age: nextAge,
        year: nextYear,
        title: 'Annual Merit Raise!',
        message: `Impressed by your ${nextPerformance}% performance as a ${job.title}, ${job.companyName} increased your annual salary by $${raiseAmount.toLocaleString()} to $${nextSalary.toLocaleString()}/yr!`,
        category: 'career',
        icon: '📈',
      });
    }
  }

  return {
    career: {
      ...career,
      currentJob: {
        ...job,
        yearsInJob: nextYearsInJob,
        performance: nextPerformance,
        salary: nextSalary,
      },
      totalCareerEarnings: career.totalCareerEarnings + netPayEarned,
      rejectedJobIdsThisYear: [],
      yearActions: createInitialYearActions(),
    },
    events,
    netPayEarned,
    studentLoanPaid,
    remainingStudentDebt,
  };
}

// ============================================================================
// WORKPLACE ACTIONS & PROMOTION LADDER ENGINE
// ============================================================================

/**
 * Returns the next promotion tier available for the character's current job.
 */
export function getNextPromotionTier(
  character: CharacterProfile
): PromotionTier | null {
  const currentJob = character.career?.currentJob;
  if (!currentJob) return null;
  const template = getJobTemplateById(currentJob.jobId);
  const baseSalary = template?.baseSalary ?? currentJob.salary;
  const baseTitle = template?.title ?? currentJob.title;
  const ladder = getPromotionLadderForJob(
    currentJob.jobId,
    baseSalary,
    baseTitle
  );

  const currentTitle = currentJob.title.toLowerCase();
  const currentTierIndex = ladder.findIndex(
    (tier) => tier.title.toLowerCase() === currentTitle
  );

  if (currentTierIndex === -1) {
    // Has not been promoted yet -> next tier is ladder[0]
    return ladder[0] || null;
  }

  if (currentTierIndex + 1 < ladder.length) {
    return ladder[currentTierIndex + 1];
  }

  // Reached the pinnacle of this career path!
  return null;
}

export interface PromotionEligibilityCheck {
  isEligible: boolean;
  nextTier: PromotionTier | null;
  missingDegree: boolean;
  missingDegreeName?: string;
  reason: string;
}

/**
 * Checks all eligibility conditions for a promotion:
 * 1. Degree Prerequisite (if required by next tier)
 * 2. Minimum Job Performance (typically 78 - 86%)
 * 3. Minimum Tenure in role (1 - 3 years)
 * 4. Minimum Smarts cutoff
 */
export function checkPromotionEligibility(
  character: CharacterProfile
): PromotionEligibilityCheck {
  const currentJob = character.career?.currentJob;
  if (!currentJob) {
    return {
      isEligible: false,
      nextTier: null,
      missingDegree: false,
      reason: 'You are not currently employed.',
    };
  }

  const nextTier = getNextPromotionTier(character);
  if (!nextTier) {
    return {
      isEligible: false,
      nextTier: null,
      missingDegree: false,
      reason: 'You have reached the highest executive tier in this career path!',
    };
  }

  const diplomas = character.education?.diplomas || [];

  // 1. Degree Gate Check
  if (
    nextTier.requiredDegreeTitles &&
    nextTier.requiredDegreeTitles.length > 0
  ) {
    const hasDegree = nextTier.requiredDegreeTitles.some((title) =>
      diplomas.includes(title)
    );
    if (!hasDegree) {
      const missingName =
        nextTier.requiredDegreeLabel || nextTier.requiredDegreeTitles[0];
      return {
        isEligible: false,
        nextTier,
        missingDegree: true,
        missingDegreeName: missingName,
        reason: `Requires ${missingName}`,
      };
    }
  }

  // 2. Performance Gate Check
  if (currentJob.performance < nextTier.minPerformance) {
    return {
      isEligible: false,
      nextTier,
      missingDegree: false,
      reason: `Requires at least ${nextTier.minPerformance}% Job Performance (Currently ${currentJob.performance}%)`,
    };
  }

  // 3. Tenure Gate Check (relax if performance is exceptionally high >= 92%)
  const minRequiredYears =
    currentJob.performance >= 92
      ? Math.max(1, nextTier.minYears - 1)
      : nextTier.minYears;
  if (currentJob.yearsInJob < minRequiredYears) {
    return {
      isEligible: false,
      nextTier,
      missingDegree: false,
      reason: `Requires ${minRequiredYears} ${
        minRequiredYears === 1 ? 'year' : 'years'
      } tenure in role (Currently ${currentJob.yearsInJob} ${
        currentJob.yearsInJob === 1 ? 'year' : 'years'
      })`,
    };
  }

  // 4. Stat Cutoff Gates (Smarts & Looks if applicable)
  if (nextTier.minSmarts && character.stats.smarts < nextTier.minSmarts) {
    return {
      isEligible: false,
      nextTier,
      missingDegree: false,
      reason: `Requires at least ${nextTier.minSmarts}% Smarts (Currently ${character.stats.smarts}%)`,
    };
  }

  if (nextTier.minLooks && character.stats.looks < nextTier.minLooks) {
    return {
      isEligible: false,
      nextTier,
      missingDegree: false,
      reason: `Requires at least ${nextTier.minLooks}% Looks (Currently ${character.stats.looks}%)`,
    };
  }

  // 4. Smarts Gate Check
  if (nextTier.minSmarts && character.stats.smarts < nextTier.minSmarts) {
    return {
      isEligible: false,
      nextTier,
      missingDegree: false,
      reason: `Requires at least ${nextTier.minSmarts} Smarts (Currently ${character.stats.smarts})`,
    };
  }

  return {
    isEligible: true,
    nextTier,
    missingDegree: false,
    reason: 'Eligible for promotion!',
  };
}

/**
 * 1. Work Harder (Overtime Hustle):
 * Boosts Job Performance (+10% to +18%) and Smarts (+1 to +2), with slight energy stress.
 * 1x per year.
 */
export function performWorkHarder(
  character: CharacterProfile
): WorkplaceActionOutcome {
  const currentJob = character.career?.currentJob;
  if (!currentJob) {
    return {
      character,
      title: 'Not Employed',
      subtitle: 'Career Action',
      message: 'You must have an active job to work harder.',
      icon: '⚠️',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  if (character.career.yearActions?.workedHarder) {
    return {
      character,
      title: 'Already Worked Harder',
      subtitle: `${currentJob.title} • ${currentJob.companyName}`,
      message:
        'You have already put in maximum overtime effort this year. Pace yourself!',
      icon: '⏳',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  const { age, birthYear } = character;
  const rawEffects: StatEffects = {
    jobPerformance: randomInt(10, 16),
    smarts: randomInt(1, 2),
    happiness: -randomInt(3, 5),
    health: -1,
  };
  const { character: updated, applied } = applyEffects(character, rawEffects);

  const fieldNarratives: Record<string, string> = {
    technology:
      'You stayed late refactoring backend architecture, writing comprehensive test suites, and closing critical sprint tickets.',
    medicine_healthcare:
      'You took on extra shifts, double-checked patient charts, and stayed through shift changeovers to support incoming staff.',
    business_finance:
      'You built detailed financial models, stayed late refining valuation decks, and impressed senior portfolio partners.',
    law_government:
      'You combed through hundreds of case precedents and prepared immaculate trial exhibits for upcoming hearings.',
    hospitality_retail:
      'You organized the stockrooms, assisted overwhelmed teammates during peak rushes, and kept the floor spotless.',
    trades_services:
      'You cleaned and calibrated your equipment, organized the job site, and completed installations ahead of schedule.',
    arts_media:
      'You polished your creative concepts late into the night, refining every aesthetic detail to absolute perfection.',
  };

  const narrative =
    fieldNarratives[currentJob.field] ||
    'You locked in, crushed your daily quota with extra focus, and impressed your supervisor with your strong work ethic.';

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: 'Worked Harder at Work',
    message: narrative,
    category: 'career',
    icon: '💪',
  };

  return {
    character: {
      ...updated,
      career: {
        ...updated.career,
        yearActions: {
          ...updated.career.yearActions,
          workedHarder: true,
        },
      },
      timeline: [...updated.timeline, journalEvent],
    },
    title: 'Worked Harder!',
    subtitle: `${currentJob.title} • ${currentJob.companyName}`,
    message: narrative,
    icon: '💪',
    appliedEffects: applied,
    isSuccess: true,
  };
}

/**
 * 2. Slack Off / Long Break:
 * Reduces Job Performance (-12% to -18%), boosts Happiness (+7 to +12), recovers Health (+2).
 * 35% risk of getting caught by supervisor!
 */
export function performSlackOff(
  character: CharacterProfile
): WorkplaceActionOutcome {
  const currentJob = character.career?.currentJob;
  if (!currentJob) {
    return {
      character,
      title: 'Not Employed',
      subtitle: 'Career Action',
      message: 'You must have an active job to slack off.',
      icon: '⚠️',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  if (character.career.yearActions?.slackedOff) {
    return {
      character,
      title: 'Already Slacked Off',
      subtitle: `${currentJob.title} • ${currentJob.companyName}`,
      message: 'You have already taken your long breaks this year.',
      icon: '⏳',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  const { age, birthYear } = character;
  const caught = chance(0.35);

  const rawEffects: StatEffects = {
    jobPerformance: -randomInt(12, 18),
    happiness: caught ? randomInt(1, 3) : randomInt(7, 12),
    health: 2,
    ...(caught ? { karma: -4 } : {}),
  };
  const { character: updated, applied } = applyEffects(character, rawEffects);

  const message = caught
    ? `You took a two-hour lunch and played games in the breakroom, but your supervisor caught you napping! You were issued a formal disciplinary warning.`
    : `You kicked back, scrolled social media, took extended coffee breaks, and did the absolute bare minimum. Your performance slipped, but you felt wonderfully relaxed!`;

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: caught ? 'Caught Slacking Off at Work!' : 'Slacked Off at Work',
    message,
    category: 'career',
    icon: caught ? '🚨' : '😴',
  };

  return {
    character: {
      ...updated,
      career: {
        ...updated.career,
        yearActions: {
          ...updated.career.yearActions,
          slackedOff: true,
        },
      },
      timeline: [...updated.timeline, journalEvent],
    },
    title: caught ? 'Caught Slacking Off!' : 'Slacked Off!',
    subtitle: caught
      ? 'Supervisor Warning Issued'
      : `${currentJob.title} • Rested & Relaxed`,
    message,
    icon: caught ? '🚨' : '😴',
    appliedEffects: applied,
    isSuccess: !caught,
  };
}

/**
 * 3. Ask for a Raise:
 * Requires >= 1 year tenure. Success depends on Job Performance (75%+ recommended).
 * If approved: raises salary permanently by 8% to 15%.
 */
export function performAskForRaise(
  character: CharacterProfile
): WorkplaceActionOutcome {
  const currentJob = character.career?.currentJob;
  if (!currentJob) {
    return {
      character,
      title: 'Not Employed',
      subtitle: 'Career Action',
      message: 'You must have an active job to ask for a raise.',
      icon: '⚠️',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  if (character.career.yearActions?.askedForRaise) {
    return {
      character,
      title: 'Already Requested',
      subtitle: `${currentJob.title} • ${currentJob.companyName}`,
      message:
        'You have already negotiated compensation this year. Focus on your results and try again next year.',
      icon: '⏳',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  const { age, birthYear } = character;

  // Tenure check: need at least 1 year
  if (currentJob.yearsInJob < 1) {
    const rawEffects: StatEffects = { happiness: -3 };
    const { character: updated, applied } = applyEffects(character, rawEffects);
    const message = `Your manager smiled warmly: "You have only been in this role for less than a year! Show us consistent results through your full annual review first."`;

    return {
      character: {
        ...updated,
        career: {
          ...updated.career,
          yearActions: { ...updated.career.yearActions, askedForRaise: true },
        },
        timeline: [
          ...updated.timeline,
          {
            id: createId(),
            age,
            year: birthYear + age,
            title: 'Raise Request Too Early',
            message,
            category: 'career',
            icon: '⏳',
          },
        ],
      },
      title: 'Request Too Early',
      subtitle: `${currentJob.title} • ${currentJob.companyName}`,
      message,
      icon: '⏳',
      appliedEffects: applied,
      isSuccess: false,
    };
  }

  // Calculate approval probability based on performance and tenure
  let approvalChance = 0;
  if (currentJob.performance >= 90 && currentJob.yearsInJob >= 2) approvalChance = 1.0;
  else if (currentJob.performance >= 85) approvalChance = 0.9;
  else if (currentJob.performance >= 75) approvalChance = 0.7;
  else if (currentJob.performance >= 60) approvalChance = 0.25;
  else approvalChance = 0.05;

  const isApproved = chance(approvalChance);

  if (isApproved) {
    const raisePct = randomInt(8, 14) / 100;
    const raiseAmount = Math.max(
      1000,
      Math.round((currentJob.salary * raisePct) / 500) * 500
    );
    const newSalary = currentJob.salary + raiseAmount;

    const rawEffects: StatEffects = {
      happiness: 8,
      karma: 2,
      jobPerformance: 4,
    };
    const { character: updated, applied } = applyEffects(character, rawEffects);

    const message = `Success! Your supervisor agreed you have been outperforming expectations: "You have earned this. We are raising your base compensation by $${raiseAmount.toLocaleString()} to $${newSalary.toLocaleString()}/yr!"`;

    const raiseEvent: LifeEvent = {
      id: createId(),
      age,
      year: birthYear + age,
      title: `Earned a Raise at ${currentJob.companyName}!`,
      message,
      category: 'career',
      icon: '💰',
    };

    return {
      character: {
        ...updated,
        career: {
          ...updated.career,
          currentJob: {
            ...currentJob,
            salary: newSalary,
          },
          yearActions: { ...updated.career.yearActions, askedForRaise: true },
        },
        timeline: [...updated.timeline, raiseEvent],
      },
      title: 'Raise Approved! 💰',
      subtitle: `+$${raiseAmount.toLocaleString()} / year`,
      message,
      icon: '💰',
      appliedEffects: applied,
      isSuccess: true,
      newSalary,
    };
  }

  // Denied
  const rawEffects: StatEffects = { happiness: -4 };
  const { character: updated, applied } = applyEffects(character, rawEffects);

  const denialReasons = [
    `"The company compensation budget is frozen this fiscal quarter. Let's revisit during next year's review."`,
    `"Your job performance (${currentJob.performance}%) hasn't met the target needed for an off-cycle salary bump. Push higher this year."`,
    `"We appreciate your initiative, but current market conditions do not support a raise right now."`,
  ];
  const message = denialReasons[randomInt(0, denialReasons.length - 1)];

  return {
    character: {
      ...updated,
      career: {
        ...updated.career,
        yearActions: { ...updated.career.yearActions, askedForRaise: true },
      },
      timeline: [
        ...updated.timeline,
        {
          id: createId(),
          age,
          year: birthYear + age,
          title: 'Raise Request Declined',
          message: `Your raise request was declined at ${currentJob.companyName}: ${message}`,
          category: 'career',
          icon: '🙅',
        },
      ],
    },
    title: 'Raise Declined',
    subtitle: `${currentJob.title} • ${currentJob.companyName}`,
    message,
    icon: '🙅',
    appliedEffects: applied,
    isSuccess: false,
  };
}

/**
 * 4. Ask for a Promotion (Smart Degree-Gated Career Ladder):
 * Requires meeting the next tier's tenure, performance, and MANDATORY DEGREE prerequisites!
 */
export function performAskForPromotion(
  character: CharacterProfile
): WorkplaceActionOutcome {
  const currentJob = character.career?.currentJob;
  if (!currentJob) {
    return {
      character,
      title: 'Not Employed',
      subtitle: 'Career Action',
      message: 'You must have an active job to ask for a promotion.',
      icon: '⚠️',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  const { age, birthYear } = character;

  if (character.career.yearActions?.askedForPromotion) {
    return {
      character,
      title: 'Already Requested',
      subtitle: `${currentJob.title} • ${currentJob.companyName}`,
      message:
        'You have already requested a promotion review this year. Focus on your performance and ask again next year.',
      icon: '⏳',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  const check = checkPromotionEligibility(character);
  const nextTier = check.nextTier;

  // Case 1: Missing mandatory degree prerequisite!
  if (check.missingDegree && nextTier) {
    const rawEffects: StatEffects = { happiness: -3 };
    const { character: updated, applied } = applyEffects(character, rawEffects);

    const refusalMessage = `Your manager reviewed your promotion request for ${nextTier.title}: "We would love to promote you, ${character.firstName}, but company bylaws require a ${check.missingDegreeName} for this executive tier. If you complete your ${check.missingDegreeName} in graduate school, the corner office is yours!"`;

    const journalEvent: LifeEvent = {
      id: createId(),
      age,
      year: birthYear + age,
      title: 'Promotion Denied (Degree Required)',
      message: refusalMessage,
      category: 'career',
      icon: '🎓',
    };

    return {
      character: {
        ...updated,
        career: {
          ...updated.career,
          yearActions: {
            ...updated.career.yearActions,
            askedForPromotion: true,
          },
        },
        timeline: [...updated.timeline, journalEvent],
      },
      title: 'Degree Required for Promotion',
      subtitle: `${nextTier.title} • ${currentJob.companyName}`,
      message: refusalMessage,
      icon: '🔒',
      appliedEffects: applied,
      isSuccess: false,
      missingDegreeRequirement: check.missingDegreeName,
    };
  }

  // Case 2: Ineligible due to tenure, performance, or reached top of ladder
  if (!check.isEligible || !nextTier) {
    const rawEffects: StatEffects = { happiness: -4 };
    const { character: updated, applied } = applyEffects(character, rawEffects);

    const message = `Your manager shook their head gently: "You are doing good work, but ${check.reason.toLowerCase()}. Keep your standards high and we will review this again next year."`;

    const journalEvent: LifeEvent = {
      id: createId(),
      age,
      year: birthYear + age,
      title: 'Promotion Request Declined',
      message,
      category: 'career',
      icon: '❌',
    };

    return {
      character: {
        ...updated,
        career: {
          ...updated.career,
          yearActions: {
            ...updated.career.yearActions,
            askedForPromotion: true,
          },
        },
        timeline: [...updated.timeline, journalEvent],
      },
      title: 'Promotion Declined',
      subtitle: `${currentJob.title} • ${currentJob.companyName}`,
      message,
      icon: '❌',
      appliedEffects: applied,
      isSuccess: false,
    };
  }

  // Case 3: Promotion approved!
  const newSalary = nextTier.salary;
  const rawEffects: StatEffects = {
    happiness: 12,
    popularity: 6,
    karma: 4,
    jobPerformance: 6,
  };
  const { character: updated, applied } = applyEffects(character, rawEffects);

  const prevTitle = currentJob.title;
  const promoMessage = `Congratulations! Based on your ${currentJob.performance}% job performance and credentials, ${currentJob.companyName} officially promoted you to ${nextTier.title}! Your annual salary increased to $${newSalary.toLocaleString()}/yr!`;

  const promoEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: `Promoted to ${nextTier.title}!`,
    message: promoMessage,
    category: 'career',
    icon: '👑',
  };

  return {
    character: {
      ...updated,
      occupation: nextTier.title,
      career: {
        ...updated.career,
        currentJob: {
          ...currentJob,
          title: nextTier.title,
          salary: newSalary,
          performance: Math.min(100, currentJob.performance + 6),
        },
        yearActions: {
          ...updated.career.yearActions,
          askedForPromotion: true,
        },
      },
      timeline: [...updated.timeline, promoEvent],
    },
    title: 'Promoted! 👑',
    subtitle: `${prevTitle} ➔ ${nextTier.title}`,
    message: promoMessage,
    icon: '👑',
    appliedEffects: applied,
    isSuccess: true,
    promotedTitle: nextTier.title,
    newSalary,
  };
}

/**
 * 5. Socialize with Coworkers (Team Building):
 * Treats colleagues to coffee/lunch; boosts relationship with existing coworkers
 * and introduces a new colleague if none exist yet.
 */
export function performSocializeWithCoworkers(
  character: CharacterProfile
): WorkplaceActionOutcome {
  const currentJob = character.career?.currentJob;
  if (!currentJob) {
    return {
      character,
      title: 'Not Employed',
      subtitle: 'Career Action',
      message: 'You must have an active job to socialize with coworkers.',
      icon: '⚠️',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  if (character.career.yearActions?.socializedWithCoworkers) {
    return {
      character,
      title: 'Already Socialized',
      subtitle: `${currentJob.title} • ${currentJob.companyName}`,
      message: 'You have already hosted team socializing this year.',
      icon: '⏳',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  const { age, birthYear } = character;
  const cost = character.age >= 18 ? 35 : 15;

  const rawEffects: StatEffects = {
    happiness: randomInt(6, 10),
    popularity: randomInt(4, 7),
    jobPerformance: randomInt(3, 6),
    cash: -cost,
  };
  const { character: updated, applied } = applyEffects(character, rawEffects);

  // Boost relationship with existing coworkers/supervisors
  const existingRels = [...(updated.relationships || [])];
  let boostedCount = 0;
  const updatedRels = existingRels.map((p) => {
    if (
      p.relationshipType === 'coworker' ||
      p.relationshipType === 'mentor' ||
      p.role.includes('Coworker') ||
      p.role.includes('Supervisor')
    ) {
      boostedCount += 1;
      return {
        ...p,
        relationship: Math.min(100, p.relationship + randomInt(10, 16)),
      };
    }
    return p;
  });

  // If no coworkers exist yet, introduce one!
  if (boostedCount === 0) {
    updatedRels.push({
      id: createId(),
      firstName: 'Taylor',
      lastName: 'Reese',
      gender: 'non-binary',
      age: character.age,
      role: 'Team Coworker',
      relationshipType: 'coworker',
      relationship: 75,
      originStory: `Connected during a team coffee break at ${currentJob.companyName}`,
      stageMet: 'adulthood',
      avatarEmoji: '🧑‍💼',
    });
  }

  const message = `You treated colleagues to coffee and pastries after work! Everyone laughed, chatted about weekend plans, and team chemistry was higher than ever.`;

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: 'Socialized with Coworkers',
    message,
    category: 'career',
    icon: '☕',
  };

  return {
    character: {
      ...updated,
      relationships: updatedRels,
      career: {
        ...updated.career,
        yearActions: {
          ...updated.career.yearActions,
          socializedWithCoworkers: true,
        },
      },
      timeline: [...updated.timeline, journalEvent],
    },
    title: 'Team Coffee & Socialize!',
    subtitle: `${currentJob.companyName} • Team Bonded`,
    message,
    icon: '☕',
    appliedEffects: applied,
    isSuccess: true,
  };
}

/**
 * 6. Retire from Career (Age 60+):
 * Formally retires with a pension/severance payout and updates occupation to 'Retired'.
 */
export function performRetire(
  character: CharacterProfile
): WorkplaceActionOutcome {
  const currentJob = character.career?.currentJob;
  if (!currentJob) {
    return {
      character,
      title: 'Not Employed',
      subtitle: 'Retirement',
      message: 'You do not have an active career to retire from.',
      icon: '⚠️',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  if (character.age < 60) {
    return {
      character,
      title: 'Too Young to Retire',
      subtitle: `Age ${character.age}`,
      message:
        'Official retirement unlocks at Age 60. If you wish to leave earlier, you can resign.',
      icon: '⏳',
      appliedEffects: {},
      isSuccess: false,
    };
  }

  const { age, birthYear } = character;
  const pensionBonus = Math.round(currentJob.salary * 0.4);

  const historyEntry: CareerHistoryEntry = {
    id: createId(),
    jobId: currentJob.jobId,
    title: currentJob.title,
    companyName: currentJob.companyName,
    type: currentJob.type,
    startAge: currentJob.hiredAge,
    endAge: age,
    finalSalary: currentJob.salary,
    reasonForLeaving: 'retired',
  };

  const rawEffects: StatEffects = {
    happiness: 14,
    cash: pensionBonus,
  };
  const { character: updated, applied } = applyEffects(character, rawEffects);

  const message = `After a proud and accomplished career as ${currentJob.title}, you formally retired from ${currentJob.companyName}! You received a commemorative golden plaque and a retirement package of $${pensionBonus.toLocaleString()}!`;

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: `Retired from ${currentJob.companyName}!`,
    message,
    category: 'career',
    icon: '🏖️',
  };

  return {
    character: {
      ...updated,
      occupation: 'Retired',
      career: {
        ...updated.career,
        currentJob: null,
        history: [...updated.career.history, historyEntry],
      },
      timeline: [...updated.timeline, journalEvent],
    },
    title: 'Happy Retirement! 🏖️',
    subtitle: `${currentJob.title} • Retired at Age ${age}`,
    message,
    icon: '🏖️',
    appliedEffects: applied,
    isSuccess: true,
  };
}


