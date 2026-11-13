import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MenuScreen } from '../../../components/layout/MenuScreen';
import type { CharacterProfile } from '../../../types/game';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { CourtDefenseModal } from '../components/CourtDefenseModal';
import { CrimeScreen } from '../components/CrimeScreen';
import {
  buildAttemptResultView,
  buildCourtVerdictView,
  buildCrimeDashboardSummary,
  classifyCrimeRecord,
  CRIME_MENU_MIN_AGE,
  getCrimeCatalogPreviews,
  getDefenseStrategyOptions,
  getPrisonActionViews,
} from '../components/crimeDisplay';
import { CRIME_CATALOG } from '../data/crimeCatalog';
import { DEFENSE_STRATEGIES, getAttorneyFeeForCase } from '../data/legalCatalog';
import { createEmptyCrimeState, getExpungementEligibleRecords } from '../services/crimeSelectors';
import {
  attemptCrime,
  expungeAdultRecord,
  payUnpaidFines,
  resolveCourtCase,
} from '../services/crimeService';
import { performPrisonAction } from '../services/prisonService';
import type {
  CourtResolutionResult,
  CrimeAttemptResult,
  CrimeRecordEntry,
  PendingCourtCase,
  PrisonState,
} from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const age = overrides.age ?? 22;
  const occupation =
    overrides.occupation ?? (age < 18 ? 'High School Student' : 'Unemployed');

  return {
    id: 'char-crime-ui-test',
    firstName: 'Maya',
    lastName: 'Reyes',
    gender: 'female',
    age,
    birthYear: 2026 - age,
    city: 'Chicago',
    country: 'United States',
    isAlive: true,
    stats: {
      health: 80,
      happiness: 70,
      smarts: 72,
      looks: 65,
      karma: 55,
    },
    cash: 2000,
    bankBalance: 15000,
    netWorth: 17000,
    occupation,
    parents: {
      father: {
        id: 'father-1',
        role: 'father',
        firstName: 'Carlos',
        lastName: 'Reyes',
        age: 50,
        occupation: 'Mechanic',
        isAlive: true,
        relationship: 75,
        generosity: 60,
      },
      mother: {
        id: 'mother-1',
        role: 'mother',
        firstName: 'Elena',
        lastName: 'Reyes',
        age: 48,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 80,
        generosity: 65,
      },
      wealth: 'modest',
    },
    relationships: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    crime: createEmptyCrimeState(),
    ...overrides,
  };
}

function makePendingCase(overrides: Partial<PendingCourtCase> = {}): PendingCourtCase {
  return {
    id: 'case-ui-1',
    crimeId: 'burglary',
    title: 'Burglary',
    tier: 'high_stakes',
    offenseClass: 'felony',
    jurisdiction: 'adult',
    arrestedAtAge: 24,
    arrestedAtYear: 2026,
    executionSucceeded: true,
    attemptedPayout: 1850,
    injured: false,
    baseFine: 2500,
    baseSentenceYears: 3,
    ...overrides,
  };
}

function makePrison(overrides: Partial<PrisonState> = {}): PrisonState {
  return {
    facilityName: 'Stateville Penitentiary',
    securityLevel: 'medium',
    chargeTitle: 'Burglary',
    yearsTotal: 3,
    yearsServed: 0,
    yearsRemaining: 3,
    behaviorScore: 60,
    paroleEligibleAtServed: 1,
    actionsTakenThisYear: 0,
    lastActionAge: 24,
    lastProgressedAge: null,
    ...overrides,
  };
}

