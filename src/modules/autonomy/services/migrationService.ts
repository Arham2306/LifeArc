import type {
  CharacterProfile,
  ChildProfile,
  ParentProfile,
  PersonProfile,
  SiblingProfile,
} from '../../../types/game';
import type {
  BiologicalGender,
  GenderIdentity,
  LineageRelationType,
  NpcEducationState,
  NpcLifeEvent,
  NpcLifestyle,
  NpcPersonality,
  NpcProfile,
  NpcTier,
  ParentRoleType,
  ParticipantRoleLabel,
  PopulationConfig,
  RelationshipCategory,
  RelationshipEdge,
  WorldSimulationState,
} from '../types';
import { createInitialNpcFinances } from './currencyService';
import { createNpcPRNG, deterministicUUID, hashSeed, SeededPRNG } from './seededPrngService';

export const CURRENT_SCHEMA_VERSION = 2 as const;
export const CURRENT_SIMULATION_VERSION = 1 as const;

export const DEFAULT_POPULATION_CONFIG: PopulationConfig = {
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
};

/**
 * Generates a deterministic baseline personality for a migrated NPC using their archetype and seed.
 */
export function generateDeterministicPersonality(
  prng: SeededPRNG,
  archetype?: NpcPersonality['archetype'],
  explicitGenerosity?: number
): NpcPersonality {
  let openness = prng.nextInt(30, 75);
  let conscientiousness = prng.nextInt(30, 75);
  let extraversion = prng.nextInt(30, 75);
  let agreeableness = prng.nextInt(35, 80);
  let neuroticism = prng.nextInt(20, 65);

  if (archetype === 'studious') {
    conscientiousness = prng.nextInt(75, 96);
    openness = prng.nextInt(65, 92);
  } else if (archetype === 'class_clown') {
    extraversion = prng.nextInt(75, 96);
    conscientiousness = prng.nextInt(20, 55);
  } else if (archetype === 'popular') {
    extraversion = prng.nextInt(78, 98);
    agreeableness = prng.nextInt(60, 88);
  } else if (archetype === 'rebel') {
    openness = prng.nextInt(65, 95);
    agreeableness = prng.nextInt(15, 48);
    conscientiousness = prng.nextInt(18, 50);
  } else if (archetype === 'quiet') {
    extraversion = prng.nextInt(12, 40);
    openness = prng.nextInt(68, 95);
  } else if (archetype === 'athletic') {
    conscientiousness = prng.nextInt(60, 88);
    extraversion = prng.nextInt(55, 85);
  }

  return {
    openness,
    conscientiousness,
    extraversion,
    agreeableness,
    neuroticism,
    ambition: prng.nextInt(30, 85),
    generosity: explicitGenerosity !== undefined ? explicitGenerosity : prng.nextInt(35, 85),
    loyalty: prng.nextInt(40, 90),
    riskTolerance: archetype === 'rebel' ? prng.nextInt(65, 95) : prng.nextInt(25, 75),
    empathy: prng.nextInt(35, 88),
    sociability: extraversion,
    patience: Math.max(10, Math.min(95, 100 - Math.round(neuroticism * 0.6))),
    materialism: prng.nextInt(20, 75),
    archetype,
  };
}

export function generateDeterministicLifestyle(
  prng: SeededPRNG,
  age: number,
  archetype?: NpcPersonality['archetype']
): NpcLifestyle {
  const diets: NpcLifestyle['diet'][] = ['standard', 'vegetarian', 'vegan', 'junk_food', 'organic'];
  const fitnessOptions: NpcLifestyle['fitnessHabit'][] = ['sedentary', 'casual', 'regular', 'athlete'];
  const interestPool = ['reading', 'gaming', 'hiking', 'music', 'cinema', 'cooking', 'science', 'travel', 'art', 'sports'];
  const hobbyPool = ['painting', 'chess', 'soccer', 'guitar', 'photography', 'gardening', 'running', 'coding'];

  const interest1 = prng.pick(interestPool) ?? 'reading';
  const interest2 = prng.pick(interestPool.filter((i) => i !== interest1)) ?? 'music';
  const hobby1 = prng.pick(hobbyPool) ?? 'chess';

  return {
    diet: prng.pick(diets) ?? 'standard',
    fitnessHabit: archetype === 'athletic' ? 'athlete' : prng.pick(fitnessOptions) ?? 'casual',
    substances: {
      alcohol: age < 18 ? 'none' : prng.chance(0.6) ? 'social' : 'none',
      smoking: age < 18 ? false : prng.chance(0.12),
    },
    interests: [interest1, interest2],
    hobbies: [hobby1],
  };
}

export function inferNpcEducationFromAgeAndOccupation(
  age: number,
  occupation: string,
  smarts: number
): NpcEducationState {
  let currentStage: NpcEducationState['currentStage'] = 'none';
  let degreeEarned: string | undefined = undefined;

  if (age <= 4) {
    currentStage = 'none';
  } else if (age <= 10) {
    currentStage = 'elementary';
  } else if (age <= 13) {
    currentStage = 'middle_school';
  } else if (age <= 17) {
    currentStage = occupation === 'High School Dropout' ? 'dropped_out' : 'high_school';
  } else if (occupation.toLowerCase().includes('university') || occupation.toLowerCase().includes('college') || occupation === 'Dorm Roommate') {
    currentStage = 'university';
    degreeEarned = 'High School Diploma';
  } else if (occupation.toLowerCase().includes('graduate student')) {
    currentStage = 'professional';
    degreeEarned = 'Bachelor’s Degree';
  } else {
    currentStage = 'graduated';
    degreeEarned = smarts >= 65 ? 'Bachelor’s Degree' : 'High School Diploma';
  }

  return {
    currentStage,
    schoolName: null,
    grades: Math.max(45, Math.min(98, smarts)),
    degreeEarned,
    history: [],
  };
}

export function createDeduplicatedLifeEvent(params: {
  npcId: string;
  year: number;
  age: number;
  type: NpcLifeEvent['type'];
  title: string;
  description: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}): NpcLifeEvent {
  const dedupeKey = `${params.npcId}:${params.type}:${params.year}:${params.referenceId ?? 'none'}`;
  return {
    id: deterministicUUID('npc-life-event', dedupeKey),
    dedupeKey,
    npcId: params.npcId,
    year: params.year,
    age: params.age,
    type: params.type,
    title: params.title,
    description: params.description,
    referenceId: params.referenceId,
    metadata: params.metadata,
  };
}

/**
 * Appends incoming `NpcLifeEvent` milestones to an existing `lifeHistory` array,
 * guaranteeing that no two entries ever share the same `dedupeKey`.
 */
