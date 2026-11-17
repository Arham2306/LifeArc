import type { CharacterProfile, PersonProfile } from '../../../types/game';
import { calculatePlayerNetWorth } from '../../assets/services/assetService';
import { migrateToCanonicalWorldState } from '../../autonomy/services/migrationService';
import type { ActiveBusinessProfile } from '../../business/types';
import { createInitialCareerState, progressCareerForYear } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import {
  applyCourtOutcome,
  determineCourtOutcome,
  expungeAdultRecord,
  mergeProbationState,
  payUnpaidFines,
  resolveCourtCase,
} from '../services/crimeService';
import {
  createEmptyCrimeState,
  getActiveAdultConvictions,
  getArrestCount,
  getExpungementEligibleRecords,
  getJuvenileAdjudications,
  getJuvenileWarningCount,
  hasActiveAdultConviction,
  hasActiveFelony,
  hasSensitiveFieldConviction,
  isCurrentlyIncarcerated,
} from '../services/crimeSelectors';
import type {
  CrimeOutcomeStatus,
  CrimeRecordEntry,
  DefenseStrategyId,
  PendingCourtCase,
  PlayerCrimeState,
} from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function makePendingCase(overrides: Partial<PendingCourtCase> = {}): PendingCourtCase {
  return {
    id: 'case-1',
    crimeId: 'burglary',
    title: 'Burglary',
    tier: 'mid',
    offenseClass: 'felony',
    jurisdiction: 'adult',
    arrestedAtAge: 24,
    arrestedAtYear: 2024,
    executionSucceeded: true,
    injured: false,
    attemptedPayout: 1600,
    baseFine: 3000,
    baseSentenceYears: 4,
    ...overrides,
  };
}

function makeRecord(overrides: Partial<CrimeRecordEntry> = {}): CrimeRecordEntry {
  return {
    id: 'rec-legal-1',
    crimeId: 'shoplifting',
    title: 'Shoplifting',
    tier: 'petty',
    offenseClass: 'misdemeanor',
    jurisdiction: 'adult',
    age: 20,
    year: 2020,
    executionSucceeded: true,
    detected: true,
    injured: false,
    outcome: 'fined',
    attemptedPayout: 50,
    payout: 0,
    fineImposed: 300,
    finePaid: 300,
    attorneyFeePaid: 0,
    sentenceYears: 0,
    sealed: false,
    expunged: false,
    ...overrides,
  };
}

function createLegalTestCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const partner: PersonProfile = {
    id: 'partner-legal',
    firstName: 'Taylor',
    lastName: 'Reed',
    gender: 'female',
    age: 24,
    role: 'Partner',
    relationshipType: 'partner',
    relationship: 80,
    originStory: 'Met in city',
    stageMet: 'adulthood',
  };
  const rival: PersonProfile = {
    id: 'rival-legal',
    firstName: 'Blake',
    lastName: 'Knox',
    gender: 'male',
    age: 25,
    role: 'Rival',
    relationshipType: 'rival',
    relationship: 15,
    originStory: 'Office rival',
    stageMet: 'adulthood',
  };

  return {
    id: 'char-court-1',
    firstName: 'Avery',
    lastName: 'Stone',
    gender: 'male',
    country: 'United States',
    city: 'Austin',
    occupation: 'Accountant',
    birthYear: 2000,
    age: 24,
    isAlive: true,
    cash: 5000,
    bankBalance: 12000,
    netWorth: 17000,
    stats: {
      health: 80,
      happiness: 75,
      smarts: 70,
      looks: 60,
      karma: 60,
    },
    parents: {
      father: {
        id: 'father-legal',
        role: 'father',
        firstName: 'George',
        lastName: 'Stone',
        age: 56,
        occupation: 'Engineer',
        isAlive: true,
        relationship: 70,
        generosity: 60,
      },
      mother: {
        id: 'mother-legal',
        role: 'mother',
        firstName: 'Hannah',
        lastName: 'Stone',
        age: 54,
        occupation: 'Retired',
        isAlive: false,
        relationship: 90,
        generosity: 65,
      },
      wealth: 'comfortable',
    },
    siblings: [
      {
        id: 'sib-alive',
        role: 'sister',
        firstName: 'Maya',
        lastName: 'Stone',
        age: 21,
        gender: 'female',
        relationship: 75,
        occupation: 'Student',
        isAlive: true,
        birthOrder: 'younger',
      },
      {
        id: 'sib-dead',
        role: 'brother',
        firstName: 'Noah',
        lastName: 'Stone',
        age: 26,
        gender: 'male',
        relationship: 85,
        occupation: 'Artist',
        isAlive: false,
        birthOrder: 'older',
      },
    ],
    exPartners: [
      {
        id: 'ex-1',
        firstName: 'Casey',
        lastName: 'Bell',
        gender: 'female',
        age: 24,
        role: 'Ex-Partner',
        relationshipType: 'ex',
        relationship: 40,
        originStory: 'College',
        stageMet: 'university',
      },
    ],
    children: [
      {
        id: 'child-1',
        firstName: 'Leo',
        lastName: 'Stone',
        age: 3,
        gender: 'male',
        relationship: 92,
        smarts: 70,
        looks: 75,
        happiness: 85,
        health: 90,
        isAdopted: false,
        occupation: 'Toddler',
        isAlive: true,
      },
    ],
    education: createInitialEducation(),
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'acct_1',
        title: 'Accountant',
        companyName: 'Ledger Co',
        field: 'business_finance',
        type: 'full_time',
        salary: 75000,
        yearsInJob: 3,
        performance: 85,
        hiredAge: 21,
        icon: '📊',
      },
    },
    relationships: [partner, rival],
    partner,
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function findCharForOutcome(
  base: CharacterProfile,
  pendingCase: PendingCourtCase,
  strategyId: DefenseStrategyId,
  desiredOutcome: CrimeOutcomeStatus,
): CharacterProfile {
  for (let i = 0; i < 400; i++) {
    const candidate: CharacterProfile = {
      ...base,
      id: `court-probe-${desiredOutcome}-${i}`,
      crime: {
        ...(base.crime ?? createEmptyCrimeState()),
        pendingCase,
      },
    };
    if (determineCourtOutcome(candidate, pendingCase, strategyId) === desiredOutcome) {
      return candidate;
    }
  }
  throw new Error(`Could not find seed producing court outcome ${desiredOutcome}`);
}

