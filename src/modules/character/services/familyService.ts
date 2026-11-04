import type { FamilyWealth, LifeEvent, ParentsInfo, SiblingProfile } from '../../../types/game'
import type { BadgeVariant } from '../../../components/ui/Badge'
import { FEMALE_NAMES, MALE_NAMES } from '../data/names'
import { createId } from '../../../utils/id'
import { pickRandom, pickWeighted, randomInt } from '../../../utils/random'

/** Resolves standard occupation / student status for a sibling based on their age. */
export function getSiblingOccupation(age: number, currentOccupation?: string): string {
  if (age <= 2) return 'Infant';
  if (age <= 4) return 'Toddler';
  if (age <= 10) return 'Elementary Student';
  if (age <= 13) return 'Middle School Student';
  if (age <= 17) return 'High School Student';
  if (age <= 21) return 'University Student';
  if (currentOccupation && !currentOccupation.endsWith('Student')) return currentOccupation;
  return 'Employed';
}

/**
 * Generates initial siblings (if any) for a newborn character.
 */
export function generateSiblings(familyLastName: string, motherAge: number): SiblingProfile[] {
  const { count } = pickWeighted<{ count: number; weight: number }>([
    { count: 0, weight: 40 }, // Only child
    { count: 1, weight: 35 }, // 1 sibling
    { count: 2, weight: 18 }, // 2 siblings
    { count: 3, weight: 7 },  // 3 siblings
  ]);

  if (count === 0) return [];

  const siblings: SiblingProfile[] = [];
  const maxOlderAge = Math.min(12, Math.max(1, motherAge - 20));

  for (let i = 0; i < count; i++) {
    const isMale = Math.random() < 0.5;
    const gender: 'male' | 'female' = isMale ? 'male' : 'female';
    const role: 'brother' | 'sister' = isMale ? 'brother' : 'sister';
    const firstName = isMale ? pickRandom(MALE_NAMES) : pickRandom(FEMALE_NAMES);
    
    // Older siblings or rare twin
    const isTwin = count === 1 && Math.random() < 0.05;
    const age = isTwin ? 0 : randomInt(1, maxOlderAge);
    const birthOrder: 'older' | 'younger' | 'twin' = isTwin ? 'twin' : 'older';

    siblings.push({
      id: createId(),
      role,
      firstName,
      lastName: familyLastName,
      age,
      gender,
      relationship: randomInt(68, 94),
      occupation: getSiblingOccupation(age),
      isAlive: true,
      birthOrder,
    });
  }

  // Sort siblings by age descending (oldest first)
  return siblings.sort((a, b) => b.age - a.age);
}

export interface WealthTierMeta {
  label: string;
  icon: string;
  badgeVariant: BadgeVariant;
  /** Multiplier applied to positive outcome weights when asking parents to pay for something. */
  paySuccessMultiplier: number;
}

export const WEALTH_META: Record<FamilyWealth, WealthTierMeta> = {
  struggling: {
    label: 'Struggling',
    icon: '🪙',
    badgeVariant: 'rose',
    paySuccessMultiplier: 0.45,
  },
  modest: {
    label: 'Modest',
    icon: '🏠',
    badgeVariant: 'amber',
    paySuccessMultiplier: 0.9,
  },
  comfortable: {
    label: 'Comfortable',
    icon: '🏡',
    badgeVariant: 'sky',
    paySuccessMultiplier: 1.5,
  },
  wealthy: {
    label: 'Wealthy',
    icon: '💎',
    badgeVariant: 'emerald',
    paySuccessMultiplier: 3.0,
  },
};

const JOBS_BY_WEALTH: Record<FamilyWealth, string[]> = {
  struggling: [
    'Cashier',
    'Delivery Driver',
    'Dishwasher',
    'Factory Worker',
    'Janitor',
    'Street Vendor',
    'Warehouse Worker',
  ],
  modest: [
    'Auto Mechanic',
    'Bus Driver',
    'Baker',
    'Barber',
    'Carpenter',
    'Electrician',
    'Postal Worker',
    'Receptionist',
    'Shopkeeper',
  ],
  comfortable: [
    'Accountant',
    'Civil Engineer',
    'Graphic Designer',
    'High School Teacher',
    'Marketing Manager',
    'Pharmacist',
    'Registered Nurse',
    'Software Developer',
  ],
  wealthy: [
    'Airline Pilot',
    'Architect',
    'Corporate Lawyer',
    'Heart Surgeon',
    'Hospital Director',
    'Business Executive',
    'Real Estate Developer',
  ],
};

const BIRTH_FLAVOR_LINES: string[] = [
  'The doctor said you had the loudest lungs in the maternity ward.',
  'You opened your eyes right away and wrapped your hand around your mother’s finger.',
  'You slept peacefully through your entire first day on Earth.',
  'You were born with a thick tuft of hair that made all the nurses smile.',
  'Your father nearly fainted from excitement in the delivery room.',
  'You arrived two weeks early, catching your parents completely by surprise.',
];

/**
 * Generates a pair of parents and family background for a newborn character.
 */
export function generateParents(familyLastName: string): ParentsInfo {
  const { tier: wealth } = pickWeighted<{ tier: FamilyWealth; weight: number }>([
    { tier: 'struggling', weight: 18 },
    { tier: 'modest', weight: 42 },
    { tier: 'comfortable', weight: 28 },
    { tier: 'wealthy', weight: 12 },
  ]);

  const jobs = JOBS_BY_WEALTH[wealth];
  const fatherAge = randomInt(24, 38);
  const motherAge = Math.max(21, fatherAge + randomInt(-4, 3));

  return {
    wealth,
    father: {
      id: createId(),
      role: 'father',
      firstName: pickRandom(MALE_NAMES),
      lastName: familyLastName,
      age: fatherAge,
      occupation: pickRandom(jobs),
      isAlive: true,
      relationship: randomInt(78, 96),
      generosity: randomInt(45, 95),
    },
    mother: {
      id: createId(),
      role: 'mother',
      firstName: pickRandom(FEMALE_NAMES),
      lastName: familyLastName,
      age: motherAge,
      occupation: pickRandom(jobs),
      isAlive: true,
      relationship: randomInt(82, 98),
      generosity: randomInt(50, 95),
    },
  };
}

/**
 * Builds the detailed Age 0 birth journal entry introducing the baby, birth weight, and parents.
 */
export function createBirthJournalEntry(params: {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'non-binary';
  city: string;
  country: string;
  birthYear: number;
  parents: ParentsInfo;
}): LifeEvent {
  const { firstName, lastName, gender, city, country, birthYear, parents } = params;
  const genderLabel = gender === 'male' ? 'baby boy' : gender === 'female' ? 'baby girl' : 'baby';
  const pounds = randomInt(6, 9);
  const ounces = randomInt(1, 15);
  const flavor = pickRandom(BIRTH_FLAVOR_LINES);
  const wealthText = WEALTH_META[parents.wealth].label.toLowerCase();

  const message =
    `You were born a ${genderLabel} in ${city}, ${country}, weighing ${pounds} lbs ${ounces} oz. ` +
    `Your name is ${firstName} ${lastName}. ` +
    `Your parents are ${parents.father.firstName} ${parents.father.lastName} (age ${parents.father.age}, ${parents.father.occupation}) ` +
    `and ${parents.mother.firstName} ${parents.mother.lastName} (age ${parents.mother.age}, ${parents.mother.occupation}), ` +
    `living a ${wealthText} life. ${flavor}`;

  return {
    id: createId(),
    age: 0,
    year: birthYear,
    title: 'Welcome to the World!',
    message,
    category: 'birth',
    icon: '👶',
  };
}

