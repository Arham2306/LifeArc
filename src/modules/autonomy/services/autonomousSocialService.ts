/**
 * NPC social autonomy (Milestone 3).
 *
 * Pure world-state functions. They do not read or write a player profile and
 * they are not called from Age Up.
 */
import type {
  NpcLifeEventType,
  NpcProfile,
  ParticipantRoleLabel,
  RelationshipCategory,
  RelationshipEdge,
  RelationshipEpisode,
  WorldSimulationState,
} from '../types';
import { acceptProbabilisticDecision, evaluateProbabilisticDecision } from './decisionEngine';
import {
  appendDeduplicatedLifeEvents,
  createDeduplicatedLifeEvent,
  rebuildRelationshipIndex,
} from './migrationService';
import {
  createNpcPRNG,
  deterministicUUID,
  sortDeterministicallyByScoreAndId,
  type SeededPRNG,
} from './seededPrngService';

const MAX_ACTIVE_PLATONIC_EDGES = 6;
const MIN_FRIENDSHIP_AGE = 6;
const ADULT_AGE = 18;
const MINOR_MAX_AGE_GAP = 3;
const ADULT_MAX_AGE_GAP = 12;
const BEST_FRIEND_METER = 80;
const BEST_FRIEND_YEARS = 2;
const RIVAL_TRUST = 25;
const ENEMY_TRUST = 15;
const DRIFT_COMPOSITE = 12;
const LOYALTY_DECAY_RELIEF = 70;
/** Remote conversation is intentionally less likely than an in-person meeting. */
const REMOTE_CONVERSATION_PROBABILITY = 0.3;
const CAP_CATEGORIES = new Set<RelationshipCategory>([
  'friend',
  'best_friend',
  'classmate',
  'coworker',
  'roommate',
  'rival',
  'enemy',
]);

const SOCIAL_CATEGORIES = new Set<RelationshipCategory>([
  'friend',
  'best_friend',
  'classmate',
  'coworker',
  'roommate',
  'rival',
  'enemy',
  'mentor',
]);

const STABLE_CATEGORIES = new Set<RelationshipCategory>([
  'classmate',
  'coworker',
  'roommate',
  'mentor',
]);

const ROLE_CATEGORIES = new Set<string>([
  'friend',
  'best_friend',
  'classmate',
  'coworker',
  'roommate',
  'rival',
  'enemy',
  'mentor',
]);

type EpisodeEndReason = NonNullable<RelationshipEpisode['endReason']>;
type SocialAction = 'conversation' | 'spend_time' | 'help' | 'disagreement' | 'reconciliation';
type Participation = 'full' | 'decay' | 'skip';

interface SocialMeters {
  trust: number;
  affection: number;
  respect: number;
}

interface PlannedFriendship {
  key: string;
  aId: string;
  bId: string;
  existingEdgeId?: string;
  category: RelationshipCategory;
  compatibility: number;
  meter: number;
}

interface ScoredFriendship extends PlannedFriendship {
  id: string;
  score: number;
  chosen: boolean;
}

function clampMeter(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function pairKey(id1: string, id2: string): string {
  return id1.localeCompare(id2) <= 0 ? `${id1}|${id2}` : `${id2}|${id1}`;
}

function orderedIds(id1: string, id2: string): [string, string] {
  return id1.localeCompare(id2) <= 0 ? [id1, id2] : [id2, id1];
}

function samePlace(a: NpcProfile, b: NpcProfile): boolean {
  return a.location.country === b.location.country && a.location.city === b.location.city;
}

function average(left: number, right: number): number {
  return (left + right) / 2;
}

function compositeOf(meters: SocialMeters): number {
  return (meters.trust + meters.affection + meters.respect) / 3;
}

function startingSocialMeter(compatibility: number): number {
  const raw = 40 + Math.round(compatibility / 10);
  return Math.max(35, Math.min(60, raw));
}

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  const sorted: Record<string, T> = {};
  for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = record[key] as T;
  }
  return sorted;
}

function edgeBetween(
  edges: Record<string, RelationshipEdge>,
  id1: string,
  id2: string
): RelationshipEdge | undefined {
  const [participantAId, participantBId] = orderedIds(id1, id2);
  let found: RelationshipEdge | undefined;
  for (const edge of Object.values(edges)) {
    if (edge.participantAId !== participantAId || edge.participantBId !== participantBId) continue;
    if (!found || edge.id.localeCompare(found.id) < 0) found = edge;
  }
  return found;
}

