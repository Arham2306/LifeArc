import type { CharacterProfile } from '../../../types/game';
import { ageUpCharacter } from '../../aging/services/agingService';
import { calculatePlayerNetWorth } from '../../assets/services/assetService';
import { migrateToCanonicalWorldState } from '../../autonomy/services/migrationService';
import { progressBusinessForYear } from '../../business/services/businessService';
import type { ActiveBusinessProfile } from '../../business/types';
import { createInitialCareerState, evaluateJobEligibility } from '../../career/services/careerService';
import { JOB_CATALOG } from '../../career/data/jobCatalog';
import { createInitialEducation } from '../../education/services/educationService';
import { reproductionService } from '../../romance/services/reproductionService';
import { resolveCourtCase } from '../services/crimeService';
import {
  calculateAnnualGarnishment,
  progressCrimeForYear,
} from '../services/crimeYearService';
import {
  createEmptyCrimeState,
  isCurrentlyIncarcerated,
} from '../services/crimeSelectors';
import type { CrimeRecordEntry, PrisonState, ProbationState } from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function makeRecord(overrides: Partial<CrimeRecordEntry> = {}): CrimeRecordEntry {
  return {
    id: 'rec-yr-1',
    crimeId: 'shoplifting',
    title: 'Shoplifting',
    tier: 'petty',
    offenseClass: 'misdemeanor',
    jurisdiction: 'juvenile',
    age: 15,
    year: 2015,
    executionSucceeded: true,
    detected: true,
    injured: false,
    outcome: 'fined',
    attemptedPayout: 40,
    payout: 0,
    fineImposed: 40,
    finePaid: 40,
    attorneyFeePaid: 0,
    sentenceYears: 0,
    sealed: false,
    expunged: false,
    ...overrides,
  };
}

function createBaseCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-crime-year-1',
    firstName: 'Riley',
    lastName: 'Vance',
    gender: 'female',
    country: 'United States',
    city: 'Boston',
    occupation: 'Unemployed',
    birthYear: 2000,
    age: 17,
    isAlive: true,
    cash: 2500,
    bankBalance: 10000,
    netWorth: 12500,
    stats: {
      health: 80,
      happiness: 75,
      smarts: 70,
      looks: 65,
      karma: 65,
    },
    parents: {
      father: {
        id: 'dad-cy',
        role: 'father',
        firstName: 'Mark',
        lastName: 'Vance',
        age: 48,
        occupation: 'Architect',
        isAlive: true,
        relationship: 75,
        generosity: 65,
      },
      mother: {
        id: 'mom-cy',
        role: 'mother',
        firstName: 'Claire',
        lastName: 'Vance',
        age: 46,
        occupation: 'Designer',
        isAlive: true,
        relationship: 80,
        generosity: 70,
      },
      wealth: 'comfortable',
    },
    education: createInitialEducation(),
    career: createInitialCareerState(),
    relationships: [],
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function testProbationProgressionAndJuvenilePreservationAt18() {
  const juvProb: ProbationState = {
    chargeTitle: 'Pickpocketing',
    jurisdiction: 'juvenile',
    yearsRemaining: 2,
    startedAtAge: 17,
    lastProgressedAge: null,
  };
  const charAt17 = createBaseCharacter({
    age: 17,
    crime: {
      ...createEmptyCrimeState(),
      probation: juvProb,
      records: [
        makeRecord({ id: 'juv-prob-rec', age: 17, year: 2017, outcome: 'probation' }),
      ],
    },
  });

  // Age 17 -> 18: probation decrements to 1 AND remains juvenile!
  const step18 = progressCrimeForYear(charAt17, 18, {
    incomingCash: 0,
    postExpenseSpendableCash: 2500,
  });
  assert(
    step18.crime?.probation?.yearsRemaining === 1 &&
      step18.crime.probation.jurisdiction === 'juvenile',
    'Turning 18 decrements probation and strictly preserves juvenile jurisdiction',
  );
  assert(
    step18.sealedRecordIds.length === 0,
    'Active juvenile probation blocks sealing at age 18',
  );

  // Duplicate progression for age 18 must be a no-op
  const aged18Char = { ...charAt17, age: 18, crime: step18.crime };
  const dup18 = progressCrimeForYear(aged18Char, 18, {
    incomingCash: 0,
    postExpenseSpendableCash: 2500,
  });
  assert(
    dup18.crime?.probation?.yearsRemaining === 1,
    'Duplicate progressCrimeForYear call for same targetAge does not double-decrement probation',
  );

  // Age 18 -> 19: probation completes & clears, AND age-17 juvenile record (2 clean yrs) seals!
  const step19 = progressCrimeForYear(aged18Char, 19, {
    incomingCash: 0,
    postExpenseSpendableCash: 2500,
  });
  assert(
    step19.probationCompleted && step19.crime?.probation === null,
    'Probation completes cleanly when yearsRemaining reaches 0',
  );
  assert(
    step19.sealedRecordIds.length === 1 &&
      step19.crime?.records[0].sealed === true &&
      step19.crime?.records[0].expunged === false,
    'Juvenile record seals at age 19 with sealed: true and expunged: false',
  );
}

