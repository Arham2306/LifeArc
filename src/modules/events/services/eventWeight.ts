import type { LifeEventCategory } from '../../../types/game';
import type { LifeEventTemplate } from '../types';
import type { EventContext } from './eventContext';

/** Authored-weight clamp, then the relevance, repetition, and final clamps. */
export const EVENT_WEIGHT_LIMITS = {
  baseMin: 0.1,
  baseMax: 5,
  relevanceMin: 0.5,
  relevanceMax: 2,
  repetitionMin: 0.25,
  finalMin: 0.05,
  finalMax: 10,
} as const;

/** Category multipliers. A modifier applies only to the template's own category. */
export const EVENT_RELEVANCE_MULTIPLIERS = {
  unemployedMoney: 1.35,
  unemployedMisfortune: 1.2,
  business: 1.35,
  tenuredCareer: 1.25,
  strugglingMoney: 1.4,
  wealthyMoney: 0.85,
  spouseRelationship: 1.3,
  partnerRelationship: 1.15,
  schoolAgeRelationship: 1.2,
  lowHealth: 1.4,
  lowKarmaMisfortune: 1.25,
  highKarmaMisfortune: 0.85,
  childhood: 1.15,
  teensEducation: 1.1,
} as const;

const CATEGORY_HIT_STEP = 0.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * A missing, non-finite, zero, or negative authored weight becomes 1.
 * Any remaining positive weight is then clamped to the base range.
 */
function baseWeight(weight: number | undefined): number {
  if (!finiteNumber(weight) || !(weight > 0)) return 1;
  return clamp(weight, EVENT_WEIGHT_LIMITS.baseMin, EVENT_WEIGHT_LIMITS.baseMax);
}

function multiplyCategory(
  product: number,
  category: LifeEventCategory,
  expected: LifeEventCategory,
  multiplier: number
): number {
  return category === expected ? product * multiplier : product;
}

function relevanceMultiplier(event: LifeEventTemplate, context: EventContext): number {
  const category = event.category;
  const rates = EVENT_RELEVANCE_MULTIPLIERS;
  let product = 1;

  if (context.isUnemployed === true) {
    product = multiplyCategory(product, category, 'money', rates.unemployedMoney);
    product = multiplyCategory(product, category, 'misfortune', rates.unemployedMisfortune);
  }
  if (context.hasBusiness === true) {
    product = multiplyCategory(product, category, 'business', rates.business);
  }
  if (context.isEmployed === true && finiteNumber(context.yearsInJob) && context.yearsInJob >= 3) {
    product = multiplyCategory(product, category, 'career', rates.tenuredCareer);
  }
  if (context.financialBand === 'struggling') {
    product = multiplyCategory(product, category, 'money', rates.strugglingMoney);
  } else if (context.financialBand === 'wealthy') {
    product = multiplyCategory(product, category, 'money', rates.wealthyMoney);
  }

  const relationshipKnown =
    context.relationshipSource !== 'invalid' &&
    context.hasSpouse !== null &&
    context.hasPartner !== null;
  if (relationshipKnown) {
    if (context.hasSpouse === true) {
      product = multiplyCategory(product, category, 'relationship', rates.spouseRelationship);
    } else if (context.hasPartner === true) {
      product = multiplyCategory(product, category, 'relationship', rates.partnerRelationship);
    }
  }
  if (finiteNumber(context.schoolAgeChildren) && context.schoolAgeChildren > 0) {
    product = multiplyCategory(product, category, 'relationship', rates.schoolAgeRelationship);
  }

  if (finiteNumber(context.health) && context.health < 40) {
    product = multiplyCategory(product, category, 'health', rates.lowHealth);
  }
  if (finiteNumber(context.karma) && context.karma < 30) {
    product = multiplyCategory(product, category, 'misfortune', rates.lowKarmaMisfortune);
  } else if (finiteNumber(context.karma) && context.karma > 80) {
    product = multiplyCategory(product, category, 'misfortune', rates.highKarmaMisfortune);
  }
  if (context.lifeStage === 'childhood') {
    product = multiplyCategory(product, category, 'childhood', rates.childhood);
  }
  if (context.lifeStage === 'teens') {
    product = multiplyCategory(product, category, 'education', rates.teensEducation);
  }

  if (!Number.isFinite(product)) return 1;
  return clamp(product, EVENT_WEIGHT_LIMITS.relevanceMin, EVENT_WEIGHT_LIMITS.relevanceMax);
}

function repetitionFactor(
  event: LifeEventTemplate,
  context: EventContext,
  interactiveTitles: ReadonlySet<string>
): number {
  const rows = Array.isArray(context.recentTimeline) ? context.recentTimeline : [];
  let categoryHits = 0;
  let titleHits = 0;
  for (const row of rows) {
    if (!row || typeof row.title !== 'string' || !interactiveTitles.has(row.title)) continue;
    if (row.category === event.category) categoryHits += 1;
    if (row.title === event.title) titleHits += 1;
  }
  const categoryFactor = 1 / (1 + CATEGORY_HIT_STEP * categoryHits);
  const titleFactor = 1 / (1 + titleHits);
  const product = categoryFactor * titleFactor;
  if (!Number.isFinite(product)) return 1;
  return Math.max(EVENT_WEIGHT_LIMITS.repetitionMin, product);
}

/**
 * Clamps each component, multiplies them, then clamps the product.
 * Inputs above the component ceilings still land on the final ceiling.
 */
export function combineEventWeight(base: number, relevance: number, repetition: number): number {
  const limits = EVENT_WEIGHT_LIMITS;
  const safeBase = finiteNumber(base) ? clamp(base, limits.baseMin, limits.baseMax) : 1;
  const safeRelevance = finiteNumber(relevance)
    ? clamp(relevance, limits.relevanceMin, limits.relevanceMax)
    : 1;
  const safeRepetition = finiteNumber(repetition) ? Math.max(limits.repetitionMin, repetition) : 1;
  const product = safeBase * safeRelevance * safeRepetition;
  if (!Number.isFinite(product)) return limits.finalMin;
  return clamp(product, limits.finalMin, limits.finalMax);
}

/**
 * Share of each positive finite weight. Empty arrays and any non-positive or
 * non-finite input return an empty list so callers never receive NaN shares.
 */
export function selectionShares(weights: readonly number[]): number[] {
  if (!Array.isArray(weights) || weights.length === 0) return [];
  for (const weight of weights) {
    if (!finiteNumber(weight) || !(weight > 0)) return [];
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isFinite(total) || !(total > 0)) return [];
  return weights.map((weight) => weight / total);
}

/** Pure contextual weight. Does not check eligibility, write state, or draw random numbers. */
export function scoreEventWeight(
  event: LifeEventTemplate,
  context: EventContext,
  interactiveTitles: ReadonlySet<string>
): number {
  return combineEventWeight(
    baseWeight(event.weight),
    relevanceMultiplier(event, context),
    repetitionFactor(event, context, interactiveTitles)
  );
}
