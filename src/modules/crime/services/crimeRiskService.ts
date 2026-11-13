import type { CharacterProfile } from '../../../types/game';
import { hashSeed, SeededPRNG } from '../../autonomy/services/seededPrngService';
import type { CrimeId, CrimeRollEvaluation, CrimeTemplate } from '../types';
import {
  getArrestCount,
  getJurisdictionForAge,
  getSanitizedCrimeState,
  isOnProbation,
} from './crimeSelectors';

export const CRIME_SIM_VERSION = 1;

export type CrimePrngDomain = 'execution' | 'detection' | 'injury';

function clampUnitRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function createCrimeDomainPrng(
  character: Pick<CharacterProfile, 'id' | 'birthYear' | 'age'>,
  crimeId: CrimeId,
  attemptIndex: number,
  domain: CrimePrngDomain,
): SeededPRNG {
  const seed = hashSeed(
    character.id,
    character.birthYear,
    character.age,
    attemptIndex,
    crimeId,
    CRIME_SIM_VERSION,
    domain,
  );
  return new SeededPRNG(seed);
}

export function computeExecutionProbability(
  character: Pick<CharacterProfile, 'stats' | 'crime'>,
  template: CrimeTemplate,
): number {
  const smartsDelta = (character.stats.smarts - 50) * 0.0025;
  const healthDelta = (character.stats.health - 50) * 0.001;
  const probationPenalty = isOnProbation(character) ? -0.04 : 0;

  return clampUnitRange(
    template.baseExecutionProbability + smartsDelta + healthDelta + probationPenalty,
    0.05,
    0.9,
  );
}

export function computeDetectionProbability(
  character: Pick<CharacterProfile, 'stats' | 'crime'>,
  template: CrimeTemplate,
): number {
  const crime = getSanitizedCrimeState(character);
  const heatFactor = crime.policeHeat * 0.003;
  const notorietyFactor = crime.notoriety * 0.0015;
  const smartsReduction = -(character.stats.smarts - 50) * 0.0018;
  const probationFactor = isOnProbation(character) ? 0.08 : 0;
  const priorArrestFactor = Math.min(0.12, getArrestCount(character) * 0.03);

  return clampUnitRange(
    template.baseDetectionProbability +
      heatFactor +
      notorietyFactor +
      smartsReduction +
      probationFactor +
      priorArrestFactor,
    0.05,
    0.9,
  );
}

export function computeInjuryProbability(
  character: Pick<CharacterProfile, 'stats'>,
  template: CrimeTemplate,
): number {
  if (!template.canCauseInjury || template.baseInjuryProbability <= 0) {
    return 0;
  }

  const healthFactor = -(character.stats.health - 50) * 0.0015;
  return clampUnitRange(template.baseInjuryProbability + healthFactor, 0.02, 0.65);
}

/**
 * Evaluates execution, detection, and injury across three isolated domain-separated
 * PRNG streams so no branch alters another branch's stream state or outcome distribution.
 */
export function evaluateCrimeAttempt(
  character: Pick<CharacterProfile, 'id' | 'birthYear' | 'age' | 'stats' | 'crime'>,
  template: CrimeTemplate,
  attemptIndexOverride?: number,
): CrimeRollEvaluation {
  const sanitized = getSanitizedCrimeState(character);
  const attemptIndex = attemptIndexOverride ?? sanitized.attemptCountLifetime;
  const jurisdiction = getJurisdictionForAge(character.age);

  const executionProbability = computeExecutionProbability(character, template);
  const detectionProbability = computeDetectionProbability(character, template);
  const injuryProbability = computeInjuryProbability(character, template);

  const executionPrng = createCrimeDomainPrng(character, template.id, attemptIndex, 'execution');
  const detectionPrng = createCrimeDomainPrng(character, template.id, attemptIndex, 'detection');
  const injuryPrng = createCrimeDomainPrng(character, template.id, attemptIndex, 'injury');

  const executionSucceeded = executionPrng.chance(executionProbability);
  const attemptedPayout =
    executionSucceeded && template.payoutMax > 0
      ? executionPrng.nextInt(template.payoutMin, template.payoutMax)
      : 0;

  const detected = detectionPrng.chance(detectionProbability);

  let injured = false;
  let injuryHealthLoss = 0;
  if (injuryProbability > 0) {
    // Injury is rolled independently of both executionSucceeded and detected
    // so failed physical attempts can still injure the character.
    injured = injuryPrng.chance(injuryProbability);
    if (injured && template.injuryHealthLossMax > 0) {
      injuryHealthLoss = injuryPrng.nextInt(
        template.injuryHealthLossMin,
        template.injuryHealthLossMax,
      );
    }
  }

  return {
    crimeId: template.id,
    jurisdiction,
    executionProbability,
    detectionProbability,
    injuryProbability,
    executionSucceeded,
    detected,
    injured,
    attemptedPayout,
    injuryHealthLoss,
  };
}

