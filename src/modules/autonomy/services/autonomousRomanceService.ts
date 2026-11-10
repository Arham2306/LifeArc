/**
 * NPC romantic autonomy and family formation (Milestone 4).
 *
 * One canonical edge per pair. The pass does not read or write a player profile,
 * and it is not called from Age Up.
 */
import { FEMALE_NAMES, MALE_NAMES } from '../../character/data/names';
import type {
  GenderIdentity,
  NpcLifeEventType,
  NpcProfile,
  ParentRoleType,
  ParticipantRoleLabel,
  RelationshipCategory,
  RelationshipEdge,
  RelationshipEpisode,
  WorldSimulationState,
} from '../types';
import {
  calculateCanonicalNetWorth,
  convertCurrency,
  createInitialNpcFinances,
} from './currencyService';
import { acceptProbabilisticDecision, evaluateProbabilisticDecision } from './decisionEngine';
import {
  appendDeduplicatedLifeEvents,
  createDeduplicatedLifeEvent,
  rebuildRelationshipIndex,
} from './migrationService';
import { reconcilePopulationTiers } from './npcRegistryService';
import { blendNpcPersonalities } from './personalityService';
import {
  createNpcPRNG,
  deterministicUUID,
  hashSeed,
  sortDeterministicallyByScoreAndId,
  type SeededPRNG,
} from './seededPrngService';

const MAX_DATING_AGE_GAP = 20;
/**
 * Stage gates are fixed meters so dating and engagement clocks stay exact.
 * Engagement requires trust, affection, and romance at 70 once the dating clock is complete.
 * Marriage requires all three at 75 once the engagement clock is complete.
 * An exit is decided before a promotion.
 * An existing couple gets one seeded interaction before those checks.
 */
const INTERACTION_FACETS = ['sociability', 'empathy', 'agreeableness', 'extraversion', 'openness', 'neuroticism'] as const;
const ENGAGEMENT_METER = 70;
const MARRIAGE_METER = 75;
const BREAKUP_METER = 25;
const LOYAL_BREAKUP_METER = 15;
const DIVORCE_METER = 20;
const LOYAL_DIVORCE_METER = 10;
const LOYALTY_STABILITY = 70;
const ADOPTION_FEE_USD = 6000;
const ADOPTION_MIN_AGE = 21;
const ROMANTIC_CATEGORIES = new Set<RelationshipCategory>(['dating', 'fiance', 'spouse']);
const BLOCKED_PAIR_CATEGORIES = new Set<RelationshipCategory>([
  'parent_child',
  'sibling',
  'ex',
  'former_spouse',
  'deceased_spouse',
  'dating',
  'fiance',
  'spouse',
]);

type EpisodeEndReason = NonNullable<RelationshipEpisode['endReason']>;
type RomanticOrientation = NonNullable<NpcProfile['romanticOrientation']>;

interface ScoredPair {
  id: string;
  key: string;
  aId: string;
  bId: string;
  edgeId: string;
  score: number;
  chosen: boolean;
}

function clampStat(value: number): number {
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

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  const sorted: Record<string, T> = {};
  for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = record[key] as T;
  }
  return sorted;
}

function configNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function datingYearRequirement(world: WorldSimulationState): number {
  return configNumber(world.populationConfig.minDatingYears, 2);
}

function engagementYearRequirement(world: WorldSimulationState): number {
  return configNumber(world.populationConfig.minEngagementYears, 2);
}

function romanceAge(world: WorldSimulationState): number {
  return configNumber(world.populationConfig.minAutonomousRomanceAge, 18);
}

function reproductionAge(world: WorldSimulationState): number {
  return configNumber(world.populationConfig.minAutonomousReproductionAge, 18);
}

function fertilityAgeLimit(world: WorldSimulationState): number {
  return configNumber(world.populationConfig.maxFemaleBiologicalFertilityAge, 46);
}

function childCap(world: WorldSimulationState): number {
  return configNumber(world.populationConfig.maxChildrenPerCouple, 4);
}

/**
 * One orientation draw for every NPC path. Binary NPCs use 70/15/15.
 * Non-binary NPCs use three equal shares. The draw does not consume a family stream.
 */
export function resolveRomanticOrientation(
  worldSeed: number,
  npcId: string,
  gender: GenderIdentity
): RomanticOrientation {
  const hash = hashSeed(worldSeed, npcId, gender, 'orientation');
  if (gender === 'non-binary') {
    const third = hash % 3;
    if (third === 0) return 'women';
    if (third === 1) return 'men';
    return 'everyone';
  }
  const bucket = hash % 100;
  const other: RomanticOrientation = gender === 'male' ? 'women' : 'men';
  const same: RomanticOrientation = gender === 'male' ? 'men' : 'women';
  if (bucket <= 69) return other;
  if (bucket <= 84) return same;
  return 'everyone';
}

function effectiveOrientation(world: WorldSimulationState, npc: NpcProfile): RomanticOrientation {
  return npc.romanticOrientation ?? resolveRomanticOrientation(world.worldSeed, npc.id, npc.gender);
}

function orientationAccepts(orientation: RomanticOrientation, gender: GenderIdentity): boolean {
  if (orientation === 'everyone') return true;
  if (gender === 'non-binary') return false;
  return orientation === (gender === 'female' ? 'women' : 'men');
}

