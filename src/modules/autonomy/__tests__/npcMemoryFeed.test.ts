import { DEFAULT_POPULATION_CONFIG } from '../services/migrationService';
import { markLifeUpdatesRead, progressNpcMemoryYear } from '../services/autonomousMemoryService';
import { createNpcPRNG, deterministicUUID } from '../services/seededPrngService';
import type {
  NpcCareerState,
  NpcEducationState,
  NpcFinanceState,
  NpcLifeEvent,
  NpcLifeEventType,
  NpcLifestyle,
  NpcMemory,
  NpcPersonality,
  NpcProfile,
  NpcTier,
  RelationshipEdge,
  WorldSimulationState,
} from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const PLAYER_ID = 'player-1';
const YEAR = 2030;
const SEED = 20261110;

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

function finances(): NpcFinanceState {
  return {
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
  };
}

function makeNpc(params: {
  id: string;
  tier?: NpcTier;
  alive?: boolean;
  deathYear?: number;
  age?: number;
  events?: NpcLifeEvent[];
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
    health: 80,
    happiness: 70,
    fertility: 50,
    craziness: 10,
    personality: personality(),
    lifestyle: lifestyle(),
    goals: [],
    healthConditions: [],
    education: education(),
    career: career(),
    finances: finances(),
    lifeHistory: params.events ?? [],
    adoptiveParentIds: [],
    stepParentIds: [],
    isAdopted: false,
  };
  if (params.deathYear !== undefined) npc.deathYear = params.deathYear;
  return npc;
}

function makeEvent(params: {
  npcId: string;
  type: NpcLifeEventType;
  referenceId?: string;
  title?: string;
  description?: string;
  year?: number;
  dedupeKey?: string;
}): NpcLifeEvent {
  const year = params.year ?? YEAR;
  const dedupeKey = params.dedupeKey ?? `${params.npcId}:${params.type}:${year}:${params.referenceId ?? 'none'}`;
  const event: NpcLifeEvent = {
    id: deterministicUUID('npc-life-event', dedupeKey),
    dedupeKey,
    npcId: params.npcId,
    year,
    age: 30,
    type: params.type,
    title: params.title ?? params.type,
    description: params.description ?? `${params.type} for ${params.npcId}`,
  };
  if (params.referenceId !== undefined) event.referenceId = params.referenceId;
  return event;
}

function makeEdge(id: string, a: string, b: string, status: RelationshipEdge['status'] = 'active'): RelationshipEdge {
  const aFirst = a.localeCompare(b) <= 0;
  return {
    id,
    participantAId: aFirst ? a : b,
    participantBId: aFirst ? b : a,
    category: 'friend',
    roleForA: 'friend',
    roleForB: 'friend',
    lineageRelation: 'none',
    status,
    trust: 70,
    affection: 70,
    respect: 70,
    romance: 0,
    compatibility: 70,
    yearsTogether: 1,
    lastInteractedYear: YEAR - 1,
    episodes: [],
  };
}

function makeWorld(
  npcs: NpcProfile[],
  edges: RelationshipEdge[] = [],
  memories: Record<string, NpcMemory[]> = {}
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
    worldSeed: SEED,
    simulationVersion: 1,
    lastSimulatedYear: YEAR - 1,
    lastSimulationTurnId: 'memory-test',
    familyWealth: 'modest',
    legacyIdMappings: {},
    npcRegistry,
    relationshipsById,
    relationshipIndex,
    inheritanceRecords: {},
    memories,
    lifeUpdatesFeed: [],
    populationConfig: { ...DEFAULT_POPULATION_CONFIG },
  };
}

function progress(world: WorldSimulationState, year = YEAR): WorldSimulationState {
  return progressNpcMemoryYear(world, year, PLAYER_ID);
}

function firstDraw(npcId: string): number {
  return createNpcPRNG(SEED, YEAR, npcId, 'memory', 1).nextInt(-5, 5);
}

function secondDraw(npcId: string): number {
  const prng = createNpcPRNG(SEED, YEAR, npcId, 'memory', 1);
  prng.nextInt(-5, 5);
  return prng.nextInt(-5, 5);
}

