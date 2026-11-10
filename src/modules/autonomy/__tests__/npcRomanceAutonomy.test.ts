import { DEFAULT_POPULATION_CONFIG } from '../services/migrationService';
import { createNpcPRNG, deterministicUUID } from '../services/seededPrngService';
import { reconcileSocialEdgesAfterDeath } from '../services/autonomousSocialService';
import {
  disagreementProbability,
  positiveInteractionProbability,
  progressNpcRomanceYear,
  reconcileRomanticEdgesAfterDeath,
  resolveRomanticOrientation,
} from '../services/autonomousRomanceService';
import type {
  BiologicalGender,
  GenderIdentity,
  NpcCareerState,
  NpcEducationState,
  NpcFinanceState,
  NpcLifestyle,
  NpcPersonality,
  NpcProfile,
  NpcTier,
  ParticipantRoleLabel,
  PopulationConfig,
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
    openness: 80,
    conscientiousness: 50,
    extraversion: 80,
    agreeableness: 80,
    neuroticism: 20,
    ambition: 40,
    generosity: 50,
    loyalty: 40,
    riskTolerance: 35,
    empathy: 80,
    sociability: 90,
    patience: 60,
    materialism: 30,
    ...overrides,
  };
}

function lifestyle(shared = true): NpcLifestyle {
  return {
    diet: 'standard',
    fitnessHabit: 'casual',
    substances: { alcohol: 'none', smoking: false },
    interests: shared ? ['music', 'books'] : ['fishing'],
    hobbies: shared ? ['chess'] : ['running'],
  };
}

function finances(cash = 0, currency = 'USD'): NpcFinanceState {
  return {
    currency,
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

function makeNpc(params: {
  id: string;
  age?: number;
  tier?: NpcTier;
  city?: string;
  country?: string;
  gender?: GenderIdentity;
  biologicalGender?: BiologicalGender;
  orientation?: NpcProfile['romanticOrientation'];
  personality?: NpcPersonality;
  sharedLifestyle?: boolean;
  alive?: boolean;
  cash?: number;
  currency?: string;
  fertility?: number;
  looks?: number;
  lastName?: string;
  motherId?: string;
  fatherId?: string;
}): NpcProfile {
  const age = params.age ?? 28;
  const country = params.country ?? 'United States';
  const city = params.city ?? 'Boston';
  const gender = params.gender ?? 'female';
  const npc: NpcProfile = {
    id: params.id,
    tier: params.tier ?? 'social',
    firstName: params.id,
    lastName: params.lastName ?? 'Hart',
    gender,
    biologicalGender: params.biologicalGender ?? (gender === 'male' ? 'male' : 'female'),
    age,
    birthYear: YEAR - age,
    isAlive: params.alive ?? true,
    location: {
      country,
      city,
      residenceHistory: [{ country, city, startYear: YEAR - age, reason: 'birth' }],
    },
    identityResolutionStatus: 'canonical',
    looks: params.looks ?? 80,
    smarts: 60,
    health: 80,
    happiness: 70,
    fertility: params.fertility ?? 90,
    craziness: 10,
    personality: params.personality ?? personality(),
    lifestyle: lifestyle(params.sharedLifestyle ?? true),
    goals: [],
    healthConditions: [],
    education: education(),
    career: career(),
    finances: finances(params.cash ?? 0, params.currency ?? 'USD'),
    lifeHistory: [],
    adoptiveParentIds: [],
    stepParentIds: [],
    isAdopted: false,
  };
  if (params.orientation) npc.romanticOrientation = params.orientation;
  if (params.motherId) npc.biologicalMotherId = params.motherId;
  if (params.fatherId) npc.biologicalFatherId = params.fatherId;
  return npc;
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
  romance?: number;
  compatibility?: number;
  yearsTogether?: number;
  episodes?: RelationshipEpisode[];
}): RelationshipEdge {
  const aFirst = params.a.localeCompare(params.b) <= 0;
  const participantAId = aFirst ? params.a : params.b;
  const participantBId = aFirst ? params.b : params.a;
  const [roleA, roleB] = rolesFor(params.category);
  return {
    id: params.id,
    participantAId,
    participantBId,
    category: params.category,
    roleForA: aFirst ? roleA : roleB,
    roleForB: aFirst ? roleB : roleA,
    lineageRelation: params.category === 'parent_child' ? 'biological' : 'none',
    status: params.status ?? 'active',
    trust: params.trust ?? 75,
    affection: params.affection ?? 75,
    respect: params.respect ?? 75,
    romance: params.romance ?? 0,
    compatibility: params.compatibility ?? 80,
    yearsTogether: params.yearsTogether ?? 1,
    lastInteractedYear: YEAR - 1,
    episodes: params.episodes ?? [{ episodeId: `${params.id}-open`, category: params.category, startYear: YEAR - 2 }],
  };
}

function makeWorld(
  npcs: NpcProfile[],
  edges: RelationshipEdge[] = [],
  config: Partial<PopulationConfig> = {},
  worldSeed = 20261110
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
    lastSimulationTurnId: 'romance-test',
    familyWealth: 'modest',
    legacyIdMappings: {},
    npcRegistry,
    relationshipsById,
    relationshipIndex,
    inheritanceRecords: {},
    memories: {},
    lifeUpdatesFeed: [],
    populationConfig: { ...DEFAULT_POPULATION_CONFIG, ...config },
  };
}

function progress(world: WorldSimulationState, year = YEAR): WorldSimulationState {
  return progressNpcRomanceYear(world, year, PLAYER_ID);
}

function pairEdge(world: WorldSimulationState, a: string, b: string): RelationshipEdge | undefined {
  return Object.values(world.relationshipsById).find(
    (edge) =>
      (edge.participantAId === a && edge.participantBId === b) ||
      (edge.participantAId === b && edge.participantBId === a)
  );
}

function addedPeople(before: WorldSimulationState, after: WorldSimulationState): NpcProfile[] {
  return Object.values(after.npcRegistry)
    .filter((npc) => !before.npcRegistry[npc.id])
    .sort((a, b) => a.id.localeCompare(b.id));
}

