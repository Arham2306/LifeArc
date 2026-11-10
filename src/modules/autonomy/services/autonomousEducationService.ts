import type { FamilyWealth } from '../../../types/game';
import {
  UNIVERSITY_MAJORS,
  UNIVERSITY_TOTAL_YEARS,
} from '../../education/data/majors';
import { PROFESSIONAL_SCHOOLS_CATALOG } from '../../education/data/professionalSchools';
import {
  getLetterGradeMeta,
  SCHOOL_STAGE_CONFIG,
} from '../../education/data/schools';
import type {
  ActiveSchoolStage,
  ProfessionalSchoolTemplate,
  TuitionFunding,
  UniversityMajor,
} from '../../education/types';
import type {
  NpcEducationHistoryEntry,
  NpcLifeEvent,
  NpcProfile,
} from '../types';
import {
  calculateCanonicalNetWorth,
  getCountryEconomicProfile,
} from './currencyService';
import {
  evaluateProfessionalSchoolDecision,
  evaluateUniversityEnrollmentDecision,
  rankCandidatesDeterministically,
} from './decisionEngine';
import { createDeduplicatedLifeEvent } from './migrationService';
import {
  calculateAcademicDrive,
  evolveNpcPersonality,
} from './personalityService';
import type { SeededPRNG } from './seededPrngService';

const SCHOOL_NAME_SUFFIXES: Record<ActiveSchoolStage, readonly string[]> = {
  elementary: [
    'Oakridge Elementary',
    'Sunnyvale Primary School',
    'Meadowbrook Elementary',
    'Pinecrest Primary',
    'Maplewood Elementary',
    'Cedar Grove Primary School',
    'Riverside Elementary',
    'Starlight Primary Academy',
  ],
  middle_school: [
    'Central Middle School',
    'Westview Junior High',
    'Northgate Middle Academy',
    'Heritage Junior High',
    'Crestview Middle School',
    'Valley Prep Middle School',
    'Parkside Junior High',
  ],
  high_school: [
    'Metropolitan High School',
    'Grammar High School',
    'Central High Academy',
    'Liberty High School',
    'Horizon Senior High',
    'St. Jude High School',
    'Heights Collegiate High',
  ],
};

const UNIVERSITY_SUFFIXES: readonly string[] = [
  'State University',
  'Metropolitan University',
  'Institute of Technology & Sciences',
  'National University',
  'City University',
  'Grand Collegiate University',
];

const PROF_SCHOOL_SUFFIXES: Record<string, readonly string[]> = {
  med_school: ['Medical College & Hospital', 'School of Medicine & Health Sciences'],
  law_school: ['School of Law', 'Faculty of Jurisprudence & Legal Studies'],
  business_school: ['Graduate School of Business', 'School of Management & Finance'],
  flight_school: ['Aviation Flight Academy', 'International Aero Training Center'],
  dental_school: ['College of Dentistry', 'Dental School & Oral Health Institute'],
  vet_school: ['College of Veterinary Medicine', 'Veterinary Sciences Institute'],
  nursing_school: ['School of Nursing', 'Institute of Nursing & Healthcare'],
  grad_school: ['School of Graduate Studies', 'Graduate Institute of Advanced Research'],
  arts_conservatory: ['Conservatory of Fine Arts', 'Academy of Dramatic Arts & Design'],
};

const clampGrade = (val: number): number => Math.max(0, Math.min(100, Math.round(val)));

export function generateDeterministicSchoolName(
  city: string,
  stage: ActiveSchoolStage,
  prng: SeededPRNG
): string {
  const suffix = prng.pick(SCHOOL_NAME_SUFFIXES[stage]) ?? 'Central Academy';
  return `${city || 'Metro'} ${suffix}`;
}

export function generateDeterministicUniversityName(
  city: string,
  prng: SeededPRNG
): string {
  const suffix = prng.pick(UNIVERSITY_SUFFIXES) ?? 'State University';
  return `${city || 'Metro'} ${suffix}`;
}

export function generateDeterministicProfSchoolName(
  city: string,
  schoolId: string,
  prng: SeededPRNG
): string {
  const pool = PROF_SCHOOL_SUFFIXES[schoolId] ?? ['Institute of Professional Studies'];
  const suffix = prng.pick(pool) ?? 'Institute of Professional Studies';
  return `${city || 'Metro'} ${suffix}`;
}

