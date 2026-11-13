import type { CharacterProfile } from '../../../types/game';
import type { ActiveBusinessProfile } from '../../business/types';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { performPrisonAction, PRISON_WORK_PAY, progressPrisonForYear } from '../services/prisonService';
import {
  createEmptyCrimeState,
  isCurrentlyIncarcerated,
  isOnProbation,
} from '../services/crimeSelectors';
import type { CrimeRecordEntry, PrisonState } from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function makePrisonRecord(): CrimeRecordEntry {
  return {
    id: 'rec-prison-1',
    crimeId: 'robbery',
    title: 'Armed Robbery',
    tier: 'high_stakes',
    offenseClass: 'felony',
    jurisdiction: 'adult',
    age: 24,
    year: 2024,
    executionSucceeded: true,
    detected: true,
    injured: false,
    outcome: 'imprisoned',
    attemptedPayout: 4000,
    payout: 0,
    fineImposed: 3000,
    finePaid: 3000,
    attorneyFeePaid: 0,
    sentenceYears: 4,
    sealed: false,
    expunged: false,
  };
}

function makePrisonState(overrides: Partial<PrisonState> = {}): PrisonState {
  return {
    facilityName: 'Blackstone Maximum Security Penitentiary',
    securityLevel: 'maximum',
    chargeTitle: 'Armed Robbery',
    yearsTotal: 4,
    yearsServed: 0,
    yearsRemaining: 4,
    behaviorScore: 55,
    paroleEligibleAtServed: 2,
    actionsTakenThisYear: 0,
    lastActionAge: null,
    lastProgressedAge: null,
    ...overrides,
  };
}

function createIncarceratedChar(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-prison-1',
    firstName: 'Marcus',
    lastName: 'Hale',
    gender: 'male',
    country: 'United States',
    city: 'Detroit',
    occupation: 'Incarcerated',
    birthYear: 2000,
    age: 24,
    isAlive: true,
    cash: 200,
    bankBalance: 5000,
    netWorth: 5200,
    stats: {
      health: 70,
      happiness: 45,
      smarts: 60,
      looks: 55,
      karma: 35,
    },
    parents: {
      father: {
        id: 'dad-p',
        role: 'father',
        firstName: 'Paul',
        lastName: 'Hale',
        age: 55,
        occupation: 'Driver',
        isAlive: true,
        relationship: 60,
        generosity: 50,
      },
      mother: {
        id: 'mom-p',
        role: 'mother',
        firstName: 'Diane',
        lastName: 'Hale',
        age: 53,
        occupation: 'Clerk',
        isAlive: true,
        relationship: 65,
        generosity: 55,
      },
      wealth: 'modest',
    },
    education: createInitialEducation(),
    career: createInitialCareerState(),
    relationships: [],
    timeline: [],
    seenEventIds: [],
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState(),
      records: [makePrisonRecord()],
    },
    ...overrides,
  };
}

function testPrisonActionsAndAnnualCooldown() {
  // Work detail
  const workRes = performPrisonAction(createIncarceratedChar(), 'work');
  assert(workRes.ok && workRes.cashEarned === PRISON_WORK_PAY, 'Work detail pays commissary pay');
  assert(workRes.character.cash === 200 + PRISON_WORK_PAY, 'Cash credited via applyEffects');
  assert(workRes.character.bankBalance === 5000, 'Bank balance untouched');
  assert(workRes.behaviorDelta === 3 && workRes.character.crime?.prison?.behaviorScore === 58, 'Behavior +3');
  assert(workRes.character.crime?.prison?.actionsTakenThisYear === 1, 'Tracks annual action count');

  // Duplicate action in the same age must fail cleanly
  const dupRes = performPrisonAction(workRes.character, 'study');
  assert(!dupRes.ok && dupRes.character === workRes.character, 'Blocks 2nd action at same age');

  // Study, workout, good_behavior
  const studyRes = performPrisonAction(createIncarceratedChar(), 'study');
  assert(studyRes.ok && studyRes.character.stats.smarts === 62, 'Study boosts Smarts +2');

  const workoutRes = performPrisonAction(createIncarceratedChar(), 'workout');
  assert(workoutRes.ok && workoutRes.character.stats.health === 73, 'Workout boosts Health +3');

  const goodRes = performPrisonAction(createIncarceratedChar(), 'good_behavior');
  assert(
    goodRes.ok &&
      goodRes.character.crime?.prison?.behaviorScore === 63 &&
      goodRes.character.stats.karma === 37,
    'Good behavior boosts Behavior +8 and Karma +2',
  );

  // Parole before eligibility must reject WITHOUT consuming the annual action
  const earlyParole = performPrisonAction(createIncarceratedChar(), 'parole');
  assert(!earlyParole.ok, 'Parole denied before serving paroleEligibleAtServed');
  assert(
    earlyParole.character.crime?.prison?.actionsTakenThisYear === 0,
    'Ineligible parole check does not consume annual action',
  );

  // Non-incarcerated / dead guards
  const freeChar = createIncarceratedChar({
    crime: { ...createEmptyCrimeState(), prison: null },
  });
  const freeAction = performPrisonAction(freeChar, 'work');
  assert(!freeAction.ok && freeAction.character === freeChar, 'Free char cannot take prison action');

  const deadChar = createIncarceratedChar({ isAlive: false });
  assert(!performPrisonAction(deadChar, 'work').ok, 'Dead char cannot take prison action');
}

