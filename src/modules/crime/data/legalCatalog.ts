import type {
  CrimeTier,
  DefenseStrategyId,
  DefenseStrategyTemplate,
  OffenseClass,
  PrisonSecurityLevel,
} from '../types';

/** Optional modest restitution cap for juvenile informal warnings (never adult unpaidFines). */
export const JUVENILE_WARNING_RESTITUTION_MAX = 75;

export const DEFENSE_STRATEGIES: readonly DefenseStrategyTemplate[] = [
  {
    id: 'public_defender',
    title: 'Public Defender',
    description: 'Court-appointed counsel at no upfront cost. Standard statutory outcomes.',
    icon: '⚖️',
    feesByTier: { petty: 0, mid: 0, high_stakes: 0 },
    dismissalBonus: 0,
    acquittalBonus: 0,
    sentenceMultiplier: 1,
    fineMultiplier: 1,
    shiftsPrisonToProbationBonus: 0,
  },
  {
    id: 'plea_deal',
    title: 'Negotiate Plea Deal',
    description: 'Accept responsibility early in exchange for reduced fines and lighter sentencing.',
    icon: '🤝',
    feesByTier: { petty: 0, mid: 0, high_stakes: 0 },
    dismissalBonus: -0.05,
    acquittalBonus: -0.1,
    sentenceMultiplier: 0.65,
    fineMultiplier: 0.75,
    shiftsPrisonToProbationBonus: 0.28,
  },
  {
    id: 'private_attorney',
    title: 'Private Defense Attorney',
    description: 'Retain experienced criminal defense counsel to challenge evidence and procedure.',
    icon: '💼',
    feesByTier: { petty: 750, mid: 2500, high_stakes: 7500 },
    dismissalBonus: 0.12,
    acquittalBonus: 0.16,
    sentenceMultiplier: 0.7,
    fineMultiplier: 0.8,
    shiftsPrisonToProbationBonus: 0.22,
  },
  {
    id: 'elite_counsel',
    title: 'Elite Trial Firm',
    description: 'Hire top-tier litigators to aggressively contest charges and minimize exposure.',
    icon: '🏛️',
    feesByTier: { petty: 2000, mid: 6500, high_stakes: 18000 },
    dismissalBonus: 0.2,
    acquittalBonus: 0.28,
    sentenceMultiplier: 0.5,
    fineMultiplier: 0.65,
    shiftsPrisonToProbationBonus: 0.35,
  },
];

export const DEFENSE_STRATEGY_MAP: Record<DefenseStrategyId, DefenseStrategyTemplate> =
  DEFENSE_STRATEGIES.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<DefenseStrategyId, DefenseStrategyTemplate>,
  );

export function getDefenseStrategy(strategyId: DefenseStrategyId): DefenseStrategyTemplate {
  return DEFENSE_STRATEGY_MAP[strategyId];
}

export function getAttorneyFeeForCase(
  strategyId: DefenseStrategyId,
  tier: CrimeTier,
): number {
  return getDefenseStrategy(strategyId).feesByTier[tier];
}

export interface PrisonFacilityMeta {
  securityLevel: PrisonSecurityLevel;
  facilityName: string;
}

const FACILITY_BY_LEVEL: Record<PrisonSecurityLevel, PrisonFacilityMeta> = {
  minimum: {
    securityLevel: 'minimum',
    facilityName: 'Cedar Creek Minimum Security Camp',
  },
  medium: {
    securityLevel: 'medium',
    facilityName: 'Ridgefield Correctional Facility',
  },
  maximum: {
    securityLevel: 'maximum',
    facilityName: 'Blackstone Maximum Security Penitentiary',
  },
};

export function selectPrisonFacility(
  tier: CrimeTier,
  offenseClass: OffenseClass,
  sentenceYears: number,
  priorAdultPrisonCount: number,
): PrisonFacilityMeta {
  if (tier === 'high_stakes' || sentenceYears >= 7 || priorAdultPrisonCount >= 2) {
    return FACILITY_BY_LEVEL.maximum;
  }
  if (offenseClass === 'felony' || sentenceYears >= 3 || priorAdultPrisonCount >= 1) {
    return FACILITY_BY_LEVEL.medium;
  }
  return FACILITY_BY_LEVEL.minimum;
}

