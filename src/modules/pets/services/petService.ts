import type { CharacterProfile, LifeEvent, StatEffects } from '../../../types/game';
import { stampPlayerNetWorth } from '../../assets/services/assetService';
import { applyEffects } from '../../character/services/statService';
import { createId } from '../../../utils/id';
import {
  getPetListing,
  missedYearHealthLoss,
  temperamentAttachmentGain,
} from '../data/petCatalog';
import type {
  AttachmentBand,
  CareMoment,
  PetRecord,
  PetSpeciesId,
  PetStatus,
  PetTemperament,
} from '../types';

export const PET_ADOPT_AGE = 16;
export const LIVING_PET_CAP = 2;
export const VET_PRICE = 90;

const START_PET_AGE = 1;
const START_HEALTH = 80;
const START_ATTACHMENT = 20;
const FEED_HEALTH = 8;
const FEED_ATTACHMENT = 2;
const PLAY_HAPPINESS = 2;
const VET_HEALTH = 80;
const VET_ATTACHMENT = 2;
const REHOME_HAPPINESS = -6;
const NEGLECT_ATTACHMENT = 6;
const FRAIL_HEALTH = 45;
const DEATH_HAPPINESS = -8;

const TEMPERAMENTS: readonly PetTemperament[] = ['playful', 'shy', 'steady'];
const STATUSES: readonly PetStatus[] = ['living', 'rehomed', 'memorial'];

export interface PetResult {
  character: CharacterProfile;
  ok: boolean;
  reason?: string;
}

export interface PetYearProgress {
  animals: unknown[];
  cashSpent: number;
  happinessDelta: number;
  events: LifeEvent[];
}

function finiteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function score(value: unknown): value is number {
  return finiteInteger(value) && value >= 0 && value <= 100;
}

