import type { CharacterProfile, LifeEvent } from '../../../types/game';
import { calculatePlayerNetWorth } from '../../assets/services/assetService';
import type { OwnedProperty } from '../../assets/types';
import { exitBusiness, foundBusiness } from '../../business/services/businessService';
import type { ActiveBusinessProfile } from '../../business/types';
import type { CrimeRecordEntry } from '../../crime/types';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import {
  buildIdentityReadModel,
  IDENTITY_TIMELINE_HIGHLIGHT_LIMIT,
  selectBusinessSummary,
  selectCareerSummary,
  selectEducationSummary,
  selectFinancialSummary,
  selectIdentityCore,
  selectLegalStanding,
  selectLifeStageForAge,
  selectTimelineHighlights,
} from '../services/identitySelectors';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

function makeBaseCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_identity_1',
    firstName: 'Aria',
    lastName: 'lin',
    gender: 'female',
    age: 26,
    birthYear: 2000,
    country: 'Canada',
    flag: '🇨🇦',
    city: 'Toronto',
    occupation: 'Software Engineer',
    cash: 25000,
    bankBalance: 15000,
    netWorth: 40000,
    isAlive: true,
    stats: {
      health: 85,
      happiness: 80,
      smarts: 90,
      looks: 75,
      karma: 80,
    },
    parents: {
      father: {
        id: 'dad_1',
        role: 'father',
        firstName: 'David',
        lastName: 'Lin',
        age: 56,
        occupation: 'Accountant',
        isAlive: true,
        relationship: 85,
        generosity: 70,
      },
      mother: {
        id: 'mom_1',
        role: 'mother',
        firstName: 'Mei',
        lastName: 'Lin',
        age: 54,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 90,
        generosity: 80,
      },
      wealth: 'comfortable',
    },
    siblings: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    relationships: [],
    seenEventIds: [],
    timeline: [],
    ...overrides,
  };
}

function makeCrimeEntry(overrides: Partial<CrimeRecordEntry> = {}): CrimeRecordEntry {
  return {
    id: 'crime_rec_1',
    crimeId: 'shoplifting',
    title: 'Boutique Shoplifting',
    tier: 'petty',
    offenseClass: 'misdemeanor',
    jurisdiction: 'adult',
    age: 20,
    year: 2020,
    executionSucceeded: true,
    detected: true,
    injured: false,
    outcome: 'fined',
    attemptedPayout: 400,
    payout: 0,
    fineImposed: 600,
    finePaid: 600,
    attorneyFeePaid: 0,
    sentenceYears: 0,
    sealed: false,
    expunged: false,
    ...overrides,
  };
}

// 1. Identity & life-stage boundaries
{
  const boundaryCases: Array<[number, string | null]> = [
    [-5, null],
    [-1, null],
    [-0.1, null],
    [NaN, null],
    [Infinity, null],
    [-Infinity, null],
    [0, 'childhood'],
    [12, 'childhood'],
    [13, 'teens'],
    [17, 'teens'],
    [18, 'adulthood'],
    [39, 'adulthood'],
    [40, 'middle_age'],
    [64, 'middle_age'],
    [65, 'old_age'],
    [120, 'old_age'],
  ];
  for (const [age, expected] of boundaryCases) {
    assert(
      selectLifeStageForAge(age) === expected,
      `Expected age ${age} -> ${expected}, got ${selectLifeStageForAge(age)}`
    );
  }

  const infant = makeBaseCharacter({
    age: 0,
    occupation: 'Infant',
    cash: 0,
    bankBalance: 0,
    netWorth: 0,
    flag: undefined,
  });
  const infantCore = selectIdentityCore(infant);
  assert(infantCore.age === 0 && infantCore.ageValid === true, 'Age 0 is valid');
  assert(infantCore.lifeStage === 'childhood', 'Age 0 is childhood');
  assert(infantCore.birthplace.city === 'Toronto', 'Birthplace city preserved');
  assert(infantCore.birthplace.country === 'Canada', 'Birthplace country preserved');
  assert(infantCore.birthplace.flag === null, 'Missing optional flag returns null');

  for (const invalidAge of [-3, NaN, Infinity, -Infinity]) {
    const invalidCore = selectIdentityCore(makeBaseCharacter({ age: invalidAge }));
    assert(
      invalidCore.ageValid === false && invalidCore.lifeStage === null,
      `Invalid age ${String(invalidAge)} must produce ageValid=false and lifeStage=null`
    );
  }

  const malformedCore = selectIdentityCore({
    ...makeBaseCharacter(),
    age: -3,
    gender: 'other' as never,
    city: '   ',
    country: undefined as never,
    occupation: '',
    parents: {} as never,
  });
  assert(malformedCore.ageValid === false && malformedCore.age === 0, 'Negative age clamped safely');
  assert(malformedCore.lifeStage === null, 'Invalid age must not be classified as childhood');
  assert(malformedCore.gender === 'unknown', 'Invalid gender becomes unknown');
  assert(malformedCore.birthplace.city === null && malformedCore.birthplace.country === null, 'Blank birthplace cleared to null');
  assert(malformedCore.familyWealth === null, 'Missing family wealth returns null');
}

