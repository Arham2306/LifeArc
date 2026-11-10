import { DEFAULT_POPULATION_CONFIG } from '../services/migrationService';
import { deterministicUUID } from '../services/seededPrngService';
import {
  applyNpcRelocation,
  progressNpcSocialYear,
  reconcileSocialEdgesAfterDeath,
} from '../services/autonomousSocialService';
import type {
  NpcCareerState,
  NpcEducationState,
  NpcFinanceState,
  NpcLifestyle,
  NpcPersonality,
  NpcProfile,
  NpcTier,
  ParticipantRoleLabel,
  RelationshipCategory,
  RelationshipEdge,
  RelationshipEpisode,
  WorldSimulationState,
} from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const PLAYER_ID = 'player-1';
const YEAR = 2030;

function personality(overrides: Partial<NpcPersonality> = {}): NpcPersonality {
  return {
    openness: 55,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 55,
    neuroticism: 35,
    ambition: 40,
    generosity: 45,
    loyalty: 40,
    riskTolerance: 35,
    empathy: 50,
    sociability: 50,
    patience: 55,
    materialism: 30,
    ...overrides,
  };
}

const FRIENDLY = personality({
  openness: 90,
  extraversion: 88,
  agreeableness: 90,
  neuroticism: 15,
  empathy: 92,
  sociability: 93,
  patience: 80,
  loyalty: 75,
});

const MODERATE = personality({
  agreeableness: 60,
  neuroticism: 30,
  empathy: 50,
  sociability: 50,
  patience: 60,
  loyalty: 40,
});

const DISAGREEABLE = personality({
  agreeableness: 8,
  neuroticism: 92,
  empathy: 25,
  sociability: 30,
  patience: 12,
  loyalty: 20,
});

const HELPFUL = personality({
  empathy: 90,
  sociability: 40,
  agreeableness: 65,
  neuroticism: 25,
  patience: 70,
});

const SOCIAL = personality({
  sociability: 92,
  empathy: 40,
  agreeableness: 60,
  neuroticism: 25,
  patience: 60,
});

const RECONCILING = personality({
  empathy: 94,
  agreeableness: 70,
  neuroticism: 20,
  sociability: 40,
  patience: 75,
});

function lifestyle(shared = false): NpcLifestyle {
  return {
    diet: 'standard',
    fitnessHabit: 'casual',
    substances: { alcohol: 'none', smoking: false },
    interests: shared ? ['music', 'books'] : [],
    hobbies: shared ? ['chess'] : [],
  };
}

function finances(cash = 100): NpcFinanceState {
  return {
    currency: 'USD',
    cash,
    savings: 0,
    realEstateValue: 0,
    businessEquity: 0,
    studentDebt: 0,
    mortgageBalance: 0,
    otherLiabilities: 0,
    annualIncome: 0,
    annualExpenses: 0,
    netWorth: cash,
  };
}

function education(): NpcEducationState {
  return { currentStage: 'graduated', schoolName: null, grades: 80, history: [] };
}

function career(): NpcCareerState {
  return {
    jobId: null,
    title: 'Unemployed',
    companyName: '',
    occupation: 'Unemployed',
    salary: 0,
    performance: 50,
    yearsInRole: 0,
    isRetired: false,
    pensionAnnual: 0,
    history: [],
  };
}

function makeNpc(params: {
  id: string;
  age?: number;
  tier?: NpcTier;
  city?: string;
  country?: string;
  personality?: NpcPersonality;
  sharedLifestyle?: boolean;
  alive?: boolean;
  cash?: number;
  firstName?: string;
}): NpcProfile {
  const age = params.age ?? 30;
  const country = params.country ?? 'USA';
  const city = params.city ?? 'Boston';
  return {
    id: params.id,
    tier: params.tier ?? 'core',
    firstName: params.firstName ?? params.id,
    lastName: 'Test',
    gender: 'female',
    biologicalGender: 'female',
    age,
    birthYear: YEAR - age,
    isAlive: params.alive ?? true,
    location: {
      country,
      city,
      residenceHistory: [{ country, city, startYear: YEAR - age, reason: 'birth' }],
    },
    identityResolutionStatus: 'canonical',
    looks: 50,
    smarts: 50,
    health: 80,
    happiness: 60,
    fertility: 50,
    craziness: 10,
    personality: params.personality ?? MODERATE,
    lifestyle: lifestyle(params.sharedLifestyle ?? false),
    goals: [
      {
        id: `${params.id}-goal`,
        category: 'lifestyle',
        title: 'Keep a steady routine',
        priority: 'secondary',
        progress: 10,
        isCompleted: false,
        isAbandoned: false,
      },
    ],
    healthConditions: [],
    education: education(),
    career: career(),
    finances: finances(params.cash ?? 100),
    lifeHistory: [],
    adoptiveParentIds: [],
    stepParentIds: [],
    isAdopted: false,
  };
}

function rolesFor(category: RelationshipCategory): [ParticipantRoleLabel, ParticipantRoleLabel] {
  if (category === 'parent_child') return ['parent', 'child'];
  return [category as ParticipantRoleLabel, category as ParticipantRoleLabel];
}

function makeEdge(params: {
  id: string;
  a: string;
  b: string;
  category: RelationshipCategory;
  status?: RelationshipEdge['status'];
  trust?: number;
  affection?: number;
  respect?: number;
  yearsTogether?: number;
  romance?: number;
  episodes?: RelationshipEpisode[];
}): RelationshipEdge {
  const aFirst = params.a.localeCompare(params.b) <= 0;
  const participantAId = aFirst ? params.a : params.b;
  const participantBId = aFirst ? params.b : params.a;
  const [roleA, roleB] = rolesFor(params.category);
  const category = params.category;
  return {
    id: params.id,
    participantAId,
    participantBId,
    category,
    roleForA: aFirst ? roleA : roleB,
    roleForB: aFirst ? roleB : roleA,
    lineageRelation: 'none',
    status: params.status ?? 'active',
    trust: params.trust ?? 50,
    affection: params.affection ?? 50,
    respect: params.respect ?? 50,
    romance: params.romance ?? 0,
    compatibility: 50,
    yearsTogether: params.yearsTogether ?? 1,
    lastInteractedYear: 2028,
    episodes: params.episodes ?? [
      { episodeId: `${params.id}-open`, category, startYear: 2024 },
    ],
  };
}

