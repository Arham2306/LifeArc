import type {
  AddictionId,
  AddictionTemplate,
  CivilAttorneyTierId,
  CivilAttorneyTierTemplate,
  RehabTierId,
  RehabTierTemplate,
} from '../types';

export const CLUBBING_MIN_AGE = 18;
export const CLUBBING_ENTRY_FEE = 80;
export const MAX_CLUBBING_PER_YEAR = 2;
export const CLUBBING_SELF_DEFENSE_THRESHOLD = 48;

export const ADDICTION_CATALOG: readonly AddictionTemplate[] = [
  {
    id: 'alcohol',
    name: 'Alcohol Dependence',
    temptationTitle: 'VIP Open Bar Offer',
    temptationPrompt:
      'A bottle-service promoter waves you into a private booth with unlimited top-shelf drinks. Join in or call it a night?',
    riskChance: 0.25,
    baseAnnualCost: 250,
    maxAnnualCost: 600,
  },
  {
    id: 'gambling',
    name: 'Compulsive Gambling',
    temptationTitle: 'Backroom High-Stakes Table',
    temptationPrompt:
      'Someone invites you upstairs to an invite-only dice table where cash is moving fast. Sit down or walk away?',
    riskChance: 0.28,
    baseAnnualCost: 250,
    maxAnnualCost: 600,
  },
  {
    id: 'substances',
    name: 'Substance Dependence',
    temptationTitle: 'After-Hours VIP Offer',
    temptationPrompt:
      'In the VIP lounge, someone slips a small vial across the table and offers a "night-booster." Accept or turn it down?',
    riskChance: 0.35,
    baseAnnualCost: 250,
    maxAnnualCost: 600,
  },
] as const;

export const REHAB_TIERS: readonly RehabTierTemplate[] = [
  {
    id: 'community',
    name: 'Community Support Group',
    description: 'Peer-led evening recovery meetings with strong accountability.',
    fee: 0,
    recoveryChance: 0.42,
    bonusHappiness: 0,
    bonusKarma: 2,
  },
  {
    id: 'standard',
    name: 'Standard Rehab Clinic',
    description: 'Structured inpatient counseling and medical detox support.',
    fee: 2500,
    recoveryChance: 0.74,
    bonusHappiness: 0,
    bonusKarma: 0,
  },
  {
    id: 'luxury',
    name: 'Luxury Wellness Retreat',
    description: 'Private coastal rehabilitation with dedicated doctors and therapy.',
    fee: 12000,
    recoveryChance: 0.94,
    bonusHappiness: 8,
    bonusKarma: 0,
  },
] as const;

export const CIVIL_ATTORNEY_TIERS: readonly CivilAttorneyTierTemplate[] = [
  {
    id: 'public',
    name: 'Public / Contingency',
    description: 'Basic civil court filing with a standard legal aid team.',
    fee: 300,
    winChance: 0.42,
  },
  {
    id: 'private',
    name: 'Private Civil Attorney',
    description: 'Experienced tort litigator who builds strong documentary evidence.',
    fee: 2500,
    winChance: 0.68,
  },
  {
    id: 'elite',
    name: 'Elite Trial Litigator',
    description: 'Top-tier courtroom specialist known for maximum civil settlements.',
    fee: 8000,
    winChance: 0.86,
  },
] as const;

export function getAddictionTemplate(id: AddictionId): AddictionTemplate {
  return ADDICTION_CATALOG.find((item) => item.id === id) ?? ADDICTION_CATALOG[0];
}

export function getRehabTier(id: RehabTierId): RehabTierTemplate {
  return REHAB_TIERS.find((item) => item.id === id) ?? REHAB_TIERS[0];
}

export function getCivilAttorneyTier(id: CivilAttorneyTierId): CivilAttorneyTierTemplate {
  return CIVIL_ATTORNEY_TIERS.find((item) => item.id === id) ?? CIVIL_ATTORNEY_TIERS[0];
}