// 3. Financial summary: alignment with calculatePlayerNetWorth, business exclusion, and NaN guards
{
  const validProp: OwnedProperty = {
    id: 'prop_1',
    catalogId: 'condo_houston_bay',
    type: 'condo',
    name: 'Houston Bay Condo',
    city: 'Houston',
    purchasePrice: 200000,
    purchaseAge: 24,
    marketValue: 250000,
    mortgage: {
      originalPrincipal: 160000,
      principal: 140000,
      annualInterestRate: 0.04,
      annualPrincipalPayment: 5000,
    },
  };
  const business: ActiveBusinessProfile = {
    id: 'biz_1',
    templateId: 'saas_studio',
    name: 'NorthStar Cloud',
    slogan: 'Scale smart',
    sector: 'software_tech',
    icon: '💻',
    foundedYear: 2023,
    foundedAge: 23,
    equityPct: 60,
    treasury: 300000,
    valuation: 2000000,
    pricing: 'standard',
    marketing: 'moderate',
    payroll: 'standard',
    rnd: 'balanced',
    ownerSalary: 80000,
    dividendRatePct: 10,
    morale: 85,
    brandReputation: 80,
    qualityScore: 90,
    employeeCount: 12,
    locationsCount: 2,
    equipmentTier: 1,
    hasAuditCompleted: true,
    actionCooldowns: {},
    outstandingLoan: 0,
    annualLoanPayment: 0,
    yearsInOperation: 3,
    lifetimeRevenue: 950000,
    lifetimeProfit: 220000,
    isPubliclyTraded: true,
    tickerSymbol: 'NSTR',
  };

  const richChar = makeBaseCharacter({
    cash: 50000,
    bankBalance: 30000,
    assets: { properties: [validProp, { bad: true }] },
    business,
    education: { ...createInitialEducation(), studentDebt: 15000 },
  });
  const fin = selectFinancialSummary(richChar);
  const authoritative = calculatePlayerNetWorth(richChar);
  // 50000 + 30000 + 250000 - 140000 - 15000 = 175000 (business 2M excluded!)
  assert(fin.personalNetWorth === authoritative && fin.personalNetWorth === 175000, 'Matches calculatePlayerNetWorth exactly without business valuation');
  assert(fin.cash === 50000 && fin.bankBalance === 30000, 'Cash and bank balance preserved separately');
  assert(fin.realEstateCount === 1 && fin.realEstateValue === 250000 && fin.realEstateMortgageDebt === 140000, 'Valid real estate summed and malformed entries ignored');
  assert(fin.activeBusinessValuation === 2000000, 'Business valuation tracked separately');
  assert(fin.activeBusinessOwnershipPct === 60 && fin.activeBusinessOwnershipStakeValue === 1200000, 'Business ownership stake tracked separately');
  assert(fin.hasMalformedNumericFields === false, 'Clean numeric fields not flagged malformed');

  // Negative personal net worth even with billion-dollar business
  const indebtedChar = makeBaseCharacter({
    cash: 1000,
    bankBalance: 0,
    education: { ...createInitialEducation(), studentDebt: 85000 },
    business: { ...business, valuation: 10_000_000, equityPct: 100 },
  });
  const indebtedFin = selectFinancialSummary(indebtedChar);
  assert(indebtedFin.personalNetWorth === -84000, 'Negative personal net worth preserved independently of business value');

  // Non-finite values & missing assets
  const brokenFinChar = makeBaseCharacter({
    cash: NaN,
    bankBalance: Infinity,
    netWorth: -Infinity,
    assets: undefined,
    business: { ...business, valuation: NaN, equityPct: 150 },
  });
  const brokenFin = selectFinancialSummary(brokenFinChar);
  assert(brokenFin.cash === 0 && brokenFin.bankBalance === 0, 'Non-finite cash/bank sanitized to 0');
  assert(brokenFin.personalNetWorth === calculatePlayerNetWorth(brokenFinChar), 'Matches calculatePlayerNetWorth under NaN inputs');
  assert(brokenFin.activeBusinessValuation === 0 && brokenFin.activeBusinessOwnershipPct === 100, 'Malformed business numbers clamped safely');
  assert(brokenFin.hasMalformedNumericFields === true, 'Malformed numeric fields detected');
}