function testJuvenileCourtOutcomesAndBoundaries() {
  const baseJuvenileCase = makePendingCase({
    crimeId: 'pickpocketing',
    title: 'Pickpocketing',
    tier: 'petty',
    offenseClass: 'misdemeanor',
    jurisdiction: 'juvenile',
    arrestedAtAge: 15,
    arrestedAtYear: 2015,
    attemptedPayout: 140,
    baseFine: 600,
    baseSentenceYears: 0,
  });

  // Never produce 'imprisoned' across 250 juvenile cases
  for (let i = 0; i < 250; i++) {
    const c = createLegalTestCharacter({
      id: `juv-bounds-${i}`,
      age: 15,
      cash: 80,
      career: createInitialCareerState(),
      occupation: 'High School Student',
    });
    const out = determineCourtOutcome(c, baseJuvenileCase, 'public_defender');
    assert(out !== 'imprisoned', 'Juvenile court must never sentence to adult prison');
  }

  // Juvenile 'warned' -> no formal arrest, no adult conviction, $0 payout, $0 unpaidFines
  const warnedChar = findCharForOutcome(
    createLegalTestCharacter({ age: 15, cash: 50, bankBalance: 1000 }),
    baseJuvenileCase,
    'public_defender',
    'warned',
  );
  const warnedRes = resolveCourtCase(warnedChar, 'public_defender');
  assert(warnedRes.ok && warnedRes.outcome === 'warned', 'Resolved juvenile warning');
  assert(warnedRes.releasedPayout === 0, 'Juvenile warning returns/forfeits stolen proceeds');
  assert(getJuvenileWarningCount(warnedRes.character) === 1, 'Counts juvenile warning');
  assert(getJuvenileAdjudications(warnedRes.character).length === 0, 'Juvenile warning is not an adjudication');
  assert(getArrestCount(warnedRes.character) === 0, 'Juvenile warning is NOT a formal arrest');
  assert(warnedRes.character.crime?.unpaidFines === 0, 'Juvenile warning adds $0 to unpaidFines');
  assert(warnedRes.character.crime?.prison === null, 'No PrisonState on juvenile warning');

  // Juvenile 'fined' -> strictly cash-capped, $0 unpaidFines, does NOT become adult conviction
  const cashPoorJuvCase = makePendingCase({
    ...baseJuvenileCase,
    baseFine: 2000,
  });
  const juvFinedChar = findCharForOutcome(
    createLegalTestCharacter({ age: 16, cash: 45, bankBalance: 5000 }),
    cashPoorJuvCase,
    'public_defender',
    'fined',
  );
  const juvFinedRes = resolveCourtCase(juvFinedChar, 'public_defender');
  assert(juvFinedRes.ok && juvFinedRes.outcome === 'fined', 'Juvenile fined resolved');
  assert(juvFinedRes.fineImposed <= 45 && juvFinedRes.finePaid <= 45, 'Juvenile fine capped at cash');
  assert(juvFinedRes.unpaidFineAdded === 0, 'Juvenile fine creates $0 unpaid fine debt');
  assert(juvFinedRes.character.crime?.unpaidFines === 0, 'unpaidFines stays $0 for juveniles');
  assert(juvFinedRes.character.bankBalance === 5000, 'Bank balance untouched for juvenile fine');
  assert(getJuvenileAdjudications(juvFinedRes.character).length === 1, 'Tracked as juvenile adj');
  assert(!hasActiveAdultConviction(juvFinedRes.character), 'Not an adult conviction');
}

