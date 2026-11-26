import type {
  PlasticSurgeryId,
  PlasticSurgeryTemplate,
  SurgeryClinicTier,
  SurgeryClinicTierId,
} from '../types';

export const PLASTIC_SURGERY_MIN_AGE = 18;

export const PLASTIC_SURGERY_CATALOG: readonly PlasticSurgeryTemplate[] = [
  {
    id: 'veneers',
    name: 'Porcelain Veneers',
    description: 'Custom dental alignment and brightening for a camera-ready smile.',
    baseCost: 3500,
    looksGain: 8,
    happinessGain: 5,
  },
  {
    id: 'rhinoplasty',
    name: 'Rhinoplasty',
    description: 'Precision nasal reshaping tailored for balanced facial harmony.',
    baseCost: 6000,
    looksGain: 12,
    happinessGain: 6,
  },
  {
    id: 'hair_transplant',
    name: 'Hair Transplant',
    description: 'Follicular restoration for a thicker, natural-looking hairline.',
    baseCost: 7500,
    looksGain: 14,
    happinessGain: 8,
  },
  {
    id: 'liposuction',
    name: 'Liposuction',
    description: 'Targeted body sculpting with medical contour recovery.',
    baseCost: 9000,
    looksGain: 16,
    happinessGain: 7,
  },
  {
    id: 'facelift',
    name: 'Full Facelift',
    description: 'Comprehensive rejuvenation lifting cheeks, jawline, and brow.',
    baseCost: 15000,
    looksGain: 22,
    happinessGain: 10,
  },
] as const;

export const SURGERY_CLINIC_TIERS: readonly SurgeryClinicTier[] = [
  {
    id: 'budget',
    name: 'Budget Clinic',
    priceMultiplier: 0.65,
    botchChance: 0.24,
    clinicLabel: 'Discount MedSpa Group',
  },
  {
    id: 'board_certified',
    name: 'Board-Certified Surgeon',
    priceMultiplier: 1.0,
    botchChance: 0.09,
    clinicLabel: 'Harborview Surgical Associates',
  },
  {
    id: 'celebrity',
    name: 'Celebrity Specialist',
    priceMultiplier: 1.75,
    botchChance: 0.03,
    clinicLabel: 'Aura Private Aesthetics',
  },
] as const;

export function getPlasticSurgeryTemplate(id: PlasticSurgeryId): PlasticSurgeryTemplate | undefined {
  return PLASTIC_SURGERY_CATALOG.find((item) => item.id === id);
}

export function getSurgeryClinicTier(id: SurgeryClinicTierId): SurgeryClinicTier {
  return SURGERY_CLINIC_TIERS.find((item) => item.id === id) ?? SURGERY_CLINIC_TIERS[1];
}
