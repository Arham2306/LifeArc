/** Random integer between min and max (inclusive). */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Returns true with the given probability (0 - 1). */
export function chance(probability: number): boolean {
  return Math.random() < probability;
}

/** Picks a random item from a list. */
export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Picks an item using its `weight` (defaults to 1).
 * Higher weight = more likely to be picked.
 */
export function pickWeighted<T extends { weight?: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  let roll = Math.random() * total;

  for (const item of items) {
    roll -= item.weight ?? 1;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