// 4. Education and career records (complete, partial, missing)
{
  const missingEduCareer = selectEducationSummary({
    ...makeBaseCharacter(),
    education: undefined as never,
  });
  assert(missingEduCareer.hasData === false && missingEduCareer.currentStage === 'unavailable', 'Missing education handled safely');

  const partialEdu = selectEducationSummary(
    makeBaseCharacter({
      education: {
        ...createInitialEducation(),
        currentStage: 'university',
        schoolName: 'University of Toronto',
        gradeLevelLabel: 'Year 2',
        grades: 88,
        diplomas: ['High School Diploma', '   ', 42 as never],
        history: [
          {
            id: 'h1',
            stage: 'high_school',
            stageLabel: 'High School',
            schoolName: 'Northern Secondary',
            startAge: 14,
            endAge: 18,
            finalGrades: 91,
            status: 'graduated',
          },
          { bad: 'history' } as never,
        ],
        university: {
          universityName: 'University of Toronto',
          majorId: 'cs',
          majorName: 'Computer Science',
          degreeTitle: 'B.S. in Computer Science',
          year: 2,
          totalYears: 4,
          fundingType: 'student_loan',
          tuitionPerYear: 12000,
        },
        studentDebt: 24000,
      },
    })
  );
  assert(partialEdu.hasData === true && partialEdu.diplomas.length === 1 && partialEdu.diplomas[0] === 'High School Diploma', 'Valid diplomas kept, non-strings filtered');
  assert(partialEdu.history.length === 1 && partialEdu.activeUniversity?.majorName === 'Computer Science', 'Valid school history & university preserved');
  assert(partialEdu.studentDebt === 24000, 'Student debt preserved');

  const fullCareer = selectCareerSummary(
    makeBaseCharacter({
      career: {
        ...createInitialCareerState(),
        currentJob: {
          jobId: 'dev_senior',
          title: 'Senior Developer',
          companyName: 'Maple Tech',
          field: 'technology',
          type: 'full_time',
          salary: 120000,
          yearsInJob: 4,
          performance: 92,
          hiredAge: 22,
          icon: '💻',
        },
        history: [
          {
            id: 'ch_1',
            jobId: 'barista',
            title: 'Barista',
            companyName: 'Bean Co',
            type: 'part_time',
            startAge: 16,
            endAge: 18,
            finalSalary: 18000,
            reasonForLeaving: 'resigned',
          },
        ],
        totalCareerEarnings: 420000,
      },
    })
  );
  assert(fullCareer.employmentStatus === 'employed', 'Active job yields employed status');
  assert(fullCareer.currentJob?.companyName === 'Maple Tech' && fullCareer.history.length === 1, 'Active & historical jobs preserved');
  assert(fullCareer.totalCareerEarnings === 420000, 'Lifetime earnings preserved');

  const missingCareer = selectCareerSummary({
    ...makeBaseCharacter({ occupation: 'Retired' }),
    career: undefined as never,
  });
  assert(missingCareer.hasData === false && missingCareer.employmentStatus === 'retired' && missingCareer.totalCareerEarnings === null, 'Missing career preserves occupation & unknown earnings cleanly');
}