function activePlatonicCount(
  edges: Record<string, RelationshipEdge>,
  npcId: string,
  playerId: string
): number {
  let count = 0;
  for (const edge of Object.values(edges)) {
    if (edge.status !== 'active' || !CAP_CATEGORIES.has(edge.category)) continue;
    const other =
      edge.participantAId === npcId
        ? edge.participantBId
        : edge.participantBId === npcId
          ? edge.participantAId
          : null;
    if (!other || other === playerId) continue;
    count += 1;
  }
  return count;
}

function agesAllowFriendship(a: NpcProfile, b: NpcProfile): boolean {
  if (a.age < MIN_FRIENDSHIP_AGE || b.age < MIN_FRIENDSHIP_AGE) return false;
  const aIsMinor = a.age < ADULT_AGE;
  const bIsMinor = b.age < ADULT_AGE;
  if (aIsMinor !== bIsMinor) return false;
  const gap = Math.abs(a.age - b.age);
  return aIsMinor ? gap <= MINOR_MAX_AGE_GAP : gap <= ADULT_MAX_AGE_GAP;
}

function canFormFriendships(npc: NpcProfile): boolean {
  return npc.isAlive && (npc.tier === 'core' || npc.tier === 'social');
}

function participationMode(a: NpcProfile, b: NpcProfile): Participation {
  if (!a.isAlive || !b.isAlive) return 'skip';
  if (a.tier === 'historical' || b.tier === 'historical') return 'skip';
  if (a.tier === 'background' || b.tier === 'background') return 'decay';
  if (
    (a.tier === 'core' || a.tier === 'social') &&
    (b.tier === 'core' || b.tier === 'social')
  ) {
    return 'full';
  }
  return 'skip';
}

function reactivationCategory(edge: RelationshipEdge): RelationshipCategory | null {
  if (edge.status !== 'former') return null;
  if (edge.category === 'friend' || edge.category === 'best_friend') return 'friend';
  if (
    edge.category === 'classmate' ||
    edge.category === 'coworker' ||
    edge.category === 'roommate'
  ) {
    return edge.category;
  }
  return null;
}

function sharedCount(left: readonly string[], right: readonly string[]): number {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  const seen = new Set<string>();
  let count = 0;
  for (const item of left) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (rightSet.has(key)) count += 1;
  }
  return count;
}

function sharedLifestyle(a: NpcProfile, b: NpcProfile): number {
  return (
    sharedCount(a.lifestyle.interests, b.lifestyle.interests) +
    sharedCount(a.lifestyle.hobbies, b.lifestyle.hobbies)
  );
}

function hasMutualPlatonicFriend(
  aId: string,
  bId: string,
  edges: Record<string, RelationshipEdge>,
  playerId: string
): boolean {
  const friendsOf = (npcId: string): Set<string> => {
    const friends = new Set<string>();
    for (const edge of Object.values(edges)) {
      if (edge.status !== 'active' || !CAP_CATEGORIES.has(edge.category)) continue;
      const other =
        edge.participantAId === npcId
          ? edge.participantBId
          : edge.participantBId === npcId
            ? edge.participantAId
            : null;
      if (!other || other === playerId || other === aId || other === bId) continue;
      friends.add(other);
    }
    return friends;
  };

  const friendsOfA = friendsOf(aId);
  for (const friendId of friendsOf(bId)) {
    if (friendsOfA.has(friendId)) return true;
  }
  return false;
}

function compatibilityScore(
  a: NpcProfile,
  b: NpcProfile,
  edges: Record<string, RelationshipEdge>,
  playerId: string
): number {
  const facets = [
    'sociability',
    'empathy',
    'agreeableness',
    'extraversion',
    'openness',
    'neuroticism',
  ] as const;
  let difference = 0;
  for (const facet of facets) {
    difference += Math.abs(a.personality[facet] - b.personality[facet]);
  }
  const similarity = Math.max(0, 100 - difference / facets.length);
  const sharedScore = Math.min(100, sharedLifestyle(a, b) * 30);
  const gapScore = Math.max(0, 100 - Math.abs(a.age - b.age) * 8);
  const mutual = hasMutualPlatonicFriend(a.id, b.id, edges, playerId) ? 100 : 0;
  return clampMeter(similarity * 0.45 + sharedScore * 0.3 + gapScore * 0.15 + mutual * 0.1);
}