export function appendDeduplicatedLifeEvents(
  existing: readonly NpcLifeEvent[],
  incoming: readonly NpcLifeEvent[]
): NpcLifeEvent[] {
  if (incoming.length === 0) return [...existing];
  const result = [...existing];
  const seenKeys = new Set(existing.map((e) => e.dedupeKey));
  for (const evt of incoming) {
    if (!seenKeys.has(evt.dedupeKey)) {
      seenKeys.add(evt.dedupeKey);
      result.push(evt);
    }
  }
  return result;
}

/**
 * Helper to create or update a single canonical RelationshipEdge in `relationshipsById`
 * and maintain the participant adjacency lists in `relationshipIndex`.
 */
export function upsertCanonicalRelationshipEdge(
  relationshipsById: Record<string, RelationshipEdge>,
  relationshipIndex: Record<string, string[]>,
  params: {
    id1: string;
    id2: string;
    category: RelationshipCategory;
    roleFor1: ParticipantRoleLabel;
    roleFor2: ParticipantRoleLabel;
    lineageRelation?: LineageRelationType;
    parentRoleFor1?: ParentRoleType;
    parentRoleFor2?: ParentRoleType;
    status?: 'active' | 'former' | 'deceased';
    trust: number;
    affection: number;
    respect: number;
    romance?: number;
    compatibility: number;
    yearsTogether?: number;
    hasPrenup?: boolean;
    engagementRingName?: string;
    engagementRingValue?: number;
    weddingVenue?: string;
    isPregnant?: boolean;
    currentYear: number;
    episodeStartYear: number;
  }
): RelationshipEdge {
  const { id1, id2 } = params;
  const is1CanonicalFirst = id1.localeCompare(id2) <= 0;
  const participantAId = is1CanonicalFirst ? id1 : id2;
  const participantBId = is1CanonicalFirst ? id2 : id1;

  const roleForA = is1CanonicalFirst ? params.roleFor1 : params.roleFor2;
  const roleForB = is1CanonicalFirst ? params.roleFor2 : params.roleFor1;
  const parentRoleForA = is1CanonicalFirst ? params.parentRoleFor1 : params.parentRoleFor2;
  const parentRoleForB = is1CanonicalFirst ? params.parentRoleFor2 : params.parentRoleFor1;
  const lineageRelation = params.lineageRelation ?? 'none';

  // Check if an edge already exists between participantAId and participantBId
  const existingEdgeIds = relationshipIndex[participantAId] || [];
  let existingEdge: RelationshipEdge | undefined;
  for (const edgeId of existingEdgeIds) {
    const candidate = relationshipsById[edgeId];
    if (
      candidate &&
      candidate.participantAId === participantAId &&
      candidate.participantBId === participantBId
    ) {
      existingEdge = candidate;
      break;
    }
  }

  const edgeId =
    existingEdge?.id ??
    deterministicUUID('canonical-rel-edge', participantAId, participantBId);

  const episodeId = deterministicUUID(
    'rel-episode',
    edgeId,
    params.category,
    params.episodeStartYear
  );

  const episodes = existingEdge ? [...existingEdge.episodes] : [];
  const hasEpisode = episodes.some((ep) => ep.episodeId === episodeId);
  if (!hasEpisode) {
    episodes.push({
      episodeId,
      category: params.category,
      startYear: params.episodeStartYear,
    });
  }

  const edge: RelationshipEdge = {
    id: edgeId,
    participantAId,
    participantBId,
    category: params.category,
    roleForA,
    roleForB,
    lineageRelation,
    parentRoleForA,
    parentRoleForB,
    status: params.status ?? 'active',
    trust: Math.max(0, Math.min(100, Math.round(params.trust))),
    affection: Math.max(0, Math.min(100, Math.round(params.affection))),
    respect: Math.max(0, Math.min(100, Math.round(params.respect))),
    romance: Math.max(0, Math.min(100, Math.round(params.romance ?? existingEdge?.romance ?? 0))),
    compatibility: Math.max(0, Math.min(100, Math.round(params.compatibility))),
    yearsTogether: params.yearsTogether ?? existingEdge?.yearsTogether ?? 0,
    hasPrenup: params.hasPrenup ?? existingEdge?.hasPrenup,
    engagementRingName: params.engagementRingName ?? existingEdge?.engagementRingName,
    engagementRingValue: params.engagementRingValue ?? existingEdge?.engagementRingValue,
    weddingVenue: params.weddingVenue ?? existingEdge?.weddingVenue,
    isPregnant: params.isPregnant ?? existingEdge?.isPregnant,
    lastInteractedYear: params.currentYear,
    episodes,
  };

  relationshipsById[edgeId] = edge;

  if (!relationshipIndex[participantAId]) {
    relationshipIndex[participantAId] = [];
  }
  if (!relationshipIndex[participantAId].includes(edgeId)) {
    relationshipIndex[participantAId].push(edgeId);
  }

  if (!relationshipIndex[participantBId]) {
    relationshipIndex[participantBId] = [];
  }
  if (!relationshipIndex[participantBId].includes(edgeId)) {
    relationshipIndex[participantBId].push(edgeId);
  }

  return edge;
}

/**
 * Rebuilds the `relationshipIndex` from `relationshipsById` in deterministic edge ID order.
 */
export function rebuildRelationshipIndex(
  relationshipsById: Record<string, RelationshipEdge>
): Record<string, string[]> {
  const index: Record<string, string[]> = {};
  const sortedEdgeIds = Object.keys(relationshipsById).sort((a, b) => a.localeCompare(b));

  for (const edgeId of sortedEdgeIds) {
    const edge = relationshipsById[edgeId];
    if (!edge) continue;

    if (!index[edge.participantAId]) index[edge.participantAId] = [];
    if (!index[edge.participantAId].includes(edgeId)) {
      index[edge.participantAId].push(edgeId);
    }

    if (!index[edge.participantBId]) index[edge.participantBId] = [];
    if (!index[edge.participantBId].includes(edgeId)) {
      index[edge.participantBId].push(edgeId);
    }
  }

  return index;
}

interface LegacyIdResolutionTracker {
  legacyIdMappings: Record<string, string>;
  occurrenceCounters: Map<string, number>;
  claimedIdsInPass: Set<string>;
}

/**
 * Safeguard #1: Resolves a stable, collision-safe NPC ID for a legacy record.
 * - If the record already has an explicit non-empty `id`, preserves it directly.
 * - Otherwise checks `legacyIdMappings` using both a discriminating attribute fingerprint
 *   (insensitive to array reordering) and an occurrence-indexed signature.
 * - Persists any newly generated fallback ID into `legacyIdMappings` so future loads or array
 *   reorderings always resolve to the exact same canonical UUID.
 */