function testCounselCashGuardProceedsAndEmploymentSeparately() {
  const heldProceedsCase = makePendingCase({
    attemptedPayout: 2200,
    baseFine: 4000,
    baseSentenceYears: 4,
    executionSucceeded: true,
  });

  // Insufficient cash for elite_counsel ($6,500 mid tier) leaves case pending and bank untouched
  const lowCashChar = createLegalTestCharacter({ cash: 3000, bankBalance: 50000 });
  const charWithCase: CharacterProfile = {
    ...lowCashChar,
    crime: { ...createEmptyCrimeState(), pendingCase: heldProceedsCase },
  };
  const rejectedFee = resolveCourtCase(charWithCase, 'elite_counsel');
  assert(!rejectedFee.ok, 'Cannot retain unaffordable counsel using bankBalance');
  assert(rejectedFee.character === charWithCase, 'Rejected counsel keeps character untouched');

  // Dismissal with public_defender ($0 fee) releases held $2,200 and keeps job
  const dismissChar = findCharForOutcome(
    createLegalTestCharacter({ cash: 1000, bankBalance: 8000, netWorth: 9000 }),
    heldProceedsCase,
    'public_defender',
    'dismissed',
  );
  const dismissRes = resolveCourtCase(dismissChar, 'public_defender');
  assert(dismissRes.ok && dismissRes.outcome === 'dismissed', 'Resolved dismissed');
  assert(dismissRes.releasedPayout === 2200, 'Held proceeds released on dismissal');
  assert(dismissRes.character.cash === 3200, 'Cash credited with held proceeds');
  assert(dismissRes.character.career.currentJob !== null, 'Dismissal preserves civilian job');
  assert(!hasActiveAdultConviction(dismissRes.character), 'Dismissal is not a conviction');
  assert(getArrestCount(dismissRes.character) === 1, 'Dismissed arrest counts as 1 formal arrest');

  // Acquittal releases held $2,200, preserves job and clean record
  const acquitChar = findCharForOutcome(
    createLegalTestCharacter({ cash: 1000, bankBalance: 8000, netWorth: 9000 }),
    heldProceedsCase,
    'public_defender',
    'acquitted',
  );
  const acquitRes = resolveCourtCase(acquitChar, 'public_defender');
  assert(acquitRes.ok && acquitRes.outcome === 'acquitted', 'Resolved acquitted');
  assert(acquitRes.releasedPayout === 2200 && acquitRes.character.cash === 3200, 'Acquittal releases proceeds');
  assert(acquitRes.character.career.currentJob !== null, 'Acquittal preserves civilian job');
  assert(!hasActiveAdultConviction(acquitRes.character), 'Acquittal is not a conviction');

  // Failed attempt acquitted NEVER generates/releases proceeds
  const failedCase = makePendingCase({ executionSucceeded: false, attemptedPayout: 0 });
  const failedAcquitChar = findCharForOutcome(
    createLegalTestCharacter({ cash: 1000 }),
    failedCase,
    'public_defender',
    'acquitted',
  );
  const failedAcquitRes = resolveCourtCase(failedAcquitChar, 'public_defender');
  assert(failedAcquitRes.releasedPayout === 0 && failedAcquitRes.character.cash === 1000, 'Failed crime releases $0');

  // Adult 'fined' forfeits held $2,200, collects cash without negative cash, tracks shortfall in unpaidFines, keeps job
  const finedChar = findCharForOutcome(
    createLegalTestCharacter({ cash: 900, bankBalance: 20000, netWorth: 20900 }),
    heldProceedsCase,
    'public_defender',
    'fined',
  );
  const finedRes = resolveCourtCase(finedChar, 'public_defender');
  assert(finedRes.ok && finedRes.outcome === 'fined', 'Resolved adult fine');
  assert(finedRes.releasedPayout === 0 && finedRes.record?.payout === 0, 'Conviction forfeits held proceeds');
  assert(finedRes.fineImposed >= 4000, 'Adult fine imposed');
  assert(finedRes.finePaid === 900, 'Collects available $900 cash only');
  assert(finedRes.character.cash === 0, 'Cash never goes negative');
  assert(finedRes.character.bankBalance === 20000, 'Bank balance untouched by court fine');
  assert(
    finedRes.unpaidFineAdded === finedRes.fineImposed - 900 &&
      finedRes.character.crime?.unpaidFines === finedRes.unpaidFineAdded,
    'Shortfall recorded accurately in crime.unpaidFines',
  );
  assert(
    finedRes.character.netWorth === calculatePlayerNetWorth(finedRes.character),
    'Frozen netWorth calculation remains unmodified (excludes unpaidFines)',
  );
  assert(finedRes.character.career.currentJob !== null, 'Non-custodial fine preserves employment');

  // Voluntary cash-only fine payment
  const withMoreCash = { ...finedRes.character, cash: 500 };
  const payRes = payUnpaidFines(withMoreCash, 300);
  assert(payRes.ok && payRes.paidAmount === 300, 'Voluntary payoff succeeds for $300');
  assert(payRes.character.cash === 200, 'Deducted $300 cash');
  assert(
    payRes.remainingUnpaidFines === finedRes.unpaidFineAdded - 300,
    'Decremented unpaidFines accurately',
  );

  // Adult 'imprisoned' forfeits proceeds, creates PrisonState, terminates employment with reasonForLeaving: 'fired'
  const prisonChar = findCharForOutcome(
    createLegalTestCharacter({ cash: 500, bankBalance: 15000 }),
    heldProceedsCase,
    'public_defender',
    'imprisoned',
  );
  const prisonRes = resolveCourtCase(prisonChar, 'public_defender');
  assert(prisonRes.ok && prisonRes.outcome === 'imprisoned', 'Resolved imprisonment');
  assert(prisonRes.releasedPayout === 0, 'Prison forfeits held proceeds');
  assert(isCurrentlyIncarcerated(prisonRes.character), 'PrisonState created');
  assert(prisonRes.employmentTerminated === true, 'Reported job termination');
  assert(prisonRes.character.career.currentJob === null, 'Imprisonment clears currentJob');
  assert(
    prisonRes.character.career.history.some((h) => h.reasonForLeaving === 'fired'),
    'Archived fired career entry on imprisonment',
  );
  assert(prisonRes.character.occupation === 'Incarcerated', 'Occupation updated to Incarcerated');
  assert(
    progressCareerForYear(prisonRes.character, prisonRes.character.age + 1).netPayEarned === 0,
    'No civilian salary is awarded during incarceration',
  );

  // Verify new structured relationship consequences on felony imprisonment
  assert(
    prisonRes.character.parents.father.relationship === 48,
    'Living father dropped by -22 on imprisonment',
  );
  assert(
    prisonRes.character.parents.mother.relationship === 90,
    'Deceased mother unchanged on imprisonment',
  );
  const syncedPartner = prisonRes.character.relationships.find((r) => r.id === 'partner-legal');
  assert(
    prisonRes.character.partner === null &&
      prisonRes.character.exPartners?.some(
        (ex) =>
          ex.id === 'partner-legal' &&
          ex.relationship === 35 &&
          ex.romanticStage === 'ex' &&
          ex.romanceMeter === 0,
      ) &&
      syncedPartner?.relationship === 35 &&
      syncedPartner?.romanticStage === 'ex',
    'Felony imprisonment dissolves partner relationship (-45, romanceMeter 0) across partner, exPartners, and relationships[]',
  );
  assert(
    prisonRes.character.siblings?.find((s) => s.id === 'sib-alive')?.relationship === 59,
    'Living sibling dropped -16 on imprisonment',
  );
  assert(
    prisonRes.character.siblings?.find((s) => s.id === 'sib-dead')?.relationship === 85,
    'Deceased sibling untouched',
  );
  assert(
    prisonRes.character.relationships.find((r) => r.id === 'rival-legal')?.relationship === 0,
    'Living other contact dropped -24 and clamped at 0',
  );
  assert(
    prisonRes.character.exPartners?.find((e) => e.id === 'ex-1')?.relationship === 40 &&
      prisonRes.character.children?.[0].relationship === 84,
    'Historical ex-partners untouched and young child (<5) dropped -8',
  );
}