function makeWorld(npcs: NpcProfile[], edges: RelationshipEdge[] = []): WorldSimulationState {
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
    worldSeed: 20261110,
    simulationVersion: 1,
    lastSimulatedYear: 2029,
    lastSimulationTurnId: 'social-test',
    familyWealth: 'modest',
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

function progress(world: WorldSimulationState, year = YEAR): WorldSimulationState {
  return progressNpcSocialYear(world, year, PLAYER_ID);
}

function edgesBetween(world: WorldSimulationState, a: string, b: string): RelationshipEdge[] {
  const [left, right] = a.localeCompare(b) <= 0 ? [a, b] : [b, a];
  return Object.values(world.relationshipsById).filter(
    (edge) => edge.participantAId === left && edge.participantBId === right
  );
}

function activePlatonic(world: WorldSimulationState, npcId: string): RelationshipEdge[] {
  const categories = new Set([
    'friend',
    'best_friend',
    'classmate',
    'coworker',
    'roommate',
    'rival',
    'enemy',
  ]);
  return Object.values(world.relationshipsById).filter(
    (edge) =>
      edge.status === 'active' &&
      categories.has(edge.category) &&
      (edge.participantAId === npcId || edge.participantBId === npcId) &&
      edge.participantAId !== PLAYER_ID &&
      edge.participantBId !== PLAYER_ID
  );
}

function openEpisodes(edge: RelationshipEdge): RelationshipEpisode[] {
  return edge.episodes.filter((episode) => episode.endYear === undefined);
}

function assertSystemsUntouched(before: WorldSimulationState, after: WorldSimulationState): void {
  for (const id of Object.keys(before.npcRegistry)) {
    const left = before.npcRegistry[id];
    const right = after.npcRegistry[id];
    assert(left && right, `missing npc ${id}`);
    assert(left.finances.cash === right.finances.cash, `${id} cash changed`);
    assert(left.age === right.age, `${id} age changed`);
    assert(JSON.stringify(left.goals) === JSON.stringify(right.goals), `${id} goals changed`);
    assert(
      JSON.stringify(left.education) === JSON.stringify(right.education),
      `${id} education changed`
    );
    assert(JSON.stringify(left.career) === JSON.stringify(right.career), `${id} career changed`);
  }
}

function friendlyPair(aId: string, bId: string, ageA = 30, ageB = 30): [NpcProfile, NpcProfile] {
  return [
    makeNpc({ id: aId, age: ageA, personality: FRIENDLY, sharedLifestyle: true, cash: 4242 }),
    makeNpc({ id: bId, age: ageB, personality: FRIENDLY, sharedLifestyle: true, cash: 4242 }),
  ];
}

console.log('\n--- STARTING NPC SOCIAL AUTONOMY MILESTONE 3 TESTS ---');

// 1. Shuffle invariance
{
  const [ada, bea] = friendlyPair('ada', 'bea');
  const cam = makeNpc({
    id: 'cam',
    tier: 'background',
    personality: personality({ loyalty: 20 }),
  });
  const decay = makeEdge({ id: 'decay-ada-cam', a: 'ada', b: 'cam', category: 'friend', trust: 40, affection: 40, respect: 40 });
  const world = makeWorld([ada, bea, cam], [decay]);
  const before = JSON.stringify(world);
  const forward = progress(world);
  assert(JSON.stringify(world) === before, 'social year mutated its input');
  const reversed: Record<string, NpcProfile> = {};
  for (const id of ['cam', 'bea', 'ada']) {
    const npc = world.npcRegistry[id];
    if (npc) reversed[id] = npc;
  }
  const backward = progress({ ...world, npcRegistry: reversed });
  assert(JSON.stringify(forward) === JSON.stringify(backward), 'shuffled registry changed the social result');
  console.log('✅ 1. Shuffled NPC registries produce the same social year.');
}

// 2. Idempotency
{
  const [ada, bea] = friendlyPair('ada', 'bea');
  const once = progress(makeWorld([ada, bea]));
  assert(progressNpcSocialYear(once, YEAR, PLAYER_ID) === once, 'repeating the year changed the world');
  assert(progressNpcSocialYear(once, YEAR - 1, PLAYER_ID) === once, 'an earlier year changed the world');
  assert(once.lastSocialSimYear === YEAR, 'social year was not recorded');
  console.log('✅ 2. Repeating or rewinding the social year is a no-op.');
}

// 3. Player immutability
{
  const [ada, bea] = friendlyPair('ada', 'bea');
  const playerEdge = makeEdge({
    id: 'player-edge',
    a: PLAYER_ID,
    b: 'ada',
    category: 'friend',
    trust: 77,
    affection: 66,
    respect: 55,
  });
  const world = makeWorld([ada, bea], [playerEdge]);
  const character = {
    cash: 12345,
    stats: { happiness: 70 },
    relationships: [{ id: 'legacy-friend', relationshipType: 'friend' }],
    partner: { id: 'legacy-partner' },
    exPartners: [] as const,
  };
  const after = progress(world);
  assertSystemsUntouched(world, after);
  assert(character.cash === 12345, 'player cash changed');
  assert(character.relationships[0]?.id === 'legacy-friend', 'player relationships changed');
  assert(character.partner.id === 'legacy-partner', 'player partner changed');
  assert(character.exPartners.length === 0, 'player exes changed');
  const kept = after.relationshipsById['player-edge'];
  assert(kept?.trust === 77 && kept.affection === 66 && kept.respect === 55, 'player edge was edited');
  assert(kept.category === 'friend' && kept.status === 'active', 'player edge category changed');
  console.log('✅ 3. The social year leaves the player profile and player edge untouched.');
}

// 4. Formation rules
{
  const formed = progress(makeWorld(friendlyPair('ada', 'bea')));
  const created = edgesBetween(formed, 'ada', 'bea');
  assert(created.length === 1, 'a compatible pair did not form exactly one edge');
  const edge = created[0];
  assert(edge, 'missing formed edge');
  const [first, second] = 'ada'.localeCompare('bea') <= 0 ? ['ada', 'bea'] : ['bea', 'ada'];
  assert(edge.id === deterministicUUID('canonical-rel-edge', first, second), 'new edge id is not deterministic');
  assert(edge.category === 'friend' && edge.status === 'active' && edge.romance === 0, 'new friendship was not a platonic friend edge');
  assert(edge.yearsTogether === 0, 'a new friendship was developed in its first year');
  const expectedMeter = Math.max(35, Math.min(60, 40 + Math.round(edge.compatibility / 10)));
  assert(
    edge.trust === expectedMeter && edge.affection === expectedMeter && edge.respect === expectedMeter,
    'a new friendship was metered again in its first year'
  );
  assert(openEpisodes(edge).length === 1, 'a new friendship did not open exactly one episode');
  for (const id of ['ada', 'bea']) {
    const events = formed.npcRegistry[id]?.lifeHistory.filter((event) => event.type === 'relationship_started') ?? [];
    assert(events.length === 1 && events[0]?.referenceId === edge.id, `${id} missing relationship_started`);
  }

  const blockedAges: Array<[number, number, string]> = [
    [5, 5, 'under six'],
    [10, 14, 'minor gap'],
    [17, 18, 'minor with adult'],
    [30, 43, 'adult gap'],
  ];
  for (const [ageA, ageB, label] of blockedAges) {
    const result = progress(makeWorld(friendlyPair('ada', 'bea', ageA, ageB)));
    assert(edgesBetween(result, 'ada', 'bea').length === 0, `${label} formed a friendship`);
  }
  const allowedGap = progress(makeWorld(friendlyPair('ada', 'bea', 30, 42)));
  assert(edgesBetween(allowedGap, 'ada', 'bea').length === 1, 'an adult gap of 12 did not form');
  const children = progress(makeWorld(friendlyPair('ada', 'bea', 10, 12)));
  assert(edgesBetween(children, 'ada', 'bea').length === 1, 'compatible children did not form a friendship');
  assert(edgesBetween(children, 'ada', 'bea')[0]?.romance === 0, 'a child friendship gained romance');

  const distant = progress(makeWorld([
    makeNpc({ id: 'ada', personality: FRIENDLY, sharedLifestyle: true, city: 'Boston' }),
    makeNpc({ id: 'bea', personality: FRIENDLY, sharedLifestyle: true, city: 'Seattle' }),
  ]));
  assert(edgesBetween(distant, 'ada', 'bea').length === 0, 'different cities formed a friendship');

  const background = progress(makeWorld([
    makeNpc({ id: 'ada', personality: FRIENDLY, sharedLifestyle: true }),
    makeNpc({ id: 'bea', tier: 'background', personality: FRIENDLY, sharedLifestyle: true }),
  ]));
  assert(edgesBetween(background, 'ada', 'bea').length === 0, 'a background NPC formed a friendship');

  const blockedCategories = [
    'parent_child',
    'sibling',
    'dating',
    'fiance',
    'spouse',
    'ex',
    'former_spouse',
    'deceased_spouse',
  ] as const;
  for (const category of blockedCategories) {
    const status =
      category === 'deceased_spouse' ? 'deceased' : category === 'ex' || category === 'former_spouse' ? 'former' : 'active';
    const result = progress(makeWorld(friendlyPair('ada', 'bea'), [
      makeEdge({ id: `blocked-${category}`, a: 'ada', b: 'bea', category, status, trust: 61 }),
    ]));
    const found = edgesBetween(result, 'ada', 'bea');
    assert(found.length === 1, `${category} produced another edge`);
    assert(found[0]?.category === category && found[0].trust === 61, `${category} was rewritten`);
  }

  const three = progress(makeWorld([
    makeNpc({ id: 'n-a', personality: FRIENDLY, sharedLifestyle: true }),
    makeNpc({ id: 'n-b', personality: FRIENDLY, sharedLifestyle: true }),
    makeNpc({ id: 'n-c', personality: FRIENDLY, sharedLifestyle: true }),
  ]));
  assert(Object.keys(three.relationshipsById).length === 1, 'one person received two new friendships');

  const four = progress(makeWorld(['n-a', 'n-b', 'n-c', 'n-d'].map((id) =>
    makeNpc({ id, personality: FRIENDLY, sharedLifestyle: true })
  )));
  assert(Object.keys(four.relationshipsById).length === 2, 'disjoint pairs did not both form');
  for (const id of ['n-a', 'n-b', 'n-c', 'n-d']) {
    const degree = Object.values(four.relationshipsById).filter(
      (edge) => edge.participantAId === id || edge.participantBId === id
    ).length;
    assert(degree === 1, `${id} did not end the year with exactly one new friendship`);
  }
  console.log('✅ 4. Formation follows age, distance, category, and one-friendship limits.');
}

// 5. Former edges do not consume a slot; a full active list still blocks reactivation.
{
  const ada = makeNpc({ id: 'ada', personality: FRIENDLY, sharedLifestyle: true });
  const bea = makeNpc({ id: 'bea', personality: FRIENDLY, sharedLifestyle: true });
  const cam = makeNpc({ id: 'cam', personality: FRIENDLY, sharedLifestyle: true });
  const formers = Array.from({ length: 6 }, (_, index) => {
    const id = `former-${index}`;
    return {
      npc: makeNpc({ id, tier: 'background' }),
      edge: makeEdge({
        id: `former-edge-${index}`,
        a: 'ada',
        b: id,
        category: 'friend',
        status: 'former',
        episodes: [{ episodeId: `closed-${index}`, category: 'friend', startYear: 2020, endYear: 2028, endReason: 'drifted' }],
      }),
    };
  });
  const formedDespiteFormers = progress(makeWorld(
    [ada, cam, ...formers.map((item) => item.npc)],
    formers.map((item) => item.edge)
  ));
  assert(edgesBetween(formedDespiteFormers, 'ada', 'cam').length === 1, 'former edges were counted against the six-edge cap');
  assert(
    formers.every((item) => formedDespiteFormers.relationshipsById[item.edge.id]?.status === 'former'),
    'former edges were deleted or reactivated to make room'
  );

  const dummies = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, index) => {
      const id = `${prefix}-${index}`;
      return {
        npc: makeNpc({ id, tier: 'background', personality: personality({ loyalty: 20 }) }),
        edge: makeEdge({
          id: `${prefix}-edge-${index}`,
          a: 'ada',
          b: id,
          category: 'friend',
          trust: 80,
          affection: 80,
          respect: 80,
        }),
      };
    });

  const five = dummies(5, 'slot');
  const former = makeEdge({
    id: 'keep-former',
    a: 'ada',
    b: 'bea',
    category: 'best_friend',
    status: 'former',
    trust: 5,
    affection: 5,
    respect: 5,
    episodes: [{ episodeId: 'old-best', category: 'best_friend', startYear: 2020, endYear: 2024, endReason: 'drifted' }],
  });
  const reactivated = progress(makeWorld(
    [ada, bea, ...five.map((item) => item.npc)],
    [former, ...five.map((item) => item.edge)]
  ));
  const kept = reactivated.relationshipsById['keep-former'];
  assert(kept?.status === 'active' && kept.category === 'friend', 'a free slot did not reactivate the former edge');
  assert(kept.id === 'keep-former', 'reactivation replaced the edge id');
  assert(edgesBetween(reactivated, 'ada', 'bea').length === 1, 'reactivation created a second edge');
  assert(openEpisodes(kept).length === 1, 'reactivation did not open exactly one episode');
  assert(
    kept.episodes.some((episode) => episode.episodeId === 'old-best' && episode.endYear === 2024 && episode.endReason === 'drifted'),
    'reactivation rewrote the closed episode'
  );
  assert(activePlatonic(reactivated, 'ada').length === 6, 'reactivation did not occupy the free slot');

  const six = dummies(6, 'full');
  const blocked = progress(makeWorld(
    [ada, bea, ...six.map((item) => item.npc)],
    [former, ...six.map((item) => item.edge)]
  ));
  assert(blocked.relationshipsById['keep-former']?.status === 'former', 'a full active list still reactivated a former edge');
  assert(blocked.relationshipsById['keep-former']?.id === 'keep-former', 'a rejected reactivation changed the edge id');
  assert(activePlatonic(blocked, 'ada').length === 6, 'the active cap changed while reactivation was blocked');

  const classmate = makeEdge({
    id: 'former-classmate',
    a: 'ada',
    b: 'bea',
    category: 'classmate',
    status: 'former',
    episodes: [{ episodeId: 'old-class', category: 'classmate', startYear: 2022, endYear: 2026, endReason: 'drifted' }],
  });
  const restored = progress(makeWorld([ada, bea], [classmate]));
  assert(
    restored.relationshipsById['former-classmate']?.status === 'active' &&
      restored.relationshipsById['former-classmate']?.category === 'classmate',
    'a former classmate did not reopen as a classmate'
  );

  const rival = makeEdge({
    id: 'former-rival',
    a: 'ada',
    b: 'bea',
    category: 'rival',
    status: 'former',
    episodes: [{ episodeId: 'old-rival', category: 'rival', startYear: 2022, endYear: 2026, endReason: 'drifted' }],
  });
  const notRestored = progress(makeWorld([ada, bea], [rival]));
  assert(notRestored.relationshipsById['former-rival']?.status === 'former', 'a former rival was reactivated by formation');
  assert(edgesBetween(notRestored, 'ada', 'bea').length === 1, 'a former rival gained a second edge');
  console.log('✅ 5. Former edges do not fill the cap, and reactivation still needs a free slot.');
}