function resolveStableLegacyNpcId(
  tracker: LegacyIdResolutionTracker,
  params: {
    characterId: string;
    explicitId?: string;
    collectionGroup: 'parent' | 'sibling' | 'child' | 'person';
    firstName: string;
    lastName: string;
    birthYear: number;
    discriminator: string;
  }
): string {
  const trimmedExplicit = params.explicitId?.trim();
  if (trimmedExplicit) {
    tracker.claimedIdsInPass.add(trimmedExplicit);
    return trimmedExplicit;
  }

  const normalizedFirst = params.firstName.trim().toLowerCase();
  const normalizedLast = params.lastName.trim().toLowerCase();
  const normalizedDisc = params.discriminator.trim().toLowerCase();

  const baseKey = `${params.collectionGroup}:${normalizedFirst}:${normalizedLast}:${params.birthYear}`;
  const currentOrdinal = tracker.occurrenceCounters.get(baseKey) ?? 0;
  tracker.occurrenceCounters.set(baseKey, currentOrdinal + 1);

  const discriminatorKey = `${baseKey}::disc:${normalizedDisc}`;
  const ordinalKey = `${baseKey}#${currentOrdinal}`;

  // 1. Check discriminator key first (preserves exact identity across array reorderings)
  const existingByDisc = tracker.legacyIdMappings[discriminatorKey];
  if (existingByDisc && !tracker.claimedIdsInPass.has(existingByDisc)) {
    tracker.claimedIdsInPass.add(existingByDisc);
    tracker.legacyIdMappings[ordinalKey] = existingByDisc;
    return existingByDisc;
  }

  // 2. Check ordinal key next
  const existingByOrdinal = tracker.legacyIdMappings[ordinalKey];
  if (existingByOrdinal && !tracker.claimedIdsInPass.has(existingByOrdinal)) {
    tracker.claimedIdsInPass.add(existingByOrdinal);
    return existingByOrdinal;
  }

  // 3. Generate a deterministic provenance-scoped UUID
  const generatedId = deterministicUUID(
    'legacy-npc',
    params.characterId,
    params.collectionGroup,
    currentOrdinal,
    normalizedFirst,
    normalizedLast,
    params.birthYear,
    normalizedDisc
  );

  tracker.claimedIdsInPass.add(generatedId);
  tracker.legacyIdMappings[ordinalKey] = generatedId;
  if (!tracker.legacyIdMappings[discriminatorKey]) {
    tracker.legacyIdMappings[discriminatorKey] = generatedId;
  }

  return generatedId;
}

/**
 * Romantic and breakup categories outrank platonic ones.
 * Parent/child and sibling edges are structural and are never replaced by a person-slot write.
 */
function relationshipCategoryRank(category: RelationshipCategory): number {
  switch (category) {
    case 'ex':
    case 'former_spouse':
      return 60;
    case 'deceased_spouse':
      return 50;
    case 'spouse':
      return 40;
    case 'fiance':
      return 30;
    case 'dating':
      return 20;
    default:
      return 10;
  }
}

function findEdgeBetweenIds(
  relationshipsById: Record<string, RelationshipEdge>,
  relationshipIndex: Record<string, string[]>,
  id1: string,
  id2: string
): RelationshipEdge | undefined {
  const participantAId = id1.localeCompare(id2) <= 0 ? id1 : id2;
  const participantBId = id1.localeCompare(id2) <= 0 ? id2 : id1;
  const edgeIds = relationshipIndex[participantAId] ?? [];
  for (const edgeId of edgeIds) {
    const edge = relationshipsById[edgeId];
    if (
      edge &&
      edge.participantAId === participantAId &&
      edge.participantBId === participantBId
    ) {
      return edge;
    }
  }
  return undefined;
}

/**
 * A later legacy copy must not weaken an edge that migration already wrote.
 * Ex wins over a stale spouse record. A spouse wins over a friend copy.
 * Parent/child and sibling edges are left untouched.
 */
function shouldKeepExistingPersonEdge(
  existing: RelationshipEdge | undefined,
  incoming: RelationshipCategory
): boolean {
  if (!existing) return false;
  if (existing.category === 'parent_child' || existing.category === 'sibling') {
    return true;
  }
  return relationshipCategoryRank(existing.category) > relationshipCategoryRank(incoming);
}

/**
 * Writes stable IDs back onto legacy arrays without rebuilding canonical NPC records.
 * Used when a schema v2 save is loaded again, including after array reordering.
 */
function restampLegacyIds(character: CharacterProfile): CharacterProfile {
  const currentYear = character.birthYear + character.age;
  const tracker: LegacyIdResolutionTracker = {
    legacyIdMappings: { ...(character.worldState?.legacyIdMappings ?? {}) },
    occurrenceCounters: new Map<string, number>(),
    claimedIdsInPass: new Set<string>(),
  };

  const stampParent = (parent: ParentProfile, role: 'father' | 'mother'): ParentProfile => ({
    ...parent,
    id: resolveStableLegacyNpcId(tracker, {
      characterId: character.id,
      explicitId: parent.id,
      collectionGroup: 'parent',
      firstName: parent.firstName,
      lastName: parent.lastName,
      birthYear: currentYear - parent.age,
      discriminator: `${role}:${parent.occupation}`,
    }),
  });

  const stampSibling = (sib: SiblingProfile): SiblingProfile => ({
    ...sib,
    id: resolveStableLegacyNpcId(tracker, {
      characterId: character.id,
      explicitId: sib.id,
      collectionGroup: 'sibling',
      firstName: sib.firstName,
      lastName: sib.lastName,
      birthYear: currentYear - sib.age,
      discriminator: `${sib.role}:${sib.birthOrder}:${sib.occupation}`,
    }),
  });

  const stampPerson = (person: PersonProfile): PersonProfile => ({
    ...person,
    id: resolveStableLegacyNpcId(tracker, {
      characterId: character.id,
      explicitId: person.id,
      collectionGroup: 'person',
      firstName: person.firstName,
      lastName: person.lastName,
      birthYear: currentYear - person.age,
      discriminator: `${person.role}:${person.originStory}:${person.stageMet}`,
    }),
  });

  const stampChild = (child: ChildProfile): ChildProfile => ({
    ...child,
    id: resolveStableLegacyNpcId(tracker, {
      characterId: character.id,
      explicitId: child.id,
      collectionGroup: 'child',
      firstName: child.firstName,
      lastName: child.lastName,
      birthYear: currentYear - child.age,
      discriminator: `${child.gender}:${child.isAdopted ? 'adopted' : 'bio'}`,
    }),
  });

  return {
    ...character,
    parents: {
      ...character.parents,
      father: stampParent(character.parents.father, 'father'),
      mother: stampParent(character.parents.mother, 'mother'),
    },
    siblings: character.siblings?.map(stampSibling),
    partner: character.partner ? stampPerson(character.partner) : character.partner,
    exPartners: character.exPartners?.map(stampPerson),
    relationships: character.relationships?.map(stampPerson),
    children: character.children?.map(stampChild),
  };
}

