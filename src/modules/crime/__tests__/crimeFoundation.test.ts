import type { CharacterProfile } from '../../../types/game';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { CRIME_CATALOG, getCrimeTemplate, isValidCrimeId } from '../data/crimeCatalog';
import {
  computeInjuryProbability,
  createCrimeDomainPrng,
  evaluateCrimeAttempt,
} from '../services/crimeRiskService';
import {
  createEmptyCrimeState,
  getActiveAdultConvictions,
  getArrestCount,
  getExpungementEligibleRecords,
  getJurisdictionForAge,
  getJuvenileAdjudications,
  getJuvenileRecordsEligibleForSealing,
  getJuvenileWarningCount,
  getRemainingAttemptsThisYear,
  getSanitizedCrimeState,
  hasActiveAdultConviction,
  hasActiveFelony,
  hasSensitiveFieldConviction,
  isCrimeEligibleForCharacter,
  isRecordClearedForAdultChecks,
  MAX_CRIME_ATTEMPTS_PER_YEAR,
} from '../services/crimeSelectors';
import type { CrimeRecordEntry, PlayerCrimeState } from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function createTestCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-crime-test-1',
    firstName: 'Morgan',
    lastName: 'Vale',
    gender: 'female',
    country: 'United States',
    city: 'Chicago',
    occupation: 'Unemployed',
    birthYear: 2000,
    age: 22,
    isAlive: true,
    cash: 1200,
    bankBalance: 2500,
    netWorth: 3700,
    stats: {
      health: 75,
      happiness: 65,
      smarts: 60,
      looks: 55,
      karma: 50,
    },
    parents: {
      father: {
        id: 'father-1',
        role: 'father',
        firstName: 'Arthur',
        lastName: 'Vale',
        age: 50,
        occupation: 'Accountant',
        isAlive: true,
        relationship: 70,
        generosity: 60,
      },
      mother: {
        id: 'mother-1',
        role: 'mother',
        firstName: 'claire',
        lastName: 'Vale',
        age: 48,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 75,
        generosity: 65,
      },
      wealth: 'modest',
    },
    education: createInitialEducation(),
    career: createInitialCareerState(),
    relationships: [],
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function makeRecord(overrides: Partial<CrimeRecordEntry> = {}): CrimeRecordEntry {
  return {
    id: 'rec-1',
    crimeId: 'burglary',
    title: 'Burglary',
    tier: 'mid',
    offenseClass: 'felony',
    jurisdiction: 'adult',
    age: 20,
    year: 2020,
    executionSucceeded: true,
    detected: true,
    injured: false,
    outcome: 'fined',
    attemptedPayout: 1400,
    payout: 0,
    fineImposed: 2000,
    finePaid: 2000,
    attorneyFeePaid: 500,
    sentenceYears: 0,
    sealed: false,
    expunged: false,
    ...overrides,
  };
}

function testCatalogIntegrity() {
  assert(CRIME_CATALOG.length === 8, 'Catalog must contain exactly 8 v1 crimes');
  const ids = new Set(CRIME_CATALOG.map((item) => item.id));
  assert(ids.size === 8, 'Catalog crime IDs must be unique');
  assert(isValidCrimeId('shoplifting') && !isValidCrimeId('piracy'), 'isValidCrimeId guard works');

  const shoplifting = getCrimeTemplate('shoplifting');
  const fraud = getCrimeTemplate('fraud_scam');
  const heist = getCrimeTemplate('bank_heist');

  assert(shoplifting.minAge === 10 && shoplifting.canCauseInjury === false, 'Shoplifting config');
  assert(shoplifting.baseInjuryProbability === 0, 'Shoplifting injury probability must be 0');
  assert(fraud.minAge === 18 && fraud.canCauseInjury === false, 'Fraud config');
  assert(fraud.baseInjuryProbability === 0, 'Fraud injury probability must be 0');
  assert(heist.minAge === 21 && heist.adultOffenseClass === 'felony', 'Bank heist config');
}