// 6. Background decay only, historical and dead NPCs omitted
{
  const decayed = progress(makeWorld(
    [
      makeNpc({ id: 'ada', tier: 'background', personality: personality({ loyalty: 10 }) }),
      makeNpc({ id: 'bea', tier: 'background', personality: personality({ loyalty: 10 }) }),
    ],
    [makeEdge({ id: 'bg', a: 'ada', b: 'bea', category: 'friend', trust: 50, affection: 50, respect: 50 })]
  ));
  const edge = decayed.relationshipsById.bg;
  assert(edge?.trust === 48 && edge.affection === 48 && edge.respect === 50, 'background decay was not exactly 2');
  assert(edge.category === 'friend', 'background decay changed the category');
  assert((decayed.npcRegistry.ada?.lifeHistory.length ?? 1) === 0, 'background decay started a relationship');

  const loyal = progress(makeWorld(
    [
      makeNpc({ id: 'ada', tier: 'background', personality: personality({ loyalty: 90 }) }),
      makeNpc({ id: 'bea', tier: 'background', personality: personality({ loyalty: 90 }) }),
    ],
    [makeEdge({ id: 'loyal', a: 'ada', b: 'bea', category: 'friend', trust: 50, affection: 40, respect: 30 })]
  ));
  assert(loyal.relationshipsById.loyal?.trust === 49 && loyal.relationshipsById.loyal?.affection === 39, 'loyalty did not reduce neglect');

  const best = progress(makeWorld(
    [
      makeNpc({ id: 'ada', tier: 'background', personality: personality({ loyalty: 5 }) }),
      makeNpc({ id: 'bea', tier: 'background', personality: personality({ loyalty: 5 }) }),
    ],
    [makeEdge({ id: 'best', a: 'ada', b: 'bea', category: 'best_friend', trust: 50, affection: 50, respect: 50 })]
  ));
  assert(best.relationshipsById.best?.trust === 49 && best.relationshipsById.best?.category === 'best_friend', 'best friends did not lose exactly 1');

  const historical = progress(makeWorld(
    [
      makeNpc({ id: 'ada', tier: 'historical' }),
      makeNpc({ id: 'bea' }),
    ],
    [makeEdge({ id: 'hist', a: 'ada', b: 'bea', category: 'friend', trust: 44, affection: 44, respect: 44 })]
  ));
  assert(historical.relationshipsById.hist?.trust === 44, 'a historical NPC was decayed');
  assert(edgesBetween(progress(makeWorld([
    makeNpc({ id: 'ada', tier: 'historical', personality: FRIENDLY, sharedLifestyle: true }),
    makeNpc({ id: 'bea', personality: FRIENDLY, sharedLifestyle: true }),
  ])), 'ada', 'bea').length === 0, 'a historical NPC formed a friendship');

  const dead = progress(makeWorld(
    [
      makeNpc({ id: 'ada', alive: false }),
      makeNpc({ id: 'bea' }),
    ],
    [makeEdge({ id: 'dead', a: 'ada', b: 'bea', category: 'friend', trust: 44, affection: 44, respect: 44 })]
  ));
  assert(dead.relationshipsById.dead?.trust === 44, 'a dead NPC was included in the social year');
  console.log('✅ 6. Background pairs only decay, and historical or dead NPCs are omitted.');
}