/**
 * Computes annual grade progression for an NPC based on their intellect,
 * personality-driven academic drive, and deterministic PRNG variance.
 */
export function driftNpcGrades(npc: NpcProfile, prng: SeededPRNG): number {
  const drive = calculateAcademicDrive(npc);
  const current = npc.education.grades > 0 ? npc.education.grades : drive;
  const pull = Math.round((drive - current) * 0.24);
  const studyBonus =
    npc.personality.conscientiousness >= 75
      ? 2
      : npc.personality.conscientiousness <= 30
        ? -2
        : 0;
  const noise = prng.nextInt(-3, 3);
  return clampGrade(current + pull + studyBonus + noise);
}

/**
 * Scores a university major for an NPC based on their personality, intellect, and interests.
 */
export function scoreUniversityMajorForNpc(
  npc: NpcProfile,
  major: UniversityMajor,
  prng: SeededPRNG
): number {
  let score = 50;
  const { personality, lifestyle, smarts, health } = npc;

  switch (major.id) {
    case 'cs':
      score += smarts * 0.35 + personality.openness * 0.25 + personality.ambition * 0.2;
      if (lifestyle.interests.includes('science') || lifestyle.hobbies.includes('coding')) {
        score += 18;
      }
      break;
    case 'pre_med':
      score += smarts * 0.35 + personality.empathy * 0.25 + personality.conscientiousness * 0.25;
      if (lifestyle.interests.includes('science')) score += 12;
      break;
    case 'pre_law':
      score += smarts * 0.3 + personality.ambition * 0.3 + personality.extraversion * 0.2;
      break;
    case 'business':
      score +=
        personality.ambition * 0.35 +
        personality.materialism * 0.3 +
        personality.extraversion * 0.2;
      break;
    case 'sports_science':
      score += health * 0.35 + personality.extraversion * 0.2;
      if (
        personality.archetype === 'athletic' ||
        lifestyle.fitnessHabit === 'athlete' ||
        lifestyle.interests.includes('sports')
      ) {
        score += 25;
      }
      break;
    case 'fine_arts':
    case 'performing_arts':
      score += personality.openness * 0.45 + personality.extraversion * 0.2;
      if (
        lifestyle.interests.includes('art') ||
        lifestyle.interests.includes('music') ||
        lifestyle.hobbies.includes('painting') ||
        lifestyle.hobbies.includes('guitar')
      ) {
        score += 22;
      }
      break;
    case 'journalism':
      score += personality.openness * 0.35 + personality.extraversion * 0.25 + smarts * 0.2;
      if (lifestyle.interests.includes('reading')) score += 14;
      break;
  }

  return score + prng.nextInt(-4, 4);
}

/**
 * Selects the best eligible UniversityMajor for an NPC.
 */
export function selectUniversityMajorForNpc(
  npc: NpcProfile,
  prng: SeededPRNG
): UniversityMajor | null {
  const eligible = UNIVERSITY_MAJORS.filter(
    (m) =>
      npc.education.grades >= m.minGrades &&
      npc.smarts >= m.minSmarts &&
      (!m.minHealth || npc.health >= m.minHealth)
  );

  if (eligible.length === 0) return null;

  const ranked = rankCandidatesDeterministically(eligible, (m) =>
    scoreUniversityMajorForNpc(npc, m, prng)
  );
  return ranked[0]?.candidate ?? null;
}

/**
 * Selects the best eligible ProfessionalSchoolTemplate for a university-graduated NPC.
 */