function assertChild(child: NpcProfile, reason: 'birth' | 'adoption'): void {
  const typed: NpcProfile = child;
  assert(typed.gender === typed.biologicalGender, `${typed.id} split gender from biological gender`);
  assert(typed.gender === 'male' || typed.gender === 'female', `${typed.id} was not a binary child`);
  assert(typed.isAlive && typed.identityResolutionStatus === 'canonical', `${typed.id} identity is incomplete`);
  assert(typed.location.residenceHistory.length === 1, `${typed.id} did not start with one residence`);
  assert(typed.location.residenceHistory[0]?.reason === reason, `${typed.id} used the wrong residence reason`);
  assert(typed.education.currentStage === 'none' && typed.education.grades === 0, `${typed.id} education was not empty`);
  assert(typed.career.occupation === 'Infant' && typed.career.salary === 0 && typed.career.jobId === null, `${typed.id} career was not infant`);
  assert(typed.finances.cash === 0 && typed.finances.savings === 0 && typed.finances.netWorth === 0, `${typed.id} finances were not zero`);
  assert(typed.goals.length === 0 && typed.healthConditions.length === 0, `${typed.id} did not start clear of goals and conditions`);
  assert(typed.romanticOrientation === resolveRomanticOrientation(20261110, typed.id, typed.gender), `${typed.id} orientation was not stored from the shared helper`);
  assert(typed.lifeHistory.length === 1 && typed.lifeHistory[0]?.type === 'birth', `${typed.id} life history was not a single birth`);
  assert(typed.health === 95 && typed.happiness === 90 && typed.fertility === 50 && typed.craziness === 10, `${typed.id} vitals changed`);
}

function snapshot(world: WorldSimulationState) {
  return Object.values(world.relationshipsById)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((edge) => ({
      id: edge.id,
      category: edge.category,
      status: edge.status,
      lineage: edge.lineageRelation,
      step: edge.stepSourceEdgeId ?? null,
      pregnant: Boolean(edge.isPregnant),
      conceptionYear: edge.conceptionYear ?? null,
      pregnantParentId: edge.pregnantParentId ?? null,
      episodes: edge.episodes,
    }));
}

console.log('\n--- STARTING NPC ROMANTIC AUTONOMY MILESTONE 4 TESTS ---');

// 1. Formation, clocks, and one partner
{
  const ada = makeNpc({ id: 'ada', gender: 'female', orientation: 'everyone', cash: 100 });
  const bea = makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', orientation: 'everyone', cash: 100 });
  const cam = makeNpc({ id: 'cam', gender: 'male', biologicalGender: 'male', orientation: 'everyone', cash: 100 });
  const friendAdaBea = makeEdge({ id: 'ada-bea', a: 'ada', b: 'bea', category: 'friend' });
  const friendAdaCam = makeEdge({ id: 'ada-cam', a: 'ada', b: 'cam', category: 'friend' });
  const world = makeWorld([ada, bea, cam], [friendAdaBea, friendAdaCam]);
  const before = JSON.stringify(world);
  const formed = progress(world);
  assert(JSON.stringify(world) === before, 'romance year mutated the input');
  assert(progress(formed, YEAR) === formed, 'the same romance year did not return the same world');
  const datingEdges = Object.values(formed.relationshipsById).filter((edge) => edge.category === 'dating');
  assert(datingEdges.length === 1, 'one person started more than one romance');
  const dating = datingEdges[0];
  assert(dating && dating.yearsTogether === 0 && dating.status === 'active', 'the formation year counted toward the dating clock');
  assert(dating.episodes.some((episode) => episode.endReason === 'coupled'), 'dating did not close the friendship with coupled');
  assert(dating.episodes.filter((episode) => episode.endYear === undefined).length === 1, 'dating left more than one episode open');
  const partnerIds = [dating.participantAId, dating.participantBId].sort();
  assert(partnerIds.includes('ada'), 'the shared person was not one of the new partners');
  const otherFriendId = dating.participantBId === 'cam' || dating.participantAId === 'cam' ? 'ada-bea' : 'ada-cam';
  assert(formed.relationshipsById[otherFriendId]?.category === 'friend', 'the other friendship was consumed');
  const started = formed.npcRegistry.ada?.lifeHistory.filter((event) => event.type === 'relationship_started') ?? [];
  assert(started.length === 1 && started[0]?.referenceId === dating.id, 'dating did not record one relationship event');

  const reversed = progress(makeWorld([cam, bea, ada], [friendAdaCam, friendAdaBea]));
  assert(JSON.stringify(reversed.relationshipsById) === JSON.stringify(formed.relationshipsById), 'match selection depended on input order');

  const boosted = structuredClone(formed);
  const boostedEdge = Object.values(boosted.relationshipsById).find((edge) => edge.category === 'dating');
  assert(boostedEdge, 'the dating edge disappeared');
  boostedEdge.trust = 80;
  boostedEdge.affection = 80;
  boostedEdge.romance = 80;
  const secondYear = progress(boosted, YEAR + 1);
  const stillDating = pairEdge(secondYear, boostedEdge.participantAId, boostedEdge.participantBId);
  assert(stillDating?.category === 'dating' && stillDating.yearsTogether === 1, 'the first full year did not count as one dating year');
  const engaged = progress(secondYear, YEAR + 2);
  const engagement = pairEdge(engaged, boostedEdge.participantAId, boostedEdge.participantBId);
  assert(engagement?.category === 'fiance' && engagement.yearsTogether === 0, 'engagement did not reset the clock');
  assert(engagement.episodes.some((episode) => episode.endReason === 'engaged'), 'engagement did not close the dating episode');
  const waiting = progress(engaged, YEAR + 3);
  const stillEngaged = pairEdge(waiting, boostedEdge.participantAId, boostedEdge.participantBId);
  assert(stillEngaged?.category === 'fiance' && stillEngaged.yearsTogether === 1, 'the engagement clock reused the dating years');
  const married = progress(waiting, YEAR + 4);
  const marriage = pairEdge(married, boostedEdge.participantAId, boostedEdge.participantBId);
  assert(marriage?.category === 'spouse' && marriage.yearsTogether === 0 && marriage.isPregnant !== true, 'the wedding year conceived or kept the engagement clock');
  assert(marriage.episodes.some((episode) => episode.endReason === 'marriage'), 'marriage did not close the engagement');
  assert(married.npcRegistry.ada?.finances.cash === 100, 'marriage changed cash');
  console.log('✅ 1. Formation clocks, one partner, and wedding-year conception hold.');
}