// 7. Same-city interaction, remote limits, and category stability
{
  const local = progress(makeWorld(
    [
      makeNpc({ id: 'ada', personality: MODERATE }),
      makeNpc({ id: 'bea', personality: MODERATE }),
    ],
    [makeEdge({ id: 'local', a: 'ada', b: 'bea', category: 'friend', trust: 60, affection: 60, respect: 60, yearsTogether: 1 })]
  ));
  const localEdge = local.relationshipsById.local;
  assert(localEdge && localEdge.trust >= 62 && localEdge.trust <= 64, 'same-city conversation did not gain a little trust');
  assert(localEdge.affection === 60 && localEdge.respect === 60, 'same-city conversation also applied distance or another action');
  assert(localEdge.yearsTogether === 2 && localEdge.lastInteractedYear === YEAR, 'interaction did not record the year');

  const hangout = progress(makeWorld(
    [
      makeNpc({ id: 'ada', personality: SOCIAL, sharedLifestyle: true }),
      makeNpc({ id: 'bea', personality: SOCIAL, sharedLifestyle: true }),
    ],
    [makeEdge({ id: 'hang', a: 'ada', b: 'bea', category: 'friend', trust: 50, affection: 50, respect: 50 })]
  ));
  const hangEdge = hangout.relationshipsById.hang;
  assert(hangEdge && hangEdge.affection >= 53 && hangEdge.affection <= 55, 'shared time did not raise affection');
  assert(hangEdge.trust === 50 && hangEdge.respect === 50 && hangEdge.category === 'friend', 'shared time changed more than affection');

  const remote = progress(makeWorld(
    [
      makeNpc({ id: 'ada', personality: MODERATE, city: 'Boston' }),
      makeNpc({ id: 'bea', personality: MODERATE, city: 'Seattle' }),
    ],
    [makeEdge({ id: 'remote', a: 'ada', b: 'bea', category: 'friend', trust: 60, affection: 60, respect: 60, yearsTogether: 1 })]
  ));
  const remoteEdge = remote.relationshipsById.remote;
  assert(remoteEdge && remoteEdge.affection < 60 && remoteEdge.affection >= 57, 'distance decay did not apply exactly once');
  assert(remoteEdge.respect === 60 && remoteEdge.category === 'friend' && remoteEdge.status === 'active', 'a remote pair took a local-only action');

  for (const category of ['classmate', 'coworker', 'roommate'] as const) {
    const helped = progress(makeWorld(
      [
        makeNpc({ id: 'ada', personality: HELPFUL }),
        makeNpc({ id: 'bea', personality: HELPFUL }),
      ],
      [makeEdge({ id: category, a: 'ada', b: 'bea', category, trust: 40, affection: 40, respect: 40 })]
    ));
    const helpedEdge = helped.relationshipsById[category];
    assert(helpedEdge && helpedEdge.category === category, `${category} changed category`);
    assert(helpedEdge.respect > 40 && helpedEdge.trust > 40, `${category} help did not raise trust and respect`);
    assert(openEpisodes(helpedEdge).length === 1 && helpedEdge.episodes.length === 1, `${category} opened a new episode`);
  }

  const stable = progress(makeWorld(
    [
      makeNpc({ id: 'ada', personality: DISAGREEABLE }),
      makeNpc({ id: 'bea', personality: DISAGREEABLE }),
    ],
    [makeEdge({ id: 'class', a: 'ada', b: 'bea', category: 'classmate', trust: 30, affection: 60, respect: 60 })]
  ));
  const classEdge = stable.relationshipsById.class;
  assert(classEdge && classEdge.category === 'classmate' && classEdge.trust < 25, 'a classmate became a rival');
  assert(classEdge.episodes.length === 1 && openEpisodes(classEdge).length === 1, 'a stable category opened a conflict episode');
  console.log('✅ 7. Local, remote, and stable-category interactions follow the social rules.');
}

