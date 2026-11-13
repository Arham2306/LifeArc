import type { CharacterProfile, PersonProfile } from '../../../types/game';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { getCrimeTemplate } from '../data/crimeCatalog';
import { evaluateCrimeAttempt } from '../services/crimeRiskService';
import { attemptCrime } from '../services/crimeService';
import {
  createEmptyCrimeState,
  getArrestCount,
  getRemainingAttemptsThisYear,
  MAX_CRIME_ATTEMPTS_PER_YEAR,
} from '../services/crimeSelectors';
import type { CrimeId, PendingCourtCase } from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function makePerson(overrides: Partial<PersonProfile> = {}): PersonProfile {
  return {
    id: 'person-1',
    firstName: 'Jordan',
    lastName: 'Reyes',
    gender: 'male',
    age: 23,
    role: 'Partner',
    relationshipType: 'partner',
    relationship: 80,
    originStory: 'Met in college',
    stageMet: 'university',
    ...overrides,
  };
}

function createTestCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const partner = makePerson({ id: 'partner-1', relationship: 82 });
  const coworker = makePerson({
    id: 'coworker-1',
    firstName: 'Sam',
    lastName: 'Lin',
    role: 'Coworker',
    relationshipType: 'coworker',
    relationship: 60,
  });

  return {
    id: 'char-crime-svc-1',
    firstName: 'Devon',
    lastName: 'Cross',
    gender: 'male',
    country: 'United States',
    city: 'Seattle',
    occupation: 'Software Engineer',
    birthYear: 2000,
    age: 24,
    isAlive: true,
    cash: 1500,
    bankBalance: 10000,
    netWorth: 11500,
    stats: {
      health: 75,
      happiness: 70,
      smarts: 62,
      looks: 55,
      karma: 65,
    },
    parents: {
      father: {
        id: 'dad-1',
        role: 'father',
        firstName: 'Victor',
        lastName: 'Cross',
        age: 54,
        occupation: 'Mechanic',
        isAlive: true,
        relationship: 70,
        generosity: 55,
      },
      mother: {
        id: 'mom-1',
        role: 'mother',
        firstName: 'Elena',
        lastName: 'Cross',
        age: 52,
        occupation: 'Nurse',
        isAlive: false,
        relationship: 88,
        generosity: 60,
      },
      wealth: 'modest',
    },
    education: createInitialEducation(),
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'swe_1',
        title: 'Software Engineer',
        companyName: 'Cascade Tech',
        field: 'technology',
        type: 'full_time',
        salary: 90000,
        yearsInJob: 2,
        performance: 80,
        hiredAge: 22,
        icon: '💻',
      },
    },
    relationships: [partner, coworker],
    partner,
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function findMatchingAttemptScenario(
  crimeId: CrimeId,
  baseOverrides: Partial<CharacterProfile>,
  predicate: (roll: ReturnType<typeof evaluateCrimeAttempt>) => boolean,
): CharacterProfile {
  const template = getCrimeTemplate(crimeId);
  for (let i = 0; i < 200; i++) {
    const candidate = createTestCharacter({
      ...baseOverrides,
      id: `probe-${crimeId}-${i}`,
    });
    const roll = evaluateCrimeAttempt(candidate, template);
    if (predicate(roll)) {
      return candidate;
    }
  }
  throw new Error(`Could not find deterministic seed for ${crimeId}`);
}

