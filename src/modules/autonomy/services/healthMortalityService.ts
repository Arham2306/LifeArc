import { chance as unseededChance, randomInt as unseededRandomInt } from '../../../utils/random';
import { clampProbability, type SeededPRNG } from './seededPrngService';

/**
 * Returns the inclusive [min, max] annual natural health delta range for a given age.
 * Matches `getAgeHealthDelta` in `src/modules/aging/services/agingService.ts` (lines 52-57):
 * - age < 45: [-1, 1]
 * - age < 65: [-3, 0]
 * - age < 80: [-6, -1]
 * - age >= 80: [-12, -3]
 */
export function getNaturalHealthDeltaBounds(age: number): [number, number] {
  if (age < 45) return [-1, 1];
  if (age < 65) return [-3, 0];
  if (age < 80) return [-6, -1];
  return [-12, -3];
}

/**
 * Calculates the yearly natural health delta for a character or NPC of a given age.
 * Uses the provided deterministic `prng` stream when supplied, or falls back to standard `randomInt`.
 */
export function calculateAgeHealthDelta(age: number, prng?: SeededPRNG): number {
  const [min, max] = getNaturalHealthDeltaBounds(age);
  return prng ? prng.nextInt(min, max) : unseededRandomInt(min, max);
}

/**
 * Computes the piecewise natural old-age mortality probability for a given age and health score.
 * Matches `rollNaturalOldAgeDeath` in `src/modules/aging/services/agingService.ts` (lines 60-65):
 * - Strictly 0 when `age < elderMortalityAgeCutoff` (default 75).
 * - For `age >= 75`: `Math.min(0.85, (age - 72) * 0.035 + (health < 35 ? (35 - health) * 0.01 : 0))`
 * - Guaranteed to remain within [0, 0.85] (and [0, 1]).
 */
export function calculateNaturalMortalityProbability(
  age: number,
  health: number,
  elderMortalityAgeCutoff = 75
): number {
  if (age < elderMortalityAgeCutoff) {
    return 0;
  }
  const baseProbability = (age - 72) * 0.035;
  const clampedHealth = Math.max(0, Math.min(100, health));
  const lowHealthPenalty = clampedHealth < 35 ? (35 - clampedHealth) * 0.01 : 0;
  return clampProbability(Math.min(0.85, baseProbability + lowHealthPenalty));
}

/**
 * Evaluates whether a character or NPC passes away this year due to critical health depletion (<= 0)
 * or natural old-age mortality (75+).
 */
export function evaluateMortalityHazard(
  age: number,
  health: number,
  prng?: SeededPRNG,
  elderMortalityAgeCutoff = 75
): {
  passedAway: boolean;
  probability: number;
  causeOfDeath?: string;
} {
  if (health <= 0) {
    return {
      passedAway: true,
      probability: 1,
      causeOfDeath: 'Succumbed to poor health',
    };
  }

  const probability = calculateNaturalMortalityProbability(age, health, elderMortalityAgeCutoff);
  if (probability <= 0) {
    return {
      passedAway: false,
      probability: 0,
    };
  }

  const rolledDeath = prng ? prng.chance(probability) : unseededChance(probability);
  if (rolledDeath) {
    return {
      passedAway: true,
      probability,
      causeOfDeath: 'Passed away peacefully in sleep of old age',
    };
  }

  return {
    passedAway: false,
    probability,
  };
}