function rolesFor(
  category: RelationshipCategory
): { roleForA: ParticipantRoleLabel; roleForB: ParticipantRoleLabel } | null {
  if (!ROLE_CATEGORIES.has(category)) return null;
  const role = category as ParticipantRoleLabel;
  return { roleForA: role, roleForB: role };
}

function closeOpenEpisodes(
  episodes: readonly RelationshipEpisode[],
  year: number,
  endReason: EpisodeEndReason
): RelationshipEpisode[] {
  return episodes.map((episode) =>
    episode.endYear === undefined ? { ...episode, endYear: year, endReason } : { ...episode }
  );
}

function appendOpenEpisode(
  episodes: readonly RelationshipEpisode[],
  edgeId: string,
  category: RelationshipCategory,
  year: number,
  marker: string
): RelationshipEpisode[] {
  const episodeId = deterministicUUID('rel-episode', edgeId, category, String(year), marker);
  if (episodes.some((episode) => episode.episodeId === episodeId)) return [...episodes];
  return [...episodes, { episodeId, category, startYear: year }];
}

function openEpisodeCount(episodes: readonly RelationshipEpisode[]): number {
  return episodes.filter((episode) => episode.endYear === undefined).length;
}

function recordLifeEvent(
  draft: WorldSimulationState,
  npcId: string,
  year: number,
  type: NpcLifeEventType,
  title: string,
  description: string,
  referenceId?: string
): void {
  const npc = draft.npcRegistry[npcId];
  if (!npc) return;
  const event = createDeduplicatedLifeEvent({
    npcId,
    year,
    age: npc.age,
    type,
    title,
    description,
    ...(referenceId !== undefined ? { referenceId } : {}),
  });
  npc.lifeHistory = appendDeduplicatedLifeEvents(npc.lifeHistory, [event]);
}

function recordForBoth(
  draft: WorldSimulationState,
  edge: RelationshipEdge,
  year: number,
  type: NpcLifeEventType,
  titleFor: (npc: NpcProfile, other: NpcProfile) => string,
  descriptionFor: (npc: NpcProfile, other: NpcProfile) => string
): void {
  const left = draft.npcRegistry[edge.participantAId];
  const right = draft.npcRegistry[edge.participantBId];
  if (left && right) {
    recordLifeEvent(
      draft,
      left.id,
      year,
      type,
      titleFor(left, right),
      descriptionFor(left, right),
      edge.id
    );
    recordLifeEvent(
      draft,
      right.id,
      year,
      type,
      titleFor(right, left),
      descriptionFor(right, left),
      edge.id
    );
  }
}

function selectLocalAction(edge: RelationshipEdge, a: NpcProfile, b: NpcProfile): SocialAction {
  const empathy = average(a.personality.empathy, b.personality.empathy);
  const agreeableness = average(a.personality.agreeableness, b.personality.agreeableness);
  const neuroticism = average(a.personality.neuroticism, b.personality.neuroticism);
  const patience = average(a.personality.patience, b.personality.patience);
  const sociability = average(a.personality.sociability, b.personality.sociability);

  if ((edge.category === 'rival' || edge.category === 'enemy') && empathy >= 70) {
    return 'reconciliation';
  }
  if (agreeableness <= 25 && neuroticism >= 75 && patience <= 30) return 'disagreement';
  if (sociability >= 75 && sharedLifestyle(a, b) >= 1) return 'spend_time';
  if (empathy >= 75) return 'help';
  return 'conversation';
}

function applyAction(meters: SocialMeters, action: SocialAction, prng: SeededPRNG): SocialMeters {
  switch (action) {
    case 'conversation':
      return { ...meters, trust: meters.trust + prng.nextInt(2, 4) };
    case 'spend_time':
      return { ...meters, affection: meters.affection + prng.nextInt(3, 5) };
    case 'help':
      return {
        ...meters,
        trust: meters.trust + prng.nextInt(3, 4),
        respect: meters.respect + prng.nextInt(2, 4),
      };
    case 'disagreement':
      return {
        ...meters,
        trust: meters.trust - prng.nextInt(6, 8),
        affection: meters.affection - prng.nextInt(4, 6),
      };
    case 'reconciliation':
      return { trust: 48, affection: 46, respect: 45 };
    default:
      return meters;
  }
}