function testJuvenileSealingBoundariesAndAdultExclusion() {
  const juvenileOld = makeRecord({
    id: 'juv-14',
    jurisdiction: 'juvenile',
    age: 14,
    year: 2014,
    outcome: 'fined',
  });
  const juvenileRecent = makeRecord({
    id: 'juv-17',
    jurisdiction: 'juvenile',
    age: 17,
    year: 2017,
    outcome: 'warned',
  });
  const adultConviction = makeRecord({
    id: 'adult-18',
    jurisdiction: 'adult',
    age: 18,
    year: 2018,
    outcome: 'fined',
  });

  // Under 18 -> never seals
  const char16 = createBaseCharacter({
    age: 16,
    crime: { ...createEmptyCrimeState(), records: [juvenileOld] },
  });
  assert(
    progressCrimeForYear(char16, 17, { incomingCash: 0, postExpenseSpendableCash: 1000 })
      .sealedRecordIds.length === 0,
    'Under-18 records are never auto-sealed',
  );

  // At 18 with recent offense at 17 (< 2 years clean) -> blocked
  const charWithRecent = createBaseCharacter({
    age: 17,
    crime: {
      ...createEmptyCrimeState(),
      records: [juvenileOld, juvenileRecent, adultConviction],
    },
  });
  const step18 = progressCrimeForYear(charWithRecent, 18, {
    incomingCash: 0,
    postExpenseSpendableCash: 1000,
  });
  assert(step18.sealedRecordIds.length === 0, 'Recent offense within 2 years blocks sealing');

  // Even at 20 once clean, ONLY juvenile records are sealed; adult conviction remains sealed: false
  const charAt19 = { ...charWithRecent, age: 19, crime: { ...charWithRecent.crime!, lastProgressedAge: null } };
  const step20 = progressCrimeForYear(charAt19, 20, {
    incomingCash: 0,
    postExpenseSpendableCash: 1000,
  });
  const sealedIds = step20.sealedRecordIds;
  assert(
    sealedIds.includes('juv-14') &&
      sealedIds.includes('juv-17') &&
      !sealedIds.includes('adult-18'),
    'Seals only juvenile records; adult convictions never sealed',
  );
  const adultAfter = step20.crime?.records.find((r) => r.id === 'adult-18');
  assert(
    adultAfter?.sealed === false && adultAfter?.expunged === false,
    'Adult record retains sealed: false, expunged: false',
  );
}

function testFineGarnishmentCapsAndZeroEdgeCases() {
  // 25% of $10,000 incomingCash = $2,500; spendable = $5,000; debt = $4,000 -> $2,500
  assert(calculateAnnualGarnishment(4000, 10000, 5000) === 2500, '25% incomingCash cap');
  // Spendable cash $600 < 25% ($2,500) -> $600
  assert(calculateAnnualGarnishment(4000, 10000, 600) === 600, 'Spendable cash cap');
  // Zero income -> $0
  assert(calculateAnnualGarnishment(4000, 0, 5000) === 0, 'Zero incomingCash gives $0 garnishment');
  // Remaining debt $900 < $2,500 -> $900
  assert(calculateAnnualGarnishment(900, 10000, 5000) === 900, 'Never exceeds remaining unpaidFines');
}