function testAppealAndParoleOutcomes() {
  // Deterministic appeal grant reduces yearsRemaining by 1
  let grantedAppealRes: ReturnType<typeof performPrisonAction> | null = null;
  for (let i = 0; i < 120; i++) {
    const candidate = createIncarceratedChar({ id: `appeal-probe-${i}` });
    const res = performPrisonAction(candidate, 'appeal');
    if (res.ok && res.sentenceReductionYears > 0) {
      grantedAppealRes = res;
      break;
    }
  }
  assert(grantedAppealRes !== null, 'Found seed where judicial appeal succeeds');
  assert(
    grantedAppealRes.character.crime?.prison?.yearsRemaining === 3,
    'Successful appeal shaves 1 year off yearsRemaining',
  );

  // Deterministic parole grant at eligible yearsServed releases onto adult probation & keeps records
  let grantedParoleRes: ReturnType<typeof performPrisonAction> | null = null;
  for (let i = 0; i < 80; i++) {
    const candidate = createIncarceratedChar({
      id: `parole-probe-${i}`,
      age: 26,
      crime: {
        ...createEmptyCrimeState(),
        prison: makePrisonState({ yearsServed: 2, yearsRemaining: 2, behaviorScore: 85 }),
        records: [makePrisonRecord()],
      },
    });
    const res = performPrisonAction(candidate, 'parole');
    if (res.ok && res.released) {
      grantedParoleRes = res;
      break;
    }
  }
  assert(grantedParoleRes !== null, 'Found seed where parole is granted');
  assert(!isCurrentlyIncarcerated(grantedParoleRes.character), 'Parole clears PrisonState');
  assert(
    isOnProbation(grantedParoleRes.character) &&
      grantedParoleRes.character.crime?.probation?.jurisdiction === 'adult',
    'Parole establishes adult probation supervision',
  );
  assert(
    grantedParoleRes.character.crime?.records.length === 1 &&
      grantedParoleRes.character.crime?.records[0].outcome === 'imprisoned',
    'Parole preserves historical conviction record',
  );
}

