import type {
  LifeUpdateEvent,
  NpcLifeEvent,
  NpcLifeEventType,
  NpcMemory,
  NpcProfile,
  WorldSimulationState,
} from '../types';
import { createNpcPRNG, deterministicUUID, type SeededPRNG } from './seededPrngService';

type MemoryCategory = NpcMemory['category'];
type FeedCategory = LifeUpdateEvent['category'];
type FeedPriority = LifeUpdateEvent['priority'];

interface MemoryMapping {
  category: MemoryCategory;
  importance: number;
  impact: number;
}

interface FeedMapping {
  category: FeedCategory;
  priority: FeedPriority;
}

/**
 * Reads life events after education, career, social autonomy, romance and family,
 * and mortality and estate settlement. A later integration milestone must keep
 * this pass last: lastMemorySimYear makes the same year a no-op.
 */
const MEMORY_MAPPINGS: Record<NpcLifeEventType, MemoryMapping> = {
  child_born: { category: 'family', importance: 95, impact: 70 },
  child_adopted: { category: 'family', importance: 95, impact: 70 },
  birth: { category: 'family', importance: 90, impact: 40 },
  death: { category: 'family', importance: 100, impact: -80 },
  wedding: { category: 'romance', importance: 90, impact: 60 },
  divorce: { category: 'romance', importance: 85, impact: -70 },
  breakup: { category: 'romance', importance: 75, impact: -50 },
  engagement: { category: 'romance', importance: 70, impact: 40 },
  relationship_started: { category: 'romance', importance: 60, impact: 30 },
  inheritance_received: { category: 'financial', importance: 80, impact: 40 },
  major_purchase: { category: 'financial', importance: 35, impact: 15 },
  graduation: { category: 'milestone', importance: 85, impact: 50 },
  diagnosed: { category: 'milestone', importance: 70, impact: -30 },
  relocated: { category: 'milestone', importance: 60, impact: 10 },
  recovered: { category: 'milestone', importance: 60, impact: 25 },
  education_enrollment: { category: 'milestone', importance: 50, impact: 20 },
  promoted: { category: 'career', importance: 80, impact: 50 },
  retired: { category: 'career', importance: 80, impact: 20 },
  terminated: { category: 'career', importance: 75, impact: -40 },
  hired: { category: 'career', importance: 70, impact: 40 },
  resigned: { category: 'career', importance: 55, impact: -10 },
  reconciliation: { category: 'friendship', importance: 65, impact: 30 },
  friendship_drifted: { category: 'friendship', importance: 35, impact: -20 },
};

const FEED_MAPPINGS: Partial<Record<NpcLifeEventType, FeedMapping>> = {
  death: { category: 'death', priority: 'critical' },
  child_born: { category: 'birth', priority: 'critical' },
  child_adopted: { category: 'birth', priority: 'critical' },
  wedding: { category: 'marriage', priority: 'high' },
  divorce: { category: 'divorce', priority: 'high' },
  graduation: { category: 'graduation', priority: 'high' },
  promoted: { category: 'promotion', priority: 'high' },
  inheritance_received: { category: 'inheritance', priority: 'high' },
  terminated: { category: 'job_change', priority: 'high' },
  hired: { category: 'job_change', priority: 'normal' },
  resigned: { category: 'job_change', priority: 'normal' },
  retired: { category: 'retirement', priority: 'normal' },
  relocated: { category: 'relocation', priority: 'normal' },
};

const SHARED_FEED_TYPES = new Set<NpcLifeEventType>([
  'wedding',
  'divorce',
  'child_born',
  'child_adopted',
  'inheritance_received',
]);

export function progressNpcMemoryYear(
  world: WorldSimulationState,
  year: number,
  playerId: string
): WorldSimulationState {
  if (Number.isFinite(world.lastMemorySimYear) && year <= (world.lastMemorySimYear as number)) {
    return world;
  }

  const draft = structuredClone(world);
  const npcIds = Object.keys(draft.npcRegistry).sort((left, right) => left.localeCompare(right));
  for (const npcId of npcIds) {
    recordNpcMemories(draft, npcId, year, playerId);
  }
  decayMemories(draft, year);
  appendFeed(draft, year, playerId);
  draft.lastMemorySimYear = year;
  return draft;
}

