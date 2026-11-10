import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { getLifeStageForAge } from '../../../components/layout/ProfileDashboard';
import type { ActiveCareerProfile } from '../../career/types';
import { DEFAULT_POPULATION_CONFIG } from '../../autonomy/services/migrationService';
import type {
  NpcCareerState,
  NpcEducationState,
  NpcFinanceState,
  NpcLifestyle,
  NpcPersonality,
  NpcProfile,
  RelationshipEdge,
  WorldSimulationState,
} from '../../autonomy/types';
import type { CharacterProfile, PersonProfile } from '../../../types/game';
import type { LifeEventTemplate } from '../types';
import { EVENT_POOL } from '../data';
import {
  buildEventContext,
  compareAsciiId,
  createEventContextRegistry,
  FINANCIAL_BAND_THRESHOLDS,
  getEventLifeStage,
  type EventContextProvider,
} from '../services/eventContext';
import { isEventEligible } from '../services/eventEligibility';
import { getEligibleEvents } from '../services/eventService';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function probe(partial: Partial<LifeEventTemplate> = {}): LifeEventTemplate {
  return {
    id: partial.id ?? 'context_probe',
    title: 'Probe',
    icon: '🔎',
    description: partial.description ?? 'A quiet afternoon at home.',
    category: 'social',
    minAge: 0,
    maxAge: 120,
    choices: [
      {
        id: 'ok',
        label: 'Continue',
        icon: '✅',
        outcomes: [{ message: 'The moment passes.', effects: {} }],
      },
    ],
    ...partial,
  };
}

