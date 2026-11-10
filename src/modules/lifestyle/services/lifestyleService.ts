import type { CharacterProfile, LifeEvent } from '../../../types/game';
import { stampPlayerNetWorth } from '../../assets/services/assetService';
import { applyEffects } from '../../character/services/statService';
import { createId } from '../../../utils/id';
import { activityOutcome, bookOutcome } from '../data/activityOutcomes';
import { getPossessionListing } from '../data/possessionCatalog';
import type {
  HobbyId,
  HobbyRecord,
  OwnedPossession,
  PossessionKind,
  PossessionStatus,
} from '../types';

export const LIFESTYLE_MIN_AGE = 16;
export const POSSESSION_CAP = 8;
export const RESALE_RATE = 0.4;
export const HOBBY_LEVEL_CAP = 5;

const HOBBY_IDS: readonly HobbyId[] = ['gaming', 'music'];
const KINDS: readonly PossessionKind[] = ['durable', 'consumable'];
const STATUSES: readonly PossessionStatus[] = ['owned', 'read'];

export interface LifestyleResult {
  character: CharacterProfile;
  ok: boolean;
  reason?: string;
}

export function resaleValue(purchasePrice: number): number {
  return Math.round(purchasePrice * RESALE_RATE);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rawPossessions(character: CharacterProfile): unknown[] {
  const possessions = character.lifestyle?.possessions;
  return Array.isArray(possessions) ? possessions : [];
}

function rawHobbies(character: CharacterProfile): unknown[] {
  const hobbies = character.lifestyle?.hobbies;
  return Array.isArray(hobbies) ? hobbies : [];
}

function readingGainAgeOf(character: CharacterProfile): number | null {
  const age = character.lifestyle?.readingGainAge;
  return finiteNumber(age) ? age : null;
}

export function isValidPossession(value: unknown): value is OwnedPossession {
  if (!isPlainRecord(value)) return false;
  if (typeof value.id !== 'string' || value.id.trim() === '') return false;
  if (typeof value.catalogId !== 'string') return false;
  const listing = getPossessionListing(value.catalogId);
  if (!listing) return false;
  if (value.kind !== listing.kind || !KINDS.includes(value.kind as PossessionKind)) return false;
  if (!finiteNumber(value.purchasePrice) || value.purchasePrice < 0) return false;
  if (!finiteNumber(value.purchaseAge) || value.purchaseAge < 0) return false;
  if (!STATUSES.includes(value.status as PossessionStatus)) return false;
  if (listing.kind === 'durable' && value.status !== 'owned') return false;
  return true;
}

export function isValidHobby(value: unknown): value is HobbyRecord {
  if (!isPlainRecord(value)) return false;
  if (!HOBBY_IDS.includes(value.id as HobbyId)) return false;
  if (!finiteNumber(value.level) || !Number.isInteger(value.level)) return false;
  if (value.level < 0 || value.level > HOBBY_LEVEL_CAP) return false;
  if (value.lastActionAge === null) return true;
  return finiteNumber(value.lastActionAge) && value.lastActionAge >= 0;
}

export function validPossessions(character: CharacterProfile): OwnedPossession[] {
  return rawPossessions(character).filter(isValidPossession);
}

export function validHobbies(character: CharacterProfile): HobbyRecord[] {
  return rawHobbies(character).filter(isValidHobby);
}

function fail(character: CharacterProfile, reason: string): LifestyleResult {
  return { character, ok: false, reason };
}

function spendableCash(character: CharacterProfile): number {
  return finiteNumber(character.cash) && character.cash > 0 ? character.cash : 0;
}

function withLifestyle(
  character: CharacterProfile,
  possessions: unknown[],
  hobbies: unknown[],
  readingGainAge: number | null,
): CharacterProfile {
  return {
    ...character,
    lifestyle: {
      possessions,
      hobbies,
      readingGainAge,
    },
  };
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
  cashDelta: number,
  statDelta: { smarts?: number },
  entry: LifeEvent,
): CharacterProfile {
  const paid = cashDelta !== 0 || statDelta.smarts
    ? applyEffects(character, {
        ...(cashDelta !== 0 ? { cash: cashDelta } : {}),
        ...(statDelta.smarts ? { smarts: statDelta.smarts } : {}),
      }).character
    : character;
  return stampPlayerNetWorth({
    ...paid,
    timeline: [...paid.timeline, entry],
  });
}

function requireAge(character: CharacterProfile): LifestyleResult | null {
  if (character.age < LIFESTYLE_MIN_AGE) {
    return fail(character, 'You can shop for this from age 16.');
  }
  return null;
}

function ownedEquipment(character: CharacterProfile, hobby: HobbyId): OwnedPossession | null {
  const matches = validPossessions(character).filter((item) => {
    const listing = getPossessionListing(item.catalogId);
    return listing?.hobby === hobby && listing.kind === 'durable' && item.status === 'owned';
  });
  return matches.find((item) => getPossessionListing(item.catalogId)?.tier === 'upgrade') ?? matches[0] ?? null;
}

function hobbyRecord(character: CharacterProfile, hobby: HobbyId): HobbyRecord | null {
  return validHobbies(character).find((entry) => entry.id === hobby) ?? null;
}

function schoolMusicYears(character: CharacterProfile): number {
  const years = character.education?.disciplines?.music?.totalYears;
  return finiteNumber(years) && years > 0 ? years : 0;
}

export function buyPossession(character: CharacterProfile, catalogId: string): LifestyleResult {
  const tooYoung = requireAge(character);
  if (tooYoung) return tooYoung;
  const listing = getPossessionListing(catalogId);
  if (!listing) return fail(character, 'That item is not for sale.');
  const owned = validPossessions(character);
  if (owned.some((item) => item.catalogId === listing.id)) {
    return fail(character, 'You already own this.');
  }
  if (listing.hobby) {
    const current = ownedEquipment(character, listing.hobby);
    if (current && listing.tier === 'upgrade' && current.catalogId === listing.replaces) {
      return fail(character, 'Replace the one you already own.');
    }
    if (current) return fail(character, 'You already have something for this hobby.');
  }
  if (owned.length >= POSSESSION_CAP) return fail(character, 'Your shelf is full.');
  if (spendableCash(character) < listing.price) {
    return fail(character, 'You do not have enough cash.');
  }

  const item: OwnedPossession = {
    id: createId(),
    catalogId: listing.id,
    kind: listing.kind,
    purchasePrice: listing.price,
    purchaseAge: character.age,
    status: 'owned',
  };
  const next = withLifestyle(
    character,
    [...rawPossessions(character), item],
    rawHobbies(character),
    readingGainAgeOf(character),
  );
  return {
    ok: true,
    character: commit(
      next,
      -listing.price,
      {},
      journal(character, 'money', `Bought ${listing.name}`, `You bought ${listing.name} for $${listing.price.toLocaleString()}.`),
    ),
  };
}

export function replaceEquipment(character: CharacterProfile, upgradeCatalogId: string): LifestyleResult {
  const tooYoung = requireAge(character);
  if (tooYoung) return tooYoung;
  const upgrade = getPossessionListing(upgradeCatalogId);
  if (!upgrade || !upgrade.replaces) return fail(character, 'That item is not an upgrade.');
  const starter = validPossessions(character).find(
    (item) => item.catalogId === upgrade.replaces && item.status === 'owned',
  );
  if (!starter) return fail(character, 'You do not own the item this replaces.');
  if (validPossessions(character).some((item) => item.catalogId === upgrade.id)) {
    return fail(character, 'You already own this.');
  }
  const credit = resaleValue(starter.purchasePrice);
  const netDue = upgrade.price - credit;
  if (spendableCash(character) < netDue) return fail(character, 'You do not have enough cash.');

  const replacement: OwnedPossession = {
    id: createId(),
    catalogId: upgrade.id,
    kind: upgrade.kind,
    purchasePrice: upgrade.price,
    purchaseAge: character.age,
    status: 'owned',
  };
  let removed = false;
  const possessions = rawPossessions(character).flatMap((entry) => {
    if (!removed && isValidPossession(entry) && entry.id === starter.id) {
      removed = true;
      return [];
    }
    return [entry];
  });
  const next = withLifestyle(
    character,
    [...possessions, replacement],
    rawHobbies(character),
    readingGainAgeOf(character),
  );
  const starterName = getPossessionListing(starter.catalogId)?.name ?? 'the old one';
  return {
    ok: true,
    character: commit(
      next,
      -netDue,
      {},
      journal(
        character,
        'money',
        `Upgraded to ${upgrade.name}`,
        `You sold the ${starterName} for $${credit.toLocaleString()} and bought a ${upgrade.name} for $${upgrade.price.toLocaleString()}.`,
      ),
    ),
  };
}

export function sellDurable(character: CharacterProfile, possessionId: string): LifestyleResult {
  const tooYoung = requireAge(character);
  if (tooYoung) return tooYoung;
  const item = validPossessions(character).find((entry) => entry.id === possessionId);
  if (!item) return fail(character, 'You do not own that.');
  if (item.kind !== 'durable' || item.status !== 'owned') {
    return fail(character, 'That item cannot be sold.');
  }
  let removed = false;
  const possessions = rawPossessions(character).flatMap((entry) => {
    if (!removed && isValidPossession(entry) && entry.id === item.id) {
      removed = true;
      return [];
    }
    return [entry];
  });
  const credit = resaleValue(item.purchasePrice);
  const next = withLifestyle(character, possessions, rawHobbies(character), readingGainAgeOf(character));
  const name = getPossessionListing(item.catalogId)?.name ?? 'item';
  return {
    ok: true,
    character: commit(
      next,
      credit,
      {},
      journal(character, 'money', `Sold ${name}`, `You sold the ${name} for $${credit.toLocaleString()}.`),
    ),
  };
}

export function readBook(character: CharacterProfile, possessionId: string): LifestyleResult {
  const tooYoung = requireAge(character);
  if (tooYoung) return tooYoung;
  const item = validPossessions(character).find((entry) => entry.id === possessionId);
  if (!item || item.kind !== 'consumable') return fail(character, 'You do not have that book.');
  if (item.status === 'read') return fail(character, 'You already read this.');
  const listing = getPossessionListing(item.catalogId);
  if (!listing) return fail(character, 'You do not have that book.');

  const grant = readingGainAgeOf(character) !== character.age;
  let updated = false;
  const possessions = rawPossessions(character).map((entry) => {
    if (!updated && isValidPossession(entry) && entry.id === item.id) {
      updated = true;
      return { ...entry, status: 'read' as const };
    }
    return entry;
  });
  const next = withLifestyle(
    character,
    possessions,
    rawHobbies(character),
    grant ? character.age : readingGainAgeOf(character),
  );
  const scene = bookOutcome(listing.name, grant);
  return {
    ok: true,
    character: commit(next, 0, grant ? { smarts: 1 } : {}, journal(character, 'social', scene.title, scene.message)),
  };
}

function performHobby(character: CharacterProfile, hobby: HobbyId): LifestyleResult {
  const tooYoung = requireAge(character);
  if (tooYoung) return tooYoung;
  const equipment = ownedEquipment(character, hobby);
  if (!equipment) return fail(character, 'You need the equipment first.');
  const current = hobbyRecord(character, hobby);
  if (current && current.lastActionAge === character.age) {
    return fail(character, 'You already did that this year.');
  }
  const level = current?.level ?? 0;
  const scene = activityOutcome({
    hobby,
    level,
    equipmentId: equipment.catalogId,
    schoolMusicYears: hobby === 'music' ? schoolMusicYears(character) : 0,
  });
  const nextRecord: HobbyRecord = {
    id: hobby,
    level: Math.min(HOBBY_LEVEL_CAP, level + 1),
    lastActionAge: character.age,
  };
  let replaced = false;
  const hobbies = rawHobbies(character).map((entry) => {
    if (!replaced && isValidHobby(entry) && entry.id === hobby) {
      replaced = true;
      return nextRecord;
    }
    return entry;
  });
  if (!replaced) hobbies.push(nextRecord);
  const next = withLifestyle(character, rawPossessions(character), hobbies, readingGainAgeOf(character));
  return {
    ok: true,
    character: commit(next, 0, {}, journal(character, 'social', scene.title, scene.message)),
  };
}

export function playGame(character: CharacterProfile): LifestyleResult {
  return performHobby(character, 'gaming');
}

export function practiceMusic(character: CharacterProfile): LifestyleResult {
  return performHobby(character, 'music');
}
