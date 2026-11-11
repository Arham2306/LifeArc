import type { ConditionId } from '../types';

/**
 * Diagnosis, treatment, and enrollment numbers live here so every milestone reads one catalog.
 */
export interface ConditionListing {
  id: ConditionId;
  phrase: string;
  symptom: string;
  /** Lower numbers are considered first. */
  priority: number;
  temporary: boolean;
  minAge: number;
  /** Eligible when preview health is at or below this. Unused when healthBelow is set. */
  maxHealth: number;
  /** Heart is also eligible below this health, from the doctor age onward. */
  healthBelow?: number;
  untreatedHealth: number;
  untreatedHappiness: number;
  /** Progression years of untreated loss before a temporary condition closes. */
  untreatedYearsToClose: number | null;
  remedyPrice: number | null;
  remedyHealth: number;
  enrollPrice: number | null;
  /** Health loss during a year the enrollment already covers. */
  managedHealth: number | null;
  procedurePrice: number | null;
}

export const CONDITION_CATALOG: readonly ConditionListing[] = [
  {
    id: 'cold',
    phrase: 'a lingering cold',
    symptom: 'Your throat has been sore all week.',
    priority: 5,
    temporary: true,
    minAge: 6,
    maxHealth: 75,
    untreatedHealth: -6,
    untreatedHappiness: 0,
    untreatedYearsToClose: 1,
    remedyPrice: 25,
    remedyHealth: 8,
    enrollPrice: null,
    managedHealth: null,
    procedurePrice: null,
  },
  {
    id: 'ankle',
    phrase: 'a twisted ankle',
    symptom: 'Your ankle turned and it still hurts to walk.',
    priority: 4,
    temporary: true,
    minAge: 12,
    maxHealth: 65,
    untreatedHealth: -4,
    untreatedHappiness: -2,
    untreatedYearsToClose: 1,
    remedyPrice: 40,
    remedyHealth: 4,
    enrollPrice: null,
    managedHealth: null,
    procedurePrice: null,
  },
  {
    id: 'chest',
    phrase: 'a chest infection',
    symptom: 'A cough has settled in your chest.',
    priority: 3,
    temporary: true,
    minAge: 16,
    maxHealth: 55,
    untreatedHealth: -12,
    untreatedHappiness: 0,
    untreatedYearsToClose: 2,
    remedyPrice: 120,
    remedyHealth: 10,
    enrollPrice: null,
    managedHealth: null,
    procedurePrice: null,
  },
  {
    id: 'joints',
    phrase: 'worn joints',
    symptom: 'Your joints ache when you get up.',
    priority: 2,
    temporary: false,
    minAge: 55,
    maxHealth: 70,
    untreatedHealth: -6,
    untreatedHappiness: 0,
    untreatedYearsToClose: null,
    remedyPrice: null,
    remedyHealth: 0,
    enrollPrice: 80,
    managedHealth: -2,
    procedurePrice: null,
  },
  {
    id: 'heart',
    phrase: 'a tired heart',
    symptom: 'Your chest feels heavy when you climb the stairs.',
    priority: 1,
    temporary: false,
    minAge: 70,
    maxHealth: 100,
    healthBelow: 30,
    untreatedHealth: -15,
    untreatedHappiness: 0,
    untreatedYearsToClose: null,
    remedyPrice: null,
    remedyHealth: 0,
    enrollPrice: 60,
    managedHealth: -4,
    procedurePrice: 400,
  },
];

const BY_ID = new Map(CONDITION_CATALOG.map((listing) => [listing.id, listing]));

/** Highest priority first. */
export const CONDITION_PRIORITY: readonly ConditionId[] = [...CONDITION_CATALOG]
  .sort((left, right) => left.priority - right.priority)
  .map((listing) => listing.id);

export function getConditionListing(id: string): ConditionListing | null {
  return BY_ID.get(id as ConditionId) ?? null;
}

export function isConditionEligible(id: ConditionId, health: number, age: number): boolean {
  const listing = BY_ID.get(id);
  if (!listing || age < 6) return false;
  if (listing.healthBelow !== undefined) {
    return age >= listing.minAge || health < listing.healthBelow;
  }
  return age >= listing.minAge && health <= listing.maxHealth;
}