const graduation = progress(
  makeWorld([
    makeNpc({
      id: 'ada',
      events: [makeEvent({ npcId: 'ada', type: 'graduation', referenceId: 'high_school', title: 'Graduated', description: 'Ada graduated.' })],
    }),
  ])
);
const adaMemory = graduation.memories.ada ?? [];
assert(adaMemory.length === 1, 'a graduation did not create one memory');
assert(adaMemory[0]?.importance === 85 && adaMemory[0]?.emotionalImpact === 50 + firstDraw('ada'), 'emotional impact did not use the first memory draw');
assert(adaMemory[0]?.description === 'Ada graduated.', 'the memory rewrote the life event');
assert(graduation.lifeUpdatesFeed.length === 1 && graduation.lifeUpdatesFeed[0]?.category === 'graduation', 'the graduation feed row was missing');
assert(graduation.lifeUpdatesFeed[0]?.title === 'Graduated' && graduation.lifeUpdatesFeed[0]?.message === 'Ada graduated.', 'the feed rewrote the life event');
assert(graduation.lifeUpdatesFeed[0]?.isRead === false && graduation.lifeUpdatesFeed[0]?.priority === 'high', 'the feed row was not a new high-priority update');
console.log('✅ 1. One source event creates one memory and one feed row from the memory stream.');

const twoBirths = progress(
  makeWorld([
    makeNpc({
      id: 'nora',
      events: [
        makeEvent({ npcId: 'nora', type: 'birth', referenceId: 'child-a', description: 'First birth.' }),
        makeEvent({ npcId: 'nora', type: 'birth', referenceId: 'child-b', description: 'Second birth.' }),
      ],
    }),
  ])
);
assert((twoBirths.memories.nora ?? []).length === 2, 'two births collapsed into one memory');
assert(twoBirths.lifeUpdatesFeed.length === 0, 'a personal birth became a feed row');
console.log('✅ 2. Two births in one year remain two memories.');

const weddingEdge = 'wedding-edge';
const wedding = progress(
  makeWorld(
    [
      makeNpc({
        id: 'bea',
        events: [makeEvent({ npcId: 'bea', type: 'wedding', referenceId: weddingEdge, title: 'Bea married Ada', description: 'Bea and Ada married.' })],
      }),
      makeNpc({
        id: 'ada',
        events: [makeEvent({ npcId: 'ada', type: 'wedding', referenceId: weddingEdge, title: 'Ada married Bea', description: 'Ada and Bea married.' })],
      }),
    ],
    [makeEdge(weddingEdge, 'ada', 'bea')]
  )
);
assert((wedding.memories.ada ?? []).length === 1 && (wedding.memories.bea ?? []).length === 1, 'the wedding did not give both spouses a memory');
assert(wedding.lifeUpdatesFeed.length === 1, 'the wedding created more than one feed row');
assert(wedding.lifeUpdatesFeed[0]?.npcId === 'ada' && wedding.lifeUpdatesFeed[0]?.relatedNpcId === 'bea', 'the wedding row did not represent both participants');
assert(wedding.lifeUpdatesFeed[0]?.title === 'Ada married Bea' && wedding.lifeUpdatesFeed[0]?.message === 'Ada and Bea married.', 'the wedding row rewrote the smaller participant');
assert(wedding.lifeUpdatesFeed[0]?.category === 'marriage', 'the wedding category was wrong');
console.log('✅ 3. A wedding keeps two memories and one feed row.');

const estate = progress(
  makeWorld([
    makeNpc({
      id: 'bea',
      events: [makeEvent({ npcId: 'bea', type: 'inheritance_received', referenceId: 'estate-1', title: 'Bea inherited', description: 'Bea received an inheritance.' })],
    }),
    makeNpc({
      id: 'ann',
      events: [makeEvent({ npcId: 'ann', type: 'inheritance_received', referenceId: 'estate-1', title: 'Ann inherited', description: 'Ann received an inheritance.' })],
    }),
  ])
);
assert((estate.memories.ann ?? []).length === 1 && (estate.memories.bea ?? []).length === 1, 'the estate did not give both heirs a memory');
assert(estate.lifeUpdatesFeed.length === 1 && estate.lifeUpdatesFeed[0]?.category === 'inheritance', 'the estate did not produce one inheritance row');
assert(estate.lifeUpdatesFeed[0]?.npcId === 'ann' && estate.lifeUpdatesFeed[0]?.title === 'Ann inherited', 'the estate row did not keep the smaller heir');
assert(estate.lifeUpdatesFeed[0]?.relatedNpcId === undefined, 'the estate row invented a related NPC');
assert(estate.memories.ann?.[0]?.year === YEAR, 'an estate event dated this year was ignored');
console.log('✅ 4. One estate keeps two memories and one inheritance row.');

