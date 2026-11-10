import { createInitialCareerState } from '../../career/services/careerService';
import { generateParents } from '../../character/services/familyService';
import { createInitialEducation } from '../../education/services/educationService';
import type { CharacterProfile, ChildProfile, PersonProfile, SiblingProfile } from '../../../types/game';
import {
  calculateCanonicalNetWorth,
  convertCurrency,
  createInitialNpcFinances,
  transferBetweenCashAndSavings,
} from '../services/currencyService';
import {
  calculateNaturalMortalityProbability,
  evaluateMortalityHazard,
  getNaturalHealthDeltaBounds,
} from '../services/healthMortalityService';
import {
  CURRENT_SCHEMA_VERSION,
  migrateToCanonicalWorldState,
  rebuildRelationshipIndex,
} from '../services/migrationService';
import {
  getChildrenForParticipantSelector,
  getChildrenSelector,
  getEdgeBetween,
  getParentsSelector,
  getParentsView,
  getPartnerSelector,
  getRelationshipsSelector,
  getSiblingsSelector,
  getStepParentsSelector,
  linkParentAndChild,
  orientRelationshipEdge,
  reconcilePopulationTiers,
} from '../services/npcRegistryService';
import {
  clampProbability,
  createNpcPRNG,
  SeededPRNG,
  sortDeterministicallyByScoreAndId,
} from '../services/seededPrngService';

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`
    );
  }
}

function assertDeepEqual<T>(actual: T, expected: T, msg: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      `Assertion failed: ${msg}\nExpected: ${expectedJson}\nActual:   ${actualJson}`
    );
  }
}

function createLegacyCharacterFixture(): CharacterProfile {
  const parents = generateParents('Vance');
  parents.father.id = 'father-explicit-id';
  parents.father.firstName = 'Arthur';
  parents.father.lastName = 'Vance';
  parents.father.age = 54;
  parents.father.occupation = 'Architect';
  parents.father.relationship = 88;
  parents.father.generosity = 75;

  parents.mother.id = 'mother-explicit-id';
  parents.mother.firstName = 'Eleanor';
  parents.mother.lastName = 'Vance';
  parents.mother.age = 52;
  parents.mother.occupation = 'Surgeon';
  parents.mother.relationship = 92;
  parents.mother.generosity = 82;

  const siblings: SiblingProfile[] = [
    {
      id: 'sib-1',
      role: 'brother',
      firstName: 'Liam',
      lastName: 'Vance',
      age: 28,
      gender: 'male',
      relationship: 80,
      occupation: 'Mechanical Engineer',
      isAlive: true,
      birthOrder: 'older',
    },
    {
      id: 'sib-2',
      role: 'sister',
      firstName: 'Maya',
      lastName: 'Vance',
      age: 22,
      gender: 'female',
      relationship: 85,
      occupation: 'University Student',
      isAlive: true,
      birthOrder: 'younger',
    },
  ];

  const partner: PersonProfile = {
    id: 'partner-claire',
    firstName: 'Claire',
    lastName: 'Dubois',
    gender: 'female',
    age: 25,
    role: 'Graphic Designer',
    relationshipType: 'spouse',
    relationship: 94,
    originStory: 'Met at an art gallery',
    stageMet: 'adulthood',
    romanceUnlocked: true,
    romanceMeter: 96,
    romanticStage: 'married',
    partnerStats: {
      craziness: 28,
      generosity: 80,
      looks: 88,
      smarts: 84,
      fertility: 82,
      occupation: 'Graphic Designer',
      annualIncome: 68000,
      hasPrenup: true,
      yearsTogether: 4,
    },
  };

  const children: ChildProfile[] = [
    {
      id: 'child-bio-1',
      firstName: 'Noah',
      lastName: 'Vance',
      age: 3,
      gender: 'male',
      relationship: 95,
      smarts: 78,
      looks: 82,
      happiness: 92,
      health: 96,
      isAdopted: false,
      occupation: 'Infant',
      isAlive: true,
    },
    {
      id: 'child-adopted-1',
      firstName: 'Sofia',
      lastName: 'Vance',
      age: 6,
      gender: 'female',
      relationship: 90,
      smarts: 85,
      looks: 80,
      happiness: 88,
      health: 94,
      isAdopted: true,
      occupation: 'Elementary School Student',
      isAlive: true,
    },
  ];

  const relationships: PersonProfile[] = [
    // Cross-reference: same partner record also in `relationships` array
    { ...partner },
    {
      id: 'friend-marcus',
      firstName: 'Marcus',
      lastName: 'Sterling',
      gender: 'male',
      age: 26,
      role: 'Software Developer',
      relationshipType: 'best_friend',
      relationship: 89,
      originStory: 'Childhood neighbor',
      stageMet: 'childhood',
      cohortType: 'best_friend',
      personalityArchetype: 'studious',
    },
  ];

  return {
    id: 'player-vance-1',
    firstName: 'Julian',
    lastName: 'Vance',
    gender: 'male',
    age: 26,
    birthYear: 2000,
    country: 'United States',
    city: 'Boston',
    occupation: 'Product Manager',
    cash: 45000,
    bankBalance: 45000,
    netWorth: 45000,
    isAlive: true,
    stats: {
      health: 92,
      happiness: 88,
      smarts: 86,
      looks: 80,
      karma: 75,
    },
    parents,
    siblings,
    children,
    partner,
    relationships,
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
  };
}

console.log('\n--- STARTING NPC AUTONOMY ENGINE MILESTONE 1 TESTS ---');

// ---------------------------------------------------------------------------
// 1. Migration Idempotence
// ---------------------------------------------------------------------------
{
  const legacy = createLegacyCharacterFixture();
  const pass1 = migrateToCanonicalWorldState(legacy);

  assert(pass1.worldState !== undefined, 'worldState must be created on migration');
  assertEqual(
    pass1.worldState.schemaVersion,
    CURRENT_SCHEMA_VERSION,
    'worldState schemaVersion matches CURRENT_SCHEMA_VERSION (2)'
  );

  const snapshotPass1 = JSON.stringify(pass1.worldState);

  let current = pass1;
  for (let i = 0; i < 10; i++) {
    current = migrateToCanonicalWorldState(current);
    assertEqual(
      JSON.stringify(current.worldState),
      snapshotPass1,
      `Migration pass ${i + 2} is byte-identical to pass 1`
    );
  }

  // Father (1) + Mother (1) + Siblings (2) + Partner Claire (1, unified with relationships) + Friend Marcus (1) + Children (2) = 8 NPCs
  const npcIds = Object.keys(current.worldState!.npcRegistry);
  assertEqual(npcIds.length, 8, 'Expected exactly 8 canonical NPCs without duplicates');
  console.log('✅ 1. Migration Idempotence: 10 consecutive migration passes yielded byte-identical state with 8 canonical NPCs!');
}

// ---------------------------------------------------------------------------
// 1b. Schema v2 re-entry keeps the canonical registry
// ---------------------------------------------------------------------------
{
  const pass1 = migrateToCanonicalWorldState(createLegacyCharacterFixture());
  const edited = structuredClone(pass1);
  const father = edited.worldState!.npcRegistry['father-explicit-id'];
  const expectedAge = father.age + 5;
  father.isAlive = false;
  father.deathYear = 1990;
  father.causeOfDeath = 'Recorded in the registry';
  father.age = expectedAge;
  father.career = { ...father.career, salary: 250000 };
  father.finances = { ...father.finances, cash: 999999, annualIncome: 10 };
  edited.parents.father.isAlive = true;
  edited.parents.father.age = 54;

  const pass2 = migrateToCanonicalWorldState(edited);
  const kept = pass2.worldState!.npcRegistry['father-explicit-id'];
  assertEqual(kept.isAlive, false, 'Re-migration keeps canonical death');
  assertEqual(kept.deathYear, 1990, 'Re-migration keeps canonical death year');
  assertEqual(kept.age, expectedAge, 'Re-migration keeps canonical age');
  assertEqual(kept.career.salary, 250000, 'Re-migration keeps canonical salary');
  assertEqual(kept.finances.cash, 999999, 'Re-migration keeps canonical cash');

  const broken = structuredClone(pass2);
  const fatherEdgeId = Object.keys(broken.worldState!.relationshipsById).find((edgeId) => {
    const edge = broken.worldState!.relationshipsById[edgeId];
    return (
      (edge.participantAId === 'father-explicit-id' || edge.participantBId === 'father-explicit-id') &&
      (edge.participantAId === broken.id || edge.participantBId === broken.id)
    );
  });
  assert(fatherEdgeId !== undefined, 'Father edge exists before the index is broken');
  delete broken.worldState!.relationshipIndex[broken.id];
  const repaired = migrateToCanonicalWorldState(broken);
  assert(
    (repaired.worldState!.relationshipIndex[repaired.id] ?? []).includes(fatherEdgeId),
    'Stale relationship index is rebuilt from relationshipsById'
  );
  assertEqual(
    repaired.worldState!.npcRegistry['father-explicit-id'].career.salary,
    250000,
    'Index repair does not rewrite canonical salary'
  );
  console.log('✅ 1b. Schema v2 re-entry preserved canonical NPC fields and repaired a stale index!');
}

// ---------------------------------------------------------------------------
// 2. Safeguard #1: Persistent Fallback ID Mappings Across Array Reorderings
// ---------------------------------------------------------------------------
{
  const legacy = createLegacyCharacterFixture();
  legacy.siblings = [
    {
      ...legacy.siblings![0],
      id: '',
    },
    {
      ...legacy.siblings![1],
      id: '',
    },
  ];
  legacy.partner = undefined;
  legacy.relationships = [
    {
      id: '',
      firstName: 'Devon',
      lastName: 'Brooks',
      gender: 'male',
      age: 26,
      role: 'Coworker',
      relationshipType: 'coworker',
      relationship: 70,
      originStory: 'Met at office',
      stageMet: 'adulthood',
    },
    {
      id: '',
      firstName: 'Elena',
      lastName: 'Rostova',
      gender: 'female',
      age: 26,
      role: 'Classmate',
      relationshipType: 'classmate',
      relationship: 75,
      originStory: 'Met in university lecture',
      stageMet: 'university',
    },
  ];

  const migrated1 = migrateToCanonicalWorldState(legacy);
  const liamId1 = migrated1.siblings![0].id;
  const mayaId1 = migrated1.siblings![1].id;
  const devonId1 = migrated1.relationships![0].id;
  const elenaId1 = migrated1.relationships![1].id;

  assert(liamId1.length > 0 && mayaId1.length > 0, 'Generated fallback sibling IDs');
  assert(liamId1 !== mayaId1, 'Fallback sibling IDs must be distinct');
  assert(
    Object.keys(migrated1.worldState!.legacyIdMappings).length >= 4,
    'legacyIdMappings must persist generated fallback IDs'
  );

  // Reverse the order of siblings and relationships AND clear their stamped IDs to test pure mapping persistence
  const reordered: CharacterProfile = {
    ...migrated1,
    siblings: [
      { ...migrated1.siblings![1], id: '' }, // Maya first
      { ...migrated1.siblings![0], id: '' }, // Liam second
    ],
    relationships: [
      { ...migrated1.relationships![1], id: '' }, // Elena first
      { ...migrated1.relationships![0], id: '' }, // Devon second
    ],
  };

  const migrated2 = migrateToCanonicalWorldState(reordered);
  const mayaId2 = migrated2.siblings![0].id;
  const liamId2 = migrated2.siblings![1].id;
  const elenaId2 = migrated2.relationships![0].id;
  const devonId2 = migrated2.relationships![1].id;

  assertEqual(mayaId2, mayaId1, 'Maya retained her exact canonical ID after array reordering');
  assertEqual(liamId2, liamId1, 'Liam retained his exact canonical ID after array reordering');
  assertEqual(elenaId2, elenaId1, 'Elena retained her exact canonical ID after array reordering');
  assertEqual(devonId2, devonId1, 'Devon retained his exact canonical ID after array reordering');
  console.log('✅ 2. Safeguard #1 (ID Persistence): Fallback IDs persisted in legacyIdMappings across array reorderings!');
}

// ---------------------------------------------------------------------------
// 3. Collision Protection: No Blind Name+BirthYear Merging
// ---------------------------------------------------------------------------
{
  const legacy = createLegacyCharacterFixture();
  legacy.partner = undefined;
  legacy.relationships = [
    {
      id: 'john-smith-1',
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      age: 26, // birthYear 2000
      role: 'High School Friend',
      relationshipType: 'friend',
      relationship: 65,
      originStory: 'Met in homeroom',
      stageMet: 'high_school',
    },
    {
      id: 'john-smith-2',
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      age: 26, // birthYear 2000
      role: 'Office Coworker',
      relationshipType: 'coworker',
      relationship: 55,
      originStory: 'Met at work orientation',
      stageMet: 'adulthood',
    },
  ];

  const migrated = migrateToCanonicalWorldState(legacy);
  const registry = migrated.worldState!.npcRegistry;

  assert(registry['john-smith-1'] !== undefined, 'First John Smith exists in registry');
  assert(registry['john-smith-2'] !== undefined, 'Second John Smith exists separately in registry');
  assert(
    registry['john-smith-1'].id !== registry['john-smith-2'].id,
    'Same-name same-birthYear NPCs are not merged without shared ID evidence'
  );
  assertEqual(
    registry['john-smith-1'].identityResolutionStatus,
    'ambiguous_flagged',
    'First colliding NPC flagged as ambiguous_flagged'
  );
  assertEqual(
    registry['john-smith-2'].identityResolutionStatus,
    'ambiguous_flagged',
    'Second colliding NPC flagged as ambiguous_flagged'
  );
  console.log('✅ 3. Collision Protection: Distinct NPCs sharing identical name and birthYear were preserved separately and flagged ambiguous_flagged!');
}

// ---------------------------------------------------------------------------
// 4. Evidence-Based Cross-Reference Unification
// ---------------------------------------------------------------------------
{
  const legacy = createLegacyCharacterFixture();
  // Place Father in `relationships` as well with the exact same ID ('father-explicit-id')
  legacy.relationships = [
    ...(legacy.relationships ?? []),
    {
      id: 'father-explicit-id',
      firstName: 'Arthur',
      lastName: 'Vance',
      gender: 'male',
      age: 54,
      role: 'Mentor & Father',
      relationshipType: 'mentor',
      relationship: 90,
      originStory: 'Family',
      stageMet: 'childhood',
    },
  ];

  const migrated = migrateToCanonicalWorldState(legacy);
  const registry = migrated.worldState!.npcRegistry;

  assertEqual(
    Object.keys(registry).length,
    8,
    'Shared ID across parents.father and relationships unified into a single canonical NpcProfile'
  );
  assertEqual(
    registry['father-explicit-id'].identityResolutionStatus,
    'canonical',
    'Unified single NPC remained canonical'
  );
  const parentEdge = getEdgeBetween(migrated, migrated.id, 'father-explicit-id');
  assertEqual(
    parentEdge?.category,
    'parent_child',
    'A mentor copy in relationships does not replace the parent-child edge'
  );
  console.log('✅ 4. Evidence-Based Unification: Same parent/partner appearing across multiple legacy collections unified cleanly!');
}

// ---------------------------------------------------------------------------
// 4b. Divorce and spouse edges survive a later, weaker legacy copy
// ---------------------------------------------------------------------------
{
  const divorced = createLegacyCharacterFixture();
  const married = divorced.partner!;
  divorced.partner = null;
  divorced.exPartners = [
    {
      ...married,
      role: 'Ex-Spouse',
      relationshipType: 'ex',
      romanticStage: 'ex',
      relationship: 20,
      romanceMeter: 0,
    },
  ];
  const divorcedWorld = migrateToCanonicalWorldState(divorced);
  const exEdge = getEdgeBetween(divorcedWorld, divorcedWorld.id, 'partner-claire');
  assert(exEdge !== undefined, 'Divorced partner still has one canonical edge');
  assertEqual(exEdge.category, 'ex', 'Stale married relationships copy does not resurrect the marriage');
  assertEqual(exEdge.status, 'former', 'Divorced edge stays former');

  const downgraded = createLegacyCharacterFixture();
  downgraded.relationships = (downgraded.relationships ?? []).map((person) =>
    person.id === 'partner-claire'
      ? { ...person, relationshipType: 'friend', romanticStage: 'none', role: 'Friend' }
      : person
  );
  const spouseWorld = migrateToCanonicalWorldState(downgraded);
  const spouseEdge = getEdgeBetween(spouseWorld, spouseWorld.id, 'partner-claire');
  assertEqual(spouseEdge?.category, 'spouse', 'A friend copy does not downgrade an active spouse');
  console.log('✅ 4b. Edge precedence: divorce stays former, and a spouse survives a weaker friend copy!');
}

// ---------------------------------------------------------------------------
// 5. Safeguard #3: Relationship Selectors (roleForA / roleForB & Biological, Adoptive, Step-Parents)
// ---------------------------------------------------------------------------
{
  let character = migrateToCanonicalWorldState(createLegacyCharacterFixture());

  // Add a step-father whose ID is lexicographically SMALLER than player ID ('0000-step-dad' < 'player-vance-1')
  // AND an adoptive mother whose ID is lexicographically LARGER than player ID ('zzzz-adoptive-mom' > 'player-vance-1')
  character.worldState!.npcRegistry['0000-step-dad'] = {
    ...character.worldState!.npcRegistry['father-explicit-id'],
    id: '0000-step-dad',
    firstName: 'Walter',
    lastName: 'Stephens',
    biologicalGender: 'male',
    gender: 'male',
  };
  character.worldState!.npcRegistry['zzzz-adoptive-mom'] = {
    ...character.worldState!.npcRegistry['mother-explicit-id'],
    id: 'zzzz-adoptive-mom',
    firstName: 'Diana',
    lastName: 'Sterling',
    biologicalGender: 'female',
    gender: 'female',
  };

  character = linkParentAndChild(character, {
    parentId: '0000-step-dad',
    childId: character.id,
    parentRole: 'father',
    lineageRelation: 'step',
    trust: 72,
    affection: 70,
    respect: 74,
  });

  character = linkParentAndChild(character, {
    parentId: 'zzzz-adoptive-mom',
    childId: character.id,
    parentRole: 'mother',
    lineageRelation: 'adoptive',
    trust: 88,
    affection: 90,
    respect: 89,
  });

  // Verify edge orientation when parentId < childId ('0000-step-dad' < 'player-vance-1')
  const stepEdge = getEdgeBetween(character, '0000-step-dad', character.id);
  assert(stepEdge !== undefined, 'Step-parent edge exists');
  assertEqual(stepEdge.participantAId, '0000-step-dad', 'participantAId is 0000-step-dad');
  assertEqual(stepEdge.participantBId, character.id, 'participantBId is player');
  assertEqual(stepEdge.roleForA, 'parent', 'roleForA is parent');
  assertEqual(stepEdge.roleForB, 'child', 'roleForB is child');

  const stepOrientedFromChild = orientRelationshipEdge(stepEdge, character.id);
  assert(stepOrientedFromChild !== null, 'Step edge oriented from child');
  assertEqual(stepOrientedFromChild.viewerRole, 'child', 'viewerRole is child');
  assertEqual(stepOrientedFromChild.otherRole, 'parent', 'otherRole is parent');
  assertEqual(stepOrientedFromChild.otherParentRole, 'father', 'otherParentRole is father');
  assertEqual(stepOrientedFromChild.lineageRelation, 'step', 'lineageRelation is step');

  // Verify edge orientation when childId < parentId ('player-vance-1' < 'zzzz-adoptive-mom')
  const adoptiveEdge = getEdgeBetween(character, 'zzzz-adoptive-mom', character.id);
  assert(adoptiveEdge !== undefined, 'Adoptive-parent edge exists');
  assertEqual(adoptiveEdge.participantAId, character.id, 'participantAId is player');
  assertEqual(adoptiveEdge.participantBId, 'zzzz-adoptive-mom', 'participantBId is zzzz-adoptive-mom');
  assertEqual(adoptiveEdge.roleForA, 'child', 'roleForA is child');
  assertEqual(adoptiveEdge.roleForB, 'parent', 'roleForB is parent');

  const adoptiveOrientedFromChild = orientRelationshipEdge(adoptiveEdge, character.id);
  assert(adoptiveOrientedFromChild !== null, 'Adoptive edge oriented from child');
  assertEqual(adoptiveOrientedFromChild.viewerRole, 'child', 'viewerRole is child');
  assertEqual(adoptiveOrientedFromChild.otherRole, 'parent', 'otherRole is parent');
  assertEqual(adoptiveOrientedFromChild.otherParentRole, 'mother', 'otherParentRole is mother');
  assertEqual(adoptiveOrientedFromChild.lineageRelation, 'adoptive', 'lineageRelation is adoptive');

  // Verify getParentsSelector filtering by biological, adoptive, and step
  const bioOnly = getParentsSelector(character, {
    includeBiological: true,
    includeAdoptive: false,
    includeStep: false,
  });
  assertEqual(bioOnly.length, 2, 'Should have 2 biological parents');
  assert(bioOnly.every((r) => r.lineageRelation === 'biological'), 'All returned are biological');

  const adoptiveOnly = getParentsSelector(character, {
    includeBiological: false,
    includeAdoptive: true,
    includeStep: false,
  });
  assertEqual(adoptiveOnly.length, 1, 'Should have 1 adoptive parent');
  assertEqual(adoptiveOnly[0].npc.id, 'zzzz-adoptive-mom', 'Adoptive parent ID matches');
  assertEqual(adoptiveOnly[0].parentRole, 'mother', 'Adoptive parent role matches');

  const stepOnly = getStepParentsSelector(character);
  assertEqual(stepOnly.length, 1, 'Should have 1 step-parent');
  assertEqual(stepOnly[0].npc.id, '0000-step-dad', 'Step-parent ID matches');
  assertEqual(stepOnly[0].parentRole, 'father', 'Step-parent role matches');

  // Verify player's children selector preserves biological vs adoptive
  const childrenView = getChildrenSelector(character);
  assertEqual(childrenView.length, 2, 'Player has 2 children');
  const noah = childrenView.find((c) => c.id === 'child-bio-1');
  const sofia = childrenView.find((c) => c.id === 'child-adopted-1');
  assert(noah !== undefined && !noah.isAdopted, 'Noah marked biological (isAdopted = false)');
  assert(sofia !== undefined && sofia.isAdopted, 'Sofia marked adopted (isAdopted = true)');

  const bioChildrenOnly = getChildrenForParticipantSelector(character, {
    includeBiological: true,
    includeAdoptive: false,
  });
  assertEqual(bioChildrenOnly.length, 1, '1 biological child returned');
  assertEqual(bioChildrenOnly[0].npc.id, 'child-bio-1', 'Biological child is Noah');

  // Verify compatibility views
  const parentsView = getParentsView(character);
  assertEqual(parentsView.father.id, 'father-explicit-id', 'Primary father view preserved');
  assertEqual(parentsView.mother.id, 'mother-explicit-id', 'Primary mother view preserved');
  assertEqual(getSiblingsSelector(character).length, 2, '2 siblings returned');
  assertEqual(getPartnerSelector(character)?.id, 'partner-claire', 'Partner Claire returned');

  const datingId = '0000-dating-npc';
  character.worldState!.npcRegistry[datingId] = {
    ...character.worldState!.npcRegistry['friend-marcus'],
    id: datingId,
    firstName: 'Riley',
    isAlive: true,
    tier: 'social',
  };
  const datingEdgeId = '0000-dating-edge';
  character.worldState!.relationshipsById[datingEdgeId] = {
    id: datingEdgeId,
    participantAId: datingId,
    participantBId: character.id,
    category: 'dating',
    roleForA: 'dating',
    roleForB: 'dating',
    lineageRelation: 'none',
    status: 'active',
    trust: 80,
    affection: 80,
    respect: 80,
    romance: 70,
    compatibility: 70,
    yearsTogether: 1,
    lastInteractedYear: character.birthYear + character.age,
    episodes: [],
  };
  character.worldState!.relationshipIndex[datingId] = [datingEdgeId];
  character.worldState!.relationshipIndex[character.id] = [
    datingEdgeId,
    ...(character.worldState!.relationshipIndex[character.id] ?? []),
  ];
  assertEqual(
    getPartnerSelector(character)?.id,
    'partner-claire',
    'Spouse outranks a dating edge whose id sorts first'
  );
  assert(
    getRelationshipsSelector(character).some((r) => r.id === 'friend-marcus'),
    'Friend Marcus returned in relationships selector'
  );
  console.log('✅ 5. Safeguard #3 (Relationship Selectors): roleForA/roleForB and biological/adoptive/step-parent distinctions verified across both ID orderings!');
}

// ---------------------------------------------------------------------------
// 6. Relationship Graph Integrity: Single Canonical Edge & Symmetric Index
// ---------------------------------------------------------------------------
{
  const migrated = migrateToCanonicalWorldState(createLegacyCharacterFixture());
  const world = migrated.worldState!;

  const dyadSet = new Set<string>();
  for (const [edgeId, edge] of Object.entries(world.relationshipsById)) {
    assert(
      edge.participantAId.localeCompare(edge.participantBId) < 0,
      `Edge ${edgeId} enforces canonical participantAId < participantBId ordering`
    );
    const dyadKey = `${edge.participantAId}::${edge.participantBId}`;
    assert(!dyadSet.has(dyadKey), `No duplicate edge for dyad ${dyadKey}`);
    dyadSet.add(dyadKey);

    assert(
      world.relationshipIndex[edge.participantAId]?.includes(edgeId) === true,
      `relationshipIndex[${edge.participantAId}] includes edge ${edgeId}`
    );
    assert(
      world.relationshipIndex[edge.participantBId]?.includes(edgeId) === true,
      `relationshipIndex[${edge.participantBId}] includes edge ${edgeId}`
    );
  }

  const rebuilt = rebuildRelationshipIndex(world.relationshipsById);
  assertDeepEqual(world.relationshipIndex, rebuilt, 'relationshipIndex matches rebuilt index');
  console.log('✅ 6. Relationship Graph Integrity: Single canonical RelationshipEdge per dyad and symmetric adjacency index verified!');
}

// ---------------------------------------------------------------------------
// 7. Safeguard #4: Currency Conversion & Single Financial Source of Truth
// ---------------------------------------------------------------------------
{
  assertDeepEqual(
    convertCurrency(10000, 'USD', 'USD'),
    { convertedAmount: 10000, exchangeRateApplied: 1 },
    'USD -> USD identity conversion'
  );
  assertDeepEqual(
    convertCurrency(0, 'USD', 'GBP'),
    { convertedAmount: 0, exchangeRateApplied: 0.79 },
    'Zero USD -> GBP conversion'
  );

  const gbpConv = convertCurrency(1000, 'USD', 'GBP');
  assertEqual(gbpConv.convertedAmount, 790, '1000 USD -> 790 GBP');
  assertEqual(gbpConv.exchangeRateApplied, 0.79, 'Exchange rate 0.79 recorded');

  const pkrConv = convertCurrency(100, 'USD', 'PKR');
  assertEqual(pkrConv.convertedAmount, 27800, '100 USD -> 27800 PKR');
  assertEqual(pkrConv.exchangeRateApplied, 278, 'Exchange rate 278 recorded');

  const finances = createInitialNpcFinances({
    country: 'United States',
    age: 30,
    occupation: 'Software Engineer',
    studentDebt: 25000,
  });
  assertEqual(finances.studentDebt, 25000, 'Student debt stored in canonical NpcFinanceState');
  assertEqual(finances.netWorth, calculateCanonicalNetWorth(finances), 'Net worth equals Assets - Liabilities');

  const beforeNetWorth = finances.netWorth;
  const afterDeposit = transferBetweenCashAndSavings(finances, 2000);
  assertEqual(
    afterDeposit.netWorth,
    beforeNetWorth,
    'Transfer from cash to savings is strictly net-worth neutral'
  );
  const afterWithdrawal = transferBetweenCashAndSavings(afterDeposit, -1000);
  assertEqual(
    afterWithdrawal.netWorth,
    beforeNetWorth,
    'Transfer from savings to cash is strictly net-worth neutral'
  );

  const migrated = migrateToCanonicalWorldState(createLegacyCharacterFixture());
  for (const npc of Object.values(migrated.worldState!.npcRegistry)) {
    assertEqual(
      'studentDebt' in npc.education,
      false,
      'NpcEducationState does not contain duplicate studentDebt property'
    );
  }
  console.log('✅ 7. Safeguard #4 (Currency & Finances): Cross-currency conversion, net-worth-neutral transfers, and single financial source of truth verified!');
}

// ---------------------------------------------------------------------------
// 8. Safeguard #2: Extracted Health & Piecewise 75+ Mortality Formula
// ---------------------------------------------------------------------------
{
  assertDeepEqual(getNaturalHealthDeltaBounds(20), [-1, 1], 'Age 20 health delta bounds');
  assertDeepEqual(getNaturalHealthDeltaBounds(50), [-3, 0], 'Age 50 health delta bounds');
  assertDeepEqual(getNaturalHealthDeltaBounds(70), [-6, -1], 'Age 70 health delta bounds');
  assertDeepEqual(getNaturalHealthDeltaBounds(85), [-12, -3], 'Age 85 health delta bounds');

  assertEqual(calculateNaturalMortalityProbability(0, 90), 0, 'Age 0 mortality is 0');
  assertEqual(calculateNaturalMortalityProbability(40, 90), 0, 'Age 40 mortality is 0');
  assertEqual(calculateNaturalMortalityProbability(73, 10), 0, 'Age 73 mortality is strictly 0');
  assertEqual(calculateNaturalMortalityProbability(74, 10), 0, 'Age 74 mortality is strictly 0');

  const prob75 = calculateNaturalMortalityProbability(75, 80);
  assert(Math.abs(prob75 - 0.105) < 1e-9, `Expected 0.105 at age 75, got ${prob75}`);

  const prob80LowHealth = calculateNaturalMortalityProbability(80, 15);
  assert(Math.abs(prob80LowHealth - 0.48) < 1e-9, `Expected 0.48 at age 80 with health 15, got ${prob80LowHealth}`);

  const prng = new SeededPRNG(12345);
  const zeroHealthCheck = evaluateMortalityHazard(30, 0, prng);
  assertEqual(zeroHealthCheck.passedAway, true, 'Zero health triggers death');
  assertEqual(zeroHealthCheck.causeOfDeath, 'Succumbed to poor health', 'Cause of death matches');
  console.log('✅ 8. Safeguard #2 (Health & Mortality): Piecewise 75+ mortality cutoff (0 at age 73/74, 10.5% base at 75) matches agingService.ts!');
}

// ---------------------------------------------------------------------------
// 9. Seeded PRNG Determinism & Order-Independent Tie-Breaking
// ---------------------------------------------------------------------------
{
  const prngA1 = createNpcPRNG(99999, 2026, 'npc-1', 'career', 1);
  const prngA2 = createNpcPRNG(99999, 2026, 'npc-1', 'career', 1);
  const prngDiffVersion = createNpcPRNG(99999, 2026, 'npc-1', 'career', 2);
  const prngDiffDomain = createNpcPRNG(99999, 2026, 'npc-1', 'romance', 1);

  const seqA1 = Array.from({ length: 10 }, () => prngA1.nextFloat());
  const seqA2 = Array.from({ length: 10 }, () => prngA2.nextFloat());
  const seqDiffVer = Array.from({ length: 10 }, () => prngDiffVersion.nextFloat());
  const seqDiffDom = Array.from({ length: 10 }, () => prngDiffDomain.nextFloat());

  assertDeepEqual(seqA1, seqA2, 'Identical seed parameters yield identical PRNG streams');
  assert(JSON.stringify(seqA1) !== JSON.stringify(seqDiffVer), 'Different simulationVersion yields distinct PRNG streams');
  assert(JSON.stringify(seqA1) !== JSON.stringify(seqDiffDom), 'Different domain yields distinct PRNG streams');

  assertEqual(prngA1.nextInt(5, 5), 5, 'nextInt(5, 5) returns 5');
  const reversedInt = prngA1.nextInt(10, 8);
  assert(reversedInt >= 8 && reversedInt <= 10, 'nextInt safely handles reversed bounds');
  assertEqual(clampProbability(-0.5), 0, 'Negative probability clamps to 0');
  assertEqual(clampProbability(1.5), 1, 'Probability > 1 clamps to 1');
  assertEqual(clampProbability(Number.NaN), 0, 'NaN probability clamps to 0');
  assertEqual(prngA1.chance(0), false, 'chance(0) is false');
  assertEqual(prngA1.chance(-5), false, 'chance(-5) is false');
  assertEqual(prngA1.chance(1), true, 'chance(1) is true');
  assertEqual(prngA1.chance(5), true, 'chance(5) is true');
  assertEqual(prngA1.pick([]), undefined, 'pick([]) returns undefined');
  assertEqual(prngA1.pickWeighted([]), undefined, 'pickWeighted([]) returns undefined');

  const itemsPerm1 = [
    { id: 'npc-charlie', score: 80 },
    { id: 'npc-alice', score: 80 },
    { id: 'npc-bob', score: 95 },
  ];
  const itemsPerm2 = [
    { id: 'npc-bob', score: 95 },
    { id: 'npc-charlie', score: 80 },
    { id: 'npc-alice', score: 80 },
  ];

  assertDeepEqual(
    sortDeterministicallyByScoreAndId(itemsPerm1).map((i) => i.id),
    ['npc-bob', 'npc-alice', 'npc-charlie'],
    'Tie-breaking sorts descending by score and ascending by ID'
  );
  assertDeepEqual(
    sortDeterministicallyByScoreAndId(itemsPerm1),
    sortDeterministicallyByScoreAndId(itemsPerm2),
    'Order-independent tie-breaking across input permutations'
  );
  console.log('✅ 9. Seeded PRNG Determinism: Dynamic simulationVersion, safe bounds, and order-independent tie-breaking verified!');
}

// ---------------------------------------------------------------------------
// 10. Population Tier Reconciliation
// ---------------------------------------------------------------------------
{
  const migrated = migrateToCanonicalWorldState(createLegacyCharacterFixture());
  let world = migrated.worldState!;

  world = {
    ...world,
    populationConfig: {
      ...world.populationConfig,
      activeNpcTarget: 9,
    },
  };

  const templateNpc = Object.values(world.npcRegistry)[0];
  world.npcRegistry['social-low'] = {
    ...templateNpc,
    id: 'social-low',
    tier: 'social',
    isAlive: true,
  };
  world.npcRegistry['social-high'] = {
    ...templateNpc,
    id: 'social-high',
    tier: 'social',
    isAlive: true,
  };
  world.npcRegistry['deceased-npc'] = {
    ...templateNpc,
    id: 'deceased-npc',
    tier: 'social',
    isAlive: false,
  };

  world.npcRegistry['ex-background'] = {
    ...templateNpc,
    id: 'ex-background',
    tier: 'background',
    isAlive: true,
    demotedByPopulationCap: false,
  };

  const reconciled = reconcilePopulationTiers(world, migrated.id);
  assertEqual(
    reconciled.npcRegistry['deceased-npc'].tier,
    'historical',
    'Deceased NPCs transition to historical tier and are never deleted'
  );
  assertEqual(reconciled.npcRegistry['father-explicit-id'].tier, 'core', 'Core father never demoted');
  assertEqual(reconciled.npcRegistry['mother-explicit-id'].tier, 'core', 'Core mother never demoted');
  assertEqual(reconciled.npcRegistry['social-high'].tier, 'social', 'Higher-id tie keeps the lexicographically first social NPC');
  assertEqual(reconciled.npcRegistry['social-low'].tier, 'background', 'Lowest-affinity social NPC is demoted');
  assertEqual(
    reconciled.npcRegistry['social-low'].demotedByPopulationCap,
    true,
    'Demotion is flagged so the NPC can be restored'
  );
  assertEqual(
    reconciled.npcRegistry['ex-background'].tier,
    'background',
    'An original background NPC is not treated as a demotion'
  );

  const opened = {
    ...reconciled,
    npcRegistry: {
      ...reconciled.npcRegistry,
      'father-explicit-id': {
        ...reconciled.npcRegistry['father-explicit-id'],
        isAlive: false,
      },
    },
  };
  const restored = reconcilePopulationTiers(opened, migrated.id);
  assertEqual(restored.npcRegistry['father-explicit-id'].tier, 'historical', 'Dead core NPC becomes historical');
  assertEqual(restored.npcRegistry['social-low'].tier, 'social', 'Flagged friend is promoted when a slot opens');
  assertEqual(
    restored.npcRegistry['social-low'].demotedByPopulationCap,
    false,
    'Promotion clears the demotion flag'
  );
  assertEqual(
    restored.npcRegistry['ex-background'].tier,
    'background',
    'Unflagged background NPCs stay background when slots open'
  );
  console.log('✅ 10. Population Tier Reconciliation: Preserves core/historical NPCs, demotes over the cap, and restores flagged friends!');
}

console.log('--- ALL NPC AUTONOMY ENGINE MILESTONE 1 TESTS PASSED PERFECTLY! ---\n');