// 5. Business exits: genuine timeline exits vs false positives & malformed entries
{
  const started = foundBusiness(
    makeBaseCharacter({ age: 25, cash: 50000 }),
    {
      templateId: 'biz_coffee_shop',
      customName: 'Oak & Thyme',
      icon: '☕',
      fundingMethod: 'bootstrapped',
    }
  );
  const acquired = exitBusiness(started.business, started.character, 'acquisition').character;
  const distractorEvents: LifeEvent[] = [
    {
      id: 'prop_sale',
      age: 26,
      year: 2026,
      title: 'Sold Maple House',
      message: 'You sold Maple House for $300,000 before a $9,000 fee.',
      category: 'money',
    },
    {
      id: 'guitar_sale',
      age: 27,
      year: 2027,
      title: 'Sold Acoustic Guitar',
      message: 'You sold the Acoustic Guitar for $200.',
      category: 'money',
    },
    {
      id: 'liq_genuine',
      age: 30,
      year: 2030,
      title: 'Liquidated Pixel Forge',
      message: 'You liquidated Pixel Forge, paying off outstanding creditors and retrieving $4,000 in remaining net assets.',
      category: 'business',
    },
    { id: 'bad_1', age: NaN, year: 2030, title: 'Sold Fake!', message: 'private equity firm', category: 'money' },
    'corrupted' as unknown as LifeEvent,
  ];
  const bizChar = {
    ...acquired,
    timeline: [...acquired.timeline, ...distractorEvents],
  };
  const bizSummary = selectBusinessSummary(bizChar);
  assert(bizSummary.activeBusiness === null, 'Exited business cleared activeBusiness');
  assert(bizSummary.timelineDerivedExits.length === 2, `Expected exactly 2 real business exits, got ${bizSummary.timelineDerivedExits.length}`);
  assert(bizSummary.timelineDerivedExits[0].exitType === 'acquisition' && bizSummary.timelineDerivedExits[0].businessName === 'Oak & Thyme', 'Acquisition matched accurately');
  assert(bizSummary.timelineDerivedExits[1].exitType === 'liquidation' && bizSummary.timelineDerivedExits[1].businessName === 'Pixel Forge', 'Liquidation matched accurately');
  assert(bizSummary.timelineDerivedExits.every((e) => e.source === 'timeline_derived'), 'Exits flagged timeline_derived');

  const noExitChar = makeBaseCharacter({ timeline: [distractorEvents[0], distractorEvents[1]] });
  const noExitSummary = selectBusinessSummary(noExitChar);
  assert(noExitSummary.hasAnyRecord === false && noExitSummary.timelineDerivedExits.length === 0, 'Asset/possession sales never fabricated into business exits');
}