export function selectProfessionalSchoolForNpc(
  npc: NpcProfile,
  prng: SeededPRNG
): ProfessionalSchoolTemplate | null {
  const diplomas = new Set<string>(npc.education.diplomas ?? []);
  if (npc.education.degreeEarned) {
    diplomas.add(npc.education.degreeEarned);
  }

  const eligible = PROFESSIONAL_SCHOOLS_CATALOG.filter((prog) => {
    const meetsDegree =
      prog.requiredDegreeTitles.length === 0 ||
      prog.requiredDegreeTitles.some((req) => diplomas.has(req));
    const meetsGrades = npc.education.grades >= prog.minGrades;
    const meetsSmarts = npc.smarts >= prog.minSmarts;
    const meetsHealth = !prog.minHealth || npc.health >= prog.minHealth;
    return meetsDegree && meetsGrades && meetsSmarts && meetsHealth;
  });

  if (eligible.length === 0) return null;

  const ranked = rankCandidatesDeterministically(eligible, (prog) => {
    let score = 50 + npc.personality.ambition * 0.3 + npc.smarts * 0.2;
    // Prefer direct professional pipeline matches (e.g. Pre-Med -> Medical School, Pre-Law -> Law School)
    if (prog.id === 'med_school' && diplomas.has('B.S. in Biology (Pre-Med)')) score += 30;
    if (prog.id === 'law_school' && diplomas.has('B.A. in Political Science')) score += 28;
    if (prog.id === 'business_school' && diplomas.has('B.B.A. in Finance & Management')) score += 24;
    return score + prng.nextInt(-4, 4);
  });

  return ranked[0]?.candidate ?? null;
}

/**
 * Resolves how an NPC funds higher education tuition, respecting country tuition regimes,
 * merit/athletic scholarships, family wealth, and personal liquid cash before taking student loans.
 */
export function resolveNpcTuitionFunding(params: {
  npc: NpcProfile;
  annualTuitionLocalCurrency: number;
  isAthleticProgram?: boolean;
  familyWealth?: FamilyWealth;
  parentalGenerosity?: number;
}): TuitionFunding {
  const { npc, annualTuitionLocalCurrency, isAthleticProgram, familyWealth, parentalGenerosity } =
    params;
  const econ = getCountryEconomicProfile(npc.location.country);

  // 1. Academic Merit Scholarship
  if (npc.education.grades >= 90 && npc.smarts >= 82) {
    return 'scholarship_merit';
  }

  // 2. Athletic Scholarship
  if (isAthleticProgram && npc.health >= 84 && npc.education.grades >= 65) {
    return 'scholarship_athletic';
  }

  // 3. Subsidized public higher education regime or wealthy/generous parents
  if (econ.tuitionLoanRegime === 'subsidized_public') {
    return 'parents';
  }
  if (
    familyWealth === 'wealthy' ||
    (familyWealth === 'comfortable' && (parentalGenerosity ?? 70) >= 65)
  ) {
    return 'parents';
  }

  // 4. Self-paid if NPC has ample liquid cash
  if (npc.finances.cash >= annualTuitionLocalCurrency * 1.5) {
    return 'self_paid';
  }

  // 5. Canonical student loan (recorded strictly in npc.finances.studentDebt)
  return 'student_loan';
}

/**
 * Applies one year of higher-education tuition charges to `npc.finances` (Single Financial Source of Truth).
 */
function applyAnnualTuitionToFinances(
  finances: NpcProfile['finances'],
  fundingType: TuitionFunding | undefined,
  annualTuitionLocalCurrency: number
): NpcProfile['finances'] {
  if (
    !fundingType ||
    fundingType === 'scholarship_merit' ||
    fundingType === 'scholarship_athletic' ||
    fundingType === 'parents' ||
    annualTuitionLocalCurrency <= 0
  ) {
    return finances;
  }

  const tuition = Math.round(annualTuitionLocalCurrency);
  const updated = { ...finances };

  if (fundingType === 'self_paid') {
    if (updated.cash >= tuition) {
      updated.cash -= tuition;
    } else {
      const remainder = tuition - Math.max(0, updated.cash);
      updated.cash = 0;
      updated.studentDebt += remainder;
    }
  } else if (fundingType === 'student_loan') {
    updated.studentDebt += tuition;
  }

  updated.netWorth = calculateCanonicalNetWorth(updated);
  return updated;
}

export interface NpcEducationYearResult {
  updatedNpc: NpcProfile;
  lifeEvents: NpcLifeEvent[];
}

/**
 * Advances an NPC's education state by one simulation year.
 * Pure function: never mutates the input NPC or any player state.
 * Records any student loan debt strictly in `npc.finances.studentDebt`.
 */
