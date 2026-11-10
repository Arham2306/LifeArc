import type { CharacterProfile, StatEffects, StatKey } from '../../../types/game'
import { stampPlayerNetWorth } from '../../assets/services/assetService'

const STAT_KEYS: StatKey[] = ['health', 'happiness', 'smarts', 'looks', 'karma'];

const clampStat = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export const ADULT_AGE = 18;

export interface ApplyEffectsResult {
  character: CharacterProfile;
  /** The changes that actually happened after clamping (e.g. can't go above 100 or below $0). */
  applied: StatEffects;
}

/**
 * Applies stat, parent relationship, and cash changes to a character, keeping stats within 0-100
 * and cash at $0 or more. Characters under 18 cannot earn or hold money.
 */
export function applyEffects(character: CharacterProfile, effects: StatEffects): ApplyEffectsResult {
  const stats = { ...character.stats };
  const applied: StatEffects = {};

  for (const key of STAT_KEYS) {
    const delta = effects[key];
    if (!delta) continue;

    const before = stats[key];
    const after = clampStat(before + delta);
    stats[key] = after;
    if (after !== before) applied[key] = after - before;
  }

  // Parent relationships
  let parents = character.parents;
  const bothDelta = effects.parents ?? 0;
  const fatherDelta = bothDelta + (effects.fatherRelationship ?? 0);
  const motherDelta = bothDelta + (effects.motherRelationship ?? 0);

  if (fatherDelta !== 0 || motherDelta !== 0) {
    const newFatherRel = clampStat(parents.father.relationship + fatherDelta);
    const newMotherRel = clampStat(parents.mother.relationship + motherDelta);

    parents = {
      ...parents,
      father: { ...parents.father, relationship: newFatherRel },
      mother: { ...parents.mother, relationship: newMotherRel },
    };

    if (effects.parents) applied.parents = effects.parents;
    if (effects.fatherRelationship) applied.fatherRelationship = effects.fatherRelationship;
    if (effects.motherRelationship) applied.motherRelationship = effects.motherRelationship;
  }

  // School stats (grades & popularity)
  let education = character.education;
  if (education && (effects.grades !== undefined || effects.popularity !== undefined)) {
    const prevGrades = education.grades;
    const prevPopularity = education.popularity;
    const nextGrades = effects.grades !== undefined ? clampStat(prevGrades + effects.grades) : prevGrades;
    const nextPopularity =
      effects.popularity !== undefined ? clampStat(prevPopularity + effects.popularity) : prevPopularity;

    if (nextGrades !== prevGrades) applied.grades = nextGrades - prevGrades;
    if (nextPopularity !== prevPopularity) applied.popularity = nextPopularity - prevPopularity;

    education = {
      ...education,
      grades: nextGrades,
      popularity: nextPopularity,
    };
  }

  let cash = character.cash;
  if (effects.cash !== undefined && effects.cash !== 0) {
    const after = Math.max(0, cash + effects.cash);
    if (after !== cash) applied.cash = after - cash;
    cash = after;
  }

  // Career job performance
  let career = character.career;
  if (career?.currentJob && effects.jobPerformance !== undefined) {
    const prevPerf = career.currentJob.performance;
    const nextPerf = clampStat(prevPerf + effects.jobPerformance);
    if (nextPerf !== prevPerf) applied.jobPerformance = nextPerf - prevPerf;
    career = {
      ...career,
      currentJob: {
        ...career.currentJob,
        performance: nextPerf,
      },
    };
  }

  // Active business vitality & corporate treasury effects
  let business = character.business;
  if (business) {
    let bizUpdated = false;
    let nextBrand = business.brandReputation;
    let nextMorale = business.morale;
    let nextQuality = business.qualityScore;
    let nextTreasury = business.treasury;

    if (effects.businessBrand !== undefined && effects.businessBrand !== 0) {
      nextBrand = clampStat(business.brandReputation + effects.businessBrand);
      if (nextBrand !== business.brandReputation) {
        applied.businessBrand = nextBrand - business.brandReputation;
        bizUpdated = true;
      }
    }

    if (effects.businessMorale !== undefined && effects.businessMorale !== 0) {
      nextMorale = clampStat(business.morale + effects.businessMorale);
      if (nextMorale !== business.morale) {
        applied.businessMorale = nextMorale - business.morale;
        bizUpdated = true;
      }
    }

    if (effects.businessQuality !== undefined && effects.businessQuality !== 0) {
      nextQuality = clampStat(business.qualityScore + effects.businessQuality);
      if (nextQuality !== business.qualityScore) {
        applied.businessQuality = nextQuality - business.qualityScore;
        bizUpdated = true;
      }
    }

    if (effects.businessTreasury !== undefined && effects.businessTreasury !== 0) {
      nextTreasury = business.treasury + effects.businessTreasury;
      applied.businessTreasury = effects.businessTreasury;
      bizUpdated = true;
    }

    if (bizUpdated) {
      business = {
        ...business,
        brandReputation: nextBrand,
        morale: nextMorale,
        qualityScore: nextQuality,
        treasury: nextTreasury,
      };
    }
  }

  // Check if health dropped to 0
  const diedFromHealth = character.isAlive && stats.health <= 0;

  return {
    character: stampPlayerNetWorth({
      ...character,
      stats,
      parents,
      education,
      career,
      business,
      cash,
      isAlive: diedFromHealth ? false : character.isAlive,
      causeOfDeath: diedFromHealth
        ? character.causeOfDeath || 'Succumbed to poor health'
        : character.causeOfDeath,
    }),
    applied,
  };
}
