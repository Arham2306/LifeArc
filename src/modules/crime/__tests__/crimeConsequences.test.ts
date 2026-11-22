import type { CharacterProfile } from '../../../types/game';
import { hashSeed, SeededPRNG } from '../../autonomy/services/seededPrngService';
import type { ActiveBusinessProfile } from '../../business/types';
import { createInitialCareerState } from '../../career/services/careerService';
import { UNIVERSITY_MAJORS } from '../../education/data/majors';
import {
  applyEducationCrimeConsequence,
  createInitialEducation,
  enrollInUniversity,
  evaluateMajorEligibility,
  progressEducationForYear,
} from '../../education/services/educationService';
import { getCrimeTemplate } from '../data/crimeCatalog';
import {
  evaluateArrestSocialAwareness,
  evaluateAttemptMoodAndKarma,
  evaluateAwarenessSocialScale,
  evaluateBusinessConsequence,
  evaluateEducationConsequence,
  evaluateEvidenceBasedExposure,
  evaluateEmploymentConsequence,
  evaluatePhysicalAndMoodImpact,
  evaluateProbationRevocationModifier,
  evaluateVictimLossAndRestitution,
  resolveBusinessManagementCapability,
} from '../data/crimeConsequences';
import {
  applyCourtOutcome,
  attemptCrime,
  payUnpaidRestitution,
  performProbationAction,
} from '../services/crimeService';
import {
  calculatePersonalLiabilitiesForUnderwriting,
  createEmptyCrimeState,
  evaluateFinancingEligibility,
  getCrimeLegalStatus,
  getSanitizedCrimeState,
  getTotalLegalDebt,
  getUnpaidRestitution,
  hasFinancialFraudConviction,
  hasViolentFelonyConviction,
  isCriminalRecordEntry,
  isOnProbation,
  resolveBusinessLoanGuaranteeType,
} from '../services/crimeSelectors';
import type {
  CrimeRecordEntry,
  PendingCourtCase,
  PlayerCrimeState,
  ProbationState,
} from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function makeBusiness(
  overrides: Partial<ActiveBusinessProfile> & {
    managementCapability?: 'owner_operated' | 'delegated_management' | 'management_unavailable' | 'legacy_unassigned';
    loanGuaranteeType?: 'corporate_only' | 'personally_guaranteed';
  } = {},
): ActiveBusinessProfile & {
  managementCapability?: 'owner_operated' | 'delegated_management' | 'management_unavailable' | 'legacy_unassigned';
  loanGuaranteeType?: 'corporate_only' | 'personally_guaranteed';
} {
  return {
    id: 'biz-phase1-1',
    templateId: 'biz_coffee_shop',
    name: 'Harbor Roast Co.',
    sector: 'food_hospitality',
    icon: '☕',
    foundedYear: 2020,
    foundedAge: 22,
    equityPct: 100,
    treasury: 25000,
    valuation: 120000,
    pricing: 'standard',
    marketing: 'moderate',
    payroll: 'standard',
    rnd: 'balanced',
    ownerSalary: 40000,
    dividendRatePct: 20,
    morale: 80,
    brandReputation: 75,
    qualityScore: 78,
    employeeCount: 10,
    locationsCount: 2,
    equipmentTier: 1,
    hasAuditCompleted: false,
    actionCooldowns: {},
    outstandingLoan: 0,
    annualLoanPayment: 0,
    yearsInOperation: 3,
    lifetimeRevenue: 300000,
    lifetimeProfit: 60000,
    isPubliclyTraded: false,
    ...overrides,
  };
}

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-phase1-1',
    firstName: 'Alex',
    lastName: 'Mercer',
    gender: 'male',
    age: 26,
    birthYear: 2000,
    city: 'Austin',
    country: 'United States',
    occupation: 'Accountant',
    cash: 15000,
    bankBalance: 20000,
    netWorth: 35000,
    isAlive: true,
    stats: {
      health: 88,
      happiness: 80,
      smarts: 76,
      looks: 72,
      karma: 65,
    },
    parents: {
      father: {
        id: 'father-1',
        firstName: 'Robert',
        lastName: 'Mercer',
        age: 56,
        role: 'father',
        occupation: 'Engineer',
        relationship: 80,
        generosity: 60,
        isAlive: true,
      },
      mother: {
        id: 'mother-1',
        firstName: 'Clara',
        lastName: 'Mercer',
        age: 54,
        role: 'mother',
        occupation: 'Teacher',
        relationship: 82,
        generosity: 65,
        isAlive: true,
      },
      wealth: 'comfortable',
    },
    siblings: [],
    relationships: [],
    partner: null,
    exPartners: [],
    children: [],
    education: createInitialEducation(),
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'acct-1',
        title: 'Accountant',
        companyName: 'Ledger Co',
        field: 'business_finance',
        type: 'full_time',
        salary: 75000,
        yearsInJob: 3,
        performance: 80,
        hiredAge: 23,
        icon: '📊',
      },
    },
    business: null,
    crime: createEmptyCrimeState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function makeRecord(overrides: Partial<CrimeRecordEntry> = {}): CrimeRecordEntry {
  return {
    id: 'rec-p1',
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
    attemptedPayout: 100,
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

function makePendingCase(overrides: Partial<PendingCourtCase> = {}): PendingCourtCase {
  return {
    id: 'case-p1',
    crimeId: 'burglary',
    title: 'Burglary',
    tier: 'mid',
    offenseClass: 'felony',
    jurisdiction: 'adult',
    arrestedAtAge: 26,
    arrestedAtYear: 2026,
    executionSucceeded: true,
    injured: false,
    attemptedPayout: 2200,
    baseFine: 3500,
    baseSentenceYears: 3,
    ...overrides,
  };
}

function testPerRecordLegalStatusAndLegacySanitization() {
  const undetected = makeRecord({ id: 'rec-u', outcome: 'undetected', detected: false });
  const aborted = makeRecord({ id: 'rec-a', outcome: 'aborted', detected: false, executionSucceeded: false });
  assert(!isCriminalRecordEntry(undetected) && !isCriminalRecordEntry(aborted), 'Attempts are not criminal records');
  assert(getCrimeLegalStatus(undetected) === 'attempted', 'Undetected maps to attempted');
  assert(getCrimeLegalStatus(aborted) === 'attempted', 'Aborted maps to attempted');

  const oldFinishedConviction = makeRecord({
    id: 'rec-old-2020',
    crimeId: 'burglary',
    offenseClass: 'felony',
    age: 20,
    outcome: 'imprisoned',
    sentenceYears: 2,
    sentenceStatus: 'completed',
  });
  const activeNewProbationRec = makeRecord({
    id: 'rec-new-2026',
    crimeId: 'vehicle_theft',
    offenseClass: 'felony',
    age: 26,
    outcome: 'probation',
    sentenceYears: 2,
    sentenceStatus: 'active',
  });

  const activeProb: ProbationState = {
    chargeTitle: 'Vehicle Theft',
    jurisdiction: 'adult',
    yearsRemaining: 2,
    startedAtAge: 26,
    lastProgressedAge: null,
    activeTerms: [
      {
        recordId: 'rec-new-2026',
        chargeTitle: 'Vehicle Theft',
        jurisdiction: 'adult',
        yearsRemaining: 2,
        startedAtAge: 26,
        communityServiceHoursRemaining: 80,
        technicalWarnings: 0,
        violationCount: 0,
      },
    ],
  };

  const char = makeCharacter({
    age: 26,
    crime: {
      ...createEmptyCrimeState(),
      probation: activeProb,
      records: [oldFinishedConviction, activeNewProbationRec],
    },
  });

  assert(
    getCrimeLegalStatus(oldFinishedConviction, char) === 'sentence_completed',
    'Completed historical conviction stays sentence_completed even while a newer case is active',
  );
  assert(
    getCrimeLegalStatus(activeNewProbationRec, char) === 'convicted',
    'Currently active probation case resolves to convicted',
  );

  // Legacy unlinked record without sentenceStatus still isolates old completion
  const legacyOld = makeRecord({
    id: 'rec-legacy-old',
    age: 20,
    outcome: 'imprisoned',
    sentenceYears: 2,
  });
  assert(
    getCrimeLegalStatus(legacyOld, char) === 'sentence_completed',
    'Legacy unlinked finished record does not falsely inherit newer probation active state',
  );

  // Legacy save sanitization preserves unpaidFines and safely defaults unpaidRestitution to 0
  const legacyCrime = {
    policeHeat: 20,
    notoriety: 15,
    unpaidFines: 1450,
    attemptsThisYear: 0,
    attemptCountLifetime: 2,
    lastAttemptAge: 25,
    lastProgressedAge: 25,
    pendingCase: null,
    prison: null,
    probation: null,
    records: [legacyOld],
  } as PlayerCrimeState;

  const sanitized = getSanitizedCrimeState({ crime: legacyCrime });
  assert(sanitized.unpaidFines === 1450, 'Legacy unpaidFines preserved');
  assert(sanitized.unpaidRestitution === 0, 'Legacy save defaults unpaidRestitution to 0');
  assert(
    getUnpaidRestitution({ crime: sanitized }) === 0 &&
      getTotalLegalDebt({ crime: sanitized }) === 1450,
    'Total legal debt equals legacy unpaidFines',
  );
}

function testEvidenceBasedExposureSeparation() {
  const enrolledWorker = makeCharacter({
    education: {
      ...createInitialEducation(),
      currentStage: 'university',
      schoolName: 'Austin State University',
    },
  });
  const vandalism = getCrimeTemplate('vandalism');
  const bankHeist = getCrimeTemplate('bank_heist');

  // Undetected stays private even when injured and enrolled/employed (never fabricates witnesses)
  const undetectedInjured = evaluateEvidenceBasedExposure(enrolledWorker, vandalism, {
    detected: false,
    jurisdiction: 'adult',
    executionSucceeded: false,
  });
  assert(
    undetectedInjured === 'private',
    'Undetected crime stays private without explicit witness or institutional report evidence',
  );

  // Explicit witness signal overrides to witness_known
  const explicitWitness = evaluateEvidenceBasedExposure(
    enrolledWorker,
    vandalism,
    { detected: false, jurisdiction: 'adult', executionSucceeded: true },
    { explicitWitnessSignal: true },
  );
  assert(explicitWitness === 'witness_known', 'Explicit witness evidence produces witness_known');

  // Bank heist arrest is probabilistic public (not forced 100% across all seeds)
  let publicCount = 0;
  let nonPublicCount = 0;
  for (let i = 0; i < 60; i++) {
    const exp = evaluateEvidenceBasedExposure(
      { ...enrolledWorker, id: `heist-seed-${i}` },
      bankHeist,
      { detected: true, jurisdiction: 'adult', executionSucceeded: true },
      { seedKey: `case-${i}` },
    );
    if (exp === 'publicly_reported') publicCount++;
    else nonPublicCount++;
  }
  assert(
    publicCount > 25 && nonPublicCount > 0,
    `High-profile arrest is probabilistic public (public=${publicCount}, nonPublic=${nonPublicCount})`,
  );
}

function testSeparatedVictimRestitutionAndStateForfeiture() {
  const prng = new SeededPRNG(hashSeed('victim-loss-test'));
  const fraudCase = makePendingCase({
    crimeId: 'fraud_scam',
    title: 'Financial Scam',
    executionSucceeded: true,
    attemptedPayout: 10000,
  });

  // Escrowed $10,000 confiscated by state NEVER reduces victim restitution automatically
  const convicted = evaluateVictimLossAndRestitution(fraudCase, 'fined', prng);
  assert(convicted.stateForfeitedProceeds === 10000, 'State forfeiture tracks escrowed proceeds');
  assert(convicted.recoveredPropertyReturnedToVictim === 0, 'Unconfirmed return stays $0');
  assert(
    convicted.remainingVictimLoss >= 1200 && convicted.restitutionImposed === convicted.remainingVictimLoss,
    'Victim restitution remains independent of state forfeiture',
  );

  // Confirmed victim property return explicitly reduces remainingVictimLoss
  const prng2 = new SeededPRNG(hashSeed('victim-loss-test'));
  const withConfirmedReturn = evaluateVictimLossAndRestitution(fraudCase, 'fined', prng2, {
    victimReturnConfirmed: true,
    recoveredValueReturned: 1000,
  });
  assert(
    withConfirmedReturn.recoveredPropertyReturnedToVictim === 1000 &&
      withConfirmedReturn.remainingVictimLoss === convicted.remainingVictimLoss - 1000,
    'Confirmed victim asset return reduces remainingVictimLoss accurately',
  );

  // Acquittal/dismissal imposes $0 forfeiture and $0 restitution
  const acquitted = evaluateVictimLossAndRestitution(fraudCase, 'acquitted', prng);
  assert(
    acquitted.stateForfeitedProceeds === 0 && acquitted.restitutionImposed === 0,
    'Acquittal imposes $0 forfeiture and $0 restitution',
  );
}

function testEmploymentAndBusinessEvaluators() {
  const accountant = makeCharacter();
  const fraudCase = makePendingCase({ crimeId: 'fraud_scam', title: 'Financial Scam' });
  const burglaryCase = makePendingCase({ crimeId: 'burglary', title: 'Burglary' });

  // Pre-trial arrest: full-time Accountant on non-violent fraud gets 50% paid leave
  const preTrial = evaluateEmploymentConsequence(accountant, fraudCase, 'arrest', 'witness_known');
  assert(
    preTrial.action === 'suspend_pending_trial' && preTrial.payMultiplier === 0.5,
    'Sensitive full-time non-violent pre-trial leave pays 50%',
  );

  // Acquittal reinstates cleanly
  assert(
    evaluateEmploymentConsequence(accountant, fraudCase, 'acquitted', 'witness_known').action === 'reinstate',
    'Acquittal reinstates suspended employment',
  );

  // Preserved Accountant + Burglary 'fined' keeps employment
  assert(
    evaluateEmploymentConsequence(accountant, burglaryCase, 'fined', 'private').action === 'preserve',
    'Unrelated non-custodial Burglary fine preserves Accountant employment',
  );

  // Accountant + fraud_scam 'fined' terminates employment
  assert(
    evaluateEmploymentConsequence(accountant, fraudCase, 'fined', 'witness_known').action === 'terminate',
    'Financial fraud fine terminates sensitive business_finance employment',
  );

  // Business capability: omitted capability NEVER silently infers delegated_management
  const legacyBigBiz = makeBusiness({
    employeeCount: 30,
    locationsCount: 5,
    hasAuditCompleted: true,
    isPubliclyTraded: true,
    managementCapability: undefined,
  });
  assert(
    resolveBusinessManagementCapability(legacyBigBiz) === 'legacy_unassigned',
    'Omitted managementCapability resolves strictly to legacy_unassigned even for large public audited business',
  );
  const heistCase = makePendingCase({
    crimeId: 'bank_heist',
    title: 'Bank Heist',
    tier: 'high_stakes',
    baseSentenceYears: 8,
  });
  assert(
    evaluateBusinessConsequence(legacyBigBiz, heistCase, 'imprisoned', 'publicly_reported').action ===
      'pause_incarceration',
    'legacy_unassigned business pauses across multi-year prison term instead of liquidating by sentence length',
  );

  const ownerOperatedBiz = makeBusiness({ managementCapability: 'owner_operated' });
  assert(
    evaluateBusinessConsequence(ownerOperatedBiz, heistCase, 'imprisoned', 'publicly_reported').action ===
      'liquidate',
    'Explicit owner_operated business liquidates upon imprisonment',
  );

  const delegatedBiz = makeBusiness({ managementCapability: 'delegated_management' });
  assert(
    evaluateBusinessConsequence(delegatedBiz, heistCase, 'imprisoned', 'publicly_reported').action ===
      'continue_delegated',
    'Explicit delegated_management business continues operating across unrelated imprisonment',
  );

  // Business-facilitated fraud still liquidates even if delegated or legacy_unassigned
  assert(
    evaluateBusinessConsequence(delegatedBiz, fraudCase, 'imprisoned', 'publicly_reported').action ===
      'liquidate',
    'Felony fraud_scam imprisonment liquidates active company regardless of delegated status',
  );
}

function testEducationStatsAndProbationModifiers() {
  const uniStudent = makeCharacter({
    education: {
      ...createInitialEducation(),
      currentStage: 'university',
      schoolName: 'Austin State University',
      university: {
        universityName: 'Austin State University',
        majorId: 'cs',
        majorName: 'Computer Science',
        degreeTitle: 'B.S. in Computer Science',
        year: 2,
        totalYears: 4,
        fundingType: 'student_loan',
        tuitionPerYear: 12000,
      },
    },
  });

  const shopliftCase = makePendingCase({
    crimeId: 'shoplifting',
    title: 'Shoplifting',
    tier: 'petty',
    offenseClass: 'misdemeanor',
  });
  const misdProbEdu = evaluateEducationConsequence(uniStudent, shopliftCase, 'probation', 'witness_known');
  assert(
    misdProbEdu.action === 'probation',
    'Minor unrelated misdemeanor probation does NOT automatically expel university student',
  );

  const k12Student = makeCharacter({
    age: 15,
    education: { ...createInitialEducation(), currentStage: 'high_school', schoolName: 'West High' },
  });
  const k12Prob = evaluateEducationConsequence(k12Student, shopliftCase, 'probation', 'witness_known');
  assert(
    k12Prob.scope === 'k12' && k12Prob.action === 'k12_suspension' && k12Prob.missedClassPenalty === 8,
    'K-12 juvenile probation applies organic missedClassPenalty rather than breaking compulsory progression',
  );

  // Cause-driven health/mood & non-stacking & zero looks penalty
  const fraudWithArrestShock = makePendingCase({
    crimeId: 'fraud_scam',
    offenseClass: 'felony',
    arrestHappinessApplied: -5,
    arrestHealthApplied: 0,
  });
  const fraudProbStats = evaluatePhysicalAndMoodImpact(fraudWithArrestShock, 'probation', 90);
  assert(
    fraudProbStats.looksDelta === 0 && fraudProbStats.healthDelta === 0 && fraudProbStats.happinessDelta === -13,
    'Fraud probation imposes 0 looks drop, 0 non-physical health drop, and de-duplicates arrest happiness shock (-5 + -13 = -18)',
  );

  const heistAttemptMood = evaluateAttemptMoodAndKarma(
    getCrimeTemplate('bank_heist'),
    { detected: false, executionSucceeded: true, injured: false, injuryHealthLoss: 0 },
    70,
  );
  assert(
    heistAttemptMood.happinessDelta < 0 && heistAttemptMood.healthDelta === 0,
    'Undetected high-stakes Bank Heist causes stress rather than flat +4 happiness',
  );

  const revMod = evaluateProbationRevocationModifier(
    makePendingCase({ crimeId: 'robbery', offenseClass: 'felony' }),
    0,
  );
  assert(revMod.severity === 'violent_or_repeat' && revMod.prisonWeightBoost === 0.5, 'Violent offense escalates revocation modifier');

  const privSocial = evaluateAwarenessSocialScale('fined', 'private');
  assert(privSocial.colleagueScale === 0 && privSocial.socialCircleScale === 0, 'Private fine spares distant social/colleague circles');
}

function testLegacyLoanGuaranteeAndUnderwritingDTI() {
  // Legacy bank loan with audit, IPO/public listing, and equity dilution STILL stays personally_guaranteed
  const legacyAuditedPublicDiluted = makeBusiness({
    outstandingLoan: 60000,
    annualLoanPayment: 8700,
    hasAuditCompleted: true,
    isPubliclyTraded: true,
    equityPct: 65,
    loanGuaranteeType: undefined,
  });
  assert(
    resolveBusinessLoanGuaranteeType(legacyAuditedPublicDiluted) === 'personally_guaranteed',
    'Legacy bank loan preserves personally_guaranteed even after audit, public listing, and equity dilution',
  );

  const charWithLegacyLoan = makeCharacter({
    business: legacyAuditedPublicDiluted,
    stats: { health: 85, happiness: 80, smarts: 75, looks: 70, karma: 10 }, // Low karma should NOT block credit alone
  });
  assert(
    calculatePersonalLiabilitiesForUnderwriting(charWithLegacyLoan) === 60000,
    'Personally guaranteed legacy business loan counts toward personal liabilities',
  );

  // Explicit corporate_only debt is excluded from personal mortgage DTI
  const corporateOnlyBiz = makeBusiness({
    outstandingLoan: 500000,
    annualLoanPayment: 72500,
    valuation: 800000,
    loanGuaranteeType: 'corporate_only',
  });
  const charWithCorpLoan = makeCharacter({
    business: corporateOnlyBiz,
    stats: { health: 85, happiness: 80, smarts: 75, looks: 70, karma: 15 },
  });
  assert(
    calculatePersonalLiabilitiesForUnderwriting(charWithCorpLoan) === 0,
    'Explicit corporate_only business debt is excluded from personal liabilities',
  );
  const mortgageCheck = evaluateFinancingEligibility(charWithCorpLoan, 'mortgage', 200000);
  assert(
    mortgageCheck.eligible && mortgageCheck.personalLiabilities === 0,
    'Low karma + corporate_only debt does not block mortgage when personal financials and record are clean',
  );

  // Active fraud_scam conviction blocks commercial_loan, angel_equity, and mortgage
  const fraudster = makeCharacter({
    crime: {
      ...createEmptyCrimeState(),
      records: [
        makeRecord({
          id: 'rec-fraud-1',
          crimeId: 'fraud_scam',
          title: 'Financial Scam',
          offenseClass: 'felony',
          outcome: 'fined',
          expunged: false,
        }),
      ],
    },
  });
  assert(hasFinancialFraudConviction(fraudster), 'Detects active financial fraud conviction');
  assert(!evaluateFinancingEligibility(fraudster, 'commercial_loan', 30000).eligible, 'Fraud blocks commercial loan');
  assert(!evaluateFinancingEligibility(fraudster, 'angel_equity').eligible, 'Fraud blocks angel equity');
  assert(!evaluateFinancingEligibility(fraudster, 'mortgage', 150000).eligible, 'Fraud blocks mortgage');

  // Violent felony blocks angel_equity but allows mortgage with +10% extra down payment when financially qualified
  const violentRecordHolder = makeCharacter({
    crime: {
      ...createEmptyCrimeState(),
      records: [
        makeRecord({
          id: 'rec-rob-1',
          crimeId: 'robbery',
          title: 'Robbery',
          offenseClass: 'felony',
          outcome: 'fined',
          expunged: false,
        }),
      ],
    },
  });
  assert(hasViolentFelonyConviction(violentRecordHolder), 'Detects violent felony conviction');
  assert(!evaluateFinancingEligibility(violentRecordHolder, 'angel_equity').eligible, 'Violent felony blocks angel equity');
  const violentMortgage = evaluateFinancingEligibility(violentRecordHolder, 'mortgage', 180000);
  assert(
    violentMortgage.eligible && violentMortgage.extraDownPaymentRate === 0.1,
    'Violent felony applies +10% underwriting caution on mortgage without blanket statutory ban',
  );
}

function testMalformedSaveSanitizationAndJsonRoundTrip() {
  const corruptedRecord = {
    ...makeRecord({ id: 'rec-corrupt-1' }),
    exposure: 'bogus_exposure',
    sentenceStatus: 'bad_status',
    stateForfeitedProceeds: -500,
    recoveredPropertyReturnedToVictim: Number.NaN,
    remainingVictimLoss: 'not-a-number',
    restitutionImposed: -10,
    restitutionPaid: Infinity,
  } as unknown as CrimeRecordEntry;

  const corruptedPending = {
    ...makePendingCase({ id: 'case-corrupt-1' }),
    legalStatus: 'convicted',
    exposure: 'leaked_everywhere',
    offendedOnProbation: 'yes',
    arrestHappinessApplied: Number.NaN,
    arrestHealthApplied: 'bad',
    explicitWitnessSignal: 123,
    institutionalReportFiled: null,
  } as unknown as PendingCourtCase;

  const corruptedCrime = {
    policeHeat: 35,
    notoriety: 22,
    unpaidFines: 400,
    unpaidRestitution: -999,
    attemptsThisYear: 1,
    attemptCountLifetime: 3,
    lastAttemptAge: 26,
    lastProgressedAge: 25,
    pendingCase: corruptedPending,
    prison: {
      facilityName: 'State Pen',
      securityLevel: 'medium',
      chargeTitle: 'Burglary',
      yearsTotal: 3,
      yearsServed: 1,
      yearsRemaining: 2,
      behaviorScore: 60,
      paroleEligibleAtServed: 2,
      actionsTakenThisYear: 0,
      lastActionAge: null,
      lastProgressedAge: 25,
      originCaseId: '   ',
      priorRetirementOccupation: 'InvalidOccupation',
    },
    probation: {
      chargeTitle: 'Shoplifting',
      jurisdiction: 'adult',
      yearsRemaining: 1,
      startedAtAge: 25,
      lastProgressedAge: null,
      activeTerms: 'not-an-array',
      conditions: ['supervision_checkins', 'invalid_cond', 42],
      lastCheckInAge: -5,
      lastServiceActionAge: 'twenty',
      serviceActionsThisYear: Number.NaN,
      restitutionPaidThisYear: -100,
      technicalWarnings: -3,
      violationCount: 'two',
    },
    records: [corruptedRecord],
  } as unknown as PlayerCrimeState;

  const sanitized = getSanitizedCrimeState({ crime: corruptedCrime });
  assert(sanitized.unpaidFines === 400 && sanitized.unpaidRestitution === 0, 'Negative unpaidRestitution normalized to 0');

  const rec = sanitized.records[0];
  assert(
    rec.exposure === undefined &&
      rec.sentenceStatus === undefined &&
      rec.stateForfeitedProceeds === undefined &&
      rec.recoveredPropertyReturnedToVictim === undefined &&
      rec.remainingVictimLoss === undefined &&
      rec.restitutionImposed === undefined &&
      rec.restitutionPaid === undefined,
    'Corrupted optional fields on CrimeRecordEntry are stripped instead of leaking through spread',
  );

  const pend = sanitized.pendingCase!;
  assert(
    pend.legalStatus === undefined &&
      pend.exposure === undefined &&
      pend.offendedOnProbation === undefined &&
      pend.arrestHappinessApplied === undefined &&
      pend.arrestHealthApplied === undefined &&
      pend.explicitWitnessSignal === undefined &&
      pend.institutionalReportFiled === undefined,
    'Corrupted optional fields on PendingCourtCase are stripped cleanly',
  );

  assert(
    sanitized.prison?.originCaseId === undefined &&
      sanitized.prison?.priorRetirementOccupation === undefined,
    'Blank originCaseId and invalid priorRetirementOccupation are stripped from PrisonState',
  );

  assert(
    sanitized.probation?.activeTerms === undefined &&
      sanitized.probation?.conditions?.length === 1 &&
      sanitized.probation.conditions[0] === 'supervision_checkins' &&
      sanitized.probation.lastCheckInAge === null &&
      sanitized.probation.lastServiceActionAge === null &&
      sanitized.probation.serviceActionsThisYear === undefined &&
      sanitized.probation.restitutionPaidThisYear === undefined &&
      sanitized.probation.technicalWarnings === undefined &&
      sanitized.probation.violationCount === undefined,
    'Corrupted optional fields on ProbationState are stripped or normalized cleanly',
  );

  // Full JSON serialization/deserialization round-trip preserves all valid new optional fields
  const validRichCrime: PlayerCrimeState = {
    policeHeat: 42,
    notoriety: 31,
    unpaidFines: 650,
    unpaidRestitution: 1200,
    attemptsThisYear: 1,
    attemptCountLifetime: 4,
    lastAttemptAge: 26,
    lastProgressedAge: 25,
    pendingCase: {
      ...makePendingCase({ id: 'case-json-1' }),
      legalStatus: 'pending_trial',
      exposure: 'witness_known',
      offendedOnProbation: true,
      arrestHappinessApplied: -5,
      arrestHealthApplied: -2,
      explicitWitnessSignal: true,
      institutionalReportFiled: false,
    },
    prison: {
      facilityName: 'Oak Ridge',
      securityLevel: 'medium',
      chargeTitle: 'Robbery',
      yearsTotal: 4,
      yearsServed: 1,
      yearsRemaining: 3,
      behaviorScore: 70,
      paroleEligibleAtServed: 2,
      actionsTakenThisYear: 1,
      lastActionAge: 26,
      lastProgressedAge: 25,
      originCaseId: 'rec-json-prison',
      priorRetirementOccupation: null,
    },
    probation: {
      chargeTitle: 'Vehicle Theft',
      jurisdiction: 'adult',
      yearsRemaining: 2,
      startedAtAge: 25,
      lastProgressedAge: 25,
      activeTerms: [
        {
          recordId: 'rec-json-prob',
          chargeTitle: 'Vehicle Theft',
          jurisdiction: 'adult',
          yearsRemaining: 2,
          startedAtAge: 25,
          communityServiceHoursRemaining: 40,
          technicalWarnings: 1,
          violationCount: 0,
        },
      ],
      conditions: ['supervision_checkins', 'community_service', 'restitution_payments'],
      lastCheckInAge: 26,
      lastServiceActionAge: 26,
      serviceActionsThisYear: 2,
      restitutionPaidThisYear: 500,
      technicalWarnings: 1,
      violationCount: 0,
    },
    records: [
      {
        ...makeRecord({ id: 'rec-json-prison', outcome: 'imprisoned', sentenceYears: 4 }),
        exposure: 'publicly_reported',
        sentenceStatus: 'active',
        stateForfeitedProceeds: 5000,
        recoveredPropertyReturnedToVictim: 800,
        remainingVictimLoss: 2200,
        restitutionImposed: 2200,
        restitutionPaid: 1000,
      },
    ],
  };

  const roundTripped = getSanitizedCrimeState({
    crime: JSON.parse(JSON.stringify(validRichCrime)) as PlayerCrimeState,
  });
  assert(
    roundTripped.unpaidRestitution === 1200 &&
      roundTripped.prison?.originCaseId === 'rec-json-prison' &&
      roundTripped.pendingCase?.explicitWitnessSignal === true &&
      roundTripped.pendingCase?.institutionalReportFiled === false &&
      roundTripped.pendingCase?.arrestHappinessApplied === -5 &&
      roundTripped.probation?.activeTerms?.[0].communityServiceHoursRemaining === 40 &&
      roundTripped.records[0].exposure === 'publicly_reported' &&
      roundTripped.records[0].restitutionImposed === 2200 &&
      roundTripped.records[0].restitutionPaid === 1000,
    'All new optional fields survive JSON round-trip intact',
  );
}

function testLegalStatusPrisonOriginAndIncompleteServiceBoundary() {
  const activePrisonRec = makeRecord({
    id: 'rec-prison-match',
    crimeId: 'robbery',
    offenseClass: 'felony',
    age: 26,
    outcome: 'imprisoned',
    sentenceYears: 4,
  });
  const olderMismatchRec = makeRecord({
    id: 'rec-prison-older',
    crimeId: 'burglary',
    offenseClass: 'felony',
    age: 20,
    outcome: 'imprisoned',
    sentenceYears: 2,
  });
  const servicePendingProbRec = makeRecord({
    id: 'rec-prob-hours-left',
    crimeId: 'vandalism',
    offenseClass: 'misdemeanor',
    age: 24,
    outcome: 'probation',
    sentenceYears: 1,
  });

  const char = makeCharacter({
    age: 26,
    crime: {
      ...createEmptyCrimeState(),
      prison: {
        facilityName: 'Central Correctional',
        securityLevel: 'maximum',
        chargeTitle: 'Robbery',
        yearsTotal: 4,
        yearsServed: 0,
        yearsRemaining: 4,
        behaviorScore: 55,
        paroleEligibleAtServed: 2,
        actionsTakenThisYear: 0,
        lastActionAge: null,
        lastProgressedAge: null,
        originCaseId: 'rec-prison-match',
      },
      probation: {
        chargeTitle: 'Vandalism',
        jurisdiction: 'adult',
        yearsRemaining: 0,
        startedAtAge: 24,
        lastProgressedAge: 25,
        activeTerms: [
          {
            recordId: 'rec-prob-hours-left',
            chargeTitle: 'Vandalism',
            jurisdiction: 'adult',
            yearsRemaining: 0,
            startedAtAge: 24,
            communityServiceHoursRemaining: 20,
            technicalWarnings: 1,
            violationCount: 0,
          },
        ],
      },
      records: [activePrisonRec, olderMismatchRec, servicePendingProbRec],
    },
  });

  assert(
    getCrimeLegalStatus(activePrisonRec, char) === 'convicted',
    'Matching prison.originCaseId resolves to convicted',
  );
  assert(
    getCrimeLegalStatus(olderMismatchRec, char) === 'sentence_completed',
    'Mismatched historical prison record remains sentence_completed',
  );
  assert(
    getCrimeLegalStatus(servicePendingProbRec, char) === 'convicted',
    'Probation term with 0 yearsRemaining but 20 communityServiceHoursRemaining stays convicted',
  );
}

function testAdditionalEvaluatorAndUnderwritingBoundaries() {
  // Business: management_unavailable, deep insolvency, and non-custodial scandal exposure scaling
  const heistCase = makePendingCase({ crimeId: 'bank_heist', title: 'Bank Heist', tier: 'high_stakes' });
  const unavailBiz = makeBusiness({ managementCapability: 'management_unavailable' });
  assert(
    evaluateBusinessConsequence(unavailBiz, heistCase, 'imprisoned', 'publicly_reported').action === 'liquidate',
    'management_unavailable business liquidates upon imprisonment',
  );

  const deeplyInsolventLegacy = makeBusiness({
    managementCapability: undefined,
    valuation: 100000,
    treasury: -60000, // < -valuation * 0.5
  });
  assert(
    evaluateBusinessConsequence(deeplyInsolventLegacy, heistCase, 'imprisoned', 'private').action === 'liquidate',
    'Deeply insolvent legacy_unassigned business liquidates upon imprisonment',
  );

  const robberyCase = makePendingCase({ crimeId: 'robbery', title: 'Robbery', tier: 'high_stakes' });
  const publicScandal = evaluateBusinessConsequence(
    makeBusiness({ managementCapability: 'delegated_management' }),
    robberyCase,
    'fined',
    'publicly_reported',
  );
  const privateScandal = evaluateBusinessConsequence(
    makeBusiness({ managementCapability: 'delegated_management' }),
    robberyCase,
    'fined',
    'private',
  );
  assert(
    publicScandal.action === 'scandal' &&
      publicScandal.brandDelta < 0 &&
      privateScandal.action === 'none',
    'Non-custodial scandal scales by exposure (publicly_reported hurts brand; private unrelated crime does not)',
  );

  // Education: repeat-offense expulsion, campus vandalism suspension, and fraud major relevance
  const suspendedCsStudent = makeCharacter({
    education: {
      ...createInitialEducation(),
      currentStage: 'university',
      schoolName: 'Austin State University',
      university: {
        universityName: 'Austin State University',
        majorId: 'cs',
        majorName: 'Computer Science',
        degreeTitle: 'B.S. in Computer Science',
        year: 2,
        totalYears: 4,
        fundingType: 'student_loan',
        tuitionPerYear: 12000,
      },
      ...({ disciplinaryStatus: 'suspended' } as Record<string, unknown>),
    } as CharacterProfile['education'],
  });
  const shopliftCase = makePendingCase({
    crimeId: 'shoplifting',
    title: 'Shoplifting',
    tier: 'petty',
    offenseClass: 'misdemeanor',
  });
  assert(
    evaluateEducationConsequence(suspendedCsStudent, shopliftCase, 'probation', 'witness_known').action === 'expelled',
    'Repeat probation offense while already suspended triggers expulsion',
  );

  const csStudent = makeCharacter({
    education: {
      ...createInitialEducation(),
      currentStage: 'university',
      schoolName: 'Austin State University',
      university: {
        universityName: 'Austin State University',
        majorId: 'cs',
        majorName: 'Computer Science',
        degreeTitle: 'B.S. in Computer Science',
        year: 2,
        totalYears: 4,
        fundingType: 'student_loan',
        tuitionPerYear: 12000,
      },
    },
  });
  const financeStudent = makeCharacter({
    education: {
      ...createInitialEducation(),
      currentStage: 'university',
      schoolName: 'Austin State University',
      university: {
        universityName: 'Austin State University',
        majorId: 'finance',
        majorName: 'Finance & Accounting',
        degreeTitle: 'B.B.A. in Finance',
        year: 2,
        totalYears: 4,
        fundingType: 'student_loan',
        tuitionPerYear: 14000,
      },
    },
  });
  const vandalismCase = makePendingCase({
    crimeId: 'vandalism',
    title: 'Vandalism',
    tier: 'petty',
    offenseClass: 'misdemeanor',
  });
  const fraudCase = makePendingCase({ crimeId: 'fraud_scam', title: 'Financial Scam', offenseClass: 'felony' });
  assert(
    evaluateEducationConsequence(csStudent, vandalismCase, 'probation', 'witness_known').action === 'suspended',
    'Campus-relevant vandalism misdemeanor probation suspends rather than expels',
  );
  assert(
    evaluateEducationConsequence(financeStudent, fraudCase, 'fined', 'witness_known').action === 'expelled',
    'Financial fraud fine in Finance & Accounting major triggers expulsion',
  );
  assert(
    evaluateEducationConsequence(csStudent, fraudCase, 'fined', 'witness_known').action === 'suspended',
    'Financial fraud fine in unrelated Computer Science major triggers 1-year suspension',
  );

  // Employment: violent pre-trial unpaid leave, aviation_transport vehicle_theft probation, non-sensitive misd probation
  const accountant = makeCharacter();
  const violentPreTrial = evaluateEmploymentConsequence(accountant, robberyCase, 'arrest', 'publicly_reported');
  assert(
    violentPreTrial.action === 'suspend_pending_trial' && violentPreTrial.payMultiplier === 0,
    'Violent felony arrest puts sensitive role on 0% unpaid leave',
  );

  const pilot = makeCharacter({
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'pilot-1',
        title: 'Commercial Pilot',
        companyName: 'SkyLine Air',
        field: 'aviation_transport',
        type: 'full_time',
        salary: 110000,
        yearsInJob: 4,
        performance: 85,
        hiredAge: 22,
        icon: '✈️',
      },
    },
  });
  const autoTheftCase = makePendingCase({ crimeId: 'vehicle_theft', title: 'Vehicle Theft', offenseClass: 'felony' });
  assert(
    evaluateEmploymentConsequence(pilot, autoTheftCase, 'probation', 'witness_known').action === 'terminate',
    'Vehicle theft felony probation terminates aviation_transport employment',
  );

  const retailWorker = makeCharacter({
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'retail-1',
        title: 'Store Clerk',
        companyName: 'Corner Mart',
        field: 'hospitality_retail',
        type: 'full_time',
        salary: 35000,
        yearsInJob: 2,
        performance: 75,
        hiredAge: 24,
        icon: '🛒',
      },
    },
  });
  assert(
    evaluateEmploymentConsequence(retailWorker, shopliftCase, 'probation', 'private').action === 'preserve',
    'Non-sensitive worker on minor misdemeanor probation preserves job',
  );

  // Physical/mood non-stacking for imprisonment with prior arrest happiness + non-injury health stress
  const prisonWithArrest = evaluatePhysicalAndMoodImpact(
    makePendingCase({
      crimeId: 'robbery',
      offenseClass: 'felony',
      arrestHappinessApplied: -6,
      arrestHealthApplied: -2,
    }),
    'imprisoned',
    90,
  );
  assert(
    prisonWithArrest.happinessDelta === -14 &&
      prisonWithArrest.healthDelta === -4 &&
      prisonWithArrest.looksDelta === 0,
    'Imprisonment caps combined arrest+custody happiness at -20 (-6 + -14) and de-duplicates arrest stress (-2 + -4 = -6)',
  );

  // Underwriting: incarceration block, legal debt block, missing mortgage amount, zero-income cash-rich,
  // direct mortgage principal reading (no assetService import), and corporate_only leverage isolation
  const incarceratedChar = makeCharacter({
    crime: {
      ...createEmptyCrimeState(),
      prison: {
        facilityName: 'State Pen',
        securityLevel: 'medium',
        chargeTitle: 'Burglary',
        yearsTotal: 2,
        yearsServed: 0,
        yearsRemaining: 2,
        behaviorScore: 50,
        paroleEligibleAtServed: 1,
        actionsTakenThisYear: 0,
        lastActionAge: null,
        lastProgressedAge: null,
      },
    },
  });
  assert(
    !evaluateFinancingEligibility(incarceratedChar, 'mortgage', 100000).eligible &&
      evaluateFinancingEligibility(incarceratedChar, 'mortgage', 100000).criminalRecordRisk === 'incarcerated',
    'Incarcerated character is blocked from mortgage financing',
  );

  const delinquentChar = makeCharacter({
    crime: {
      ...createEmptyCrimeState(),
      unpaidFines: 20000,
      unpaidRestitution: 25000, // total $45k > 50% of $75k income
    },
  });
  assert(
    !evaluateFinancingEligibility(delinquentChar, 'mortgage', 120000).eligible &&
      !evaluateFinancingEligibility(delinquentChar, 'commercial_loan', 30000).eligible,
    'High combined unpaid fines + restitution blocks mortgage and commercial loans',
  );

  const missingAmountMortgage = evaluateFinancingEligibility(makeCharacter(), 'mortgage');
  assert(
    !missingAmountMortgage.eligible,
    'Mortgage underwriting requires a positive requestedAmount',
  );

  // Zero-income retiree with substantial net liquid reserves (>= 60% of requested mortgage) qualifies
  const retiredMillionaire = makeCharacter({
    occupation: 'Retired',
    cash: 150000,
    bankBalance: 100000, // $250k liquid, $0 personal debt -> 125% of $200k mortgage
    career: createInitialCareerState(),
    assets: {
      properties: [
        {
          id: 'prop-1',
          catalogId: 'studio_austin_loft',
          type: 'studio',
          name: 'Austin Loft Studio',
          city: 'Austin',
          purchasePrice: 62000,
          purchaseAge: 22,
          marketValue: 70000,
          mortgage: {
            originalPrincipal: 49600,
            principal: 20000,
            annualInterestRate: 0.04,
            annualPrincipalPayment: 2000,
          },
        },
      ],
    },
  });
  assert(
    calculatePersonalLiabilitiesForUnderwriting(retiredMillionaire) === 20000,
    'Reads existing property mortgage principal directly without assetService runtime import',
  );
  const retireeMortgage = evaluateFinancingEligibility(retiredMillionaire, 'mortgage', 200000);
  assert(
    retireeMortgage.eligible && retireeMortgage.annualIncome === 0,
    'Zero-income borrower with net liquid reserves >= 60% of requested mortgage qualifies',
  );

  // Heavy corporate_only leverage blocks commercial_loan while leaving personal mortgage DTI at $0
  const heavilyLeveragedCorp = makeCharacter({
    business: makeBusiness({
      valuation: 200000,
      outstandingLoan: 190000, // 95% > 90% corporate leverage limit
      loanGuaranteeType: 'corporate_only',
    }),
  });
  assert(
    !evaluateFinancingEligibility(heavilyLeveragedCorp, 'commercial_loan', 30000).eligible &&
      evaluateFinancingEligibility(heavilyLeveragedCorp, 'mortgage', 180000).eligible &&
      evaluateFinancingEligibility(heavilyLeveragedCorp, 'mortgage', 180000).personalLiabilities === 0,
    'Heavy corporate_only business leverage blocks commercial_loan while staying excluded from personal mortgage DTI',
  );
}