function testSentenceProgressionCompletionAndDuplicateGuard() {
  let current = createIncarceratedChar();

  // Step year 1 (age 24 -> 25): 1 served, 3 remaining
  const yr1 = progressPrisonForYear(current, 25);
  assert(
    yr1.prison !== null &&
      yr1.prison.yearsServed === 1 &&
      yr1.prison.yearsRemaining === 3 &&
      !yr1.releasedFromPrison &&
      yr1.prison.facilityName === 'Blackstone Maximum Security Penitentiary' &&
      yr1.prison.securityLevel === 'maximum',
    'Year 1 advances served/remaining and preserves facility/securityLevel',
  );

  current = {
    ...current,
    age: 25,
    crime: { ...current.crime!, prison: yr1.prison },
  };

  // Duplicate call for same targetAge 25 must no-op
  const dupYr1 = progressPrisonForYear(current, 25);
  assert(
    dupYr1.prison?.yearsServed === 1 && dupYr1.prison?.yearsRemaining === 3,
    'Duplicate progression for age 25 is a no-op',
  );

  // Advance years 2, 3, and 4 -> release at age 28
  for (let age = 26; age <= 28; age++) {
    const step = progressPrisonForYear(current, age);
    current = {
      ...current,
      age,
      crime: { ...current.crime!, prison: step.prison },
    };
    if (age < 28) {
      assert(step.prison !== null && !step.releasedFromPrison, `Still serving at age ${age}`);
    } else {
      assert(
        step.prison === null && step.releasedFromPrison,
        'Sentence reaches 0 at year 4 and releases player cleanly',
      );
    }
  }

  assert(!isCurrentlyIncarcerated(current), 'Player is no longer incarcerated after sentence');
  assert(
    current.crime?.records.length === 1 && current.crime.records[0].outcome === 'imprisoned',
    'Conviction record remains intact after release',
  );
}

function makeSampleBusiness(isPublic = false): ActiveBusinessProfile {
  return {
    id: 'biz-prison-rel-1',
    templateId: 'coffee_shop',
    name: 'Beacon Ventures',
    sector: 'food_hospitality',
    icon: '☕',
    foundedAge: 22,
    foundedYear: 2022,
    treasury: 30000,
    valuation: 150000,
    equityPct: 100,
    pricing: 'standard',
    marketing: 'organic',
    payroll: 'standard',
    rnd: 'balanced',
    ownerSalary: 40000,
    dividendRatePct: 40,
    morale: 75,
    brandReputation: 70,
    qualityScore: 72,
    employeeCount: 4,
    locationsCount: 1,
    equipmentTier: 0,
    hasAuditCompleted: false,
    actionCooldowns: {},
    outstandingLoan: 0,
    annualLoanPayment: 0,
    yearsInOperation: 3,
    lifetimeRevenue: 200000,
    lifetimeProfit: 45000,
    isPubliclyTraded: isPublic,
  };
}

function findParoleRelease(base: CharacterProfile) {
  for (let i = 0; i < 120; i++) {
    const res = performPrisonAction({ ...base, id: `parole-occ-${i}` }, 'parole');
    if (res.ok && res.released) return res;
  }
  return null;
}

function findAppealRelease(base: CharacterProfile) {
  for (let i = 0; i < 150; i++) {
    const res = performPrisonAction({ ...base, id: `appeal-occ-${i}` }, 'appeal');
    if (res.ok && res.released) return res;
  }
  return null;
}

