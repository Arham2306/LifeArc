import type { FamilyWealth } from '../../../types/game';
import type { NpcProfile } from '../types';
import {
  clampProbability,
  type SeededPRNG,
  sortDeterministicallyByScoreAndId,
} from './seededPrngService';

export interface UtilityFactor {
  label?: string;
  weight: number;
  score: number; // Typically 0 - 100
}

export interface DecisionEvaluationResult {
  utility: number;
  probability: number;
  chosen: boolean;
}

/**
 * Computes a multi-factor weighted utility score with optional contextual modifier
 * and deterministic PRNG noise:
 * Utility = sum(w_i * Score_i) + contextualModifier + noise
 */
export function calculateWeightedUtility(
  factors: readonly UtilityFactor[],
  contextualModifier = 0,
  prng?: SeededPRNG,
  noiseRange = 4
): number {
  let weightedSum = 0;
  for (const factor of factors) {
    if (Number.isFinite(factor.weight) && Number.isFinite(factor.score)) {
      weightedSum += factor.weight * factor.score;
    }
  }

  const noise =
    prng && noiseRange > 0 ? prng.nextInt(-Math.round(noiseRange), Math.round(noiseRange)) : 0;

  return Math.max(0, Math.min(100, Math.round((weightedSum + contextualModifier + noise) * 100) / 100));
}

/**
 * Maps a utility score and decision threshold to a bounded logistic probability in [0, 1]:
 * P = 1 / (1 + exp(-steepness * (utility - threshold)))
 */
export function logisticDecisionProbability(
  utility: number,
  threshold: number,
  steepness = 0.12
): number {
  if (!Number.isFinite(utility) || !Number.isFinite(threshold)) return 0;
  const k = Number.isFinite(steepness) && steepness > 0 ? steepness : 0.12;
  const exponent = -k * (utility - threshold);
  const raw = 1 / (1 + Math.exp(exponent));
  return clampProbability(raw);
}

/**
 * Evaluates a binary probabilistic decision using multi-factor utility, logistic probability,
 * and a deterministic PRNG roll.
 */
export function evaluateProbabilisticDecision(params: {
  factors: readonly UtilityFactor[];
  contextualModifier?: number;
  threshold: number;
  steepness?: number;
  noiseRange?: number;
  prng: SeededPRNG;
}): DecisionEvaluationResult {
  const utility = calculateWeightedUtility(
    params.factors,
    params.contextualModifier ?? 0,
    params.prng,
    params.noiseRange ?? 4
  );
  const probability = logisticDecisionProbability(
    utility,
    params.threshold,
    params.steepness ?? 0.12
  );
  const chosen = params.prng.chance(probability);

  return {
    utility,
    probability,
    chosen,
  };
}

/** Logistic probabilities at or above this value are a certain yes. */
export const CERTAIN_DECISION_PROBABILITY = 0.99;

/**
 * Shared acceptance rule for social and romantic rolls.
 * A probability of 0.99 or higher is accepted. Below that, the seeded roll decides.
 */
export function acceptProbabilisticDecision(
  result: Pick<DecisionEvaluationResult, 'probability' | 'chosen'>
): boolean {
  return result.probability >= CERTAIN_DECISION_PROBABILITY || result.chosen;
}

/**
 * Ranks candidate options by utility score descending, breaking ties strictly
 * by lexicographical ID ascending (`a.id.localeCompare(b.id)`).
 */
export function rankCandidatesDeterministically<T extends { id: string }>(
  candidates: readonly T[],
  evaluateScore: (candidate: T) => number
): Array<{ candidate: T; id: string; score: number }> {
  const scored = candidates.map((candidate) => ({
    candidate,
    id: candidate.id,
    score: Math.round(evaluateScore(candidate) * 1000) / 1000,
  }));

  return sortDeterministicallyByScoreAndId(scored, (item) => item.score);
}

/**
 * Evaluates whether a high-school-graduated NPC chooses to apply to and enroll in University.
 * Influenced by Smarts (0.35), Openness (0.25), Ambition (0.25), Conscientiousness (0.15),
 * High School Grades, Family Wealth, and active Education goals.
 */
export function evaluateUniversityEnrollmentDecision(
  npc: NpcProfile,
  familyWealth: FamilyWealth | undefined,
  prng: SeededPRNG
): DecisionEvaluationResult {
  let modifier = 0;
  if (familyWealth === 'wealthy') modifier += 15;
  else if (familyWealth === 'comfortable') modifier += 8;
  else if (familyWealth === 'struggling') modifier -= 8;

  if (npc.education.grades >= 85) modifier += 10;
  else if (npc.education.grades < 58) modifier -= 15;

  const hasEducationGoal = npc.goals.some(
    (g) => !g.isCompleted && !g.isAbandoned && g.category === 'education'
  );
  if (hasEducationGoal) modifier += 12;

  return evaluateProbabilisticDecision({
    factors: [
      { label: 'smarts', weight: 0.35, score: npc.smarts },
      { label: 'openness', weight: 0.25, score: npc.personality.openness },
      { label: 'ambition', weight: 0.25, score: npc.personality.ambition },
      { label: 'conscientiousness', weight: 0.15, score: npc.personality.conscientiousness },
    ],
    contextualModifier: modifier,
    threshold: 58,
    steepness: 0.14,
    prng,
  });
}

