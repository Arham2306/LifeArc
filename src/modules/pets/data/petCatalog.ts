import type { PetListing, PetSpeciesId, PetTemperament } from '../types';

export const PET_CATALOG: readonly PetListing[] = [
  {
    id: 'pet_dog',
    name: 'Dog',
    adoptionPrice: 80,
    foodPrice: 40,
    lifespan: 12,
    frailAge: 10,
    playActivity: 'Walk',
    attachmentGain: 8,
    missedYearHealthLoss: 12,
  },
  {
    id: 'pet_cat',
    name: 'Cat',
    adoptionPrice: 50,
    foodPrice: 30,
    lifespan: 16,
    frailAge: 14,
    playActivity: 'Floor play',
    attachmentGain: 6,
    missedYearHealthLoss: 8,
  },
  {
    id: 'pet_rabbit',
    name: 'Rabbit',
    adoptionPrice: 35,
    foodPrice: 20,
    lifespan: 8,
    frailAge: 6,
    playActivity: 'Grass play',
    attachmentGain: 5,
    missedYearHealthLoss: 14,
  },
];

const LISTINGS = new Map<PetSpeciesId, PetListing>(PET_CATALOG.map((listing) => [listing.id, listing]));

export function getPetListing(id: string): PetListing | null {
  return LISTINGS.get(id as PetSpeciesId) ?? null;
}

export function temperamentAttachmentGain(listing: PetListing, temperament: PetTemperament): number {
  if (temperament === 'shy') return listing.attachmentGain - 2;
  return listing.attachmentGain;
}

/** Annual neglect health loss. Steady pets lose 4 less. Not applied until the year simulation. */
export function missedYearHealthLoss(listing: PetListing, temperament: PetTemperament): number {
  if (temperament === 'steady') return listing.missedYearHealthLoss - 4;
  return listing.missedYearHealthLoss;
}
