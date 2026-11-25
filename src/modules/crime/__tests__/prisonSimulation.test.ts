import type { CharacterProfile } from '../../../types/game';
import type { ActiveBusinessProfile } from '../../business/types';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { performPrisonAction, PRISON_WORK_PAY, progressPrisonForYear } from '../services/prisonService';
import { applyCourtOutcome } from '../services/crimeService';
import { progressCrimeForYear } from '../services/crimeYearService';
import {
  createEmptyCrimeState,
  getCrimeLegalStatus,
  getSanitizedCrimeState,
  isCurrentlyIncarcerated,
  isOnProbation,
} from '../services/crimeSelectors';
import type { CrimeRecordEntry, PendingCourtCase, PrisonState } from '../types';

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

  // Repeating the same action at the same age must fail cleanly without consuming the 2nd slot
  const sameRes = performPrisonAction(workRes.character, 'work');
  assert(
    !sameRes.ok &&
      sameRes.character === workRes.character &&
      sameRes.character.crime?.prison?.actionsTakenThisYear === 1,
    'Blocks repeating the exact same prison action in the same year without consuming 2nd slot',
  );

  // 2nd distinct action in the same age succeeds under the 2-action annual allowance
  const secondRes = performPrisonAction(workRes.character, 'study');
  assert(
    secondRes.ok &&
      secondRes.character.stats.smarts === 62 &&
      secondRes.character.crime?.prison?.actionsTakenThisYear === 2,
    'Allows 2nd distinct prison action in the same year',
  );

  // 3rd action at the same age must fail cleanly
  const thirdRes = performPrisonAction(secondRes.character, 'workout');
  assert(!thirdRes.ok && thirdRes.character === secondRes.character, 'Blocks 3rd action at same age');

  // Study, workout (+6 Health), good_behavior
  const studyRes = performPrisonAction(createIncarceratedChar(), 'study');
  assert(studyRes.ok && studyRes.character.stats.smarts === 62, 'Study boosts Smarts +2');

  const workoutRes = performPrisonAction(createIncarceratedChar(), 'workout');
  assert(workoutRes.ok && workoutRes.character.stats.health === 76, 'Workout boosts Health +6');

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

function testAppealOriginCompletionAndParoleProbationPreservation() {
  // 1. Mid-year appeal commuting sentence to 0 marks ONLY originCaseId completed and resumes paused_incarceration business
  const appealTargetRec: CrimeRecordEntry = {
    ...makePrisonRecord(),
    id: 'appeal-orig-rec',
    sentenceStatus: 'active',
  };
  const unrelatedProbRec: CrimeRecordEntry = {
    ...makePrisonRecord(),
    id: 'unrelated-prob-rec',
    crimeId: 'burglary',
    title: 'Burglary',
    outcome: 'probation',
    sentenceStatus: 'active',
  };
  const appealChar = createIncarceratedChar({
    occupation: 'Incarcerated',
    business: {
      ...makeSampleBusiness(false),
      operationalStatus: 'paused_incarceration',
      managementCapability: 'legacy_unassigned',
    },
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({
        yearsServed: 1,
        yearsRemaining: 1,
        behaviorScore: 85,
        originCaseId: 'appeal-orig-rec',
      }),
      records: [unrelatedProbRec, appealTargetRec],
    },
  });
  const appealRelease = findAppealRelease(appealChar);
  assert(appealRelease !== null && appealRelease.released, 'Found appeal commutation release');
  assert(
    appealRelease.character.business?.operationalStatus === 'active' &&
      appealRelease.character.crime?.records.find((r) => r.id === 'appeal-orig-rec')?.sentenceStatus === 'completed' &&
      appealRelease.character.crime?.records.find((r) => r.id === 'unrelated-prob-rec')?.sentenceStatus === 'active',
    'Appeal release resumes paused_incarceration business and marks ONLY originCaseId sentence completed',
  );

  // 2. Parole preserves prior probation activeTerms & conditions alongside new parole term
  const paroleChar = createIncarceratedChar({
    occupation: 'Incarcerated',
    business: {
      ...makeSampleBusiness(false),
      operationalStatus: 'paused_incarceration',
    },
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({
        yearsServed: 2,
        yearsRemaining: 2,
        behaviorScore: 85,
        originCaseId: 'parole-orig-rec',
      }),
      probation: {
        chargeTitle: 'Burglary',
        jurisdiction: 'adult',
        yearsRemaining: 1,
        startedAtAge: 23,
        lastProgressedAge: null,
        conditions: ['supervision_checkins', 'community_service', 'restitution_payments'],
        activeTerms: [
          {
            recordId: 'unrelated-prob-rec',
            chargeTitle: 'Burglary',
            jurisdiction: 'adult',
            yearsRemaining: 1,
            startedAtAge: 23,
            communityServiceHoursRemaining: 12,
            technicalWarnings: 0,
            violationCount: 0,
          },
        ],
      },
      records: [unrelatedProbRec, { ...appealTargetRec, id: 'parole-orig-rec' }],
    },
  });
  const paroleRelease = findParoleRelease(paroleChar);
  assert(paroleRelease !== null && paroleRelease.released, 'Found parole release with prior probation');
  const nextProb = paroleRelease.character.crime?.probation;
  assert(
    nextProb !== null &&
      nextProb !== undefined &&
      nextProb.activeTerms?.length === 2 &&
      nextProb.activeTerms.some((t) => t.recordId === 'unrelated-prob-rec' && t.communityServiceHoursRemaining === 12) &&
      nextProb.activeTerms.some((t) => t.recordId === 'parole-orig-rec' && t.yearsRemaining === 2) &&
      nextProb.conditions?.includes('community_service') &&
      nextProb.conditions?.includes('restitution_payments') &&
      paroleRelease.character.business?.operationalStatus === 'active' &&
      paroleRelease.character.crime?.records.find((r) => r.id === 'parole-orig-rec')?.sentenceStatus === 'active',
    'Parole preserves prior probation terms/conditions, resumes paused business, and keeps parole record active',
  );
}