function legacyIdsAlreadyStamped(before: CharacterProfile, after: CharacterProfile): boolean {
  const idsOf = (people: Array<{ id: string }> | undefined) => (people ?? []).map((person) => person.id);
  return (
    before.parents.father.id === after.parents.father.id &&
    before.parents.mother.id === after.parents.mother.id &&
    before.partner?.id === after.partner?.id &&
    idsOf(before.siblings).join('|') === idsOf(after.siblings).join('|') &&
    idsOf(before.children).join('|') === idsOf(after.children).join('|') &&
    idsOf(before.exPartners).join('|') === idsOf(after.exPartners).join('|') &&
    idsOf(before.relationships).join('|') === idsOf(after.relationships).join('|')
  );
}

function relationshipIndexesMatch(
  current: Record<string, string[]> | undefined,
  rebuilt: Record<string, string[]>
): boolean {
  if (!current) return false;
  const currentKeys = Object.keys(current);
  const rebuiltKeys = Object.keys(rebuilt);
  if (currentKeys.length !== rebuiltKeys.length) return false;
  for (const key of currentKeys) {
    if (!Object.prototype.hasOwnProperty.call(rebuilt, key)) return false;
    const left = current[key];
    const right = rebuilt[key];
    if (!right || left.length !== right.length) return false;
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) return false;
    }
  }
  return rebuiltKeys.every((key) => Object.prototype.hasOwnProperty.call(current, key));
}

/**
 * Migrates a CharacterProfile into the canonical Schema Version 2 WorldSimulationState.
 * - Strictly idempotent: calling repeatedly yields byte-identical canonical state.
 * - Schema version 2 saves are not rebuilt from legacy arrays.
 * - Collision-safe: never blindly merges NPCs sharing only name and birth year.
 * - Persists fallback ID mappings in `worldState.legacyIdMappings` and stamps resolved IDs
 *   onto legacy records so subsequent loads and array reorderings preserve identity.
 */