export function markLifeUpdatesRead(world: WorldSimulationState, ids: readonly string[]): WorldSimulationState {
  const wanted = new Set(ids);
  let changed = false;
  const lifeUpdatesFeed = world.lifeUpdatesFeed.map((event) => {
    if (!wanted.has(event.id) || event.isRead) return event;
    changed = true;
    return { ...event, isRead: true };
  });
  if (!changed) return world;
  return { ...world, lifeUpdatesFeed };
}

function recordNpcMemories(draft: WorldSimulationState, npcId: string, year: number, playerId: string): void {
  const npc = draft.npcRegistry[npcId];
  if (!npc) return;
  const events = npc.lifeHistory
    .filter((event) => event.year === year)
    .sort((left, right) => left.dedupeKey.localeCompare(right.dedupeKey));
  let prng: SeededPRNG | undefined;
  const memories = [...(draft.memories[npcId] ?? [])];
  const seen = new Set(memories.map((memory) => memory.dedupeKey));

  for (const event of events) {
    const mapping = memoryMappingFor(event.type);
    if (!mapping) continue;
    const dedupeKey = memoryKey(npcId, mapping.category, year, event.dedupeKey);
    if (seen.has(dedupeKey)) continue;
    prng ??= createNpcPRNG(draft.worldSeed, year, npcId, 'memory', draft.simulationVersion);
    const impact = clampImpact(mapping.impact + prng.nextInt(-5, 5));
    const memory: NpcMemory = {
      id: deterministicUUID('npc-memory', dedupeKey),
      dedupeKey,
      ownerId: npcId,
      category: mapping.category,
      description: event.description,
      year: event.year,
      importance: mapping.importance,
      emotionalImpact: impact,
    };
    const relatedCharacterId = relatedMemoryCharacter(draft, event.referenceId, playerId);
    if (relatedCharacterId) memory.relatedCharacterId = relatedCharacterId;
    memories.push(memory);
    seen.add(dedupeKey);
  }

  if (memories.length > 0) {
    draft.memories[npcId] = memories.sort((left, right) => left.dedupeKey.localeCompare(right.dedupeKey));
  }
}

function memoryMappingFor(type: string): MemoryMapping | undefined {
  if (!Object.prototype.hasOwnProperty.call(MEMORY_MAPPINGS, type)) return undefined;
  return MEMORY_MAPPINGS[type as NpcLifeEventType];
}

function memoryKey(ownerId: string, category: MemoryCategory, year: number, eventKey: string): string {
  return `${ownerId}:${category}:${year}:${eventKey}`;
}

function relatedMemoryCharacter(
  world: WorldSimulationState,
  referenceId: string | undefined,
  playerId: string
): string | undefined {
  if (!referenceId) return undefined;
  if (referenceId === playerId || world.npcRegistry[referenceId]) return referenceId;
  return undefined;
}

function clampImpact(value: number): number {
  return Math.min(100, Math.max(-100, value));
}

function decayMemories(draft: WorldSimulationState, year: number): void {
  for (const npcId of Object.keys(draft.memories)) {
    const kept = (draft.memories[npcId] ?? []).filter(
      (memory) => memory.importance >= 40 || year - memory.year <= 4
    );
    if (kept.length === 0) {
      delete draft.memories[npcId];
      continue;
    }
    draft.memories[npcId] = kept;
  }
}

interface FeedSource {
  event: NpcLifeEvent;
  npc: NpcProfile;
}

function appendFeed(draft: WorldSimulationState, year: number, playerId: string): void {
  const sources = currentYearSources(draft, year);
  const rows: LifeUpdateEvent[] = [];
  for (const source of sources) {
    if (source.event.type !== 'death') continue;
    const row = deathFeedRow(draft, source, year, playerId);
    if (row) rows.push(row);
  }

  const groups = new Map<string, FeedSource[]>();
  for (const source of sources) {
    if (source.event.type === 'death' || !FEED_MAPPINGS[source.event.type]) continue;
    const key = feedKeyFor(source.event);
    const group = groups.get(key) ?? [];
    group.push(source);
    groups.set(key, group);
  }
  for (const [key, group] of groups) {
    const row = groupedFeedRow(draft, key, group);
    if (row) rows.push(row);
  }

  const existing = new Set(draft.lifeUpdatesFeed.map((event) => event.dedupeKey));
  const fresh = rows
    .filter((row) => !existing.has(row.dedupeKey))
    .sort((left, right) => compareFeedRows(left, right));
  draft.lifeUpdatesFeed = [...draft.lifeUpdatesFeed, ...fresh];
}