function testMidYearReleaseFreezeOriginIdentityAndLegacyParoleLifecycle() {
  const unrelatedPrisonRec: CrimeRecordEntry = {
    ...makePrisonRecord(),
    id: 'unrelated-prison-rec',
    title: 'Bank Heist',
    crimeId: 'bank_heist',
    sentenceStatus: 'active',
  };
  const concurrentProbRec: CrimeRecordEntry = {
    ...makePrisonRecord(),
    id: 'concurrent-prob-1y',
    crimeId: 'burglary',
    title: 'Burglary',
    outcome: 'probation',
    sentenceYears: 0,
    sentenceStatus: 'active',
  };
  const paroleOrigRec: CrimeRecordEntry = {
    ...makePrisonRecord(),
    id: 'parole-origin-2y',
    crimeId: 'robbery',
    title: 'Armed Robbery',
    outcome: 'imprisoned',
    sentenceYears: 4,
    sentenceStatus: 'active',
  };

  // 1 & 3 & 6. Parole with valid originCaseId + concurrent 1y probation -> Age Up release-year freeze ->
  //            post-release countdown -> independent completion leaving unrelated records untouched
  const paroleBase = createIncarceratedChar({
    age: 26,
    occupation: 'Incarcerated',
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({
        chargeTitle: 'Armed Robbery',
        yearsServed: 2,
        yearsRemaining: 2,
        behaviorScore: 88,
        originCaseId: 'parole-origin-2y',
      }),
      probation: {
        chargeTitle: 'Burglary',
        jurisdiction: 'adult',
        yearsRemaining: 1,
        startedAtAge: 24,
        lastProgressedAge: null,
        conditions: ['supervision_checkins', 'community_service', 'no_new_offenses'],
        activeTerms: [
          {
            recordId: 'concurrent-prob-1y',
            chargeTitle: 'Burglary',
            jurisdiction: 'adult',
            yearsRemaining: 1,
            startedAtAge: 24,
            communityServiceHoursRemaining: 10,
            technicalWarnings: 0,
            violationCount: 0,
          },
        ],
      },
      records: [unrelatedPrisonRec, concurrentProbRec, paroleOrigRec],
    },
  });

  const paroled = findParoleRelease(paroleBase);
  assert(paroled !== null && paroled.released, 'Found parole grant for multi-year lifecycle test');
  assert(
    paroled.character.crime?.prison === null &&
      paroled.character.crime?.lastMidYearReleaseAge === 26 &&
      getCrimeLegalStatus(
        paroled.character.crime.records.find((r) => r.id === 'parole-origin-2y')!,
        paroled.character,
      ) === 'convicted',
    'Parole clears prison, records lastMidYearReleaseAge=26, and keeps originating sentence active',
  );

  // Release-year Age Up (26 -> 27): BOTH activeTerms[] stay frozen & marker clears to null
  const age27 = progressCrimeForYear(paroled.character, 27, {
    incomingCash: 0,
    postExpenseSpendableCash: 0,
  });
  assert(
    age27.crime?.lastMidYearReleaseAge === null &&
      age27.crime?.probation?.yearsRemaining === 2 &&
      age27.crime?.probation?.activeTerms?.length === 2 &&
      age27.crime.probation.activeTerms.find((t) => t.recordId === 'concurrent-prob-1y')?.yearsRemaining === 1 &&
      age27.crime.probation.activeTerms.find((t) => t.recordId === 'parole-origin-2y')?.yearsRemaining === 2 &&
      age27.crime.records.find((r) => r.id === 'concurrent-prob-1y')?.sentenceStatus === 'active' &&
      age27.crime.records.find((r) => r.id === 'parole-origin-2y')?.sentenceStatus === 'active' &&
      age27.crime.records.find((r) => r.id === 'unrelated-prison-rec')?.sentenceStatus === 'active',
    'Release-year Age Up (26 -> 27) freezes all parole and concurrent probation terms and clears marker',
  );

  // Post-release Year 1 (27 -> 28): concurrent 1y completes; parole drops 2 -> 1 and stays active
  const age28Char: CharacterProfile = { ...paroled.character, age: 27, crime: age27.crime };
  const age28 = progressCrimeForYear(age28Char, 28, {
    incomingCash: 0,
    postExpenseSpendableCash: 0,
  });
  assert(
    !age28.probationCompleted &&
      age28.crime?.probation?.yearsRemaining === 1 &&
      age28.crime?.probation?.activeTerms?.length === 1 &&
      age28.crime.probation.activeTerms[0].recordId === 'parole-origin-2y' &&
      age28.crime.records.find((r) => r.id === 'concurrent-prob-1y')?.sentenceStatus === 'completed' &&
      age28.crime.records.find((r) => r.id === 'parole-origin-2y')?.sentenceStatus === 'active' &&
      age28.crime.records.find((r) => r.id === 'unrelated-prison-rec')?.sentenceStatus === 'active',
    'Following year completes only concurrent 1y term while keeping parole originCaseId active',
  );

  // Post-release Year 2 (28 -> 29): parole finishes 1 -> 0 and completes ONLY parole-origin-2y
  const age29Char: CharacterProfile = { ...age28Char, age: 28, crime: age28.crime };
  const age29 = progressCrimeForYear(age29Char, 29, {
    incomingCash: 0,
    postExpenseSpendableCash: 0,
  });
  assert(
    age29.probationCompleted &&
      age29.crime?.probation === null &&
      age29.crime?.records.find((r) => r.id === 'parole-origin-2y')?.sentenceStatus === 'completed' &&
      age29.crime?.records.find((r) => r.id === 'unrelated-prison-rec')?.sentenceStatus === 'active',
    'Parole completion flips only originCaseId to completed while leaving unrelated prison record untouched',
  );

  // 2. Mid-year appeal release (1 -> 0) with concurrent 1y probation preserves release-year freeze
  const appealTargetRec: CrimeRecordEntry = {
    ...makePrisonRecord(),
    id: 'appeal-freeze-orig',
    sentenceStatus: 'active',
  };
  const appealChar = createIncarceratedChar({
    age: 26,
    occupation: 'Incarcerated',
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({
        yearsServed: 1,
        yearsRemaining: 1,
        behaviorScore: 85,
        originCaseId: 'appeal-freeze-orig',
      }),
      probation: {
        chargeTitle: 'Burglary',
        jurisdiction: 'adult',
        yearsRemaining: 1,
        startedAtAge: 24,
        lastProgressedAge: null,
        activeTerms: [
          {
            recordId: 'concurrent-prob-1y',
            chargeTitle: 'Burglary',
            jurisdiction: 'adult',
            yearsRemaining: 1,
            startedAtAge: 24,
            communityServiceHoursRemaining: 0,
            technicalWarnings: 0,
            violationCount: 0,
          },
        ],
      },
      records: [concurrentProbRec, appealTargetRec],
    },
  });
  const appealed = findAppealRelease(appealChar);
  assert(appealed !== null && appealed.released, 'Found mid-year appeal release with concurrent probation');
  assert(
    appealed.character.crime?.lastMidYearReleaseAge === 26 &&
      appealed.character.crime?.records.find((r) => r.id === 'appeal-freeze-orig')?.sentenceStatus === 'completed' &&
      appealed.character.crime?.records.find((r) => r.id === 'concurrent-prob-1y')?.sentenceStatus === 'active',
    'Mid-year appeal sets lastMidYearReleaseAge=26 and completes only appeal originCaseId',
  );
  const appealAge27 = progressCrimeForYear(appealed.character, 27, {
    incomingCash: 0,
    postExpenseSpendableCash: 0,
  });
  assert(
    appealAge27.crime?.lastMidYearReleaseAge === null &&
      appealAge27.crime?.probation?.yearsRemaining === 1 &&
      appealAge27.crime?.records.find((r) => r.id === 'concurrent-prob-1y')?.sentenceStatus === 'active',
    'Release-year Age Up after mid-year appeal freezes concurrent probation',
  );
  const appealAge28 = progressCrimeForYear(
    { ...appealed.character, age: 27, crime: appealAge27.crime },
    28,
    { incomingCash: 0, postExpenseSpendableCash: 0 },
  );
  assert(
    appealAge28.probationCompleted &&
      appealAge28.crime?.probation === null &&
      appealAge28.crime?.records.find((r) => r.id === 'concurrent-prob-1y')?.sentenceStatus === 'completed',
    'Following year after mid-year appeal resumes and completes concurrent probation cleanly',
  );

  // 4a. Legacy parole without originCaseId or matching record, WITH an unrelated existing activeTerms[] entry
  const legacyNoMatchWithTerm = createIncarceratedChar({
    age: 26,
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({
        chargeTitle: 'Unmatched Legacy Charge',
        yearsServed: 2,
        yearsRemaining: 3,
        behaviorScore: 88,
        originCaseId: undefined,
      }),
      probation: {
        chargeTitle: 'Burglary',
        jurisdiction: 'adult',
        yearsRemaining: 1,
        startedAtAge: 24,
        lastProgressedAge: null,
        activeTerms: [
          {
            recordId: 'concurrent-prob-1y',
            chargeTitle: 'Burglary',
            jurisdiction: 'adult',
            yearsRemaining: 1,
            startedAtAge: 24,
            communityServiceHoursRemaining: 0,
            technicalWarnings: 0,
            violationCount: 0,
          },
        ],
      },
      records: [concurrentProbRec],
    },
  });
  const legacyParoleRes = findParoleRelease(legacyNoMatchWithTerm);
  assert(legacyParoleRes !== null && legacyParoleRes.released, 'Found legacy parole release');
  assert(
    legacyParoleRes.character.crime?.probation?.activeTerms?.length === 2,
    'Legacy parole without originCaseId synthesizes an independent activeTerms entry when activeTerms already exists',
  );
  const legacyAge27 = progressCrimeForYear(legacyParoleRes.character, 27, {
    incomingCash: 0,
    postExpenseSpendableCash: 0,
  });
  const legacyAge28 = progressCrimeForYear(
    { ...legacyParoleRes.character, age: 27, crime: legacyAge27.crime },
    28,
    { incomingCash: 0, postExpenseSpendableCash: 0 },
  );
  assert(
    !legacyAge28.probationCompleted &&
      legacyAge28.crime?.probation !== null &&
      legacyAge28.crime?.probation?.yearsRemaining === 2 &&
      legacyAge28.crime?.probation?.activeTerms?.length === 1 &&
      legacyAge28.crime?.records.find((r) => r.id === 'concurrent-prob-1y')?.sentenceStatus === 'completed',
    'Legacy parole duration (2 yrs remaining) survives completion of the unrelated 1y probation term',
  );

  // 4b. Legacy parole without originCaseId resolves most recent matching uncompleted imprisoned record by chargeTitle
  const legacyMatchedRec: CrimeRecordEntry = {
    ...makePrisonRecord(),
    id: 'legacy-matched-imprisoned',
    title: 'Armed Robbery',
    outcome: 'imprisoned',
    sentenceStatus: 'active',
  };
  const legacyMatchedChar = createIncarceratedChar({
    age: 26,
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({
        chargeTitle: 'Armed Robbery',
        yearsServed: 2,
        yearsRemaining: 1,
        behaviorScore: 88,
        originCaseId: undefined,
      }),
      records: [unrelatedPrisonRec, legacyMatchedRec],
    },
  });
  const legacyMatchedParole = findParoleRelease(legacyMatchedChar);
  assert(
    legacyMatchedParole !== null &&
      legacyMatchedParole.character.crime?.probation?.activeTerms?.some(
        (t) => t.recordId === 'legacy-matched-imprisoned',
      ),
    'Legacy parole resolves matching uncompleted imprisoned record by chargeTitle',
  );
  const lmAge27 = progressCrimeForYear(legacyMatchedParole.character, 27, {
    incomingCash: 0,
    postExpenseSpendableCash: 0,
  });
  const lmAge28 = progressCrimeForYear(
    { ...legacyMatchedParole.character, age: 27, crime: lmAge27.crime },
    28,
    { incomingCash: 0, postExpenseSpendableCash: 0 },
  );
  assert(
    lmAge28.probationCompleted &&
      lmAge28.crime?.records.find((r) => r.id === 'legacy-matched-imprisoned')?.sentenceStatus === 'completed' &&
      lmAge28.crime?.records.find((r) => r.id === 'unrelated-prison-rec')?.sentenceStatus === 'active',
    'Completing matched legacy parole completes only that record and leaves unrelated prison record active',
  );

  // 4c. Legacy scalar-only probation without originCaseId or matching record is NOT unnecessarily converted to activeTerms[]
  const scalarOnlyChar = createIncarceratedChar({
    age: 26,
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({
        chargeTitle: 'Unmatched Scalar Charge',
        yearsServed: 2,
        yearsRemaining: 3,
        behaviorScore: 88,
        originCaseId: undefined,
      }),
      probation: {
        chargeTitle: 'Shoplifting',
        jurisdiction: 'adult',
        yearsRemaining: 1,
        startedAtAge: 24,
        lastProgressedAge: null,
      },
      records: [],
    },
  });
  const scalarParole = findParoleRelease(scalarOnlyChar);
  assert(
    scalarParole !== null &&
      scalarParole.character.crime?.probation?.activeTerms === undefined &&
      scalarParole.character.crime?.probation?.yearsRemaining === 3,
    'Legacy scalar-only probation stays scalar without unnecessary term-structure conversion',
  );

  // 5. Denied parole & parole revocation (new imprisonment) never falsely complete originating sentence
  let deniedParoleRes: ReturnType<typeof performPrisonAction> | null = null;
  for (let i = 0; i < 80; i++) {
    const res = performPrisonAction(
      {
        ...paroleBase,
        id: `denied-parole-${i}`,
        crime: {
          ...paroleBase.crime!,
          prison: { ...paroleBase.crime!.prison!, behaviorScore: 30 },
        },
      },
      'parole',
    );
    if (res.ok && !res.released) {
      deniedParoleRes = res;
      break;
    }
  }
  assert(
    deniedParoleRes !== null &&
      isCurrentlyIncarcerated(deniedParoleRes.character) &&
      deniedParoleRes.character.crime?.lastMidYearReleaseAge === undefined &&
      deniedParoleRes.character.crime?.records.find((r) => r.id === 'parole-origin-2y')?.sentenceStatus === 'active',
    'Denied parole leaves prison active, does not set lastMidYearReleaseAge, and keeps originCaseId active',
  );

  const revocationCase: PendingCourtCase = {
    id: 'parole-revocation-case',
    crimeId: 'burglary',
    title: 'Burglary',
    tier: 'mid',
    offenseClass: 'felony',
    jurisdiction: 'adult',
    arrestedAtAge: 26,
    arrestedAtYear: 2026,
    executionSucceeded: true,
    injured: false,
    attemptedPayout: 1200,
    baseFine: 1000,
    baseSentenceYears: 2,
    offendedOnProbation: true,
    exposure: 'publicly_reported',
  };
  const revoked = applyCourtOutcome(
    {
      ...paroled.character,
      crime: { ...paroled.character.crime!, pendingCase: revocationCase },
    },
    revocationCase,
    'public_defender',
    'imprisoned',
  );
  assert(
    revoked.ok &&
      revoked.probationViolated === true &&
      revoked.character.crime?.lastMidYearReleaseAge === null &&
      revoked.character.crime?.prison?.originCaseId === 'parole-revocation-case' &&
      revoked.character.crime?.records.find((r) => r.id === 'parole-origin-2y')?.sentenceStatus === 'active' &&
      revoked.character.crime?.records.find((r) => r.id === 'concurrent-prob-1y')?.sentenceStatus === 'active' &&
      revoked.character.crime?.records.find((r) => r.id === 'unrelated-prison-rec')?.sentenceStatus === 'active',
    'Parole revocation clears stale lastMidYearReleaseAge, isolates new originCaseId, and keeps originating & unrelated records active',
  );

  // Sanitization check for malformed lastMidYearReleaseAge
  const malformedSanitized = getSanitizedCrimeState({
    crime: { ...createEmptyCrimeState(), lastMidYearReleaseAge: -7 },
  });
  assert(
    malformedSanitized.lastMidYearReleaseAge === null,
    'Malformed negative lastMidYearReleaseAge sanitizes safely to null',
  );
}