function testProbationMergeAndJuvenileJurisdictionPreservation() {
  // Never shortens existing probation (existing 4 yrs + incoming 1 yr = 4 yrs)
  const existingJuv = mergeProbationState(null, 'Shoplifting', 'juvenile', 4, 17);
  const shorterIncoming = mergeProbationState(existingJuv, 'Vandalism', 'juvenile', 1, 17);
  assert(shorterIncoming.yearsRemaining === 4, 'Never shortens active probation');
  assert(shorterIncoming.jurisdiction === 'juvenile', 'Remains juvenile when both juvenile');

  // Never stacks (4 + 2 != 6); takes Math.max; adult overrides juvenile
  const longerAdult = mergeProbationState(shorterIncoming, 'Fraud', 'adult', 2, 18);
  assert(longerAdult.yearsRemaining === 4, 'Takes Math.max(4, 2) instead of stacking 6');
  assert(longerAdult.jurisdiction === 'adult', 'Adult jurisdiction takes precedence');
  assert(longerAdult.chargeTitle === 'Fraud', 'Updates controlling chargeTitle');

  // Active juvenile probation stays juvenile when character reaches age 18+ without an adult probation sentence
  const juvProbCase = makePendingCase({
    crimeId: 'shoplifting',
    title: 'Shoplifting',
    tier: 'petty',
    offenseClass: 'misdemeanor',
    jurisdiction: 'juvenile',
    arrestedAtAge: 17,
    arrestedAtYear: 2017,
    baseFine: 250,
    baseSentenceYears: 0,
  });
  const juvProbChar = findCharForOutcome(
    createLegalTestCharacter({ age: 17, cash: 500 }),
    juvProbCase,
    'public_defender',
    'probation',
  );
  const probRes = resolveCourtCase(juvProbChar, 'public_defender');
  assert(probRes.ok && probRes.outcome === 'probation', 'Juvenile probation imposed');
  assert(probRes.character.crime?.probation?.jurisdiction === 'juvenile', 'Juvenile jurisdiction set');
  const agedTo18 = { ...probRes.character, age: 18 };
  assert(
    agedTo18.crime?.probation?.jurisdiction === 'juvenile' && !hasActiveAdultConviction(agedTo18),
    'Turning 18 never turns juvenile probation into adult probation or conviction',
  );
}