function testPhase2EducationCrimeIntegration() {
  // 1. Higher-education 1-year suspension pauses degree year & loan debt growth, then clears cleanly
  const csStudent = makeCharacter({
    age: 20,
    education: {
      ...createInitialEducation(),
      currentStage: 'university',
      schoolName: 'Austin State University',
      grades: 82,
      popularity: 70,
      studentDebt: 12000,
      activities: [
        {
          activityId: 'robotics_club',
          disciplineId: 'robotics',
          name: 'Robotics Club',
          category: 'academics',
          icon: '🤖',
          joinedAge: 19,
          yearsInClub: 1,
          role: 'member',
          leaderTitle: 'President',
          practicedThisYear: false,
        },
      ],
      university: {
        universityName: 'Austin State University',
        majorId: 'cs',
        majorName: 'Computer Science',
        degreeTitle: 'B.S. in Computer Science',
        year: 2,
        totalYears: 4,
        fundingType: 'student_loan',
        tuitionPerYear: 12000,
      },
    },
  });

  const fraudFineRes = applyEducationCrimeConsequence(
    csStudent,
    makePendingCase({ id: 'edu-susp-1', crimeId: 'fraud_scam', title: 'Financial Scam', offenseClass: 'felony' }),
    'fined',
    'witness_known',
  );
  assert(
    fraudFineRes.applied &&
      fraudFineRes.disposition === 'suspended' &&
      fraudFineRes.character.education.disciplinaryStatus === 'suspended' &&
      fraudFineRes.character.education.disciplinaryDurationYears === 1 &&
      fraudFineRes.character.education.activities.length === 0,
    'CS student fined for unrelated fraud receives 1-year academic suspension instead of expulsion',
  );

  // Duplicate case is idempotent
  assert(
    !applyEducationCrimeConsequence(
      fraudFineRes.character,
      makePendingCase({ id: 'edu-susp-1', crimeId: 'fraud_scam', title: 'Financial Scam', offenseClass: 'felony' }),
      'fined',
      'witness_known',
    ).applied,
    'Duplicate education consequence call is a clean idempotent no-op',
  );

  // Year 1 under suspension: year stays 2, studentDebt stays $12,000, then suspension clears
  const suspendedYear = progressEducationForYear(fraudFineRes.character, 21);
  assert(
    suspendedYear.education.university?.year === 2 &&
      suspendedYear.education.studentDebt === 12000 &&
      suspendedYear.education.disciplinaryStatus === 'none' &&
      suspendedYear.education.disciplinaryDurationYears === 0,
    'Academic suspension pauses degree advancement and tuition debt for 1 year, then clears automatically',
  );

  // Subsequent year resumes normal progression
  const resumedYear = progressEducationForYear(
    { ...fraudFineRes.character, age: 21, education: suspendedYear.education },
    22,
  );
  assert(
    resumedYear.education.university?.year === 3 &&
      resumedYear.education.studentDebt === 24000,
    'University progression and tuition resume normally after suspension lifts',
  );

  // 2. K-12 probation sets missedClassPenalty & drops clubs, applying organic drag while preserving advancement
  const k12Student = makeCharacter({
    age: 13,
    education: {
      ...createInitialEducation(),
      currentStage: 'middle_school',
      schoolName: 'Oak Middle School',
      grades: 88,
      popularity: 65,
      activities: [
        {
          activityId: 'soccer_team',
          disciplineId: 'soccer',
          name: 'Varsity Soccer',
          category: 'athletics',
          icon: '⚽',
          joinedAge: 12,
          yearsInClub: 1,
          role: 'member',
          leaderTitle: 'Captain',
          practicedThisYear: false,
        },
      ],
    },
  });
  const k12Prob = applyEducationCrimeConsequence(
    k12Student,
    makePendingCase({
      id: 'edu-k12-1',
      crimeId: 'vandalism',
      title: 'Vandalism',
      tier: 'petty',
      offenseClass: 'misdemeanor',
      jurisdiction: 'juvenile',
    }),
    'probation',
    'witness_known',
  );
  assert(
    k12Prob.applied &&
      k12Prob.character.education.missedClassPenalty === 8 &&
      k12Prob.character.education.activities.length === 0 &&
      k12Prob.character.education.grades === 88,
    'K-12 probation queues missedClassPenalty and drops clubs without directly subtracting grades at sentencing',
  );
  const k12ToHighSchool = progressEducationForYear(k12Prob.character, 14);
  assert(
    k12ToHighSchool.education.currentStage === 'high_school' &&
      k12ToHighSchool.education.missedClassPenalty === 0 &&
      k12ToHighSchool.education.disciplinaryStatus === 'none' &&
      k12ToHighSchool.education.disciplinaryDurationYears === 0 &&
      k12ToHighSchool.education.grades < 88,
    'K-12 advances compulsorily to high_school, consumes missedClassPenalty once, and resets disciplinaryStatus',
  );

  // K-12 suspension during High School clears cleanly across annual progress & graduation, so an adult
  // university student's first minor misdemeanor probation is NOT misclassified as a repeat offense.
  let hsStudent = makeCharacter({
    age: 16,
    stats: { health: 90, happiness: 85, smarts: 88, looks: 75, karma: 80 },
    education: {
      ...k12ToHighSchool.education,
      grades: 88,
    },
  });
  const hsSuspended = applyEducationCrimeConsequence(
    hsStudent,
    makePendingCase({
      id: 'edu-hs-1',
      crimeId: 'shoplifting',
      title: 'Shoplifting',
      tier: 'petty',
      offenseClass: 'misdemeanor',
      jurisdiction: 'juvenile',
    }),
    'fined',
    'witness_known',
  );
  assert(
    hsSuspended.character.education.disciplinaryStatus === 'suspended',
    'High school student enters temporary K-12 suspension status',
  );

  const hs17 = progressEducationForYear(hsSuspended.character, 17);
  hsStudent = { ...hsSuspended.character, age: 17, education: hs17.education };
  assert(
    hsStudent.education.disciplinaryStatus === 'none' &&
      hsStudent.education.disciplinaryDurationYears === 0,
    'K-12 annual progression clears disciplinaryStatus cleanly after year ends',
  );

  const hsGrad = progressEducationForYear(hsStudent, 18);
  hsStudent = { ...hsStudent, age: 18, education: hsGrad.education, cash: 50000 };
  assert(
    hsStudent.education.currentStage === 'graduated' &&
      hsStudent.education.disciplinaryStatus === 'none',
    'High school graduation preserves clean disciplinaryStatus',
  );

  const enrolledUni = enrollInUniversity(hsStudent, UNIVERSITY_MAJORS[0].id, 'student_loan');
  assert(
    enrolledUni.enrolled && enrolledUni.character.education.disciplinaryStatus === 'none',
    'Graduated student enters university with clean disciplinaryStatus',
  );

  const firstUniMisdemeanor = applyEducationCrimeConsequence(
    enrolledUni.character,
    makePendingCase({
      id: 'edu-uni-first-misd',
      crimeId: 'shoplifting',
      title: 'Shoplifting',
      tier: 'petty',
      offenseClass: 'misdemeanor',
      jurisdiction: 'adult',
    }),
    'probation',
    'witness_known',
  );
  assert(
    firstUniMisdemeanor.applied &&
      firstUniMisdemeanor.disposition === 'probation' &&
      firstUniMisdemeanor.expelledFromSchool === null,
    'First minor university offense stays at academic probation and does NOT escalate from old K-12 suspension',
  );

  // 3. Finance-major fraud conviction expels, preserves earned diplomas, and history stays permanent
  //    even after criminal record expungement lifts general admissions barrier
  const financeStudent = makeCharacter({
    age: 21,
    education: {
      ...createInitialEducation(),
      currentStage: 'university',
      schoolName: 'Austin State University',
      diplomas: ['High School Diploma'],
      grades: 90,
      university: {
        universityName: 'Austin State University',
        majorId: 'finance',
        majorName: 'Finance',
        degreeTitle: 'B.S. in Finance',
        year: 3,
        totalYears: 4,
        fundingType: 'student_loan',
        tuitionPerYear: 12000,
      },
    },
    crime: {
      ...createEmptyCrimeState(),
      records: [
        makeRecord({
          id: 'edu-fin-fraud',
          crimeId: 'fraud_scam',
          title: 'Financial Scam',
          offenseClass: 'felony',
          outcome: 'fined',
          expunged: false,
        }),
      ],
    },
  });
  const expelledFin = applyEducationCrimeConsequence(
    financeStudent,
    makePendingCase({ id: 'edu-fin-fraud', crimeId: 'fraud_scam', title: 'Financial Scam', offenseClass: 'felony' }),
    'fined',
    'witness_known',
  );
  assert(
    expelledFin.disposition === 'expelled' &&
      expelledFin.character.education.diplomas.includes('High School Diploma') &&
      expelledFin.character.education.history.some((h) => h.status === 'expelled') &&
      !evaluateMajorEligibility(expelledFin.character, UNIVERSITY_MAJORS[0]).isAdmissible,
    'Finance major convicted of fraud is expelled with prior diplomas preserved and re-entry blocked',
  );

  // Expunging criminal record lifts criminal admissions block while institutional expulsion history remains permanent
  const afterExpungement: CharacterProfile = {
    ...expelledFin.character,
    crime: {
      ...expelledFin.character.crime!,
      records: expelledFin.character.crime!.records.map((r) => ({ ...r, expunged: true })),
    },
  };
  assert(
    evaluateMajorEligibility(afterExpungement, UNIVERSITY_MAJORS[0]).isAdmissible &&
      afterExpungement.education.history.some((h) => h.status === 'expelled') &&
      afterExpungement.education.expelledFromStages?.includes('university'),
    'Expungement lifts criminal-record admissions barrier while institutional expulsion history and expelledFromStages remain permanently recorded',
  );
}

