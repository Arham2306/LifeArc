import { DOCTOR_CATALOG, type DoctorTierListing } from '../data/doctorCatalog';

export const DOCTOR_FIRST_NAMES: readonly string[] = [
  'James',
  'Sarah',
  'Robert',
  'Emily',
  'Michael',
  'Jessica',
  'David',
  'Amanda',
  'Daniel',
  'Rachel',
  'Christopher',
  'Olivia',
  'Matthew',
  'Sophia',
  'Andrew',
  'Lauren',
  'William',
  'Hannah',
  'Anthony',
  'Emma',
  'Brian',
  'Grace',
  'Joshua',
  'Chloe',
  'Alexander',
  'Mia',
  'Benjamin',
  'Victoria',
  'Ethan',
  'Natalie',
];

export const DOCTOR_LAST_NAMES: readonly string[] = [
  'Wilson',
  'Mitchell',
  'Anderson',
  'Brooks',
  'Carter',
  'Bennett',
  'Taylor',
  'Hayes',
  'Chen',
  'Patel',
  'Morgan',
  'Foster',
  'Reynolds',
  'Davis',
  'Sullivan',
  'Parker',
  'Kim',
  'Ramirez',
  'Jenkins',
  'Vance',
  'Cooper',
  'Sterling',
  'Price',
  'Ross',
  'Ward',
  'Holloway',
  'Sinclair',
  'Montgomery',
  'Navarro',
  'Mercer',
];

export type RngFn = () => number;

export interface DoctorOption extends DoctorTierListing {
  doctorName: string;
}

/**
 * Generates `count` unique doctor names with the "Dr." prefix.
 * An optional deterministic RNG function can be provided for testing.
 */
export function generateDoctorNames(count: number = 3, rng: RngFn = Math.random): string[] {
  const chosen = new Set<string>();
  const names: string[] = [];
  let attempts = 0;
  const maxAttempts = 1000;

  while (names.length < count && attempts < maxAttempts) {
    attempts++;
    const firstIdx = Math.floor(rng() * DOCTOR_FIRST_NAMES.length);
    const lastIdx = Math.floor(rng() * DOCTOR_LAST_NAMES.length);
    const firstName = DOCTOR_FIRST_NAMES[firstIdx % DOCTOR_FIRST_NAMES.length];
    const lastName = DOCTOR_LAST_NAMES[lastIdx % DOCTOR_LAST_NAMES.length];
    const fullName = `Dr. ${firstName} ${lastName}`;
    if (!chosen.has(fullName)) {
      chosen.add(fullName);
      names.push(fullName);
    }
  }

  // Fallback in the astronomical event of collision exhaust
  while (names.length < count) {
    const fallback = `Dr. Physician ${names.length + 1}`;
    if (!chosen.has(fallback)) {
      chosen.add(fallback);
      names.push(fallback);
    }
  }

  return names;
}

/**
 * Creates a consultation session with exactly three doctor options corresponding
 * to the three reputation tiers (Average, Good, Excellent) with dynamically generated names.
 */
export function generateDoctorSession(rng: RngFn = Math.random): DoctorOption[] {
  const names = generateDoctorNames(DOCTOR_CATALOG.length, rng);
  return DOCTOR_CATALOG.map((tier, index) => ({
    ...tier,
    doctorName: names[index] ?? `Dr. Attending Physician ${index + 1}`,
  }));
}