function testAdultExpungementWaitingPeriodsAndEligibility() {
  const misdAt20 = makeRecord({
    id: 'misd-20',
    offenseClass: 'misdemeanor',
    jurisdiction: 'adult',
    age: 20,
    sentenceYears: 0,
  });
  const felonyAt20 = makeRecord({
    id: 'felony-20',
    crimeId: 'burglary',
    title: 'Burglary',
    tier: 'mid',
    offenseClass: 'felony',
    jurisdiction: 'adult',
    age: 20,
    outcome: 'probation',
    sentenceYears: 0,
  });
  const prisonFelonyAt19 = makeRecord({
    id: 'prison-felony-19',
    crimeId: 'robbery',
    title: 'Armed Robbery',
    tier: 'high_stakes',
    offenseClass: 'felony',
    jurisdiction: 'adult',
    age: 19,
    outcome: 'imprisoned',
    sentenceYears: 1,
  });
  const juvRecord = makeRecord({
    id: 'juv-15',
    jurisdiction: 'juvenile',
    age: 15,
    outcome: 'fined',
    sealed: true,
    expunged: false,
  });

  // Misdemeanor at age 20 -> 4 years clean (age 24) NOT eligible; 5 years clean (age 25) IS eligible
  const at24 = createLegalTestCharacter({
    age: 24,
    cash: 3000,
    crime: { ...createEmptyCrimeState(), records: [misdAt20, juvRecord] },
  });
  assert(getExpungementEligibleRecords(at24).length === 0, '4 clean years < 5 blocks misdemeanor');
  assert(!expungeAdultRecord(at24, 'misd-20').ok, 'Rejects misdemeanor expungement at 4 years');
  assert(!expungeAdultRecord(at24, 'juv-15').ok, 'Never expunges juvenile record via adult petition');

  const at25 = { ...at24, age: 25 };
  assert(getExpungementEligibleRecords(at25).length === 1, '5 clean years unlocks misdemeanor');

  // Expungement requires no filing fee (even at $0 cash)
  const zeroCashAt25 = { ...at25, cash: 0 };
  const expMisdRes = expungeAdultRecord(zeroCashAt25, 'misd-20');
  assert(expMisdRes.ok, 'Misdemeanor expunged at 5 clean years without filing fee');
  assert(expMisdRes.character.cash === 0, 'Expungement leaves cash untouched');
  assert(
    expMisdRes.expungedRecord?.expunged === true && expMisdRes.expungedRecord.sealed === false,
    'Expunged adult record sets expunged: true and sealed: false',
  );
  assert(
    getActiveAdultConvictions(expMisdRes.character).length === 0,
    'Expunged record excluded from adult conviction checks',
  );
  assert(
    expMisdRes.character.crime?.records.find((r) => r.id === 'juv-15')?.sealed === true &&
      expMisdRes.character.crime?.records.find((r) => r.id === 'juv-15')?.expunged === false,
    'Sealed juvenile record remains distinct',
  );

  // Felony waiting period: 7 clean years (age 27) blocked; 8 clean years (age 28) eligible
  const felonyChar27 = createLegalTestCharacter({
    age: 27,
    cash: 3000,
    crime: { ...createEmptyCrimeState(), records: [felonyAt20, prisonFelonyAt19] },
  });
  assert(
    getExpungementEligibleRecords(felonyChar27).length === 0,
    '7 clean years < 8 blocks felony expungement',
  );
  const felonyChar28 = { ...felonyChar27, age: 28 };
  const eligibleFelonies = getExpungementEligibleRecords(felonyChar28);
  assert(
    eligibleFelonies.length === 1 && eligibleFelonies[0].id === 'felony-20',
    'Only non-imprisoned felony is eligible after 8 clean years; imprisoned felony excluded',
  );
  assert(!expungeAdultRecord(felonyChar28, 'prison-felony-19').ok, 'Imprisoned felony cannot expunge');
  const expFelRes = expungeAdultRecord(felonyChar28, 'felony-20');
  assert(expFelRes.ok, 'Eligible felony expunged at 8 clean years');
  assert(
    hasSensitiveFieldConviction(expFelRes.character, 'business_finance'),
    'Remaining unexpunged prison felony still blocks sensitive fields while expunged one does not',
  );

  // Subsequent conviction resets clean-years waiting clock
  const laterMisd = makeRecord({
    id: 'later-misd-24',
    offenseClass: 'misdemeanor',
    jurisdiction: 'adult',
    age: 24,
    sentenceYears: 0,
  });
  const resetClockChar = createLegalTestCharacter({
    age: 26,
    cash: 3000,
    crime: { ...createEmptyCrimeState(), records: [misdAt20, laterMisd] },
  });
  assert(
    getExpungementEligibleRecords(resetClockChar).length === 0,
    'Subsequent conviction at age 24 resets clean window for age-20 misdemeanor at age 26',
  );

  // Expunging sole felony clears hasActiveFelony
  const soleFelonyChar = createLegalTestCharacter({
    age: 28,
    cash: 3000,
    crime: { ...createEmptyCrimeState(), records: [felonyAt20] },
  });
  const clearedSole = expungeAdultRecord(soleFelonyChar, 'felony-20');
  assert(clearedSole.ok && !hasActiveFelony(clearedSole.character), 'Expunged sole felony clears hasActiveFelony');

  // Outstanding unpaidFines does not block expungement once clean waiting period is met
  const withUnpaidFines = {
    ...soleFelonyChar,
    crime: { ...soleFelonyChar.crime!, unpaidFines: 200 },
  };
  const expWithDebtRes = expungeAdultRecord(withUnpaidFines, 'felony-20');
  assert(
    getExpungementEligibleRecords(withUnpaidFines).length === 1 && expWithDebtRes.ok,
    'Unpaid fines do not add an unapproved block to expungement',
  );
  assert(
    expWithDebtRes.character.crime?.unpaidFines === 200,
    'Expungement preserves separate adult unpaidFines obligation',
  );
}