// 2. Dating and engagement clocks are independent settings
{
  const ada = makeNpc({ id: 'ada', orientation: 'women', cash: 0 });
  const bea = makeNpc({ id: 'bea', orientation: 'women', cash: 0 });
  const world = makeWorld(
    [ada, bea],
    [makeEdge({ id: 'pair', a: 'ada', b: 'bea', category: 'friend' })],
    { minDatingYears: 1, minEngagementYears: 3 }
  );
  const formed = progress(world);
  assert(pairEdge(formed, 'ada', 'bea')?.category === 'dating' && pairEdge(formed, 'ada', 'bea')?.yearsTogether === 0, 'a one-year dating rule counted the formation year');
  const boosted = structuredClone(formed);
  const edge = pairEdge(boosted, 'ada', 'bea');
  assert(edge, 'same-sex dating did not start');
  edge.trust = 80;
  edge.affection = 80;
  edge.romance = 80;
  const engaged = progress(boosted, YEAR + 1);
  assert(pairEdge(engaged, 'ada', 'bea')?.category === 'fiance' && pairEdge(engaged, 'ada', 'bea')?.yearsTogether === 0, 'minDatingYears 1 did not allow engagement in the next year');
  const yearTwo = progress(engaged, YEAR + 2);
  const yearThree = progress(yearTwo, YEAR + 3);
  assert(pairEdge(yearThree, 'ada', 'bea')?.category === 'fiance' && pairEdge(yearThree, 'ada', 'bea')?.yearsTogether === 2, 'the engagement clock ignored minEngagementYears');
  const wed = progress(yearThree, YEAR + 4);
  const spouse = pairEdge(wed, 'ada', 'bea');
  assert(spouse?.category === 'spouse' && spouse.yearsTogether === 0 && spouse.isPregnant !== true, 'a same-sex wedding conceived or married early');
  assert(addedPeople(world, wed).length === 0, 'a same-sex couple produced a natural child');
  console.log('✅ 2. Dating and engagement durations are independent, and same-sex couples do not conceive.');
}