/**
 * Evaluates whether a university graduate NPC chooses to pursue Professional / Graduate School.
 */
export function evaluateProfessionalSchoolDecision(
  npc: NpcProfile,
  prng: SeededPRNG
): DecisionEvaluationResult {
  let modifier = 0;
  if (npc.education.grades >= 85) modifier += 8;
  if (npc.finances.studentDebt > 45000 && npc.finances.cash < 10000) {
    modifier -= 12;
  }

  const hasGradGoal = npc.goals.some(
    (g) =>
      !g.isCompleted &&
      !g.isAbandoned &&
      (g.templateId === 'earn_graduate_degree' || g.category === 'education')
  );
  if (hasGradGoal) modifier += 14;

  // Pre-Med and Pre-Law graduates are strongly predisposed to complete their professional track
  if (
    npc.education.degreeEarned === 'B.S. in Biology (Pre-Med)' ||
    npc.education.degreeEarned === 'B.A. in Political Science'
  ) {
    modifier += 16;
  }

  return evaluateProbabilisticDecision({
    factors: [
      { label: 'smarts', weight: 0.35, score: npc.smarts },
      { label: 'ambition', weight: 0.35, score: npc.personality.ambition },
      { label: 'conscientiousness', weight: 0.20, score: npc.personality.conscientiousness },
      { label: 'openness', weight: 0.10, score: npc.personality.openness },
    ],
    contextualModifier: modifier,
    threshold: 68,
    steepness: 0.14,
    prng,
  });
}

/**
 * Evaluates whether an employed NPC actively pushes for a career promotion or high-output year.
 * Factors: Ambition (0.40), Job Performance (0.35), Conscientiousness (0.20), Extraversion (0.05).
 */
export function evaluatePromotionPursuitDecision(
  npc: NpcProfile,
  prng: SeededPRNG
): DecisionEvaluationResult {
  const hasCareerGoal = npc.goals.some(
    (g) => !g.isCompleted && !g.isAbandoned && g.category === 'career'
  );
  const modifier = hasCareerGoal ? 10 : 0;

  return evaluateProbabilisticDecision({
    factors: [
      { label: 'ambition', weight: 0.40, score: npc.personality.ambition },
      { label: 'performance', weight: 0.35, score: npc.career.performance },
      { label: 'conscientiousness', weight: 0.20, score: npc.personality.conscientiousness },
      { label: 'extraversion', weight: 0.05, score: npc.personality.extraversion },
    ],
    contextualModifier: modifier,
    threshold: 62,
    steepness: 0.14,
    prng,
  });
}

/**
 * Evaluates whether an older employed NPC (at or above `retirementTargetAge`, default 60)
 * decides to retire this year.
 * Influenced by age beyond retirement target, financial security, health (low health encourages retirement),
 * and ambition (high ambition delays retirement).
 */
export function evaluateRetirementDecision(
  npc: NpcProfile,
  retirementTargetAge: number,
  prng: SeededPRNG
): DecisionEvaluationResult {
  if (npc.age < retirementTargetAge || npc.career.isRetired || !npc.career.jobId) {
    return { utility: 0, probability: 0, chosen: false };
  }

  const yearsPastTarget = npc.age - retirementTargetAge;
  const agePressureScore = Math.min(100, 50 + yearsPastTarget * 8);
  const healthFatigueScore = 100 - npc.health;
  const financialReadinessScore =
    npc.finances.annualExpenses > 0
      ? Math.min(
          100,
          Math.round(
            (Math.max(0, npc.finances.netWorth) / (npc.finances.annualExpenses * 8)) * 100
          )
        )
      : 65;
  const workAttachmentPenalty = Math.round(npc.personality.ambition * 0.20);

  return evaluateProbabilisticDecision({
    factors: [
      { label: 'age_pressure', weight: 0.45, score: agePressureScore },
      { label: 'financial_readiness', weight: 0.35, score: financialReadinessScore },
      { label: 'health_fatigue', weight: 0.20, score: healthFatigueScore },
    ],
    contextualModifier: yearsPastTarget * 4 - workAttachmentPenalty,
    threshold: 55,
    steepness: 0.15,
    prng,
  });
}