function testMalformedAndMissingCourtStateResilience() {
  const noCaseChar = createLegalTestCharacter({ crime: undefined });
  const rNoCase = resolveCourtCase(noCaseChar, 'public_defender');
  assert(!rNoCase.ok && rNoCase.character === noCaseChar, 'Missing pendingCase safely no-ops');

  const malformedCrime = {
    policeHeat: Number.NaN,
    notoriety: 10,
    unpaidFines: -25,
    attemptsThisYear: 0,
    attemptCountLifetime: 0,
    lastAttemptAge: null,
    lastProgressedAge: null,
    pendingCase: { bad: true } as unknown as PendingCourtCase,
    prison: null,
    probation: null,
    records: [],
  } satisfies PlayerCrimeState;
  const corruptedChar = createLegalTestCharacter({ crime: malformedCrime });
  assert(!resolveCourtCase(corruptedChar, 'public_defender').ok, 'Malformed pendingCase fails safely');
  assert(!payUnpaidFines(corruptedChar).ok, 'Zero/negative unpaidFines fails safely');
}

function testPrisonLiquidationDivorceSocialPriorityAndIdempotency() {
  // 1. Business liquidation BEFORE fine settlement, attemptedPayout vs forfeitedProceeds,
  //    automatic marriage divorce (-45, skip divorce fee/asset split, sync worldState), and idempotency.
  const activeBusiness: ActiveBusinessProfile = {
    id: 'biz-prison-1',
    templateId: 'coffee_shop',
    name: 'Metro Bean Roasters',
    sector: 'food_hospitality',
    icon: '☕',
    foundedYear: 2022,
    foundedAge: 22,
    equityPct: 100,
    treasury: 10000,
    valuation: 50000, // salvage = 10000 + 50000*0.2 - 0 = $20,000
    pricing: 'standard',
    marketing: 'organic',
    payroll: 'standard',
    rnd: 'balanced',
    ownerSalary: 24000,
    dividendRatePct: 20,
    morale: 80,
    brandReputation: 70,
    qualityScore: 75,
    employeeCount: 4,
    locationsCount: 1,
    equipmentTier: 0,
    hasAuditCompleted: false,
    actionCooldowns: {},
    outstandingLoan: 0,
    annualLoanPayment: 0,
    yearsInOperation: 2,
    lifetimeRevenue: 120000,
    lifetimeProfit: 20000,
    isPubliclyTraded: false,
  };

  const spouse: PersonProfile = {
    id: 'spouse-1',
    firstName: 'Jordan',
    lastName: 'Hayes',
    gender: 'female',
    age: 24,
    role: 'Spouse',
    relationshipType: 'spouse',
    romanticStage: 'married',
    relationship: 90,
    romanceMeter: 85,
    originStory: 'Wedding',
    stageMet: 'adulthood',
  };

  const colleague: PersonProfile = {
    id: 'colleague-1',
    firstName: 'Sam',
    lastName: 'Lin',
    gender: 'male',
    age: 28,
    role: 'Colleague',
    relationshipType: 'coworker',
    cohortType: 'coworker',
    relationship: 70,
    originStory: 'Work',
    stageMet: 'adulthood',
  };
  const duplicateFatherInSocial: PersonProfile = {
    id: 'father-legal',
    firstName: 'George',
    lastName: 'Stone',
    gender: 'male',
    age: 56,
    role: 'Friend',
    relationshipType: 'friend',
    relationship: 70,
    originStory: 'Duplicate ref',
    stageMet: 'childhood',
  };
  const bestFriend: PersonProfile = {
    id: 'bf-1',
    firstName: 'Riley',
    lastName: 'Chen',
    gender: 'female',
    age: 24,
    role: 'Best Friend',
    relationshipType: 'best_friend',
    cohortType: 'best_friend',
    relationship: 82,
    originStory: 'School',
    stageMet: 'high_school',
  };
  const colleagueAlsoFriend: PersonProfile = {
    id: 'colleague-1',
    firstName: 'Sam',
    lastName: 'Lin',
    gender: 'male',
    age: 28,
    role: 'Friend',
    relationshipType: 'friend',
    cohortType: 'friend',
    relationship: 70,
    originStory: 'Duplicate friend copy of colleague',
    stageMet: 'adulthood',
  };
  const ordinaryFriend: PersonProfile = {
    id: 'friend-1',
    firstName: 'Morgan',
    lastName: 'Diaz',
    gender: 'male',
    age: 25,
    role: 'Friend',
    relationshipType: 'friend',
    cohortType: 'friend',
    relationship: 60,
    originStory: 'Neighborhood',
    stageMet: 'adulthood',
  };

  const heistCase = makePendingCase({
    id: 'bank-heist-case-1',
    crimeId: 'bank_heist',
    title: 'Bank Heist',
    tier: 'high_stakes',
    offenseClass: 'felony',
    executionSucceeded: true,
    attemptedPayout: 40000,
    baseFine: 8000, // 0.6 * 8000 = $4800 prison fine
    baseSentenceYears: 2,
  });

  const baseEntrepreneur = migrateToCanonicalWorldState(
    createLegalTestCharacter({
      cash: 100, // insufficient before business liquidation, plenty AFTER $20,000 liquidation!
      bankBalance: 5000,
      occupation: 'Founder & CEO (Metro Bean Roasters)',
      business: activeBusiness,
      partner: spouse,
      exPartners: [],
      children: [
        {
          id: 'child-older',
          firstName: 'Aria',
          lastName: 'Stone',
          age: 7,
          gender: 'female',
          relationship: 90,
          smarts: 80,
          looks: 80,
          happiness: 85,
          health: 90,
          isAdopted: false,
          occupation: 'Elementary Student',
          isAlive: true,
        },
        {
          id: 'child-young',
          firstName: 'Theo',
          lastName: 'Stone',
          age: 2,
          gender: 'male',
          relationship: 90,
          smarts: 70,
          looks: 75,
          happiness: 85,
          health: 90,
          isAdopted: false,
          occupation: 'Toddler',
          isAlive: true,
        },
      ],
      relationships: [
        spouse,
        duplicateFatherInSocial,
        colleague,
        colleagueAlsoFriend,
        bestFriend,
        ordinaryFriend,
      ],
      crime: {
        ...createEmptyCrimeState(),
        pendingCase: heistCase,
      },
    }),
  );

  const prisonRes = applyCourtOutcome(baseEntrepreneur, heistCase, 'public_defender', 'imprisoned');
  assert(prisonRes.ok && prisonRes.prisonConsequences, 'Returns PrisonConsequencesSummary');
  const pc = prisonRes.prisonConsequences;
  assert(
    pc.closedBusinessName === 'Metro Bean Roasters' && pc.businessLiquidationProceeds === 20000,
    'Captures actual closed business name and $20,000 liquidation salvage proceeds',
  );
  assert(prisonRes.character.business === null, 'Active business cleared upon imprisonment');
  assert(
    prisonRes.character.occupation === 'Incarcerated',
    'Forced liquidation keeps Incarcerated occupation rather than Unemployed',
  );
  // $100 starting cash + $20,000 liquidation - $4,800 fine = $15,300 (fine fully paid using liquidation proceeds!)
  assert(
    prisonRes.fineImposed === 4800 &&
      prisonRes.finePaid === 4800 &&
      prisonRes.unpaidFineAdded === 0 &&
      prisonRes.character.cash === 15300,
    `Liquidation proceeds paid full fine once cleanly (cash=${prisonRes.character.cash}, unpaid=${prisonRes.unpaidFineAdded})`,
  );
  assert(
    pc.forfeitedProceeds === 40000 &&
      prisonRes.character.netWorth === calculatePlayerNetWorth(prisonRes.character),
    'Captures forfeited proceeds and stamps exact net worth once',
  );

  // Partner automatic divorce without double happiness/fee charges
  assert(
    prisonRes.character.partner === null &&
      prisonRes.character.exPartners?.length === 1 &&
      prisonRes.character.exPartners[0].role === 'Ex-Spouse' &&
      prisonRes.character.exPartners[0].romanticStage === 'ex' &&
      prisonRes.character.exPartners[0].relationship === 45 &&
      prisonRes.character.exPartners[0].romanceMeter === 0 &&
      prisonRes.character.relationships.find((r) => r.id === 'spouse-1')?.romanticStage === 'ex',
    '2+ year felony divorce clears partner, applies -45 rel and 0 romanceMeter, skips asset split, syncs exPartners/relationships[]',
  );
  assert(
    prisonRes.character.stats.happiness === 75 - 18,
    'Applies only court happiness -18 without double-subtracting divorce -30 happiness',
  );

  // WorldState synchronization
  const worldSpouseEdge = Object.values(prisonRes.character.worldState!.relationshipsById).find(
    (e) => e.participantAId === 'spouse-1' || e.participantBId === 'spouse-1',
  );
  assert(
    worldSpouseEdge?.category === 'ex' && worldSpouseEdge.status === 'former',
    'worldState edge immediately synchronized to ex/former after divorce',
  );

  // Deduplication priority verification (father stays Parents -22 = 48, colleague stays Colleagues -30 = 40 across copies)
  assert(
    prisonRes.character.parents.father.relationship === 48 &&
      prisonRes.character.relationships.find((r) => r.id === 'father-legal')?.relationship === 48,
    'Father penalized ONCE (-22) as Parent and mirrored identically to relationships[]',
  );
  assert(
    prisonRes.character.children?.find((c) => c.id === 'child-older')?.relationship === 78 &&
      prisonRes.character.children?.find((c) => c.id === 'child-young')?.relationship === 82,
    'Children penalized by age tier (>=5: -12, <5: -8)',
  );
  assert(
    prisonRes.character.relationships
      .filter((r) => r.id === 'colleague-1')
      .every((r) => r.relationship === 40) &&
      prisonRes.character.relationships.find((r) => r.id === 'bf-1')?.relationship === 64 &&
      prisonRes.character.relationships.find((r) => r.id === 'friend-1')?.relationship === 38,
    'Colleagues -30 mirrored across duplicate IDs, Best Friend -18, Friend -22',
  );
  const parentGroup = pc.socialConsequences.groups.find((g) => g.category === 'parents');
  const friendGroup = pc.socialConsequences.groups.find((g) => g.category === 'friends');
  assert(
    parentGroup?.affectedCount === 1 && friendGroup?.affectedCount === 1,
    'Counts each unique living NPC strictly once under winning priority group',
  );

  // Idempotency: re-applying finalized case returns ok: false with no mutations
  const duplicateCall = applyCourtOutcome(prisonRes.character, heistCase, 'public_defender', 'imprisoned');
  assert(
    !duplicateCall.ok && duplicateCall.character === prisonRes.character,
    'Idempotency guard rejects duplicate finalization on already-recorded case',
  );

  // 2. Failed-execution arrest must report $0 forfeited proceeds
  const failedArrestCase = makePendingCase({
    id: 'failed-heist-case',
    crimeId: 'bank_heist',
    title: 'Bank Heist',
    tier: 'high_stakes',
    offenseClass: 'felony',
    executionSucceeded: false,
    attemptedPayout: 35000,
    baseSentenceYears: 2,
  });
  const failedHeistRes = applyCourtOutcome(
    createLegalTestCharacter({ cash: 1000, business: null, partner: null }),
    failedArrestCase,
    'public_defender',
    'imprisoned',
  );
  assert(
    failedHeistRes.prisonConsequences?.forfeitedProceeds === 0,
    'Failed execution reports $0 forfeited criminal proceeds even when attemptedPayout > 0',
  );

  // 3. 1-year misdemeanor partner rules: survives at >= 35 (-50/-50), divorces without extra -45 if < 35
  const misdCase = makePendingCase({
    id: 'misd-1yr-case',
    crimeId: 'shoplifting',
    title: 'Shoplifting',
    tier: 'petty',
    offenseClass: 'misdemeanor',
    baseFine: 100,
    baseSentenceYears: 1,
  });
  const highBondSpouse = { ...spouse, relationship: 90, romanceMeter: 80 };
  const survivedChar = createLegalTestCharacter({
    partner: highBondSpouse,
    relationships: [highBondSpouse],
    exPartners: [],
    business: null,
  });
  const survivedRes = applyCourtOutcome(survivedChar, misdCase, 'public_defender', 'imprisoned');
  assert(
    survivedRes.character.partner?.relationship === 40 &&
      survivedRes.character.partner?.romanceMeter === 30 &&
      survivedRes.character.partner?.romanticStage === 'married' &&
      survivedRes.prisonConsequences?.partnerConsequence.action === 'damaged' &&
      !survivedRes.prisonConsequences?.socialConsequences.groups.some(
        (g) => g.category === 'other_contacts' && g.affectedCount > 0,
      ),
    '1-yr misdemeanor: 90 - 50 = 40 (>= 35) retains marriage with -50 rel/-50 romance and excludes partner from social sweep',
  );

  const lowBondSpouse = { ...spouse, relationship: 70, romanceMeter: 60 }; // 70 - 50 = 20 < 35
  const lowBondChar = createLegalTestCharacter({
    partner: lowBondSpouse,
    relationships: [lowBondSpouse],
    exPartners: [],
    business: null,
  });
  const misdDivorceRes = applyCourtOutcome(lowBondChar, misdCase, 'public_defender', 'imprisoned');
  assert(
    misdDivorceRes.character.partner === null &&
      misdDivorceRes.character.exPartners?.[0].relationship === 20 &&
      misdDivorceRes.character.exPartners?.[0].romanceMeter === 0 &&
      misdDivorceRes.prisonConsequences?.partnerConsequence.action === 'divorced',
    '1-yr misdemeanor: 70 - 50 = 20 (< 35) dissolves marriage with exact -50 penalty and zero extra -45 hit',
  );

  // Unmarried dating partner on 1-yr misdemeanor (< 35 breaks up without extra -45)
  const lowBondDating: PersonProfile = {
    ...spouse,
    id: 'dating-1',
    role: 'Partner',
    relationshipType: 'dating',
    romanticStage: 'dating',
    relationship: 65, // 65 - 50 = 15 < 35
    romanceMeter: 70,
  };
  const datingMisdRes = applyCourtOutcome(
    createLegalTestCharacter({
      partner: lowBondDating,
      relationships: [lowBondDating],
      exPartners: [],
      business: null,
    }),
    misdCase,
    'public_defender',
    'imprisoned',
  );
  assert(
    datingMisdRes.character.partner === null &&
      datingMisdRes.character.exPartners?.[0].relationship === 15 &&
      datingMisdRes.character.exPartners?.[0].romanticStage === 'ex' &&
      datingMisdRes.character.exPartners?.[0].romanceMeter === 0 &&
      datingMisdRes.prisonConsequences?.partnerConsequence.action === 'broke_up',
    '1-yr misdemeanor: unmarried dating partner below 35 breaks up cleanly with exact -50 penalty and 0 romanceMeter',
  );
}

testJuvenileCourtOutcomesAndBoundaries();
testCounselCashGuardProceedsAndEmploymentSeparately();
testProbationMergeAndJuvenileJurisdictionPreservation();
testAdultExpungementWaitingPeriodsAndEligibility();
testMalformedAndMissingCourtStateResilience();
testPrisonLiquidationDivorceSocialPriorityAndIdempotency();
console.log('courtLegal.test.ts passed all assertions');
