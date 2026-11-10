import type { NpcPersonality, NpcProfile } from '../types';
import {
  generateDeterministicLifestyle,
  generateDeterministicPersonality,
} from './migrationService';
import type { SeededPRNG } from './seededPrngService';

const clampTrait = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export { generateDeterministicPersonality, generateDeterministicLifestyle };

/**
 * Generates an offspring NPC personality by blending two parent personalities
 * with bounded genetic/environmental variance via a deterministic PRNG.
 */
export function blendNpcPersonalities(
  parentA: NpcPersonality,
  parentB: NpcPersonality,
  prng: SeededPRNG,
  archetype?: NpcPersonality['archetype']
): NpcPersonality {
  const blendTrait = (a: number, b: number, variance = 14): number => {
    const midpoint = (a + b) / 2;
    return clampTrait(midpoint + prng.nextInt(-variance, variance));
  };

  let openness = blendTrait(parentA.openness, parentB.openness);
  let conscientiousness = blendTrait(parentA.conscientiousness, parentB.conscientiousness);
  let extraversion = blendTrait(parentA.extraversion, parentB.extraversion);
  let agreeableness = blendTrait(parentA.agreeableness, parentB.agreeableness);
  const neuroticism = blendTrait(parentA.neuroticism, parentB.neuroticism);

  if (archetype === 'studious') {
    conscientiousness = clampTrait(Math.max(conscientiousness, 75) + prng.nextInt(0, 12));
    openness = clampTrait(Math.max(openness, 65) + prng.nextInt(0, 10));
  } else if (archetype === 'class_clown') {
    extraversion = clampTrait(Math.max(extraversion, 75) + prng.nextInt(0, 12));
    conscientiousness = clampTrait(Math.min(conscientiousness, 55) - prng.nextInt(0, 10));
  } else if (archetype === 'popular') {
    extraversion = clampTrait(Math.max(extraversion, 78) + prng.nextInt(0, 12));
    agreeableness = clampTrait(Math.max(agreeableness, 62) + prng.nextInt(0, 10));
  } else if (archetype === 'rebel') {
    openness = clampTrait(Math.max(openness, 68) + prng.nextInt(0, 12));
    agreeableness = clampTrait(Math.min(agreeableness, 45) - prng.nextInt(0, 10));
    conscientiousness = clampTrait(Math.min(conscientiousness, 48) - prng.nextInt(0, 10));
  } else if (archetype === 'quiet') {
    extraversion = clampTrait(Math.min(extraversion, 38) - prng.nextInt(0, 10));
    openness = clampTrait(Math.max(openness, 68) + prng.nextInt(0, 10));
  } else if (archetype === 'athletic') {
    conscientiousness = clampTrait(Math.max(conscientiousness, 62) + prng.nextInt(0, 12));
    extraversion = clampTrait(Math.max(extraversion, 58) + prng.nextInt(0, 10));
  }

  return {
    openness,
    conscientiousness,
    extraversion,
    agreeableness,
    neuroticism,
    ambition: blendTrait(parentA.ambition, parentB.ambition),
    generosity: blendTrait(parentA.generosity, parentB.generosity),
    loyalty: blendTrait(parentA.loyalty, parentB.loyalty),
    riskTolerance:
      archetype === 'rebel'
        ? clampTrait(Math.max(68, blendTrait(parentA.riskTolerance, parentB.riskTolerance)))
        : blendTrait(parentA.riskTolerance, parentB.riskTolerance),
    empathy: blendTrait(parentA.empathy, parentB.empathy),
    sociability: extraversion,
    patience: clampTrait(100 - Math.round(neuroticism * 0.55) + prng.nextInt(-8, 8)),
    materialism: blendTrait(parentA.materialism, parentB.materialism),
    archetype,
  };
}

/**
 * Computes an NPC's composite academic drive (0 - 100) from their intellect,
 * personality traits, archetype, and active educational goals.
 */
export function calculateAcademicDrive(
  npc: Pick<NpcProfile, 'smarts' | 'personality' | 'goals'>
): number {
  const { smarts, personality, goals } = npc;
  const hasActiveEducationGoal = goals.some(
    (g) => !g.isCompleted && !g.isAbandoned && g.category === 'education'
  );

  let raw =
    smarts * 0.35 +
    personality.conscientiousness * 0.30 +
    personality.openness * 0.20 +
    personality.ambition * 0.20 -
    personality.neuroticism * 0.08;

  if (personality.archetype === 'studious') raw += 10;
  if (personality.archetype === 'rebel') raw -= 10;
  if (personality.archetype === 'class_clown') raw -= 6;
  if (hasActiveEducationGoal) raw += 8;

  return clampTrait(raw);
}

/**
 * Computes an NPC's composite career ambition & work ethic score (0 - 100).
 */
export function calculateCareerAmbitionScore(
  npc: Pick<NpcProfile, 'smarts' | 'personality' | 'goals'>
): number {
  const { smarts, personality, goals } = npc;
  const hasCareerOrWealthGoal = goals.some(
    (g) =>
      !g.isCompleted &&
      !g.isAbandoned &&
      (g.category === 'career' || g.category === 'financial')
  );

  let raw =
    personality.ambition * 0.38 +
    personality.conscientiousness * 0.30 +
    smarts * 0.18 +
    personality.materialism * 0.10 +
    personality.extraversion * 0.08 -
    personality.neuroticism * 0.06;

  if (hasCareerOrWealthGoal) raw += 8;

  return clampTrait(raw);
}

/**
 * Computes an NPC's financial prudence & savings discipline score (0 - 100).
 * High conscientiousness and patience increase prudence; high materialism and
 * high riskTolerance increase spending propensity.
 */
export function calculateFinancialPrudenceScore(
  npc: Pick<NpcProfile, 'smarts' | 'personality' | 'goals'>
): number {
  const { smarts, personality, goals } = npc;
  const hasFinancialGoal = goals.some(
    (g) => !g.isCompleted && !g.isAbandoned && g.category === 'financial'
  );

  let raw =
    personality.conscientiousness * 0.42 +
    personality.patience * 0.25 +
    smarts * 0.20 +
    (100 - personality.materialism) * 0.18 +
    (100 - personality.riskTolerance) * 0.10 -
    12;

  if (hasFinancialGoal) raw += 8;

  return clampTrait(raw);
}

/**
 * Applies subtle, bounded personality maturation or life-event shifts without mutating the input.
 */
export function evolveNpcPersonality(
  personality: NpcPersonality,
  trigger: 'graduation' | 'promotion' | 'termination' | 'financial_windfall' | 'retirement'
): NpcPersonality {
  switch (trigger) {
    case 'graduation':
      return {
        ...personality,
        conscientiousness: clampTrait(personality.conscientiousness + 2),
        openness: clampTrait(personality.openness + 1),
      };
    case 'promotion':
      return {
        ...personality,
        ambition: clampTrait(personality.ambition + 2),
        conscientiousness: clampTrait(personality.conscientiousness + 1),
        neuroticism: clampTrait(personality.neuroticism - 1),
      };
    case 'termination':
      return {
        ...personality,
        neuroticism: clampTrait(personality.neuroticism + 3),
        patience: clampTrait(personality.patience - 2),
      };
    case 'financial_windfall':
      return {
        ...personality,
        generosity: clampTrait(personality.generosity + 2),
        neuroticism: clampTrait(personality.neuroticism - 2),
      };
    case 'retirement':
      return {
        ...personality,
        patience: clampTrait(personality.patience + 3),
        ambition: clampTrait(personality.ambition - 4),
        neuroticism: clampTrait(personality.neuroticism - 2),
      };
  }
}