function mutuallyAccept(world: WorldSimulationState, a: NpcProfile, b: NpcProfile): boolean {
  return (
    orientationAccepts(effectiveOrientation(world, a), b.gender) &&
    orientationAccepts(effectiveOrientation(world, b), a.gender)
  );
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

function involves(edge: RelationshipEdge, npcId: string): boolean {
  return edge.participantAId === npcId || edge.participantBId === npcId;
}

function otherParticipant(edge: RelationshipEdge, npcId: string): string {
  return edge.participantAId === npcId ? edge.participantBId : edge.participantAId;
}

function parentAndChild(edge: RelationshipEdge): { parentId: string; childId: string } | null {
  if (edge.category !== 'parent_child') return null;
  if (edge.roleForA === 'parent' && edge.roleForB === 'child') {
    return { parentId: edge.participantAId, childId: edge.participantBId };
  }
  if (edge.roleForB === 'parent' && edge.roleForA === 'child') {
    return { parentId: edge.participantBId, childId: edge.participantAId };
  }
  return null;
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

function clearPregnancy(edge: RelationshipEdge): RelationshipEdge {
  const next = { ...edge, isPregnant: false };
  delete next.conceptionYear;
  delete next.pregnantParentId;
  return next;
}

function recordLifeEvent(
  draft: WorldSimulationState,
  npcId: string,
  year: number,
  type: NpcLifeEventType,
  title: string,
  description: string,
  referenceId?: string,
  metadata?: Record<string, unknown>
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
    ...(metadata !== undefined ? { metadata } : {}),
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
  if (!left || !right) return;
  recordLifeEvent(draft, left.id, year, type, titleFor(left, right), descriptionFor(left, right), edge.id);
  recordLifeEvent(draft, right.id, year, type, titleFor(right, left), descriptionFor(right, left), edge.id);
}

function eligibleHousehold(a: NpcProfile, b: NpcProfile): boolean {
  const participating = (npc: NpcProfile) => npc.tier === 'core' || npc.tier === 'social';
  return a.isAlive && b.isAlive && (participating(a) || participating(b));
}

function canStartRomance(npc: NpcProfile, minimumAge: number): boolean {
  return npc.isAlive && (npc.tier === 'core' || npc.tier === 'social') && npc.age >= minimumAge;
}

function shareBiologicalParent(a: NpcProfile, b: NpcProfile): boolean {
  const parents = [a.biologicalFatherId, a.biologicalMotherId].filter((id): id is string => Boolean(id));
  return parents.some((id) => id === b.biologicalFatherId || id === b.biologicalMotherId);
}

function reservedPartners(world: WorldSimulationState): Set<string> {
  const reserved = new Set<string>();
  for (const edge of Object.values(world.relationshipsById)) {
    if (edge.status !== 'active' || !ROMANTIC_CATEGORIES.has(edge.category)) continue;
    reserved.add(edge.participantAId);
    reserved.add(edge.participantBId);
  }
  return reserved;
}

function activeSpouse(
  world: WorldSimulationState,
  npcId: string
): { spouseId: string; edge: RelationshipEdge } | null {
  for (const edge of Object.values(world.relationshipsById)) {
    if (edge.status !== 'active' || edge.category !== 'spouse' || !involves(edge, npcId)) continue;
    return { spouseId: otherParticipant(edge, npcId), edge };
  }
  return null;
}

function isCarrying(world: WorldSimulationState, npcId: string): boolean {
  return Object.values(world.relationshipsById).some(
    (edge) => edge.isPregnant && edge.pregnantParentId === npcId
  );
}

function childrenLinkedTo(
  world: WorldSimulationState,
  parentId: string,
  lineages: Array<'biological' | 'adoptive' | 'step'>
): string[] {
  const childIds: string[] = [];
  for (const edge of Object.values(world.relationshipsById)) {
    if (edge.status === 'former') continue;
    if (!lineages.includes(edge.lineageRelation as 'biological' | 'adoptive' | 'step')) continue;
    const ends = parentAndChild(edge);
    if (!ends || ends.parentId !== parentId) continue;
    childIds.push(ends.childId);
  }
  return childIds;
}

function sharedLivingChildren(world: WorldSimulationState, aId: string, bId: string): string[] {
  const first = new Set(childrenLinkedTo(world, aId, ['biological', 'adoptive']));
  const shared: string[] = [];
  for (const childId of childrenLinkedTo(world, bId, ['biological', 'adoptive'])) {
    if (!first.has(childId) || shared.includes(childId)) continue;
    const child = world.npcRegistry[childId];
    if (child?.isAlive) shared.push(childId);
  }
  return shared;
}

function parentRoleFor(npc: NpcProfile): ParentRoleType {
  return npc.biologicalGender === 'male' ? 'father' : 'mother';
}

function putEdge(draft: WorldSimulationState, edge: RelationshipEdge): void {
  draft.relationshipsById[edge.id] = edge;
}

function createParentEdge(
  draft: WorldSimulationState,
  parent: NpcProfile,
  childId: string,
  lineage: 'biological' | 'adoptive' | 'step',
  year: number,
  stepSourceEdgeId?: string
): RelationshipEdge {
  const existing = edgeBetween(draft.relationshipsById, parent.id, childId);
  if (existing && existing.category === 'parent_child' && lineage === 'step') return existing;
  const [participantAId, participantBId] = orderedIds(parent.id, childId);
  const parentIsA = participantAId === parent.id;
  const parentRole = parentRoleFor(parent);
  const id = existing?.id ?? deterministicUUID('canonical-rel-edge', participantAId, participantBId);
  const replacingStep = existing?.lineageRelation === 'step' && lineage !== 'step';
  const episodes = replacingStep
    ? appendOpenEpisode(closeOpenEpisodes(existing.episodes, year, 'marriage'), id, 'parent_child', year, lineage)
    : existing?.episodes ??
      appendOpenEpisode([], id, 'parent_child', year, lineage);
  const edge: RelationshipEdge = {
    ...(existing ?? {
      trust: 75,
      affection: 80,
      respect: 70,
      romance: 0,
      compatibility: 80,
      yearsTogether: 0,
      lastInteractedYear: year,
    }),
    id,
    participantAId,
    participantBId,
    category: 'parent_child',
    roleForA: parentIsA ? 'parent' : 'child',
    roleForB: parentIsA ? 'child' : 'parent',
    lineageRelation: lineage,
    status: !parent.isAlive || existing?.status === 'deceased' ? 'deceased' : 'active',
    trust: existing?.trust ?? 75,
    affection: existing?.affection ?? 80,
    respect: existing?.respect ?? 70,
    romance: 0,
    compatibility: existing?.compatibility ?? 80,
    yearsTogether: existing?.yearsTogether ?? 0,
    lastInteractedYear: existing?.lastInteractedYear ?? year,
    episodes,
  };
  if (parentIsA) edge.parentRoleForA = parentRole;
  else edge.parentRoleForB = parentRole;
  if (lineage === 'step' && stepSourceEdgeId) edge.stepSourceEdgeId = stepSourceEdgeId;
  if (lineage !== 'step') delete edge.stepSourceEdgeId;
  putEdge(draft, edge);
  return edge;
}

function createSiblingEdge(draft: WorldSimulationState, childA: string, childB: string, year: number): void {
  if (childA === childB || edgeBetween(draft.relationshipsById, childA, childB)) return;
  const [participantAId, participantBId] = orderedIds(childA, childB);
  const id = deterministicUUID('canonical-rel-edge', participantAId, participantBId);
  putEdge(draft, {
    id,
    participantAId,
    participantBId,
    category: 'sibling',
    roleForA: 'sibling',
    roleForB: 'sibling',
    lineageRelation: 'none',
    status: 'active',
    trust: 70,
    affection: 70,
    respect: 65,
    romance: 0,
    compatibility: 70,
    yearsTogether: 0,
    lastInteractedYear: year,
    episodes: appendOpenEpisode([], id, 'sibling', year, 'sibling'),
  });
}

function rememberOlderSiblings(draft: WorldSimulationState, siblingIds: readonly string[]): void {
  for (const siblingId of siblingIds) {
    const sibling = draft.npcRegistry[siblingId];
    if (!sibling || sibling.birthOrder === 'twin' || sibling.birthOrder !== undefined) continue;
    draft.npcRegistry[siblingId] = { ...sibling, birthOrder: 'older' };
  }
}

function linkSiblings(
  draft: WorldSimulationState,
  childId: string,
  parentIds: readonly string[],
  year: number
): void {
  const siblingIds = new Set<string>();
  for (const parentId of parentIds) {
    for (const siblingId of childrenLinkedTo(draft, parentId, ['biological', 'adoptive'])) {
      if (siblingId !== childId) siblingIds.add(siblingId);
    }
  }
  for (const siblingId of siblingIds) createSiblingEdge(draft, childId, siblingId, year);
}

function addStepParent(draft: WorldSimulationState, childId: string, stepParentId: string): void {
  const child = draft.npcRegistry[childId];
  if (!child || child.stepParentIds.includes(stepParentId)) return;
  draft.npcRegistry[childId] = { ...child, stepParentIds: [...child.stepParentIds, stepParentId] };
}

function linkStepFromParent(
  draft: WorldSimulationState,
  parentId: string,
  stepParentId: string,
  sourceEdgeId: string,
  year: number
): void {
  const stepParent = draft.npcRegistry[stepParentId];
  if (!stepParent) return;
  for (const childId of childrenLinkedTo(draft, parentId, ['biological', 'adoptive'])) {
    if (childrenLinkedTo(draft, stepParentId, ['biological', 'adoptive', 'step']).includes(childId)) continue;
    createParentEdge(draft, stepParent, childId, 'step', year, sourceEdgeId);
    addStepParent(draft, childId, stepParentId);
  }
}

function closeStepEdgesFromMarriage(draft: WorldSimulationState, spouseEdgeId: string, year: number): void {
  for (const edge of Object.values(draft.relationshipsById)) {
    if (edge.stepSourceEdgeId !== spouseEdgeId || edge.lineageRelation !== 'step' || edge.status !== 'active') {
      continue;
    }
    putEdge(draft, {
      ...edge,
      status: 'former',
      episodes: closeOpenEpisodes(edge.episodes, year, 'divorce'),
    });
  }
}

function buildChildProfile(params: {
  world: WorldSimulationState;
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  age: number;
  birthYear: number;
  country: string;
  city: string;
  residenceReason: 'birth' | 'adoption';
  looks: number;
  smarts: number;
  personality: NpcProfile['personality'];
  birthOrder?: NpcProfile['birthOrder'];
  isAdopted: boolean;
  biologicalFatherId?: string;
  biologicalMotherId?: string;
  adoptiveParentIds: string[];
}): NpcProfile {
  const finances = createInitialNpcFinances({
    country: params.country,
    age: 0,
    occupation: 'Infant',
  });
  const child: NpcProfile = {
    id: params.id,
    tier: 'social',
    firstName: params.firstName,
    lastName: params.lastName,
    gender: params.gender,
    biologicalGender: params.gender,
    age: params.age,
    birthYear: params.birthYear,
    isAlive: true,
    location: {
      country: params.country,
      city: params.city,
      residenceHistory: [
        {
          country: params.country,
          city: params.city,
          startYear: params.birthYear,
          reason: params.residenceReason,
        },
      ],
    },
    identityResolutionStatus: 'canonical',
    looks: params.looks,
    smarts: params.smarts,
    health: 95,
    happiness: 90,
    fertility: 50,
    craziness: 10,
    personality: params.personality,
    lifestyle: {
      diet: 'standard',
      fitnessHabit: 'sedentary',
      substances: { alcohol: 'none', smoking: false },
      interests: [],
      hobbies: [],
    },
    goals: [],
    healthConditions: [],
    education: { currentStage: 'none', schoolName: null, grades: 0, history: [] },
    career: {
      jobId: null,
      title: 'Infant',
      companyName: '',
      occupation: 'Infant',
      salary: 0,
      performance: 0,
      yearsInRole: 0,
      isRetired: false,
      pensionAnnual: 0,
      history: [],
    },
    finances,
    lifeHistory: [],
    adoptiveParentIds: [...params.adoptiveParentIds],
    stepParentIds: [],
    isAdopted: params.isAdopted,
    romanticOrientation: resolveRomanticOrientation(params.world.worldSeed, params.id, params.gender),
    ...(params.birthOrder ? { birthOrder: params.birthOrder } : {}),
    ...(params.biologicalFatherId ? { biologicalFatherId: params.biologicalFatherId } : {}),
    ...(params.biologicalMotherId ? { biologicalMotherId: params.biologicalMotherId } : {}),
    ...(params.age === 0 ? { bornThisYear: true } : {}),
  };
  child.lifeHistory = [
    createDeduplicatedLifeEvent({
      npcId: child.id,
      year: params.birthYear,
      age: 0,
      type: 'birth',
      title: 'Born',
      description: `${child.firstName} was born in ${params.city}.`,
    }),
  ];
  return child;
}

function drawChildTraits(
  prng: SeededPRNG,
  parentA: NpcProfile,
  parentB: NpcProfile
): { gender: 'male' | 'female'; firstName: string; looks: number; smarts: number; personality: NpcProfile['personality'] } {
  const gender: 'male' | 'female' = prng.chance(0.5) ? 'female' : 'male';
  const names = gender === 'female' ? FEMALE_NAMES : MALE_NAMES;
  const firstName = names[prng.nextInt(0, names.length - 1)] ?? 'Baby';
  const looks = clampStat(average(parentA.looks, parentB.looks) + prng.nextInt(-5, 5));
  const smarts = clampStat(average(parentA.smarts, parentB.smarts) + prng.nextInt(-5, 5));
  const personality = blendNpcPersonalities(parentA.personality, parentB.personality, prng);
  return { gender, firstName, looks, smarts, personality };
}

function placeChild(
  draft: WorldSimulationState,
  child: NpcProfile,
  parents: readonly NpcProfile[],
  lineage: 'biological' | 'adoptive',
  year: number
): void {
  draft.npcRegistry[child.id] = child;
  for (const parent of parents) {
    createParentEdge(draft, parent, child.id, lineage, year);
    if (lineage === 'biological') {
      const stored = draft.npcRegistry[child.id];
      if (!stored) continue;
      if (parent.biologicalGender === 'male') stored.biologicalFatherId = parent.id;
      else stored.biologicalMotherId = parent.id;
    }
  }
  linkSiblings(draft, child.id, parents.map((parent) => parent.id), year);
}

function deliverDuePregnancies(draft: WorldSimulationState, year: number): void {
  const due = Object.values(draft.relationshipsById)
    .filter(
      (edge) =>
        edge.isPregnant &&
        edge.conceptionYear !== undefined &&
        edge.pregnantParentId !== undefined &&
        edge.conceptionYear + 1 <= year
    )
    .sort((a, b) => pairKey(a.participantAId, a.participantBId).localeCompare(pairKey(b.participantAId, b.participantBId)));

  for (const edge of due) {
    const motherId = edge.pregnantParentId;
    const mother = motherId ? draft.npcRegistry[motherId] : undefined;
    if (!motherId || !mother?.isAlive) {
      putEdge(draft, clearPregnancy(edge));
      continue;
    }
    const otherId = otherParticipant(edge, motherId);
    const other = draft.npcRegistry[otherId];
    if (!other) {
      putEdge(draft, clearPregnancy(edge));
      continue;
    }
    const conceivedYear = edge.conceptionYear;
    if (conceivedYear === undefined) continue;
    const birthYear = conceivedYear + 1;
    const living = sharedLivingChildren(draft, motherId, otherId).length;
    const roomForTwin = draft.populationConfig.allowMultipleBirths !== false && living + 1 < childCap(draft);
    const prng = createNpcPRNG(
      draft.worldSeed,
      birthYear,
      pairKey(motherId, otherId),
      'family',
      draft.simulationVersion
    );
    const childCount = roomForTwin ? 2 : 1;
    const existingSiblingIds = sharedLivingChildren(draft, motherId, otherId);
    if (existingSiblingIds.length > 0) rememberOlderSiblings(draft, existingSiblingIds);

    const surnameParent = mother.id.localeCompare(other.id) <= 0 ? mother : other;
    const createdIds: string[] = [];
    for (let index = 0; index < childCount; index += 1) {
      const birthIndex = nextBirthIndex(draft, mother.id, other.id, birthYear);
      const id = deterministicUUID('npc-child', ...orderedIds(mother.id, other.id), birthYear, birthIndex);
      if (draft.npcRegistry[id]) continue;
      const traits = drawChildTraits(prng, mother, other);
      const child = buildChildProfile({
        world: draft,
        id,
        firstName: traits.firstName,
        lastName: surnameParent.lastName,
        gender: traits.gender,
        age: Math.max(0, year - birthYear),
        birthYear,
        country: mother.location.country,
        city: mother.location.city,
        residenceReason: 'birth',
        looks: traits.looks,
        smarts: traits.smarts,
        personality: traits.personality,
        ...(childCount === 2 ? { birthOrder: 'twin' as const } : existingSiblingIds.length > 0 ? { birthOrder: 'younger' as const } : {}),
        isAdopted: false,
        biologicalFatherId: mother.biologicalGender === 'male' ? mother.id : other.id,
        biologicalMotherId: mother.biologicalGender === 'female' ? mother.id : other.id,
        adoptiveParentIds: [],
      });
      placeChild(draft, child, [mother, other], 'biological', birthYear);
      createdIds.push(id);
      for (const parent of [mother, other]) {
        recordLifeEvent(
          draft,
          parent.id,
          birthYear,
          'child_born',
          `${child.firstName} was born`,
          `${parent.firstName} became a parent to ${child.firstName}.`,
          child.id
        );
      }
    }

    const spouse = activeSpouse(draft, motherId);
    if (spouse && spouse.spouseId !== otherId) {
      const stepParent = draft.npcRegistry[spouse.spouseId];
      if (stepParent) {
        for (const id of createdIds) {
          createParentEdge(draft, stepParent, id, 'step', year, spouse.edge.id);
          addStepParent(draft, id, stepParent.id);
        }
      }
    }
    const current = draft.relationshipsById[edge.id] ?? edge;
    putEdge(draft, clearPregnancy(current));
  }
}

function clampRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Personality similarity plus shared interests, rounded to an integer from 0 to 100. */
function relationshipCompatibility(a: NpcProfile, b: NpcProfile): number {
  let difference = 0;
  for (const facet of INTERACTION_FACETS) {
    difference += Math.abs(a.personality[facet] - b.personality[facet]);
  }
  const similarity = Math.max(0, 100 - difference / INTERACTION_FACETS.length);
  const shared =
    a.lifestyle.interests.filter((item) => b.lifestyle.interests.includes(item)).length +
    a.lifestyle.hobbies.filter((item) => b.lifestyle.hobbies.includes(item)).length;
  const sharedInterestScore = Math.min(100, shared * 25);
  return clampRange(Math.round(0.7 * similarity + 0.3 * sharedInterestScore), 0, 100);
}

/**
 * Chance of a disagreement. Falls as compatibility rises and rises with neuroticism.
 * Valid inputs stay between 0.08 and 0.42.
 */
export function disagreementProbability(compatibility: number, averageNeuroticism: number): number {
  const compatibilityInput = clampRange(compatibility, 0, 100);
  const neuroticismInput = clampRange(averageNeuroticism, 0, 100);
  return clampRange(
    0.08 + (0.2 * (100 - compatibilityInput)) / 100 + (0.14 * neuroticismInput) / 100,
    0.08,
    0.42
  );
}

/**
 * Chance of a positive year after disagreement has already failed.
 * Rises with compatibility and stays between 0.30 and 0.75.
 */
export function positiveInteractionProbability(compatibility: number): number {
  return clampRange(0.3 + (0.45 * clampRange(compatibility, 0, 100)) / 100, 0.3, 0.75);
}

function interactRomanceYear(
  draft: WorldSimulationState,
  left: NpcProfile,
  right: NpcProfile,
  edge: RelationshipEdge,
  year: number
): { trust: number; affection: number; romance: number } {
  const compatibility = relationshipCompatibility(left, right);
  const averageNeuroticism = (left.personality.neuroticism + right.personality.neuroticism) / 2;
  const prng = createNpcPRNG(draft.worldSeed, year, pairKey(left.id, right.id), 'romance', draft.simulationVersion);
  let trust = edge.trust;
  let affection = edge.affection;
  let romance = edge.romance;
  if (prng.chance(disagreementProbability(compatibility, averageNeuroticism))) {
    trust -= prng.nextInt(2, 5);
    romance -= prng.nextInt(1, 3);
    affection -= 1;
  } else if (prng.chance(positiveInteractionProbability(compatibility))) {
    romance += compatibility >= 70 ? prng.nextInt(3, 6) : prng.nextInt(2, 4);
    const bondGain = compatibility >= 80 ? 2 : 1;
    trust += bondGain;
    affection += bondGain;
  }
  if (!samePlace(left, right)) romance -= 1;
  return {
    trust: clampStat(trust),
    affection: clampStat(affection),
    romance: clampStat(romance),
  };
}

function shouldBreakUp(trust: number, romance: number, loyalty: number): boolean {
  const line = loyalty >= LOYALTY_STABILITY ? LOYAL_BREAKUP_METER : BREAKUP_METER;
  return trust < line || romance < line;
}

function shouldDivorce(trust: number, romance: number, loyalty: number): boolean {
  const line = loyalty >= LOYALTY_STABILITY ? LOYAL_DIVORCE_METER : DIVORCE_METER;
  return trust < line && romance < line;
}

function progressExistingRomances(draft: WorldSimulationState, year: number): void {
  const edgeIds = Object.values(draft.relationshipsById)
    .filter((edge) => edge.status === 'active' && ROMANTIC_CATEGORIES.has(edge.category))
    .sort((a, b) => pairKey(a.participantAId, a.participantBId).localeCompare(pairKey(b.participantAId, b.participantBId)))
    .map((edge) => edge.id);

  for (const edgeId of edgeIds) {
    const edge = draft.relationshipsById[edgeId];
    if (!edge || edge.status !== 'active' || !ROMANTIC_CATEGORIES.has(edge.category)) continue;
    const left = draft.npcRegistry[edge.participantAId];
    const right = draft.npcRegistry[edge.participantBId];
    if (!left || !right || !eligibleHousehold(left, right)) continue;
    const meters = interactRomanceYear(draft, left, right, edge, year);
    const completedYears = edge.yearsTogether + 1;
    const loyalty = average(left.personality.loyalty, right.personality.loyalty);
    let nextCategory: RelationshipCategory | null = null;
    let endReason: EpisodeEndReason | null = null;
    let status: RelationshipEdge['status'] = 'active';

    if (edge.category === 'spouse' && shouldDivorce(meters.trust, meters.romance, loyalty)) {
      nextCategory = 'former_spouse';
      endReason = 'divorce';
      status = 'former';
    } else if (edge.category !== 'spouse' && shouldBreakUp(meters.trust, meters.romance, loyalty)) {
      nextCategory = 'ex';
      endReason = 'breakup';
      status = 'former';
    } else if (
      edge.category === 'dating' &&
      completedYears >= datingYearRequirement(draft) &&
      meters.trust >= ENGAGEMENT_METER &&
      meters.affection >= ENGAGEMENT_METER &&
      meters.romance >= ENGAGEMENT_METER
    ) {
      nextCategory = 'fiance';
      endReason = 'engaged';
    } else if (
      edge.category === 'fiance' &&
      completedYears >= engagementYearRequirement(draft) &&
      meters.trust >= MARRIAGE_METER &&
      meters.affection >= MARRIAGE_METER &&
      meters.romance >= MARRIAGE_METER
    ) {
      nextCategory = 'spouse';
      endReason = 'marriage';
    }

    if (!nextCategory || !endReason) {
      putEdge(draft, {
        ...edge,
        trust: meters.trust,
        affection: meters.affection,
        romance: meters.romance,
        yearsTogether: completedYears,
        lastInteractedYear: year,
      });
      continue;
    }

    const transitioned: RelationshipEdge = {
      ...edge,
      category: nextCategory,
      roleForA: nextCategory as ParticipantRoleLabel,
      roleForB: nextCategory as ParticipantRoleLabel,
      status,
      trust: meters.trust,
      affection: meters.affection,
      romance: status === 'former' ? 0 : meters.romance,
      yearsTogether: 0,
      lastInteractedYear: year,
      episodes: appendOpenEpisode(closeOpenEpisodes(edge.episodes, year, endReason), edge.id, nextCategory, year, endReason),
      ...(nextCategory === 'spouse'
        ? {
            hasPrenup:
              average(left.personality.generosity, right.personality.generosity) < 40 ||
              average(left.personality.neuroticism, right.personality.neuroticism) > 70,
          }
        : {}),
    };
    putEdge(draft, transitioned);
    if (nextCategory === 'fiance') {
      recordForBoth(
        draft,
        transitioned,
        year,
        'engagement',
        (npc, other) => `${npc.firstName} got engaged to ${other.firstName}`,
        (npc, other) => `${npc.firstName} and ${other.firstName} became engaged.`
      );
    } else if (nextCategory === 'spouse') {
      recordForBoth(
        draft,
        transitioned,
        year,
        'wedding',
        (npc, other) => `${npc.firstName} married ${other.firstName}`,
        (npc, other) => `${npc.firstName} and ${other.firstName} married.`
      );
      linkStepFromParent(draft, left.id, right.id, transitioned.id, year);
      linkStepFromParent(draft, right.id, left.id, transitioned.id, year);
    } else if (nextCategory === 'ex') {
      recordForBoth(
        draft,
        transitioned,
        year,
        'breakup',
        (npc, other) => `${npc.firstName} broke up with ${other.firstName}`,
        (npc, other) => `${npc.firstName} and ${other.firstName} ended their romance.`
      );
    } else if (nextCategory === 'former_spouse') {
      closeStepEdgesFromMarriage(draft, transitioned.id, year);
      recordForBoth(
        draft,
        transitioned,
        year,
        'divorce',
        (npc, other) => `${npc.firstName} divorced ${other.firstName}`,
        (npc, other) => `${npc.firstName} and ${other.firstName} divorced.`
      );
    }
  }
}

function attractionUtility(
  draft: WorldSimulationState,
  a: NpcProfile,
  b: NpcProfile,
  edge: RelationshipEdge,
  year: number
): { utility: number; probability: number; chosen: boolean } {
  const facets = ['sociability', 'empathy', 'agreeableness', 'extraversion', 'openness', 'neuroticism'] as const;
  let difference = 0;
  for (const facet of facets) difference += Math.abs(a.personality[facet] - b.personality[facet]);
  const similarity = Math.max(0, 100 - difference / facets.length);
  const shared =
    a.lifestyle.interests.filter((item) => b.lifestyle.interests.includes(item)).length +
    a.lifestyle.hobbies.filter((item) => b.lifestyle.hobbies.includes(item)).length;
  const prng = createNpcPRNG(draft.worldSeed, year, pairKey(a.id, b.id), 'romance', draft.simulationVersion);
  return evaluateProbabilisticDecision({
    factors: [
      { weight: 0.25, score: similarity },
      { weight: 0.15, score: average(a.looks, b.looks) },
      { weight: 0.15, score: Math.max(0, 100 - Math.abs(a.age - b.age) * 5) },
      { weight: 0.15, score: Math.min(100, shared * 25) },
      { weight: 0.3, score: (edge.trust + edge.affection + edge.respect) / 3 },
    ],
    threshold: 45,
    steepness: 0.16,
    noiseRange: 2,
    prng,
  });
}

function matchNewRomances(draft: WorldSimulationState, year: number, playerId: string, reserved: ReadonlySet<string>): void {
  const minimumAge = romanceAge(draft);
  const ids = Object.keys(draft.npcRegistry)
    .filter((id) => id !== playerId)
    .sort((a, b) => a.localeCompare(b));
  const scored: ScoredPair[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    const aId = ids[index];
    const a = aId ? draft.npcRegistry[aId] : undefined;
    if (!aId || !a || !canStartRomance(a, minimumAge) || reserved.has(aId)) continue;
    for (let inner = index + 1; inner < ids.length; inner += 1) {
      const bId = ids[inner];
      const b = bId ? draft.npcRegistry[bId] : undefined;
      if (!bId || !b || !canStartRomance(b, minimumAge) || reserved.has(bId)) continue;
      if (!samePlace(a, b) || Math.abs(a.age - b.age) > MAX_DATING_AGE_GAP) continue;
      if (hasPlayerRomance(draft, aId, playerId) || hasPlayerRomance(draft, bId, playerId)) continue;
      if (!mutuallyAccept(draft, a, b) || shareBiologicalParent(a, b)) continue;
      const edge = edgeBetween(draft.relationshipsById, aId, bId);
      if (!edge || edge.status !== 'active') continue;
      if (edge.category !== 'friend' && edge.category !== 'best_friend') continue;
      if (BLOCKED_PAIR_CATEGORIES.has(edge.category)) continue;
      const decision = attractionUtility(draft, a, b, edge, year);
      scored.push({
        id: pairKey(aId, bId),
        key: pairKey(aId, bId),
        aId,
        bId,
        edgeId: edge.id,
        score: decision.utility,
        chosen: acceptProbabilisticDecision(decision),
      });
    }
  }

  const gained = new Set<string>();
  const accepted = sortDeterministicallyByScoreAndId(scored.filter((pair) => pair.chosen)).filter((pair) => {
    if (reserved.has(pair.aId) || reserved.has(pair.bId) || gained.has(pair.aId) || gained.has(pair.bId)) return false;
    gained.add(pair.aId);
    gained.add(pair.bId);
    return true;
  });
  accepted.sort((a, b) => a.key.localeCompare(b.key));

  for (const pair of accepted) {
    const edge = draft.relationshipsById[pair.edgeId];
    if (!edge || edge.status !== 'active') continue;
    const romance = clampStat(40 + Math.round(edge.compatibility / 10));
    const dating: RelationshipEdge = {
      ...edge,
      category: 'dating',
      roleForA: 'dating',
      roleForB: 'dating',
      status: 'active',
      romance: Math.max(35, Math.min(60, romance)),
      yearsTogether: 0,
      lastInteractedYear: year,
      episodes: appendOpenEpisode(closeOpenEpisodes(edge.episodes, year, 'coupled'), edge.id, 'dating', year, 'coupled'),
    };
    putEdge(draft, dating);
    recordForBoth(
      draft,
      dating,
      year,
      'relationship_started',
      (npc, other) => `${npc.firstName} started dating ${other.firstName}`,
      (npc, other) => `${npc.firstName} and ${other.firstName} began dating in ${npc.location.city}.`
    );
  }
}

function conceive(
  draft: WorldSimulationState,
  year: number,
  spousePairsAtStart: ReadonlySet<string>,
  playerId: string
): void {
  const minimumAge = reproductionAge(draft);
  const fertilityLimit = fertilityAgeLimit(draft);
  const cap = childCap(draft);
  const edges = Object.values(draft.relationshipsById)
    .filter((edge) => edge.status === 'active' && edge.category === 'spouse')
    .sort((a, b) => pairKey(a.participantAId, a.participantBId).localeCompare(pairKey(b.participantAId, b.participantBId)));

  for (const edge of edges) {
    const key = pairKey(edge.participantAId, edge.participantBId);
    if (!spousePairsAtStart.has(key)) continue;
    const left = draft.npcRegistry[edge.participantAId];
    const right = draft.npcRegistry[edge.participantBId];
    if (!left || !right || !eligibleHousehold(left, right)) continue;
    if (hasPlayerRomance(draft, left.id, playerId) || hasPlayerRomance(draft, right.id, playerId)) continue;
    if (left.biologicalGender === right.biologicalGender) continue;
    if (left.age < minimumAge || right.age < minimumAge) continue;
    const mother = left.biologicalGender === 'female' ? left : right;
    if (mother.age > fertilityLimit) continue;
    if (isCarrying(draft, left.id) || isCarrying(draft, right.id)) continue;
    if (sharedLivingChildren(draft, left.id, right.id).length >= cap) continue;
    const ageScore = mother.age <= 35 ? 90 : mother.age <= 40 ? 60 : 30;
    const prng = createNpcPRNG(draft.worldSeed, year, key, 'family', draft.simulationVersion);
    const decision = evaluateProbabilisticDecision({
      factors: [
        { weight: 0.4, score: mother.fertility },
        { weight: 0.3, score: (edge.trust + edge.affection + edge.romance) / 3 },
        { weight: 0.3, score: ageScore },
      ],
      threshold: 40,
      steepness: 0.2,
      noiseRange: 1,
      prng,
    });
    if (!acceptProbabilisticDecision(decision)) continue;
    putEdge(draft, {
      ...edge,
      isPregnant: true,
      conceptionYear: year,
      pregnantParentId: mother.id,
    });
  }
}

function nextBirthIndex(
  world: WorldSimulationState,
  parentA: string,
  parentB: string,
  birthYear: number
): number {
  const [first, second] = orderedIds(parentA, parentB);
  let index = 0;
  while (world.npcRegistry[deterministicUUID('npc-child', first, second, birthYear, index)]) index += 1;
  return index;
}

function hasPlayerRomance(world: WorldSimulationState, npcId: string, playerId: string): boolean {
  return Object.values(world.relationshipsById).some(
    (edge) =>
      edge.status === 'active' &&
      ROMANTIC_CATEGORIES.has(edge.category) &&
      involves(edge, npcId) &&
      involves(edge, playerId)
  );
}

function cashInUsd(npc: NpcProfile): number {
  return convertCurrency(npc.finances.cash, npc.finances.currency, 'USD').convertedAmount;
}

function adopt(draft: WorldSimulationState, year: number, playerId: string): void {
  const cap = childCap(draft);
  const edges = Object.values(draft.relationshipsById)
    .filter((edge) => edge.status === 'active' && edge.category === 'spouse')
    .sort((a, b) => pairKey(a.participantAId, a.participantBId).localeCompare(pairKey(b.participantAId, b.participantBId)));

  for (const edge of edges) {
    const left = draft.npcRegistry[edge.participantAId];
    const right = draft.npcRegistry[edge.participantBId];
    if (!left || !right || !eligibleHousehold(left, right)) continue;
    if (hasPlayerRomance(draft, left.id, playerId) || hasPlayerRomance(draft, right.id, playerId)) continue;
    if (left.age < ADOPTION_MIN_AGE || right.age < ADOPTION_MIN_AGE) continue;
    if (isCarrying(draft, left.id) || isCarrying(draft, right.id)) continue;
    if (sharedLivingChildren(draft, left.id, right.id).length >= cap) continue;
    const payer = cashInUsd(left) === cashInUsd(right)
      ? left.id.localeCompare(right.id) <= 0 ? left : right
      : cashInUsd(left) > cashInUsd(right) ? left : right;
    const conversion = convertCurrency(ADOPTION_FEE_USD, 'USD', payer.finances.currency);
    if (payer.finances.cash < conversion.convertedAmount) continue;

    const prng = createNpcPRNG(
      draft.worldSeed,
      year,
      `${pairKey(left.id, right.id)}|adoption`,
      'family',
      draft.simulationVersion
    );
    const traits = drawChildTraits(prng, left, right);
    const id = deterministicUUID('npc-child', ...orderedIds(left.id, right.id), year, nextBirthIndex(draft, left.id, right.id, year));
    if (draft.npcRegistry[id]) continue;
    const surnameParent = left.id.localeCompare(right.id) <= 0 ? left : right;
    const existingSiblingIds = [
      ...new Set([
        ...childrenLinkedTo(draft, left.id, ['biological', 'adoptive']),
        ...childrenLinkedTo(draft, right.id, ['biological', 'adoptive']),
      ]),
    ];
    if (existingSiblingIds.length > 0) rememberOlderSiblings(draft, existingSiblingIds);
    const child = buildChildProfile({
      world: draft,
      id,
      firstName: traits.firstName,
      lastName: surnameParent.lastName,
      gender: traits.gender,
      age: 0,
      birthYear: year,
      country: payer.location.country,
      city: payer.location.city,
      residenceReason: 'adoption',
      looks: traits.looks,
      smarts: traits.smarts,
      personality: traits.personality,
      ...(existingSiblingIds.length > 0 ? { birthOrder: 'younger' as const } : {}),
      isAdopted: true,
      adoptiveParentIds: orderedIds(left.id, right.id),
    });
    placeChild(draft, child, [left, right], 'adoptive', year);
    const payerRecord = draft.npcRegistry[payer.id];
    if (payerRecord) {
      const finances = { ...payerRecord.finances, cash: payerRecord.finances.cash - conversion.convertedAmount };
      finances.netWorth = calculateCanonicalNetWorth(finances);
      draft.npcRegistry[payer.id] = { ...payerRecord, finances };
    }
    const metadata = {
      convertedAmount: conversion.convertedAmount,
      currency: payer.finances.currency,
      exchangeRateApplied: conversion.exchangeRateApplied,
    };
    for (const parent of [left, right]) {
      recordLifeEvent(
        draft,
        parent.id,
        year,
        'child_adopted',
        `${child.firstName} was adopted`,
        `${parent.firstName} adopted ${child.firstName}.`,
        child.id,
        metadata
      );
    }
  }
}

function finalizeRomanceWorld(world: WorldSimulationState, year: number): WorldSimulationState {
  world.npcRegistry = sortRecord(world.npcRegistry);
  world.relationshipsById = sortRecord(world.relationshipsById);
  world.relationshipIndex = rebuildRelationshipIndex(world.relationshipsById);
  world.lastRomanceSimYear = year;
  return world;
}

/**
 * Advances NPC romance and family formation for one year.
 * Due births resolve first. Existing romances progress before any new match.
 * Repeating the same year, or passing an earlier year, returns the same world.
 */
export function progressNpcRomanceYear(
  world: WorldSimulationState,
  year: number,
  playerId: string
): WorldSimulationState {
  if (world.lastRomanceSimYear !== undefined && year <= world.lastRomanceSimYear) return world;
  const draft = structuredClone(world);
  const reserved = reservedPartners(draft);
  const spousePairsAtStart = new Set(
    Object.values(draft.relationshipsById)
      .filter((edge) => edge.status === 'active' && edge.category === 'spouse')
      .map((edge) => pairKey(edge.participantAId, edge.participantBId))
  );
  deliverDuePregnancies(draft, year);
  progressExistingRomances(draft, year);
  matchNewRomances(draft, year, playerId, reserved);
  conceive(draft, year, spousePairsAtStart, playerId);
  adopt(draft, year, playerId);
  return finalizeRomanceWorld(reconcilePopulationTiers(draft, playerId), year);
}

/**
 * Applies romantic category changes after a death.
 * Spouse becomes deceased_spouse. Dating and engagement become ex with status deceased.
 * Former romances and parentage edges stay as they are.
 */
export function reconcileRomanticEdgesAfterDeath(
  world: WorldSimulationState,
  npcId: string,
  year: number
): WorldSimulationState {
  if (!world.npcRegistry[npcId]) return world;
  const draft = structuredClone(world);
  let changed = false;
  const edgeIds = Object.keys(draft.relationshipsById).sort((a, b) => a.localeCompare(b));
  for (const edgeId of edgeIds) {
    const edge = draft.relationshipsById[edgeId];
    if (!edge || !involves(edge, npcId) || edge.status === 'former') continue;
    if (edge.category !== 'spouse' && edge.category !== 'dating' && edge.category !== 'fiance') continue;
    const category: RelationshipCategory = edge.category === 'spouse' ? 'deceased_spouse' : 'ex';
    const hasOpen = edge.episodes.some((episode) => episode.endYear === undefined);
    const role = category as ParticipantRoleLabel;
    draft.relationshipsById[edgeId] = {
      ...edge,
      category,
      roleForA: role,
      roleForB: role,
      status: 'deceased',
      episodes: hasOpen ? closeOpenEpisodes(edge.episodes, year, 'death') : edge.episodes.map((episode) => ({ ...episode })),
    };
    changed = true;
  }
  if (!changed) return world;
  draft.relationshipIndex = rebuildRelationshipIndex(draft.relationshipsById);
  return draft;
}