function testAgeUpIntegrationDuringIncarcerationAndRelease() {
  const prison: PrisonState = {
    facilityName: 'Ridgefield Correctional Facility',
    securityLevel: 'medium',
    chargeTitle: 'Burglary',
    yearsTotal: 2,
    yearsServed: 0,
    yearsRemaining: 2,
    behaviorScore: 60,
    paroleEligibleAtServed: 1,
    actionsTakenThisYear: 0,
    lastActionAge: null,
    lastProgressedAge: null,
  };

  const activeBiz: ActiveBusinessProfile = {
    id: 'biz-1',
    templateId: 'coffee_shop',
    name: 'Morning Brew LLC',
    sector: 'food_hospitality',
    icon: '☕',
    foundedAge: 22,
    foundedYear: 2022,
    treasury: 50000,
    valuation: 180000,
    equityPct: 100,
    pricing: 'standard',
    marketing: 'organic',
    payroll: 'standard',
    rnd: 'balanced',
    ownerSalary: 40000,
    dividendRatePct: 50,
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
    isPubliclyTraded: false,
  };

  const incarceratedChar = createBaseCharacter({
    age: 25,
    cash: 5000,
    bankBalance: 15000,
    netWorth: 20000,
    occupation: 'Incarcerated',
    education: {
      ...createInitialEducation(),
      currentStage: 'university',
      schoolName: 'Boston State University',
      yearInStage: 1,
      totalYearsInStage: 4,
      grades: 75,
      popularity: 60,
    },
    // Attach job & business to explicitly prove Age Up suppresses BOTH salaries/payouts while incarcerated
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'swe_1',
        title: 'Software Engineer',
        companyName: 'Beacon Tech',
        field: 'technology',
        type: 'full_time',
        salary: 80000,
        yearsInJob: 2,
        performance: 80,
        hiredAge: 23,
        icon: '💻',
      },
    },
    business: activeBiz,
    assets: {
      properties: [
        {
          id: 'prop-1',
          catalogId: 'studio_austin_loft',
          type: 'studio',
          name: 'Austin Loft Studio',
          city: 'Austin',
          purchasePrice: 62000,
          purchaseAge: 23,
          marketValue: 65000,
          mortgage: null,
        },
      ],
    },
    pets: {
      animals: [
        {
          id: 'pet-1',
          name: 'Miso',
          species: 'pet_cat',
          temperament: 'steady',
          petAge: 2,
          adoptedAtAge: 24,
          health: 90,
          attachment: 70,
          lastFedAge: null,
          lastPlayedAge: null,
          lastVetAge: null,
          lastMoment: 'Adopted',
          status: 'living',
        },
      ],
    },
    healthcare: {
      conditions: [],
      visits: [],
    },
    crime: {
      ...createEmptyCrimeState(),
      unpaidFines: 1000,
      prison,
      records: [
        makeRecord({
          id: 'rec-imprisoned-25',
          crimeId: 'burglary',
          title: 'Burglary',
          tier: 'mid',
          offenseClass: 'felony',
          jurisdiction: 'adult',
          age: 25,
          year: 2025,
          outcome: 'imprisoned',
          sentenceYears: 2,
        }),
      ],
    },
  });

  // Attach initial NPC autonomy worldState so we verify it advances cleanly
  const withWorld = migrateToCanonicalWorldState(incarceratedChar);
  const startYear = withWorld.worldState!.lastSimulatedYear;

  const year1Aged = ageUpCharacter(withWorld);
  assert(year1Aged.age === 26, 'Incarcerated character continues aging up');
  assert(isCurrentlyIncarcerated(year1Aged), 'Still incarcerated with 1 year left');
  assert(year1Aged.crime?.prison?.yearsServed === 1 && year1Aged.crime.prison.yearsRemaining === 1, 'Served 1 of 2 years');
  assert(year1Aged.occupation === 'Incarcerated', 'Occupation stays Incarcerated');
  assert(year1Aged.education.yearInStage === 1, 'Education progression suppressed while incarcerated');
  assert(year1Aged.cash <= 5000, 'Career salary and business payouts suppressed (cash did not jump from income)');
  assert(year1Aged.bankBalance === 15000, 'Bank balance untouched');
  const agedProp = (year1Aged.assets?.properties[0] ?? null) as { marketValue: number } | null;
  assert(
    (agedProp?.marketValue ?? 0) > 65000,
    'Properties continue annual appreciation/expenses while incarcerated',
  );
  const agedPet = (year1Aged.pets?.animals[0] ?? null) as { petAge: number } | null;
  assert(
    agedPet?.petAge === 3,
    'Pets continue annual progression while incarcerated',
  );
  assert(
    year1Aged.healthcare?.lastProgressedAge === 25,
    'Healthcare continues annual progression while incarcerated',
  );
  assert(
    year1Aged.worldState?.lastSimulatedYear === startYear + 1,
    'NPC Autonomy advances cleanly alongside incarceration',
  );
  assert(
    year1Aged.netWorth === calculatePlayerNetWorth(year1Aged),
    'Net worth accurately stamped after annual expenses + crime progression',
  );

  // Advance year 2 (age 26 -> 27): sentence completes & releases player cleanly
  const year2Aged = ageUpCharacter(year1Aged);
  assert(year2Aged.age === 27, 'Aged to 27');
  assert(!isCurrentlyIncarcerated(year2Aged), 'Released from prison at completion');
  assert(year2Aged.occupation !== 'Incarcerated', 'Occupation transitions out of Incarcerated on release');
  assert(
    year2Aged.crime?.records.length === 1 && year2Aged.crime.records[0].outcome === 'imprisoned',
    'Prison sentence completion preserves historical conviction record',
  );

  // Garnishment double-deduction & single cash path check during employed Year After Release:
  const postReleaseEmployed: CharacterProfile = {
    ...year2Aged,
    cash: 2000,
    bankBalance: 10000,
    business: undefined,
    assets: undefined,
    pets: undefined,
    healthcare: undefined,
    crime: {
      ...year2Aged.crime!,
      unpaidFines: 4000,
    },
  };
  const postGarnishAged = ageUpCharacter(postReleaseEmployed);
  // incomingCash = career 80000 * 0.78 = 62400 -> 25% cap = 15600 > 4000 unpaidFines -> garnishes full 4000 once
  const expectedNetSalary = Math.round(80000 * 0.78);
  assert(postGarnishAged.crime?.unpaidFines === 0, 'All $4,000 unpaidFines garnished cleanly once');
  assert(
    postGarnishAged.cash === 2000 + expectedNetSalary - 4000,
    'Exact single cash delta (salary minus single $4,000 garnishment)',
  );

  // Mortality check works during incarceration if health hits 0
  const dyingInmate = createBaseCharacter({
    age: 84,
    stats: { health: 2, happiness: 30, smarts: 50, looks: 50, karma: 40 },
    crime: { ...createEmptyCrimeState(), prison },
  });
  const afterHealthDrop = ageUpCharacter(dyingInmate);
  assert(afterHealthDrop.isAlive === false, 'Mortality remains functional during incarceration');
}