function neglectLoss(category: RelationshipCategory, a: NpcProfile, b: NpcProfile): number {
  if (category === 'best_friend') return 1;
  const loyalty = average(a.personality.loyalty, b.personality.loyalty);
  return loyalty >= LOYALTY_DECAY_RELIEF ? 1 : 2;
}

function applyNeglect(
  meters: SocialMeters,
  category: RelationshipCategory,
  a: NpcProfile,
  b: NpcProfile
): SocialMeters {
  const loss = neglectLoss(category, a, b);
  return {
    ...meters,
    trust: meters.trust - loss,
    affection: meters.affection - loss,
  };
}

function applyDistance(meters: SocialMeters): SocialMeters {
  return { ...meters, trust: meters.trust - 1, affection: meters.affection - 1 };
}

function categoryTransition(
  edge: RelationshipEdge,
  action: SocialAction,
  meters: SocialMeters,
  yearsTogether: number
): { category: RelationshipCategory; endReason: EpisodeEndReason } | null {
  if (STABLE_CATEGORIES.has(edge.category) || edge.category === 'best_friend') return null;
  if (action === 'reconciliation' && (edge.category === 'rival' || edge.category === 'enemy')) {
    return { category: 'friend', endReason: 'reconciled' };
  }
  if (
    edge.category === 'friend' &&
    action === 'disagreement' &&
    meters.trust < RIVAL_TRUST &&
    compositeOf(meters) >= DRIFT_COMPOSITE
  ) {
    return { category: 'rival', endReason: 'conflict' };
  }
  if (
    edge.category === 'rival' &&
    action === 'disagreement' &&
    meters.trust < ENEMY_TRUST &&
    compositeOf(meters) >= DRIFT_COMPOSITE
  ) {
    return { category: 'enemy', endReason: 'conflict' };
  }
  if (
    edge.category === 'friend' &&
    meters.trust >= BEST_FRIEND_METER &&
    meters.affection >= BEST_FRIEND_METER &&
    meters.respect >= BEST_FRIEND_METER &&
    yearsTogether >= BEST_FRIEND_YEARS
  ) {
    return { category: 'best_friend', endReason: 'deepened' };
  }
  return null;
}

function withMeters(edge: RelationshipEdge, meters: SocialMeters, yearsTogether: number, year: number, interacted: boolean): RelationshipEdge {
  return {
    ...edge,
    trust: clampMeter(meters.trust),
    affection: clampMeter(meters.affection),
    respect: clampMeter(meters.respect),
    yearsTogether,
    lastInteractedYear: interacted ? year : edge.lastInteractedYear,
  };
}

