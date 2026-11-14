import type { BadgeVariant } from '../../../components/ui/Badge';
import type { FamilyWealth } from '../../../types/game';
import type { CareerHistoryEntry } from '../../career/types';
import type { SchoolStage } from '../../education/types';
import type {
  FamilyDataSource,
  IdentityEmploymentStatus,
  IdentityLifeStage,
  RecordedEstateStatus,
} from '../types';

export const LIFE_STAGE_META: Record<IdentityLifeStage, { label: string; icon: string }> = {
  childhood: { label: 'Childhood', icon: '🧸' },
  teens: { label: 'Teen Years', icon: '🎧' },
  adulthood: { label: 'Adulthood', icon: '🧭' },
  middle_age: { label: 'Middle Age', icon: '🏛️' },
  old_age: { label: 'Senior Years', icon: '🕊️' },
};

export const EMPLOYMENT_STATUS_META: Record<
  IdentityEmploymentStatus,
  { label: string; variant: BadgeVariant }
> = {
  deceased: { label: 'Deceased', variant: 'slate' },
  incarcerated: { label: 'Incarcerated', variant: 'rose' },
  retired: { label: 'Retired', variant: 'amber' },
  self_employed: { label: 'Self-Employed', variant: 'purple' },
  employed: { label: 'Employed', variant: 'emerald' },
  student: { label: 'Student', variant: 'sky' },
  infant: { label: 'Infant', variant: 'amber' },
  unemployed: { label: 'Unemployed', variant: 'slate' },
};

export const ESTATE_STATUS_META: Record<
  RecordedEstateStatus,
  { label: string; variant: BadgeVariant }
> = {
  settled: { label: 'Settled', variant: 'emerald' },
  insolvent: { label: 'Insolvent', variant: 'amber' },
  escheated: { label: 'Escheated to State', variant: 'slate' },
};

export const SCHOOL_STAGE_LABELS: Record<SchoolStage | 'unavailable', string> = {
  none: 'Not Enrolled',
  elementary: 'Elementary School',
  middle_school: 'Middle School',
  high_school: 'High School',
  university: 'University (In Progress)',
  professional_school: 'Professional School (In Progress)',
  graduated: 'Graduated',
  dropped_out: 'Left School Early',
  unavailable: 'Unavailable',
};

const FAMILY_WEALTH_LABELS: Record<FamilyWealth, string> = {
  struggling: 'Struggling',
  modest: 'Modest',
  comfortable: 'Comfortable',
  wealthy: 'Wealthy',
};

const LEAVING_REASON_LABELS: Record<CareerHistoryEntry['reasonForLeaving'], string> = {
  resigned: 'Resigned',
  switched_jobs: 'Switched Jobs',
  fired: 'Terminated',
  retired: 'Retired',
};

const PET_SPECIES_LABELS: Record<'pet_dog' | 'pet_cat' | 'pet_rabbit', string> = {
  pet_dog: 'Dog',
  pet_cat: 'Cat',
  pet_rabbit: 'Rabbit',
};

const SOURCE_LABELS: Record<FamilyDataSource, string> = {
  reconciled: 'Reconciled',
  canonical: 'Canonical',
  legacy: 'Legacy Record',
};

/** Formats finite monetary amounts cleanly; shows Unavailable when null/non-finite. */
export function formatIdentityMoney(
  amount: number | null | undefined,
  currencyCode?: string | null
): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return 'Unavailable';
  }
  const rounded = Math.round(amount);
  const absFormatted = Math.abs(rounded).toLocaleString('en-US');
  const sign = rounded < 0 ? '-' : '';
  const cleanCurrency =
    typeof currencyCode === 'string' && currencyCode.trim() !== '' && currencyCode.trim() !== 'USD'
      ? `${currencyCode.trim()} `
      : '$';
  return `${sign}${cleanCurrency}${absFormatted}`;
}

export function formatFamilyWealthLabel(wealth: FamilyWealth | null): string {
  if (!wealth) return 'Unavailable';
  return FAMILY_WEALTH_LABELS[wealth] ?? wealth;
}

export function formatLeavingReason(reason: CareerHistoryEntry['reasonForLeaving']): string {
  return LEAVING_REASON_LABELS[reason] ?? reason;
}

export function formatGenderLabel(gender: 'male' | 'female' | 'non-binary' | 'unknown'): string {
  if (gender === 'male') return 'Male';
  if (gender === 'female') return 'Female';
  if (gender === 'non-binary') return 'Non-Binary';
  return 'Unknown';
}

export function formatPetSpeciesLabel(species: 'pet_dog' | 'pet_cat' | 'pet_rabbit'): string {
  return PET_SPECIES_LABELS[species] ?? 'Pet';
}

export function formatFamilySourceLabel(source: FamilyDataSource): string {
  return SOURCE_LABELS[source];
}

export function formatSchoolStageLabel(stage: string): string {
  return SCHOOL_STAGE_LABELS[stage as SchoolStage | 'unavailable'] ?? stage;
}
