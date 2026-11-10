import type { CharacterProfile } from '../../../types/game';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { calculatePlayerNetWorth } from '../../assets/services/assetService';
import { getPropertyListing } from '../../assets/data/propertyCatalog';
import type { OwnedProperty } from '../../assets/types';
import { lifestyleIllustrationId } from '../data/illustrationIds';
import { getPossessionListing } from '../data/possessionCatalog';
import {
  buyPossession,
  playGame,
  practiceMusic,
  readBook,
  replaceEquipment,
  sellDurable,
  validHobbies,
  validPossessions,
} from '../services/lifestyleService';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function character(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_lifestyle',
    firstName: 'Mina',
    lastName: 'Cole',
    gender: 'female',
    age: 16,
    birthYear: 2000,
    city: 'Austin',
    country: 'United States',
    isAlive: true,
    stats: { health: 80, happiness: 70, smarts: 40, looks: 60, karma: 55 },
    cash: 5000,
    bankBalance: 800,
    netWorth: 5800,
    occupation: 'Unemployed',
    parents: {
      father: {
        id: 'dad',
        role: 'father',
        firstName: 'Owen',
        lastName: 'Cole',
        age: 45,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      mother: {
        id: 'mom',
        role: 'mother',
        firstName: 'Irene',
        lastName: 'Cole',
        age: 43,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      wealth: 'comfortable',
    },
    relationships: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function home(): OwnedProperty {
  const listing = getPropertyListing('studio_austin_loft');
  if (!listing) throw new Error('Missing loft listing');
  return {
    id: 'loft-1',
    catalogId: listing.id,
    type: listing.type,
    name: listing.name,
    city: listing.city,
    purchasePrice: listing.purchasePrice,
    purchaseAge: 18,
    marketValue: 88000,
    mortgage: null,
  };
}

function bookCopy(id: string, catalogId = 'book_short_stories') {
  return {
    id,
    catalogId,
    kind: 'consumable' as const,
    purchasePrice: 12,
    purchaseAge: 16,
    status: 'owned' as const,
  };
}

const young = character({ age: 15, cash: 5000 });
const refusedAge = buyPossession(young, 'book_short_stories');
assert(refusedAge.ok === false && refusedAge.character === young, 'under 16 returns the same character');

const broke = character({ cash: 10, bankBalance: 9000 });
const refusedCash = buyPossession(broke, 'book_short_stories');
assert(refusedCash.ok === false && refusedCash.character === broke, 'unaffordable purchase returns the same character');
assert(broke.bankBalance === 9000 && broke.cash === 10, 'bank balance is not a wallet');

const buyer = character({ cash: 5000, bankBalance: 800, assets: { properties: [home()] } });
const beforeWorth = calculatePlayerNetWorth(buyer);
const bought = buyPossession(buyer, 'computer_home');
assert(bought.ok, 'home computer purchase succeeds');
const owner = bought.character;
assert(owner.cash === 4350, 'cash falls by the catalog price once');
assert(owner.stats.happiness === buyer.stats.happiness, 'purchase does not change happiness');
assert(owner.bankBalance === 800, 'bank balance stays put');
assert(owner.assets?.properties?.[0] === buyer.assets?.properties?.[0], 'property record is untouched');
const deed = owner.assets?.properties?.[0] as OwnedProperty;
assert(deed.marketValue === 88000, 'property market value stays 88000');
assert(calculatePlayerNetWorth(owner) === beforeWorth - 650, 'net worth moves only by the cash delta');
assert(owner.netWorth === calculatePlayerNetWorth(owner), 'stored net worth matches the formula');
assert(validPossessions(owner).length === 1, 'one possession is recorded');
assert(owner.timeline.length === 1 && owner.timeline[0]?.category === 'money', 'purchase writes one money event');
assert(!buyer.lifestyle, 'the original character still has no lifestyle field');

const noShelf = character();
assert(calculatePlayerNetWorth(noShelf) === 5800, 'a life with no lifestyle field keeps the existing net worth');

const upgradeOnly = buyPossession(character({ cash: 3000 }), 'computer_rig');
assert(upgradeOnly.ok && upgradeOnly.character.cash === 900, 'buying the rig with nothing owned charges the full price');

const starter = buyPossession(character({ cash: 3000 }), 'computer_home').character;
const blockedUpgrade = buyPossession(starter, 'computer_rig');
assert(blockedUpgrade.character === starter, 'an upgrade while the starter is owned is not a normal purchase');

const shortOnReplace = {
  ...starter,
  cash: 100,
  lifestyle: {
    possessions: [
      {
        ...validPossessions(starter)[0]!,
        purchasePrice: 650,
      },
    ],
    hobbies: [{ id: 'gaming' as const, level: 3, lastActionAge: 16 }],
  },
};
const failedReplace = replaceEquipment(shortOnReplace, 'computer_rig');
assert(failedReplace.character === shortOnReplace, 'an unaffordable replacement returns the same character');
assert(validPossessions(failedReplace.character).some((item) => item.catalogId === 'computer_home'), 'the starter stays');
assert(!validPossessions(failedReplace.character).some((item) => item.catalogId === 'computer_rig'), 'the upgrade is not added');

const ready = {
  ...starter,
  cash: 2000,
  lifestyle: {
    possessions: validPossessions(starter),
    hobbies: [{ id: 'gaming' as const, level: 3, lastActionAge: 15 }],
  },
};
const replaced = replaceEquipment(ready, 'computer_rig');
assert(replaced.ok, 'replacement succeeds when the net amount is covered');
const upgraded = replaced.character;
assert(upgraded.cash === 2000 - (2100 - Math.round(650 * 0.4)), 'one cash delta equals price minus resale');
assert(validPossessions(upgraded).length === 1 && validPossessions(upgraded)[0]?.catalogId === 'computer_rig', 'the starter is gone and the rig is owned');
assert(validPossessions(upgraded)[0]?.purchasePrice === 2100, 'the new possession stores the catalog price');
assert(validHobbies(upgraded)[0]?.level === 3 && validHobbies(upgraded)[0]?.lastActionAge === 15, 'hobby level and last action age stay');
assert(upgraded.timeline.filter((event) => event.category === 'money').length === starter.timeline.length + 1, 'replacement writes one money line');

const customPrice = character({
  cash: 1000,
  lifestyle: {
    possessions: [{
      id: 'custom-pc',
      catalogId: 'computer_home',
      kind: 'durable',
      purchasePrice: 500,
      purchaseAge: 16,
      status: 'owned',
    }],
    hobbies: [],
  },
});
const soldCustom = sellDurable(customPrice, 'custom-pc');
assert(soldCustom.ok && soldCustom.character.cash === 1200, 'resale uses the stored purchase price');
assert(soldCustom.character.timeline[0]?.message.includes('$200'), 'the timeline names the stored-price credit');

const novel = buyPossession(character(), 'book_short_stories').character;
const keptBook = sellDurable(novel, validPossessions(novel)[0]!.id);
assert(keptBook.character === novel && keptBook.ok === false, 'a book cannot be sold');

const afterSale = soldCustom.character;
const noMachine = playGame(afterSale);
assert(noMachine.character === afterSale && noMachine.ok === false, 'play fails after the computer is sold');

const gamer = buyPossession(character({ age: 16 }), 'computer_home').character;
const firstPlay = playGame(gamer);
assert(firstPlay.ok, 'the first play succeeds');
assert(firstPlay.character.timeline.at(-1)?.message.includes('manual still open'), 'level 0 uses the first home-computer scene');
assert(validHobbies(firstPlay.character)[0]?.level === 1, 'the first play raises the level after the scene');
const sameYear = playGame(firstPlay.character);
assert(sameYear.character === firstPlay.character, 'a second play in the same year returns the same character');
assert(sameYear.character.timeline.length === firstPlay.character.timeline.length, 'the second play does not grow the timeline');

const nextYear = playGame({ ...firstPlay.character, age: 17 });
assert(nextYear.ok, 'the next age can play again');
assert(nextYear.character.timeline.at(-1)?.message.includes('a little further'), 'the second year uses the level from before the increase');
assert(validHobbies(nextYear.character)[0]?.level === 2, 'the second play raises the level to 2');

const master = character({
  age: 20,
  lifestyle: {
    possessions: [{
      id: 'piano-1',
      catalogId: 'instrument_piano',
      kind: 'durable',
      purchasePrice: 1600,
      purchaseAge: 18,
      status: 'owned',
    }],
    hobbies: [{ id: 'music', level: 5, lastActionAge: 19 }],
  },
});
const mastered = practiceMusic(master);
assert(mastered.ok, 'a mastered hobby can still be practiced');
assert(mastered.character.timeline.at(-1)?.message.includes('full piece from memory'), 'level 5 uses the mastered piano scene');
assert(validHobbies(mastered.character)[0]?.level === 5, 'level stays at 5');

const ceiling = character({
  lifestyle: {
    possessions: [{
      id: 'pc-ceiling',
      catalogId: 'computer_home',
      kind: 'durable',
      purchasePrice: 650,
      purchaseAge: 16,
      status: 'owned',
    }],
    hobbies: [{ id: 'gaming', level: 3, lastActionAge: null }],
  },
});
const ceilingPlay = playGame(ceiling);
assert(ceilingPlay.character.timeline.at(-1)?.message.includes('cannot run'), 'level 3 on the home computer uses the ceiling scene');

const rigPlay = playGame(character({
  lifestyle: {
    possessions: [{
      id: 'rig-1',
      catalogId: 'computer_rig',
      kind: 'durable',
      purchasePrice: 2100,
      purchaseAge: 16,
      status: 'owned',
    }],
    hobbies: [{ id: 'gaming', level: 3, lastActionAge: null }],
  },
}));
assert(rigPlay.character.timeline.at(-1)?.message.includes('write down a clear time'), 'level 3 on the rig uses the rig scene');

const reader = character({ stats: { health: 80, happiness: 70, smarts: 40, looks: 60, karma: 55 } });
const firstBook = buyPossession(reader, 'book_short_stories').character;
const secondBook = buyPossession(firstBook, 'book_programming').character;
const firstRead = readBook(secondBook, validPossessions(secondBook).find((item) => item.catalogId === 'book_short_stories')!.id);
const secondRead = readBook(firstRead.character, validPossessions(firstRead.character).find((item) => item.catalogId === 'book_programming')!.id);
assert(firstRead.character.stats.smarts === 41, 'the first book this year grants one smarts');
assert(secondRead.character.stats.smarts === 41, 'the second book the same year does not grant smarts');
assert(secondRead.character.lifestyle?.readingGainAge === secondRead.character.age, 'reading gain age is the current age');
assert(secondRead.character.timeline.at(-1)?.message.includes('already learned something new this year'), 'the capped read says so');
assert(secondRead.character.timeline.filter((event) => event.category === 'social').length === 2, 'both reads are on the timeline');
const laterBook = buyPossession({ ...secondRead.character, age: 17 }, 'book_music_life').character;
const laterRead = readBook(laterBook, validPossessions(laterBook).find((item) => item.catalogId === 'book_music_life')!.id);
assert(laterRead.character.stats.smarts === 42, 'the next age can grant smarts again');

const school = character();
school.education.disciplines.music.totalYears = 2;
const withKeyboard = buyPossession(school, 'instrument_keyboard').character;
const practiced = practiceMusic(withKeyboard);
assert(practiced.character.timeline.at(-1)?.message.includes('school pieces are still in your hands'), 'school music colors the first practice');
assert(practiced.character.education.disciplines.music.totalYears === 2, 'practice does not write the school discipline');

const broken = { id: 'not-a-possession' };
const shelf = character({
  cash: 100,
  lifestyle: { possessions: [broken], hobbies: [{ id: 'nope' }] },
});
const stillBroken = buyPossession(shelf, 'book_short_stories');
assert(stillBroken.ok, 'a malformed row does not block a purchase under the cap');
assert(stillBroken.character.lifestyle?.possessions[0] === broken, 'the malformed possession is preserved');
assert(validPossessions(stillBroken.character).length === 1, 'the malformed row is ignored');

const crowded = character({
  lifestyle: {
    possessions: Array.from({ length: 8 }, (_, index) => bookCopy(`copy-${index}`)),
    hobbies: [],
  },
});
const full = buyPossession(crowded, 'computer_home');
assert(full.character === crowded, 'eight valid possessions fill the shelf');

assert(lifestyleIllustrationId('book_programming') === 'book_plate', 'books share one illustration id');
assert(lifestyleIllustrationId('computer_rig') === 'computer_rig', 'the rig has its own illustration id');
assert(lifestyleIllustrationId('missing') === null, 'unknown items have no illustration');
assert(getPossessionListing('instrument_piano')?.price === 1600, 'the piano keeps the approved price');
assert(getPossessionListing('instrument_piano')?.replaces === 'instrument_keyboard', 'the piano replaces the keyboard');

console.log('lifestyleService tests passed');