function developRelationship(
  draft: WorldSimulationState,
  edge: RelationshipEdge,
  year: number,
  playerId: string
): RelationshipEdge {
  if (edge.participantAId === playerId || edge.participantBId === playerId) return edge;
  if (edge.status !== 'active' || !SOCIAL_CATEGORIES.has(edge.category)) return edge;

  const left = draft.npcRegistry[edge.participantAId];
  const right = draft.npcRegistry[edge.participantBId];
  if (!left || !right) return edge;

  const mode = participationMode(left, right);
  if (mode === 'skip') return edge;

  const prng = createNpcPRNG(
    draft.worldSeed,
    year,
    pairKey(edge.participantAId, edge.participantBId),
    'social',
    draft.simulationVersion
  );
  let meters: SocialMeters = {
    trust: edge.trust,
    affection: edge.affection,
    respect: edge.respect,
  };
  let yearsTogether = edge.yearsTogether;
  let interacted = false;
  let action: SocialAction | null = null;
  const together = samePlace(left, right);

  if (mode === 'full' && together) {
    action = selectLocalAction(edge, left, right);
    meters = applyAction(meters, action, prng);
    yearsTogether += 1;
    interacted = true;
  } else if (mode === 'full') {
    if (prng.chance(REMOTE_CONVERSATION_PROBABILITY)) {
      action = 'conversation';
      meters = applyAction(meters, action, prng);
      yearsTogether += 1;
      interacted = true;
    }
    meters = applyDistance(meters);
    if (!interacted) meters = applyNeglect(meters, edge.category, left, right);
  } else {
    if (!together) meters = applyDistance(meters);
    meters = applyNeglect(meters, edge.category, left, right);
  }

  meters = {
    trust: clampMeter(meters.trust),
    affection: clampMeter(meters.affection),
    respect: clampMeter(meters.respect),
  };

  let next = withMeters(edge, meters, yearsTogether, year, interacted);
  const transition = action ? categoryTransition(edge, action, meters, yearsTogether) : null;
  if (transition) {
    const roles = rolesFor(transition.category);
    const episodes = appendOpenEpisode(
      closeOpenEpisodes(edge.episodes, year, transition.endReason),
      edge.id,
      transition.category,
      year,
      transition.endReason
    );
    next = {
      ...next,
      category: transition.category,
      ...(roles ?? {}),
      episodes,
    };
    if (transition.endReason === 'reconciled') {
      recordForBoth(
        draft,
        next,
        year,
        'reconciliation',
        (npc, other) => `${npc.firstName} reconciled with ${other.firstName}`,
        (npc, other) => `${npc.firstName} and ${other.firstName} repaired their friendship.`
      );
    }
  }

  if (next.status === 'active' && compositeOf(next) < DRIFT_COMPOSITE) {
    const episodes = closeOpenEpisodes(next.episodes, year, 'drifted');
    next = { ...next, status: 'former', episodes };
    recordForBoth(
      draft,
      next,
      year,
      'friendship_drifted',
      (npc, other) => `${npc.firstName} drifted from ${other.firstName}`,
      (npc, other) => `${npc.firstName} and ${other.firstName} grew apart.`
    );
  }

  if (openEpisodeCount(next.episodes) > 1) {
    const episodes = [...next.episodes];
    let keptOpen = false;
    for (let index = episodes.length - 1; index >= 0; index -= 1) {
      const episode = episodes[index];
      if (!episode || episode.endYear !== undefined) continue;
      if (!keptOpen) {
        keptOpen = true;
        continue;
      }
      episodes[index] = { ...episode, endYear: year, endReason: 'drifted' };
    }
    next = { ...next, episodes };
  }

  return next;
}

function planFormations(
  draft: WorldSimulationState,
  year: number,
  playerId: string
): PlannedFriendship[] {
  const registry = draft.npcRegistry;
  const ids = Object.keys(registry)
    .filter((id) => id !== playerId)
    .sort((a, b) => a.localeCompare(b));
  const candidates: PlannedFriendship[] = [];

  for (let index = 0; index < ids.length; index += 1) {
    const aId = ids[index];
    if (!aId) continue;
    const a = registry[aId];
    if (!a || !canFormFriendships(a)) continue;
    for (let inner = index + 1; inner < ids.length; inner += 1) {
      const bId = ids[inner];
      if (!bId) continue;
      const b = registry[bId];
      if (!b || !canFormFriendships(b)) continue;
      if (!samePlace(a, b) || !agesAllowFriendship(a, b)) continue;
      const existing = edgeBetween(draft.relationshipsById, aId, bId);
      const category = existing ? reactivationCategory(existing) : 'friend';
      if (!category) continue;
      candidates.push({
        key: pairKey(aId, bId),
        aId,
        bId,
        ...(existing ? { existingEdgeId: existing.id } : {}),
        category,
        compatibility: 0,
        meter: 0,
      });
    }
  }

  candidates.sort((a, b) => a.key.localeCompare(b.key));
  const scored: ScoredFriendship[] = [];
  for (const candidate of candidates) {
    const a = registry[candidate.aId];
    const b = registry[candidate.bId];
    if (!a || !b) continue;
    const prng = createNpcPRNG(
      draft.worldSeed,
      year,
      candidate.key,
      'social',
      draft.simulationVersion
    );
    const compatibility = compatibilityScore(a, b, draft.relationshipsById, playerId);
    const decision = evaluateProbabilisticDecision({
      factors: [
        { weight: 0.4, score: compatibility },
        { weight: 0.25, score: average(a.personality.sociability, b.personality.sociability) },
        { weight: 0.2, score: average(a.personality.empathy, b.personality.empathy) },
        { weight: 0.15, score: average(a.personality.agreeableness, b.personality.agreeableness) },
      ],
      threshold: 45,
      steepness: 0.16,
      noiseRange: 2,
      prng,
    });
    const meter = startingSocialMeter(compatibility);
    scored.push({
      ...candidate,
      id: candidate.key,
      compatibility,
      meter,
      score: decision.utility,
      chosen: acceptProbabilisticDecision(decision),
    });
  }

  const slots = new Map<string, number>();
  for (const id of ids) {
    slots.set(id, activePlatonicCount(draft.relationshipsById, id, playerId));
  }
  const gained = new Map<string, number>();
  const accepted: PlannedFriendship[] = [];
  for (const candidate of sortDeterministicallyByScoreAndId(scored.filter((item) => item.chosen))) {
    const countA = slots.get(candidate.aId) ?? 0;
    const countB = slots.get(candidate.bId) ?? 0;
    const gainA = gained.get(candidate.aId) ?? 0;
    const gainB = gained.get(candidate.bId) ?? 0;
    if (
      countA >= MAX_ACTIVE_PLATONIC_EDGES ||
      countB >= MAX_ACTIVE_PLATONIC_EDGES ||
      gainA >= 1 ||
      gainB >= 1
    ) {
      continue;
    }
    slots.set(candidate.aId, countA + 1);
    slots.set(candidate.bId, countB + 1);
    gained.set(candidate.aId, gainA + 1);
    gained.set(candidate.bId, gainB + 1);
    accepted.push(candidate);
  }

  accepted.sort((a, b) => a.key.localeCompare(b.key));
  return accepted;
}