function testNarrowRestrictionsAcrossCareerBusinessAndAdoption() {
  const nonSensitiveTechJob =
    JOB_CATALOG.find((j) => j.field === 'trades_services' && j.credentialTier === 'open_entry') ??
    JOB_CATALOG.find((j) => j.field === 'hospitality_retail' && j.credentialTier === 'open_entry')!;
  const sensitiveFinanceJob =
    JOB_CATALOG.find((j) => j.field === 'business_finance' && j.credentialTier === 'open_entry') ??
    JOB_CATALOG.find((j) => j.field === 'law_government')!;
  assert(nonSensitiveTechJob && sensitiveFinanceJob, 'Baseline job catalog lookups');

  // Character with an active adult felony at age 25 with college degree
  const felonyBase = createBaseCharacter({
    age: 25,
    cash: 10000,
    education: {
      ...createInitialEducation(),
      currentStage: 'graduated',
      diplomas: ['High School Diploma', 'B.S. in Computer Science', 'B.S. in Finance', 'B.A. in Political Science'],
    },
    crime: {
      ...createEmptyCrimeState(),
      records: [
        makeRecord({
          id: 'felony-block',
          crimeId: 'fraud_scam',
          title: 'Financial Scam',
          tier: 'mid',
          offenseClass: 'felony',
          jurisdiction: 'adult',
          age: 23,
          outcome: 'fined',
        }),
      ],
    },
  });

  // Non-sensitive career stays eligible; sensitive career (business_finance/law_government) is restricted
  const openCheck = evaluateJobEligibility(felonyBase, nonSensitiveTechJob);
  assert(openCheck.isAdmissible, 'Adult felony does NOT impose blanket employment ban on non-sensitive fields');

  const sensitiveJob = {
    ...nonSensitiveTechJob,
    id: 'test-finance-role',
    title: 'Financial Analyst',
    field: 'business_finance' as const,
  };
  const financeCheck = evaluateJobEligibility(felonyBase, sensitiveJob);
  assert(!financeCheck.isAdmissible, 'Unexpunged adult conviction restricts sensitive field');

  // Sealed juvenile record / warning / acquittal must NOT block even sensitive fields
  const cleanJuvAndAcquitted = {
    ...felonyBase,
    crime: {
      ...createEmptyCrimeState(),
      records: [
        makeRecord({ id: 'j-warn', jurisdiction: 'juvenile', age: 15, outcome: 'warned' }),
        makeRecord({ id: 'j-seal', jurisdiction: 'juvenile', offenseClass: 'felony', age: 16, outcome: 'fined', sealed: true }),
        makeRecord({ id: 'a-acq', jurisdiction: 'adult', offenseClass: 'felony', age: 22, outcome: 'acquitted' }),
      ],
    },
  };
  assert(
    evaluateJobEligibility(cleanJuvAndAcquitted, sensitiveJob).isAdmissible,
    'Juvenile warning, sealed juvenile record, and acquittal do not block employment',
  );

  // Adoption blocked ONLY when incarcerated; allowed on probation & with non-incarcerated felony
  const adoptWithFelony = reproductionService.executeAdoption(felonyBase, 'infant');
  assert(adoptWithFelony.success, 'Non-incarcerated adult felony does NOT block adoption');

  const adoptOnProbation = reproductionService.executeAdoption(
    {
      ...felonyBase,
      crime: {
        ...felonyBase.crime!,
        probation: {
          chargeTitle: 'Financial Scam',
          jurisdiction: 'adult',
          yearsRemaining: 2,
          startedAtAge: 24,
          lastProgressedAge: null,
        },
      },
    },
    'infant',
  );
  assert(adoptOnProbation.success, 'Probation does NOT block adoption');

  const adoptWhileIncarcerated = reproductionService.executeAdoption(
    {
      ...felonyBase,
      crime: {
        ...felonyBase.crime!,
        prison: {
          facilityName: 'Cedar Creek Minimum Security Camp',
          securityLevel: 'minimum',
          chargeTitle: 'Financial Scam',
          yearsTotal: 2,
          yearsServed: 0,
          yearsRemaining: 2,
          behaviorScore: 55,
          paroleEligibleAtServed: 1,
          actionsTakenThisYear: 0,
          lastActionAge: null,
          lastProgressedAge: null,
        },
      },
    },
    'infant',
  );
  assert(!adoptWhileIncarcerated.success, 'Active incarceration blocks adoption');

  // Direct progressBusinessForYear suppresses payouts during incarceration
  const suppressedBiz = progressBusinessForYear(
    {
      id: 'b-sup',
      templateId: 'coffee_shop',
      name: 'Locked Brew',
      sector: 'food_hospitality',
      icon: '☕',
      foundedAge: 22,
      foundedYear: 2022,
      treasury: 20000,
      valuation: 100000,
      equityPct: 100,
      pricing: 'standard',
      marketing: 'organic',
      payroll: 'standard',
      rnd: 'balanced',
      ownerSalary: 50000,
      dividendRatePct: 50,
      morale: 75,
      brandReputation: 70,
      qualityScore: 70,
      employeeCount: 3,
      locationsCount: 1,
      equipmentTier: 0,
      hasAuditCompleted: false,
      actionCooldowns: {},
      outstandingLoan: 0,
      annualLoanPayment: 0,
      yearsInOperation: 2,
      lifetimeRevenue: 100000,
      lifetimeProfit: 20000,
      isPubliclyTraded: false,
    },
    {
      ...felonyBase,
      crime: {
        ...createEmptyCrimeState(),
        prison: {
          facilityName: 'Cedar Creek Minimum Security Camp',
          securityLevel: 'minimum',
          chargeTitle: 'Burglary',
          yearsTotal: 2,
          yearsServed: 0,
          yearsRemaining: 2,
          behaviorScore: 55,
          paroleEligibleAtServed: 1,
          actionsTakenThisYear: 0,
          lastActionAge: null,
          lastProgressedAge: null,
        },
      },
    },
    26,
  );
  assert(
    suppressedBiz.netPayoutToPlayer === 0 && suppressedBiz.business?.treasury === 20000,
    'Business payout suppressed during incarceration',
  );
}