const retirements = progress(
  makeWorld([
    makeNpc({
      id: 'dora',
      events: [makeEvent({ npcId: 'dora', type: 'retired', referenceId: 'retirement', title: 'Dora retired', description: 'Dora retired.' })],
    }),
    makeNpc({
      id: 'cara',
      events: [makeEvent({ npcId: 'cara', type: 'retired', referenceId: 'retirement', title: 'Cara retired', description: 'Cara retired.' })],
    }),
  ])
);
assert(retirements.lifeUpdatesFeed.length === 2, 'two retirements with the same reference collapsed');
assert(new Set(retirements.lifeUpdatesFeed.map((row) => row.npcId)).size === 2, 'a retirement row replaced the other NPC');
console.log('✅ 5. Shared reference strings do not merge unrelated retirements.');

const singleEstate = progress(
  makeWorld([
    makeNpc({
      id: 'heir',
      events: [makeEvent({ npcId: 'heir', type: 'inheritance_received', referenceId: 'estate-9', title: 'Inheritance received', description: 'Heir received an inheritance.' })],
    }),
  ])
);
assert(singleEstate.memories.heir?.[0]?.category === 'financial', 'an estate event written before the pass created no memory');
assert(singleEstate.lifeUpdatesFeed[0]?.message === 'Heir received an inheritance.', 'an estate event written before the pass created no feed row');
console.log('✅ 6. Estate events already dated this year are included.');

const lateBase = progress(
  makeWorld([
    makeNpc({
      id: 'ada',
      events: [makeEvent({ npcId: 'ada', type: 'graduation', referenceId: 'school', title: 'Graduated', description: 'Ada graduated.' })],
    }),
  ])
);
const late = structuredClone(lateBase);
const lateNpc = late.npcRegistry.ada;
assert(lateNpc, 'the late-event NPC was missing');
lateNpc.lifeHistory = [
  ...lateNpc.lifeHistory,
  makeEvent({ npcId: 'ada', type: 'promoted', referenceId: 'lead', title: 'Promoted', description: 'Ada was promoted.' }),
];
assert(progress(late) === late, 'a same-year rerun rebuilt the world');
assert((late.memories.ada ?? []).every((memory) => !memory.dedupeKey.includes('promoted')), 'a late event was backfilled');
assert(late.lifeUpdatesFeed.every((row) => row.category !== 'promotion'), 'a late event was added to the feed');
console.log('✅ 7. An event written after the memory pass is not backfilled.');

const hired = makeEvent({ npcId: 'ada', type: 'hired', referenceId: 'job', title: 'Hired', description: 'Ada was hired.' });
const terminated = makeEvent({ npcId: 'ada', type: 'terminated', referenceId: 'term', title: 'Terminated', description: 'Ada was terminated.' });
const existingHired: NpcMemory = {
  id: 'existing-hired',
  dedupeKey: `ada:career:${YEAR}:${hired.dedupeKey}`,
  ownerId: 'ada',
  category: 'career',
  description: hired.description,
  year: YEAR,
  importance: 70,
  emotionalImpact: 1,
};
const skipped = progress(
  makeWorld([makeNpc({ id: 'ada', events: [terminated, hired] })], [], { ada: [existingHired] })
);
const skippedMemories = skipped.memories.ada ?? [];
const hiredMemory = skippedMemories.find((memory) => memory.dedupeKey === existingHired.dedupeKey);
const terminatedMemory = skippedMemories.find((memory) => memory.dedupeKey.includes('terminated'));
assert(hiredMemory?.emotionalImpact === 1, 'an existing memory was rolled again');
assert(terminatedMemory?.emotionalImpact === -40 + firstDraw('ada'), 'the new memory did not receive the first unused draw');
assert(terminatedMemory?.emotionalImpact !== -40 + secondDraw('ada'), 'the existing memory consumed a draw');
console.log('✅ 8. Existing memories consume no additional draw.');

