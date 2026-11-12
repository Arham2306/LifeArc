import type { ConditionId, DoctorReputation, DoctorTierId } from '../types';

export interface DoctorTierListing {
  id: DoctorTierId;
  reputation: DoctorReputation;
  reputationLabel: string;
  consultPrice: number;
  diagnosticTier: 'basic' | 'advanced' | 'expert';
  diagnosableConditions: readonly ConditionId[];
  description: string;
}

export const DOCTOR_CATALOG: readonly DoctorTierListing[] = [
  {
    id: 'average',
    reputation: 'average',
    reputationLabel: 'Average',
    consultPrice: 40,
    diagnosticTier: 'basic',
    diagnosableConditions: ['cold', 'ankle'],
    description: 'An established general practitioner for everyday health concerns.',
  },
  {
    id: 'good',
    reputation: 'good',
    reputationLabel: 'Good',
    consultPrice: 60,
    diagnosticTier: 'advanced',
    diagnosableConditions: ['cold', 'ankle', 'chest', 'joints'],
    description: 'An experienced physician known for identifying a wider range of medical conditions.',
  },
  {
    id: 'excellent',
    reputation: 'excellent',
    reputationLabel: 'Excellent',
    consultPrice: 120,
    diagnosticTier: 'expert',
    diagnosableConditions: ['cold', 'ankle', 'chest', 'joints', 'heart'],
    description: 'A highly respected physician with the expertise to identify even serious medical concerns.',
  },
] as const;

export function getDoctorTierListing(id: string): DoctorTierListing | null {
  return DOCTOR_CATALOG.find((listing) => listing.id === id) ?? null;
}

export function isValidDoctorTier(id: unknown): id is DoctorTierId {
  return typeof id === 'string' && DOCTOR_CATALOG.some((listing) => listing.id === id);
}

export const DEFAULT_DOCTOR_TIER: DoctorTierId = 'good';