// 6. Legal privacy: all 9 states + leakage guarantees
{
  const warningOnly = makeBaseCharacter({
    crime: {
      policeHeat: 10,
      notoriety: 0,
      unpaidFines: 0,
      attemptsThisYear: 0,
      attemptCountLifetime: 1,
      lastAttemptAge: 14,
      lastProgressedAge: null,
      pendingCase: null,
      prison: null,
      probation: null,
      records: [makeCrimeEntry({ id: 'w1', jurisdiction: 'juvenile', outcome: 'warned', age: 14 })],
    },
  });
  const warningLegal = selectLegalStanding(warningOnly);
  assert(warningLegal.hasNoActivePublicCriminalRecord === true, 'Juvenile warning alone preserves clean public criminal record');
  assert(warningLegal.juvenileWarningCount === 1 && warningLegal.activeAdultConvictions.length === 0, 'Warning counted separately, not as conviction');

  const unsealedJuv = makeBaseCharacter({
    crime: {
      policeHeat: 15,
      notoriety: 5,
      unpaidFines: 0,
      attemptsThisYear: 0,
      attemptCountLifetime: 1,
      lastAttemptAge: 16,
      lastProgressedAge: null,
      pendingCase: null,
      prison: null,
      probation: null,
      records: [
        makeCrimeEntry({
          id: 'j1',
          jurisdiction: 'juvenile',
          outcome: 'probation',
          title: 'Secret Youth Vandalism',
          age: 16,
          sealed: false,
        }),
      ],
    },
  });
  const unsealedJuvLegal = selectLegalStanding(unsealedJuv);
  assert(unsealedJuvLegal.hasNoActivePublicCriminalRecord === false, 'Must NOT claim clean public record when unsealed juvenile adjudication exists');
  assert(unsealedJuvLegal.activeAdultConvictions.length === 0 && unsealedJuvLegal.unsealedJuvenileAdjudications.length === 1, 'Distinguishes juvenile adjudication from adult conviction');

  const sealedAndExpunged = makeBaseCharacter({
    age: 30,
    crime: {
      policeHeat: 0,
      notoriety: 0,
      unpaidFines: 0,
      attemptsThisYear: 0,
      attemptCountLifetime: 5,
      lastAttemptAge: 22,
      lastProgressedAge: 30,
      pendingCase: null,
      prison: null,
      probation: null,
      records: [
        makeCrimeEntry({
          id: 'sealed_juv_id',
          crimeId: 'vandalism',
          title: 'HIDDEN_SEALED_OFFENSE_XYZ',
          jurisdiction: 'juvenile',
          outcome: 'imprisoned',
          sealed: true,
        }),
        makeCrimeEntry({
          id: 'sealed_warn_id',
          crimeId: 'shoplifting',
          title: 'HIDDEN_SEALED_WARNING_XYZ',
          jurisdiction: 'juvenile',
          outcome: 'warned',
          sealed: true,
        }),
        makeCrimeEntry({
          id: 'expunged_adult_id',
          crimeId: 'fraud_scam',
          title: 'HIDDEN_EXPUNGED_OFFENSE_XYZ',
          jurisdiction: 'adult',
          offenseClass: 'felony',
          outcome: 'fined',
          expunged: true,
        }),
        makeCrimeEntry({
          id: 'undetected_id',
          crimeId: 'bank_heist',
          title: 'HIDDEN_UNDETECTED_HEIST_XYZ',
          jurisdiction: 'adult',
          outcome: 'undetected',
          detected: false,
        }),
        makeCrimeEntry({
          id: 'aborted_id',
          crimeId: 'robbery',
          title: 'HIDDEN_ABORTED_ROBBERY_XYZ',
          jurisdiction: 'adult',
          outcome: 'aborted',
          detected: false,
        }),
      ],
    },
  });
  const confidentialLegal = selectLegalStanding(sealedAndExpunged);
  const serialized = JSON.stringify(confidentialLegal);
  assert(confidentialLegal.hasNoActivePublicCriminalRecord === true, 'Sealed/expunged/undetected/aborted leaves public record clean');
  assert(confidentialLegal.hasSealedJuvenileRecords === true, 'Indicates confidential sealed status without details');
  assert(confidentialLegal.juvenileWarningCount === 0, 'Sealed juvenile warnings do not surface');
  assert(!serialized.includes('HIDDEN_SEALED_OFFENSE_XYZ'), 'Sealed juvenile offense title leaked');
  assert(!serialized.includes('HIDDEN_EXPUNGED_OFFENSE_XYZ'), 'Expunged offense title leaked');
  assert(!serialized.includes('HIDDEN_UNDETECTED_HEIST_XYZ'), 'Undetected offense leaked');
  assert(!serialized.includes('HIDDEN_ABORTED_ROBBERY_XYZ'), 'Aborted offense leaked');
  assert(!serialized.includes('vandalism') && !serialized.includes('fraud_scam'), 'CrimeIds must not leak');

  const complexLegalChar = makeBaseCharacter({
    age: 29,
    crime: {
      policeHeat: 60,
      notoriety: 40,
      unpaidFines: 2500,
      attemptsThisYear: 1,
      attemptCountLifetime: 4,
      lastAttemptAge: 29,
      lastProgressedAge: 29,
      pendingCase: {
        id: 'pc_1',
        crimeId: 'burglary',
        title: 'Commercial Burglary',
        tier: 'mid',
        offenseClass: 'felony',
        jurisdiction: 'adult',
        arrestedAtAge: 29,
        arrestedAtYear: 2029,
        executionSucceeded: false,
        injured: false,
        attemptedPayout: 3000,
        baseFine: 4000,
        baseSentenceYears: 3,
      },
      prison: {
        facilityName: 'State Penitentiary',
        securityLevel: 'medium',
        chargeTitle: 'Grand Auto Theft',
        yearsTotal: 4,
        yearsServed: 1,
        yearsRemaining: 3,
        behaviorScore: 70,
        paroleEligibleAtServed: 2,
        actionsTakenThisYear: 0,
        lastActionAge: null,
        lastProgressedAge: 29,
      },
      probation: {
        chargeTitle: 'Prior Misdemeanor',
        jurisdiction: 'adult',
        yearsRemaining: 1,
        startedAtAge: 28,
        lastProgressedAge: 28,
      },
      records: [
        makeCrimeEntry({ id: 'ad_1', title: 'Grand Auto Theft', offenseClass: 'felony', outcome: 'imprisoned' }),
        makeCrimeEntry({ id: 'dis_1', title: 'Street Disturbance', outcome: 'dismissed' }),
        makeCrimeEntry({ id: 'acq_1', title: 'Alleged Trespass', outcome: 'acquitted' }),
      ],
    },
  });
  const complexLegal = selectLegalStanding(complexLegalChar);
  assert(complexLegal.custody.isIncarcerated && complexLegal.custody.facilityName === 'State Penitentiary', 'Custody extracted');
  assert(complexLegal.probation.isOnProbation && complexLegal.probation.yearsRemaining === 1, 'Probation extracted');
  assert(complexLegal.obligations.hasPendingCourtCase && complexLegal.obligations.unpaidFines === 2500, 'Pending case & fines separated');
  assert(complexLegal.activeAdultConvictions.length === 1, 'Only true adult conviction counted in activeAdultConvictions');
  assert(complexLegal.nonConvictionDispositions.length === 2 && complexLegal.nonConvictionDispositions.every((d) => d.isConviction === false), 'Dismissed & acquitted tracked as non-convictions');
}

