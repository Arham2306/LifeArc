import { calculateCanonicalNetWorth } from '../services/currencyService';
import { DEFAULT_POPULATION_CONFIG } from '../services/migrationService';
import { progressNpcMortalityYear } from '../services/autonomousMortalityService';
import { deterministicUUID } from '../services/seededPrngService';
import type {
  InheritanceRecord,
  LineageRelationType,
  NpcCareerState,
  NpcEducationState,
  NpcFinanceState,
  NpcLifestyle,
  NpcPersonality,
  NpcProfile,
  NpcTier,
  RelationshipCategory,
  RelationshipEdge,
  WorldSimulationState,
} from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const PLAYER_ID = 'player-1';
const YEAR = 2030;

function personality(): NpcPersonality {
  return {
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 20,
    ambition: 40,
    generosity: 50,
    loyalty: 40,
    riskTolerance: 35,
    empathy: 50,
    sociability: 50,
    patience: 50,
    materialism: 30,
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

function education(): NpcEducationState {
  return { currentStage: 'graduated', schoolName: null, grades: 80, history: [] };
}

function career(): NpcCareerState {
  return {
    jobId: null,
    title: 'Clerk',
    companyName: 'North Office',
    occupation: 'Clerk',
    salary: 40000,
    performance: 50,
    yearsInRole: 2,
    isRetired: false,
    pensionAnnual: 0,
    history: [],
  };
}

function finances(partial: Partial<NpcFinanceState> = {}): NpcFinanceState {
  const state: NpcFinanceState = {
    currency: 'USD',
    cash: 0,
    savings: 0,
    realEstateValue: 0,
    businessEquity: 0,
    studentDebt: 0,
    mortgageBalance: 0,
    otherLiabilities: 0,
    annualIncome: 0,
    annualExpenses: 0,
    netWorth: 0,
    ...partial,
  };
  state.netWorth = calculateCanonicalNetWorth(state);
  return state;
}

function makeNpc(params: {
  id: string;
  age?: number;
  health?: number;
  tier?: NpcTier;
  alive?: boolean;
  deathYear?: number;
  estateSettled?: boolean;
  finances?: Partial<NpcFinanceState>;
}): NpcProfile {
  const age = params.age ?? 30;
  const npc: NpcProfile = {
    id: params.id,
    tier: params.tier ?? 'social',
    firstName: params.id,
    lastName: 'Hart',
    gender: 'female',
    biologicalGender: 'female',
    age,
    birthYear: YEAR - age,
    isAlive: params.alive ?? true,
    location: {
      country: 'United States',
      city: 'Boston',
      residenceHistory: [{ country: 'United States', city: 'Boston', startYear: YEAR - age, reason: 'birth' }],
    },
    identityResolutionStatus: 'canonical',
    looks: 50,
    smarts: 50,
    health: params.health ?? 90,
    happiness: 70,
    fertility: 50,
    craziness: 10,
    personality: personality(),
    lifestyle: lifestyle(),
    goals: [],
    healthConditions: [],
    education: education(),
    career: career(),
    finances: finances(params.finances),
    lifeHistory: [],
    adoptiveParentIds: [],
    stepParentIds: [],
    isAdopted: false,
  };
  if (params.deathYear !== undefined) npc.deathYear = params.deathYear;
  if (params.estateSettled === true) npc.estateSettled = true;
  return npc;
}

function dying(id: string, partial: Partial<NpcFinanceState> = {}, tier: NpcTier = 'social'): NpcProfile {
  return makeNpc({ id, age: 80, health: 0, tier, finances: partial });
}

function living(id: string, partial: Partial<NpcFinanceState> = {}, age = 30): NpcProfile {
  return makeNpc({ id, age, health: 90, finances: partial });
}

function baseEdge(id: string, a: string, b: string, category: RelationshipCategory, status: RelationshipEdge['status']): RelationshipEdge {
  const aFirst = a.localeCompare(b) <= 0;
  return {
    id,
    participantAId: aFirst ? a : b,
    participantBId: aFirst ? b : a,
    category,
    roleForA: category === 'parent_child' ? 'parent' : (category as RelationshipEdge['roleForA']),
    roleForB: category === 'parent_child' ? 'child' : (category as RelationshipEdge['roleForB']),
    lineageRelation: 'none',
    status,
    trust: 70,
    affection: 70,
    respect: 70,
    romance: 0,
    compatibility: 70,
    yearsTogether: 1,
    lastInteractedYear: YEAR - 1,
    episodes: [{ episodeId: `${id}-ep`, category, startYear: YEAR - 10 }],
  };
}

function pairEdge(
  a: string,
  b: string,
  category: RelationshipCategory,
  status: RelationshipEdge['status'] = 'active'
): RelationshipEdge {
  const edge = baseEdge(`pair-${a}-${b}`, a, b, category, status);
  const role = category as RelationshipEdge['roleForA'];
  edge.roleForA = role;
  edge.roleForB = role;
  return edge;
}

function parentEdge(
  parentId: string,
  childId: string,
  lineage: LineageRelationType,
  status: RelationshipEdge['status'] = 'active'
): RelationshipEdge {
  const edge = baseEdge(`parent-${parentId}-${childId}`, parentId, childId, 'parent_child', status);
  edge.lineageRelation = lineage;
  edge.roleForA = edge.participantAId === parentId ? 'parent' : 'child';
  edge.roleForB = edge.participantBId === parentId ? 'parent' : 'child';
  return edge;
}

function makeWorld(
  npcs: NpcProfile[],
  edges: RelationshipEdge[] = [],
  worldSeed = 20261110,
  records: Record<string, InheritanceRecord> = {}
): WorldSimulationState {
  const npcRegistry: Record<string, NpcProfile> = {};
  for (const npc of npcs) npcRegistry[npc.id] = npc;
  const relationshipsById: Record<string, RelationshipEdge> = {};
  for (const edge of edges) relationshipsById[edge.id] = edge;
  const relationshipIndex: Record<string, string[]> = {};
  for (const edge of edges) {
    for (const id of [edge.participantAId, edge.participantBId]) {
      relationshipIndex[id] = [...(relationshipIndex[id] ?? []), edge.id];
    }
  }
  return {
    schemaVersion: 2,
    worldSeed,
    simulationVersion: 1,
    lastSimulatedYear: YEAR - 1,
    lastSimulationTurnId: 'mortality-test',
    familyWealth: 'modest',
    legacyIdMappings: {},
    npcRegistry,
    relationshipsById,
    relationshipIndex,
    inheritanceRecords: records,
    memories: {},
    lifeUpdatesFeed: [],
    populationConfig: { ...DEFAULT_POPULATION_CONFIG },
  };
}

function progress(world: WorldSimulationState, year = YEAR): WorldSimulationState {
  return progressNpcMortalityYear(world, year, PLAYER_ID);
}

function recordFor(world: WorldSimulationState, id: string): InheritanceRecord {
  const record = world.inheritanceRecords[id];
  assert(record, `${id} did not receive an estate record`);
  return record;
}

function awarded(record: InheritanceRecord, id: string): number {
  return record.distributions
    .filter((share) => share.beneficiaryId === id)
    .reduce((sum, share) => sum + share.amountInSourceCurrency, 0);
}

function cash(world: WorldSimulationState, id: string): number {
  return world.npcRegistry[id]?.finances.cash ?? -1;
}

function assertCleared(npc: NpcProfile | undefined, label: string): void {
  assert(npc !== undefined, `${label} is missing`);
  assert(npc.estateSettled === true, `${label} was not marked settled`);
  assert(
    npc.finances.cash === 0 &&
      npc.finances.savings === 0 &&
      npc.finances.realEstateValue === 0 &&
      npc.finances.businessEquity === 0 &&
      npc.finances.studentDebt === 0 &&
      npc.finances.mortgageBalance === 0 &&
      npc.finances.otherLiabilities === 0 &&
      npc.finances.netWorth === 0,
    `${label} still holds estate balances`
  );
}

const elderCause = 'Passed away peacefully in sleep of old age';
const healthCause = 'Succumbed to poor health';

const youngGate = progress(makeWorld([makeNpc({ id: 'elder', age: 73, health: 100 })], [], 3));
assert(youngGate.npcRegistry.elder?.isAlive === true, 'an NPC below the mortality cutoff died');
assert(youngGate.npcRegistry.elder?.age === 74, 'the cutoff NPC did not age by one year');
assert(youngGate.npcRegistry.elder?.birthYear === YEAR - 74, 'birth year was not simulation year minus new age');
assert(Object.keys(youngGate.inheritanceRecords).length === 0, 'a living NPC received an estate record');

const oldDeath = progress(makeWorld([makeNpc({ id: 'elder', age: 74, health: 100 })], [], 3));
assert(oldDeath.npcRegistry.elder?.isAlive === false, 'seed 3 did not produce an old-age death');
assert(oldDeath.npcRegistry.elder?.age === 75 && oldDeath.npcRegistry.elder?.health === 99, 'old-age health did not use the new age');
assert(oldDeath.npcRegistry.elder?.causeOfDeath === elderCause, 'old-age cause was wrong');
assert(oldDeath.npcRegistry.elder?.birthYear === YEAR - 75, 'a dead NPC kept the pre-pass birth year');

const oldSurvival = progress(makeWorld([makeNpc({ id: 'elder', age: 74, health: 100 })], [], 1));
assert(oldSurvival.npcRegistry.elder?.isAlive === true, 'seed 1 died despite losing the mortality roll');
assert(oldSurvival.npcRegistry.elder?.age === 75 && oldSurvival.npcRegistry.elder?.health === 95, 'a survived old-age year changed the wrong health');

const healthWorld = progress(
  makeWorld([
    dying('elder-bg', {}, 'background'),
    makeNpc({ id: 'baby', age: 0, health: 0 }),
    living('youth'),
  ])
);
assert(healthWorld.npcRegistry['elder-bg']?.isAlive === false, 'zero health did not kill an older NPC');
assert(healthWorld.npcRegistry['elder-bg']?.causeOfDeath === healthCause, 'zero health used the old-age cause');
assert(healthWorld.npcRegistry['elder-bg']?.tier === 'historical', 'a dead background NPC stayed in the active tier');
assert(healthWorld.npcRegistry.baby?.age === 0 && healthWorld.npcRegistry.baby?.health === 0, 'a newborn was aged or lost health');
assert(healthWorld.npcRegistry.baby?.birthYear === YEAR && healthWorld.npcRegistry.baby?.isAlive === true, 'a newborn was processed by mortality');
assert(healthWorld.npcRegistry.youth?.age === 31 && healthWorld.npcRegistry.youth?.isAlive === true, 'a young adult skipped aging');
console.log('✅ 1. Mortality uses the shared health rules and skips NPCs born this year.');

function simultaneous(richId: string, poorId: string): void {
  const settled = progress(
    makeWorld([dying(richId, { cash: 100000 }), dying(poorId)], [pairEdge(richId, poorId, 'spouse')])
  );
  const richRecord = recordFor(settled, richId);
  const poorRecord = recordFor(settled, poorId);
  const spouseEdge = Object.values(settled.relationshipsById).find((edge) => edge.category === 'deceased_spouse');
  assert(spouseEdge?.status === 'deceased', `${richId} spouse edge was not reconciled`);
  assert(richRecord.status === 'escheated' && richRecord.escheatedAmount === 100000, `${richId} estate did not escheat`);
  assert(richRecord.distributions.length === 0, `${richId} left money to someone who died the same year`);
  assert(poorRecord.grossAssets === 0 && poorRecord.status === 'insolvent', `${poorId} absorbed the other estate before dying`);
  assert(poorRecord.distributions.length === 0, `${poorId} named an heir who died the same year`);
  assert(cash(settled, richId) === 0 && cash(settled, poorId) === 0, 'a same-year heir kept inherited cash');
}

simultaneous('ada', 'bea');
simultaneous('zoe', 'amy');

const sharedChild = progress(
  makeWorld(
    [
      dying('bea', { cash: 30000 }),
      dying('ada', { cash: 10000 }),
      living('child', { cash: 500 }),
    ],
    [pairEdge('ada', 'bea', 'spouse'), parentEdge('ada', 'child', 'biological'), parentEdge('bea', 'child', 'biological')]
  )
);
const adaEstate = recordFor(sharedChild, 'ada');
const beaEstate = recordFor(sharedChild, 'bea');
assert(adaEstate.grossAssets === 10000 && awarded(adaEstate, 'child') === 10000, 'Ada estate was calculated after a credit');
assert(beaEstate.grossAssets === 30000 && awarded(beaEstate, 'child') === 30000, 'Bea estate was calculated after a credit');
assert(awarded(adaEstate, 'bea') === 0 && awarded(beaEstate, 'ada') === 0, 'a spouse who died the same year inherited');
assert(cash(sharedChild, 'child') === 40500, 'two estates did not accumulate on the surviving child');
const childEvents = sharedChild.npcRegistry.child?.lifeHistory.filter((event) => event.type === 'inheritance_received') ?? [];
assert(childEvents.length === 2, 'the child did not receive one event per estate');
assert(new Set(childEvents.map((event) => event.referenceId)).size === 2, 'estate events shared one reference');
console.log('✅ 2. Same-year deaths are settled from pre-credit snapshots in both id orders.');

const biological = progress(
  makeWorld(
    [dying('parent', { cash: 1000, savings: 2000, realEstateValue: 3000, businessEquity: 4000 }), living('child')],
    [parentEdge('parent', 'child', 'biological')]
  )
);
const biologicalEdge = biological.relationshipsById['parent-parent-child'];
const biologicalEstate = recordFor(biological, 'parent');
assert(biologicalEdge?.status === 'deceased' && biologicalEdge.category === 'parent_child', 'the parent-child edge lost its category');
assert(biologicalEdge?.lineageRelation === 'biological', 'biological lineage changed');
assert(biologicalEstate.grossAssets === 10000 && awarded(biologicalEstate, 'child') === 10000, 'asset fields were not all counted');
assert(cash(biological, 'child') === 10000, 'the living child did not inherit through a deceased edge');
assertCleared(biological.npcRegistry.parent, 'parent');
assert(biologicalEstate.id === deterministicUUID('npc-estate', 'parent', YEAR), 'estate id was not deterministic');

const adopted = progress(
  makeWorld(
    [dying('parent', { cash: 10000 }), living('adopted'), living('stepchild')],
    [parentEdge('parent', 'adopted', 'adoptive'), parentEdge('parent', 'stepchild', 'step')]
  )
);
assert(awarded(recordFor(adopted, 'parent'), 'adopted') === 10000, 'an adopted child did not inherit');
assert(cash(adopted, 'adopted') === 10000 && cash(adopted, 'stepchild') === 0, 'a stepchild inherited');

const spouse = progress(makeWorld([dying('ada', { cash: 8000 }), living('bea')], [pairEdge('ada', 'bea', 'spouse')]));
const spouseEdge = Object.values(spouse.relationshipsById).find((edge) => edge.participantAId === 'ada' || edge.participantBId === 'ada');
assert(spouseEdge?.category === 'deceased_spouse' && spouseEdge.status === 'deceased', 'the surviving spouse was not a deceased spouse');
assert(awarded(recordFor(spouse, 'ada'), 'bea') === 8000 && cash(spouse, 'bea') === 8000, 'the surviving spouse did not inherit');

const former = progress(
  makeWorld([dying('ada', { cash: 8000 }), living('bea')], [pairEdge('ada', 'bea', 'former_spouse', 'former')])
);
const formerEdge = Object.values(former.relationshipsById)[0];
assert(formerEdge?.category === 'former_spouse', 'a former spouse became a deceased spouse');
assert(recordFor(former, 'ada').status === 'escheated' && cash(former, 'bea') === 0, 'a former spouse inherited');

const stepFamily = progress(
  makeWorld(
    [dying('ada', { cash: 9000 }), living('stepchild'), living('stepsib')],
    [parentEdge('ada', 'stepchild', 'step'), pairEdge('ada', 'stepsib', 'sibling')]
  )
);
assert(recordFor(stepFamily, 'ada').status === 'escheated' && recordFor(stepFamily, 'ada').escheatedAmount === 9000, 'a step relationship inherited');
assert(cash(stepFamily, 'stepchild') === 0 && cash(stepFamily, 'stepsib') === 0, 'step family cash changed');

const parentHeir = progress(
  makeWorld([dying('child', { cash: 6000 }), living('mom')], [parentEdge('mom', 'child', 'biological')])
);
assert(awarded(recordFor(parentHeir, 'child'), 'mom') === 6000 && cash(parentHeir, 'mom') === 6000, 'a living parent did not inherit');

const siblingHeir = progress(
  makeWorld(
    [
      makeNpc({ id: 'shared', age: 70, alive: false, estateSettled: true }),
      dying('left', { cash: 7000 }),
      living('right'),
    ],
    [
      parentEdge('shared', 'left', 'biological', 'deceased'),
      parentEdge('shared', 'right', 'biological', 'deceased'),
      pairEdge('left', 'right', 'sibling'),
    ]
  )
);
assert(awarded(recordFor(siblingHeir, 'left'), 'right') === 7000 && cash(siblingHeir, 'right') === 7000, 'a biological sibling did not inherit');
console.log('✅ 3. Heirs qualify through deceased edges, and step relationships do not.');

function branchWorld(withSpouse: boolean): WorldSimulationState {
  const people = [
    dying('parent', { cash: 100000 }),
    living('child-a'),
    makeNpc({ id: 'child-b', age: 40, alive: false, estateSettled: true }),
    makeNpc({ id: 'child-c', age: 40, alive: false, estateSettled: true }),
    living('grand-b1', {}, 12),
    living('grand-b2', {}, 10),
  ];
  const edges = [
    parentEdge('parent', 'child-a', 'biological'),
    parentEdge('parent', 'child-b', 'biological', 'deceased'),
    parentEdge('parent', 'child-c', 'biological', 'deceased'),
    parentEdge('child-b', 'grand-b1', 'biological'),
    parentEdge('child-b', 'grand-b2', 'biological'),
  ];
  if (withSpouse) {
    people.push(living('spouse'));
    edges.push(pairEdge('parent', 'spouse', 'spouse'));
  }
  return progress(makeWorld(people, edges));
}

const branches = branchWorld(false);
const branchEstate = recordFor(branches, 'parent');
assert(awarded(branchEstate, 'child-a') === 50000, 'the living branch did not take half');
assert(awarded(branchEstate, 'grand-b1') === 25000 && awarded(branchEstate, 'grand-b2') === 25000, 'a per-stirpes branch was not split equally');
assert(awarded(branchEstate, 'child-b') === 0 && awarded(branchEstate, 'child-c') === 0, 'an empty or dead branch kept a share');
assert(branchEstate.distributions.length === 3, 'the empty branch stayed in the distribution');

const withSpouse = branchWorld(true);
const spouseEstate = recordFor(withSpouse, 'parent');
assert(awarded(spouseEstate, 'spouse') === 50000, 'the spouse did not receive half');
assert(awarded(spouseEstate, 'child-a') === 25000, 'the descendant half was not split across branches');
assert(awarded(spouseEstate, 'grand-b1') === 12500 && awarded(spouseEstate, 'grand-b2') === 12500, 'grandchildren did not split only the descendant half');
assert(awarded(spouseEstate, 'child-c') === 0, 'the empty branch consumed part of the descendant half');

const remainder = progress(
  makeWorld(
    [dying('parent', { cash: 100 }), living('ann'), living('bea'), living('cy')],
    [parentEdge('parent', 'ann', 'biological'), parentEdge('parent', 'bea', 'biological'), parentEdge('parent', 'cy', 'biological')]
  )
);
const remainderEstate = recordFor(remainder, 'parent');
assert(awarded(remainderEstate, 'ann') === 34 && awarded(remainderEstate, 'bea') === 33 && awarded(remainderEstate, 'cy') === 33, 'remainder units did not follow id order');
assert(cash(remainder, 'ann') + cash(remainder, 'bea') + cash(remainder, 'cy') === 100, 'rounded shares did not sum to the estate');
console.log('✅ 4. Per-stirpes branches drop empty lines and keep integer shares exact.');

const insolvent = progress(
  makeWorld(
    [dying('parent', { cash: 20000, studentDebt: 35000, annualIncome: 5000, annualExpenses: 1000 }), living('child')],
    [parentEdge('parent', 'child', 'biological')]
  )
);
const insolventEstate = recordFor(insolvent, 'parent');
assert(insolventEstate.status === 'insolvent', 'a shortfall was not insolvent');
assert(
  insolventEstate.grossAssets === 20000 &&
    insolventEstate.totalLiabilities === 35000 &&
    insolventEstate.liabilitiesPaid === 20000 &&
    insolventEstate.unpaidLiabilities === 15000 &&
    insolventEstate.netDistributableEstate === 0 &&
    insolventEstate.distributions.length === 0,
  'unpaid liabilities were not written off'
);
assert(cash(insolvent, 'child') === 0, 'an insolvent estate paid an heir');
assertCleared(insolvent.npcRegistry.parent, 'insolvent parent');
assert(
  insolvent.npcRegistry.parent?.finances.annualIncome === 5000 && insolvent.npcRegistry.parent?.finances.annualExpenses === 1000,
  'income and expenses were cleared with the estate'
);

const zeroEstate = progress(
  makeWorld([dying('parent'), living('child')], [parentEdge('parent', 'child', 'biological')])
);
const zeroRecord = recordFor(zeroEstate, 'parent');
assert(zeroRecord.status === 'insolvent' && zeroRecord.escheatedToState === false && zeroRecord.escheatedAmount === 0, 'a zero estate was escheated');
assert(cash(zeroEstate, 'child') === 0, 'a zero estate paid an heir');

const escheat = progress(makeWorld([dying('alone', { cash: 5000 })]));
const escheatRecord = recordFor(escheat, 'alone');
assert(escheatRecord.status === 'escheated' && escheatRecord.escheatedAmount === 5000 && escheatRecord.escheatedToState === true, 'an heirless estate did not escheat');

const converted = progress(
  makeWorld([dying('parent', { cash: 100 }), living('child', { currency: 'PKR' })], [parentEdge('parent', 'child', 'biological')])
);
const convertedShare = recordFor(converted, 'parent').distributions[0];
assert(convertedShare?.amountInSourceCurrency === 100 && convertedShare.amountAwardedInTargetCurrency === 27800, 'PKR conversion was wrong');
assert(convertedShare?.sourceCurrency === 'USD' && convertedShare.targetCurrency === 'PKR' && convertedShare.exchangeRateApplied === 278, 'conversion metadata was wrong');
assert(cash(converted, 'child') === 27800, 'the heir was credited in the source currency');

const playerWorld = progress(makeWorld([dying('ada', { cash: 25000 })], [pairEdge('ada', PLAYER_ID, 'spouse')]));
const playerShare = recordFor(playerWorld, 'ada').distributions.find((share) => share.beneficiaryId === PLAYER_ID);
assert(playerShare?.amountInSourceCurrency === 25000 && playerShare.exchangeRateApplied === 1, 'the player share was not recorded in source currency');
assert(playerWorld.npcRegistry[PLAYER_ID] === undefined, 'a player profile was created');
assert(cash(playerWorld, 'ada') === 0, 'the player estate stayed on the deceased NPC');
assertCleared(playerWorld.npcRegistry.ada, 'player spouse estate');
console.log('✅ 5. Insolvency, escheat, currency conversion, and player shares stay separate.');

const recovered = progress(
  makeWorld(
    [makeNpc({ id: 'parent', age: 60, health: 10, alive: false, deathYear: 2022, finances: { cash: 8000 } }), living('child')],
    [parentEdge('parent', 'child', 'biological', 'deceased')]
  )
);
const recoveredEstate = recordFor(recovered, 'parent');
assert(recovered.npcRegistry.parent?.age === 60 && recovered.npcRegistry.parent?.health === 10, 'a previously dead NPC was rolled again');
assert(recoveredEstate.settlementYear === 2022 && recoveredEstate.id === deterministicUUID('npc-estate', 'parent', 2022), 'recovery used the current year');
assert(awarded(recoveredEstate, 'child') === 8000 && cash(recovered, 'child') === 8000, 'a previously dead estate was not paid');
const repeatedRecovery = progress(recovered, YEAR);
assert(repeatedRecovery === recovered, 'repeating the recovery year rebuilt the world');
const laterRecovery = progress(recovered, YEAR + 1);
assert(cash(laterRecovery, 'child') === 8000 && Object.keys(laterRecovery.inheritanceRecords).length === 1, 'recovery paid a second time');

const missingYear = progress(
  makeWorld(
    [makeNpc({ id: 'parent', age: 60, alive: false, finances: { cash: 1500 } }), living('child')],
    [parentEdge('parent', 'child', 'biological', 'deceased')]
  )
);
assert(recordFor(missingYear, 'parent').settlementYear === YEAR, 'a missing death year did not use the simulation year');
assert(missingYear.npcRegistry.parent?.deathYear === YEAR && cash(missingYear, 'child') === 1500, 'a missing death year skipped settlement');

const prior: InheritanceRecord = {
  id: 'prior-estate',
  deceasedNpcId: 'parent',
  settlementYear: 2020,
  currency: 'USD',
  grossAssets: 5000,
  totalLiabilities: 0,
  liabilitiesPaid: 0,
  unpaidLiabilities: 0,
  netDistributableEstate: 5000,
  distributions: [
    {
      beneficiaryId: 'child',
      relationshipToDeceased: 'child',
      sourceCurrency: 'USD',
      targetCurrency: 'USD',
      exchangeRateApplied: 1,
      amountInSourceCurrency: 5000,
      amountAwardedInTargetCurrency: 5000,
    },
  ],
  escheatedToState: false,
  escheatedAmount: 0,
  status: 'settled',
};
const existing = progress(
  makeWorld(
    [makeNpc({ id: 'parent', age: 60, alive: false, deathYear: 2020, finances: { cash: 5000 } }), living('child')],
    [parentEdge('parent', 'child', 'biological', 'deceased')],
    20261110,
    { parent: prior }
  )
);
assert(existing.inheritanceRecords.parent?.id === 'prior-estate', 'an existing estate record was replaced');
assert(cash(existing, 'child') === 0 && cash(existing, 'parent') === 5000, 'an existing record paid again');
assert(existing.npcRegistry.parent?.estateSettled === true, 'an existing record did not repair the settled flag');
assert(cash(progress(existing, YEAR + 1), 'child') === 0, 'the next year paid an already recorded estate');

const flagged = progress(
  makeWorld([
    makeNpc({ id: 'parent', age: 60, alive: false, deathYear: 2019, estateSettled: true, finances: { cash: 4000 } }),
    living('child'),
  ])
);
assert(flagged.inheritanceRecords.parent === undefined && cash(flagged, 'child') === 0 && cash(flagged, 'parent') === 4000, 'a settled flag created a second estate');

const orderedPeople = [dying('parent', { cash: 1000, savings: 2000, realEstateValue: 3000, businessEquity: 4000 }), living('child')];
const orderedEdges = [parentEdge('parent', 'child', 'biological')];
const forward = progress(makeWorld(orderedPeople, orderedEdges));
const reversed = progress(makeWorld([...orderedPeople].reverse(), [...orderedEdges].reverse()));
assert(JSON.stringify(reversed.inheritanceRecords) === JSON.stringify(forward.inheritanceRecords), 'estate records depended on insertion order');
assert(cash(reversed, 'child') === cash(forward, 'child'), 'heir cash depended on insertion order');
const immutable = makeWorld([living('youth')]);
const before = JSON.stringify(immutable);
const once = progress(immutable);
assert(JSON.stringify(immutable) === before, 'the mortality pass mutated its input');
assert(progress(once, YEAR) === once, 'repeating the mortality year returned a new world');
console.log('✅ 6. Recovery, existing records, and repeated years pay an estate once.');

console.log('--- ALL NPC INHERITANCE MILESTONE 5 TESTS PASSED ---\n');