// 8. Friend, rival, enemy, reconciliation, and best-friend limits
{
  const promoted = progress(makeWorld(
    [
      makeNpc({ id: 'ada', personality: MODERATE }),
      makeNpc({ id: 'bea', personality: MODERATE }),
    ],
    [makeEdge({
      id: 'promote',
      a: 'ada',
      b: 'bea',
      category: 'friend',
      trust: 80,
      affection: 80,
      respect: 80,
      yearsTogether: 2,
    })]
  ));
  const best = promoted.relationshipsById.promote;
  assert(best?.category === 'best_friend', 'a long close friendship did not become a best friendship');
  assert(best.episodes.length === 2, 'promotion did not keep one closed and one open episode');
  assert(best.episodes[0]?.endReason === 'deepened' && best.episodes[0].endYear === YEAR, 'promotion did not close the old episode as deepened');
  assert(openEpisodes(best).length === 1 && openEpisodes(best)[0]?.category === 'best_friend', 'promotion left the wrong episode open');

  const rival = progress(makeWorld(
    [
      makeNpc({ id: 'ada', personality: DISAGREEABLE }),
      makeNpc({ id: 'bea', personality: DISAGREEABLE }),
    ],
    [makeEdge({ id: 'rival', a: 'ada', b: 'bea', category: 'friend', trust: 30, affection: 55, respect: 55 })]
  ));
  const rivalEdge = rival.relationshipsById.rival;
  assert(rivalEdge?.category === 'rival' && rivalEdge.trust < 25, 'a bitter disagreement did not become a rivalry');
  assert(rivalEdge.episodes[0]?.endReason === 'conflict' && openEpisodes(rivalEdge).length === 1, 'rivalry did not close one episode and open one');

  const enemy = progress(makeWorld(
    [
      makeNpc({ id: 'ada', personality: DISAGREEABLE }),
      makeNpc({ id: 'bea', personality: DISAGREEABLE }),
    ],
    [makeEdge({ id: 'enemy', a: 'ada', b: 'bea', category: 'rival', trust: 20, affection: 50, respect: 50 })]
  ));
  const enemyEdge = enemy.relationshipsById.enemy;
  assert(enemyEdge?.category === 'enemy' && enemyEdge.trust < 15, 'a further disagreement did not become an enmity');
  assert(enemyEdge.episodes[0]?.endReason === 'conflict' && openEpisodes(enemyEdge).length === 1, 'enmity episode was not singular');

  const repaired = progress(makeWorld(
    [
      makeNpc({ id: 'ada', personality: RECONCILING }),
      makeNpc({ id: 'bea', personality: RECONCILING }),
    ],
    [makeEdge({ id: 'repair', a: 'ada', b: 'bea', category: 'enemy', trust: 10, affection: 10, respect: 10 })]
  ));
  const repairEdge = repaired.relationshipsById.repair;
  assert(repairEdge?.category === 'friend', 'reconciliation did not restore a friendship');
  assert(repairEdge.trust === 48 && repairEdge.affection === 46 && repairEdge.respect === 45, 'reconciliation meters were not in the mid-40s');
  assert(repairEdge.episodes[0]?.endReason === 'reconciled' && openEpisodes(repairEdge).length === 1, 'reconciliation episodes were wrong');
  assert(
    repaired.npcRegistry.ada?.lifeHistory.some((event) => event.type === 'reconciliation' && event.referenceId === 'repair'),
    'reconciliation did not record a life event'
  );

  const protectedBest = progress(makeWorld(
    [
      makeNpc({ id: 'ada', personality: DISAGREEABLE }),
      makeNpc({ id: 'bea', personality: DISAGREEABLE }),
    ],
    [makeEdge({ id: 'protected', a: 'ada', b: 'bea', category: 'best_friend', trust: 40, affection: 70, respect: 70 })]
  ));
  const protectedEdge = protectedBest.relationshipsById.protected;
  assert(protectedEdge?.category === 'best_friend' && protectedEdge.status === 'active', 'a best friendship became a rival or enemy');
  assert(protectedEdge.trust < 40 && protectedEdge.episodes.length === 1, 'the disagreement was not recorded without a category change');
  console.log('✅ 8. Friendships deepen, sour, and reconcile through one episode at a time.');
}