// 7. Timeline bounding, deceased character, & deep immutability
{
  const giantTimeline: LifeEvent[] = Array.from({ length: 2500 }, (_, i) => ({
    id: `ev_${i}`,
    age: Math.floor(i / 25),
    year: 2000 + Math.floor(i / 25),
    title: `Milestone ${i}`,
    message: `Event number ${i}`,
    category: i % 5 === 0 ? 'milestone' : 'social',
  }));
  const deceasedChar = makeBaseCharacter({
    age: 84,
    isAlive: false,
    causeOfDeath: 'Passed away peacefully of old age',
    occupation: 'Retired',
    timeline: giantTimeline,
    worldState: { schemaVersion: 2 } as never,
  });
  deepFreeze(deceasedChar);
  const snapshotBefore = JSON.stringify(deceasedChar);

  const model = buildIdentityReadModel(deceasedChar);
  const hl = selectTimelineHighlights(deceasedChar);
  assert(model.core.isAlive === false && model.core.causeOfDeath === 'Passed away peacefully of old age', 'Deceased metadata read accurately');
  assert(model.core.lifeStage === 'old_age', 'Age 84 maps to old_age');
  assert(model.career.employmentStatus === 'deceased', 'Deceased character employmentStatus is deceased');
  assert(hl.highlights.length === IDENTITY_TIMELINE_HIGHLIGHT_LIMIT, 'Timeline highlights strictly bounded');
  assert(JSON.stringify(deceasedChar) === snapshotBefore, 'Zero mutation on frozen character');
}

console.log('✅ identitySelectors tests passed!');