function testLegacyAndMalformedCrimeStateSafety() {
  const legacyChar = createTestCharacter({ crime: undefined });
  const emptyState = getSanitizedCrimeState(legacyChar);
  assert(emptyState.policeHeat === 0 && emptyState.records.length === 0, 'Undefined slice fallback');
  assert(getArrestCount(legacyChar) === 0, 'Legacy character has 0 arrests');
  assert(
    getRemainingAttemptsThisYear(legacyChar) === MAX_CRIME_ATTEMPTS_PER_YEAR,
    'Legacy character gets full annual attempts',
  );

  const corruptedCrime = {
    policeHeat: Number.NaN,
    notoriety: 999,
    unpaidFines: -50,
    attemptsThisYear: Number.NaN,
    attemptCountLifetime: -3,
    lastAttemptAge: -1,
    lastProgressedAge: null,
    pendingCase: { bad: true } as unknown as PlayerCrimeState['pendingCase'],
    prison: { facilityName: 'Bad' } as unknown as PlayerCrimeState['prison'],
    probation: { yearsRemaining: -1 } as unknown as PlayerCrimeState['probation'],
    records: [
      null as unknown as CrimeRecordEntry,
      { id: '', crimeId: 'unknown' } as unknown as CrimeRecordEntry,
      makeRecord({ id: 'valid-rec', outcome: 'acquitted' }),
    ],
  } satisfies PlayerCrimeState;

  const corruptedChar = createTestCharacter({ crime: corruptedCrime });
  const sanitized = getSanitizedCrimeState(corruptedChar);
  assert(sanitized.policeHeat === 0, 'NaN policeHeat sanitizes to 0');
  assert(sanitized.notoriety === 100, 'Out-of-range notoriety clamps to 100');
  assert(sanitized.unpaidFines === 0, 'Negative unpaidFines sanitizes to 0');
  assert(sanitized.pendingCase === null && sanitized.prison === null, 'Malformed sub-objects drop');
  assert(sanitized.records.length === 1 && sanitized.records[0].id === 'valid-rec', 'Filters bad records');
}

function testJurisdictionAndOffenseClassSeparation() {
  assert(getJurisdictionForAge(10) === 'juvenile', 'Age 10 is juvenile');
  assert(getJurisdictionForAge(17) === 'juvenile', 'Age 17 is juvenile');
  assert(getJurisdictionForAge(18) === 'adult', 'Age 18 is adult');

  const juvenileFelonyChar = createTestCharacter({
    age: 20,
    crime: {
      ...createEmptyCrimeState(),
      records: [
        makeRecord({
          id: 'juv-1',
          jurisdiction: 'juvenile',
          offenseClass: 'felony',
          age: 16,
          outcome: 'probation',
        }),
      ],
    },
  });

  assert(
    !hasActiveAdultConviction(juvenileFelonyChar),
    'Juvenile adjudication must not count as adult conviction',
  );
  assert(!hasActiveFelony(juvenileFelonyChar), 'Juvenile felony must not trigger adult felony checks');
  assert(
    !hasSensitiveFieldConviction(juvenileFelonyChar, 'law_government'),
    'Juvenile record must not block sensitive adult careers',
  );
  assert(getJuvenileAdjudications(juvenileFelonyChar).length === 1, 'Tracks juvenile adjudications');
}

