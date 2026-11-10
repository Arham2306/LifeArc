import type {
  CharacterProfile,
  ChildProfile,
  ParentProfile,
  ParentsInfo,
  PartnerStats,
  PersonProfile,
  RelationshipType,
  RomanticStage,
  SiblingProfile,
} from '../../../types/game';
import type {
  LineageRelationType,
  NpcProfile,
  ParentRoleType,
  ParticipantRoleLabel,
  RelationshipCategory,
  RelationshipEdge,
  WorldSimulationState,
} from '../types';
import {
  CURRENT_SCHEMA_VERSION,
  migrateToCanonicalWorldState,
  rebuildRelationshipIndex,
  upsertCanonicalRelationshipEdge,
} from './migrationService';
import { sortDeterministicallyByScoreAndId } from './seededPrngService';

export interface OrientedRelationshipView {
  edgeId: string;
  viewerId: string;
  otherId: string;
  category: RelationshipCategory;
  viewerRole: ParticipantRoleLabel;
  otherRole: ParticipantRoleLabel;
  viewerParentRole?: ParentRoleType;
  otherParentRole?: ParentRoleType;
  lineageRelation: LineageRelationType;
  status: RelationshipEdge['status'];
  trust: number;
  affection: number;
  respect: number;
  romance: number;
  compatibility: number;
  compositeMeter: number;
  edge: RelationshipEdge;
}

export interface ResolvedParentRelation {
  npc: NpcProfile;
  edge: RelationshipEdge;
  orientedView: OrientedRelationshipView;
  parentRole: ParentRoleType;
  lineageRelation: 'biological' | 'adoptive' | 'step';
}

export interface ResolvedChildRelation {
  npc: NpcProfile;
  edge: RelationshipEdge;
  orientedView: OrientedRelationshipView;
  lineageRelation: 'biological' | 'adoptive' | 'step';
}

export interface ParentsSelectorOptions {
  viewerId?: string;
  includeBiological?: boolean;
  includeAdoptive?: boolean;
  includeStep?: boolean;
}

export interface ChildrenSelectorOptions {
  viewerId?: string;
  includeBiological?: boolean;
  includeAdoptive?: boolean;
  includeStep?: boolean;
}

/**
 * Ensures the character has a migrated Schema Version 2 WorldSimulationState
 * and returns it without mutating the input object.
 */
export function ensureCanonicalWorldState(character: CharacterProfile): WorldSimulationState {
  if (character.worldState?.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return character.worldState;
  }
  return migrateToCanonicalWorldState(character).worldState!;
}

/**
 * Safeguard #3: Accurately orients a canonical RelationshipEdge from the perspective of `viewerId`.
 * Correctly interprets `roleForA` / `roleForB` and `parentRoleForA` / `parentRoleForB`
 * regardless of lexicographical ID ordering (`participantAId < participantBId`).
 */
export function orientRelationshipEdge(
  edge: RelationshipEdge,
  viewerId: string
): OrientedRelationshipView | null {
  if (viewerId !== edge.participantAId && viewerId !== edge.participantBId) {
    return null;
  }

  const isViewerA = viewerId === edge.participantAId;
  const otherId = isViewerA ? edge.participantBId : edge.participantAId;
  const viewerRole = isViewerA ? edge.roleForA : edge.roleForB;
  const otherRole = isViewerA ? edge.roleForB : edge.roleForA;
  const viewerParentRole = isViewerA ? edge.parentRoleForA : edge.parentRoleForB;
  const otherParentRole = isViewerA ? edge.parentRoleForB : edge.parentRoleForA;
  const compositeMeter = Math.round((edge.trust + edge.affection + edge.respect) / 3);

  return {
    edgeId: edge.id,
    viewerId,
    otherId,
    category: edge.category,
    viewerRole,
    otherRole,
    viewerParentRole,
    otherParentRole,
    lineageRelation: edge.lineageRelation,
    status: edge.status,
    trust: edge.trust,
    affection: edge.affection,
    respect: edge.respect,
    romance: edge.romance,
    compatibility: edge.compatibility,
    compositeMeter,
    edge,
  };
}

/**
 * Retrieves an NPC by ID from the canonical registry.
 */
export function getNpcById(character: CharacterProfile, npcId: string): NpcProfile | undefined {
  const world = ensureCanonicalWorldState(character);
  return world.npcRegistry[npcId];
}