// 9. Neglect, distance, and drift happen once
{
  const world = makeWorld(
    [
      makeNpc({ id: 'ada', tier: 'background', personality: personality({ loyalty: 10 }) }),
      makeNpc({ id: 'bea', tier: 'background', personality: personality({ loyalty: 10 }), city: 'Seattle' }),
    ],
    [makeEdge({ id: 'far', a: 'ada', b: 'bea', category: 'friend', trust: 50, affection: 40, respect: 30 })]
  );
  const once = progress(world);
  assert(once.relationshipsById.far?.trust === 47 && once.relationshipsById.far?.affection === 37, 'distance plus neglect was not applied once');
  assert(once.relationshipsById.far?.respect === 30, 'distance changed respect');
  const repeated = progress(once, YEAR);
  assert(repeated.relationshipsById.far?.trust === 47, 'distance decay ran twice in one year');
  const nextYear = progress(once, YEAR + 1);
  assert(nextYear.relationshipsById.far?.trust === 44 && nextYear.relationshipsById.far?.affection === 34, 'the next year did not decay once');

  const driftedWorld = makeWorld(
    [
      makeNpc({ id: 'ada', tier: 'background', personality: personality({ loyalty: 10 }) }),
      makeNpc({ id: 'bea', tier: 'background', personality: personality({ loyalty: 10 }) }),
    ],
    [makeEdge({ id: 'fade', a: 'ada', b: 'bea', category: 'friend', trust: 8, affection: 8, respect: 8 })]
  );
  const faded = progress(driftedWorld);
  const fadedEdge = faded.relationshipsById.fade;
  assert(fadedEdge?.status === 'former' && fadedEdge.category === 'friend', 'drift removed the edge or changed its category');
  assert(fadedEdge.episodes.length === 1 && fadedEdge.episodes[0]?.endReason === 'drifted', 'drift did not close the open episode once');
  assert(openEpisodes(fadedEdge).length === 0, 'drift left an episode open');
  const driftedEvents = faded.npcRegistry.ada?.lifeHistory.filter((event) => event.type === 'friendship_drifted') ?? [];
  assert(driftedEvents.length === 1 && driftedEvents[0]?.referenceId === 'fade', 'drift did not record one life event');
  const fadedAgain = progress(faded, YEAR + 1);
  assert(fadedAgain.relationshipsById.fade?.episodes.length === 1, 'drift closed the episode again');
  assert(fadedAgain.relationshipsById.fade?.trust === fadedEdge.trust, 'a former edge kept decaying');
  assert(
    (fadedAgain.npcRegistry.ada?.lifeHistory.filter((event) => event.type === 'friendship_drifted').length ?? 0) === 1,
    'drift recorded a second life event'
  );

  const bestFade = progress(makeWorld(
    [
      makeNpc({ id: 'ada', tier: 'background', personality: personality({ loyalty: 10 }) }),
      makeNpc({ id: 'bea', tier: 'background', personality: personality({ loyalty: 10 }) }),
    ],
    [makeEdge({ id: 'best-fade', a: 'ada', b: 'bea', category: 'best_friend', trust: 8, affection: 8, respect: 8 })]
  ));
  assert(
    bestFade.relationshipsById['best-fade']?.status === 'former' &&
      bestFade.relationshipsById['best-fade']?.category === 'best_friend',
    'a best friendship drifted through rival or enemy'
  );
  console.log('✅ 9. Neglect, distance, and drift are applied once and the edge remains.');
}