const mystery = makeEvent({
  npcId: 'bea',
  type: 'mystery' as NpcLifeEventType,
  title: 'Mystery',
  description: 'This is not a supported event.',
  dedupeKey: 'bea:aaa:2030:none',
});
const supported = makeEvent({ npcId: 'bea', type: 'graduation', referenceId: 'school', title: 'Graduated', description: 'Bea graduated.' });
const unsupported = progress(makeWorld([makeNpc({ id: 'bea', events: [mystery, supported] })]));
const beaMemories = unsupported.memories.bea ?? [];
assert(beaMemories.length === 1 && beaMemories[0]?.description === 'Bea graduated.', 'an unsupported event created a memory');
assert(beaMemories[0]?.emotionalImpact === 50 + firstDraw('bea'), 'an unsupported event consumed a draw');
assert(unsupported.lifeUpdatesFeed.length === 1 && unsupported.lifeUpdatesFeed[0]?.category === 'graduation', 'an unsupported event created a feed row');
console.log('✅ 9. Unsupported events create nothing and consume no draw.');

const stale = progress(
  makeWorld([makeNpc({ id: 'ida' })], [], {
    ida: [
      memory('ida', 35, YEAR - 5, 'old-trivial'),
      memory('ida', 35, YEAR - 4, 'kept-trivial'),
      memory('ida', 40, YEAR - 20, 'important'),
    ],
  })
);
const keptYears = (stale.memories.ida ?? []).map((entry) => entry.year).sort((left, right) => left - right);
assert(JSON.stringify(keptYears) === JSON.stringify([YEAR - 20, YEAR - 4]), 'decay kept or dropped the wrong memories');
console.log('✅ 10. Trivial memories decay after four years and important memories remain.');

const background = progress(
  makeWorld([
    makeNpc({
      id: 'gray',
      tier: 'background',
      events: [makeEvent({ npcId: 'gray', type: 'graduation', referenceId: 'school', description: 'Gray graduated.' })],
    }),
  ])
);
assert((background.memories.gray ?? []).length === 1, 'a background NPC lost the memory');
assert(background.lifeUpdatesFeed.length === 0, 'a background NPC appeared in the feed');
console.log('✅ 11. Background NPCs keep memories and stay out of the feed.');

const playerDeath = progress(
  makeWorld(
    [
      makeNpc({
        id: 'ann',
        events: [makeEvent({ npcId: 'ann', type: 'relocated', title: 'Moved', description: 'Ann moved.' })],
      }),
      makeNpc({
        id: 'zoe',
        tier: 'historical',
        alive: false,
        deathYear: YEAR,
        events: [makeEvent({ npcId: 'zoe', type: 'death', title: 'Zoe died', description: 'Zoe died.' })],
      }),
    ],
    [makeEdge('zoe-player', 'zoe', PLAYER_ID, 'deceased')]
  )
);
assert(playerDeath.npcRegistry[PLAYER_ID] === undefined, 'the player was added to the registry');
assert((playerDeath.memories.zoe ?? []).length === 1, 'the deceased NPC did not keep a death memory');
assert(playerDeath.lifeUpdatesFeed[0]?.category === 'death' && playerDeath.lifeUpdatesFeed[0]?.npcId === 'zoe', 'a player-connected death was hidden');
assert(playerDeath.lifeUpdatesFeed[0]?.message === 'Zoe died.', 'the death row rewrote the life event');
assert(playerDeath.lifeUpdatesFeed[1]?.npcId === 'ann' && playerDeath.lifeUpdatesFeed[1]?.priority === 'normal', 'feed priority did not outrank NPC id');
console.log('✅ 12. A historical death with a deceased player edge stays visible.');