/**
 * Returns all NPCs in the canonical registry, sorted deterministically by ID.
 */
export function getAllNpcs(character: CharacterProfile): NpcProfile[] {
  const world = ensureCanonicalWorldState(character);
  return Object.values(world.npcRegistry).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Returns all living active NPCs (`core` and `social` tiers), sorted deterministically by ID.
 */
export function getActiveNpcs(character: CharacterProfile): NpcProfile[] {
  return getAllNpcs(character).filter(
    (npc) => npc.isAlive && (npc.tier === 'core' || npc.tier === 'social')
  );
}

/**
 * Returns all oriented relationship views for a given participant ID, sorted deterministically by edgeId.
 */
export function getEdgesForParticipant(
  character: CharacterProfile,
  participantId: string
): OrientedRelationshipView[] {
  const world = ensureCanonicalWorldState(character);
  const edgeIds = world.relationshipIndex[participantId] ?? [];
  const views: OrientedRelationshipView[] = [];

  for (const edgeId of edgeIds) {
    const edge = world.relationshipsById[edgeId];
    if (!edge) continue;
    const oriented = orientRelationshipEdge(edge, participantId);
    if (oriented) {
      views.push(oriented);
    }
  }

  return views.sort((a, b) => a.edgeId.localeCompare(b.edgeId));
}

/**
 * Retrieves the single canonical RelationshipEdge between two participants (order-independent).
 */
export function getEdgeBetween(
  character: CharacterProfile,
  id1: string,
  id2: string
): RelationshipEdge | undefined {
  const world = ensureCanonicalWorldState(character);
  const participantAId = id1.localeCompare(id2) <= 0 ? id1 : id2;
  const participantBId = id1.localeCompare(id2) <= 0 ? id2 : id1;
  const edgeIds = world.relationshipIndex[participantAId] ?? [];

  for (const edgeId of edgeIds) {
    const edge = world.relationshipsById[edgeId];
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
 * Safeguard #3: Canonical parent selector that accurately interprets `roleForA` and `roleForB`
 * (regardless of whether `parentId < childId` or `childId < parentId`) and preserves
 * biological, adoptive, and step-parent distinctions.
 */
export function getParentsSelector(
  character: CharacterProfile,
  options: ParentsSelectorOptions = {}
): ResolvedParentRelation[] {
  const world = ensureCanonicalWorldState(character);
  const viewerId = options.viewerId ?? character.id;
  const includeBiological = options.includeBiological ?? true;
  const includeAdoptive = options.includeAdoptive ?? true;
  const includeStep = options.includeStep ?? true;

  const views = getEdgesForParticipant(character, viewerId);
  const results: ResolvedParentRelation[] = [];

  for (const view of views) {
    if (view.category !== 'parent_child') continue;
    // Viewer must be the child, and the other participant must be the parent
    if (view.viewerRole !== 'child' || view.otherRole !== 'parent') continue;

    const lineage =
      view.lineageRelation === 'adoptive'
        ? 'adoptive'
        : view.lineageRelation === 'step'
          ? 'step'
          : 'biological';

    if (lineage === 'biological' && !includeBiological) continue;
    if (lineage === 'adoptive' && !includeAdoptive) continue;
    if (lineage === 'step' && !includeStep) continue;

    const npc = world.npcRegistry[view.otherId];
    if (!npc) continue;

    const parentRole: ParentRoleType =
      view.otherParentRole ??
      (npc.biologicalGender === 'male'
        ? 'father'
        : npc.biologicalGender === 'female'
          ? 'mother'
          : 'parent');

    results.push({
      npc,
      edge: view.edge,
      orientedView: view,
      parentRole,
      lineageRelation: lineage,
    });
  }

  return results.sort((a, b) => a.npc.id.localeCompare(b.npc.id));
}

/**
 * Convenience selector returning only step-parents (`lineageRelation === 'step'`).
 */
export function getStepParentsSelector(
  character: CharacterProfile,
  viewerId?: string
): ResolvedParentRelation[] {
  return getParentsSelector(character, {
    viewerId,
    includeBiological: false,
    includeAdoptive: false,
    includeStep: true,
  });
}

/**
 * Canonical child selector that accurately interprets `roleForA` and `roleForB`
 * (where `viewerRole === 'parent'` and `otherRole === 'child'`) and preserves
 * biological, adoptive, and step-child distinctions.
 */
export function getChildrenForParticipantSelector(
  character: CharacterProfile,
  options: ChildrenSelectorOptions = {}
): ResolvedChildRelation[] {
  const world = ensureCanonicalWorldState(character);
  const viewerId = options.viewerId ?? character.id;
  const includeBiological = options.includeBiological ?? true;
  const includeAdoptive = options.includeAdoptive ?? true;
  const includeStep = options.includeStep ?? false;

  const views = getEdgesForParticipant(character, viewerId);
  const results: ResolvedChildRelation[] = [];

  for (const view of views) {
    if (view.category !== 'parent_child') continue;
    if (view.viewerRole !== 'parent' || view.otherRole !== 'child') continue;

    const lineage =
      view.lineageRelation === 'adoptive'
        ? 'adoptive'
        : view.lineageRelation === 'step'
          ? 'step'
          : 'biological';

    if (lineage === 'biological' && !includeBiological) continue;
    if (lineage === 'adoptive' && !includeAdoptive) continue;
    if (lineage === 'step' && !includeStep) continue;

    const npc = world.npcRegistry[view.otherId];
    if (!npc) continue;

    results.push({
      npc,
      edge: view.edge,
      orientedView: view,
      lineageRelation: lineage,
    });
  }

  return results.sort((a, b) => a.npc.id.localeCompare(b.npc.id));
}

/**
 * Derived compatibility view for `ParentsInfo` (used by `ParentsCard` and `RelationshipsScreen`).
 * Prefers biological/adoptive primary parents for the `father` and `mother` slots.
 */
export function getParentsView(character: CharacterProfile): ParentsInfo {
  const world = ensureCanonicalWorldState(character);
  const parentRels = getParentsSelector(character, {
    viewerId: character.id,
    includeBiological: true,
    includeAdoptive: true,
    includeStep: true,
  });

  // Sort so biological/adoptive come before step-parents
  const prioritized = [...parentRels].sort((a, b) => {
    const rank = (rel: ResolvedParentRelation) =>
      rel.lineageRelation === 'biological' ? 0 : rel.lineageRelation === 'adoptive' ? 1 : 2;
    return rank(a) - rank(b) || a.npc.id.localeCompare(b.npc.id);
  });

  const fatherRel = prioritized.find((r) => r.parentRole === 'father');
  const motherRel = prioritized.find((r) => r.parentRole === 'mother');

  const toParentProfile = (
    rel: ResolvedParentRelation | undefined,
    fallback: ParentProfile,
    role: 'father' | 'mother'
  ): ParentProfile => {
    if (!rel) return fallback;
    return {
      id: rel.npc.id,
      role,
      firstName: rel.npc.firstName,
      lastName: rel.npc.lastName,
      age: rel.npc.age,
      occupation: rel.npc.career.occupation,
      isAlive: rel.npc.isAlive,
      relationship: rel.orientedView.compositeMeter,
      generosity: rel.npc.personality.generosity,
      lineageRelation: rel.lineageRelation,
    };
  };

  return {
    father: toParentProfile(fatherRel, character.parents.father, 'father'),
    mother: toParentProfile(motherRel, character.parents.mother, 'mother'),
    wealth: world.familyWealth ?? character.parents.wealth,
  };
}

/**
 * Derived compatibility view for `SiblingProfile[]`.
 */
export function getSiblingsSelector(character: CharacterProfile): SiblingProfile[] {
  const world = ensureCanonicalWorldState(character);
  const views = getEdgesForParticipant(character, character.id);
  const siblings: SiblingProfile[] = [];

  for (const view of views) {
    if (view.category !== 'sibling') continue;
    const npc = world.npcRegistry[view.otherId];
    if (!npc) continue;

    const birthOrder: SiblingProfile['birthOrder'] =
      npc.birthOrder ??
      (npc.age > character.age ? 'older' : npc.age < character.age ? 'younger' : 'twin');

    siblings.push({
      id: npc.id,
      role: npc.biologicalGender === 'female' ? 'sister' : 'brother',
      firstName: npc.firstName,
      lastName: npc.lastName,
      age: npc.age,
      gender: npc.biologicalGender,
      relationship: view.compositeMeter,
      occupation: npc.career.occupation,
      isAlive: npc.isAlive,
      birthOrder,
    });
  }

  return siblings;
}

/**
 * Derived compatibility view for `ChildProfile[]`, preserving biological vs adoptive lineage.
 */
export function getChildrenSelector(character: CharacterProfile): ChildProfile[] {
  const childRels = getChildrenForParticipantSelector(character, {
    viewerId: character.id,
    includeBiological: true,
    includeAdoptive: true,
    includeStep: false,
  });

  return childRels.map((rel) => ({
    id: rel.npc.id,
    firstName: rel.npc.firstName,
    lastName: rel.npc.lastName,
    age: rel.npc.age,
    gender: rel.npc.biologicalGender,
    relationship: rel.orientedView.compositeMeter,
    smarts: rel.npc.smarts,
    looks: rel.npc.looks,
    happiness: rel.npc.happiness,
    health: rel.npc.health,
    isAdopted: rel.lineageRelation === 'adoptive' || rel.npc.isAdopted,
    occupation: rel.npc.career.occupation,
    isAlive: rel.npc.isAlive,
  }));
}

function toPersonProfile(npc: NpcProfile, view: OrientedRelationshipView): PersonProfile {
  let relationshipType: RelationshipType = npc.legacyRelationshipType ?? 'friend';
  let romanticStage: RomanticStage = npc.romanticStage ?? 'none';

  if (view.category === 'spouse') {
    relationshipType = 'spouse';
    romanticStage = 'married';
  } else if (view.category === 'fiance') {
    relationshipType = 'partner';
    romanticStage = 'engaged';
  } else if (view.category === 'dating') {
    relationshipType = npc.legacyRelationshipType === 'partner' ? 'partner' : 'dating';
    if (romanticStage === 'none') romanticStage = 'dating';
  } else if (view.category === 'ex' || view.category === 'former_spouse') {
    relationshipType = 'ex';
    romanticStage = 'ex';
  } else if (view.category === 'best_friend') {
    relationshipType = 'best_friend';
  } else if (view.category === 'coworker') {
    relationshipType = 'coworker';
  } else if (view.category === 'classmate') {
    relationshipType = 'classmate';
  } else if (view.category === 'roommate') {
    relationshipType = 'roommate';
  } else if (view.category === 'mentor') {
    relationshipType = 'mentor';
  } else if (view.category === 'rival') {
    relationshipType = 'rival';
  } else if (view.category === 'enemy') {
    relationshipType = 'enemy';
  }

  const partnerStats: PartnerStats = {
    ...(npc.partnerStatsSnapshot ?? {}),
    craziness: npc.craziness,
    generosity: npc.personality.generosity,
    looks: npc.looks,
    smarts: npc.smarts,
    fertility: npc.fertility,
    occupation: npc.career.occupation,
    annualIncome: npc.finances.annualIncome,
    hasPrenup: view.edge.hasPrenup ?? npc.partnerStatsSnapshot?.hasPrenup,
    yearsTogether: view.edge.yearsTogether,
    engagementRing: view.edge.engagementRingName
      ? {
          name: view.edge.engagementRingName,
          value: view.edge.engagementRingValue ?? 0,
        }
      : npc.partnerStatsSnapshot?.engagementRing,
    weddingVenue: view.edge.weddingVenue ?? npc.partnerStatsSnapshot?.weddingVenue,
    isPregnant: view.edge.isPregnant ?? npc.partnerStatsSnapshot?.isPregnant,
  };

  return {
    id: npc.id,
    firstName: npc.firstName,
    lastName: npc.lastName,
    gender: npc.gender,
    age: npc.age,
    role: npc.legacyRoleLabel ?? npc.career.occupation,
    relationshipType,
    relationship: view.compositeMeter,
    originStory: npc.originStory ?? `Met in ${npc.location.city}`,
    stageMet: npc.stageMet ?? 'adulthood',
    avatarEmoji: npc.avatarEmoji,
    romanceUnlocked: npc.romanceUnlocked ?? view.romance > 0,
    romanceMeter: view.romance,
    romanticStage,
    partnerStats,
    cohortType: npc.legacyCohortType,
    lastInteractedAge: npc.lastInteractedAge,
    yearsNeglected: npc.yearsNeglected,
    personalityArchetype: npc.personality.archetype,
  };
}

/**
 * Derived compatibility view for the player's active romantic partner (`dating`, `fiance`, or `spouse`).
 */
const ROMANTIC_PARTNER_RANK: Partial<Record<RelationshipCategory, number>> = {
  spouse: 0,
  fiance: 1,
  dating: 2,
};

export function getPartnerSelector(character: CharacterProfile): PersonProfile | null {
  const world = ensureCanonicalWorldState(character);
  const views = getEdgesForParticipant(character, character.id);
  const romanticViews = views.filter((view) => {
    if (view.status !== 'active') return false;
    if (ROMANTIC_PARTNER_RANK[view.category] === undefined) return false;
    const npc = world.npcRegistry[view.otherId];
    return Boolean(npc && npc.isAlive);
  });

  romanticViews.sort((a, b) => {
    const rankDelta =
      (ROMANTIC_PARTNER_RANK[a.category] ?? 0) - (ROMANTIC_PARTNER_RANK[b.category] ?? 0);
    if (rankDelta !== 0) return rankDelta;
    return a.edgeId.localeCompare(b.edgeId);
  });

  const chosen = romanticViews[0];
  if (!chosen) return null;
  const npc = world.npcRegistry[chosen.otherId];
  if (!npc) return null;
  return toPersonProfile(npc, chosen);
}

/**
 * Derived compatibility view for general social relationships.
 */
export function getRelationshipsSelector(character: CharacterProfile): PersonProfile[] {
  const world = ensureCanonicalWorldState(character);
  const views = getEdgesForParticipant(character, character.id);
  const results: PersonProfile[] = [];

  for (const view of views) {
    if (view.category === 'parent_child' || view.category === 'sibling') continue;
    if (view.status === 'former' && view.category === 'ex' && character.exPartners?.some((e) => e.id === view.otherId)) {
      // Pure exPartners entries that aren't in `relationships`
      const inRelArray = character.relationships?.some((r) => r.id === view.otherId);
      if (!inRelArray) continue;
    }
    const npc = world.npcRegistry[view.otherId];
    if (!npc || !npc.isAlive) continue;
    results.push(toPersonProfile(npc, view));
  }

  return results;
}

/**
 * Links a parent and child in the canonical relationship graph (supporting biological,
 * adoptive, and step-parent lineage) and updates the child NPC's parentage metadata.
 */
export function linkParentAndChild(
  character: CharacterProfile,
  params: {
    parentId: string;
    childId: string;
    parentRole: ParentRoleType;
    lineageRelation: 'biological' | 'adoptive' | 'step';
    trust?: number;
    affection?: number;
    respect?: number;
    compatibility?: number;
    episodeStartYear?: number;
  }
): CharacterProfile {
  const migrated =
    character.worldState?.schemaVersion === CURRENT_SCHEMA_VERSION
      ? character
      : migrateToCanonicalWorldState(character);
  const world = migrated.worldState!;
  const currentYear = migrated.birthYear + migrated.age;

  const relationshipsById = { ...world.relationshipsById };
  const relationshipIndex: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(world.relationshipIndex)) {
    relationshipIndex[k] = [...v];
  }

  const parentNpc = world.npcRegistry[params.parentId];
  const childNpc = world.npcRegistry[params.childId];
  const isAlive = (parentNpc ? parentNpc.isAlive : migrated.isAlive) && (childNpc ? childNpc.isAlive : migrated.isAlive);

  upsertCanonicalRelationshipEdge(relationshipsById, relationshipIndex, {
    id1: params.parentId,
    id2: params.childId,
    category: 'parent_child',
    roleFor1: 'parent',
    roleFor2: 'child',
    lineageRelation: params.lineageRelation,
    parentRoleFor1: params.parentRole,
    status: isAlive ? 'active' : 'deceased',
    trust: params.trust ?? 75,
    affection: params.affection ?? 75,
    respect: params.respect ?? 75,
    compatibility: params.compatibility ?? 80,
    currentYear,
    episodeStartYear: params.episodeStartYear ?? currentYear,
  });

  const npcRegistry = { ...world.npcRegistry };
  if (childNpc) {
    const updatedChild: NpcProfile = {
      ...childNpc,
      adoptiveParentIds: [...childNpc.adoptiveParentIds],
      stepParentIds: [...childNpc.stepParentIds],
    };

    if (params.lineageRelation === 'biological') {
      if (params.parentRole === 'father') {
        updatedChild.biologicalFatherId = params.parentId;
      } else if (params.parentRole === 'mother') {
        updatedChild.biologicalMotherId = params.parentId;
      }
    } else if (params.lineageRelation === 'adoptive') {
      updatedChild.isAdopted = true;
      if (!updatedChild.adoptiveParentIds.includes(params.parentId)) {
        updatedChild.adoptiveParentIds.push(params.parentId);
      }
    } else if (params.lineageRelation === 'step') {
      if (!updatedChild.stepParentIds.includes(params.parentId)) {
        updatedChild.stepParentIds.push(params.parentId);
      }
    }

    npcRegistry[params.childId] = updatedChild;
  }

  return {
    ...migrated,
    worldState: {
      ...world,
      npcRegistry,
      relationshipsById,
      relationshipIndex: rebuildRelationshipIndex(relationshipsById),
    },
  };
}

function playerAffinityScore(
  worldState: WorldSimulationState,
  npcId: string,
  playerId: string
): number {
  const edgeIds = worldState.relationshipIndex[npcId] ?? [];
  for (const edgeId of edgeIds) {
    const edge = worldState.relationshipsById[edgeId];
    if (edge && (edge.participantAId === playerId || edge.participantBId === playerId)) {
      return Math.round((edge.trust + edge.affection + edge.respect) / 3);
    }
  }
  return 50;
}

/**
 * Reconciles NPC tiers against `populationConfig.activeNpcTarget` (default 120):
 * - Deceased NPCs are transitioned to `'historical'` (never deleted).
 * - `'core'` NPCs are never demoted.
 * - If active (`'core'` + `'social'`) living NPCs exceed `activeNpcTarget`, demotes lowest-affinity
 *   `'social'` NPCs to `'background'` using deterministic score+ID tie-breaking.
 * - Flagged demotions are promoted back to `'social'` when a slot opens.
 *   Background NPCs that were never demoted stay background.
 */
export function reconcilePopulationTiers(
  worldState: WorldSimulationState,
  playerId: string
): WorldSimulationState {
  const npcRegistry: Record<string, NpcProfile> = {};
  const target = worldState.populationConfig.activeNpcTarget;

  let coreCount = 0;
  const socialCandidates: Array<{ id: string; score: number }> = [];
  const promotionCandidates: Array<{ id: string; score: number }> = [];

  for (const [id, npc] of Object.entries(worldState.npcRegistry)) {
    if (!npc.isAlive) {
      npcRegistry[id] =
        npc.tier === 'historical' && !npc.demotedByPopulationCap
          ? npc
          : { ...npc, tier: 'historical', demotedByPopulationCap: false };
      continue;
    }

    if (npc.tier === 'core') {
      coreCount++;
      npcRegistry[id] = npc;
      continue;
    }

    if (npc.tier === 'social') {
      socialCandidates.push({
        id,
        score: playerAffinityScore(worldState, id, playerId),
      });
      npcRegistry[id] = npc;
      continue;
    }

    if (npc.tier === 'background' && npc.demotedByPopulationCap) {
      promotionCandidates.push({
        id,
        score: playerAffinityScore(worldState, id, playerId),
      });
    }

    npcRegistry[id] = npc;
  }

  const maxSocialSlots = Math.max(0, target - coreCount);
  let socialCount = socialCandidates.length;

  if (socialCandidates.length > maxSocialSlots) {
    const sorted = sortDeterministicallyByScoreAndId(socialCandidates);
    const demotedIds = new Set(sorted.slice(maxSocialSlots).map((c) => c.id));
    for (const id of demotedIds) {
      npcRegistry[id] = {
        ...npcRegistry[id],
        tier: 'background',
        demotedByPopulationCap: true,
      };
    }
    socialCount = maxSocialSlots;
  }

  const openSlots = maxSocialSlots - socialCount;
  if (openSlots > 0 && promotionCandidates.length > 0) {
    const sorted = sortDeterministicallyByScoreAndId(promotionCandidates);
    for (const candidate of sorted.slice(0, openSlots)) {
      npcRegistry[candidate.id] = {
        ...npcRegistry[candidate.id],
        tier: 'social',
        demotedByPopulationCap: false,
      };
    }
  }

  return {
    ...worldState,
    npcRegistry,
  };
}