// 10. Death reconciliation
{
  const ada = makeNpc({ id: 'ada', alive: false, tier: 'historical', cash: 500 });
  const bea = makeNpc({ id: 'bea', cash: 800 });
  const cam = makeNpc({ id: 'cam', cash: 800 });
  const world = makeWorld(
    [ada, bea, cam],
    [
      makeEdge({ id: 'touch', a: 'ada', b: 'bea', category: 'friend', trust: 40 }),
      makeEdge({ id: 'player-touch', a: PLAYER_ID, b: 'ada', category: 'friend', trust: 33 }),
      makeEdge({ id: 'other', a: 'bea', b: 'cam', category: 'friend', trust: 70 }),
    ]
  );
  const before = JSON.stringify(world);
  const once = reconcileSocialEdgesAfterDeath(world, 'ada', YEAR);
  assert(JSON.stringify(world) === before, 'death reconciliation mutated the input');
  assert(once.relationshipsById.touch?.status === 'deceased', 'a touching edge stayed active');
  assert(once.relationshipsById['player-touch']?.status === 'deceased', 'a player edge was skipped');
  assert(once.relationshipsById.other?.status === 'active' && once.relationshipsById.other?.trust === 70, 'an unrelated edge changed');
  const episode = once.relationshipsById.touch?.episodes[0];
  assert(episode?.endYear === YEAR && episode.endReason === 'death' && once.relationshipsById.touch?.episodes.length === 1, 'death did not close the open episode once');
  assert(once.npcRegistry.ada?.finances.cash === 500 && once.npcRegistry.ada?.isAlive === false, 'death reconciliation edited the NPC profile');
  assert(
    once.npcRegistry.ada?.lifeHistory.filter((event) => event.type === 'death').length === 1,
    'death did not record one deduped life event'
  );
  const twice = reconcileSocialEdgesAfterDeath(once, 'ada', YEAR);
  assert(twice === once, 'a second death reconciliation changed the world');
  assert(twice.relationshipsById.touch?.episodes.length === 1, 'death appended another episode');
  console.log('✅ 10. Death closes each touching episode once and is idempotent.');
}

// 11. Relocation history
{
  const ada = makeNpc({ id: 'ada', city: 'Chicago', cash: 900 });
  ada.location.residenceHistory = [
    { country: 'USA', city: 'Boston', startYear: 2000, endYear: 2010, reason: 'birth' },
    { country: 'USA', city: 'Chicago', startYear: 2010, reason: 'career' },
  ];
  const friendship = makeEdge({ id: 'stays', a: 'ada', b: 'bea', category: 'friend', trust: 64, affection: 64, respect: 64 });
  const world = makeWorld([ada, makeNpc({ id: 'bea' })], [friendship]);
  const before = JSON.stringify(world);
  const moved = applyNpcRelocation(world, 'ada', 'USA', 'Seattle', YEAR);
  assert(JSON.stringify(world) === before, 'relocation mutated the input');
  const history = moved.npcRegistry.ada?.location.residenceHistory ?? [];
  assert(history.length === 3, 'relocation did not append exactly one residence');
  assert(history[0]?.city === 'Boston' && history[0].endYear === 2010, 'earlier residence history was dropped or rewritten');
  assert(history[1]?.city === 'Chicago' && history[1].endYear === YEAR && history[1].reason === 'career', 'the previous residence was not closed');
  assert(history[2]?.city === 'Seattle' && history[2].endYear === undefined && history[2].reason === 'relocation', 'the new residence row is wrong');
  assert(moved.npcRegistry.ada?.location.city === 'Seattle', 'current city was not updated');
  const relocatedEvents = moved.npcRegistry.ada?.lifeHistory.filter((event) => event.type === 'relocated') ?? [];
  assert(relocatedEvents.length === 1 && relocatedEvents[0]?.dedupeKey === 'ada:relocated:2030:none', 'relocation did not use the relocated life event');
  assert(JSON.stringify(moved.relationshipsById.stays) === JSON.stringify(friendship), 'relocation changed a friendship');

  const repeated = applyNpcRelocation(moved, 'ada', 'USA', 'Seattle', YEAR);
  assert(repeated === moved, 'repeating the same move appended another residence');
  const laterSameCity = applyNpcRelocation(moved, 'ada', 'USA', 'Seattle', YEAR + 4);
  assert(laterSameCity === moved, 'a later call for the current city duplicated history');

  const onward = applyNpcRelocation(moved, 'ada', 'USA', 'Portland', YEAR + 4);
  const onwardHistory = onward.npcRegistry.ada?.location.residenceHistory ?? [];
  assert(onwardHistory.length === 4, 'a different city did not append exactly one row');
  assert(onwardHistory[2]?.endYear === YEAR + 4, 'the Seattle residence was not closed');
  assert(onwardHistory[3]?.city === 'Portland' && onwardHistory[3].reason === 'relocation' && onwardHistory[3].endYear === undefined, 'the Portland row is wrong');
  assert(onwardHistory.filter((entry) => entry.endYear === undefined).length === 1, 'more than one residence stayed open');
  assert(
    (onward.npcRegistry.ada?.lifeHistory.filter((event) => event.type === 'relocated').length ?? 0) === 2,
    'the later move did not record its own relocated event'
  );
  assert(applyNpcRelocation(onward, 'ada', 'USA', 'Portland', YEAR + 4) === onward, 'repeating Portland duplicated the row');
  assert(onward.npcRegistry.ada?.finances.cash === 900, 'relocation changed finances');

  const returned = applyNpcRelocation(onward, 'ada', 'USA', 'Boston', YEAR + 8);
  const returnedHistory = returned.npcRegistry.ada?.location.residenceHistory ?? [];
  assert(returnedHistory.length === 5, 'returning to a previous city did not append one row');
  assert(returnedHistory[0]?.city === 'Boston' && returnedHistory[0].endYear === 2010 && returnedHistory[0].reason === 'birth', 'the original Boston row was rewritten');
  assert(returnedHistory[3]?.city === 'Portland' && returnedHistory[3].endYear === YEAR + 8, 'the current row was not closed on return');
  assert(
    returnedHistory[4]?.city === 'Boston' && returnedHistory[4].startYear === YEAR + 8 && returnedHistory[4].endYear === undefined && returnedHistory[4].reason === 'relocation',
    'the return row was not appended as a new open residence'
  );
  assert(returnedHistory.filter((entry) => entry.city === 'Boston' && entry.endYear === undefined).length === 1, 'the historical Boston row was reopened');
  assert(applyNpcRelocation(returned, 'ada', 'USA', 'Boston', YEAR + 8) === returned, 'repeating the return duplicated history');

  const nora = makeNpc({ id: 'nora', city: 'Seattle' });
  nora.location.residenceHistory = [
    { country: 'USA', city: 'Boston', startYear: 2000, endYear: 2010, reason: 'birth' },
    { country: 'USA', city: 'Chicago', startYear: 2010, endYear: 2030, reason: 'career' },
    { country: 'USA', city: 'Seattle', startYear: 2030, reason: 'relocation' },
  ];
  const back = applyNpcRelocation(makeWorld([nora]), 'nora', 'USA', 'Boston', 2034);
  const backHistory = back.npcRegistry.nora?.location.residenceHistory ?? [];
  assert(backHistory.length === 4, 'the Seattle return did not keep every residence');
  assert(backHistory[0]?.endYear === 2010 && backHistory[1]?.endYear === 2030, 'closed history changed on return');
  assert(backHistory[2]?.city === 'Seattle' && backHistory[2].endYear === 2034, 'Seattle was not closed');
  assert(backHistory[3]?.city === 'Boston' && backHistory[3].endYear === undefined && backHistory[3].startYear === 2034, 'Boston was not appended');
  assert(applyNpcRelocation(back, 'nora', 'USA', 'Boston', 2034) === back, 'repeating the Seattle return duplicated a row');
  console.log('✅ 11. Relocation preserves history, closes the previous row, and does not duplicate it.');
}

