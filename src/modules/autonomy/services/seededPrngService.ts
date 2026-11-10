import type { NpcPrngDomain } from '../types';

/**
 * 32-bit FNV-1a hash with Murmur3 avalanche finalizer.
 */
export function hashString32(input: string, initialSeed = 0x811c9dc5): number {
  let h = initialSeed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Murmur3 32-bit avalanche mixer
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Combines arbitrary string and numeric seed components into a deterministic 32-bit unsigned seed.
 */
export function hashSeed(...parts: Array<string | number>): number {
  const canonical = parts.map((p) => String(p)).join('|');
  const h = hashString32(canonical);
  // Ensure non-zero seed state
  return h === 0 ? 0x6d2b79f5 : h;
}

/**
 * Generates a deterministic 128-bit UUID-formatted identifier from structured components.
 * Uses four distinct domain-separated 32-bit hash lanes to avoid 32-bit birthday collisions.
 */
export function deterministicUUID(namespace: string, ...parts: Array<string | number>): string {
  const payload = `${namespace}::${parts.map((p) => String(p)).join('::')}`;
  const lane0 = hashString32(payload, 0x811c9dc5).toString(16).padStart(8, '0');
  const lane1 = hashString32(payload, 0x9e3779b9).toString(16).padStart(8, '0');
  const lane2 = hashString32(payload, 0x85ebca6b).toString(16).padStart(8, '0');
  const lane3 = hashString32(payload, 0xc2b2ae35).toString(16).padStart(8, '0');

  return `${lane0}-${lane1.slice(0, 4)}-5${lane1.slice(5, 8)}-a${lane2.slice(1, 4)}-${lane2.slice(4, 8)}${lane3}`;
}

/**
 * Clamps a numeric probability strictly into [0, 1].
 */
export function clampProbability(probability: number): number {
  if (!Number.isFinite(probability) || probability <= 0) return 0;
  if (probability >= 1) return 1;
  return probability;
}

/**
 * Mulberry32 deterministic pseudo-random number generator.
 */
export class SeededPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = (seed >>> 0) || 0x6d2b79f5;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    let z = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  /** Alias for next(): returns a float in [0, 1). */
  nextFloat(): number {
    return this.next();
  }

  /** Returns an integer in [min, max] inclusive. Safely handles reversed bounds. */
  nextInt(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    if (lo >= hi) return lo;
    return Math.floor(this.next() * (hi - lo + 1)) + lo;
  }

  /** Returns true with the given probability (clamped to [0, 1]). */
  chance(probability: number): boolean {
    const clamped = clampProbability(probability);
    if (clamped <= 0) return false;
    if (clamped >= 1) return true;
    return this.next() < clamped;
  }

  /** Picks a random element from a list, or returns undefined if the list is empty. */
  pick<T>(items: readonly T[]): T | undefined {
    if (!items || items.length === 0) return undefined;
    return items[Math.floor(this.next() * items.length)];
  }

  /** Picks an element weighted by item.weight (defaults to 1). Safely handles empty or zero-weight lists. */
  pickWeighted<T extends { weight?: number }>(items: readonly T[]): T | undefined {
    if (!items || items.length === 0) return undefined;
    const weights = items.map((item) => Math.max(0, Number.isFinite(item.weight) ? (item.weight as number) : 1));
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total <= 0) {
      return this.pick(items);
    }
    let roll = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll < 0) return items[i];
    }
    return items[items.length - 1];
  }
}

/**
 * Creates an isolated, order-independent random stream for a specific NPC, simulation year, and domain.
 * Dynamically incorporates simulationVersion so algorithm upgrades are versioned cleanly.
 */
export function createNpcPRNG(
  worldSeed: number,
  simulationYear: number,
  npcId: string,
  domain: NpcPrngDomain,
  simulationVersion: number
): SeededPRNG {
  const seed = hashSeed(worldSeed, simulationYear, npcId, domain, simulationVersion);
  return new SeededPRNG(seed);
}

/**
 * Deterministically orders competing candidates by descending utility score,
 * breaking ties strictly by lexicographical ID ascending (`a.id.localeCompare(b.id)`).
 */
export function sortDeterministicallyByScoreAndId<T extends { id: string; score?: number }>(
  items: readonly T[],
  getScore: (item: T) => number = (item) => item.score ?? 0
): T[] {
  return [...items].sort((a, b) => {
    const scoreA = getScore(a);
    const scoreB = getScore(b);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return a.id.localeCompare(b.id);
  });
}