const socialDeath = progress(
  makeWorld(
    [
      makeNpc({ id: 'quinn', tier: 'core' }),
      makeNpc({
        id: 'pat',
        tier: 'historical',
        alive: false,
        deathYear: YEAR,
        events: [makeEvent({ npcId: 'pat', type: 'death', description: 'Pat died.' })],
      }),
    ],
    [makeEdge('pat-quinn', 'pat', 'quinn', 'deceased')]
  )
);
assert(socialDeath.lifeUpdatesFeed.some((row) => row.category === 'death' && row.npcId === 'pat'), 'a death connected to a living core NPC was hidden');
console.log('✅ 13. A death connected to a living core NPC appears.');

const backgroundDeath = progress(
  makeWorld(
    [
      makeNpc({ id: 'gray', tier: 'background' }),
      makeNpc({
        id: 'pat',
        tier: 'historical',
        alive: false,
        deathYear: YEAR,
        events: [makeEvent({ npcId: 'pat', type: 'death', description: 'Pat died.' })],
      }),
    ],
    [makeEdge('pat-gray', 'pat', 'gray')]
  )
);
assert((backgroundDeath.memories.pat ?? []).length === 1, 'a background-connected death lost its memory');
assert(backgroundDeath.lifeUpdatesFeed.length === 0, 'a death connected only to a background NPC appeared');
console.log('✅ 14. A death connected only to background NPCs is excluded.');

const readable = progress(
  makeWorld([
    makeNpc({
      id: 'ada',
      events: [makeEvent({ npcId: 'ada', type: 'graduation', referenceId: 'school', title: 'Graduated', description: 'Ada graduated.' })],
    }),
  ])
);
const feedId = readable.lifeUpdatesFeed[0]?.id;
assert(feedId, 'the read-state fixture had no feed row');
assert(markLifeUpdatesRead(readable, ['missing-id']) === readable, 'an unknown id changed the world');
const read = markLifeUpdatesRead(readable, [feedId, 'still-missing']);
assert(read !== readable && read.lifeUpdatesFeed[0]?.isRead === true, 'a matching feed id was not marked read');
assert(readable.lifeUpdatesFeed[0]?.isRead === false, 'marking read changed the input row');
assert(read.memories === readable.memories, 'marking read changed memories');
assert(read.lifeUpdatesFeed.filter((row) => row.id !== feedId).every((row) => row.isRead === false), 'an unrelated row was marked read');
console.log('✅ 15. Unknown read ids change nothing, and matching rows only change read state.');

const orderedPeople = [
  makeNpc({ id: 'dora', events: [makeEvent({ npcId: 'dora', type: 'retired', referenceId: 'retirement', description: 'Dora retired.' })] }),
  makeNpc({ id: 'cara', events: [makeEvent({ npcId: 'cara', type: 'retired', referenceId: 'retirement', description: 'Cara retired.' })] }),
];
const forward = progress(makeWorld(orderedPeople));
const reversed = progress(makeWorld([...orderedPeople].reverse()));
assert(JSON.stringify(reversed.memories) === JSON.stringify(forward.memories), 'memories depended on registry order');
assert(JSON.stringify(reversed.lifeUpdatesFeed) === JSON.stringify(forward.lifeUpdatesFeed), 'the feed depended on registry order');
const immutable = makeWorld([makeNpc({ id: 'ada', events: [makeEvent({ npcId: 'ada', type: 'graduation', referenceId: 'school' })] })]);
const before = JSON.stringify(immutable);
const once = progress(immutable);
assert(JSON.stringify(immutable) === before, 'the memory pass mutated its input');
assert(progress(once) === once, 'repeating the memory year returned a new world');
console.log('✅ 16. Repeating the year is a no-op and registry order does not change the result.');

console.log('--- ALL NPC MEMORY AND FEED MILESTONE 6 TESTS PASSED ---\n');

function memory(ownerId: string, importance: number, year: number, label: string): NpcMemory {
  return {
    id: label,
    dedupeKey: `${ownerId}:milestone:${year}:${label}`,
    ownerId,
    category: 'milestone',
    description: label,
    year,
    importance,
    emotionalImpact: 0,
  };
}