function testSealedVsExpungedAndJuvenileSealingRules() {
  const sealedJuv = makeRecord({
    id: 'juv-sealed',
    jurisdiction: 'juvenile',
    age: 15,
    outcome: 'fined',
    sealed: true,
    expunged: false,
  });
  const expungedAdult = makeRecord({
    id: 'adult-expunged',
    jurisdiction: 'adult',
    offenseClass: 'felony',
    age: 19,
    outcome: 'fined',
    sealed: false,
    expunged: true,
  });
  assert(isRecordClearedForAdultChecks(sealedJuv), 'Sealed juvenile record is cleared');
  assert(isRecordClearedForAdultChecks(expungedAdult), 'Expunged adult record is cleared');

  // Juvenile probation still active at age 18 -> must block sealing
  const activeJuvProbationChar = createTestCharacter({
    age: 18,
    crime: {
      ...createEmptyCrimeState(),
      probation: {
        chargeTitle: 'Pickpocketing',
        jurisdiction: 'juvenile',
        yearsRemaining: 1,
        startedAtAge: 17,
        lastProgressedAge: 17,
      },
      records: [
        makeRecord({
          id: 'juv-prob-rec',
          crimeId: 'pickpocketing',
          offenseClass: 'misdemeanor',
          jurisdiction: 'juvenile',
          age: 15,
          outcome: 'probation',
          sealed: false,
        }),
      ],
    },
  });
  assert(
    getJuvenileRecordsEligibleForSealing(activeJuvProbationChar).length === 0,
    'Active juvenile probation blocks automatic sealing at 18',
  );

  // Completed juvenile probation, clean for 3 years at age 18 -> eligible for sealing
  const readyForSealingChar = createTestCharacter({
    age: 18,
    crime: {
      ...createEmptyCrimeState(),
      probation: null,
      records: [
        makeRecord({
          id: 'juv-ready-rec',
          crimeId: 'shoplifting',
          offenseClass: 'misdemeanor',
          jurisdiction: 'juvenile',
          age: 15,
          outcome: 'fined',
          sealed: false,
        }),
      ],
    },
  });
  assert(
    getJuvenileRecordsEligibleForSealing(readyForSealingChar).length === 1,
    'Completed juvenile probation + 2+ clean years at age 18 allows sealing',
  );

  // Recent offense within 2 years blocks juvenile sealing even without probation
  const recentOffenseChar = createTestCharacter({
    age: 18,
    crime: {
      ...createEmptyCrimeState(),
      records: [
        makeRecord({
          id: 'juv-recent',
          jurisdiction: 'juvenile',
          age: 17,
          outcome: 'warned',
          sealed: false,
        }),
      ],
    },
  });
  assert(
    getJuvenileRecordsEligibleForSealing(recentOffenseChar).length === 0,
    'Clean period < 2 years delays juvenile sealing',
  );

  // Expunged vs active adult convictions
  const adultChar = createTestCharacter({
    age: 26,
    crime: {
      ...createEmptyCrimeState(),
      records: [
        expungedAdult,
        makeRecord({
          id: 'adult-active-misd',
          crimeId: 'shoplifting',
          offenseClass: 'misdemeanor',
          jurisdiction: 'adult',
          age: 20,
          outcome: 'fined',
          sealed: false,
          expunged: false,
        }),
      ],
    },
  });
  assert(!hasActiveFelony(adultChar), 'Expunged felony does not count as active felony');
  assert(getActiveAdultConvictions(adultChar).length === 1, 'Misdemeanor stays active until expunged');
  assert(
    getExpungementEligibleRecords(adultChar).length === 1,
    '6-year-old adult misdemeanor with $0 unpaid fines is eligible for expungement',
  );
  assert(
    !hasSensitiveFieldConviction(adultChar, 'business_finance'),
    'Old (>5 yrs) misdemeanor does not trigger recent sensitive-field bar',
  );
}

function testArrestCountingVsJuvenileWarnings() {
  const char = createTestCharacter({
    age: 19,
    crime: {
      ...createEmptyCrimeState(),
      records: [
        makeRecord({ id: 'r1', outcome: 'undetected', detected: false }),
        makeRecord({ id: 'r2', outcome: 'aborted', executionSucceeded: false, detected: false }),
        makeRecord({ id: 'r3', jurisdiction: 'juvenile', age: 14, outcome: 'warned' }),
        makeRecord({ id: 'r4', outcome: 'dismissed' }),
        makeRecord({ id: 'r5', outcome: 'acquitted' }),
        makeRecord({ id: 'r6', outcome: 'fined' }),
      ],
    },
  });

  assert(
    getArrestCount(char) === 3,
    'Formal arrests exclude undetected, aborted, and juvenile warnings',
  );
  assert(getJuvenileWarningCount(char) === 1, 'Juvenile warnings tracked separately');
  assert(
    getActiveAdultConvictions(char).length === 1,
    'Dismissed and acquitted arrests are not convictions',
  );
}

function testEligibilityAndAttemptLimit() {
  const staleAgeChar = createTestCharacter({
    age: 22,
    crime: {
      ...createEmptyCrimeState(),
      attemptsThisYear: 2,
      lastAttemptAge: 21,
    },
  });
  assert(
    getRemainingAttemptsThisYear(staleAgeChar) === MAX_CRIME_ATTEMPTS_PER_YEAR,
    'Attempts from previous age do not carry over',
  );

  const minorChar = createTestCharacter({ age: 16 });
  assert(
    !isCrimeEligibleForCharacter(minorChar, getCrimeTemplate('burglary')).eligible,
    '16yo cannot attempt 18+ burglary',
  );
  assert(
    isCrimeEligibleForCharacter(minorChar, getCrimeTemplate('pickpocketing')).eligible,
    '16yo can attempt 14+ pickpocketing',
  );

  const cappedChar = createTestCharacter({
    age: 22,
    crime: {
      ...createEmptyCrimeState(),
      attemptsThisYear: 2,
      lastAttemptAge: 22,
    },
  });
  assert(
    !isCrimeEligibleForCharacter(cappedChar, getCrimeTemplate('shoplifting')).eligible,
    'Exhausted annual attempts block further attempts',
  );
}