function currentYearSources(world: WorldSimulationState, year: number): FeedSource[] {
  const sources: FeedSource[] = [];
  const npcIds = Object.keys(world.npcRegistry).sort((left, right) => left.localeCompare(right));
  for (const npcId of npcIds) {
    const npc = world.npcRegistry[npcId];
    if (!npc) continue;
    const events = npc.lifeHistory
      .filter((event) => event.year === year)
      .sort((left, right) => left.dedupeKey.localeCompare(right.dedupeKey));
    for (const event of events) sources.push({ event, npc });
  }
  return sources;
}

function feedKeyFor(event: NpcLifeEvent): string {
  if (event.referenceId && SHARED_FEED_TYPES.has(event.type)) {
    return `${event.type}:${event.year}:${event.referenceId}`;
  }
  return event.dedupeKey;
}

function deathFeedRow(
  world: WorldSimulationState,
  source: FeedSource,
  year: number,
  playerId: string
): LifeUpdateEvent | undefined {
  const { event, npc } = source;
  if (npc.isAlive || npc.deathYear !== year || !hasQualifyingDeathEdge(world, npc.id, playerId)) return undefined;
  const mapping = FEED_MAPPINGS.death;
  if (!mapping) return undefined;
  return feedRow(event, npc.id, event.dedupeKey, mapping, undefined);
}

function hasQualifyingDeathEdge(world: WorldSimulationState, deceasedId: string, playerId: string): boolean {
  for (const edge of Object.values(world.relationshipsById)) {
    if (edge.participantAId !== deceasedId && edge.participantBId !== deceasedId) continue;
    const otherId = edge.participantAId === deceasedId ? edge.participantBId : edge.participantAId;
    if (otherId === playerId) return true;
    const other = world.npcRegistry[otherId];
    if (other?.isAlive && (other.tier === 'core' || other.tier === 'social')) return true;
  }
  return false;
}

function groupedFeedRow(world: WorldSimulationState, key: string, group: FeedSource[]): LifeUpdateEvent | undefined {
  const qualifying = group
    .filter((source) => source.npc.tier === 'core' || source.npc.tier === 'social')
    .sort((left, right) => left.npc.id.localeCompare(right.npc.id));
  const representative = qualifying[0];
  if (!representative) return undefined;
  const mapping = FEED_MAPPINGS[representative.event.type];
  if (!mapping) return undefined;
  return feedRow(
    representative.event,
    representative.npc.id,
    key,
    mapping,
    relatedFeedNpc(world, representative.event, representative.npc.id, group)
  );
}

function relatedFeedNpc(
  world: WorldSimulationState,
  event: NpcLifeEvent,
  representativeId: string,
  group: FeedSource[]
): string | undefined {
  if ((event.type === 'child_born' || event.type === 'child_adopted') && event.referenceId) {
    return event.referenceId;
  }
  if (event.type !== 'wedding' && event.type !== 'divorce') return undefined;
  const edge = event.referenceId ? world.relationshipsById[event.referenceId] : undefined;
  if (edge) return edge.participantAId === representativeId ? edge.participantBId : edge.participantAId;
  return group.find((source) => source.npc.id !== representativeId)?.npc.id;
}

function feedRow(
  event: NpcLifeEvent,
  npcId: string,
  dedupeKey: string,
  mapping: FeedMapping,
  relatedNpcId: string | undefined
): LifeUpdateEvent {
  const row: LifeUpdateEvent = {
    id: deterministicUUID('life-update', dedupeKey),
    dedupeKey,
    npcId,
    year: event.year,
    category: mapping.category,
    priority: mapping.priority,
    title: event.title,
    message: event.description,
    isRead: false,
  };
  if (relatedNpcId) row.relatedNpcId = relatedNpcId;
  return row;
}

function compareFeedRows(left: LifeUpdateEvent, right: LifeUpdateEvent): number {
  const priority = priorityRank(left.priority) - priorityRank(right.priority);
  if (priority !== 0) return priority;
  const npc = left.npcId.localeCompare(right.npcId);
  if (npc !== 0) return npc;
  return left.dedupeKey.localeCompare(right.dedupeKey);
}

function priorityRank(priority: FeedPriority): number {
  if (priority === 'critical') return 0;
  if (priority === 'high') return 1;
  if (priority === 'normal') return 2;
  return 3;
}