function ageOrNull(value: unknown): value is number | null {
  if (value === null) return true;
  return finiteInteger(value) && value >= 0;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function rawAnimals(character: CharacterProfile): unknown[] {
  const animals = character.pets?.animals;
  return Array.isArray(animals) ? animals : [];
}

function spendableCash(character: CharacterProfile): number {
  return typeof character.cash === 'number' && Number.isFinite(character.cash) && character.cash > 0
    ? character.cash
    : 0;
}

function fail(character: CharacterProfile, reason: string): PetResult {
  return { character, ok: false, reason };
}

export function attachmentBand(attachment: number): AttachmentBand {
  if (attachment <= 24) return 'distant';
  if (attachment <= 59) return 'familiar';
  return 'close';
}

export function adoptionMemory(name: string): string {
  return `You brought ${name} home from the shelter.`;
}

function feedSentence(name: string, band: AttachmentBand): string {
  if (band === 'close') return `You put ${name}'s food down and they stayed near your hand.`;
  if (band === 'familiar') return `You fed ${name} and they ate while you were still in the room.`;
  return `You fed ${name}. They waited until you stepped back.`;
}

function playSentence(species: PetSpeciesId, name: string, band: AttachmentBand): string {
  if (species === 'pet_cat') {
    if (band === 'close') return `${name} played on the floor beside you and leaned into your hand.`;
    if (band === 'familiar') return `You played with ${name} on the floor.`;
    return `${name} took the floor and kept a little away.`;
  }
  if (species === 'pet_rabbit') {
    if (band === 'close') return `${name} stayed in the grass beside you and leaned in when you stopped.`;
    if (band === 'familiar') return `You played with ${name} in the grass.`;
    return `${name} took the grass and kept a little ahead.`;
  }
  if (band === 'close') return `${name} walked beside you and leaned in when you stopped.`;
  if (band === 'familiar') return `You walked ${name} around the block.`;
  return `${name} took the walk and kept a little ahead.`;
}

function vetSentence(name: string, band: AttachmentBand): string {
  if (band === 'close') return `The vet looked over ${name} while they stayed against you.`;
  if (band === 'familiar') return `You took ${name} to the vet and waited with them.`;
  return `You took ${name} to the vet. They kept to the far side of the table.`;
}

function neglectSentence(name: string, band: AttachmentBand): string {
  if (band === 'close') return `${name} waited by the bowl and you were not there to fill it.`;
  if (band === 'familiar') return `${name} got through the year with an empty bowl.`;
  return `${name} managed the year without coming to find you.`;
}

export function careSentence(
  moment: CareMoment,
  species: PetSpeciesId,
  name: string,
  attachment: number,
): string {
  const band = attachmentBand(attachment);
  if (moment === 'play') return playSentence(species, name, band);
  if (moment === 'feed') return feedSentence(name, band);
  if (moment === 'vet') return vetSentence(name, band);
  return neglectSentence(name, band);
}

export function petClosingLine(name: string, lastMoment: string): string {
  if (typeof lastMoment === 'string' && lastMoment.trim() !== '') return lastMoment;
  return adoptionMemory(name);
}

export function isValidPet(value: unknown): value is PetRecord {
  if (!isPlainRecord(value)) return false;
  if (!nonEmptyString(value.id) || !nonEmptyString(value.name)) return false;
  if (typeof value.species !== 'string' || !getPetListing(value.species)) return false;
  if (!TEMPERAMENTS.includes(value.temperament as PetTemperament)) return false;
  if (!finiteInteger(value.petAge) || value.petAge < 1) return false;
  if (!finiteInteger(value.adoptedAtAge) || value.adoptedAtAge < 0) return false;
  if (!score(value.health) || !score(value.attachment)) return false;
  if (!ageOrNull(value.lastFedAge) || !ageOrNull(value.lastPlayedAge) || !ageOrNull(value.lastVetAge)) {
    return false;
  }
  if (!nonEmptyString(value.lastMoment)) return false;
  if (!STATUSES.includes(value.status as PetStatus)) return false;
  if (value.status === 'rehomed' || value.status === 'memorial') {
    if (!nonEmptyString(value.closingLine)) return false;
    if (!finiteInteger(value.closedAtAge) || value.closedAtAge < 0) return false;
  }
  return true;
}

export function validPets(character: CharacterProfile): PetRecord[] {
  return rawAnimals(character).filter(isValidPet);
}

export function livingPets(character: CharacterProfile): PetRecord[] {
  return validPets(character).filter((pet) => pet.status === 'living');
}

function livingPet(character: CharacterProfile, petId: string): PetRecord | null {
  return livingPets(character).find((pet) => pet.id === petId) ?? null;
}

function replaceLiving(animals: unknown[], petId: string, next: PetRecord): unknown[] | null {
  let replaced = false;
  const updated = animals.map((entry) => {
    if (!replaced && isValidPet(entry) && entry.status === 'living' && entry.id === petId) {
      replaced = true;
      return next;
    }
    return entry;
  });
  return replaced ? updated : null;
}

function journal(
  character: CharacterProfile,
  category: LifeEvent['category'],
  title: string,
  message: string,
): LifeEvent {
  return {
    id: createId(),
    age: character.age,
    year: character.birthYear + character.age,
    title,
    message,
    category,
  };
}

function commit(
  character: CharacterProfile,
  animals: unknown[],
  effects: StatEffects,
  entry?: LifeEvent,
): CharacterProfile {
  const paid = applyEffects({ ...character, pets: { animals } }, effects).character;
  if (!entry) return paid;
  return stampPlayerNetWorth({
    ...paid,
    timeline: [...paid.timeline, entry],
  });
}

export function adoptPet(
  character: CharacterProfile,
  speciesId: string,
  temperament: string,
  name: string,
): PetResult {
  if (character.age < PET_ADOPT_AGE) return fail(character, 'You can adopt a pet from age 16.');
  const listing = getPetListing(speciesId);
  if (!listing) return fail(character, 'That animal is not at the shelter.');
  if (!TEMPERAMENTS.includes(temperament as PetTemperament)) return fail(character, 'Choose a temperament.');
  if (!nonEmptyString(name)) return fail(character, 'Give your pet a name.');
  if (livingPets(character).length >= LIVING_PET_CAP) return fail(character, 'Your home already has two pets.');
  if (spendableCash(character) < listing.adoptionPrice) return fail(character, 'You do not have enough cash.');

  const petName = name.trim();
  const pet: PetRecord = {
    id: createId(),
    name: petName,
    species: listing.id,
    temperament: temperament as PetTemperament,
    petAge: START_PET_AGE,
    adoptedAtAge: character.age,
    health: START_HEALTH,
    attachment: START_ATTACHMENT,
    lastFedAge: null,
    lastPlayedAge: null,
    lastVetAge: null,
    lastMoment: adoptionMemory(petName),
    status: 'living',
  };
  return {
    ok: true,
    character: commit(
      character,
      [...rawAnimals(character), pet],
      { cash: -listing.adoptionPrice },
      journal(
        character,
        'money',
        `Brought ${petName} home`,
        `${pet.lastMoment} You spent $${listing.adoptionPrice}.`,
      ),
    ),
  };
}

export function feedPet(character: CharacterProfile, petId: string): PetResult {
  const pet = livingPet(character, petId);
  if (!pet) return fail(character, 'That pet is not in your home.');
  if (pet.lastFedAge === character.age) return fail(character, 'You already fed them this year.');
  const listing = getPetListing(pet.species);
  if (!listing) return fail(character, 'That pet is not in your home.');
  if (spendableCash(character) < listing.foodPrice) return fail(character, 'You do not have enough cash.');

  const health = clampScore(pet.health + FEED_HEALTH);
  const attachment = clampScore(pet.attachment + FEED_ATTACHMENT);
  const next: PetRecord = {
    ...pet,
    health,
    attachment,
    lastFedAge: character.age,
    lastMoment: careSentence('feed', pet.species, pet.name, attachment),
  };
  const animals = replaceLiving(rawAnimals(character), pet.id, next);
  if (!animals) return fail(character, 'That pet is not in your home.');
  return {
    ok: true,
    character: commit(character, animals, { cash: -listing.foodPrice }),
  };
}

export function playWithPet(character: CharacterProfile, petId: string): PetResult {
  const pet = livingPet(character, petId);
  if (!pet) return fail(character, 'That pet is not in your home.');
  if (pet.lastPlayedAge === character.age) return fail(character, 'You already played with them this year.');
  const listing = getPetListing(pet.species);
  if (!listing) return fail(character, 'That pet is not in your home.');

  const attachment = clampScore(pet.attachment + temperamentAttachmentGain(listing, pet.temperament));
  const next: PetRecord = {
    ...pet,
    attachment,
    lastPlayedAge: character.age,
    lastMoment: careSentence('play', pet.species, pet.name, attachment),
  };
  const animals = replaceLiving(rawAnimals(character), pet.id, next);
  if (!animals) return fail(character, 'That pet is not in your home.');
  return {
    ok: true,
    character: commit(character, animals, { happiness: PLAY_HAPPINESS }),
  };
}

function needsVet(pet: PetRecord): boolean {
  const listing = getPetListing(pet.species);
  if (!listing) return false;
  return pet.petAge >= listing.frailAge || pet.health < 50;
}

export function visitVet(character: CharacterProfile, petId: string): PetResult {
  const pet = livingPet(character, petId);
  if (!pet) return fail(character, 'That pet is not in your home.');
  if (pet.lastVetAge === character.age) return fail(character, 'Already seen the vet this year.');
  if (!needsVet(pet)) {
    return fail(character, 'Vet care becomes available when your pet is older or needs medical attention.');
  }
  if (spendableCash(character) < VET_PRICE) return fail(character, 'You do not have enough cash.');

  const attachment = clampScore(pet.attachment + VET_ATTACHMENT);
  const next: PetRecord = {
    ...pet,
    health: VET_HEALTH,
    attachment,
    lastVetAge: character.age,
    lastMoment: careSentence('vet', pet.species, pet.name, attachment),
  };
  const animals = replaceLiving(rawAnimals(character), pet.id, next);
  if (!animals) return fail(character, 'That pet is not in your home.');
  return {
    ok: true,
    character: commit(character, animals, { cash: -VET_PRICE }),
  };
}

export function rehomePet(character: CharacterProfile, petId: string): PetResult {
  const pet = livingPet(character, petId);
  if (!pet) return fail(character, 'That pet is not in your home.');

  const closingLine = petClosingLine(pet.name, pet.lastMoment);
  const next: PetRecord = {
    ...pet,
    status: 'rehomed',
    closedAtAge: character.age,
    closingLine,
  };
  const animals = replaceLiving(rawAnimals(character), pet.id, next);
  if (!animals) return fail(character, 'That pet is not in your home.');
  return {
    ok: true,
    character: commit(
      character,
      animals,
      { happiness: REHOME_HAPPINESS },
      journal(
        character,
        'relationship',
        `Found ${pet.name} another home`,
        `You found ${pet.name} another home. ${closingLine}`,
      ),
    ),
  };
}

function poolAmount(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Settles food, age, frailty, and death for one player-age.
 * Does not change `character.cash`, call `applyEffects`, or stamp net worth.
 * `yearSettled` is `character.age`. Death events use the age being entered.
 */
export function progressPetsForYear(character: CharacterProfile, spendable: number): PetYearProgress {
  const stored = character.pets?.animals;
  if (!Array.isArray(stored)) {
    return { animals: [], cashSpent: 0, happinessDelta: 0, events: [] };
  }

  const yearSettled = character.age;
  const nextAge = yearSettled + 1;
  const nextYear = character.birthYear + nextAge;
  let remaining = poolAmount(spendable);
  let cashSpent = 0;
  let happinessDelta = 0;
  const events: LifeEvent[] = [];

  const animals = stored.map((entry) => {
    if (!isValidPet(entry) || entry.status !== 'living') return entry;
    const listing = getPetListing(entry.species);
    if (!listing) return entry;

    let pet: PetRecord = { ...entry };
    if (pet.lastFedAge !== yearSettled) {
      const arrivalYear = pet.adoptedAtAge === yearSettled;
      if (remaining >= listing.foodPrice) {
        remaining -= listing.foodPrice;
        cashSpent += listing.foodPrice;
        pet = { ...pet, lastFedAge: yearSettled };
      } else if (!arrivalYear) {
        const attachmentBefore = pet.attachment;
        pet = {
          ...pet,
          health: clampScore(pet.health - missedYearHealthLoss(listing, pet.temperament)),
          attachment: clampScore(pet.attachment - NEGLECT_ATTACHMENT),
          lastMoment: careSentence('neglect', pet.species, pet.name, attachmentBefore),
        };
      }
    }

    pet = { ...pet, petAge: pet.petAge + 1 };
    if (pet.health === 0 || pet.petAge > listing.lifespan) {
      const closingLine = petClosingLine(pet.name, pet.lastMoment);
      happinessDelta += DEATH_HAPPINESS;
      events.push({
        id: `pet-memorial-${pet.id}-${nextAge}`,
        age: nextAge,
        year: nextYear,
        title: pet.name,
        message: `${pet.name} died at ${pet.petAge}. ${closingLine}`,
        category: 'misfortune',
      });
      return {
        ...pet,
        status: 'memorial' as const,
        closedAtAge: nextAge,
        closingLine,
      };
    }

    if (pet.petAge >= listing.frailAge && pet.lastVetAge !== yearSettled && pet.health > FRAIL_HEALTH) {
      pet = { ...pet, health: FRAIL_HEALTH };
    }
    return pet;
  });

  return { animals, cashSpent, happinessDelta, events };
}