function testZeroInjuryAndFailedAttemptInjury() {
  const weakChar = createTestCharacter({
    age: 25,
    stats: { health: 0, happiness: 20, smarts: 20, looks: 40, karma: 10 },
  });
  const shoplifting = getCrimeTemplate('shoplifting');
  const fraud = getCrimeTemplate('fraud_scam');

  assert(
    computeInjuryProbability(weakChar, shoplifting) === 0,
    'Non-physical crime must have exact 0 injury probability even at 0 health',
  );
  assert(
    computeInjuryProbability(weakChar, fraud) === 0,
    'Fraud must have exact 0 injury probability even at 0 health',
  );

  for (let i = 0; i < 60; i++) {
    const resShop = evaluateCrimeAttempt(weakChar, shoplifting, i);
    const resFraud = evaluateCrimeAttempt(weakChar, fraud, i);
    assert(
      !resShop.injured && resShop.injuryHealthLoss === 0,
      'Shoplifting must never injure',
    );
    assert(!resFraud.injured && resFraud.injuryHealthLoss === 0, 'Fraud must never injure');
  }

  const heist = getCrimeTemplate('bank_heist');
  let sawFailedExecutionInjury = false;
  for (let i = 0; i < 150; i++) {
    const roll = evaluateCrimeAttempt(weakChar, heist, i);
    if (!roll.executionSucceeded && roll.injured) {
      sawFailedExecutionInjury = true;
      assert(
        roll.injuryHealthLoss >= heist.injuryHealthLossMin &&
          roll.injuryHealthLoss <= heist.injuryHealthLossMax,
        'Failed-attempt injury loss stays in template range',
      );
      break;
    }
  }
  assert(
    sawFailedExecutionInjury,
    'Failed physical crime attempts can still injure the character',
  );
}

function testDeterminismFourQuadrantsAndDomainIsolation() {
  const char = createTestCharacter({ age: 24 });
  const burglary = getCrimeTemplate('burglary');

  const first = evaluateCrimeAttempt(char, burglary, 7);
  const second = evaluateCrimeAttempt(char, burglary, 7);
  assert(
    first.executionSucceeded === second.executionSucceeded &&
      first.detected === second.detected &&
      first.injured === second.injured &&
      first.attemptedPayout === second.attemptedPayout &&
      first.injuryHealthLoss === second.injuryHealthLoss,
    'Risk evaluation is strictly deterministic for identical inputs',
  );

  // Confirm execution, detection, and injury PRNGs use distinct streams
  const execPrng = createCrimeDomainPrng(char, 'burglary', 7, 'execution');
  const detPrng = createCrimeDomainPrng(char, 'burglary', 7, 'detection');
  const injPrng = createCrimeDomainPrng(char, 'burglary', 7, 'injury');
  const vExec = execPrng.nextFloat();
  const vDet = detPrng.nextFloat();
  const vInj = injPrng.nextFloat();
  assert(
    vExec !== vDet && vDet !== vInj && vExec !== vInj,
    'Domain-separated PRNG streams produce independent sequences',
  );

  // Verify all 4 execution x detection outcomes exist naturally
  const quadrants = new Set<string>();
  for (let i = 0; i < 120; i++) {
    const roll = evaluateCrimeAttempt(char, burglary, i);
    quadrants.add(`${roll.executionSucceeded}:${roll.detected}`);
    if (!roll.executionSucceeded) {
      assert(roll.attemptedPayout === 0, 'Failed execution always produces $0 attemptedPayout');
    } else {
      assert(
        roll.attemptedPayout >= burglary.payoutMin && roll.attemptedPayout <= burglary.payoutMax,
        'Successful execution produces payout within bounds',
      );
    }
  }
  assert(quadrants.has('true:false'), 'Observed undetected success');
  assert(quadrants.has('true:true'), 'Observed detected success');
  assert(quadrants.has('false:false'), 'Observed undetected failure (aborted)');
  assert(quadrants.has('false:true'), 'Observed detected failure');
}

testCatalogIntegrity();
testLegacyAndMalformedCrimeStateSafety();
testJurisdictionAndOffenseClassSeparation();
testSealedVsExpungedAndJuvenileSealingRules();
testArrestCountingVsJuvenileWarnings();
testEligibilityAndAttemptLimit();
testZeroInjuryAndFailedAttemptInjury();
testDeterminismFourQuadrantsAndDomainIsolation();
console.log('crimeFoundation.test.ts passed all assertions');