export function migrateToCanonicalWorldState(character: CharacterProfile): CharacterProfile {
  const existingWorld = character.worldState;
  if (existingWorld?.schemaVersion === CURRENT_SCHEMA_VERSION) {
    const rebuiltIndex = rebuildRelationshipIndex(existingWorld.relationshipsById);
    const indexMatches = relationshipIndexesMatch(existingWorld.relationshipIndex, rebuiltIndex);
    const stamped = restampLegacyIds(character);
    const idsMatch = legacyIdsAlreadyStamped(character, stamped);
    if (indexMatches && idsMatch) {
      return character;
    }
    return {
      ...stamped,
      worldState: indexMatches
        ? existingWorld
        : {
            ...existingWorld,
            relationshipIndex: rebuiltIndex,
          },
    };
  }

  const currentYear = character.birthYear + character.age;
  const worldSeed =
    existingWorld?.worldSeed ??
    hashSeed(character.id, character.firstName, character.lastName, character.birthYear);
  const simulationVersion = existingWorld?.simulationVersion ?? CURRENT_SIMULATION_VERSION;

  const tracker: LegacyIdResolutionTracker = {
    legacyIdMappings: { ...(existingWorld?.legacyIdMappings ?? {}) },
    occurrenceCounters: new Map<string, number>(),
    claimedIdsInPass: new Set<string>(),
  };

  // Start from existing canonical records if already on schemaVersion 2
  const npcRegistry: Record<string, NpcProfile> = {};
  if (existingWorld?.schemaVersion === CURRENT_SCHEMA_VERSION && existingWorld.npcRegistry) {
    for (const [id, npc] of Object.entries(existingWorld.npcRegistry)) {
      npcRegistry[id] = {
        ...npc,
        adoptiveParentIds: [...(npc.adoptiveParentIds ?? [])],
        stepParentIds: [...(npc.stepParentIds ?? [])],
        goals: [...(npc.goals ?? [])],
        healthConditions: [...(npc.healthConditions ?? [])],
        lifeHistory: [...(npc.lifeHistory ?? [])],
      };
    }
  }

  const relationshipsById: Record<string, RelationshipEdge> = {};
  if (existingWorld?.schemaVersion === CURRENT_SCHEMA_VERSION && existingWorld.relationshipsById) {
    for (const [edgeId, edge] of Object.entries(existingWorld.relationshipsById)) {
      relationshipsById[edgeId] = {
        ...edge,
        episodes: edge.episodes.map((ep) => ({ ...ep })),
      };
    }
  }
  const relationshipIndex = rebuildRelationshipIndex(relationshipsById);

  const registerOrEnrichNpc = (npc: NpcProfile): NpcProfile => {
    const existing = npcRegistry[npc.id];
    if (!existing) {
      npcRegistry[npc.id] = npc;
      return npc;
    }
    // Evidence-based enrichment of the SAME canonical ID
    const merged: NpcProfile = {
      ...existing,
      firstName: existing.firstName || npc.firstName,
      lastName: existing.lastName || npc.lastName,
      age: npc.age,
      isAlive: npc.isAlive,
      deathYear: !npc.isAlive ? existing.deathYear ?? currentYear : existing.deathYear,
      career: {
        ...existing.career,
        occupation: npc.career.occupation || existing.career.occupation,
        salary: npc.career.salary || existing.career.salary,
      },
      finances:
        npc.finances.annualIncome > existing.finances.annualIncome
          ? npc.finances
          : existing.finances,
      romanceUnlocked: npc.romanceUnlocked ?? existing.romanceUnlocked,
      romanticStage:
        npc.romanticStage && npc.romanticStage !== 'none'
          ? npc.romanticStage
          : existing.romanticStage,
      partnerStatsSnapshot: npc.partnerStatsSnapshot ?? existing.partnerStatsSnapshot,
      legacyRoleLabel: existing.legacyRoleLabel ?? npc.legacyRoleLabel,
      legacyRelationshipType: npc.legacyRelationshipType ?? existing.legacyRelationshipType,
      legacyCohortType: npc.legacyCohortType ?? existing.legacyCohortType,
      originStory: existing.originStory ?? npc.originStory,
      avatarEmoji: existing.avatarEmoji ?? npc.avatarEmoji,
      lastInteractedAge: npc.lastInteractedAge ?? existing.lastInteractedAge,
      yearsNeglected: npc.yearsNeglected ?? existing.yearsNeglected,
    };
    npcRegistry[npc.id] = merged;
    return merged;
  };

  // 1. Migrate Parents (Father & Mother)
  const migrateParent = (parent: ParentProfile, role: 'father' | 'mother'): ParentProfile => {
    const parentBirthYear = currentYear - parent.age;
    const resolvedId = resolveStableLegacyNpcId(tracker, {
      characterId: character.id,
      explicitId: parent.id,
      collectionGroup: 'parent',
      firstName: parent.firstName,
      lastName: parent.lastName,
      birthYear: parentBirthYear,
      discriminator: `${role}:${parent.occupation}`,
    });

    const prng = createNpcPRNG(worldSeed, parentBirthYear, resolvedId, 'migration', simulationVersion);
    const biologicalGender: BiologicalGender = role === 'father' ? 'male' : 'female';
    const smarts = prng.nextInt(45, 90);
    const looks = prng.nextInt(45, 90);
    const health = parent.isAlive ? prng.nextInt(60, 95) : 0;
    const personality = generateDeterministicPersonality(prng, undefined, parent.generosity);
    const finances = createInitialNpcFinances({
      country: character.country,
      age: parent.age,
      occupation: parent.occupation,
      wealthTier: character.parents.wealth,
    });
    const lineageRelation: LineageRelationType = parent.lineageRelation ?? 'biological';

    const birthMilestone = createDeduplicatedLifeEvent({
      npcId: resolvedId,
      year: parentBirthYear,
      age: 0,
      type: 'birth',
      title: 'Born',
      description: `${parent.firstName} ${parent.lastName} was born in ${character.city}, ${character.country}.`,
    });

    const npc: NpcProfile = {
      id: resolvedId,
      tier: 'core',
      firstName: parent.firstName,
      lastName: parent.lastName,
      gender: biologicalGender,
      biologicalGender,
      age: parent.age,
      birthYear: parentBirthYear,
      isAlive: parent.isAlive,
      deathYear: !parent.isAlive ? currentYear : undefined,
      causeOfDeath: !parent.isAlive ? 'Passed away peacefully of old age' : undefined,
      location: {
        country: character.country,
        city: character.city,
        residenceHistory: [
          {
            country: character.country,
            city: character.city,
            startYear: parentBirthYear,
            reason: 'birth',
          },
        ],
      },
      identityResolutionStatus: 'canonical',
      provenanceSource: `parents.${role}`,
      looks,
      smarts,
      health,
      happiness: prng.nextInt(60, 92),
      fertility: biologicalGender === 'female' && parent.age > 46 ? 0 : prng.nextInt(50, 85),
      craziness: prng.nextInt(15, 55),
      personality,
      lifestyle: generateDeterministicLifestyle(prng, parent.age),
      goals: [],
      healthConditions: [],
      education: inferNpcEducationFromAgeAndOccupation(parent.age, parent.occupation, smarts),
      career: {
        jobId: null,
        title: parent.occupation,
        companyName: `${character.city} Enterprise`,
        occupation: parent.occupation,
        salary: finances.annualIncome,
        performance: prng.nextInt(65, 92),
        yearsInRole: Math.max(1, parent.age - 22),
        isRetired: parent.occupation === 'Retired',
        pensionAnnual: parent.occupation === 'Retired' ? Math.round(finances.annualIncome * 0.4) : 0,
        history: [],
      },
      finances,
      lifeHistory: [birthMilestone],
      adoptiveParentIds: [],
      stepParentIds: [],
      isAdopted: false,
      legacyRoleLabel: role === 'father' ? 'Father' : 'Mother',
    };

    registerOrEnrichNpc(npc);

    upsertCanonicalRelationshipEdge(relationshipsById, relationshipIndex, {
      id1: resolvedId,
      id2: character.id,
      category: 'parent_child',
      roleFor1: 'parent',
      roleFor2: 'child',
      lineageRelation,
      parentRoleFor1: role,
      status: parent.isAlive ? 'active' : 'deceased',
      trust: parent.relationship,
      affection: parent.relationship,
      respect: parent.relationship,
      compatibility: prng.nextInt(60, 92),
      currentYear,
      episodeStartYear: character.birthYear,
    });

    return {
      ...parent,
      id: resolvedId,
      lineageRelation,
    };
  };

  const migratedFather = migrateParent(character.parents.father, 'father');
  const migratedMother = migrateParent(character.parents.mother, 'mother');

  // Create canonical marriage edge between father and mother
  const marriageStartYear = Math.min(character.birthYear, currentYear - 1);
  upsertCanonicalRelationshipEdge(relationshipsById, relationshipIndex, {
    id1: migratedFather.id,
    id2: migratedMother.id,
    category:
      migratedFather.isAlive && migratedMother.isAlive ? 'spouse' : 'deceased_spouse',
    roleFor1:
      migratedFather.isAlive && migratedMother.isAlive ? 'spouse' : 'deceased_spouse',
    roleFor2:
      migratedFather.isAlive && migratedMother.isAlive ? 'spouse' : 'deceased_spouse',
    lineageRelation: 'none',
    status: migratedFather.isAlive && migratedMother.isAlive ? 'active' : 'deceased',
    trust: 82,
    affection: 84,
    respect: 82,
    romance: 78,
    compatibility: 80,
    yearsTogether: Math.max(1, currentYear - marriageStartYear),
    currentYear,
    episodeStartYear: marriageStartYear,
  });

  // 2. Migrate Siblings
  const migratedSiblings: SiblingProfile[] = (character.siblings ?? []).map((sib) => {
    const sibBirthYear = currentYear - sib.age;
    const resolvedId = resolveStableLegacyNpcId(tracker, {
      characterId: character.id,
      explicitId: sib.id,
      collectionGroup: 'sibling',
      firstName: sib.firstName,
      lastName: sib.lastName,
      birthYear: sibBirthYear,
      discriminator: `${sib.role}:${sib.birthOrder}:${sib.occupation}`,
    });

    const prng = createNpcPRNG(worldSeed, sibBirthYear, resolvedId, 'migration', simulationVersion);
    const smarts = prng.nextInt(45, 92);
    const looks = prng.nextInt(45, 92);
    const personality = generateDeterministicPersonality(prng);
    const finances = createInitialNpcFinances({
      country: character.country,
      age: sib.age,
      occupation: sib.occupation,
      wealthTier: character.parents.wealth,
    });

    const birthMilestone = createDeduplicatedLifeEvent({
      npcId: resolvedId,
      year: sibBirthYear,
      age: 0,
      type: 'birth',
      title: 'Born',
      description: `${sib.firstName} ${sib.lastName} was born in ${character.city}, ${character.country}.`,
    });

    const npc: NpcProfile = {
      id: resolvedId,
      tier: 'core',
      firstName: sib.firstName,
      lastName: sib.lastName,
      gender: sib.gender,
      biologicalGender: sib.gender,
      age: sib.age,
      birthYear: sibBirthYear,
      isAlive: sib.isAlive,
      deathYear: !sib.isAlive ? currentYear : undefined,
      location: {
        country: character.country,
        city: character.city,
        residenceHistory: [
          {
            country: character.country,
            city: character.city,
            startYear: sibBirthYear,
            reason: 'birth',
          },
        ],
      },
      identityResolutionStatus: 'canonical',
      provenanceSource: 'siblings',
      looks,
      smarts,
      health: sib.isAlive ? prng.nextInt(75, 98) : 0,
      happiness: prng.nextInt(65, 95),
      fertility: prng.nextInt(55, 90),
      craziness: prng.nextInt(15, 60),
      personality,
      lifestyle: generateDeterministicLifestyle(prng, sib.age),
      goals: [],
      healthConditions: [],
      education: inferNpcEducationFromAgeAndOccupation(sib.age, sib.occupation, smarts),
      career: {
        jobId: null,
        title: sib.occupation,
        companyName: sib.age >= 18 ? `${character.city} Works` : '',
        occupation: sib.occupation,
        salary: finances.annualIncome,
        performance: prng.nextInt(60, 90),
        yearsInRole: Math.max(0, sib.age - 18),
        isRetired: false,
        pensionAnnual: 0,
        history: [],
      },
      finances,
      lifeHistory: [birthMilestone],
      biologicalFatherId: migratedFather.id,
      biologicalMotherId: migratedMother.id,
      adoptiveParentIds: [],
      stepParentIds: [],
      isAdopted: false,
      birthOrder: sib.birthOrder,
      legacyRoleLabel: sib.role === 'brother' ? 'Brother' : 'Sister',
    };

    registerOrEnrichNpc(npc);

    // Link sibling <-> player
    upsertCanonicalRelationshipEdge(relationshipsById, relationshipIndex, {
      id1: resolvedId,
      id2: character.id,
      category: 'sibling',
      roleFor1: 'sibling',
      roleFor2: 'sibling',
      lineageRelation: 'biological',
      status: sib.isAlive ? 'active' : 'deceased',
      trust: sib.relationship,
      affection: sib.relationship,
      respect: sib.relationship,
      compatibility: prng.nextInt(55, 90),
      currentYear,
      episodeStartYear: Math.max(character.birthYear, sibBirthYear),
    });

    // Link sibling <-> parents
    upsertCanonicalRelationshipEdge(relationshipsById, relationshipIndex, {
      id1: migratedFather.id,
      id2: resolvedId,
      category: 'parent_child',
      roleFor1: 'parent',
      roleFor2: 'child',
      lineageRelation: 'biological',
      parentRoleFor1: 'father',
      status: migratedFather.isAlive && sib.isAlive ? 'active' : 'deceased',
      trust: 85,
      affection: 85,
      respect: 85,
      compatibility: 80,
      currentYear,
      episodeStartYear: sibBirthYear,
    });

    upsertCanonicalRelationshipEdge(relationshipsById, relationshipIndex, {
      id1: migratedMother.id,
      id2: resolvedId,
      category: 'parent_child',
      roleFor1: 'parent',
      roleFor2: 'child',
      lineageRelation: 'biological',
      parentRoleFor1: 'mother',
      status: migratedMother.isAlive && sib.isAlive ? 'active' : 'deceased',
      trust: 88,
      affection: 88,
      respect: 88,
      compatibility: 82,
      currentYear,
      episodeStartYear: sibBirthYear,
    });

    return {
      ...sib,
      id: resolvedId,
    };
  });

  // Connect siblings to each other
  for (let i = 0; i < migratedSiblings.length; i++) {
    for (let j = i + 1; j < migratedSiblings.length; j++) {
      const sibA = migratedSiblings[i];
      const sibB = migratedSiblings[j];
      upsertCanonicalRelationshipEdge(relationshipsById, relationshipIndex, {
        id1: sibA.id,
        id2: sibB.id,
        category: 'sibling',
        roleFor1: 'sibling',
        roleFor2: 'sibling',
        lineageRelation: 'biological',
        status: sibA.isAlive && sibB.isAlive ? 'active' : 'deceased',
        trust: 80,
        affection: 80,
        respect: 80,
        compatibility: 78,
        currentYear,
        episodeStartYear: currentYear - Math.min(sibA.age, sibB.age),
      });
    }
  }

  // 3. Migrate Partner, Ex-Partners, and General Relationships
  const migratePersonRecord = (
    person: PersonProfile,
    sourceSlot: 'partner' | 'exPartners' | 'relationships',
    defaultTier: NpcTier
  ): PersonProfile => {
    const personBirthYear = currentYear - person.age;
    const resolvedId = resolveStableLegacyNpcId(tracker, {
      characterId: character.id,
      explicitId: person.id,
      collectionGroup: 'person',
      firstName: person.firstName,
      lastName: person.lastName,
      birthYear: personBirthYear,
      discriminator: `${person.role}:${person.originStory}:${person.stageMet}`,
    });

    const prng = createNpcPRNG(worldSeed, personBirthYear, resolvedId, 'migration', simulationVersion);
    const biologicalGender: BiologicalGender =
      person.gender === 'female'
        ? 'female'
        : person.gender === 'male'
          ? 'male'
          : prng.chance(0.5)
            ? 'female'
            : 'male';
    const smarts = person.partnerStats?.smarts ?? prng.nextInt(45, 88);
    const looks = person.partnerStats?.looks ?? prng.nextInt(45, 88);
    const craziness = person.partnerStats?.craziness ?? prng.nextInt(20, 65);
    const fertility = person.partnerStats?.fertility ?? prng.nextInt(45, 85);
    const occupation = person.partnerStats?.occupation ?? person.role ?? 'Employed';

    const personality = generateDeterministicPersonality(
      prng,
      person.personalityArchetype,
      person.partnerStats?.generosity
    );
    const finances = createInitialNpcFinances({
      country: character.country,
      age: person.age,
      occupation,
      explicitAnnualIncome: person.partnerStats?.annualIncome,
    });

    const isCorePartner =
      sourceSlot === 'partner' ||
      person.relationshipType === 'spouse' ||
      person.relationshipType === 'partner' ||
      person.relationshipType === 'dating' ||
      person.relationshipType === 'best_friend' ||
      person.cohortType === 'best_friend';

    const tier: NpcTier = isCorePartner ? 'core' : defaultTier;

    const birthMilestone = createDeduplicatedLifeEvent({
      npcId: resolvedId,
      year: personBirthYear,
      age: 0,
      type: 'birth',
      title: 'Born',
      description: `${person.firstName} ${person.lastName} was born in ${character.city}, ${character.country}.`,
    });

    const npc: NpcProfile = {
      id: resolvedId,
      tier,
      firstName: person.firstName,
      lastName: person.lastName,
      gender: person.gender as GenderIdentity,
      biologicalGender,
      age: person.age,
      birthYear: personBirthYear,
      isAlive: true,
      location: {
        country: character.country,
        city: character.city,
        residenceHistory: [
          {
            country: character.country,
            city: character.city,
            startYear: personBirthYear,
            reason: 'birth',
          },
        ],
      },
      identityResolutionStatus: 'canonical',
      provenanceSource: sourceSlot,
      looks,
      smarts,
      health: prng.nextInt(70, 98),
      happiness: prng.nextInt(60, 92),
      fertility,
      craziness,
      personality,
      lifestyle: generateDeterministicLifestyle(prng, person.age, person.personalityArchetype),
      goals: [],
      healthConditions: [],
      education: inferNpcEducationFromAgeAndOccupation(person.age, occupation, smarts),
      career: {
        jobId: null,
        title: occupation,
        companyName: `${character.city} Corp`,
        occupation,
        salary: finances.annualIncome,
        performance: prng.nextInt(60, 90),
        yearsInRole: Math.max(0, person.age - 20),
        isRetired: occupation === 'Retired',
        pensionAnnual: 0,
        history: [],
      },
      finances,
      lifeHistory: [birthMilestone],
      adoptiveParentIds: [],
      stepParentIds: [],
      isAdopted: false,
      originStory: person.originStory,
      stageMet: person.stageMet,
      avatarEmoji: person.avatarEmoji,
      legacyRoleLabel: person.role,
      legacyRelationshipType: person.relationshipType,
      legacyCohortType: person.cohortType,
      romanceUnlocked: person.romanceUnlocked,
      romanticStage: person.romanticStage,
      partnerStatsSnapshot: person.partnerStats ? { ...person.partnerStats } : undefined,
      lastInteractedAge: person.lastInteractedAge,
      yearsNeglected: person.yearsNeglected,
    };

    registerOrEnrichNpc(npc);

    // Map relationship category and role labels
    let category: RelationshipCategory = 'friend';
    let roleLabel: ParticipantRoleLabel = 'friend';
    let edgeStatus: 'active' | 'former' | 'deceased' = 'active';

    if (sourceSlot === 'exPartners' || person.relationshipType === 'ex' || person.romanticStage === 'ex') {
      category = 'ex';
      roleLabel = 'ex';
      edgeStatus = 'former';
    } else if (person.romanticStage === 'married' || person.relationshipType === 'spouse') {
      category = 'spouse';
      roleLabel = 'spouse';
    } else if (person.romanticStage === 'engaged') {
      category = 'fiance';
      roleLabel = 'fiance';
    } else if (
      sourceSlot === 'partner' ||
      person.romanticStage === 'dating' ||
      person.relationshipType === 'dating' ||
      person.relationshipType === 'partner'
    ) {
      category = 'dating';
      roleLabel = 'dating';
    } else if (person.relationshipType === 'best_friend' || person.cohortType === 'best_friend') {
      category = 'best_friend';
      roleLabel = 'best_friend';
    } else if (person.relationshipType === 'coworker' || person.cohortType === 'coworker') {
      category = 'coworker';
      roleLabel = 'coworker';
    } else if (person.relationshipType === 'classmate' || person.cohortType === 'classmate') {
      category = 'classmate';
      roleLabel = 'classmate';
    } else if (person.relationshipType === 'roommate') {
      category = 'roommate';
      roleLabel = 'roommate';
    } else if (person.relationshipType === 'mentor') {
      category = 'mentor';
      roleLabel = 'mentor';
    } else if (person.relationshipType === 'rival') {
      category = 'rival';
      roleLabel = 'rival';
    } else if (person.relationshipType === 'enemy') {
      category = 'enemy';
      roleLabel = 'enemy';
    }

    const yearsTogether = person.partnerStats?.yearsTogether ?? 0;
    const existingPersonEdge = findEdgeBetweenIds(
      relationshipsById,
      relationshipIndex,
      resolvedId,
      character.id
    );

    if (!shouldKeepExistingPersonEdge(existingPersonEdge, category)) {
      upsertCanonicalRelationshipEdge(relationshipsById, relationshipIndex, {
        id1: resolvedId,
        id2: character.id,
        category,
        roleFor1: roleLabel,
        roleFor2: roleLabel,
        lineageRelation: 'none',
        status: edgeStatus,
        trust: person.relationship,
        affection: person.relationship,
        respect: person.relationship,
        romance: person.romanceMeter ?? 0,
        compatibility: prng.nextInt(55, 92),
        yearsTogether,
        hasPrenup: person.partnerStats?.hasPrenup,
        engagementRingName: person.partnerStats?.engagementRing?.name,
        engagementRingValue: person.partnerStats?.engagementRing?.value,
        weddingVenue: person.partnerStats?.weddingVenue,
        isPregnant: person.partnerStats?.isPregnant,
        currentYear,
        episodeStartYear: Math.max(character.birthYear, currentYear - Math.max(1, yearsTogether)),
      });
    }

    return {
      ...person,
      id: resolvedId,
    };
  };

  const migratedPartner = character.partner
    ? migratePersonRecord(character.partner, 'partner', 'core')
    : character.partner;

  const migratedExPartners = character.exPartners
    ? character.exPartners.map((ex) => migratePersonRecord(ex, 'exPartners', 'background'))
    : character.exPartners;

  const migratedRelationships = (character.relationships ?? []).map((rel) =>
    migratePersonRecord(rel, 'relationships', 'social')
  );

  // 4. Migrate Children (Biological & Adopted)
  const migratedChildren: ChildProfile[] = (character.children ?? []).map((child) => {
    const childBirthYear = currentYear - child.age;
    const resolvedId = resolveStableLegacyNpcId(tracker, {
      characterId: character.id,
      explicitId: child.id,
      collectionGroup: 'child',
      firstName: child.firstName,
      lastName: child.lastName,
      birthYear: childBirthYear,
      discriminator: `${child.gender}:${child.isAdopted ? 'adopted' : 'bio'}`,
    });

    const prng = createNpcPRNG(worldSeed, childBirthYear, resolvedId, 'migration', simulationVersion);
    const personality = generateDeterministicPersonality(prng);
    const finances = createInitialNpcFinances({
      country: character.country,
      age: child.age,
      occupation: child.occupation,
      wealthTier: character.parents.wealth,
    });

    const lineageRelation: LineageRelationType = child.isAdopted ? 'adoptive' : 'biological';
    const playerParentRole: ParentRoleType =
      character.gender === 'male'
        ? 'father'
        : character.gender === 'female'
          ? 'mother'
          : 'parent';

    const biologicalFatherId =
      !child.isAdopted
        ? character.gender === 'male'
          ? character.id
          : migratedPartner?.gender === 'male'
            ? migratedPartner.id
            : undefined
        : undefined;

    const biologicalMotherId =
      !child.isAdopted
        ? character.gender === 'female'
          ? character.id
          : migratedPartner?.gender === 'female'
            ? migratedPartner.id
            : undefined
        : undefined;

    const adoptiveParentIds = child.isAdopted
      ? [character.id, ...(migratedPartner ? [migratedPartner.id] : [])]
      : [];

    const birthMilestone = createDeduplicatedLifeEvent({
      npcId: resolvedId,
      year: childBirthYear,
      age: 0,
      type: child.isAdopted ? 'child_adopted' : 'birth',
      title: child.isAdopted ? 'Joined Family by Adoption' : 'Born',
      description: `${child.firstName} ${child.lastName} was ${child.isAdopted ? 'adopted' : 'born'} in ${character.city}, ${character.country}.`,
    });

    const npc: NpcProfile = {
      id: resolvedId,
      tier: 'core',
      firstName: child.firstName,
      lastName: child.lastName,
      gender: child.gender,
      biologicalGender: child.gender,
      age: child.age,
      birthYear: childBirthYear,
      isAlive: child.isAlive,
      deathYear: !child.isAlive ? currentYear : undefined,
      location: {
        country: character.country,
        city: character.city,
        residenceHistory: [
          {
            country: character.country,
            city: character.city,
            startYear: childBirthYear,
            reason: 'birth',
          },
        ],
      },
      identityResolutionStatus: 'canonical',
      provenanceSource: 'children',
      looks: child.looks,
      smarts: child.smarts,
      health: child.health,
      happiness: child.happiness,
      fertility: prng.nextInt(55, 90),
      craziness: prng.nextInt(15, 55),
      personality,
      lifestyle: generateDeterministicLifestyle(prng, child.age),
      goals: [],
      healthConditions: [],
      education: inferNpcEducationFromAgeAndOccupation(child.age, child.occupation, child.smarts),
      career: {
        jobId: null,
        title: child.occupation,
        companyName: '',
        occupation: child.occupation,
        salary: finances.annualIncome,
        performance: prng.nextInt(60, 90),
        yearsInRole: 0,
        isRetired: false,
        pensionAnnual: 0,
        history: [],
      },
      finances,
      lifeHistory: [birthMilestone],
      biologicalFatherId,
      biologicalMotherId,
      adoptiveParentIds,
      stepParentIds: [],
      isAdopted: child.isAdopted,
      legacyRoleLabel: child.gender === 'female' ? 'Daughter' : 'Son',
    };

    registerOrEnrichNpc(npc);

    upsertCanonicalRelationshipEdge(relationshipsById, relationshipIndex, {
      id1: character.id,
      id2: resolvedId,
      category: 'parent_child',
      roleFor1: 'parent',
      roleFor2: 'child',
      lineageRelation,
      parentRoleFor1: playerParentRole,
      status: child.isAlive ? 'active' : 'deceased',
      trust: child.relationship,
      affection: child.relationship,
      respect: child.relationship,
      compatibility: 85,
      currentYear,
      episodeStartYear: childBirthYear,
    });

    if (migratedPartner) {
      const partnerParentRole: ParentRoleType =
        migratedPartner.gender === 'male'
          ? 'father'
          : migratedPartner.gender === 'female'
            ? 'mother'
            : 'parent';

      upsertCanonicalRelationshipEdge(relationshipsById, relationshipIndex, {
        id1: migratedPartner.id,
        id2: resolvedId,
        category: 'parent_child',
        roleFor1: 'parent',
        roleFor2: 'child',
        lineageRelation,
        parentRoleFor1: partnerParentRole,
        status: child.isAlive ? 'active' : 'deceased',
        trust: child.relationship,
        affection: child.relationship,
        respect: child.relationship,
        compatibility: 85,
        currentYear,
        episodeStartYear: childBirthYear,
      });
    }

    return {
      ...child,
      id: resolvedId,
    };
  });

  // 5. Collision Protection & Ambiguous Match Flagging:
  // Detect any distinct NPCs in npcRegistry that share identical (firstName, lastName, birthYear)
  // without sharing an ID. Preserve them separately and flag both as 'ambiguous_flagged'.
  const nameBirthGroups = new Map<string, string[]>();
  for (const npc of Object.values(npcRegistry)) {
    const key = `${npc.firstName.trim().toLowerCase()}|${npc.lastName.trim().toLowerCase()}|${npc.birthYear}`;
    const list = nameBirthGroups.get(key) ?? [];
    list.push(npc.id);
    nameBirthGroups.set(key, list);
  }

  for (const ids of nameBirthGroups.values()) {
    if (ids.length > 1) {
      for (const id of ids) {
        if (npcRegistry[id]) {
          npcRegistry[id] = {
            ...npcRegistry[id],
            identityResolutionStatus: 'ambiguous_flagged',
          };
        }
      }
    }
  }

  const finalIndex = rebuildRelationshipIndex(relationshipsById);

  const worldState: WorldSimulationState = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    worldSeed,
    simulationVersion,
    lastSimulatedYear: existingWorld?.lastSimulatedYear ?? currentYear,
    lastSimulationTurnId: existingWorld?.lastSimulationTurnId ?? `init_${currentYear}`,
    familyWealth: character.parents.wealth,
    legacyIdMappings: tracker.legacyIdMappings,
    npcRegistry,
    relationshipsById,
    relationshipIndex: finalIndex,
    inheritanceRecords: { ...(existingWorld?.inheritanceRecords ?? {}) },
    memories: { ...(existingWorld?.memories ?? {}) },
    lifeUpdatesFeed: [...(existingWorld?.lifeUpdatesFeed ?? [])],
    populationConfig: {
      ...DEFAULT_POPULATION_CONFIG,
      ...(existingWorld?.populationConfig ?? {}),
    },
  };

  return {
    ...character,
    parents: {
      ...character.parents,
      father: migratedFather,
      mother: migratedMother,
    },
    siblings: character.siblings ? migratedSiblings : character.siblings,
    children: character.children ? migratedChildren : character.children,
    partner: migratedPartner,
    exPartners: migratedExPartners,
    relationships: migratedRelationships,
    worldState,
  };
}