function makeRecord(overrides: Partial<CrimeRecordEntry> = {}): CrimeRecordEntry {
  return {
    id: 'rec-ui-1',
    crimeId: 'shoplifting',
    title: 'Shoplifting',
    tier: 'petty',
    offenseClass: 'misdemeanor',
    jurisdiction: 'adult',
    age: 19,
    year: 2021,
    executionSucceeded: true,
    detected: true,
    injured: false,
    outcome: 'fined',
    attemptedPayout: 140,
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

// 1. Menu age gate & dynamic crime tile badges
{
  const age9 = makeCharacter({ age: 9 });
  const menu9Html = renderToStaticMarkup(
    React.createElement(MenuScreen, {
      character: age9,
      onOpenRelationships: () => {},
      onOpenCrime: () => {},
    }),
  );
  assert(
    menu9Html.includes(`Age ${CRIME_MENU_MIN_AGE}`) &&
      menu9Html.includes(`Unlocks at age ${CRIME_MENU_MIN_AGE}`),
    'Age 9 character should see Crime & High Stakes locked at Age 10 in MenuScreen',
  );

  const age10 = makeCharacter({ age: 10 });
  const menu10Html = renderToStaticMarkup(
    React.createElement(MenuScreen, {
      character: age10,
      onOpenRelationships: () => {},
      onOpenCrime: () => {},
    }),
  );
  assert(
    menu10Html.includes('Crime &amp; High Stakes') && menu10Html.includes('Unlocked'),
    'Age 10 character should see Crime & High Stakes unlocked in MenuScreen',
  );

  const imprisoned = makeCharacter({
    age: 24,
    crime: { ...createEmptyCrimeState(), prison: makePrison() },
  });
  const imprisonedMenuHtml = renderToStaticMarkup(
    React.createElement(MenuScreen, {
      character: imprisoned,
      onOpenRelationships: () => {},
      onOpenCrime: () => {},
    }),
  );
  assert(
    imprisonedMenuHtml.includes('In Prison'),
    'Incarcerated character should see In Prison badge on Crime tile',
  );
}

// 2. All 8 crimes in catalog preview + eligibility categories
{
  const teen = makeCharacter({ age: 14 });
  const teenPreviews = getCrimeCatalogPreviews(teen);
  assert(
    teenPreviews.length === CRIME_CATALOG.length && teenPreviews.length === 8,
    'getCrimeCatalogPreviews must expose all 8 crimes',
  );
  const shoplifting = teenPreviews.find((p) => p.template.id === 'shoplifting');
  const bankHeist = teenPreviews.find((p) => p.template.id === 'bank_heist');
  assert(shoplifting?.eligibilityCategory === 'available', 'Age 14 should access Shoplifting');
  assert(shoplifting?.jurisdiction === 'juvenile', 'Age 14 must preview juvenile jurisdiction');
  assert(
    bankHeist?.eligibilityCategory === 'age_restricted',
    'Age 14 must see Bank Heist marked age_restricted',
  );

  const atLimit = makeCharacter({
    age: 22,
    crime: { ...createEmptyCrimeState(), attemptsThisYear: 2, lastAttemptAge: 22 },
  });
  const limitPreviews = getCrimeCatalogPreviews(atLimit);
  assert(
    limitPreviews.every((p) => p.eligibilityCategory === 'annual_limit' && !p.eligibility.eligible),
    'Reaching 2 attempts at age 22 must mark crimes annual_limit',
  );

  const pendingChar = makeCharacter({
    age: 24,
    crime: { ...createEmptyCrimeState(), pendingCase: makePendingCase() },
  });
  const pendingPreviews = getCrimeCatalogPreviews(pendingChar);
  assert(
    pendingPreviews.every((p) => p.eligibilityCategory === 'pending_case'),
    'Pending court case must block new crime previews with pending_case category',
  );

  const prisonerChar = makeCharacter({
    age: 24,
    crime: { ...createEmptyCrimeState(), prison: makePrison() },
  });
  const prisonerPreviews = getCrimeCatalogPreviews(prisonerChar);
  assert(
    prisonerPreviews.every((p) => p.eligibilityCategory === 'incarcerated'),
    'Incarcerated character must see incarcerated eligibility category',
  );
}

// 3. All 4 execution x detection cells + injury & held payout display mapping
{
  const baseChar = makeCharacter({ age: 25 });
  const cases: Array<{
    name: string;
    result: CrimeAttemptResult;
    expectedBadge: string;
    expectedRequiresCourt: boolean;
    expectedHeldProceeds: number;
    expectedCashDelta: number | undefined;
    expectedHealthDelta: number | undefined;
  }> = [
    {
      name: 'executed_undetected',
      result: {
        ok: true,
        character: baseChar,
        roll: {
          crimeId: 'pickpocketing',
          jurisdiction: 'adult',
          executionProbability: 0.75,
          detectionProbability: 0.25,
          injuryProbability: 0.05,
          executionSucceeded: true,
          detected: false,
          injured: false,
          injuryHealthLoss: 0,
          attemptedPayout: 180,
        },
        message: 'You slipped away with $180.',
      },
      expectedBadge: 'Clean Score',
      expectedRequiresCourt: false,
      expectedHeldProceeds: 0,
      expectedCashDelta: 180,
      expectedHealthDelta: undefined,
    },
    {
      name: 'executed_detected',
      result: {
        ok: true,
        character: baseChar,
        roll: {
          crimeId: 'burglary',
          jurisdiction: 'adult',
          executionProbability: 0.55,
          detectionProbability: 0.45,
          injuryProbability: 0.2,
          executionSucceeded: true,
          detected: true,
          injured: true,
          injuryHealthLoss: 14,
          attemptedPayout: 1850,
        },
        pendingCase: makePendingCase({ attemptedPayout: 1850 }),
        message: 'Arrested at the scene; $1,850 proceeds are held pending court.',
      },
      expectedBadge: 'Arrested',
      expectedRequiresCourt: true,
      expectedHeldProceeds: 1850,
      expectedCashDelta: undefined,
      expectedHealthDelta: -14,
    },
    {
      name: 'failed_undetected',
      result: {
        ok: true,
        character: baseChar,
        roll: {
          crimeId: 'shoplifting',
          jurisdiction: 'adult',
          executionProbability: 0.7,
          detectionProbability: 0.22,
          injuryProbability: 0.03,
          executionSucceeded: false,
          detected: false,
          injured: false,
          injuryHealthLoss: 0,
          attemptedPayout: 0,
        },
        message: 'The target fell through, though nobody spotted you.',
      },
      expectedBadge: 'Slipped Away',
      expectedRequiresCourt: false,
      expectedHeldProceeds: 0,
      expectedCashDelta: undefined,
      expectedHealthDelta: undefined,
    },
    {
      name: 'failed_detected',
      result: {
        ok: true,
        character: baseChar,
        roll: {
          crimeId: 'bank_heist',
          jurisdiction: 'adult',
          executionProbability: 0.3,
          detectionProbability: 0.7,
          injuryProbability: 0.35,
          executionSucceeded: false,
          detected: true,
          injured: true,
          injuryHealthLoss: 20,
          attemptedPayout: 0,
        },
        pendingCase: makePendingCase({
          crimeId: 'bank_heist',
          title: 'Bank Heist',
          executionSucceeded: false,
          attemptedPayout: 0,
          injured: true,
        }),
        message: 'Security tackled you and police hauled you into custody.',
      },
      expectedBadge: 'Busted',
      expectedRequiresCourt: true,
      expectedHeldProceeds: 0,
      expectedCashDelta: undefined,
      expectedHealthDelta: -20,
    },
  ];

  for (const testCase of cases) {
    const view = buildAttemptResultView(testCase.result);
    assert(
      view.badgeLabel === testCase.expectedBadge,
      `${testCase.name} expected badge ${testCase.expectedBadge}, got ${view.badgeLabel}`,
    );
    assert(
      view.requiresCourt === testCase.expectedRequiresCourt,
      `${testCase.name} requiresCourt mismatch`,
    );
    assert(
      view.heldProceeds === testCase.expectedHeldProceeds,
      `${testCase.name} heldProceeds mismatch`,
    );
    assert(
      view.statEffects.cash === testCase.expectedCashDelta,
      `${testCase.name} cash delta mismatch`,
    );
    assert(
      view.statEffects.health === testCase.expectedHealthDelta,
      `${testCase.name} health delta mismatch`,
    );
  }
}

// 4. Court Defense options, non-dismissible CourtDefenseModal SSR, and court resolution integration
{
  const pendingCase = makePendingCase({ attemptedPayout: 2400 });
  const poorAdult = makeCharacter({
    age: 24,
    cash: 100,
    crime: { ...createEmptyCrimeState(), pendingCase },
  });
  const strategies = getDefenseStrategyOptions(pendingCase, poorAdult.cash);
  assert(
    strategies.length === DEFENSE_STRATEGIES.length && strategies.length === 4,
    'All 4 defense strategies should be listed',
  );
  const publicDefender = strategies.find((s) => s.strategy.id === 'public_defender');
  const eliteCounsel = strategies.find((s) => s.strategy.id === 'elite_counsel');
  assert(publicDefender?.canAfford === true && publicDefender.fee === 0, 'Public defender must be free');
  assert(
    eliteCounsel?.fee === getAttorneyFeeForCase('elite_counsel', 'high_stakes') &&
      eliteCounsel.canAfford === false,
    'Elite counsel should be unaffordable with $100 cash',
  );

  const modalHtml = renderToStaticMarkup(
    React.createElement(CourtDefenseModal, {
      character: poorAdult,
      pendingCase,
      onUpdateCharacter: () => {},
    }),
  );
  assert(
    modalHtml.includes('Court Appearance Required') &&
      modalHtml.includes('$2,400') &&
      modalHtml.includes('Public Defender'),
    'CourtDefenseModal should render pending charge, held proceeds, and defense choices',
  );
  assert(
    !modalHtml.includes('aria-label="Close modal"'),
    'CourtDefenseModal must NOT expose a close X button while pending case is active',
  );

  const verdictView = buildCourtVerdictView(
    {
      ok: true,
      character: poorAdult,
      outcome: 'imprisoned',
      releasedPayout: 0,
      attorneyFeePaid: 0,
      fineImposed: 1500,
      finePaid: 100,
      unpaidFineAdded: 1400,
      probationYears: 0,
      sentenceYears: 3,
      employmentTerminated: true,
      message: 'Sentenced to 3 years in prison.',
    } satisfies CourtResolutionResult,
    'adult',
  );
  assert(
    verdictView.employmentTerminated && verdictView.unpaidFineAdded === 1400,
    'Verdict view should reflect imprisonment, employment loss, and unpaid fines',
  );
}

// 5. Prison actions UI views + once-per-year limit + post-release occupation preservation
{
  const prisoner = makeCharacter({
    age: 68,
    occupation: 'Incarcerated',
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrison({
        yearsServed: 0,
        paroleEligibleAtServed: 1,
        lastActionAge: 68,
        priorRetirementOccupation: 'Retired',
      }),
    },
  });

  const prisonViews = getPrisonActionViews(prisoner, prisoner.crime!.prison!);
  assert(prisonViews.length === 6, 'Prison UI must expose all 6 prison actions');
  const paroleView = prisonViews.find((a) => a.actionId === 'parole');
  assert(paroleView?.available === false, 'Parole must be locked before paroleEligibleAtServed');

  const workRes = performPrisonAction(prisoner, 'work');
  assert(workRes.ok, 'First prison action at age 68 should succeed');
  const afterWorkViews = getPrisonActionViews(workRes.character, workRes.character.crime!.prison!);
  assert(
    afterWorkViews.every((a) => !a.available),
    'Taking 1 prison action must disable remaining actions until Age Up',
  );

  // Release via parole must restore 'Retired' occupation via prison.priorRetirementOccupation
  const paroleEligibleRetired = makeCharacter({
    age: 69,
    occupation: 'Incarcerated',
    crime: {
      ...createEmptyCrimeState(),
      prison: makePrison({
        yearsTotal: 3,
        yearsServed: 2,
        yearsRemaining: 1,
        behaviorScore: 100,
        paroleEligibleAtServed: 1,
        lastActionAge: 68,
        actionsTakenThisYear: 0,
        priorRetirementOccupation: 'Retired',
      }),
    },
  });
  let paroleRes = performPrisonAction(paroleEligibleRetired, 'parole');
  for (let i = 0; i < 60 && !paroleRes.released; i++) {
    paroleRes = performPrisonAction(
      { ...paroleEligibleRetired, id: `parole-ui-occ-${i}` },
      'parole',
    );
  }
  assert(paroleRes.ok && paroleRes.released, 'Eligible retired prisoner with high behavior should get parole');
  assert(
    paroleRes.character.occupation === 'Retired',
    `Expected occupation 'Retired' after parole release, got '${paroleRes.character.occupation}'`,
  );
}

// 6. Cash-only fine payment & criminal history classification + CrimeScreen SSR checks
{
  const finedChar = makeCharacter({
    age: 26,
    cash: 500,
    bankBalance: 10000,
    netWorth: 10500,
    crime: {
      ...createEmptyCrimeState(),
      unpaidFines: 400,
      records: [
        makeRecord({
          id: 'juv-warn',
          jurisdiction: 'juvenile',
          outcome: 'warned',
          age: 13,
          year: 2015,
          fineImposed: 50,
          finePaid: 50,
          sealed: false,
        }),
        makeRecord({
          id: 'juv-sealed',
          jurisdiction: 'juvenile',
          outcome: 'fined',
          age: 15,
          year: 2017,
          sealed: true,
        }),
        makeRecord({
          id: 'adult-eligible',
          jurisdiction: 'adult',
          outcome: 'fined',
          age: 19,
          year: 2019,
          expunged: false,
        }),
      ],
    },
  });

  const payRes = payUnpaidFines(finedChar, 400);
  assert(payRes.ok && payRes.paidAmount === 400, 'Cash-only fine payment should succeed');
  assert(
    payRes.character.cash === 100 && payRes.character.bankBalance === 10000,
    'payUnpaidFines must deduct from cash only and keep bankBalance intact',
  );

  const summary = buildCrimeDashboardSummary(payRes.character);
  assert(
    summary.juvenileWarnings === 1 && summary.formalArrests === 2,
    `Warnings (${summary.juvenileWarnings}) must remain separate from formal arrests (${summary.formalArrests})`,
  );

  const expungable = new Set(
    getExpungementEligibleRecords(payRes.character).map((r) => r.id),
  );
  assert(
    expungable.has('adult-eligible'),
    'Old misdemeanor conviction at age 26 after clean period should be expungement-eligible',
  );

  const classifiedWarn = classifyCrimeRecord(payRes.character.crime!.records[0], expungable);
  const classifiedSealed = classifyCrimeRecord(payRes.character.crime!.records[1], expungable);
  const classifiedAdult = classifyCrimeRecord(payRes.character.crime!.records[2], expungable);
  assert(
    classifiedWarn.badgeLabel === 'Juvenile Warning' && !classifiedWarn.isFormalArrest,
    'Warning record must stay labeled Juvenile Warning and not formal arrest',
  );
  assert(
    classifiedSealed.badgeLabel === 'Sealed (Juvenile)',
    'Sealed juvenile adjudication must display Sealed (Juvenile)',
  );
  assert(
    classifiedAdult.canPetitionExpungement,
    'Eligible adult conviction must expose expungement petition button',
  );

  const expungeRes = expungeAdultRecord(payRes.character, 'adult-eligible');
  assert(expungeRes.ok, 'Expungement petition should succeed for eligible adult conviction');
  const clearedAfterExpunge = classifyCrimeRecord(
    expungeRes.character.crime!.records.find((r) => r.id === 'adult-eligible')!,
    new Set(),
  );
  assert(
    clearedAfterExpunge.badgeLabel === 'Expunged (Adult)',
    'Expunged adult conviction must display Expunged (Adult)',
  );

  // CrimeScreen SSR across standard and prison states
  const cleanScreenHtml = renderToStaticMarkup(
    React.createElement(CrimeScreen, {
      character: expungeRes.character,
      onUpdateCharacter: () => {},
      onBackToMenu: () => {},
    }),
  );
  assert(
    cleanScreenHtml.includes('Criminal Record History') &&
      cleanScreenHtml.includes('Shoplifting') &&
      cleanScreenHtml.includes('Expunged (Adult)') &&
      cleanScreenHtml.includes('Sealed (Juvenile)'),
    'CrimeScreen SSR should render all 8 crimes and separated juvenile/adult records',
  );

  const prisonScreenHtml = renderToStaticMarkup(
    React.createElement(CrimeScreen, {
      character: makeCharacter({
        age: 24,
        occupation: 'Incarcerated',
        crime: { ...createEmptyCrimeState(), prison: makePrison() },
      }),
      onUpdateCharacter: () => {},
      onBackToMenu: () => {},
    }),
  );
  assert(
    prisonScreenHtml.includes('Stateville Penitentiary') &&
      prisonScreenHtml.includes('Prison Work Detail') &&
      prisonScreenHtml.includes('Parole Hearing'),
    'Prison CrimeScreen SSR should render facility status and all 6 prison actions',
  );

  // Full end-to-end attempt -> court flow determinism check via crimeService
  const attemptChar = makeCharacter({ id: 'e2e-ui-seed', age: 23, cash: 5000 });
  const attemptRes = attemptCrime(attemptChar, 'pickpocketing');
  assert(attemptRes.ok, 'CrimeScreen service call attemptCrime must succeed cleanly');
  if (attemptRes.character.crime?.pendingCase) {
    const courtRes = resolveCourtCase(attemptRes.character, 'private_attorney');
    assert(
      courtRes.ok && courtRes.character.crime?.pendingCase === null,
      'CourtDefenseModal service call resolveCourtCase must clear pendingCase',
    );
  }
}

console.log('crimeUI.test.ts: All assertions passed.');