function testPrisonInfirmaryAndYoungInmateSurvival() {
  // Broke inmate with open temporary illnesses + chronic condition gets free Prison Infirmary care
  const sickInmate = createIncarceratedChar({
    age: 22,
    cash: 0,
    stats: { health: 40, happiness: 40, smarts: 60, looks: 55, karma: 40 },
    healthcare: {
      conditions: [
        {
          id: 'chest-21',
          catalogId: 'chest',
          status: 'known',
          acquiredAtAge: 21,
          symptom: 'A cough has settled in your chest.',
          untreatedYears: 1,
        },
        {
          id: 'cold-21',
          catalogId: 'cold',
          status: 'undiagnosed',
          acquiredAtAge: 21,
          symptom: 'Your throat has been sore all week.',
          untreatedYears: 0,
        },
      ],
      visits: [],
    },
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrisonState({ yearsTotal: 10, yearsServed: 0, yearsRemaining: 10 }),
      records: [makePrisonRecord()],
    },
  });

  const infRes = performPrisonAction(sickInmate, 'infirmary');
  assert(
    infRes.ok &&
      infRes.character.cash === 0 &&
      infRes.character.stats.health === 50 &&
      (infRes.character.healthcare?.conditions ?? []).every((c: any) => c.status === 'closed'),
    'Prison Infirmary restores +10 Health at $0 cost and closes open temporary illnesses',
  );

  // Can also pair Prison Infirmary with Rehabilitation or Workout in the same year (2 actions/yr)
  const secondRes = performPrisonAction(infRes.character, 'workout');
  assert(
    secondRes.ok && secondRes.character.stats.health === 56,
    'Inmate can pair Infirmary + Workout in same year for health recovery',
  );
}

testPrisonActionsAndAnnualCooldown();
testAppealAndParoleOutcomes();
testSentenceProgressionCompletionAndDuplicateGuard();
testMidYearAppealAndParoleOccupationRestoration();
testAppealOriginCompletionAndParoleProbationPreservation();
testMidYearReleaseFreezeOriginIdentityAndLegacyParoleLifecycle();
testPrisonInfirmaryAndYoungInmateSurvival();
console.log('prisonSimulation.test.ts passed all assertions');