function baseCharacter(age: number): CharacterProfile {
  return {
    id: 'player-1',
    firstName: 'Jamie',
    lastName: 'Taylor',
    gender: 'female',
    age,
    birthYear: 2000,
    country: 'United States',
    city: 'Chicago',
    occupation: age >= 18 ? 'Unemployed' : 'Student',
    cash: 0,
    bankBalance: 0,
    netWorth: 0,
    isAlive: true,
    stats: { health: 80, happiness: 70, smarts: 60, looks: 55, karma: 50 },
    parents: {
      wealth: 'comfortable',
      father: {
        id: 'dad',
        role: 'father',
        firstName: 'Robert',
        lastName: 'Taylor',
        age: 50,
        occupation: 'Architect',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      mother: {
        id: 'mom',
        role: 'mother',
        firstName: 'Sarah',
        lastName: 'Taylor',
        age: 48,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 80,
        generosity: 70,
      },
    },
    education: createInitialEducation(),
    career: createInitialCareerState(),
    relationships: [],
    timeline: [],
    seenEventIds: [],
  };
}

function withMoney(character: CharacterProfile, cash: number, studentDebt: number): CharacterProfile {
  return {
    ...character,
    cash,
    education: { ...character.education, studentDebt },
  };
}

function withJob(character: CharacterProfile, yearsInJob: number, field: ActiveCareerProfile['field'] = 'technology'): CharacterProfile {
  const job: ActiveCareerProfile = {
    jobId: field === 'hospitality_retail' ? 'pt_cafe_barista' : 'ft_software_engineer',
    title: field === 'hospitality_retail' ? 'Barista' : 'Software Engineer',
    companyName: 'Northwind',
    field,
    type: field === 'hospitality_retail' ? 'part_time' : 'full_time',
    salary: 40000,
    yearsInJob,
    performance: 70,
    hiredAge: Math.max(0, character.age - yearsInJob),
    icon: '💼',
  };
  return {
    ...character,
    occupation: job.title,
    career: { ...character.career, currentJob: job },
  };
}

function personality(): NpcPersonality {
  return {
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 20,
    ambition: 40,
    generosity: 50,
    loyalty: 50,
    riskTolerance: 40,
    empathy: 50,
    sociability: 50,
    patience: 50,
    materialism: 40,
  };
}

function lifestyle(): NpcLifestyle {
  return {
    diet: 'standard',
    fitnessHabit: 'casual',
    substances: { alcohol: 'none', smoking: false },
    interests: [],
    hobbies: [],
  };
}

function npcEducation(): NpcEducationState {
  return { currentStage: 'graduated', schoolName: null, grades: 70, history: [] };
}

function npcCareer(): NpcCareerState {
  return {
    jobId: null,
    title: 'Clerk',
    companyName: 'Office',
    occupation: 'Clerk',
    salary: 30000,
    performance: 50,
    yearsInRole: 1,
    isRetired: false,
    pensionAnnual: 0,
    history: [],
  };
}

function npcFinances(): NpcFinanceState {
  return {
    currency: 'USD',
    cash: 1000,
    savings: 0,
    realEstateValue: 0,
    businessEquity: 0,
    studentDebt: 0,
    mortgageBalance: 0,
    otherLiabilities: 0,
    annualIncome: 30000,
    annualExpenses: 12000,
    netWorth: 1000,
  };
}

function makeNpc(id: string, age: number, alive = true): NpcProfile {
  return {
    id,
    tier: 'core',
    firstName: id,
    lastName: 'Hart',
    gender: 'female',
    biologicalGender: 'female',
    age,
    birthYear: 2026 - age,
    isAlive: alive,
    location: {
      country: 'United States',
      city: 'Chicago',
      residenceHistory: [{ country: 'United States', city: 'Chicago', startYear: 2000, reason: 'birth' }],
    },
    identityResolutionStatus: 'canonical',
    looks: 50,
    smarts: 50,
    health: 80,
    happiness: 70,
    fertility: 60,
    craziness: 10,
    personality: personality(),
    lifestyle: lifestyle(),
    goals: [],
    healthConditions: [],
    education: npcEducation(),
    career: npcCareer(),
    finances: npcFinances(),
    lifeHistory: [],
    adoptiveParentIds: [],
    stepParentIds: [],
    isAdopted: false,
  };
}

function orderedPair(left: string, right: string): [string, string] {
  return left < right ? [left, right] : [right, left];
}

function coupleEdge(playerId: string, spouseId: string): RelationshipEdge {
  const [participantAId, participantBId] = orderedPair(playerId, spouseId);
  return {
    id: `spouse-${spouseId}`,
    participantAId,
    participantBId,
    category: 'spouse',
    roleForA: 'spouse',
    roleForB: 'spouse',
    lineageRelation: 'none',
    status: 'active',
    trust: 80,
    affection: 80,
    respect: 70,
    romance: 80,
    compatibility: 75,
    yearsTogether: 3,
    lastInteractedYear: 2025,
    episodes: [],
  };
}

function childEdge(
  playerId: string,
  childId: string,
  lineage: 'biological' | 'adoptive' | 'step'
): RelationshipEdge {
  const [participantAId, participantBId] = orderedPair(playerId, childId);
  const playerIsA = participantAId === playerId;
  return {
    id: `child-${childId}`,
    participantAId,
    participantBId,
    category: 'parent_child',
    roleForA: playerIsA ? 'parent' : 'child',
    roleForB: playerIsA ? 'child' : 'parent',
    lineageRelation: lineage,
    status: 'active',
    trust: 70,
    affection: 70,
    respect: 70,
    romance: 0,
    compatibility: 70,
    yearsTogether: 1,
    lastInteractedYear: 2025,
    episodes: [],
  };
}

function parentEdge(playerId: string, parentId: string): RelationshipEdge {
  const [participantAId, participantBId] = orderedPair(playerId, parentId);
  const parentIsA = participantAId === parentId;
  return {
    id: `parent-${parentId}`,
    participantAId,
    participantBId,
    category: 'parent_child',
    roleForA: parentIsA ? 'parent' : 'child',
    roleForB: parentIsA ? 'child' : 'parent',
    lineageRelation: 'biological',
    parentRoleForA: parentIsA ? 'father' : undefined,
    parentRoleForB: parentIsA ? undefined : 'father',
    status: 'active',
    trust: 70,
    affection: 70,
    respect: 70,
    romance: 0,
    compatibility: 70,
    yearsTogether: 8,
    lastInteractedYear: 2025,
    episodes: [],
  };
}

function world(npcs: NpcProfile[], edges: RelationshipEdge[]): WorldSimulationState {
  const npcRegistry: WorldSimulationState['npcRegistry'] = {};
  for (const npc of npcs) npcRegistry[npc.id] = npc;
  const relationshipsById: WorldSimulationState['relationshipsById'] = {};
  const relationshipIndex: WorldSimulationState['relationshipIndex'] = {};
  for (const edge of edges) {
    relationshipsById[edge.id] = edge;
    for (const participantId of [edge.participantAId, edge.participantBId]) {
      const current = relationshipIndex[participantId] ?? [];
      relationshipIndex[participantId] = [...current, edge.id];
    }
  }
  return {
    schemaVersion: 2,
    worldSeed: 11,
    simulationVersion: 1,
    lastSimulatedYear: 2026,
    lastSimulationTurnId: 'turn-1',
    familyWealth: 'comfortable',
    legacyIdMappings: {},
    npcRegistry,
    relationshipsById,
    relationshipIndex,
    inheritanceRecords: {},
    memories: {},
    lifeUpdatesFeed: [],
    populationConfig: DEFAULT_POPULATION_CONFIG,
  };
}

function marriedLegacy(): PersonProfile {
  return {
    id: 'legacy-spouse',
    firstName: 'Alex',
    lastName: 'Hart',
    gender: 'female',
    age: 30,
    role: 'Wife',
    relationshipType: 'spouse',
    relationship: 90,
    originStory: 'Married before the world record existed.',
    stageMet: 'adulthood',
    romanticStage: 'married',
  };
}

function emptyRegistry() {
  return createEventContextRegistry([]);
}

function eligible(character: CharacterProfile, event: LifeEventTemplate, providers: EventContextProvider[] = []): boolean {
  const registry = createEventContextRegistry(providers);
  const context = buildEventContext(character, registry);
  return isEventEligible(event, character, context);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

const empty = emptyRegistry();

const untouched = baseCharacter(25);
const beforeUntouched = structuredClone(untouched);
buildEventContext(untouched, empty);
assert(JSON.stringify(untouched) === JSON.stringify(beforeUntouched), 'Context build must not mutate the character');

for (const age of [12, 13, 17, 18, 39, 40, 64, 65]) {
  assert(
    getEventLifeStage(age) === getLifeStageForAge(age),
    `Life stage at ${age} must match the dashboard`
  );
}

assert(FINANCIAL_BAND_THRESHOLDS.strugglingCashBelow === 1000, 'struggling cash boundary');
assert(FINANCIAL_BAND_THRESHOLDS.debtToCashStruggleRatio === 4, 'debt ratio');
assert(FINANCIAL_BAND_THRESHOLDS.debtStruggleCashBelow === 10000, 'debt cash boundary');
assert(FINANCIAL_BAND_THRESHOLDS.stableCashBelow === 15000, 'stable boundary');
assert(FINANCIAL_BAND_THRESHOLDS.comfortableCashBelow === 75000, 'comfortable boundary');

function band(age: number, cash: number, debt: number) {
  return buildEventContext(withMoney(baseCharacter(age), cash, debt), empty).financialBand;
}

assert(band(10, 75000, 0) === 'dependent', 'A child is dependent even with cash');
assert(band(30, 999, 0) === 'struggling', 'Cash 999 is struggling');
assert(band(30, 1000, 0) === 'stable', 'Cash 1000 is not below the struggling line');
assert(band(30, 2000, 8001) === 'struggling', 'Debt pressure below 10000 cash is struggling');
assert(band(30, 9999, 39997) === 'struggling', 'Cash 9999 still takes the debt path');
assert(band(30, 10000, 40001) === 'stable', 'Cash 10000 does not take the debt path');
assert(band(30, 14999, 0) === 'stable', 'Cash 14999 is stable');
assert(band(30, 15000, 0) === 'comfortable', 'Cash 15000 is comfortable');
assert(band(30, 74999, 0) === 'comfortable', 'Cash 74999 is comfortable');
assert(band(30, 75000, 0) === 'wealthy', 'Cash 75000 is wealthy');

const minCash = probe({ requires: { minCash: 100 } });
const maxCash = probe({ requires: { maxCash: 30000 } });
const minDebt = probe({ requires: { minStudentDebt: 100 } });
const bandRule = probe({ requires: { financialBands: ['stable'] } });
const ageOnly = probe();

const badCash = withMoney(baseCharacter(30), Number.NaN, 5000);
const badCashContext = buildEventContext(badCash, empty);
assert(badCashContext.financialBand === null, 'Invalid cash clears the band');
assert(badCashContext.studentDebtValid, 'Valid debt stays valid when cash is not');
assert(!isEventEligible(minCash, badCash, badCashContext), 'minCash fails when cash is invalid');
assert(!isEventEligible(maxCash, badCash, badCashContext), 'maxCash fails when cash is invalid');
assert(isEventEligible(minDebt, badCash, badCashContext), 'minStudentDebt uses valid debt alone');
assert(!isEventEligible(bandRule, badCash, badCashContext), 'financialBands needs both values');
assert(isEventEligible(ageOnly, badCash, badCashContext), 'Age-only template ignores invalid cash');

const negativeCash = withMoney(baseCharacter(30), -5, 500);
const negativeCashContext = buildEventContext(negativeCash, empty);
assert(negativeCashContext.financialBand === null, 'Negative cash clears the band');
assert(!isEventEligible(minCash, negativeCash, negativeCashContext), 'Negative cash fails minCash');

const badDebt = withMoney(baseCharacter(30), 20000, Number.NaN);
const badDebtContext = buildEventContext(badDebt, empty);
assert(badDebtContext.financialBand === null, 'Invalid debt clears the band');
assert(badDebtContext.cashValid, 'Valid cash stays valid when debt is not');
assert(isEventEligible(minCash, badDebt, badDebtContext), 'minCash uses valid cash alone');
assert(isEventEligible(maxCash, badDebt, badDebtContext), 'maxCash uses valid cash alone');
assert(!isEventEligible(minDebt, badDebt, badDebtContext), 'minStudentDebt fails when debt is invalid');
assert(!isEventEligible(bandRule, badDebt, badDebtContext), 'financialBands fails when debt is invalid');
assert(isEventEligible(ageOnly, badDebt, badDebtContext), 'Age-only template ignores invalid debt');

const negativeDebt = withMoney(baseCharacter(30), 20000, -1);
assert(buildEventContext(negativeDebt, empty).financialBand === null, 'Negative debt clears the band');
assert(!eligible(negativeDebt, minDebt), 'Negative debt fails minStudentDebt');
assert(eligible(negativeDebt, minCash), 'Negative debt does not block minCash');

const spouseRule = probe({ requires: { requiresSpouse: true } });
const canonicalSpouse = {
  ...withMoney(baseCharacter(30), 5000, 0),
  partner: null,
  worldState: world([makeNpc('spouse-ada', 31)], [coupleEdge('player-1', 'spouse-ada')]),
};
assert(eligible(canonicalSpouse, spouseRule), 'A canonical spouse satisfies requiresSpouse');

const canonicalWithoutSpouse = {
  ...withMoney(baseCharacter(30), 5000, 0),
  partner: marriedLegacy(),
  worldState: world([], []),
};
assert(!eligible(canonicalWithoutSpouse, spouseRule), 'A legacy spouse is ignored when the world is canonical');

const legacySpouse = { ...withMoney(baseCharacter(30), 5000, 0), partner: marriedLegacy() };
assert(eligible(legacySpouse, spouseRule), 'A legacy spouse counts when no world exists');

const blankId = {
  ...legacySpouse,
  id: '',
  worldState: world([], []),
};
const partnerRule = probe({ requires: { requiresPartner: true } });
const noPartnerRule = probe({ requires: { requiresNoPartner: true } });
assert(buildEventContext(blankId, empty).relationshipSource === 'invalid', 'A blank player id is invalid');
assert(!eligible(blankId, partnerRule), 'requiresPartner fails closed on an invalid player id');
assert(!eligible(blankId, noPartnerRule), 'requiresNoPartner fails closed on an invalid player id');
assert(
  eligible(blankId, probe({ requires: { requiresPartner: false } })),
  'requiresPartner: false does not read relationship facts'
);
assert(
  eligible(blankId, probe({ requires: { requiresSpouse: false, requiresNoPartner: false } })),
  'Disabled spouse and no-partner flags stay eligible when the source is invalid'
);
assert(
  eligible(blankId, probe({ requires: { requiresSchoolAgeChild: false } })),
  'requiresSchoolAgeChild: false does not read relationship facts'
);
assert(!eligible(blankId, probe({ requires: { minChildren: 1 } })), 'minChildren still fails closed');
assert(
  !eligible(blankId, probe({ requires: { partnerStages: ['married'] } })),
  'A partner-stage list still fails closed'
);
assert(eligible(blankId, ageOnly), 'An age-only template still passes');

function childCharacter(childId: string, age: number, lineage: 'biological' | 'step', alive = true): CharacterProfile {
  return {
    ...withMoney(baseCharacter(34), 8000, 0),
    worldState: world([makeNpc(childId, age, alive)], [childEdge('player-1', childId, lineage)]),
  };
}

assert(eligible(childCharacter('child-five', 5, 'biological'), probe({ requires: { minChildren: 1 } })), 'A living child counts');
assert(eligible(childCharacter('child-five', 5, 'biological'), probe({ requires: { requiresSchoolAgeChild: true } })), 'Age 5 is school age');
assert(eligible(childCharacter('child-seventeen', 17, 'biological'), probe({ requires: { requiresSchoolAgeChild: true } })), 'Age 17 is school age');
assert(eligible(childCharacter('child-four', 4, 'biological'), probe({ requires: { minChildren: 1 } })), 'Age 4 is still a child');
assert(!eligible(childCharacter('child-four', 4, 'biological'), probe({ requires: { requiresSchoolAgeChild: true } })), 'Age 4 is not school age');
assert(!eligible(childCharacter('child-eighteen', 18, 'biological'), probe({ requires: { requiresSchoolAgeChild: true } })), 'Age 18 is not school age');
assert(!eligible(childCharacter('step-kid', 10, 'step'), probe({ requires: { minChildren: 1 } })), 'A stepchild is not in the child selector');
assert(!eligible(childCharacter('dead-kid', 10, 'biological', false), probe({ requires: { minChildren: 1 } })), 'A dead child does not count');

const unemployed = { ...withMoney(baseCharacter(30), 1000, 0), occupation: 'Unemployed' };
const student = {
  ...withMoney(baseCharacter(20), 1000, 0),
  occupation: 'University Student',
  education: { ...baseCharacter(20).education, currentStage: 'university' as const },
};
const retired = { ...withMoney(baseCharacter(70), 1000, 0), occupation: 'Retired' };
const unemployedRule = probe({ requires: { requiresUnemployed: true } });
assert(eligible(unemployed, unemployedRule), 'An adult without work is unemployed');
assert(!eligible(student, unemployedRule), 'A university student is not unemployed');
assert(!eligible(retired, unemployedRule), 'A retiree is not unemployed');

const yearsRule = probe({ requires: { minYearsInJob: 2 } });
assert(eligible(withJob(baseCharacter(30), 2), yearsRule), 'Two years in the job passes');
assert(!eligible(withJob(baseCharacter(30), 1), yearsRule), 'One year in the job fails');
assert(!eligible(baseCharacter(30), yearsRule), 'No job fails minYearsInJob');
const nanYears = withJob(baseCharacter(30), 4);
nanYears.career.currentJob!.yearsInJob = Number.NaN;
assert(!eligible(nanYears, yearsRule), 'NaN yearsInJob fails');

const teenOrAdult = probe({ requires: { lifeStages: ['teens', 'adulthood'] } });
assert(eligible(baseCharacter(16), teenOrAdult), 'Teens match an OR list');
assert(eligible(baseCharacter(30), teenOrAdult), 'Adulthood matches an OR list');
assert(!eligible(baseCharacter(10), teenOrAdult), 'Childhood misses that OR list');
assert(!eligible(baseCharacter(16), probe({ requires: { lifeStages: [] } })), 'An empty life-stage list matches nothing');

const teenAndCash = probe({ requires: { lifeStages: ['teens'], minCash: 5000 } });
assert(eligible(withMoney(baseCharacter(16), 5000, 0), teenAndCash), 'AND requires both the stage and the cash');
assert(!eligible(withMoney(baseCharacter(16), 100, 0), teenAndCash), 'Low cash fails the AND');
assert(!eligible(withMoney(baseCharacter(30), 5000, 0), teenAndCash), 'The wrong stage fails the AND');

assert(
  !eligible(baseCharacter(30), probe({ requires: { requiresPartner: true, requiresNoPartner: true } })),
  'Partner and no-partner contradict'
);
assert(
  !eligible(withMoney(baseCharacter(30), 15, 0), probe({ requires: { minCash: 20, maxCash: 10 } })),
  'minCash above maxCash contradicts'
);

const teen = baseCharacter(16);
assert(!eligible(teen, probe({ excludes: { lifeStages: ['teens'] } })), 'A matching exclusion removes the template');
assert(eligible(baseCharacter(30), probe({ excludes: { lifeStages: ['teens'] } })), 'A non-matching exclusion keeps the template');
assert(eligible(teen, probe({ excludes: { seenEventIds: [] } })), 'An empty seen-id exclusion does not exclude');
const seenOther = { ...teen, seenEventIds: ['other_event'] };
assert(!eligible(seenOther, probe({ excludes: { seenEventIds: ['other_event'] } })), 'A seen exclusion id excludes');

let duplicateThrew = false;
try {
  createEventContextRegistry([
    { id: 'assets', contribute: () => ({}) },
    { id: 'assets', contribute: () => ({}) },
  ]);
} catch {
  duplicateThrew = true;
}
assert(duplicateThrew, 'Duplicate provider ids throw');

const callOrder: string[] = [];
const shuffled: EventContextProvider[] = [
  { id: 'zoo', contribute: () => { callOrder.push('zoo'); return { seen: true }; } },
  { id: 'assets', contribute: () => { callOrder.push('assets'); return { apple: 1, zoo: 2 }; } },
  { id: 'middle', contribute: () => { callOrder.push('middle'); return { seen: true }; } },
];
const ordered = buildEventContext(baseCharacter(30), createEventContextRegistry(shuffled));
assert(callOrder.join(',') === 'assets,middle,zoo', 'Providers run in ASCII id order');
assert(compareAsciiId('assets', 'middle') < 0 && compareAsciiId('middle', 'zoo') < 0, 'compareAsciiId is code-unit order');
assert(Object.keys(ordered.extensions.assets).join(',') === 'apple,zoo', 'Extension keys are stored in ASCII order');

const ownsHome = probe({
  requires: { extensionAll: [{ providerId: 'assets', key: 'owns_home', equals: true }] },
});
assert(!eligible(baseCharacter(30), ownsHome), 'A missing provider fails closed');
assert(
  !eligible(baseCharacter(30), ownsHome, [
    { id: 'assets', contribute: () => { throw new Error('boom'); } },
  ]),
  'A thrown contribute fails the template that names it'
);
assert(
  eligible(baseCharacter(30), ageOnly, [
    { id: 'assets', contribute: () => { throw new Error('boom'); } },
  ]),
  'A thrown contribute does not affect unrelated templates'
);
assert(
  !eligible(baseCharacter(30), ownsHome, [{ id: 'assets', contribute: () => ({ other: true }) }]),
  'A missing key fails closed'
);
assert(
  eligible(baseCharacter(30), ownsHome, [{ id: 'assets', contribute: () => ({ owns_home: true }) }]),
  'A present extension fact passes'
);
assert(
  eligible(baseCharacter(30), ageOnly, [{ id: 'assets', contribute: () => ({ owns_home: true }) }]),
  'A provider does not change templates that do not ask for it'
);

const staleEdge = coupleEdge('player-1', 'spouse-ada');
const staleWorld = world([makeNpc('spouse-ada', 31)], [staleEdge]);
staleWorld.relationshipIndex = { 'player-1': ['missing-edge'], 'spouse-ada': [] };
const staleSnapshot = JSON.stringify(staleWorld);
const staleCharacter = deepFreeze({
  ...withMoney(baseCharacter(30), 4200, 0),
  partner: marriedLegacy(),
  worldState: staleWorld,
});
const staleContext = buildEventContext(staleCharacter, empty);
assert(JSON.stringify(staleCharacter.worldState) === staleSnapshot, 'A stale schema-2 world is not mutated or repaired');
assert(
  staleCharacter.worldState?.relationshipIndex['player-1']?.[0] === 'missing-edge',
  'The stale index entry stays in place'
);
assert(
  staleCharacter.worldState?.relationshipsById[staleEdge.id]?.category === 'spouse',
  'The unindexed spouse edge stays unindexed'
);
assert(staleContext.hasPartner === false, 'Event context does not repair a stale index into a spouse');
assert(staleContext.relationshipSource === 'canonical', 'A stale schema-2 world is still canonical');

const frozenWorld = world([makeNpc('spouse-ada', 31)], [coupleEdge('player-1', 'spouse-ada')]);
const frozenCharacter = deepFreeze({
  ...withMoney(baseCharacter(30), 4200, 0),
  worldState: frozenWorld,
});
const worldBefore = frozenCharacter.worldState;
const pureRegistry = createEventContextRegistry([
  {
    id: 'cashread',
    contribute: (character) => ({ cash: character.cash }),
  },
]);
const pureContext = buildEventContext(frozenCharacter, pureRegistry);
assert(pureContext.extensions.cashread.cash === 4200, 'A pure provider can read cash');
assert(frozenCharacter.worldState === worldBefore, 'Provider evaluation does not replace world state');
assert(frozenCharacter.cash === 4200, 'Provider evaluation does not change cash');

const fatherEvent = EVENT_POOL.find((event) => event.id === 'dad_flashlight_duty');
assert(fatherEvent, 'dad_flashlight_duty exists');
const child = { ...baseCharacter(8), education: { ...baseCharacter(8).education, currentStage: 'elementary' as const } };
assert(getEligibleEvents(child).some((event) => event.id === 'dad_flashlight_duty'), 'A living legacy father keeps the parent event');
const deadFather = {
  ...child,
  parents: {
    ...child.parents,
    father: { ...child.parents.father, isAlive: false },
  },
  worldState: world([makeNpc('father-npc', 45)], [parentEdge('player-1', 'father-npc')]),
};
assert(
  !getEligibleEvents(deadFather).some((event) => event.id === 'dad_flashlight_duty'),
  'The father placeholder still follows character.parents when a canonical father is alive'
);

console.log('✅ Event context, eligibility DSL, providers, and relationship precedence passed');