// 12. Death keeps relationship categories and former edges
{
  const kid = makeNpc({ id: 'kid', age: 4 });
  const stepkid = makeNpc({ id: 'stepkid', age: 6 });
  const formerStep = makeEdge({ id: 'former-step', a: 'ada', b: 'kid', category: 'parent_child', status: 'former' });
  formerStep.lineageRelation = 'step';
  formerStep.stepSourceEdgeId = 'old-marriage';
  const activeStep = makeEdge({ id: 'active-step', a: 'ada', b: 'stepkid', category: 'parent_child' });
  activeStep.lineageRelation = 'step';
  activeStep.stepSourceEdgeId = 'current-marriage';
  const untouchedStep = makeEdge({ id: 'untouched-step', a: 'bea', b: 'kid', category: 'parent_child' });
  untouchedStep.lineageRelation = 'step';
  untouchedStep.stepSourceEdgeId = 'other-marriage';
  const biological = makeEdge({ id: 'biological', a: 'ada', b: 'kid', category: 'parent_child' });
  biological.lineageRelation = 'biological';
  const dating = makeEdge({ id: 'dating', a: 'ada', b: 'cam', category: 'dating', romance: 40 });
  const world = makeWorld(
    [makeNpc({ id: 'ada', alive: false, tier: 'historical' }), makeNpc({ id: 'bea' }), makeNpc({ id: 'cam' }), kid, stepkid],
    [formerStep, activeStep, untouchedStep, biological, dating]
  );
  const once = reconcileSocialEdgesAfterDeath(world, 'ada', YEAR);
  assert(once.relationshipsById['former-step']?.status === 'former', 'a former step edge became deceased');
  assert(once.relationshipsById['former-step']?.lineageRelation === 'step', 'a former step edge lost its lineage');
  assert(once.relationshipsById['former-step']?.stepSourceEdgeId === 'old-marriage', 'a former step edge lost its source marriage');
  assert(JSON.stringify(once.relationshipsById['former-step']) === JSON.stringify(formerStep), 'a former step edge was rewritten');
  assert(
    once.relationshipsById.biological?.status === 'deceased' &&
      once.relationshipsById.biological.category === 'parent_child' &&
      once.relationshipsById.biological.lineageRelation === 'biological',
    'an active biological edge changed category or lineage'
  );
  assert(
    once.relationshipsById['active-step']?.status === 'deceased' &&
      once.relationshipsById['active-step']?.category === 'parent_child' &&
      once.relationshipsById['active-step']?.lineageRelation === 'step' &&
      once.relationshipsById['active-step']?.stepSourceEdgeId === 'current-marriage',
    'an active step edge changed category, lineage, or source'
  );
  assert(once.relationshipsById.dating?.status === 'deceased' && once.relationshipsById.dating.category === 'dating', 'the social death pass replaced a dating category');
  assert(once.relationshipsById['untouched-step']?.status === 'active', 'a step edge that does not touch the deceased person was closed');
  const twice = reconcileSocialEdgesAfterDeath(once, 'ada', YEAR);
  assert(twice === once, 'a second social death pass changed a reconciled world');
  console.log('✅ 12. Social death keeps categories and leaves former edges unchanged.');
}

console.log('--- ALL NPC SOCIAL AUTONOMY MILESTONE 3 TESTS PASSED ---\n');
