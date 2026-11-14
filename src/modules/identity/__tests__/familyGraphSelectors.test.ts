import type { CharacterProfile } from '../../../types/game';
import type { NpcProfile, RelationshipEdge, WorldSimulationState } from '../../autonomy/types';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import {
  FAMILY_GRAPH_MAX_DEPTH,
  MEMBER_LIFE_HISTORY_LIMIT,
  selectFamilyGraph,
  selectFamilyMemberDetail,
} from '../services/familyGraphSelectors';

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

function makeNpc(overrides: Partial<NpcProfile> & { id: string; firstName: string }): NpcProfile {
  return {
    id: overrides.id,
    tier: overrides.tier ?? 'social',
    firstName: overrides.firstName,
    lastName: overrides.lastName ?? 'Lin',
    gender: overrides.gender ?? 'female',
    biologicalGender: overrides.biologicalGender ?? 'female',
    age: overrides.age ?? 30,
    birthYear: overrides.birthYear ?? 1995,
    isAlive: overrides.isAlive ?? true,
    deathYear: overrides.deathYear,
    causeOfDeath: overrides.causeOfDeath,
    location: overrides.location ?? { country: 'Canada', city: 'Toronto', residenceHistory: [] },
    identityResolutionStatus: 'canonical',
    looks: 70,
    smarts: 70,
    health: 80,
    happiness: 75,
    fertility: 70,
    craziness: 30,
    personality: {
      openness: 60,
      conscientiousness: 60,
      extraversion: 60,
      agreeableness: 60,
      neuroticism: 40,
      ambition: 60,
      generosity: 60,
      loyalty: 70,
      riskTolerance: 40,
      empathy: 70,
      sociability: 60,
      patience: 60,
      materialism: 40,
    },
    lifestyle: {
      diet: 'standard',
      fitnessHabit: 'casual',
      substances: { alcohol: 'none', smoking: false },
      interests: [],
      hobbies: [],
    },
    goals: [],
    healthConditions: [],
    education: overrides.education ?? {
      currentStage: 'graduated',
      schoolName: 'State U',
      grades: 85,
      history: [],
    },
    career: overrides.career ?? {
      jobId: 'dev',
      title: 'Engineer',
      companyName: 'NorthTech',
      occupation: 'Engineer',
      salary: 75000,
      performance: 80,
      yearsInRole: 4,
      isRetired: false,
      pensionAnnual: 0,
      history: [],
    },
    finances: {
      currency: 'CAD',
      cash: 10000,
      savings: 0,
      realEstateValue: 0,
      businessEquity: 0,
      studentDebt: 0,
      mortgageBalance: 0,
      otherLiabilities: 0,
      annualIncome: 75000,
      annualExpenses: 40000,
      netWorth: 10000,
    },
    lifeHistory: overrides.lifeHistory ?? [],
    adoptiveParentIds: [],
    stepParentIds: [],
    isAdopted: overrides.isAdopted ?? false,
  };
}

function makeEdge(
  params: {
    id: string;
    a: string;
    b: string;
    category: RelationshipEdge['category'];
    roleForA: RelationshipEdge['roleForA'];
    roleForB: RelationshipEdge['roleForB'];
    lineage?: RelationshipEdge['lineageRelation'];
    status?: RelationshipEdge['status'];
    parentRoleForA?: RelationshipEdge['parentRoleForA'];
    parentRoleForB?: RelationshipEdge['parentRoleForB'];
    yearsTogether?: number;
  }
): RelationshipEdge {
  const flip = params.a > params.b;
  return {
    id: params.id,
    participantAId: flip ? params.b : params.a,
    participantBId: flip ? params.a : params.b,
    category: params.category,
    roleForA: flip ? params.roleForB : params.roleForA,
    roleForB: flip ? params.roleForA : params.roleForB,
    lineageRelation: params.lineage ?? 'biological',
    parentRoleForA: flip ? params.parentRoleForB : params.parentRoleForA,
    parentRoleForB: flip ? params.parentRoleForA : params.parentRoleForB,
    status: params.status ?? 'active',
    trust: 80,
    affection: 80,
    respect: 80,
    romance: 75,
    compatibility: 80,
    yearsTogether: params.yearsTogether ?? 2,
    lastInteractedYear: 2025,
    episodes: [],
  };
}

function makeWorld(npcs: NpcProfile[], edges: RelationshipEdge[]): WorldSimulationState {
  const npcRegistry: Record<string, NpcProfile> = {};
  for (const n of npcs) npcRegistry[n.id] = n;
  const relationshipsById: Record<string, RelationshipEdge> = {};
  for (const e of edges) relationshipsById[e.id] = e;
  return {
    schemaVersion: 2,
    worldSeed: 123,
    simulationVersion: 1,
    lastSimulatedYear: 2025,
    lastSimulationTurnId: 'turn_1',
    familyWealth: 'comfortable',
    legacyIdMappings: {},
    npcRegistry,
    relationshipsById,
    relationshipIndex: {},
    inheritanceRecords: {},
    memories: {},
    lifeUpdatesFeed: [],
    populationConfig: {
      activeNpcTarget: 120,
      maxChildrenPerCouple: 4,
      allowMultipleBirths: true,
      elderMortalityAgeCutoff: 75,
      minAutonomousRomanceAge: 18,
      minAutonomousReproductionAge: 18,
      maxFemaleBiologicalFertilityAge: 46,
      minEngagementYears: 2,
      retirementTargetAge: 60,
      allowRelocation: true,
    },
  };
}

function makeBaseCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'player_1',
    firstName: 'Aria',
    lastName: 'Lin',
    gender: 'female',
    age: 30,
    birthYear: 1995,
    country: 'Canada',
    city: 'Toronto',
    occupation: 'Architect',
    cash: 20000,
    bankBalance: 10000,
    netWorth: 30000,
    isAlive: true,
    stats: { health: 85, happiness: 85, smarts: 85, looks: 80, karma: 80 },
    parents: {
      father: {
        id: 'dad_1',
        role: 'father',
        firstName: 'David',
        lastName: 'Lin',
        age: 58,
        occupation: 'Accountant',
        isAlive: true,
        relationship: 80,
        generosity: 70,
      },
      mother: {
        id: 'mom_1',
        role: 'mother',
        firstName: 'Mei',
        lastName: 'Lin',
        age: 56,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 85,
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

// 1. Age 0 legacy-only + missing optional slices
{
  const age0 = makeBaseCharacter({
    age: 0,
    siblings: undefined,
    partner: undefined,
    exPartners: undefined,
    children: undefined,
    pets: undefined,
  });
  const graph = selectFamilyGraph(age0);
  assert(graph.canonicalStateUsed === false, 'Age 0 runs cleanly without worldState');
  assert(graph.parents.length === 2, 'Age 0 exposes 2 parents');
  assert(graph.siblings.length === 0 && graph.children.length === 0 && graph.currentPartner === null, 'Missing optional slices return empty safely');
  assert(graph.petMemorials.length === 0, 'Missing pets produce empty memorials');
}

// 2. Canonical v2 multi-gen (parents, step-parent, siblings, partner, children, grandchild, niece/nephew, depth limit, unrelated NPC exclusion)
{
  const dad = makeNpc({ id: 'dad_1', firstName: 'David', biologicalGender: 'male', gender: 'male', age: 65 });
  const mom = makeNpc({ id: 'mom_1', firstName: 'Mei', age: 63, isAlive: false, deathYear: 2022, causeOfDeath: 'Natural causes' });
  const grandParentInWorld = makeNpc({ id: 'unverified_gp', firstName: 'Henry', age: 92 });
  const sib = makeNpc({ id: 'sib_1', firstName: 'Lucas', gender: 'male', biologicalGender: 'male', age: 35 });
  const niece = makeNpc({ id: 'niece_1', firstName: 'Maya', age: 10 });
  const nieceChildTooDeep = makeNpc({ id: 'great_niece_1', firstName: 'BabyTooDeep', age: 1 });
  const spouse = makeNpc({ id: 'partner_1', firstName: 'Jordan', gender: 'male', biologicalGender: 'male', age: 40 });
  const stepChild = makeNpc({ id: 'step_kid_1', firstName: 'Riley', age: 16 });
  const adultChild = makeNpc({ id: 'child_1', firstName: 'Elena', age: 25 });
  const grandChild = makeNpc({ id: 'grandchild_1', firstName: 'Noah', gender: 'male', biologicalGender: 'male', age: 3 });
  const greatGrandChildTooDeep = makeNpc({ id: 'great_grand_1', firstName: 'Depth3', age: 0 });
  const adoptedNowChild = {
    id: 'child_adopted_today',
    firstName: 'Zoe',
    lastName: 'Lin',
    age: 4,
    gender: 'female' as const,
    relationship: 90,
    smarts: 75,
    looks: 75,
    happiness: 90,
    health: 95,
    isAdopted: true,
    occupation: 'Toddler',
    isAlive: true,
  };
  const unrelatedFriend = makeNpc({ id: 'friend_1', firstName: 'Sam', age: 30 });
  const unrelatedStranger = makeNpc({ id: 'stranger_1', firstName: 'Ghost', age: 40, tier: 'background' });

  const edges: RelationshipEdge[] = [
    makeEdge({ id: 'e_dad', a: 'dad_1', b: 'player_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', parentRoleForA: 'father' }),
    makeEdge({ id: 'e_mom', a: 'mom_1', b: 'player_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', parentRoleForA: 'mother' }),
    // Upward link above dad must NEVER become a fabricated grandparent
    makeEdge({ id: 'e_upward_gp', a: 'unverified_gp', b: 'dad_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', parentRoleForA: 'father' }),
    makeEdge({ id: 'e_sib', a: 'player_1', b: 'sib_1', category: 'sibling', roleForA: 'sibling', roleForB: 'sibling' }),
    makeEdge({ id: 'e_niece', a: 'sib_1', b: 'niece_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', parentRoleForA: 'father' }),
    makeEdge({ id: 'e_depth3_niece', a: 'niece_1', b: 'great_niece_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child' }),
    makeEdge({ id: 'e_spouse', a: 'player_1', b: 'partner_1', category: 'dating', roleForA: 'dating', roleForB: 'dating' }),
    makeEdge({ id: 'e_stepchild', a: 'partner_1', b: 'step_kid_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child' }),
    makeEdge({ id: 'e_child', a: 'player_1', b: 'child_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', parentRoleForA: 'mother' }),
    makeEdge({ id: 'e_grand', a: 'child_1', b: 'grandchild_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', parentRoleForA: 'mother' }),
    makeEdge({ id: 'e_depth3_grand', a: 'grandchild_1', b: 'great_grand_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child' }),
    // Cycles back to player and between child/grandchild
    makeEdge({ id: 'e_cycle', a: 'grandchild_1', b: 'child_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child' }),
    // Non-kinship social edge must be excluded
    makeEdge({ id: 'e_friend', a: 'player_1', b: 'friend_1', category: 'best_friend', roleForA: 'best_friend', roleForB: 'best_friend' }),
    // Dangling edge missing target NPC must be dropped
    makeEdge({ id: 'e_dangling', a: 'player_1', b: 'missing_npc_999', category: 'sibling', roleForA: 'sibling', roleForB: 'sibling' }),
  ];

  const multiGenChar = makeBaseCharacter({
    age: 50,
    siblings: [{ id: 'sib_1', role: 'brother', firstName: 'Lucas', lastName: 'Lin', age: 35, gender: 'male', relationship: 80, occupation: 'Engineer', isAlive: true, birthOrder: 'older' }],
    children: [
      { id: 'child_1', firstName: 'Elena', lastName: 'Lin', age: 25, gender: 'female', relationship: 90, smarts: 80, looks: 80, happiness: 85, health: 90, isAdopted: false, occupation: 'Designer', isAlive: true },
      adoptedNowChild,
    ],
    // Same-year wedding overrides stale canonical 'dating' edge
    partner: {
      id: 'partner_1',
      firstName: 'Jordan',
      lastName: 'Lin',
      age: 40,
      gender: 'male',
      role: 'Husband',
      relationshipType: 'spouse',
      romanticStage: 'married',
      relationship: 95,
      romanceMeter: 90,
      originStory: 'Met in Toronto',
      stageMet: 'adulthood',
      partnerStats: { craziness: 20, generosity: 80, looks: 75, smarts: 80, fertility: 70, yearsTogether: 5, hasPrenup: true, weddingVenue: 'City Hall' },
    },
    worldState: makeWorld(
      [dad, mom, grandParentInWorld, sib, niece, nieceChildTooDeep, spouse, stepChild, adultChild, grandChild, greatGrandChildTooDeep, unrelatedFriend, unrelatedStranger],
      edges
    ),
  });

  deepFreeze(multiGenChar);
  const snapshotBefore = JSON.stringify(multiGenChar);

  const graph = selectFamilyGraph(multiGenChar);
  assert(FAMILY_GRAPH_MAX_DEPTH === 2, 'Depth limit constant is 2');
  assert(graph.canonicalStateUsed === true, 'Canonical schema v2 detected');
  assert(graph.parents.length === 2, 'Both parents present without duplicates');
  assert(graph.parents.find((p) => p.id === 'mom_1')?.isAlive === false && graph.parents.find((p) => p.id === 'mom_1')?.deathYear === 2022, 'Canonical parent death metadata preserved');
  assert(!graph.allMembers.some((m) => m.id === 'unverified_gp'), 'Grandparent above parent must NOT be traversed or invented');
  assert(graph.siblings.length === 1 && graph.siblings[0].id === 'sib_1', 'Duplicate legacy+canonical sibling deduplicated to 1');
  assert(graph.niecesAndNephews.length === 1 && graph.niecesAndNephews[0].id === 'niece_1', 'Niece derived at depth 2');
  assert(graph.currentPartner?.id === 'partner_1' && graph.currentPartner.relationLabel === 'Spouse' && graph.currentPartner.maritalDetails?.hasPrenup === true, 'Same-year legacy marriage owns partner presentation');
  assert(graph.children.some((c) => c.id === 'child_1') && graph.children.some((c) => c.id === 'child_adopted_today' && c.lineageRelation === 'adoptive'), 'Canonical child + current-year legacy adoption both included');
  assert(graph.children.some((c) => c.id === 'step_kid_1' && c.lineageRelation === 'step'), 'Stepchild via active spouse depth-2 included');
  assert(graph.grandchildren.length === 1 && graph.grandchildren[0].id === 'grandchild_1', 'Grandchild derived at depth 2');
  assert(!graph.allMembers.some((m) => m.id === 'great_grand_1' || m.id === 'great_niece_1'), 'Depth-3 relatives strictly blocked');
  assert(!graph.allMembers.some((m) => m.id === 'friend_1' || m.id === 'stranger_1' || m.id === 'missing_npc_999'), 'Friends, strangers, and dangling edges strictly excluded');
  assert(JSON.stringify(multiGenChar) === snapshotBefore, 'Zero mutation on frozen worldState character');
}

// 3. Death irreversibility & legacy ex-partner override
{
  const deadSpouseNpc = makeNpc({ id: 'p_dead', firstName: 'Sam', isAlive: false, deathYear: 2024, causeOfDeath: 'Heart failure' });
  const divorcedNpc = makeNpc({ id: 'p_divorced', firstName: 'Taylor', isAlive: true });
  const aliveLegacyDeadParent = makeNpc({ id: 'mom_1', firstName: 'Mei', isAlive: true });

  const char = makeBaseCharacter({
    parents: {
      ...makeBaseCharacter().parents,
      mother: { ...makeBaseCharacter().parents.mother, isAlive: false },
    },
    // Stale legacy partner still holds p_dead; canonical knows p_dead died -> Deceased wins!
    partner: {
      id: 'p_dead',
      firstName: 'Sam',
      lastName: 'Lin',
      age: 34,
      gender: 'male',
      role: 'Husband',
      relationshipType: 'spouse',
      romanticStage: 'married',
      relationship: 90,
      originStory: 'College',
      stageMet: 'university',
    },
    // Newly finalized divorce not yet synced to canonical edge
    exPartners: [
      {
        id: 'p_divorced',
        firstName: 'Taylor',
        lastName: 'Cole',
        age: 32,
        gender: 'female',
        role: 'Ex-Spouse',
        relationshipType: 'ex',
        romanticStage: 'ex',
        relationship: 20,
        originStory: 'Work',
        stageMet: 'adulthood',
        partnerStats: { craziness: 40, generosity: 50, looks: 70, smarts: 70, fertility: 70, weddingVenue: 'Beach' },
      },
    ],
    worldState: makeWorld(
      [deadSpouseNpc, divorcedNpc, aliveLegacyDeadParent],
      [
        makeEdge({ id: 'e_dead_p', a: 'player_1', b: 'p_dead', category: 'spouse', roleForA: 'spouse', roleForB: 'spouse', status: 'active' }),
        makeEdge({ id: 'e_div', a: 'player_1', b: 'p_divorced', category: 'spouse', roleForA: 'spouse', roleForB: 'spouse', status: 'active' }),
        makeEdge({ id: 'e_mom', a: 'mom_1', b: 'player_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', parentRoleForA: 'mother' }),
      ]
    ),
  });

  const graph = selectFamilyGraph(char);
  assert(graph.currentPartner === null, 'Deceased partner must not appear as living currentPartner');
  const deadSpouse = graph.formerPartners.find((m) => m.id === 'p_dead');
  assert(deadSpouse?.relationKind === 'deceased_spouse' && deadSpouse.isAlive === false && deadSpouse.deathYear === 2024, 'Canonical death wins over stale legacy living partner');
  const exSpouse = graph.formerPartners.find((m) => m.id === 'p_divorced');
  assert(exSpouse?.relationKind === 'former_spouse' && exSpouse.isCurrent === false, 'Legacy ex-spouse overrides stale canonical active spouse edge');
  const legacyDeadMom = graph.parents.find((p) => p.id === 'mom_1');
  assert(legacyDeadMom?.isAlive === false && legacyDeadMom.deathYear === null && legacyDeadMom.causeOfDeath === null, 'Legacy death wins over stale canonical living parent without fabricating deathYear/causeOfDeath');
}

// 4. Same-name different IDs, missing IDs synthetic keys, member details + lifeHistory limit, pet memorials separate
{
  const longHistory = Array.from({ length: 20 }, (_, i) => ({
    id: `lh_${i}`,
    dedupeKey: `dad_no_merge:promoted:${2000 + i}:none`,
    npcId: 'child_same_1',
    year: 2000 + i,
    age: 20 + i,
    type: 'promoted' as const,
    title: `Promotion ${i}`,
    description: `Promoted step ${i}`,
  }));

  const char = makeBaseCharacter({
    parents: {
      father: { id: '' as string, role: 'father', firstName: 'David', lastName: 'Lin', age: 60, occupation: 'Cook', isAlive: true, relationship: 80, generosity: 60 },
      mother: { id: 'mom_1', role: 'mother', firstName: 'Mei', lastName: 'Lin', age: 58, occupation: 'Nurse', isAlive: true, relationship: 80, generosity: 60 },
      wealth: 'modest',
    },
    children: [
      { id: 'child_same_1', firstName: 'Alex', lastName: 'Lin', age: 8, gender: 'male', relationship: 90, smarts: 80, looks: 80, happiness: 90, health: 90, isAdopted: false, occupation: 'Student', isAlive: true },
      { id: 'child_same_2', firstName: 'Alex', lastName: 'Lin', age: 6, gender: 'female', relationship: 90, smarts: 80, looks: 80, happiness: 90, health: 90, isAdopted: true, occupation: 'Student', isAlive: true },
    ],
    pets: {
      animals: [
        {
          id: 'pet_mem_1',
          name: 'Mochi',
          species: 'pet_cat',
          temperament: 'steady',
          petAge: 14,
          adoptedAtAge: 10,
          health: 0,
          attachment: 90,
          lastFedAge: 23,
          lastPlayedAge: 23,
          lastVetAge: null,
          lastMoment: 'Mochi slept peacefully.',
          status: 'memorial',
          closedAtAge: 24,
          closingLine: 'Mochi passed peacefully at home.',
        },
        { bad: 'pet' },
      ],
    },
    worldState: makeWorld(
      [
        makeNpc({ id: 'npc_other_david', firstName: 'David', lastName: 'Lin', age: 60 }),
        makeNpc({ id: 'child_same_1', firstName: 'Alex', lastName: 'Lin', age: 8, gender: 'male', biologicalGender: 'male', lifeHistory: longHistory }),
      ],
      [makeEdge({ id: 'e_c1', a: 'player_1', b: 'child_same_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child' })]
    ),
  });

  const graph = selectFamilyGraph(char);
  const synDad = graph.parents.find((p) => p.firstName === 'David');
  assert(synDad?.id === 'legacy:father' && synDad.hasCanonicalId === false, 'Missing parent ID falls back to synthetic key');
  assert(!graph.allMembers.some((m) => m.id === 'npc_other_david'), 'Same-name unlinked NPC never merged by name');
  assert(graph.children.length === 2 && graph.children[0].id !== graph.children[1].id, 'Two children sharing exact same name remain separate');
  assert(graph.petMemorials.length === 1 && graph.petMemorials[0].name === 'Mochi', 'Valid pet memorial extracted cleanly');
  assert(!graph.allMembers.some((m) => m.id === 'pet_mem_1'), 'Pets never inserted into human family graph');

  const detail = selectFamilyMemberDetail(char, 'child_same_1');
  assert(detail !== null && detail.lifeHistoryHighlights.length === MEMBER_LIFE_HISTORY_LIMIT, 'Member detail bounds recorded lifeHistory highlights');
  assert(selectFamilyMemberDetail(char, 'non_existent') === null, 'Unknown ID returns null');
}

// 5. Widowed partner reconciliation, canonical deceased_spouse edge, ex-partner & sibling/child death regressions
{
  // 5a. Legacy widowed partner with NO canonical NPC record
  const legacyWidowedChar = makeBaseCharacter({
    worldState: undefined,
    partner: {
      id: 'p_widow_legacy',
      firstName: 'Arthur',
      lastName: 'Lin',
      age: 62,
      gender: 'male',
      role: 'Husband',
      relationshipType: 'spouse',
      romanticStage: 'widowed',
      relationship: 95,
      originStory: 'College',
      stageMet: 'university',
    },
  });
  const legacyWidowedGraph = selectFamilyGraph(legacyWidowedChar);
  assert(legacyWidowedGraph.currentPartner === null, 'Widowed legacy partner is not a living currentPartner');
  const widowedOnlyLegacy = legacyWidowedGraph.formerPartners.find((m) => m.id === 'p_widow_legacy');
  assert(
    widowedOnlyLegacy?.relationKind === 'deceased_spouse' &&
      widowedOnlyLegacy.relationLabel === 'Deceased Spouse' &&
      widowedOnlyLegacy.isAlive === false &&
      widowedOnlyLegacy.isCurrent === false &&
      widowedOnlyLegacy.isFormerRelationship === true &&
      widowedOnlyLegacy.source === 'legacy' &&
      widowedOnlyLegacy.deathYear === null &&
      widowedOnlyLegacy.causeOfDeath === null,
    'Widowed partner without canonical record stays deceased_spouse without inventing death metadata'
  );

  // 5b. Legacy widowed partner with stale canonical active spouse + canonical deceased_spouse edge fallback
  const staleAliveWidowNpc = makeNpc({ id: 'p_widow_stale', firstName: 'Claire', isAlive: true, age: 55 });
  const staleAliveDeceasedEdgeNpc = makeNpc({ id: 'p_edge_dead', firstName: 'Evan', isAlive: true, age: 48 });
  const deadWithMetaWidowNpc = makeNpc({
    id: 'p_widow_meta',
    firstName: 'Nora',
    isAlive: false,
    deathYear: 2021,
    causeOfDeath: 'Stroke',
  });

  const widowedStaleChar = makeBaseCharacter({
    partner: {
      id: 'p_widow_stale',
      firstName: 'Claire',
      lastName: 'Lin',
      age: 55,
      gender: 'female',
      role: 'Wife',
      relationshipType: 'spouse',
      romanticStage: 'widowed',
      relationship: 90,
      originStory: 'Work',
      stageMet: 'adulthood',
    },
    worldState: makeWorld(
      [staleAliveWidowNpc],
      [makeEdge({ id: 'e_widow_stale', a: 'player_1', b: 'p_widow_stale', category: 'spouse', roleForA: 'spouse', roleForB: 'spouse', status: 'active' })]
    ),
  });
  const widowedStaleGraph = selectFamilyGraph(widowedStaleChar);
  assert(widowedStaleGraph.currentPartner === null, 'Widowed partner with stale canonical active edge is not living currentPartner');
  const staleWidowMember = widowedStaleGraph.formerPartners.find((m) => m.id === 'p_widow_stale');
  assert(
    staleWidowMember?.relationKind === 'deceased_spouse' &&
      staleWidowMember.isAlive === false &&
      staleWidowMember.isCurrent === false &&
      staleWidowMember.deathYear === null &&
      staleWidowMember.causeOfDeath === null,
    'Widowed legacy state defeats stale canonical active spouse edge without inventing deathYear'
  );

  // 5c. Canonical deceased_spouse edge when npc.isAlive is stale true
  const edgeDeadChar = makeBaseCharacter({
    partner: {
      id: 'p_edge_dead',
      firstName: 'Evan',
      lastName: 'Lin',
      age: 48,
      gender: 'male',
      role: 'Husband',
      relationshipType: 'spouse',
      romanticStage: 'married',
      relationship: 90,
      originStory: 'City',
      stageMet: 'adulthood',
    },
    worldState: makeWorld(
      [staleAliveDeceasedEdgeNpc],
      [makeEdge({ id: 'e_dec_edge', a: 'player_1', b: 'p_edge_dead', category: 'deceased_spouse', roleForA: 'spouse', roleForB: 'spouse', status: 'deceased' })]
    ),
  });
  const edgeDeadGraph = selectFamilyGraph(edgeDeadChar);
  assert(edgeDeadGraph.currentPartner === null, 'deceased_spouse canonical edge clears living currentPartner even when npc.isAlive is stale true');
  assert(
    edgeDeadGraph.formerPartners.some((m) => m.id === 'p_edge_dead' && m.relationKind === 'deceased_spouse' && m.isAlive === false),
    'deceased_spouse canonical edge marks spouse deceased'
  );

  // 5d. Canonical death metadata preserved when widowed partner also has canonical death details
  const widowMetaChar = makeBaseCharacter({
    partner: {
      id: 'p_widow_meta',
      firstName: 'Nora',
      lastName: 'Lin',
      age: 60,
      gender: 'female',
      role: 'Wife',
      relationshipType: 'spouse',
      romanticStage: 'widowed',
      relationship: 90,
      originStory: 'Town',
      stageMet: 'adulthood',
    },
    worldState: makeWorld(
      [deadWithMetaWidowNpc],
      [makeEdge({ id: 'e_wmeta', a: 'player_1', b: 'p_widow_meta', category: 'deceased_spouse', roleForA: 'spouse', roleForB: 'spouse', status: 'deceased' })]
    ),
  });
  const widowMetaMember = selectFamilyGraph(widowMetaChar).formerPartners.find((m) => m.id === 'p_widow_meta');
  assert(widowMetaMember?.deathYear === 2021 && widowMetaMember.causeOfDeath === 'Stroke', 'Canonical death metadata preserved alongside widowed stage');

  // 5e. Unmarried ex-partner, relationships[] ex path, deceased ex-partner, and sibling/child death disagreement
  const exDatingNpc = makeNpc({ id: 'ex_dating', firstName: 'Rory', isAlive: true });
  const exRelArrayNpc = makeNpc({ id: 'ex_rel_arr', firstName: 'Quinn', isAlive: true });
  const deadUnmarriedExNpc = makeNpc({ id: 'ex_dead_bf', firstName: 'Leo', isAlive: false, deathYear: 2023 });
  const sibLegacyDeadNpc = makeNpc({ id: 'sib_leg_dead', firstName: 'Ben', gender: 'male', biologicalGender: 'male', isAlive: true });
  const sibCanonDeadNpc = makeNpc({ id: 'sib_can_dead', firstName: 'Eva', isAlive: false, deathYear: 2020 });
  const childLegacyDeadNpc = makeNpc({ id: 'ch_leg_dead', firstName: 'Mia', isAlive: true });
  const childCanonDeadNpc = makeNpc({ id: 'ch_can_dead', firstName: 'Max', gender: 'male', biologicalGender: 'male', isAlive: false, deathYear: 2022 });

  const comboChar = makeBaseCharacter({
    siblings: [
      { id: 'sib_leg_dead', role: 'brother', firstName: 'Ben', lastName: 'Lin', age: 29, gender: 'male', relationship: 70, occupation: 'Chef', isAlive: false, birthOrder: 'younger' },
      { id: 'sib_can_dead', role: 'sister', firstName: 'Eva', lastName: 'Lin', age: 31, gender: 'female', relationship: 75, occupation: 'Pilot', isAlive: true, birthOrder: 'older' },
    ],
    children: [
      { id: 'ch_leg_dead', firstName: 'Mia', lastName: 'Lin', age: 12, gender: 'female', relationship: 80, smarts: 70, looks: 70, happiness: 80, health: 0, isAdopted: false, occupation: 'Student', isAlive: false },
      { id: 'ch_can_dead', firstName: 'Max', lastName: 'Lin', age: 14, gender: 'male', relationship: 80, smarts: 70, looks: 70, happiness: 80, health: 0, isAdopted: false, occupation: 'Student', isAlive: true },
    ],
    exPartners: [
      { id: 'ex_dating', firstName: 'Rory', lastName: 'Kerr', age: 28, gender: 'male', role: 'Ex-Boyfriend', relationshipType: 'ex', romanticStage: 'ex', relationship: 30, originStory: 'Cafe', stageMet: 'adulthood' },
      { id: 'ex_dead_bf', firstName: 'Leo', lastName: 'Vance', age: 30, gender: 'male', role: 'Ex-Boyfriend', relationshipType: 'ex', romanticStage: 'ex', relationship: 40, originStory: 'Gym', stageMet: 'adulthood' },
    ],
    relationships: [
      { id: 'ex_rel_arr', firstName: 'Quinn', lastName: 'Hall', age: 29, gender: 'non-binary', role: 'Ex-Partner', relationshipType: 'ex', romanticStage: 'ex', relationship: 25, originStory: 'Campus', stageMet: 'university' },
    ],
    worldState: makeWorld(
      [exDatingNpc, exRelArrayNpc, deadUnmarriedExNpc, sibLegacyDeadNpc, sibCanonDeadNpc, childLegacyDeadNpc, childCanonDeadNpc],
      [
        makeEdge({ id: 'e_exd', a: 'player_1', b: 'ex_dating', category: 'dating', roleForA: 'dating', roleForB: 'dating', status: 'active' }),
        makeEdge({ id: 'e_exr', a: 'player_1', b: 'ex_rel_arr', category: 'fiance', roleForA: 'fiance', roleForB: 'fiance', status: 'active' }),
        makeEdge({ id: 'e_exdead', a: 'player_1', b: 'ex_dead_bf', category: 'ex', roleForA: 'ex', roleForB: 'ex', status: 'former' }),
        makeEdge({ id: 'e_sld', a: 'player_1', b: 'sib_leg_dead', category: 'sibling', roleForA: 'sibling', roleForB: 'sibling', status: 'active' }),
        makeEdge({ id: 'e_scd', a: 'player_1', b: 'sib_can_dead', category: 'sibling', roleForA: 'sibling', roleForB: 'sibling', status: 'deceased' }),
        makeEdge({ id: 'e_cld', a: 'player_1', b: 'ch_leg_dead', category: 'parent_child', roleForA: 'parent', roleForB: 'child', status: 'active' }),
        makeEdge({ id: 'e_ccd', a: 'player_1', b: 'ch_can_dead', category: 'parent_child', roleForA: 'parent', roleForB: 'child', status: 'deceased' }),
      ]
    ),
  });

  const comboGraph = selectFamilyGraph(comboChar);
  assert(comboGraph.currentPartner === null, 'Neither ex_dating nor ex_rel_arr becomes currentPartner');
  const exDatingMember = comboGraph.formerPartners.find((m) => m.id === 'ex_dating');
  assert(exDatingMember?.relationKind === 'ex_partner' && exDatingMember.isCurrent === false, 'Unmarried ex-partner overrides stale canonical dating edge');
  const exRelArrMember = comboGraph.formerPartners.find((m) => m.id === 'ex_rel_arr');
  assert(exRelArrMember?.relationKind === 'ex_partner' && exRelArrMember.isCurrent === false, 'Legacy relationships[] ex entry included and overrides stale canonical fiance edge');
  const exDeadMember = comboGraph.formerPartners.find((m) => m.id === 'ex_dead_bf');
  assert(exDeadMember?.relationKind === 'ex_partner' && exDeadMember.isAlive === false && exDeadMember.deathYear === 2023, 'Deceased unmarried ex-partner marked dead');
  assert(comboGraph.siblings.find((s) => s.id === 'sib_leg_dead')?.isAlive === false, 'Legacy dead sibling stays dead despite stale canonical living NPC');
  assert(comboGraph.siblings.find((s) => s.id === 'sib_can_dead')?.isAlive === false && comboGraph.siblings.find((s) => s.id === 'sib_can_dead')?.deathYear === 2020, 'Canonical dead sibling stays dead despite stale legacy living record');
  assert(comboGraph.children.find((c) => c.id === 'ch_leg_dead')?.isAlive === false, 'Legacy dead child stays dead despite stale canonical living NPC');
  assert(comboGraph.children.find((c) => c.id === 'ch_can_dead')?.isAlive === false && comboGraph.children.find((c) => c.id === 'ch_can_dead')?.deathYear === 2022, 'Canonical dead child stays dead despite stale legacy living record');
}

// 6. Synthetic key collision with corrupted canonical NPC IDs & same-name distinct explicit IDs
{
  const corruptFatherNpc = makeNpc({
    id: 'legacy:father',
    firstName: 'CorruptCloneDad',
    lastName: 'Villain',
    age: 99,
    isAlive: false,
    deathYear: 1999,
    causeOfDeath: 'Corrupted',
    career: {
      jobId: 'pirate',
      title: 'Space Pirate',
      companyName: 'EvilCorp',
      occupation: 'Pirate',
      salary: 0,
      performance: 10,
      yearsInRole: 1,
      isRetired: true,
      pensionAnnual: 0,
      history: [],
    },
  });
  const corruptMotherNpc = makeNpc({
    id: 'legacy:mother',
    firstName: 'CorruptCloneMom',
    lastName: 'Villain',
    age: 99,
    isAlive: false,
    deathYear: 2001,
  });
  const otherChrisNpc = makeNpc({ id: 'npc_chris_unrelated', firstName: 'Chris', lastName: 'Lin', age: 27 });

  const collisionChar = makeBaseCharacter({
    parents: {
      father: { id: '', role: 'father', firstName: 'David', lastName: 'Lin', age: 60, occupation: 'Cook', isAlive: true, relationship: 80, generosity: 60 } as CharacterProfile['parents']['father'],
      mother: { id: '', role: 'mother', firstName: 'Mei', lastName: 'Lin', age: 58, occupation: 'Nurse', isAlive: true, relationship: 80, generosity: 60 } as CharacterProfile['parents']['mother'],
      wealth: 'modest',
    },
    siblings: [
      { id: 'sib_chris_1', role: 'brother', firstName: 'Chris', lastName: 'Lin', age: 25, gender: 'male', relationship: 80, occupation: 'Teacher', isAlive: true, birthOrder: 'younger' },
      { id: 'sib_chris_2', role: 'sister', firstName: 'Chris', lastName: 'Lin', age: 22, gender: 'female', relationship: 85, occupation: 'Doctor', isAlive: true, birthOrder: 'younger' },
    ],
    worldState: makeWorld(
      [corruptFatherNpc, corruptMotherNpc, otherChrisNpc],
      [makeEdge({ id: 'e_corrupt_dad', a: 'player_1', b: 'legacy:father', category: 'parent_child', roleForA: 'child', roleForB: 'parent', parentRoleForB: 'father' })]
    ),
  });

  const colGraph = selectFamilyGraph(collisionChar);
  const dad = colGraph.parents.find((p) => p.id === 'legacy:father');
  const mom = colGraph.parents.find((p) => p.id === 'legacy:mother');
  assert(
    dad?.firstName === 'David' &&
      dad.source === 'legacy' &&
      dad.hasCanonicalId === false &&
      dad.isAlive === true &&
      dad.deathYear === null &&
      dad.career === null,
    'Synthetic legacy:father never resolves or enriches from corrupted canonical NPC with matching id'
  );
  assert(
    mom?.firstName === 'Mei' && mom.source === 'legacy' && mom.hasCanonicalId === false && mom.isAlive === true,
    'Synthetic legacy:mother never resolves or enriches from corrupted canonical NPC with matching id'
  );
  assert(colGraph.siblings.length === 2 && colGraph.siblings[0].id !== colGraph.siblings[1].id, 'Two siblings with identical names and different explicit IDs stay separate');
  assert(!colGraph.allMembers.some((m) => m.id === 'npc_chris_unrelated'), 'Unrelated same-name NPC excluded');
}

// 7. Malformed non-array legacy slices, corrupted array items, corrupted worldState registry/edges, malformed lifeHistory
{
  const validSibNpc = makeNpc({
    id: 'sib_resilient',
    firstName: 'Sam',
    age: 26,
    lifeHistory: [
      null as unknown as NpcProfile['lifeHistory'][number],
      { id: 'bad_nan', dedupeKey: 'k1', npcId: 'sib_resilient', year: Number.NaN, age: 10, type: 'promoted', title: 'Bad', description: 'Bad' },
      { id: 'bad_neg_age', dedupeKey: 'k2', npcId: 'sib_resilient', year: 2020, age: -2, type: 'promoted', title: 'BadAge', description: 'Bad' },
      { id: 'bad_empty', dedupeKey: 'k3', npcId: 'sib_resilient', year: 2020, age: 10, type: 'promoted', title: '   ', description: 'Bad' },
      { id: 'good_lh', dedupeKey: 'k4', npcId: 'sib_resilient', year: 2024, age: 25, type: 'promoted', title: 'Promoted', description: 'Lead Dev' },
    ],
  });

  // 7a. Non-array legacy collections
  const nonArrayChar = makeBaseCharacter({
    siblings: 'not_an_array' as unknown as CharacterProfile['siblings'],
    children: 123 as unknown as CharacterProfile['children'],
    exPartners: { bad: true } as unknown as CharacterProfile['exPartners'],
    relationships: 'bad_rel' as unknown as CharacterProfile['relationships'],
    worldState: {
      ...makeWorld([validSibNpc], []),
      npcRegistry: 'corrupted_registry' as unknown as WorldSimulationState['npcRegistry'],
      relationshipsById: 'corrupted_edges' as unknown as WorldSimulationState['relationshipsById'],
    },
  });
  const nonArrayGraph = selectFamilyGraph(nonArrayChar);
  assert(nonArrayGraph.canonicalStateUsed === false, 'Corrupted non-object npcRegistry/relationshipsById degrades cleanly');
  assert(nonArrayGraph.siblings.length === 0 && nonArrayGraph.children.length === 0 && nonArrayGraph.formerPartners.length === 0, 'Non-array legacy fields handled without crashing');

  // 7b. Corrupted items inside arrays & corrupted canonical registry/edges
  const partialCorruptChar = makeBaseCharacter({
    siblings: [
      null as unknown as NonNullable<CharacterProfile['siblings']>[number],
      'str_item' as unknown as NonNullable<CharacterProfile['siblings']>[number],
      { id: 'no_name', firstName: '   ' } as unknown as NonNullable<CharacterProfile['siblings']>[number],
      { id: 'sib_resilient', role: 'brother', firstName: 'Sam', lastName: 'Lin', age: -10, gender: 'male', relationship: 70, occupation: 'Dev', isAlive: true, birthOrder: 'older' },
    ],
    worldState: {
      ...makeWorld([validSibNpc], []),
      npcRegistry: {
        sib_resilient: validSibNpc,
        bad_null: null as unknown as NpcProfile,
        bad_no_name: { id: 'bad_no_name', firstName: '' } as unknown as NpcProfile,
      },
      relationshipsById: {
        bad_edge_null: null as unknown as RelationshipEdge,
        bad_edge_cat: { id: 'e1', participantAId: 'player_1', participantBId: 'sib_resilient', category: 'not_real' } as unknown as RelationshipEdge,
        bad_edge_missing_b: { id: 'e2', participantAId: 'player_1', participantBId: '', category: 'sibling' } as unknown as RelationshipEdge,
        valid_edge: makeEdge({ id: 'e_ok', a: 'player_1', b: 'sib_resilient', category: 'sibling', roleForA: 'sibling', roleForB: 'sibling' }),
      },
    },
  });

  const corruptItemsGraph = selectFamilyGraph(partialCorruptChar);
  assert(corruptItemsGraph.siblings.length === 1 && corruptItemsGraph.siblings[0].id === 'sib_resilient', 'Valid sibling preserved while malformed array elements & edges are skipped');
  assert(corruptItemsGraph.siblings[0].age === 26, 'Negative legacy age ignored in favor of valid canonical age');
  assert(corruptItemsGraph.siblings[0].lifeHistoryHighlights.length === 1 && corruptItemsGraph.siblings[0].lifeHistoryHighlights[0].id === 'good_lh', 'Malformed NPC lifeHistory entries filtered out cleanly');
}

console.log('✅ familyGraphSelectors tests passed!');