function createFriendshipEdge(plan: PlannedFriendship, year: number): RelationshipEdge {
  const [participantAId, participantBId] = orderedIds(plan.aId, plan.bId);
  const id = deterministicUUID('canonical-rel-edge', participantAId, participantBId);
  const roles = rolesFor(plan.category);
  return {
    id,
    participantAId,
    participantBId,
    category: plan.category,
    roleForA: roles?.roleForA ?? 'friend',
    roleForB: roles?.roleForB ?? 'friend',
    lineageRelation: 'none',
    status: 'active',
    trust: plan.meter,
    affection: plan.meter,
    respect: plan.meter,
    romance: 0,
    compatibility: plan.compatibility,
    yearsTogether: 0,
    lastInteractedYear: year,
    episodes: appendOpenEpisode([], id, plan.category, year, 'started'),
  };
}

function reactivateFriendship(
  edge: RelationshipEdge,
  plan: PlannedFriendship,
  year: number
): RelationshipEdge {
  const roles = rolesFor(plan.category);
  const episodes = appendOpenEpisode(
    closeOpenEpisodes(edge.episodes, year, 'drifted'),
    edge.id,
    plan.category,
    year,
    'reactivated'
  );
  return {
    ...edge,
    category: plan.category,
    ...(roles ?? {}),
    status: 'active',
    trust: plan.meter,
    affection: plan.meter,
    respect: plan.meter,
    romance: 0,
    compatibility: plan.compatibility,
    yearsTogether: 0,
    lastInteractedYear: year,
    episodes,
  };
}

function applyFormation(draft: WorldSimulationState, plan: PlannedFriendship, year: number): void {
  const existing = plan.existingEdgeId
    ? draft.relationshipsById[plan.existingEdgeId]
    : edgeBetween(draft.relationshipsById, plan.aId, plan.bId);
  if (existing && existing.status === 'active') return;

  const edge = existing
    ? reactivateFriendship(existing, plan, year)
    : createFriendshipEdge(plan, year);
  if (!existing && edgeBetween(draft.relationshipsById, plan.aId, plan.bId)) return;
  draft.relationshipsById[edge.id] = edge;
  recordForBoth(
    draft,
    edge,
    year,
    'relationship_started',
    (npc, other) => `${npc.firstName} became friends with ${other.firstName}`,
    (npc, other) =>
      `${npc.firstName} and ${other.firstName} started a friendship in ${npc.location.city}.`
  );
}

function finalizeSocialWorld(draft: WorldSimulationState, year: number): WorldSimulationState {
  draft.npcRegistry = sortRecord(draft.npcRegistry);
  draft.relationshipsById = sortRecord(draft.relationshipsById);
  draft.relationshipIndex = rebuildRelationshipIndex(draft.relationshipsById);
  draft.lastSocialSimYear = year;
  return draft;
}