// 3. Blocks, distance, and player exclusivity
{
  const distant = progress(makeWorld(
    [makeNpc({ id: 'ada', orientation: 'everyone' }), makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', orientation: 'everyone', city: 'Seattle' })],
    [makeEdge({ id: 'far', a: 'ada', b: 'bea', category: 'best_friend', trust: 90, affection: 90, respect: 90 })]
  ));
  assert(distant.relationshipsById.far?.category === 'best_friend' && distant.relationshipsById.far.trust === 90, 'a distant best friendship started dating or changed meters');

  const young = progress(makeWorld(
    [makeNpc({ id: 'ada', age: 17 }), makeNpc({ id: 'bea', age: 17, gender: 'male', biologicalGender: 'male' })],
    [makeEdge({ id: 'young', a: 'ada', b: 'bea', category: 'friend' })]
  ));
  assert(young.relationshipsById.young?.category === 'friend', 'a minor started dating');
  assert(!('romanticOrientation' in (young.npcRegistry.ada ?? {})), 'a derived orientation was written back');

  const gap = progress(makeWorld(
    [
      makeNpc({ id: 'ada', age: 18, looks: 100, orientation: 'everyone' }),
      makeNpc({ id: 'bea', age: 39, gender: 'male', biologicalGender: 'male', looks: 100, orientation: 'everyone' }),
    ],
    [makeEdge({ id: 'gap', a: 'ada', b: 'bea', category: 'friend', trust: 100, affection: 100, respect: 100 })]
  ));
  assert(gap.relationshipsById.gap?.category === 'friend', 'an age gap of 21 started dating');

  const allowedGap = progress(makeWorld(
    [
      makeNpc({ id: 'ada', age: 18, looks: 100, orientation: 'everyone', sharedLifestyle: true }),
      makeNpc({ id: 'bea', age: 38, gender: 'male', biologicalGender: 'male', looks: 100, orientation: 'everyone' }),
    ],
    [makeEdge({ id: 'near', a: 'ada', b: 'bea', category: 'friend', trust: 100, affection: 100, respect: 100 })],
  ));
  assert(allowedGap.relationshipsById.near?.category === 'dating', 'an age gap of 20 was blocked');

  const rejected = makeWorld(
    [
      makeNpc({ id: 'ada', orientation: 'women' }),
      makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', orientation: 'women' }),
    ],
    [makeEdge({ id: 'one-sided', a: 'ada', b: 'bea', category: 'friend', trust: 88 })]
  );
  const rejectedYear = progress(rejected);
  assert(JSON.stringify(rejectedYear.relationshipsById['one-sided']) === JSON.stringify(rejected.relationshipsById['one-sided']), 'one-sided attraction changed the friendship');

  const blockedCategories = ['ex', 'former_spouse', 'deceased_spouse', 'sibling', 'parent_child'] as const;
  for (const category of blockedCategories) {
    const blocked = progress(makeWorld(
      [makeNpc({ id: 'ada', orientation: 'everyone' }), makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', orientation: 'everyone' })],
      [makeEdge({ id: category, a: 'ada', b: 'bea', category, ...(category === 'deceased_spouse' || category === 'ex' || category === 'former_spouse' ? { status: 'former' as const } : {}) })]
    ));
    assert(blocked.relationshipsById[category]?.category === category, `${category} was reopened as dating`);
  }

  const kin = progress(makeWorld(
    [
      makeNpc({ id: 'ada', orientation: 'everyone', motherId: 'mom' }),
      makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', orientation: 'everyone', motherId: 'mom' }),
    ],
    [makeEdge({ id: 'kin', a: 'ada', b: 'bea', category: 'friend' })]
  ));
  assert(kin.relationshipsById.kin?.category === 'friend', 'siblings by a shared parent started dating');

  const background = progress(makeWorld(
    [makeNpc({ id: 'ada', tier: 'background', orientation: 'everyone' }), makeNpc({ id: 'bea', tier: 'background', gender: 'male', biologicalGender: 'male', orientation: 'everyone' })],
    [makeEdge({ id: 'bg', a: 'ada', b: 'bea', category: 'friend' })]
  ));
  assert(background.relationshipsById.bg?.category === 'friend', 'a background pair started dating');

  const remoteRomance = makeEdge({ id: 'remote', a: 'ada', b: 'bea', category: 'dating', romance: 40, yearsTogether: 0 });
  const remote = progress(makeWorld(
    [makeNpc({ id: 'ada' }), makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', city: 'Seattle' })],
    [remoteRomance]
  ));
  assert(remote.relationshipsById.remote?.category === 'dating', 'distance ended an existing romance');
  assert(remote.relationshipsById.remote.yearsTogether === 1, 'a remote romance did not count the year');

  const playerEdge = makeEdge({ id: 'player-date', a: PLAYER_ID, b: 'ada', category: 'dating', romance: 55, trust: 61, affection: 62 });
  const npcFriend = makeEdge({ id: 'npc-friend', a: 'ada', b: 'bea', category: 'friend' });
  const reserved = makeWorld(
    [makeNpc({ id: 'ada', orientation: 'everyone', cash: 20000, fertility: 100 }), makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', orientation: 'everyone', cash: 20000, fertility: 100 })],
    [playerEdge, npcFriend, makeEdge({ id: 'npc-spouse', a: 'ada', b: 'bea', category: 'spouse', romance: 80, trust: 80, affection: 80 })]
  );
  const reservedYear = progress(reserved);
  assert(JSON.stringify(reservedYear.relationshipsById['player-date']) === JSON.stringify(playerEdge), 'a player romance edge was mutated');
  assert(reservedYear.relationshipsById['npc-friend']?.category === 'friend', 'a player partner started another NPC romance');
  assert(reservedYear.relationshipsById['npc-spouse']?.isPregnant !== true, 'a player partner conceived with an NPC');
  assert(addedPeople(reserved, reservedYear).length === 0, 'a player partner adopted or gave birth');
  assert(reservedYear.npcRegistry.ada?.finances.cash === 20000 && reservedYear.npcRegistry.bea?.finances.cash === 20000, 'a reserved couple spent cash');
  console.log('✅ 3. Age, family, background, distance, and player exclusivity hold.');
}

// 4. Pregnancy, twins, birth index, and step parents
{
  const mother = makeNpc({ id: 'ada', gender: 'female', biologicalGender: 'female', fertility: 100, cash: 0, lastName: 'Hart' });
  const father = makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', fertility: 100, cash: 0, lastName: 'Stone' });
  const due = makeEdge({ id: 'couple', a: 'ada', b: 'bea', category: 'spouse', romance: 80, trust: 80, affection: 80, yearsTogether: 3 });
  due.isPregnant = true;
  due.conceptionYear = YEAR - 1;
  due.pregnantParentId = 'ada';
  const world = makeWorld([mother, father], [due], { maxChildrenPerCouple: 2, allowMultipleBirths: true });
  const first = progress(world);
  const second = progress(world);
  assert(JSON.stringify(first) === JSON.stringify(second), 'a second run produced different twins');
  assert(progress(first, YEAR) === first, 'repeating the birth year created another child');
  const twins = addedPeople(world, first);
  assert(twins.length === 2, 'the due pregnancy did not deliver two children');
  const smaller = 'ada'.localeCompare('bea') <= 0 ? 'ada' : 'bea';
  const larger = smaller === 'ada' ? 'bea' : 'ada';
  const firstTwin = first.npcRegistry[deterministicUUID('npc-child', smaller, larger, YEAR, 0)];
  const secondTwin = first.npcRegistry[deterministicUUID('npc-child', smaller, larger, YEAR, 1)];
  assert(firstTwin && secondTwin && firstTwin.id !== secondTwin.id, 'twins shared an id or used the wrong birth index');
  assert(firstTwin.birthOrder === 'twin' && secondTwin.birthOrder === 'twin', 'twins were not marked twin');
  assert(firstTwin.lastName === 'Hart' && secondTwin.biologicalMotherId === 'ada' && secondTwin.biologicalFatherId === 'bea', 'biological parentage was wrong');
  for (const twin of [firstTwin, secondTwin]) assertChild(twin, 'birth');
  assert(first.relationshipsById.couple?.isPregnant !== true, 'the delivered pregnancy stayed open');
  const sibling = pairEdge(first, firstTwin.id, secondTwin.id);
  assert(sibling?.category === 'sibling' && sibling.status === 'active', 'twins were not linked as siblings');

  const continued = structuredClone(first);
  continued.populationConfig = { ...continued.populationConfig, allowMultipleBirths: false, maxChildrenPerCouple: 4 };
  const conceived = progress(continued, YEAR + 1);
  assert(conceived.relationshipsById.couple?.isPregnant === true && conceived.relationshipsById.couple.conceptionYear === YEAR + 1, 'the couple did not conceive after the twins');
  const later = progress(conceived, YEAR + 2);
  const laterChild = later.npcRegistry[deterministicUUID('npc-child', smaller, larger, YEAR + 2, 0)];
  assert(laterChild?.birthOrder === 'younger', 'a later single birth did not restart the birth index at younger');
  assert(later.npcRegistry[firstTwin.id]?.birthOrder === 'twin', 'a later birth overwrote a twin marker');
  assertChild(laterChild as NpcProfile, 'birth');

  const divorcedMother = makeNpc({ id: 'ada', cash: 500 });
  const divorcedFather = makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', cash: 800 });
  const pregnantMarriage = makeEdge({ id: 'married', a: 'ada', b: 'bea', category: 'spouse', trust: 5, affection: 5, romance: 5 });
  pregnantMarriage.isPregnant = true;
  pregnantMarriage.conceptionYear = YEAR;
  pregnantMarriage.pregnantParentId = 'ada';
  const divorced = progress(makeWorld([divorcedMother, divorcedFather], [pregnantMarriage]));
  const afterDivorce = divorced.relationshipsById.married;
  assert(afterDivorce?.category === 'former_spouse' && afterDivorce.status === 'former', 'low meters did not divorce the spouses');
  assert(afterDivorce.isPregnant === true && afterDivorce.conceptionYear === YEAR && afterDivorce.pregnantParentId === 'ada', 'divorce removed the pregnancy');
  assert(divorced.npcRegistry.ada?.finances.cash === 500 && divorced.npcRegistry.bea?.finances.cash === 800, 'divorce divided cash');
  const bornAfter = progress(divorced, YEAR + 1);
  const delivered = addedPeople(divorced, bornAfter);
  assert(delivered.length >= 1 && delivered.every((child) => child.biologicalMotherId === 'ada' && child.biologicalFatherId === 'bea'), 'the original parents did not remain the biological parents');
  assert(bornAfter.relationshipsById.married?.isPregnant !== true, 'birth left the former pregnancy open');

  const stepSpouse = makeNpc({ id: 'cam', orientation: 'everyone', cash: 0 });
  const remarried = makeEdge({ id: 'new-marriage', a: 'ada', b: 'cam', category: 'spouse', trust: 90, affection: 90, respect: 90, romance: 90 });
  const oldPregnancy = makeEdge({ id: 'old-marriage', a: 'ada', b: 'bea', category: 'former_spouse', status: 'former', trust: 10, romance: 0 });
  oldPregnancy.isPregnant = true;
  oldPregnancy.conceptionYear = YEAR - 1;
  oldPregnancy.pregnantParentId = 'ada';
  const stepWorld = makeWorld([
    makeNpc({ id: 'ada', cash: 0 }),
    makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', cash: 0 }),
    stepSpouse,
  ], [oldPregnancy, remarried], { allowMultipleBirths: false });
  const stepYear = progress(stepWorld);
  const stepChildren = addedPeople(stepWorld, stepYear);
  assert(stepChildren.length === 1 && stepChildren[0]?.biologicalFatherId === 'bea', 'the new spouse became a biological parent');
  const stepEdge = stepChildren[0] ? pairEdge(stepYear, 'cam', stepChildren[0].id) : undefined;
  assert(stepEdge?.lineageRelation === 'step' && stepEdge.stepSourceEdgeId === 'new-marriage' && stepEdge.category === 'parent_child', 'the new spouse did not become a step parent');
  assert(stepChildren[0]?.stepParentIds.includes('cam'), 'the child did not record the step parent');
  const divorceStep = structuredClone(stepYear);
  const marriageEdge = pairEdge(divorceStep, 'ada', 'cam');
  assert(marriageEdge, 'the remarriage disappeared');
  marriageEdge.trust = 5;
  marriageEdge.romance = 5;
  marriageEdge.affection = 5;
  const ended = progress(divorceStep, YEAR + 1);
  const closedStep = stepChildren[0] ? pairEdge(ended, 'cam', stepChildren[0].id) : undefined;
  assert(closedStep?.status === 'former' && closedStep.episodes.some((episode) => episode.endReason === 'divorce'), 'divorce did not close the step edge it created');
  const biological = stepChildren[0] ? pairEdge(ended, 'ada', stepChildren[0].id) : undefined;
  assert(biological?.status === 'active' && biological.lineageRelation === 'biological', 'divorce closed the biological edge');
  console.log('✅ 4. Pregnancy persists, twins stay unique, and step edges follow the marriage that created them.');
}

// 5. Death order, population, and adoption
{
  const dead = makeNpc({ id: 'ada', alive: false, tier: 'historical' });
  const dating = makeEdge({ id: 'dating', a: 'ada', b: 'bea', category: 'dating' });
  const engaged = makeEdge({ id: 'fiance', a: 'ada', b: 'cam', category: 'fiance' });
  const spouse = makeEdge({ id: 'spouse', a: 'ada', b: 'sam', category: 'spouse', romance: 70 });
  spouse.isPregnant = true;
  spouse.conceptionYear = YEAR;
  spouse.pregnantParentId = 'sam';
  const formerRomance = makeEdge({ id: 'ex', a: 'ada', b: 'exa', category: 'ex', status: 'former' });
  const formerMarriage = makeEdge({ id: 'former', a: 'ada', b: 'fran', category: 'former_spouse', status: 'former' });
  const already = makeEdge({
    id: 'deceased',
    a: 'ada',
    b: 'dee',
    category: 'deceased_spouse',
    status: 'deceased',
    episodes: [
      { episodeId: 'dee-closed', category: 'deceased_spouse', startYear: 2020, endYear: 2024, endReason: 'death' },
      { episodeId: 'dee-open', category: 'deceased_spouse', startYear: 2024 },
    ],
  });
  const formerStep = makeEdge({ id: 'former-step', a: 'ada', b: 'oldkid', category: 'parent_child', status: 'former' });
  formerStep.lineageRelation = 'step';
  formerStep.stepSourceEdgeId = 'old-marriage';
  const activeStep = makeEdge({ id: 'active-step', a: 'ada', b: 'stepkid', category: 'parent_child' });
  activeStep.lineageRelation = 'step';
  activeStep.stepSourceEdgeId = 'current-marriage';
  const biological = makeEdge({ id: 'biological', a: 'ada', b: 'kid', category: 'parent_child' });
  const friend = makeEdge({ id: 'friend', a: 'ada', b: 'pal', category: 'friend' });
  const people = [
    dead,
    makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male' }),
    makeNpc({ id: 'cam', gender: 'male', biologicalGender: 'male' }),
    makeNpc({ id: 'sam', gender: 'female' }),
    makeNpc({ id: 'exa', gender: 'male', biologicalGender: 'male' }),
    makeNpc({ id: 'fran', gender: 'male', biologicalGender: 'male' }),
    makeNpc({ id: 'dee', gender: 'male', biologicalGender: 'male' }),
    makeNpc({ id: 'oldkid', age: 8 }),
    makeNpc({ id: 'stepkid', age: 7 }),
    makeNpc({ id: 'kid', age: 5 }),
    makeNpc({ id: 'pal', gender: 'male', biologicalGender: 'male' }),
  ];
  const edges = [dating, engaged, spouse, formerRomance, formerMarriage, already, formerStep, activeStep, biological, friend];
  const socialFirst = reconcileRomanticEdgesAfterDeath(reconcileSocialEdgesAfterDeath(makeWorld(people, edges), 'ada', YEAR), 'ada', YEAR);
  const romanceFirst = reconcileSocialEdgesAfterDeath(reconcileRomanticEdgesAfterDeath(makeWorld(people, edges), 'ada', YEAR), 'ada', YEAR);
  assert(JSON.stringify(snapshot(socialFirst)) === JSON.stringify(snapshot(romanceFirst)), 'death reconciliation depended on pass order');
  assert(socialFirst.relationshipsById.dating?.category === 'ex' && socialFirst.relationshipsById.dating.status === 'deceased', 'dating did not end as ex');
  assert(socialFirst.relationshipsById.fiance?.category === 'ex' && socialFirst.relationshipsById.fiance.status === 'deceased', 'engagement did not end as ex');
  assert(socialFirst.relationshipsById.spouse?.category === 'deceased_spouse' && socialFirst.relationshipsById.spouse.status === 'deceased', 'a spouse did not become a deceased spouse');
  assert(socialFirst.relationshipsById.spouse.isPregnant === true && socialFirst.relationshipsById.spouse.pregnantParentId === 'sam', 'death removed the pregnancy');
  assert(socialFirst.relationshipsById.ex?.status === 'former' && socialFirst.relationshipsById.former?.status === 'former', 'a former romance was reopened by death');
  assert(socialFirst.relationshipsById.deceased?.episodes.some((episode) => episode.endYear === undefined), 'an already deceased spouse episode was closed again');
  assert(socialFirst.relationshipsById['former-step']?.status === 'former' && socialFirst.relationshipsById['former-step']?.stepSourceEdgeId === 'old-marriage', 'a former step edge changed');
  assert(socialFirst.relationshipsById['active-step']?.status === 'deceased' && socialFirst.relationshipsById['active-step']?.lineageRelation === 'step', 'an active step edge lost its lineage');
  assert(socialFirst.relationshipsById.biological?.category === 'parent_child' && socialFirst.relationshipsById.friend?.category === 'friend', 'death replaced a non-romantic category');
  const deathEvents = socialFirst.npcRegistry.ada?.lifeHistory.filter((event) => event.type === 'death') ?? [];
  assert(deathEvents.length === 1 && (romanceFirst.npcRegistry.ada?.lifeHistory.filter((event) => event.type === 'death').length ?? 0) === 1, 'death order changed the death event');

  const carrier = makeNpc({ id: 'ada', alive: false, tier: 'historical' });
  const lost = makeEdge({ id: 'lost', a: 'ada', b: 'bea', category: 'spouse' });
  lost.isPregnant = true;
  lost.conceptionYear = YEAR - 1;
  lost.pregnantParentId = 'ada';
  const lostParents = [carrier, makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male' })];
  const lostYear = progress(makeWorld(lostParents, [lost]));
  assert(lostYear.relationshipsById.lost?.isPregnant !== true && addedPeople(makeWorld(lostParents, [lost]), lostYear).length === 0, 'a pregnancy was delivered after the carrying parent died');

  const widowed = makeNpc({ id: 'ada', cash: 0 });
  const deceasedFather = makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', alive: false, tier: 'historical', cash: 0 });
  const widowEdge = makeEdge({ id: 'widow', a: 'ada', b: 'bea', category: 'spouse', romance: 80, trust: 80, affection: 80 });
  widowEdge.isPregnant = true;
  widowEdge.conceptionYear = YEAR - 1;
  widowEdge.pregnantParentId = 'ada';
  const widowWorld = makeWorld([widowed, deceasedFather], [widowEdge], { allowMultipleBirths: false });
  const reconciled = reconcileRomanticEdgesAfterDeath(reconcileSocialEdgesAfterDeath(widowWorld, 'bea', YEAR), 'bea', YEAR);
  assert(reconciled.relationshipsById.widow?.category === 'deceased_spouse' && reconciled.relationshipsById.widow.isPregnant === true, 'the other parent death removed the pregnancy');
  const deliveredWidow = progress(reconciled);
  const widowChild = addedPeople(reconciled, deliveredWidow)[0];
  assert(widowChild?.biologicalFatherId === 'bea' && widowChild.biologicalMotherId === 'ada', 'the deceased parent was removed from parentage');
  const fatherEdge = pairEdge(deliveredWidow, 'bea', widowChild?.id ?? '');
  assert(fatherEdge?.status === 'deceased' && fatherEdge.lineageRelation === 'biological', 'the deceased parent edge stayed active');

  const coreMother = makeNpc({ id: 'ada', tier: 'core', cash: 0 });
  const coreFather = makeNpc({ id: 'bea', tier: 'core', gender: 'male', biologicalGender: 'male', cash: 0 });
  const coreDue = makeEdge({ id: 'core', a: 'ada', b: 'bea', category: 'spouse' });
  coreDue.isPregnant = true;
  coreDue.conceptionYear = YEAR - 1;
  coreDue.pregnantParentId = 'ada';
  const socialBirth = progress(makeWorld([coreMother, coreFather], [coreDue], { allowMultipleBirths: false, activeNpcTarget: 120 }));
  const socialChild = addedPeople(makeWorld([coreMother, coreFather], [coreDue]), socialBirth)[0];
  assert(socialChild?.tier === 'social' && socialChild.demotedByPopulationCap !== true, 'a child of core NPCs was created as core or demoted with room available');
  assert(socialBirth.npcRegistry.ada?.tier === 'core' && socialBirth.npcRegistry.bea?.tier === 'core', 'birth changed a core parent');
  const overflow = progress(makeWorld([coreMother, coreFather], [coreDue], { allowMultipleBirths: false, activeNpcTarget: 2 }));
  const overflowChild = addedPeople(makeWorld([coreMother, coreFather], [coreDue]), overflow)[0];
  assert(overflowChild?.tier === 'background' && overflowChild.demotedByPopulationCap === true, 'overflow did not demote the social child');
  assert(overflow.npcRegistry.ada?.tier === 'core', 'overflow demoted a core parent');

  const poor = progress(makeWorld(
    [makeNpc({ id: 'ada', age: 30, cash: 1000 }), makeNpc({ id: 'bea', age: 30, gender: 'female', cash: 1000 })],
    [makeEdge({ id: 'poor', a: 'ada', b: 'bea', category: 'spouse', romance: 80, trust: 80, affection: 80 })]
  ));
  assert(addedPeople(makeWorld([]), poor).length === 2, 'insufficient cash still created a child');

  const saver = makeNpc({ id: 'ada', age: 30, cash: 100 });
  saver.finances.savings = 9000000;
  saver.finances.netWorth = 9000100;
  const unsaved = progress(makeWorld(
    [saver, makeNpc({ id: 'bea', age: 30, gender: 'female', cash: 100 })],
    [makeEdge({ id: 'savings', a: 'ada', b: 'bea', category: 'spouse' })]
  ));
  assert(Object.keys(unsaved.npcRegistry).length === 2, 'savings were spent on adoption');

  const pkrPayer = makeNpc({ id: 'ada', age: 30, country: 'Pakistan', city: 'Karachi', cash: 1668000, currency: 'PKR' });
  const usdSpouse = makeNpc({ id: 'bea', age: 30, gender: 'female', cash: 1000 });
  const adopted = progress(makeWorld([pkrPayer, usdSpouse], [makeEdge({ id: 'adopt', a: 'ada', b: 'bea', category: 'spouse' })]));
  const adoptedChild = addedPeople(makeWorld([pkrPayer, usdSpouse]), adopted)[0];
  assert(adoptedChild && adoptedChild.isAdopted, 'the paying couple did not adopt');
  assertChild(adoptedChild, 'adoption');
  assert(adoptedChild.location.country === 'Pakistan' && adoptedChild.location.city === 'Karachi', 'the adopted child did not live with the payer');
  assert(adoptedChild.finances.currency === 'PKR', 'the adopted infant did not use the payer country currency');
  assert(adopted.npcRegistry.ada?.finances.cash === 0, 'the PKR payer was not charged 6000 USD');
  assert(adopted.npcRegistry.bea?.finances.cash === 1000, 'the other spouse paid part of the fee');
  const adoptionEvent = adopted.npcRegistry.ada?.lifeHistory.find((event) => event.type === 'child_adopted');
  assert(
    adoptionEvent?.metadata?.convertedAmount === 1668000 &&
      adoptionEvent.metadata.currency === 'PKR' &&
      adoptionEvent.referenceId === adoptedChild.id,
    'adoption did not record the converted fee'
  );

  const tiedLeft = makeNpc({ id: 'ada', age: 30, cash: 10000 });
  const tiedRight = makeNpc({ id: 'bea', age: 30, gender: 'female', cash: 10000 });
  const tied = progress(makeWorld([tiedRight, tiedLeft], [makeEdge({ id: 'tie', a: 'bea', b: 'ada', category: 'spouse' })]));
  assert(tied.npcRegistry.ada?.finances.cash === 4000 && tied.npcRegistry.bea?.finances.cash === 10000, 'the tie did not charge the lexicographically smaller spouse');
  assert(addedPeople(makeWorld([tiedLeft, tiedRight]), tied).length === 1, 'the tie created more than one child');

  const short = progress(makeWorld(
    [makeNpc({ id: 'ada', age: 30, country: 'Pakistan', cash: 1667999, currency: 'PKR' }), makeNpc({ id: 'bea', age: 30, gender: 'female', cash: 100 })],
    [makeEdge({ id: 'short', a: 'ada', b: 'bea', category: 'spouse' })]
  ));
  assert(Object.keys(short.npcRegistry).length === 2 && short.npcRegistry.ada?.finances.cash === 1667999, 'a one-rupee shortfall still adopted');

  const carrying = makeEdge({ id: 'carrying', a: 'ada', b: 'bea', category: 'spouse' });
  carrying.isPregnant = true;
  carrying.conceptionYear = YEAR;
  carrying.pregnantParentId = 'ada';
  const noAdopt = progress(makeWorld(
    [makeNpc({ id: 'ada', age: 30, cash: 20000 }), makeNpc({ id: 'bea', age: 30, gender: 'male', biologicalGender: 'male', cash: 20000 })],
    [carrying]
  ));
  assert(addedPeople(makeWorld([]), noAdopt).length === 2 && noAdopt.relationshipsById.carrying?.isPregnant === true, 'a pregnant couple adopted');
  console.log('✅ 5. Death order, population, and adoption currency hold.');
}

// 6. Seeded interactions can raise meters without making marriage automatic
{
  const FACETS = ['sociability', 'empathy', 'agreeableness', 'extraversion', 'openness', 'neuroticism'] as const;
  function interactionCompatibility(a: NpcProfile, b: NpcProfile): number {
    let difference = 0;
    for (const facet of FACETS) difference += Math.abs(a.personality[facet] - b.personality[facet]);
    const similarity = Math.max(0, 100 - difference / FACETS.length);
    const shared =
      a.lifestyle.interests.filter((item) => b.lifestyle.interests.includes(item)).length +
      a.lifestyle.hobbies.filter((item) => b.lifestyle.hobbies.includes(item)).length;
    return Math.min(100, Math.max(0, Math.round(0.7 * similarity + 0.3 * Math.min(100, shared * 25))));
  }

  function near(actual: number, expected: number, message: string): void {
    assert(Math.abs(actual - expected) < 1e-12, message);
  }

  near(disagreementProbability(100, 0), 0.08, 'disagreement minimum is not 0.08');
  near(disagreementProbability(0, 100), 0.42, 'disagreement maximum is not 0.42');
  near(positiveInteractionProbability(0), 0.3, 'positive minimum is not 0.30');
  near(positiveInteractionProbability(100), 0.75, 'positive maximum is not 0.75');
  assert(disagreementProbability(40, 50) > disagreementProbability(80, 50), 'lower compatibility did not raise disagreement');
  assert(disagreementProbability(50, 80) > disagreementProbability(50, 20), 'higher neuroticism did not raise disagreement');
  assert(positiveInteractionProbability(80) > positiveInteractionProbability(40), 'higher compatibility did not raise the positive chance');
  near(disagreementProbability(-40, 180), 0.42, 'disagreement left its bounds');
  near(positiveInteractionProbability(150), 0.75, 'positive interaction left its upper bound');
  near(positiveInteractionProbability(-10), 0.3, 'positive interaction left its lower bound');

  const fixtureSeed = 20261110;
  const lockedYears = { disagreement: 2031, positive: 2032, quiet: 2035 } as const;
  function replay(year: number, remote: boolean): { outcome: 'disagreement' | 'positive' | 'quiet'; trust: number; affection: number; romance: number } {
    const left = makeNpc({ id: 'nora' });
    const right = makeNpc({ id: 'owen', gender: 'male', biologicalGender: 'male' });
    const score = interactionCompatibility(left, right);
    const neuroticism = (left.personality.neuroticism + right.personality.neuroticism) / 2;
    const prng = createNpcPRNG(fixtureSeed, year, 'nora|owen', 'romance', 1);
    let trust = 80;
    let affection = 80;
    let romance = 60;
    let outcome: 'disagreement' | 'positive' | 'quiet' = 'quiet';
    if (prng.chance(disagreementProbability(score, neuroticism))) {
      outcome = 'disagreement';
      trust -= prng.nextInt(2, 5);
      romance -= prng.nextInt(1, 3);
      affection -= 1;
    } else if (prng.chance(positiveInteractionProbability(score))) {
      outcome = 'positive';
      romance += score >= 70 ? prng.nextInt(3, 6) : prng.nextInt(2, 4);
      const bondGain = score >= 80 ? 2 : 1;
      trust += bondGain;
      affection += bondGain;
    }
    if (remote) romance -= 1;
    return {
      outcome,
      trust: Math.max(0, Math.min(100, trust)),
      affection: Math.max(0, Math.min(100, affection)),
      romance: Math.max(0, Math.min(100, romance)),
    };
  }

  function runPair(year: number, remote: boolean): RelationshipEdge {
    const left = makeNpc({ id: 'nora' });
    const right = makeNpc({ id: 'owen', gender: 'male', biologicalGender: 'male', ...(remote ? { city: 'Seattle' } : {}) });
    const dating = makeEdge({ id: 'pair', a: 'nora', b: 'owen', category: 'dating', trust: 80, affection: 80, romance: 60, yearsTogether: 0 });
    const result = progress(makeWorld([left, right], [dating], {}, fixtureSeed), year);
    const edge = result.relationshipsById.pair;
    assert(edge, 'the fixture couple disappeared');
    return edge;
  }

  for (const outcome of ['disagreement', 'positive', 'quiet'] as const) {
    const year = lockedYears[outcome];
    const localRoll = replay(year, false);
    const remoteRoll = replay(year, true);
    assert(localRoll.outcome === outcome, `${year} was ${localRoll.outcome} rather than ${outcome}`);
    const local = runPair(year, false);
    const remote = runPair(year, true);
    assert(local.category === 'dating' && remote.category === 'dating', `${outcome} changed the relationship stage`);
    assert(local.trust === localRoll.trust && local.affection === localRoll.affection && local.romance === localRoll.romance, `${outcome} consumed the romance draws in a different order`);
    assert(remote.trust === remoteRoll.trust && remote.affection === remoteRoll.affection && remote.romance === remoteRoll.romance, `remote ${outcome} consumed the romance draws in a different order`);
    assert(remote.romance === local.romance - 1, `a remote ${outcome} did not apply exactly one distance penalty`);
    assert(remote.trust === local.trust && remote.affection === local.affection, `a remote ${outcome} changed trust or affection beyond the interaction`);
    assert(local.respect === 75 && remote.respect === 75, `${outcome} changed respect`);
  }
  const quiet = runPair(lockedYears.quiet, false);
  const quietRemote = runPair(lockedYears.quiet, true);
  assert(quiet.trust === 80 && quiet.affection === 80 && quiet.romance === 60, 'a same-city quiet year changed the meters');
  assert(quietRemote.trust === 80 && quietRemote.affection === 80 && quietRemote.romance === 59, 'a remote quiet year did not lose exactly one romance point');

  const naturalSeed = 1;
  const naturalFriends = [
    makeNpc({ id: 'nora', orientation: 'everyone' }),
    makeNpc({ id: 'owen', gender: 'male', biologicalGender: 'male', orientation: 'everyone' }),
  ];
  const naturalEdge = makeEdge({
    id: 'pair',
    a: 'nora',
    b: 'owen',
    category: 'friend',
    trust: 90,
    affection: 90,
    respect: 90,
    romance: 0,
    compatibility: 100,
  });
  let natural = makeWorld(naturalFriends, [naturalEdge], {}, naturalSeed);
  natural = progress(natural, 2030);
  const formed = natural.relationshipsById.pair;
  assert(formed?.category === 'dating' && formed.yearsTogether === 0, 'the formation year ran an interaction or counted the clock');
  assert(formed.trust === 90 && formed.affection === 90 && formed.romance === 50, 'formation changed the copied meters or the starting romance');
  for (let year = 2031; year <= 2034; year += 1) natural = progress(natural, year);
  assert(natural.relationshipsById.pair?.category === 'dating', 'the couple engaged before the natural meter path allowed it');
  natural = progress(natural, 2035);
  assert(natural.relationshipsById.pair?.category === 'fiance' && natural.relationshipsById.pair.yearsTogether === 0, 'natural engagement did not reset the clock');
  natural = progress(natural, 2036);
  natural = progress(natural, 2037);
  assert(natural.relationshipsById.pair?.category === 'fiance', 'the couple married before the engagement clock and marriage meters were both met');
  natural = progress(natural, 2038);
  assert(natural.relationshipsById.pair?.category === 'spouse' && natural.relationshipsById.pair.yearsTogether === 0, 'the compatible couple did not marry on the natural path');

  const lowLeft = makeNpc({
    id: 'ada',
    personality: personality({ openness: 5, extraversion: 5, agreeableness: 5, empathy: 5, sociability: 5, neuroticism: 95 }),
    sharedLifestyle: false,
  });
  lowLeft.lifestyle = { ...lowLeft.lifestyle, interests: ['fishing'], hobbies: ['running'] };
  const lowRight = makeNpc({
    id: 'bea',
    gender: 'male',
    biologicalGender: 'male',
    personality: personality({ openness: 95, extraversion: 95, agreeableness: 95, empathy: 95, sociability: 95, neuroticism: 95 }),
    sharedLifestyle: false,
  });
  lowRight.lifestyle = { ...lowRight.lifestyle, interests: ['opera'], hobbies: ['sailing'] };
  let low = makeWorld(
    [lowLeft, lowRight],
    [makeEdge({ id: 'low', a: 'ada', b: 'bea', category: 'dating', trust: 55, affection: 55, romance: 35, yearsTogether: 1 })],
    {},
    naturalSeed
  );
  for (let year = 2030; year <= 2038; year += 1) {
    low = progress(low, year);
    assert(low.relationshipsById.low?.category !== 'spouse', 'the low-compatibility couple married');
  }

  const firstCouple = makeEdge({ id: 'first', a: 'ada', b: 'bea', category: 'dating', trust: 70, affection: 70, romance: 55, yearsTogether: 1 });
  const secondCouple = makeEdge({ id: 'second', a: 'cam', b: 'dee', category: 'dating', trust: 72, affection: 68, romance: 52, yearsTogether: 2 });
  const people = [
    makeNpc({ id: 'ada', orientation: 'everyone' }),
    makeNpc({ id: 'bea', gender: 'male', biologicalGender: 'male', orientation: 'everyone' }),
    makeNpc({ id: 'cam', orientation: 'everyone' }),
    makeNpc({ id: 'dee', gender: 'male', biologicalGender: 'male', orientation: 'everyone' }),
  ];
  const forward = progress(progress(makeWorld(people, [firstCouple, secondCouple], {}, 11), 2031), 2032);
  const reversed = progress(progress(makeWorld([...people].reverse(), [secondCouple, firstCouple], {}, 11), 2031), 2032);
  assert(JSON.stringify(reversed.npcRegistry) === JSON.stringify(forward.npcRegistry), 'interaction results depended on registry order');
  assert(JSON.stringify(reversed.relationshipsById) === JSON.stringify(forward.relationshipsById), 'interaction results depended on edge order');
  assert(progress(forward, 2032) === forward, 'repeating the interaction year changed the world');
  console.log('✅ 6. Seeded interactions progress compatible couples and leave poor matches short of marriage.');
}

console.log('--- ALL NPC ROMANTIC AUTONOMY MILESTONE 4 TESTS PASSED ---\n');