function testMidYearAppealAndParoleOccupationRestoration() {
  // 1. Mid-year appeal release with active business (private & public)
  const bizAppealChar = createIncarceratedChar({
    occupation: 'Incarcerated',
    business: makeSampleBusiness(false),
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({ yearsRemaining: 1, yearsServed: 1, behaviorScore: 85 }),
    },
  });
  const bizAppealRes = findAppealRelease(bizAppealChar);
  assert(bizAppealRes !== null && bizAppealRes.released, 'Found appeal release seed');
  assert(
    bizAppealRes.character.occupation === 'Founder & CEO (Beacon Ventures)',
    'Mid-year appeal restores Founder & CEO occupation for active private business',
  );
  assert(
    bizAppealRes.character.business?.id === 'biz-prison-rel-1',
    'Active business remains intact after appeal release',
  );

  const publicBizParoleChar = createIncarceratedChar({
    occupation: 'Incarcerated',
    business: makeSampleBusiness(true),
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({ yearsServed: 2, yearsRemaining: 2, behaviorScore: 85 }),
    },
  });
  const publicBizParoleRes = findParoleRelease(publicBizParoleChar);
  assert(publicBizParoleRes !== null, 'Found parole release seed for public business');
  assert(
    publicBizParoleRes.character.occupation === 'Public CEO & Founder (Beacon Ventures)',
    'Mid-year parole restores Public CEO & Founder occupation for public business',
  );

  // 2. Mid-year parole release for under-18 High School Dropout
  const teenDropoutChar = createIncarceratedChar({
    age: 16,
    occupation: 'Incarcerated',
    education: {
      ...createInitialEducation(),
      currentStage: 'dropped_out',
      schoolName: null,
      gradeLevelLabel: 'High School Dropout',
      studentDebt: 0,
    },
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({
        yearsServed: 1,
        yearsRemaining: 1,
        paroleEligibleAtServed: 1,
        behaviorScore: 85,
      }),
    },
  });
  const teenDropoutParole = findParoleRelease(teenDropoutChar);
  assert(teenDropoutParole !== null, 'Found parole seed for teen dropout');
  assert(
    teenDropoutParole.character.occupation === 'High School Dropout',
    'Under-18 High School Dropout restores High School Dropout on mid-year parole',
  );

  // 3. Mid-year appeal release for Law School professional student
  const lawAppealChar = createIncarceratedChar({
    age: 25,
    occupation: 'Incarcerated',
    education: {
      ...createInitialEducation(),
      currentStage: 'professional_school',
      schoolName: 'Boston School of Law',
      studentDebt: 19500,
      professionalSchool: {
        schoolId: 'law_school',
        schoolName: 'Boston School of Law',
        programName: 'Law School',
        degreeAwarded: 'Juris Doctor (J.D.)',
        year: 2,
        totalYears: 3,
        fundingType: 'student_loan',
        tuitionPerYear: 19500,
      },
    },
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({ yearsServed: 1, yearsRemaining: 1, behaviorScore: 85 }),
    },
  });
  const lawAppealRes = findAppealRelease(lawAppealChar);
  assert(lawAppealRes !== null, 'Found appeal release seed for law student');
  assert(
    lawAppealRes.character.occupation === 'Law Student',
    'Mid-year appeal restores Law Student for professional-school student',
  );
  assert(
    lawAppealRes.character.education.studentDebt === 19500 &&
      lawAppealRes.character.education.professionalSchool?.schoolId === 'law_school',
    'Education and student debt remain intact on mid-year appeal release',
  );

  // 4. Mid-year parole release for University Student
  const uniParoleChar = createIncarceratedChar({
    age: 20,
    occupation: 'Incarcerated',
    education: {
      ...createInitialEducation(),
      currentStage: 'university',
      schoolName: 'State University',
      yearInStage: 2,
      totalYearsInStage: 4,
    },
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({
        yearsServed: 1,
        yearsRemaining: 2,
        paroleEligibleAtServed: 1,
        behaviorScore: 85,
      }),
    },
  });
  const uniParoleRes = findParoleRelease(uniParoleChar);
  assert(uniParoleRes !== null, 'Found parole seed for university student');
  assert(
    uniParoleRes.character.occupation === 'University Student',
    'Mid-year parole restores University Student occupation',
  );

  // 5. Mid-year parole release for Retired character & Unemployed character
  const retiredParoleChar = createIncarceratedChar({
    age: 67,
    occupation: 'Incarcerated',
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({
        yearsServed: 1,
        yearsRemaining: 1,
        paroleEligibleAtServed: 1,
        behaviorScore: 85,
        priorRetirementOccupation: 'Retired',
      }),
    },
  });
  const retiredParoleRes = findParoleRelease(retiredParoleChar);
  assert(retiredParoleRes !== null, 'Found parole seed for retired character');
  assert(
    retiredParoleRes.character.occupation === 'Retired',
    'Mid-year parole restores Retired occupation',
  );

  const unemployedParoleChar = createIncarceratedChar({
    age: 30,
    occupation: 'Incarcerated',
    education: { ...createInitialEducation(), currentStage: 'graduated' },
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({
        yearsServed: 1,
        yearsRemaining: 1,
        paroleEligibleAtServed: 1,
        behaviorScore: 85,
        priorRetirementOccupation: null,
      }),
    },
  });
  const unemployedParoleRes = findParoleRelease(unemployedParoleChar);
  assert(unemployedParoleRes !== null, 'Found parole seed for unemployed character');
  assert(
    unemployedParoleRes.character.occupation === 'Unemployed',
    'Released character with no career/education/business/retirement resolves to Unemployed',
  );
}

testPrisonActionsAndAnnualCooldown();
testAppealAndParoleOutcomes();
testSentenceProgressionCompletionAndDuplicateGuard();
testMidYearAppealAndParoleOccupationRestoration();
console.log('prisonSimulation.test.ts passed all assertions');