/**
 * Advances NPC friendships for one simulation year.
 * Repeating the same year, or passing an earlier year, returns the same world.
 */
export function progressNpcSocialYear(
  world: WorldSimulationState,
  year: number,
  playerId: string
): WorldSimulationState {
  if (world.lastSocialSimYear !== undefined && year <= world.lastSocialSimYear) return world;

  const draft = structuredClone(world);
  const formations = planFormations(draft, year, playerId);
  const edgeIds = Object.keys(draft.relationshipsById).sort((leftId, rightId) => {
    const left = draft.relationshipsById[leftId];
    const right = draft.relationshipsById[rightId];
    if (!left || !right) return leftId.localeCompare(rightId);
    const byPair = pairKey(left.participantAId, left.participantBId).localeCompare(
      pairKey(right.participantAId, right.participantBId)
    );
    return byPair || leftId.localeCompare(rightId);
  });

  for (const edgeId of edgeIds) {
    const edge = draft.relationshipsById[edgeId];
    if (!edge) continue;
    draft.relationshipsById[edgeId] = developRelationship(draft, edge, year, playerId);
  }
  for (const formation of formations) applyFormation(draft, formation, year);
  return finalizeSocialWorld(draft, year);
}

/**
 * Marks every active edge that touches `npcId` deceased and closes its open episode once.
 * Categories stay as they are. Former and already deceased edges stay unchanged.
 * A second call for an already reconciled NPC leaves the world unchanged.
 */
export function reconcileSocialEdgesAfterDeath(
  world: WorldSimulationState,
  npcId: string,
  year: number
): WorldSimulationState {
  const npc = world.npcRegistry[npcId];
  if (!npc) return world;

  const draft = structuredClone(world);
  let changed = false;
  const edgeIds = Object.keys(draft.relationshipsById).sort((a, b) => a.localeCompare(b));
  for (const edgeId of edgeIds) {
    const edge = draft.relationshipsById[edgeId];
    if (!edge) continue;
    if (edge.participantAId !== npcId && edge.participantBId !== npcId) continue;
    if (edge.status !== 'active') continue;
    draft.relationshipsById[edgeId] = {
      ...edge,
      status: 'deceased',
      episodes: closeOpenEpisodes(edge.episodes, year, 'death'),
    };
    changed = true;
  }

  const deceased = draft.npcRegistry[npcId];
  if (deceased) {
    const before = deceased.lifeHistory.length;
    recordLifeEvent(
      draft,
      npcId,
      year,
      'death',
      `${deceased.firstName} died`,
      `${deceased.firstName} died.`,
    );
    if (deceased.lifeHistory.length !== before) changed = true;
  }

  if (!changed) return world;
  draft.relationshipIndex = rebuildRelationshipIndex(draft.relationshipsById);
  return draft;
}

/**
 * Moves an NPC, preserving every previous residence row.
 * The open row is closed and exactly one new row is appended.
 * The same destination is not appended again.
 */
export function applyNpcRelocation(
  world: WorldSimulationState,
  npcId: string,
  country: string,
  city: string,
  year: number
): WorldSimulationState {
  const npc = world.npcRegistry[npcId];
  if (!npc) return world;

  const openResidence = [...npc.location.residenceHistory]
    .reverse()
    .find((entry) => entry.endYear === undefined);
  const alreadyThere =
    npc.location.country === country &&
    npc.location.city === city &&
    openResidence !== undefined &&
    openResidence.country === country &&
    openResidence.city === city;
  if (alreadyThere) return world;

  const draft = structuredClone(world);
  const moving = draft.npcRegistry[npcId];
  if (!moving) return world;

  const residenceHistory = moving.location.residenceHistory.map((entry) =>
    entry.endYear === undefined ? { ...entry, endYear: year } : { ...entry }
  );
  residenceHistory.push({ country, city, startYear: year, reason: 'relocation' });
  moving.location = { country, city, residenceHistory };
  recordLifeEvent(
    draft,
    npcId,
    year,
    'relocated',
    `Moved to ${city}`,
    `${moving.firstName} relocated to ${city}, ${country}.`
  );
  return draft;
}
