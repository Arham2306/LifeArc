import type { ConditionId, ConditionRecord } from '../types';
import { chestCourseAwaitingClose } from '../services/healthcareService';

export interface CareStatusInfo {
  state: 'not_enrolled' | 'covered' | 'renewal_pending' | 'lapsed' | 'canceled_covered' | 'procedure_needed' | 'procedure_done';
  label: string;
  badgeVariant: 'emerald' | 'amber' | 'rose' | 'slate' | 'sky';
  description: string;
}

export const CONDITION_NAMES: Record<ConditionId, string> = {
  cold: 'Lingering Cold',
  ankle: 'Sprained Ankle',
  chest: 'Chest Infection',
  joints: 'Worn Joints',
  heart: 'Tired Heart',
};

export const CONDITION_EMOJIS: Record<ConditionId, string> = {
  cold: '🤧',
  ankle: '🩹',
  chest: '🫁',
  joints: '🦴',
  heart: '❤️‍🩹',
};

export function formatMoney(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  return `$${safe.toLocaleString()}`;
}

export function getConditionTitle(catalogId: ConditionId): string {
  return CONDITION_NAMES[catalogId] ?? catalogId;
}

export function getConditionEmoji(catalogId: ConditionId): string {
  return CONDITION_EMOJIS[catalogId] ?? '🩺';
}

export function resolveCareStatus(condition: ConditionRecord, characterAge: number): CareStatusInfo {
  const isCoveredNow = typeof condition.coverageThroughAge === 'number' && condition.coverageThroughAge >= characterAge;
  const isEnrolled = !!condition.enrolled;

  if (condition.catalogId === 'heart') {
    if (!condition.procedureCompleted) {
      return {
        state: 'procedure_needed',
        label: 'Procedure Needed',
        badgeVariant: 'rose',
        description: 'Surgical procedure required before follow-up care can be enrolled.',
      };
    }
  }

  if (!isEnrolled && isCoveredNow) {
    return {
      state: 'canceled_covered',
      label: 'Canceled (Covered this year)',
      badgeVariant: 'sky',
      description: `Renewal stopped. Paid coverage remains active through age ${condition.coverageThroughAge}.`,
    };
  }

  if (isEnrolled && isCoveredNow) {
    return {
      state: 'covered',
      label: 'Currently Covered',
      badgeVariant: 'emerald',
      description: `Active coverage through age ${condition.coverageThroughAge}. Will renew on next birthday.`,
    };
  }

  if (isEnrolled && !isCoveredNow) {
    return {
      state: 'renewal_pending',
      label: 'Renewal Pending',
      badgeVariant: 'amber',
      description: 'Enrolled care awaiting renewal payment on your birthday.',
    };
  }

  if (!isEnrolled && (condition.untreatedYears > 0 || (condition.coverageThroughAge !== undefined && condition.coverageThroughAge < characterAge))) {
    return {
      state: 'lapsed',
      label: 'Renewal Lapsed',
      badgeVariant: 'rose',
      description: 'Care renewal was not paid. Unmanaged health penalties apply annually.',
    };
  }

  if (condition.catalogId === 'heart' && condition.procedureCompleted) {
    return {
      state: 'procedure_done',
      label: 'Procedure Done (Not Enrolled)',
      badgeVariant: 'slate',
      description: 'Procedure complete. Annual follow-up care is not currently enrolled.',
    };
  }

  return {
    state: 'not_enrolled',
    label: 'Not Enrolled',
    badgeVariant: 'slate',
    description: 'No active recurring care enrolled. Standard untreated loss applies annually.',
  };
}

export function resolveTemporaryStatus(condition: ConditionRecord, characterAge: number): {
  label: string;
  badgeVariant: 'emerald' | 'amber' | 'rose' | 'slate' | 'sky';
  description: string;
} {
  if (condition.catalogId === 'chest' && chestCourseAwaitingClose(condition)) {
    return {
      label: 'Course in Progress',
      badgeVariant: 'emerald',
      description: 'Antibiotic course completed. Infection will fully clear at your next age up.',
    };
  }

  if (condition.declinedAtAge === characterAge) {
    return {
      label: 'Declined this year',
      badgeVariant: 'slate',
      description: 'You opted to wait on treatment this year. You may still treat it before aging up.',
    };
  }

  return {
    label: 'Untreated',
    badgeVariant: 'rose',
    description: 'Condition is currently untreated. Penalties will apply on your next birthday if left unaddressed.',
  };
}