function testFourExecutionDetectionCombinationsAndProceeds() {
  // 1. Succeeded & Undetected -> immediate cash credit & bankBalance untouched
  const c1 = findMatchingAttemptScenario(
    'burglary',
    { age: 24, cash: 500, bankBalance: 4000, netWorth: 4500 },
    (r) => r.executionSucceeded && !r.detected,
  );
  const res1 = attemptCrime(c1, 'burglary');
  assert(res1.ok && res1.roll?.executionSucceeded && !res1.roll?.detected, 'Expected clean getaway');
  assert(res1.record?.outcome === 'undetected', 'Record outcome must be undetected');
  assert(
    res1.record.payout === res1.record.attemptedPayout && res1.record.payout > 0,
    'Undetected success credits attemptedPayout',
  );
  assert(res1.character.cash === 500 + res1.record.payout, 'Cash credited via applyEffects');
  assert(res1.character.bankBalance === 4000, 'Bank balance remains untouched');
  assert(res1.character.netWorth === 4500 + res1.record.payout, 'Net worth stamped accurately');
  assert(res1.character.crime?.pendingCase === null, 'No pendingCase when undetected');

  // 2. Succeeded & Detected -> proceeds held in pendingCase, NOT credited to cash, job kept
  const c2 = findMatchingAttemptScenario(
    'burglary',
    { age: 24, cash: 500, bankBalance: 4000, netWorth: 4500 },
    (r) => r.executionSucceeded && r.detected && r.attemptedPayout > 0,
  );
  const res2 = attemptCrime(c2, 'burglary');
  assert(res2.ok && res2.pendingCase !== undefined, 'Detected attempt creates pendingCase');
  assert(res2.pendingCase.attemptedPayout > 0, 'PendingCase holds attemptedPayout');
  assert(res2.character.cash === 500, 'Cash NOT credited while court case is pending');
  assert(res2.character.bankBalance === 4000, 'Bank balance untouched');
  assert(res2.character.career.currentJob !== null, 'Arrest alone must not terminate employment');
  assert(res2.character.parents.father.relationship < 70, 'Living father relationship reacts');
  assert(res2.character.parents.mother.relationship === 88, 'Deceased mother relationship untouched');
  assert(
    res2.character.relationships.find((r) => r.id === 'coworker-1')?.relationship === 60,
    'Unrelated coworker relationship must remain untouched',
  );
  // Attempting a second crime while pendingCase is unresolved must be blocked even though attemptsThisYear < 2
  assert(
    getRemainingAttemptsThisYear(res2.character) === 1,
    '1 annual attempt remains, yet pendingCase must block further attempts',
  );
  const blockedSecond = attemptCrime(res2.character, 'shoplifting');
  assert(!blockedSecond.ok, 'Cannot start another crime while pendingCase is unresolved');
  assert(
    blockedSecond.character === res2.character &&
      blockedSecond.character.crime?.pendingCase?.id === res2.pendingCase.id,
    'Blocked attempt leaves original pendingCase completely intact',
  );

  // 3. Failed & Undetected -> aborted, $0 proceeds
  const c3 = findMatchingAttemptScenario(
    'burglary',
    { age: 24, cash: 500 },
    (r) => !r.executionSucceeded && !r.detected,
  );
  const res3 = attemptCrime(c3, 'burglary');
  assert(res3.ok && res3.record?.outcome === 'aborted', 'Failed undetected becomes aborted');
  assert(res3.record.attemptedPayout === 0 && res3.record.payout === 0, 'Failed attempt pays $0');
  assert(res3.character.cash === 500, 'Cash unchanged on aborted attempt');

  // 4. Failed & Detected -> pendingCase with $0 attemptedPayout
  const c4 = findMatchingAttemptScenario(
    'burglary',
    { age: 24, cash: 500 },
    (r) => !r.executionSucceeded && r.detected,
  );
  const res4 = attemptCrime(c4, 'burglary');
  assert(res4.ok && res4.pendingCase !== undefined, 'Failed detected still creates pendingCase');
  assert(res4.pendingCase.attemptedPayout === 0, 'Failed detected has $0 attemptedPayout');
  assert(res4.character.cash === 500, 'Cash unchanged on failed detected attempt');
}