function makeOneYearPrison(overrides: Partial<PrisonState> = {}): PrisonState {
  return {
    facilityName: 'Cedar Creek Minimum Security Camp',
    securityLevel: 'minimum',
    chargeTitle: 'Burglary',
    yearsTotal: 1,
    yearsServed: 0,
    yearsRemaining: 1,
    behaviorScore: 60,
    paroleEligibleAtServed: 1,
    actionsTakenThisYear: 0,
    lastActionAge: null,
    lastProgressedAge: null,
    ...overrides,
  };
}

function sentenceToPrisonViaCourt(base: CharacterProfile): CharacterProfile {
  for (let i = 0; i < 120; i++) {
    const withCase: CharacterProfile = {
      ...base,
      id: `court-ret-${i}`,
      crime: {
        ...createEmptyCrimeState(),
        ...base.crime,
        pendingCase: {
          id: `case-ret-${i}`,
          crimeId: 'robbery',
          title: 'Armed Robbery',
          tier: 'high_stakes',
          offenseClass: 'felony',
          jurisdiction: 'adult',
          arrestedAtAge: base.age,
          arrestedAtYear: base.birthYear + base.age,
          executionSucceeded: true,
          injured: false,
          attemptedPayout: 4000,
          baseFine: 2000,
          baseSentenceYears: 2,
        },
      },
    };
    const res = resolveCourtCase(withCase, 'public_defender');
    if (res.ok && res.outcome === 'imprisoned') {
      return res.character;
    }
  }
  throw new Error('Expected deterministic court seed producing imprisonment');
}