export function progressNpcEducationForYear(
  npc: NpcProfile,
  currentYear: number,
  prng: SeededPRNG,
  options?: {
    familyWealth?: FamilyWealth;
    parentalGenerosity?: number;
  }
): NpcEducationYearResult {
  if (!npc.isAlive) {
    return { updatedNpc: npc, lifeEvents: [] };
  }

  const lifeEvents: NpcLifeEvent[] = [];
  const edu = {
    ...npc.education,
    history: [...npc.education.history],
    diplomas: [...(npc.education.diplomas ?? [])],
  };
  let finances = { ...npc.finances };
  let personality = { ...npc.personality };
  let occupation = npc.career.occupation;

  const econ = getCountryEconomicProfile(npc.location.country);

  // 1. Pre-school (Ages 0 - 4)
  if (npc.age <= 4) {
    edu.currentStage = 'none';
    occupation = npc.age <= 2 ? 'Infant' : 'Toddler';
    return {
      updatedNpc: {
        ...npc,
        education: edu,
        career: { ...npc.career, occupation, title: occupation },
      },
      lifeEvents,
    };
  }

  // 2. Enroll in Elementary School at Age 5
  if (npc.age === 5 && edu.currentStage === 'none') {
    const schoolName = generateDeterministicSchoolName(
      npc.location.city,
      'elementary',
      prng
    );
    edu.currentStage = 'elementary';
    edu.schoolName = schoolName;
    edu.stageStartYear = currentYear;
    edu.stageYearsCompleted = 0;
    edu.stageTotalYears = SCHOOL_STAGE_CONFIG.elementary.totalYears;
    edu.grades = driftNpcGrades(npc, prng);
    occupation = SCHOOL_STAGE_CONFIG.elementary.occupationLabel;

    lifeEvents.push(
      createDeduplicatedLifeEvent({
        npcId: npc.id,
        year: currentYear,
        age: npc.age,
        type: 'education_enrollment',
        title: 'Started Elementary School',
        description: `${npc.firstName} enrolled at ${schoolName}.`,
        referenceId: 'elementary',
      })
    );
  }
  // 3. Elementary -> Middle School transition at Age 11
  else if (npc.age === 11 && (edu.currentStage === 'elementary' || edu.currentStage === 'none')) {
    if (edu.currentStage === 'elementary' && edu.schoolName) {
      const meta = getLetterGradeMeta(edu.grades);
      const historyEntry: NpcEducationHistoryEntry = {
        stage: 'elementary',
        schoolName: edu.schoolName,
        startYear: edu.stageStartYear ?? currentYear - 6,
        endYear: currentYear,
        gpaOrGrade: `${meta.letter} (${edu.grades}%)`,
        graduated: true,
      };
      edu.history.push(historyEntry);
    }

    const schoolName = generateDeterministicSchoolName(
      npc.location.city,
      'middle_school',
      prng
    );
    edu.currentStage = 'middle_school';
    edu.schoolName = schoolName;
    edu.stageStartYear = currentYear;
    edu.stageYearsCompleted = 0;
    edu.stageTotalYears = SCHOOL_STAGE_CONFIG.middle_school.totalYears;
    edu.grades = driftNpcGrades(npc, prng);
    occupation = SCHOOL_STAGE_CONFIG.middle_school.occupationLabel;

    lifeEvents.push(
      createDeduplicatedLifeEvent({
        npcId: npc.id,
        year: currentYear,
        age: npc.age,
        type: 'education_enrollment',
        title: 'Started Middle School',
        description: `${npc.firstName} started Middle School at ${schoolName}.`,
        referenceId: 'middle_school',
      })
    );
  }
  // 4. Middle School -> High School transition at Age 14
  else if (
    npc.age === 14 &&
    (edu.currentStage === 'middle_school' ||
      edu.currentStage === 'elementary' ||
      edu.currentStage === 'none')
  ) {
    if (edu.currentStage === 'middle_school' && edu.schoolName) {
      const meta = getLetterGradeMeta(edu.grades);
      edu.history.push({
        stage: 'middle_school',
        schoolName: edu.schoolName,
        startYear: edu.stageStartYear ?? currentYear - 3,
        endYear: currentYear,
        gpaOrGrade: `${meta.letter} (${edu.grades}%)`,
        graduated: true,
      });
    }

    const schoolName = generateDeterministicSchoolName(
      npc.location.city,
      'high_school',
      prng
    );
    edu.currentStage = 'high_school';
    edu.schoolName = schoolName;
    edu.stageStartYear = currentYear;
    edu.stageYearsCompleted = 0;
    edu.stageTotalYears = SCHOOL_STAGE_CONFIG.high_school.totalYears;
    edu.grades = driftNpcGrades(npc, prng);
    occupation = SCHOOL_STAGE_CONFIG.high_school.occupationLabel;

    lifeEvents.push(
      createDeduplicatedLifeEvent({
        npcId: npc.id,
        year: currentYear,
        age: npc.age,
        type: 'education_enrollment',
        title: 'Started High School',
        description: `${npc.firstName} enrolled at ${schoolName}.`,
        referenceId: 'high_school',
      })
    );
  }
  // 5. Ongoing K-12 year (ages 6-10, 12-13, 15-17)
  else if (
    (edu.currentStage === 'elementary' ||
      edu.currentStage === 'middle_school' ||
      edu.currentStage === 'high_school') &&
    npc.age < 18
  ) {
    edu.grades = driftNpcGrades(npc, prng);
    edu.stageYearsCompleted = (edu.stageYearsCompleted ?? 0) + 1;

    // Small dropout check at age 16-17 for severely failing rebellious students
    if (
      edu.currentStage === 'high_school' &&
      npc.age >= 16 &&
      edu.grades < 38 &&
      npc.personality.conscientiousness < 32 &&
      prng.chance(0.25)
    ) {
      const meta = getLetterGradeMeta(edu.grades);
      edu.history.push({
        stage: 'high_school',
        schoolName: edu.schoolName ?? `${npc.location.city} High School`,
        startYear: edu.stageStartYear ?? currentYear - (npc.age - 14),
        endYear: currentYear,
        gpaOrGrade: `${meta.letter} (${edu.grades}%)`,
        graduated: false,
      });
      edu.currentStage = 'dropped_out';
      edu.schoolName = null;
      occupation = 'Unemployed';
    } else {
      occupation = SCHOOL_STAGE_CONFIG[edu.currentStage].occupationLabel;
    }
  }
  // 6. High School Graduation & University Decision at Age 18
  else if (npc.age === 18 && edu.currentStage === 'high_school') {
    edu.grades = driftNpcGrades(npc, prng);
    const meta = getLetterGradeMeta(edu.grades);
    const hsSchoolName = edu.schoolName ?? `${npc.location.city} High School`;
    const graduatedHS = edu.grades >= 40;

    edu.history.push({
      stage: 'high_school',
      schoolName: hsSchoolName,
      startYear: edu.stageStartYear ?? currentYear - 4,
      endYear: currentYear,
      gpaOrGrade: `${meta.letter} (${edu.grades}%)`,
      graduated: graduatedHS,
    });

    if (!graduatedHS) {
      edu.currentStage = 'dropped_out';
      edu.schoolName = null;
      occupation = 'Unemployed';
    } else {
      const hsDiploma =
        edu.grades >= 88 ? 'High School Diploma with Honors' : 'High School Diploma';
      if (!edu.diplomas.includes(hsDiploma)) {
        edu.diplomas.push(hsDiploma);
      }
      edu.degreeEarned = hsDiploma;
      personality = evolveNpcPersonality(personality, 'graduation');

      lifeEvents.push(
        createDeduplicatedLifeEvent({
          npcId: npc.id,
          year: currentYear,
          age: npc.age,
          type: 'graduation',
          title: 'Graduated High School',
          description: `${npc.firstName} graduated from ${hsSchoolName} with a ${hsDiploma} (${meta.letter}).`,
          referenceId: 'high_school_graduation',
        })
      );

      // Evaluate University Enrollment
      const npcWithHS: NpcProfile = { ...npc, education: edu, personality };
      const uniDecision = evaluateUniversityEnrollmentDecision(
        npcWithHS,
        options?.familyWealth,
        prng
      );
      const selectedMajor = uniDecision.chosen
        ? selectUniversityMajorForNpc(npcWithHS, prng)
        : null;

      if (selectedMajor) {
        const uniName = generateDeterministicUniversityName(npc.location.city, prng);
        const annualTuitionLocal = Math.round(
          selectedMajor.tuitionPerYear * econ.pppCostMultiplier * econ.usdExchangeRate
        );
        const fundingType = resolveNpcTuitionFunding({
          npc: npcWithHS,
          annualTuitionLocalCurrency: annualTuitionLocal,
          isAthleticProgram: selectedMajor.id === 'sports_science',
          familyWealth: options?.familyWealth,
          parentalGenerosity: options?.parentalGenerosity,
        });

        edu.currentStage = 'university';
        edu.schoolName = uniName;
        edu.fieldOfStudy = selectedMajor.name;
        edu.enrolledProgramId = selectedMajor.id;
        edu.stageStartYear = currentYear;
        edu.stageYearsCompleted = 0;
        edu.stageTotalYears = UNIVERSITY_TOTAL_YEARS;
        edu.tuitionPerYear = annualTuitionLocal;
        edu.fundingType = fundingType;
        occupation = `University Student (${selectedMajor.name})`;

        finances = applyAnnualTuitionToFinances(
          finances,
          fundingType,
          annualTuitionLocal
        );

        lifeEvents.push(
          createDeduplicatedLifeEvent({
            npcId: npc.id,
            year: currentYear,
            age: npc.age,
            type: 'education_enrollment',
            title: `Enrolled at ${uniName}`,
            description: `${npc.firstName} enrolled in ${selectedMajor.name} (${selectedMajor.degreeTitle}) at ${uniName}.`,
            referenceId: `uni_${selectedMajor.id}`,
          })
        );
      } else {
        edu.currentStage = 'graduated';
        edu.schoolName = null;
        occupation = 'Unemployed';
      }
    }
  }
  // 7. University Progression & Graduation
  else if (edu.currentStage === 'university') {
    edu.grades = driftNpcGrades(npc, prng);
    const completedYears = (edu.stageYearsCompleted ?? 0) + 1;
    const totalYears = edu.stageTotalYears ?? UNIVERSITY_TOTAL_YEARS;
    edu.stageYearsCompleted = completedYears;

    if (completedYears < totalYears) {
      // Accrue tuition for continuing year
      finances = applyAnnualTuitionToFinances(
        finances,
        edu.fundingType,
        edu.tuitionPerYear ?? 0
      );
      occupation = edu.fieldOfStudy
        ? `University Student (${edu.fieldOfStudy})`
        : 'University Student';
    } else {
      // Graduating University!
      const major = UNIVERSITY_MAJORS.find((m) => m.id === edu.enrolledProgramId);
      const degreeTitle =
        major?.degreeTitle ??
        (edu.fieldOfStudy ? `B.S. in ${edu.fieldOfStudy}` : 'Bachelor’s Degree');
      const uniName = edu.schoolName ?? `${npc.location.city} State University`;
      const meta = getLetterGradeMeta(edu.grades);

      edu.history.push({
        stage: 'university',
        schoolName: uniName,
        startYear: edu.stageStartYear ?? currentYear - totalYears,
        endYear: currentYear,
        gpaOrGrade: `${meta.letter} (${edu.grades}%)`,
        graduated: true,
      });

      if (!edu.diplomas.includes(degreeTitle)) {
        edu.diplomas.push(degreeTitle);
      }
      edu.degreeEarned = degreeTitle;
      personality = evolveNpcPersonality(personality, 'graduation');

      lifeEvents.push(
        createDeduplicatedLifeEvent({
          npcId: npc.id,
          year: currentYear,
          age: npc.age,
          type: 'graduation',
          title: `Graduated from ${uniName}`,
          description: `${npc.firstName} earned a ${degreeTitle} from ${uniName} (${meta.letter}).`,
          referenceId: `uni_grad_${edu.enrolledProgramId ?? 'bachelors'}`,
        })
      );

      // Evaluate Professional / Graduate School
      const npcWithDegree: NpcProfile = {
        ...npc,
        education: edu,
        finances,
        personality,
      };
      const gradDecision = evaluateProfessionalSchoolDecision(npcWithDegree, prng);
      const selectedProfSchool = gradDecision.chosen
        ? selectProfessionalSchoolForNpc(npcWithDegree, prng)
        : null;

      if (selectedProfSchool) {
        const profSchoolName = generateDeterministicProfSchoolName(
          npc.location.city,
          selectedProfSchool.id,
          prng
        );
        const annualTuitionLocal = Math.round(
          selectedProfSchool.tuitionPerYear *
            econ.pppCostMultiplier *
            econ.usdExchangeRate
        );
        const fundingType = resolveNpcTuitionFunding({
          npc: npcWithDegree,
          annualTuitionLocalCurrency: annualTuitionLocal,
          familyWealth: options?.familyWealth,
          parentalGenerosity: options?.parentalGenerosity,
        });

        edu.currentStage = 'professional';
        edu.schoolName = profSchoolName;
        edu.fieldOfStudy = selectedProfSchool.name;
        edu.enrolledProgramId = selectedProfSchool.id;
        edu.stageStartYear = currentYear;
        edu.stageYearsCompleted = 0;
        edu.stageTotalYears = selectedProfSchool.durationYears;
        edu.tuitionPerYear = annualTuitionLocal;
        edu.fundingType = fundingType;
        occupation = `Graduate Student (${selectedProfSchool.name})`;

        finances = applyAnnualTuitionToFinances(
          finances,
          fundingType,
          annualTuitionLocal
        );

        lifeEvents.push(
          createDeduplicatedLifeEvent({
            npcId: npc.id,
            year: currentYear,
            age: npc.age,
            type: 'education_enrollment',
            title: `Admitted to ${profSchoolName}`,
            description: `${npc.firstName} enrolled in ${selectedProfSchool.name} (${selectedProfSchool.degreeAwarded}).`,
            referenceId: `prof_${selectedProfSchool.id}`,
          })
        );
      } else {
        edu.currentStage = 'graduated';
        edu.schoolName = null;
        edu.enrolledProgramId = undefined;
        edu.tuitionPerYear = undefined;
        edu.fundingType = undefined;
        occupation = 'Unemployed';
      }
    }
  }
  // 8. Professional / Graduate School Progression & Graduation
  else if (edu.currentStage === 'professional') {
    edu.grades = driftNpcGrades(npc, prng);
    const completedYears = (edu.stageYearsCompleted ?? 0) + 1;
    const profTemplate = PROFESSIONAL_SCHOOLS_CATALOG.find(
      (s) => s.id === edu.enrolledProgramId
    );
    const totalYears = edu.stageTotalYears ?? profTemplate?.durationYears ?? 2;
    edu.stageYearsCompleted = completedYears;

    if (completedYears < totalYears) {
      finances = applyAnnualTuitionToFinances(
        finances,
        edu.fundingType,
        edu.tuitionPerYear ?? 0
      );
      occupation = edu.fieldOfStudy
        ? `Graduate Student (${edu.fieldOfStudy})`
        : 'Graduate Student';
    } else {
      const degreeAwarded =
        profTemplate?.degreeAwarded ?? 'Master of Science (M.S. / Ph.D.)';
      const schoolName =
        edu.schoolName ?? `${npc.location.city} School of Graduate Studies`;
      const meta = getLetterGradeMeta(edu.grades);

      edu.history.push({
        stage: 'professional',
        schoolName,
        startYear: edu.stageStartYear ?? currentYear - totalYears,
        endYear: currentYear,
        gpaOrGrade: `${meta.letter} (${edu.grades}%)`,
        graduated: true,
      });

      if (!edu.diplomas.includes(degreeAwarded)) {
        edu.diplomas.push(degreeAwarded);
      }
      edu.degreeEarned = degreeAwarded;
      edu.currentStage = 'graduated';
      edu.schoolName = null;
      edu.enrolledProgramId = undefined;
      edu.tuitionPerYear = undefined;
      edu.fundingType = undefined;
      occupation = 'Unemployed';
      personality = evolveNpcPersonality(personality, 'graduation');

      lifeEvents.push(
        createDeduplicatedLifeEvent({
          npcId: npc.id,
          year: currentYear,
          age: npc.age,
          type: 'graduation',
          title: `Earned ${degreeAwarded}`,
          description: `${npc.firstName} graduated from ${schoolName} with a ${degreeAwarded} (${meta.letter}).`,
          referenceId: `prof_grad_${profTemplate?.id ?? 'grad'}`,
        })
      );
    }
  }

  return {
    updatedNpc: {
      ...npc,
      personality,
      education: edu,
      finances,
      career: {
        ...npc.career,
        occupation,
        title: npc.career.jobId ? npc.career.title : occupation,
      },
    },
    lifeEvents,
  };
}