function testAttemptCapAndDuplicateAgeBehavior() {
  // Guarantee two undetected attempts at the same age so pendingCase doesn't block attempt #2
  const base = findMatchingAttemptScenario(
    'shoplifting',
    { age: 22, cash: 200 },
    (r) => r.executionSucceeded && !r.detected,
  );

  const first = attemptCrime(base, 'shoplifting');
  assert(first.ok, 'First attempt succeeds');
  assert(getRemainingAttemptsThisYear(first.character) === 1, '1 attempt remaining after 1st');

  // Even if second is detected or undetected, 2nd at same age is permitted
  const second = attemptCrime(first.character, 'shoplifting');
  assert(second.ok, 'Second attempt at same age succeeds');
  assert(getRemainingAttemptsThisYear(second.character) === 0, '0 attempts remaining after 2nd');

  // Clear pendingCase artificially if caught on 2nd to verify 3rd is blocked strictly by annual limit
  const readyForThirdCheck: CharacterProfile = {
    ...second.character,
    crime: {
      ...second.character.crime!,
      pendingCase: null,
    },
  };
  const third = attemptCrime(readyForThirdCheck, 'shoplifting');
  assert(!third.ok, '3rd attempt at same age must be rejected');
  assert(
    third.character === readyForThirdCheck,
    'Rejected 3rd attempt must leave character reference completely unchanged',
  );

  // Advancing age without crimeYearService still resets remaining attempts at new age
  const agedOneYear = { ...readyForThirdCheck, age: 23 };
  assert(
    getRemainingAttemptsThisYear(agedOneYear) === MAX_CRIME_ATTEMPTS_PER_YEAR,
    'New age grants fresh annual attempts',
  );
}

function testIneligibleAttemptsLeaveCharacterUnchanged() {
  const underage = createTestCharacter({ age: 15 });
  const rUnder = attemptCrime(underage, 'burglary');
  assert(!rUnder.ok && rUnder.character === underage, 'Underage rejected without mutation');

  const dead = createTestCharacter({ isAlive: false });
  const rDead = attemptCrime(dead, 'shoplifting');
  assert(!rDead.ok && rDead.character === dead, 'Deceased rejected without mutation');

  const withPending = createTestCharacter({
    crime: {
      ...createEmptyCrimeState(),
      pendingCase: {
        id: 'pending-1',
        crimeId: 'shoplifting',
        title: 'Shoplifting',
        tier: 'petty',
        offenseClass: 'misdemeanor',
        jurisdiction: 'adult',
        arrestedAtAge: 24,
        arrestedAtYear: 2024,
        executionSucceeded: true,
        injured: false,
        attemptedPayout: 40,
        baseFine: 200,
        baseSentenceYears: 0,
      } satisfies PendingCourtCase,
    },
  });
  const rPending = attemptCrime(withPending, 'shoplifting');
  assert(!rPending.ok && rPending.character === withPending, 'PendingCase blocks further crimes');

  const imprisoned = createTestCharacter({
    crime: {
      ...createEmptyCrimeState(),
      prison: {
        facilityName: 'Ridgefield Correctional Facility',
        securityLevel: 'medium',
        chargeTitle: 'Burglary',
        yearsTotal: 3,
        yearsServed: 0,
        yearsRemaining: 3,
        behaviorScore: 55,
        paroleEligibleAtServed: 2,
        actionsTakenThisYear: 0,
        lastActionAge: null,
        lastProgressedAge: null,
      },
    },
  });
  const rPrison = attemptCrime(imprisoned, 'shoplifting');
  assert(!rPrison.ok && rPrison.character === imprisoned, 'Incarceration blocks street crimes');
}

function testIndependentInjuryApplicationAndLegacyFallback() {
  const hurtOnFailChar = findMatchingAttemptScenario(
    'bank_heist',
    {
      age: 26,
      stats: { health: 50, happiness: 70, smarts: 50, looks: 50, karma: 60 },
      crime: undefined,
    },
    (r) => !r.executionSucceeded && r.injured,
  );
  const res = attemptCrime(hurtOnFailChar, 'bank_heist');
  assert(res.ok, 'Legacy undefined crime state initializes cleanly on attemptCrime');
  assert(res.roll?.injured && res.roll.injuryHealthLoss > 0, 'Injured on failed bank heist');
  assert(res.character.stats.health < 50, 'Health reduced via applyEffects');
  assert(res.character.stats.karma < 60, 'Karma reduced via applyEffects');
  assert(getArrestCount(hurtOnFailChar) === 0, 'Initial arrest count is 0');
}

testFourExecutionDetectionCombinationsAndProceeds();
testAttemptCapAndDuplicateAgeBehavior();
testIneligibleAttemptsLeaveCharacterUnchanged();
testIndependentInjuryApplicationAndLegacyFallback();
console.log('crimeService.test.ts passed all assertions');