function testPostReleaseOccupationRestoration() {
  // 1. Under-18 High School Dropout released via Age Up remains High School Dropout
  const dropoutInmate = createBaseCharacter({
    age: 16,
    occupation: 'Incarcerated',
    education: {
      ...createInitialEducation(),
      currentStage: 'dropped_out',
      schoolName: null,
      gradeLevelLabel: 'High School Dropout',
      history: [
        {
          id: 'hist-hs-drop',
          stage: 'high_school',
          stageLabel: 'High School',
          schoolName: 'Boston High School',
          startAge: 14,
          endAge: 15,
          finalGrades: 62,
          status: 'dropped_out',
        },
      ],
    },
    crime: { ...createEmptyCrimeState(), prison: makeOneYearPrison() },
  });
  const dropoutReleased = ageUpCharacter(dropoutInmate);
  assert(!isCurrentlyIncarcerated(dropoutReleased), 'Dropout released after 1-year sentence');
  assert(
    dropoutReleased.occupation === 'High School Dropout',
    'Under-18 High School Dropout restores High School Dropout after release (does not revert to High School Student)',
  );
  assert(
    dropoutReleased.education.currentStage === 'dropped_out' &&
      dropoutReleased.education.history.length === 1,
    'Education dropout stage and history remain intact on release',
  );

  // 2a. Retired character (normal career retirement -> sentenced via court -> released via Age Up)
  const careerRetired = createBaseCharacter({
    age: 66,
    occupation: 'Retired',
    education: { ...createInitialEducation(), currentStage: 'graduated' },
    career: {
      ...createInitialCareerState(),
      currentJob: null,
      history: [
        {
          id: 'hist-ret-1',
          jobId: 'acct_1',
          title: 'Accountant',
          companyName: 'Beacon Ledger',
          type: 'full_time',
          startAge: 40,
          endAge: 65,
          finalSalary: 95000,
          reasonForLeaving: 'retired',
        },
      ],
    },
  });
  const imprisonedRetiree = sentenceToPrisonViaCourt(careerRetired);
  assert(
    imprisonedRetiree.occupation === 'Incarcerated' &&
      imprisonedRetiree.crime?.prison?.priorRetirementOccupation === 'Retired',
    'Court sentencing preserves Retired fallback on PrisonState when occupation becomes Incarcerated',
  );
  let agedRetiree: CharacterProfile = {
    ...imprisonedRetiree,
    crime: {
      ...imprisonedRetiree.crime!,
      prison: { ...imprisonedRetiree.crime!.prison!, yearsRemaining: 1 },
    },
  };
  agedRetiree = ageUpCharacter(agedRetiree);
  assert(!isCurrentlyIncarcerated(agedRetiree), 'Retired prisoner released on sentence completion');
  assert(
    agedRetiree.occupation === 'Retired',
    'Retired character retains Retired occupation after release',
  );
  assert(
    agedRetiree.career.history[0]?.reasonForLeaving === 'retired',
    'Career retirement history remains intact after release',
  );

  // 2b. Retired Entrepreneur (acquired business exit -> sentenced via court -> released via Age Up)
  const entrepreneurRetired = createBaseCharacter({
    age: 52,
    occupation: 'Retired Entrepreneur',
    education: { ...createInitialEducation(), currentStage: 'graduated' },
  });
  const imprisonedEntrepreneur = sentenceToPrisonViaCourt(entrepreneurRetired);
  assert(
    imprisonedEntrepreneur.crime?.prison?.priorRetirementOccupation === 'Retired Entrepreneur',
    'Court sentencing preserves Retired Entrepreneur status across Incarcerated occupation',
  );
  const releasedEntrepreneur = ageUpCharacter({
    ...imprisonedEntrepreneur,
    crime: {
      ...imprisonedEntrepreneur.crime!,
      prison: { ...imprisonedEntrepreneur.crime!.prison!, yearsRemaining: 1 },
    },
  });
  assert(
    releasedEntrepreneur.occupation === 'Retired Entrepreneur',
    'Retired Entrepreneur retains Retired Entrepreneur occupation after release',
  );

  // 2c. Previously retired worker who later took a new job loses retirement upon prison firing
  const rehiredThenImprisoned = sentenceToPrisonViaCourt({
    ...careerRetired,
    occupation: 'Consultant',
    career: {
      ...careerRetired.career,
      currentJob: {
        jobId: 'cons_1',
        title: 'Consultant',
        companyName: 'North Consulting',
        field: 'business_finance',
        type: 'full_time',
        salary: 70000,
        yearsInJob: 1,
        performance: 80,
        hiredAge: 66,
        icon: '💼',
      },
    },
  });
  const releasedExWorker = ageUpCharacter({
    ...rehiredThenImprisoned,
    crime: {
      ...rehiredThenImprisoned.crime!,
      prison: { ...rehiredThenImprisoned.crime!.prison!, yearsRemaining: 1 },
    },
  });
  assert(
    releasedExWorker.occupation === 'Unemployed',
    'Worker whose active job was terminated for prison releases as Unemployed even with older retirement in history',
  );

  // 3. Professional-school student (Medical School & Dental School) released via Age Up
  const medInmate = createBaseCharacter({
    age: 24,
    occupation: 'Incarcerated',
    education: {
      ...createInitialEducation(),
      currentStage: 'professional_school',
      schoolName: 'Harvard Medical School',
      studentDebt: 24000,
      professionalSchool: {
        schoolId: 'med_school',
        schoolName: 'Harvard Medical School',
        programName: 'Medical School',
        degreeAwarded: 'Doctor of Medicine (M.D.)',
        year: 1,
        totalYears: 4,
        fundingType: 'student_loan',
        tuitionPerYear: 24000,
      },
    },
    crime: { ...createEmptyCrimeState(), prison: makeOneYearPrison() },
  });
  const medReleased = ageUpCharacter(medInmate);
  assert(
    medReleased.occupation === 'Medical Student',
    'Medical School student restores Medical Student instead of Graduate Student after release',
  );
  assert(
    medReleased.education.studentDebt === 24000 &&
      medReleased.education.professionalSchool?.schoolName === 'Harvard Medical School',
    'Professional-school enrollment and student debt remain intact on release',
  );

  const dentalInmate = createBaseCharacter({
    age: 24,
    occupation: 'Incarcerated',
    education: {
      ...createInitialEducation(),
      currentStage: 'professional_school',
      schoolName: 'Tufts Dental School',
      professionalSchool: {
        schoolId: 'dental_school',
        schoolName: 'Tufts Dental School',
        programName: 'Dental School',
        degreeAwarded: 'Doctor of Dental Surgery (D.D.S.)',
        year: 2,
        totalYears: 4,
        fundingType: 'parents',
        tuitionPerYear: 22000,
      },
    },
    crime: { ...createEmptyCrimeState(), prison: makeOneYearPrison() },
  });
  const dentalReleased = ageUpCharacter(dentalInmate);
  assert(
    dentalReleased.occupation === 'Dental School Student',
    'Non-med/law/flight professional school restores <ProgramName> Student on release',
  );

  // 4. University student released via Age Up
  const uniInmate = createBaseCharacter({
    age: 19,
    occupation: 'Incarcerated',
    education: {
      ...createInitialEducation(),
      currentStage: 'university',
      schoolName: 'Boston State University',
      yearInStage: 2,
      totalYearsInStage: 4,
      studentDebt: 12000,
    },
    crime: { ...createEmptyCrimeState(), prison: makeOneYearPrison() },
  });
  const uniReleased = ageUpCharacter(uniInmate);
  assert(
    uniReleased.occupation === 'University Student',
    'University student restores University Student occupation on release',
  );
  assert(uniReleased.education.studentDebt === 12000, 'University debt intact on release');

  // 5. Active business owner (both private & IPO) during incarceration & after release
  const bizInmate = createBaseCharacter({
    age: 29,
    occupation: 'Incarcerated',
    education: { ...createInitialEducation(), currentStage: 'graduated' },
    business: {
      id: 'biz-occ-1',
      templateId: 'coffee_shop',
      name: 'Apex Roast',
      sector: 'food_hospitality',
      icon: '☕',
      foundedAge: 25,
      foundedYear: 2025,
      treasury: 30000,
      valuation: 120000,
      equityPct: 100,
      pricing: 'standard',
      marketing: 'organic',
      payroll: 'standard',
      rnd: 'balanced',
      ownerSalary: 35000,
      dividendRatePct: 25,
      morale: 75,
      brandReputation: 70,
      qualityScore: 72,
      employeeCount: 3,
      locationsCount: 1,
      equipmentTier: 0,
      hasAuditCompleted: false,
      actionCooldowns: {},
      outstandingLoan: 0,
      annualLoanPayment: 0,
      yearsInOperation: 4,
      lifetimeRevenue: 150000,
      lifetimeProfit: 40000,
      isPubliclyTraded: false,
    },
    crime: {
      ...createEmptyCrimeState(),
      prison: makeOneYearPrison({ yearsTotal: 2, yearsRemaining: 2 }),
    },
  });
  const bizStillServing = ageUpCharacter(bizInmate);
  assert(
    bizStillServing.occupation === 'Incarcerated' && bizStillServing.business?.id === 'biz-occ-1',
    'While still serving prison time, occupation remains Incarcerated and business ownership persists',
  );
  const bizReleased = ageUpCharacter(bizStillServing);
  assert(
    bizReleased.occupation === 'Founder & CEO (Apex Roast)',
    'After release, active business owner restores Founder & CEO occupation',
  );

  // 6. Released character with no employment, education, business, or retirement becomes Unemployed
  const unemployedInmate = createBaseCharacter({
    age: 29,
    occupation: 'Incarcerated',
    education: { ...createInitialEducation(), currentStage: 'graduated' },
    career: createInitialCareerState(),
    business: null,
    crime: { ...createEmptyCrimeState(), prison: makeOneYearPrison({ priorRetirementOccupation: null }) },
  });
  const unemployedReleased = ageUpCharacter(unemployedInmate);
  assert(
    unemployedReleased.occupation === 'Unemployed',
    'Released character without career/education/business/retirement resolves to Unemployed',
  );
}

testProbationProgressionAndJuvenilePreservationAt18();
testJuvenileSealingBoundariesAndAdultExclusion();
testFineGarnishmentCapsAndZeroEdgeCases();
testAgeUpIntegrationDuringIncarcerationAndRelease();
testNarrowRestrictionsAcrossCareerBusinessAndAdoption();
testPostReleaseOccupationRestoration();
console.log('crimeYear.test.ts passed all assertions');