function makeTestBusiness(overrides: Partial<ActiveBusinessProfile> = {}): ActiveBusinessProfile {
  return {
    id: 'biz-phase3-1',
    templateId: 'coffee_shop',
    name: 'Mercer Analytics',
    sector: 'food_hospitality',
    icon: '💻',
    foundedYear: 2023,
    foundedAge: 23,
    treasury: 50000,
    valuation: 50000,
    equityPct: 100,
    pricing: 'standard',
    marketing: 'moderate',
    payroll: 'standard',
    rnd: 'balanced',
    ownerSalary: 30000,
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
    managementCapability: 'owner_operated',
    operationalStatus: 'active',
    yearsInOperation: 3,
    lifetimeRevenue: 180000,
    lifetimeProfit: 45000,
    isPubliclyTraded: false,
    ...overrides,
  };
}

function testPhase3LifecycleIntegrationAndSafeguards() {
  // 1. Recipient- & evidence-gated arrest awareness (5 distinct dimensions, binary established deltas)
  const privAdultAware = evaluateArrestSocialAwareness({
    jurisdiction: 'adult',
    exposure: 'private',
    statutoryParentNotification: false,
    institutionalReportFiled: false,
    institutionalTarget: 'none',
  });
  assert(
    !privAdultAware.parentsAware &&
      !privAdultAware.partnerAware &&
      !privAdultAware.friendsAware &&
      !privAdultAware.colleaguesAware &&
      privAdultAware.parentsDelta === 0 &&
      privAdultAware.partnerDelta === 0,
    'Private adult arrest creates zero ungrounded family, partner, friend, or colleague reactions',
  );

  const witnessFriendOnly = evaluateArrestSocialAwareness({
    jurisdiction: 'adult',
    exposure: 'witness_known',
    explicitWitnessGroups: ['friends'],
    institutionalReportFiled: false,
    institutionalTarget: 'none',
  });
  assert(
    witnessFriendOnly.friendsAware &&
      !witnessFriendOnly.parentsAware &&
      !witnessFriendOnly.partnerAware &&
      witnessFriendOnly.parentsDelta === 0 &&
      witnessFriendOnly.partnerDelta === 0,
    'Witness awareness targeting friends does not leak to family or partner',
  );

  const employerNoticeOnly = evaluateArrestSocialAwareness({
    jurisdiction: 'adult',
    exposure: 'witness_known',
    institutionalReportFiled: true,
    institutionalTarget: 'employer',
  });
  assert(
    !employerNoticeOnly.parentsAware &&
      !employerNoticeOnly.partnerAware &&
      employerNoticeOnly.parentsDelta === 0 &&
      employerNoticeOnly.partnerDelta === 0,
    'Employer institutional notice does not leak to parents or partner',
  );

  const juvenileStatutory = evaluateArrestSocialAwareness({
    jurisdiction: 'juvenile',
    exposure: 'witness_known',
    statutoryParentNotification: true,
    institutionalReportFiled: false,
    institutionalTarget: 'none',
  });
  assert(
    juvenileStatutory.parentsAware &&
      juvenileStatutory.parentsDelta === -5 &&
      !juvenileStatutory.partnerAware &&
      juvenileStatutory.partnerDelta === 0,
    'Juvenile statutory parent notice applies established -5 delta without notifying partners',
  );

  const publicAdult = evaluateArrestSocialAwareness({
    jurisdiction: 'adult',
    exposure: 'publicly_reported',
  });
  assert(
    publicAdult.parentsAware &&
      publicAdult.partnerAware &&
      publicAdult.friendsAware &&
      publicAdult.colleaguesAware &&
      publicAdult.parentsDelta === -4 &&
      publicAdult.partnerDelta === -3,
    'Publicly reported adult arrest applies established -4 parent and -3 partner deltas',
  );

  // 2. End-to-end pre-trial suspension on arrest -> acquittal reinstatement + full proceeds release
  const acctWithPartner = makeCharacter({
    cash: 2500,
    bankBalance: 15000,
    partner: {
      id: 'part-p3',
      firstName: 'Morgan',
      lastName: 'Hale',
      gender: 'female',
      age: 26,
      role: 'Partner',
      relationshipType: 'partner',
      romanticStage: 'dating',
      relationship: 80,
      romanceMeter: 75,
      originStory: 'Work',
      stageMet: 'adulthood',
    },
  });
  let detectedFraudAttempt: ReturnType<typeof attemptCrime> | null = null;
  for (let i = 0; i < 150; i++) {
    const candidate = { ...acctWithPartner, id: `p3-fraud-${i}` };
    const attempt = attemptCrime(candidate, 'fraud_scam');
    if (
      attempt.ok &&
      attempt.pendingCase &&
      attempt.pendingCase.executionSucceeded &&
      attempt.pendingCase.attemptedPayout > 0
    ) {
      detectedFraudAttempt = attempt;
      break;
    }
  }
  assert(detectedFraudAttempt !== null && detectedFraudAttempt.pendingCase, 'Found fraud_scam arrest seed');
  assert(
    detectedFraudAttempt.pendingCase.legalStatus === 'pending_trial' &&
      detectedFraudAttempt.character.career.currentJob?.suspendedPendingTrial?.payMultiplier === 0.5 &&
      detectedFraudAttempt.pendingCase.arrestHappinessApplied !== undefined,
    'Detected fraud arrest sets pending_trial, 50% paid suspension on Accountant, and records arrest happiness shock',
  );
  const acquittedAfterArrest = applyCourtOutcome(
    detectedFraudAttempt.character,
    detectedFraudAttempt.pendingCase,
    'private_attorney',
    'acquitted',
  );
  assert(
    acquittedAfterArrest.ok &&
      acquittedAfterArrest.character.career.currentJob !== null &&
      acquittedAfterArrest.character.career.currentJob.suspendedPendingTrial === null &&
      acquittedAfterArrest.releasedPayout === 0,
    'Acquittal reinstates suspended Accountant job and never pays out seized criminal proceeds',
  );

  // 3. Approach B Restitution + Corporate vs Personal Isolation + Burglary Fined Preservation
  const corpTreasurer = makeCharacter({
    id: 'p3-corp-sep',
    cash: 1200,
    bankBalance: 18000,
    business: makeTestBusiness({ treasury: 85000, managementCapability: 'delegated_management' }),
  });
  const burgFinedCase = makePendingCase({
    id: 'case-p3-burg-fine',
    crimeId: 'burglary',
    title: 'Burglary',
    offenseClass: 'misdemeanor',
    baseFine: 400,
    exposure: 'private',
  });
  const burgFined = applyCourtOutcome(
    { ...corpTreasurer, crime: { ...createEmptyCrimeState(), pendingCase: burgFinedCase } },
    burgFinedCase,
    'public_defender',
    'fined',
  );
  assert(
    burgFined.ok &&
      burgFined.character.career.currentJob !== null &&
      (burgFined.restitutionImposed ?? 0) >= 750 &&
      burgFined.restitutionPaid === 0 &&
      burgFined.unpaidRestitutionAdded === burgFined.restitutionImposed &&
      burgFined.character.crime?.unpaidRestitution === burgFined.restitutionImposed &&
      burgFined.character.cash === 1200 - burgFined.finePaid &&
      burgFined.character.bankBalance === 18000 &&
      burgFined.character.business?.treasury === 85000,
    'Approach B collects fine from personal cash only, keeps restitution in unpaidRestitution, preserves Accountant on burglary fine, and never touches bankBalance or corporate treasury',
  );

  const partialRestitutionPay = payUnpaidRestitution(burgFined.character, 300);
  assert(
    partialRestitutionPay.ok &&
      partialRestitutionPay.paidAmount === 300 &&
      partialRestitutionPay.character.cash === burgFined.character.cash - 300 &&
      partialRestitutionPay.character.bankBalance === 18000 &&
      partialRestitutionPay.character.business?.treasury === 85000 &&
      partialRestitutionPay.remainingUnpaidRestitution === (burgFined.restitutionImposed ?? 0) - 300,
    'payUnpaidRestitution deducts personal cash only while keeping bankBalance and corporate treasury untouched',
  );

  // Juvenile Approach B zero-debt rule
  const juvChar = makeCharacter({
    age: 15,
    cash: 100,
    bankBalance: 500,
    career: createInitialCareerState(),
  });
  const juvFinedCase = makePendingCase({
    id: 'case-p3-juv-fine',
    crimeId: 'vandalism',
    title: 'Vandalism',
    tier: 'petty',
    offenseClass: 'misdemeanor',
    jurisdiction: 'juvenile',
    arrestedAtAge: 15,
    baseFine: 400,
    baseSentenceYears: 0,
    exposure: 'witness_known',
  });
  const juvRes = applyCourtOutcome(juvChar, juvFinedCase, 'public_defender', 'fined');
  assert(
    juvRes.ok &&
      juvRes.character.crime?.unpaidRestitution === 0 &&
      juvRes.character.crime?.unpaidFines === 0 &&
      juvRes.unpaidRestitutionAdded === 0,
    'Juvenile sentencing keeps unpaidFines and unpaidRestitution strictly at $0',
  );

  // 4. Business Continuity & Forced Liquidation Safeguards (Corporate debt first + equityPct entitlement + single credit)
  const delegatedChar = makeCharacter({
    id: 'p3-delegated-prison',
    cash: 500,
    business: makeTestBusiness({
      treasury: 40000,
      managementCapability: 'delegated_management',
      loanGuaranteeType: 'corporate_only',
      outstandingLoan: 15000,
    }),
  });
  const robCase = makePendingCase({
    id: 'case-p3-delegated-rob',
    crimeId: 'robbery',
    title: 'Armed Robbery',
    tier: 'high_stakes',
    offenseClass: 'felony',
    baseFine: 2000,
    baseSentenceYears: 3,
    exposure: 'publicly_reported',
  });
  const delegatedPrisonRes = applyCourtOutcome(delegatedChar, robCase, 'public_defender', 'imprisoned');
  assert(
    delegatedPrisonRes.ok &&
      delegatedPrisonRes.businessDisposition === 'delegated_continued' &&
      delegatedPrisonRes.character.business !== null &&
      delegatedPrisonRes.character.business !== undefined &&
      delegatedPrisonRes.character.business?.treasury === 40000 &&
      delegatedPrisonRes.character.business?.loanGuaranteeType === 'corporate_only',
    'Delegated management business survives owner imprisonment with corporate treasury & corporate_only debt intact',
  );

  const partialEquityOwner = makeCharacter({
    id: 'p3-partial-equity',
    cash: 100,
    business: makeTestBusiness({
      treasury: 50000,
      valuation: 50000, // 50000 + 50000*0.2 - 20000 = 40000 net * 50% equity = $20,000
      equityPct: 50,
      outstandingLoan: 20000,
      loanGuaranteeType: 'personally_guaranteed',
      managementCapability: 'owner_operated',
    }),
  });
  const ownerOpCase = makePendingCase({
    id: 'case-p3-owner-op',
    crimeId: 'robbery',
    title: 'Armed Robbery',
    tier: 'high_stakes',
    offenseClass: 'felony',
    baseFine: 1000,
    baseSentenceYears: 2,
    exposure: 'publicly_reported',
  });
  const liquidatedRes = applyCourtOutcome(partialEquityOwner, ownerOpCase, 'public_defender', 'imprisoned');
  assert(
    liquidatedRes.ok &&
      liquidatedRes.businessDisposition === 'liquidated' &&
      liquidatedRes.character.business === null &&
      liquidatedRes.prisonConsequences?.businessLiquidationProceeds === 20000 &&
      liquidatedRes.character.cash === 100 + 20000 - liquidatedRes.finePaid &&
      liquidatedRes.character.crime?.prison?.originCaseId === ownerOpCase.id &&
      liquidatedRes.record?.sentenceStatus === 'active',
    'Forced liquidation settles corporate debt before distributing 50% equity entitlement once and links originCaseId',
  );

  // 5. Probation Revocation Flag & Violation Counter
  const probChar = makeCharacter({
    id: 'p3-prob-rev',
    crime: {
      ...createEmptyCrimeState(),
      probation: {
        chargeTitle: 'Burglary',
        jurisdiction: 'adult',
        yearsRemaining: 2,
        startedAtAge: 25,
        lastProgressedAge: null,
        activeTerms: [
          {
            recordId: 'prior-prob-rec',
            chargeTitle: 'Burglary',
            jurisdiction: 'adult',
            yearsRemaining: 2,
            startedAtAge: 25,
            communityServiceHoursRemaining: 16,
            technicalWarnings: 0,
            violationCount: 0,
          },
        ],
      },
    },
  });
  assert(isOnProbation(probChar), 'Active probation detected');
  const secondOffenseCase = makePendingCase({
    id: 'case-p3-revocation',
    crimeId: 'vehicle_theft',
    title: 'Vehicle Theft',
    offenseClass: 'felony',
    offendedOnProbation: true,
    exposure: 'witness_known',
  });
  const revConviction = applyCourtOutcome(probChar, secondOffenseCase, 'public_defender', 'probation');
  assert(
    revConviction.ok &&
      revConviction.probationViolated === true &&
      (revConviction.character.crime?.probation?.violationCount ?? 0) === 1 &&
      revConviction.character.crime?.probation?.activeTerms?.length === 2,
    'Conviction while on probation increments violationCount and preserves both activeTerms entries',
  );
  const serviceRes = performProbationAction(revConviction.character, 'community_service');
  assert(
    serviceRes.ok &&
      serviceRes.hoursCompleted === 8 &&
      serviceRes.character.crime?.probation?.activeTerms?.[0].communityServiceHoursRemaining === 8,
    'performProbationAction completes 8 community service hours cleanly on earliest term',
  );
}

testPerRecordLegalStatusAndLegacySanitization();
testEvidenceBasedExposureSeparation();
testSeparatedVictimRestitutionAndStateForfeiture();
testEmploymentAndBusinessEvaluators();
testEducationStatsAndProbationModifiers();
testLegacyLoanGuaranteeAndUnderwritingDTI();
testMalformedSaveSanitizationAndJsonRoundTrip();
testLegalStatusPrisonOriginAndIncompleteServiceBoundary();
testAdditionalEvaluatorAndUnderwritingBoundaries();
testPhase2EducationCrimeIntegration();
testPhase3LifecycleIntegrationAndSafeguards();
console.log('crimeConsequences.test.ts passed all assertions');
