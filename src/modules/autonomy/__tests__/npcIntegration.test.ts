import { ageUpCharacter } from '../../aging/services/agingService';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import type { CharacterProfile } from '../../../types/game';
import { progressNpcCareerForYear } from '../services/autonomousCareerService';
import { progressNpcEducationForYear } from '../services/autonomousEducationService';
import { progressNpcFinancesForYear } from '../services/autonomousFinanceService';
import { progressNpcMortalityYear } from '../services/autonomousMortalityService';
import { progressAutonomousYear } from '../services/autonomousYearService';
import { processNpcGoalsLifecycle } from '../services/goalService';
import { appendDeduplicatedLifeEvents, DEFAULT_POPULATION_CONFIG } from '../services/migrationService';
import {
  getChildrenSelector,
  getParentsView,
  getPartnerSelector,
} from '../services/npcRegistryService';
import { createNpcPRNG } from '../services/seededPrngService';
import type {
  NpcCareerState,
  NpcEducationState,
  NpcFinanceState,
  NpcGoal,
  NpcLifestyle,
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
    ambition: 50,
    generosity: 50,
    loyalty: 50,
    riskTolerance: 50,
    empathy: 50,
    sociability: 50,
    patience: 50,
    materialism: 50,
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

function education(stage: NpcEducationState['currentStage'] = 'graduated'): NpcEducationState {
  return { currentStage: stage, schoolName: null, grades: 75, history: [] };
}

function career(overrides: Partial<NpcCareerState> = {}): NpcCareerState {
  return {
    jobId: null,
    title: 'Clerk',
    companyName: 'North Office',
    occupation: 'Clerk',
    salary: 40000,
    performance: 55,
    yearsInRole: 2,
    isRetired: false,
    pensionAnnual: 0,
    history: [],
    ...overrides,
  };
}

function finances(overrides: Partial<NpcFinanceState> = {}): NpcFinanceState {
  return {
    currency: 'USD',
    cash: 1000,
    savings: 0,
    realEstateValue: 0,
    businessEquity: 0,
    studentDebt: 0,
    mortgageBalance: 0,
    otherLiabilities: 0,
    annualIncome: 40000,
    annualExpenses: 12000,
    netWorth: 1000,
    ...overrides,
  };
}

function makeNpc(params: {
  id: string;
  age?: number;
  alive?: boolean;
  gender?: 'male' | 'female';
  tier?: NpcTier;
  city?: string;
  stage?: NpcEducationState['currentStage'];
  goals?: NpcGoal[];
  career?: Partial<NpcCareerState>;
  finances?: Partial<NpcFinanceState>;
  estateSettled?: boolean;
  deathYear?: number;
}): NpcProfile {
  const age = params.age ?? 30;
  const gender = params.gender ?? 'female';
  const city = params.city ?? 'Boston';
  return {
    id: params.id,
    tier: params.tier ?? 'social',
    firstName: params.id,
    lastName: 'Hart',
    gender,
    biologicalGender: gender,
    age,
    birthYear: YEAR - age,
    isAlive: params.alive ?? true,
    location: {
      country: 'United States',
      city,
      residenceHistory: [{ country: 'United States', city, startYear: YEAR - age, reason: 'birth' }],
    },
    identityResolutionStatus: 'canonical',
    looks: 50,
    smarts: 55,
    health: 90,
    happiness: 70,
    fertility: 80,
    craziness: 10,
    personality: personality(),
    lifestyle: lifestyle(),
    goals: params.goals ?? [],
    healthConditions: [],
    education: education(params.stage),
    career: career(params.career),
    finances: finances(params.finances),
    lifeHistory: [],
    adoptiveParentIds: [],
    stepParentIds: [],
    isAdopted: false,
    ...(params.estateSettled !== undefined ? { estateSettled: params.estateSettled } : {}),
    ...(params.deathYear !== undefined ? { deathYear: params.deathYear } : {}),
  };
}

function spouseEdge(): RelationshipEdge {
  return {
    id: 'couple',
    participantAId: 'ada',
    participantBId: 'bea',
    category: 'spouse',
    roleForA: 'spouse',
    roleForB: 'spouse',
    lineageRelation: 'none',
    status: 'active',
    trust: 80,
    affection: 80,
    respect: 75,
    romance: 80,
    compatibility: 80,
    yearsTogether: 4,
    lastInteractedYear: YEAR - 1,
    episodes: [],
    isPregnant: true,
    conceptionYear: YEAR - 1,
    pregnantParentId: 'ada',
  };
}

function makeWorld(
  npcs: NpcProfile[],
  edges: RelationshipEdge[] = [],
  config: Partial<WorldSimulationState['populationConfig']> = {}
): WorldSimulationState {
  const npcRegistry: Record<string, NpcProfile> = {};
  for (const npc of npcs) npcRegistry[npc.id] = npc;
  const relationshipsById: Record<string, RelationshipEdge> = {};
  const relationshipIndex: Record<string, string[]> = {};
  for (const edge of edges) {
    relationshipsById[edge.id] = edge;
    for (const id of [edge.participantAId, edge.participantBId]) {
      relationshipIndex[id] = [...(relationshipIndex[id] ?? []), edge.id];
    }
  }
  return {
    schemaVersion: 2,
    worldSeed: SEED,
    simulationVersion: 1,
    lastSimulatedYear: YEAR - 1,
    lastSimulationTurnId: 'integration',
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
  return progressAutonomousYear(world, year, PLAYER_ID);
}

function familyWorld(): WorldSimulationState {
  return makeWorld(
    [
      makeNpc({ id: 'ada', age: 29, gender: 'female' }),
      makeNpc({ id: 'bea', age: 31, gender: 'male' }),
    ],
    [spouseEdge()]
  );
}

function relevantState(world: WorldSimulationState): string {
  return JSON.stringify(world);
}

function duplicateKeys(world: WorldSimulationState): string[] {
  const duplicates: string[] = [];
  for (const npc of Object.values(world.npcRegistry)) {
    const seen = new Set<string>();
    for (const event of npc.lifeHistory) {
      if (seen.has(event.dedupeKey)) duplicates.push(event.dedupeKey);
      seen.add(event.dedupeKey);
    }
  }
  return duplicates;
}

function assertStep(before: WorldSimulationState, after: WorldSimulationState, year: number): void {
  assert(after.lastSimulatedYear === year, `year ${year} was not stamped`);
  assert(after !== before, `year ${year} returned the input world`);
  for (const npc of Object.values(after.npcRegistry)) {
    const prior = before.npcRegistry[npc.id];
    if (!prior) {
      assert(npc.birthYear === year && npc.age === 0, `${npc.id} was aged during the birth year`);
      continue;
    }
    if (!prior.isAlive) {
      assert(!npc.isAlive && npc.age === prior.age, `${npc.id} changed after death`);
    } else {
      assert(npc.age === prior.age + 1, `${npc.id} did not age by one year`);
    }
    assert(npc.age === year - npc.birthYear || !npc.isAlive, `${npc.id} age does not match the birth year`);
  }
  for (const [id, record] of Object.entries(before.inheritanceRecords)) {
    assert(
      JSON.stringify(after.inheritanceRecords[id]) === JSON.stringify(record),
      `estate ${id} was paid or rewritten again`
    );
  }
  assert(duplicateKeys(after).length === 0, `duplicate life-event keys: ${duplicateKeys(after).join(', ')}`);
}

function advance(world: WorldSimulationState, years: number): WorldSimulationState {
  let current = world;
  for (let step = 0; step < years; step += 1) {
    const year = YEAR + step;
    const next = progress(current, year);
    assertStep(current, next, year);
    current = next;
  }
  return current;
}

function goalReference(world: WorldSimulationState, mode: 'shared' | 'recreated'): NpcGoal[] {
  const aged = progressNpcMortalityYear(structuredClone(world), YEAR, PLAYER_ID);
  const npc = aged.npcRegistry.goalie;
  assert(npc, 'the goals fixture did not survive mortality');
  const goalsPrng = createNpcPRNG(aged.worldSeed, YEAR, npc.id, 'goals', aged.simulationVersion);
  let current = processNpcGoalsLifecycle(npc, YEAR, goalsPrng).updatedNpc;
  const educationPass = progressNpcEducationForYear(
    current,
    YEAR,
    createNpcPRNG(aged.worldSeed, YEAR, npc.id, 'education', aged.simulationVersion),
    { familyWealth: aged.familyWealth }
  );
  current = {
    ...educationPass.updatedNpc,
    lifeHistory: appendDeduplicatedLifeEvents(educationPass.updatedNpc.lifeHistory, educationPass.lifeEvents),
  };
  const careerPass = progressNpcCareerForYear(
    current,
    YEAR,
    createNpcPRNG(aged.worldSeed, YEAR, npc.id, 'career', aged.simulationVersion),
    aged.populationConfig.retirementTargetAge
  );
  current = {
    ...careerPass.updatedNpc,
    lifeHistory: appendDeduplicatedLifeEvents(careerPass.updatedNpc.lifeHistory, careerPass.lifeEvents),
  };
  const financePass = progressNpcFinancesForYear(
    current,
    YEAR,
    createNpcPRNG(aged.worldSeed, YEAR, npc.id, 'finance', aged.simulationVersion)
  );
  current = {
    ...financePass.updatedNpc,
    lifeHistory: appendDeduplicatedLifeEvents(financePass.updatedNpc.lifeHistory, financePass.lifeEvents),
  };
  const secondPrng = mode === 'shared'
    ? goalsPrng
    : createNpcPRNG(aged.worldSeed, YEAR, npc.id, 'goals', aged.simulationVersion);
  return processNpcGoalsLifecycle(current, YEAR, secondPrng).updatedNpc.goals;
}

function playerShell(world: WorldSimulationState, age = 30): CharacterProfile {
  return {
    id: PLAYER_ID,
    firstName: 'Alex',
    lastName: 'Rivera',
    gender: 'non-binary',
    age,
    birthYear: YEAR - age,
    country: 'United States',
    city: 'Boston',
    occupation: 'Unemployed',
    cash: 5000,
    bankBalance: 0,
    netWorth: 5000,
    isAlive: true,
    stats: { health: 85, happiness: 80, smarts: 80, looks: 75, karma: 90 },
    parents: {
      father: {
        id: 'dad_1',
        role: 'father',
        firstName: 'Marcus',
        lastName: 'Rivera',
        age: 55,
        occupation: 'Accountant',
        isAlive: true,
        relationship: 80,
        generosity: 70,
      },
      mother: {
        id: 'mom_1',
        role: 'mother',
        firstName: 'Elena',
        lastName: 'Rivera',
        age: 53,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 80,
        generosity: 70,
      },
      wealth: 'modest',
    },
    education: createInitialEducation(),
    career: createInitialCareerState(),
    relationships: [],
    timeline: [],
    seenEventIds: [],
    worldState: world,
  };
}

// 1. Sequential years, the initial year, and a gap rejected before any pass
{
  const world = makeWorld([makeNpc({ id: 'ada' })]);
  const snapshot = relevantState(world);
  let skipped = false;
  try {
    progress(world, YEAR + 2);
  } catch (error) {
    skipped = true;
    assert(
      error instanceof Error && error.message === `Non-sequential simulation year: expected ${YEAR}, received ${YEAR + 2}`,
      `unexpected skip error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  assert(skipped, 'a skipped year was accepted');
  assert(relevantState(world) === snapshot, 'rejecting a skipped year changed the caller world');
  assert(world.npcRegistry.ada?.age === 30, 'a rejected year aged an NPC');

  const repeated = progress(world, YEAR - 1);
  assert(repeated === world, 'a repeat year returned a different world');

  const unstamped = makeWorld([makeNpc({ id: 'ada' })]);
  unstamped.lastSimulatedYear = Number.NaN;
  const initial = progress(unstamped, 1999);
  assert(initial.lastSimulatedYear === 1999, 'a missing baseline did not accept the supplied year');
  assert(initial.npcRegistry.ada?.age === 31, 'the initial year did not age the NPC once');
  assert(progress(initial, 1999) === initial, 'repeating the initial year ran it again');
  console.log('✅ 1. Repeated years no-op, the first finite year is accepted, and a gap throws before mutation.');
}

// 2. A thrown pass leaves the caller world unchanged
{
  const broken = makeWorld([makeNpc({ id: 'ada' })]);
  delete (broken.npcRegistry.ada as { education?: NpcEducationState }).education;
  const snapshot = relevantState(broken);
  let threw = false;
  try {
    progress(broken);
  } catch {
    threw = true;
  }
  assert(threw, 'a broken NPC year completed');
  assert(relevantState(broken) === snapshot, 'a thrown pipeline changed the caller world');
  console.log('✅ 2. A thrown pipeline leaves the original world unchanged.');
}

// 3. One goals stream across both calls
{
  const homeGoal: NpcGoal = {
    id: 'goal-home',
    templateId: 'purchase_property',
    category: 'financial',
    title: 'Purchase a Home & Build Real Estate Equity',
    priority: 'primary',
    targetYear: YEAR + 8,
    targetValue: 35000,
    baselineValue: 0,
    progress: 0,
    status: 'active',
    isCompleted: false,
    isAbandoned: false,
    createdYear: YEAR - 1,
  };
  const world = makeWorld([
    makeNpc({
      id: 'goalie',
      age: 30,
      goals: [homeGoal],
      career: {
        jobId: 'ft_receptionist',
        title: 'Front Desk Receptionist',
        occupation: 'Front Desk Receptionist',
        salary: 42000,
        performance: 60,
      },
      finances: { cash: 250000, annualIncome: 42000, netWorth: 250000 },
    }),
  ]);
  const before = relevantState(world);
  const shared = JSON.stringify(goalReference(world, 'shared'));
  const recreated = JSON.stringify(goalReference(world, 'recreated'));
  assert(shared !== recreated, 'the shared and recreated goals references did not diverge');
  const simulated = progress(world);
  assert(JSON.stringify(simulated.npcRegistry.goalie?.goals) === shared, 'the orchestrator restarted the goals stream');
  assert(relevantState(world) === before, 'the goals year mutated its input');
  console.log('✅ 3. Both goals calls share one generator, and a recreated generator diverges.');
}

// 4. Same-year idempotency, dead NPCs, and one school step
{
  const ghost = makeNpc({
    id: 'ghost',
    age: 4,
    alive: false,
    stage: 'none',
    estateSettled: true,
    deathYear: YEAR - 1,
    career: { occupation: 'Toddler', title: 'Toddler', salary: 0 },
  });
  const pupil = makeNpc({ id: 'pip', age: 4, stage: 'none', career: { occupation: 'Toddler', title: 'Toddler', salary: 0 } });
  const ghostBefore = JSON.stringify({
    age: ghost.age,
    birthYear: ghost.birthYear,
    education: ghost.education,
    career: ghost.career,
    finances: ghost.finances,
    goals: ghost.goals,
    lifeHistory: ghost.lifeHistory,
  });
  const world = makeWorld([ghost, pupil]);
  const once = progress(world);
  const twice = progress(once);
  assert(twice === once, 'the same year produced a second world');
  const dead = once.npcRegistry.ghost;
  const student = once.npcRegistry.pip;
  assert(dead && student, 'the school year dropped an NPC');
  const ghostAfter = JSON.stringify({
    age: dead.age,
    birthYear: dead.birthYear,
    education: dead.education,
    career: dead.career,
    finances: dead.finances,
    goals: dead.goals,
    lifeHistory: dead.lifeHistory,
  });
  assert(ghostAfter === ghostBefore, 'a dead NPC was progressed');
  assert(dead.tier === 'historical', 'a dead NPC was left in an active tier');
  assert(student.age === 5 && student.education.currentStage === 'elementary', 'the living child did not enter elementary school at 5');
  assert(student.education.stageYearsCompleted === 0, 'elementary enrollment consumed a school year');
  assert(student.education.stageYearsCompleted === twice.npcRegistry.pip?.education.stageYearsCompleted, 'a repeated year advanced school again');
  console.log('✅ 4. A repeated year is the same world. Dead NPCs stay put. School advances once.');
}

// 5. Registry order, newborns, and multi-decade reproduction
{
  const forward = makeWorld([makeNpc({ id: 'leo', age: 24, gender: 'male' }), makeNpc({ id: 'mia', age: 24 })]);
  const reverseRegistry: Record<string, NpcProfile> = {};
  const reverseSource = makeWorld([makeNpc({ id: 'mia', age: 24 }), makeNpc({ id: 'leo', age: 24, gender: 'male' })]);
  for (const id of ['mia', 'leo']) {
    const npc = reverseSource.npcRegistry[id];
    if (npc) reverseRegistry[id] = npc;
  }
  reverseSource.npcRegistry = reverseRegistry;
  assert(relevantState(progress(forward)) === relevantState(progress(reverseSource)), 'registry insertion order changed the year');

  const started = familyWorld();
  const beforeFamily = relevantState(started);
  const firstDecade = advance(started, 10);
  const born = Object.values(firstDecade.npcRegistry).filter((npc) => npc.birthYear === YEAR);
  assert(born.length > 0 && born.every((child) => child.age === YEAR + 9 - child.birthYear), 'a child born in the first year was aged during that year');
  assert(advance(familyWorld(), 10) && relevantState(advance(familyWorld(), 10)) === relevantState(firstDecade), 'the 10-year world changed between runs');
  const quarter = advance(familyWorld(), 25);
  assert(relevantState(advance(familyWorld(), 25)) === relevantState(quarter), 'the 25-year world changed between runs');
  const half = advance(familyWorld(), 50);
  assert(relevantState(advance(familyWorld(), 50)) === relevantState(half), 'the 50-year world changed between runs');
  assert(relevantState(started) === beforeFamily, 'the multi-decade run mutated its input');
  const player = playerShell(started);
  const playerBefore = JSON.stringify(player);
  progress(player.worldState ?? started);
  assert(JSON.stringify(player) === playerBefore, 'the orchestrator changed the player profile');
  assert(player.cash === 5000, 'the orchestrator changed player cash');
  console.log('✅ 5. Order, birth-year age, player cash, and 10/25/50-year worlds are stable.');
}

// 6. Selectors still read the simulated world
{
  const decade = advance(familyWorld(), 10);
  const character = playerShell(decade, 40);
  const parents = getParentsView(character);
  const children = getChildrenSelector(character);
  const partner = getPartnerSelector(character);
  assert(parents.father.firstName.length > 0 && parents.mother.firstName.length > 0, 'parent selector failed');
  assert(Array.isArray(children), 'child selector failed');
  assert(partner === null || partner.firstName.length > 0, 'partner selector failed');
  console.log('✅ 6. Parent, child, and partner selectors read the integrated world.');
}

// 7. Age Up stores the completed world without replacing the player year
{
  const seeded = makeWorld([makeNpc({ id: 'sam', age: 40 })]);
  seeded.lastSimulatedYear = 2020;
  const seededPlayer = playerShell(seeded, 20);
  seededPlayer.birthYear = 2000;
  const once = ageUpCharacter(seededPlayer);
  const onceWorld = once.worldState;
  assert(once.age === 21, 'Age Up did not advance the player');
  assert(once.parents.father.id === 'dad_1' && once.parents.mother.id === 'mom_1', 'Age Up replaced the legacy parent profiles');
  assert(onceWorld?.lastSimulatedYear === 2021, 'Age Up did not stamp the next NPC year');
  assert(onceWorld, 'Age Up did not store a world');
  assert(onceWorld.npcRegistry.sam?.age === 41, 'Age Up did not age the NPC with the player');
  assert(progress(onceWorld, 2021) === onceWorld, 'the Age Up year could be applied again');
  const twice = ageUpCharacter(once);
  const twiceWorld = twice.worldState;
  assert(twiceWorld, 'the second Age Up dropped the world');
  assert(twice.age === 22 && twiceWorld.npcRegistry.sam?.age === 42, 'the second Age Up applied more than one NPC year');
  assert(twiceWorld.lastSimulatedYear === 2022, 'the second Age Up skipped or repeated the stamp');

  const bare = playerShell(makeWorld([]), 24);
  delete bare.worldState;
  bare.birthYear = 2000;
  const agedBare = ageUpCharacter(bare);
  assert(agedBare.age === 25, 'a character without a world did not age');
  assert(agedBare.parents.father.id === 'dad_1', 'migrating the NPC world replaced the player father');
  assert(agedBare.worldState?.lastSimulatedYear === 2025, 'the first Age Up did not simulate the next year');
  console.log('✅ 7. Age Up keeps the player year and stores exactly one NPC year.');
}

// 8. Diagnostic performance sample
{
  const npcs: NpcProfile[] = [];
  for (let index = 0; index < 100; index += 1) {
    npcs.push(makeNpc({
      id: `npc-${String(index).padStart(3, '0')}`,
      age: 20,
      gender: index % 2 === 0 ? 'female' : 'male',
      city: `Town ${Math.floor(index / 10)}`,
    }));
  }
  const world = makeWorld(npcs, [], { maxChildrenPerCouple: 0, activeNpcTarget: 150 });
  const durations: number[] = [];
  let cursor = world;
  const memory = (globalThis as { process?: { memoryUsage(): { heapUsed: number } } }).process;
  assert(memory, 'the performance sample needs process.memoryUsage');
  const heapBefore = memory.memoryUsage().heapUsed;
  let decade = '';
  for (let step = 0; step < 50; step += 1) {
    const startedAt = performance.now();
    cursor = progress(cursor, YEAR + step);
    const elapsed = performance.now() - startedAt;
    durations.push(elapsed);
    assert(elapsed < 2000, `year ${YEAR + step} took ${elapsed.toFixed(1)} ms`);
    if (step === 9) decade = relevantState(cursor);
  }
  const heapDeltaMb = (memory.memoryUsage().heapUsed - heapBefore) / (1024 * 1024);
  let repeat = world;
  for (let step = 0; step < 10; step += 1) repeat = progress(repeat, YEAR + step);
  assert(relevantState(repeat) === decade, 'the 100-NPC sample did not reproduce');
  const sample = durations.slice(0, 10).sort((left, right) => left - right);
  const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  const p95 = sample[Math.min(sample.length - 1, Math.ceil(sample.length * 0.95) - 1)] ?? mean;
  console.log(
    `performance mean ${mean.toFixed(1)} ms; p95 ${p95.toFixed(1)} ms; heap delta ${heapDeltaMb.toFixed(2)} MB (diagnostic comparison: 120 ms mean, 200 ms p95, 15 MB heap)`
  );
  console.log('✅ 8. One hundred NPCs finished every year within two seconds and reproduced.');
}
