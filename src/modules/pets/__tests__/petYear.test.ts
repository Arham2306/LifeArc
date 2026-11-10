import type { CharacterProfile, LifeEvent, PersonProfile } from '../../../types/game';
import { calculatePlayerNetWorth } from '../../assets/services/assetService';
import { getPropertyListing } from '../../assets/data/propertyCatalog';
import type { OwnedProperty } from '../../assets/types';
import { ageUpCharacter } from '../../aging/services/agingService';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import {
  isValidPet,
  petClosingLine,
  progressPetsForYear,
} from '../services/petService';
import type { PetRecord } from '../types';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function character(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_pet_year',
    firstName: 'Mina',
    lastName: 'Cole',
    gender: 'female',
    age: 30,
    birthYear: 1990,
    city: 'Austin',
    country: 'United States',
    isAlive: true,
    stats: { health: 80, happiness: 70, smarts: 40, looks: 60, karma: 55 },
    cash: 500,
    bankBalance: 800,
    netWorth: 1300,
    occupation: 'Unemployed',
    parents: {
      father: {
        id: 'dad',
        role: 'father',
        firstName: 'Owen',
        lastName: 'Cole',
        age: 55,
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
        age: 53,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      wealth: 'comfortable',
    },
    relationships: [],
    education: { ...createInitialEducation(), currentStage: 'graduated' },
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function pet(overrides: Partial<PetRecord> = {}): PetRecord {
  return {
    id: 'moth',
    name: 'Moth',
    species: 'pet_dog',
    temperament: 'playful',
    petAge: 2,
    adoptedAtAge: 20,
    health: 80,
    attachment: 40,
    lastFedAge: null,
    lastPlayedAge: null,
    lastVetAge: null,
    lastMoment: 'You brought Moth home from the shelter.',
    status: 'living',
    ...overrides,
  };
}

function host(animals: unknown[], overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return character({ pets: { animals }, ...overrides });
}

function petAt(animals: unknown[], index: number): PetRecord {
  const entry = animals[index];
  if (!isValidPet(entry)) throw new Error(`expected a valid pet at ${index}`);
  return entry;
}

function withStableRandom<T>(run: () => T): T {
  const original = Math.random;
  Math.random = () => 0.5;
  try {
    return run();
  } finally {
    Math.random = original;
  }
}

function loft(): OwnedProperty {
  const listing = getPropertyListing('studio_austin_loft');
  if (!listing) throw new Error('missing loft listing');
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

function spouse(annualIncome: number): PersonProfile {
  return {
    id: 'spouse',
    firstName: 'Kai',
    lastName: 'Cole',
    gender: 'male',
    age: 30,
    role: 'Husband',
    relationshipType: 'spouse',
    relationship: 80,
    originStory: 'Met at work.',
    stageMet: 'adulthood',
    romanticStage: 'married',
    partnerStats: {
      craziness: 20,
      generosity: 50,
      looks: 60,
      smarts: 60,
      fertility: 40,
      annualIncome,
      yearsTogether: 2,
      isPregnant: false,
    },
  };
}

const shelter = 'You brought Moth home from the shelter.';

assert(petClosingLine('Moth', '   ') === shelter, 'an empty memory falls back to the adoption sentence');
assert(petClosingLine('Moth', 'Kept close.') === 'Kept close.', 'a real memory is kept as the closing line');

const fed = pet({ health: 88, attachment: 22, lastFedAge: 30, lastMoment: 'You fed Moth. They waited until you stepped back.' });
const fedHost = host([fed], { cash: 500 });
const fedYear = progressPetsForYear(fedHost, 1000);
const fedPet = petAt(fedYear.animals, 0);
assert(fedYear.cashSpent === 0, 'a pet fed by hand is not charged again');
assert(fedPet.health === 88 && fedPet.attachment === 22, 'manual feeding bonuses are not applied again');
assert(fedPet.lastMoment === fed.lastMoment, 'age up keeps the manual memory');
assert(fedPet.petAge === 3 && fedPet.status === 'living', 'a fed pet still ages');
assert(fedHost.cash === 500 && fedHost.pets?.animals[0] === fed, 'the year leaves the original character and pet untouched');

const autoHost = host([pet({ lastMoment: shelter })]);
const autoYear = progressPetsForYear(autoHost, 40);
const autoPet = petAt(autoYear.animals, 0);
assert(autoYear.cashSpent === 40 && autoYear.happinessDelta === 0 && autoYear.events.length === 0, 'dog food is the only charge');
assert(autoPet.health === 80 && autoPet.attachment === 40, 'automatic food grants no bonuses');
assert(autoPet.lastFedAge === 30 && autoPet.lastMoment === shelter, 'automatic food records the year and keeps the memory');
assert(autoHost.cash === 500, 'the year function does not change cash');

const catAuto = progressPetsForYear(host([pet({ species: 'pet_cat', name: 'Pebble' })]), 30);
assert(catAuto.cashSpent === 30 && petAt(catAuto.animals, 0).health === 80, 'cat food costs $30 with no bonus');
const rabbitAuto = progressPetsForYear(host([pet({ species: 'pet_rabbit', name: 'Clover' })]), 20);
assert(rabbitAuto.cashSpent === 20 && petAt(rabbitAuto.animals, 0).lastMoment.startsWith('You brought'), 'rabbit food costs $20 and keeps the memory');

const hungry = progressPetsForYear(host([pet({ lastFedAge: 12 })]), 0);
const hungryPet = petAt(hungry.animals, 0);
assert(hungry.cashSpent === 0 && hungry.events.length === 0, 'unpaid food spends nothing and writes no event');
assert(hungryPet.lastFedAge === 12, 'neglect leaves the last fed age unchanged');
assert(hungryPet.health === 68 && hungryPet.attachment === 34, 'a playful dog loses 12 health and 6 attachment');
assert(hungryPet.lastMoment === 'Moth got through the year with an empty bowl.', 'neglect uses the band from before the loss');

const brokeArrival = progressPetsForYear(host([pet({ adoptedAtAge: 30, petAge: 1, attachment: 20, lastMoment: shelter })]), 0);
const arrived = petAt(brokeArrival.animals, 0);
assert(brokeArrival.cashSpent === 0, 'an unaffordable arrival year spends nothing');
assert(arrived.health === 80 && arrived.attachment === 20 && arrived.lastFedAge === null, 'an unaffordable arrival year is not neglect');
assert(arrived.lastMoment === shelter && arrived.petAge === 2, 'the adoption memory survives the arrival year');

const paidArrival = progressPetsForYear(host([pet({ adoptedAtAge: 30, petAge: 1, health: 80, attachment: 20, lastMoment: shelter })]), 40);
const paidArrived = petAt(paidArrival.animals, 0);
assert(paidArrival.cashSpent === 40, 'an affordable arrival year still buys food');
assert(paidArrived.health === 80 && paidArrived.attachment === 20, 'arrival food grants no bonuses');
assert(paidArrived.lastFedAge === 30 && paidArrived.lastMoment === shelter, 'arrival food keeps the adoption memory');

const laterHost = host(brokeArrival.animals, { age: 31 });
const later = progressPetsForYear(laterHost, 0);
assert(petAt(later.animals, 0).health === 68 && later.cashSpent === 0, 'the year after arrival uses normal neglect');

const dogThenCat = [
  pet({ id: 'dog', name: 'Ash' }),
  pet({ id: 'cat', name: 'Pebble', species: 'pet_cat' }),
];
const bothFed = progressPetsForYear(host(dogThenCat), 70);
assert(bothFed.cashSpent === 70, 'seventy dollars feeds the dog and the cat');
assert(petAt(bothFed.animals, 0).lastFedAge === 30 && petAt(bothFed.animals, 1).lastFedAge === 30, 'both pets are marked fed');
assert(petAt(bothFed.animals, 0).health === 80 && petAt(bothFed.animals, 1).health === 80, 'neither pet is neglected');

const dogOnly = progressPetsForYear(host(dogThenCat), 40);
assert(dogOnly.cashSpent === 40, 'forty dollars feeds only the first pet');
assert(petAt(dogOnly.animals, 0).lastFedAge === 30 && petAt(dogOnly.animals, 0).health === 80, 'the dog is fed');
assert(petAt(dogOnly.animals, 1).lastFedAge === null && petAt(dogOnly.animals, 1).health === 72, 'the later cat is neglected');

const catThenDog = progressPetsForYear(host([
  pet({ id: 'cat', name: 'Pebble', species: 'pet_cat' }),
  pet({ id: 'dog', name: 'Ash', species: 'pet_dog' }),
]), 40);
assert(catThenDog.cashSpent === 30, 'the cat adopted first spends $30');
assert(petAt(catThenDog.animals, 0).health === 80 && petAt(catThenDog.animals, 1).health === 68, 'the dog is neglected after the cat');

const noneFed = progressPetsForYear(host(dogThenCat), 0);
assert(noneFed.cashSpent === 0, 'no money spends nothing');
assert(petAt(noneFed.animals, 0).health === 68 && petAt(noneFed.animals, 1).health === 72, 'both later-year pets are neglected');

const arrivalPair = progressPetsForYear(host([
  pet({ id: 'dog', adoptedAtAge: 30, petAge: 1 }),
  pet({ id: 'cat', name: 'Pebble', species: 'pet_cat', adoptedAtAge: 30, petAge: 1 }),
]), 40);
assert(arrivalPair.cashSpent === 40, 'arrival food stops after the dog');
assert(petAt(arrivalPair.animals, 0).lastFedAge === 30 && petAt(arrivalPair.animals, 1).health === 80, 'the second arrival is not neglected');

const junk = { id: 'bad-row', species: 'pet_dog' };
const between = progressPetsForYear(host([
  pet({ id: 'dog', name: 'Ash' }),
  junk,
  pet({ id: 'cat', name: 'Pebble', species: 'pet_cat' }),
]), 70);
assert(between.animals[1] === junk && between.cashSpent === 70, 'a malformed row does not take food money');
assert(petAt(between.animals, 0).health === 80 && petAt(between.animals, 2).health === 80, 'both valid pets are still fed');

const rehomed = pet({ id: 'old', status: 'rehomed', closingLine: 'You found a home.', closedAtAge: 28 });
const remembered = pet({ id: 'gone', name: 'Gone', status: 'memorial', health: 0, petAge: 13, closingLine: 'Gone.', closedAtAge: 29 });
const closedYear = progressPetsForYear(host([
  rehomed,
  remembered,
  pet({ id: 'cat', name: 'Pebble', species: 'pet_cat' }),
]), 100);
assert(closedYear.animals[0] === rehomed && closedYear.animals[1] === remembered, 'closed pets stay as they were');
assert(closedYear.cashSpent === 30 && petAt(closedYear.animals, 2).health === 80, 'only the living pet buys food');

assert(petAt(progressPetsForYear(host([pet({ temperament: 'steady' })]), 0).animals, 0).health === 72, 'a steady dog loses 8 health');
assert(petAt(progressPetsForYear(host([pet({ species: 'pet_cat', temperament: 'steady' })]), 0).animals, 0).health === 76, 'a steady cat loses 4 health');
assert(petAt(progressPetsForYear(host([pet({ species: 'pet_rabbit', temperament: 'steady' })]), 0).animals, 0).health === 70, 'a steady rabbit loses 10 health');
assert(petAt(progressPetsForYear(host([pet({ temperament: 'shy' })]), 0).animals, 0).health === 68, 'a shy dog takes the full loss');
assert(petAt(progressPetsForYear(host([pet({ species: 'pet_rabbit', temperament: 'playful' })]), 0).animals, 0).health === 66, 'a playful rabbit takes the full loss');

const lowBond = progressPetsForYear(host([pet({ health: 20, attachment: 3, petAge: 2 })]), 0);
assert(petAt(lowBond.animals, 0).health === 8 && petAt(lowBond.animals, 0).attachment === 0, 'neglect clamps health and attachment at 0');
assert(petAt(lowBond.animals, 0).status === 'living', 'a pet above 0 health stays living');
assert(
  petAt(progressPetsForYear(host([pet({ attachment: 60 })]), 0).animals, 0).lastMoment ===
    'Moth waited by the bowl and you were not there to fill it.',
  'close neglect uses the band before the loss',
);

const stillTwelve = progressPetsForYear(host([pet({ petAge: 11 })]), 40);
assert(petAt(stillTwelve.animals, 0).petAge === 12 && petAt(stillTwelve.animals, 0).status === 'living', 'a dog at 12 is alive');
const turnsThirteen = progressPetsForYear(host([pet({ petAge: 12, lastMoment: 'Kept close.' })]), 40);
const deadDog = petAt(turnsThirteen.animals, 0);
assert(deadDog.petAge === 13 && deadDog.status === 'memorial', 'the tick to 13 memorializes the dog');
assert(deadDog.health === 80, 'death does not apply frailty afterward');
assert(deadDog.closingLine === 'Kept close.' && deadDog.name === 'Moth' && deadDog.species === 'pet_dog', 'the latest memory and identity stay');
assert(turnsThirteen.happinessDelta === -8 && turnsThirteen.events.length === 1, 'one death costs 8 happiness and one event');
assert(turnsThirteen.events[0]?.category === 'misfortune', 'death is a misfortune');
assert(turnsThirteen.events[0]?.age === 31 && turnsThirteen.events[0]?.year === 2021, 'the death uses the age being entered');
assert(turnsThirteen.events[0]?.message === 'Moth died at 13. Kept close.', 'the death names the pet age and the memory');
assert(turnsThirteen.cashSpent === 40, 'food is still bought in the year a pet dies of age');

const catSixteen = progressPetsForYear(host([pet({ species: 'pet_cat', petAge: 15 })]), 30);
assert(petAt(catSixteen.animals, 0).petAge === 16 && petAt(catSixteen.animals, 0).status === 'living', 'a cat at 16 is alive');
const catSeventeen = progressPetsForYear(host([pet({ species: 'pet_cat', petAge: 16 })]), 30);
assert(petAt(catSeventeen.animals, 0).petAge === 17 && petAt(catSeventeen.animals, 0).status === 'memorial', 'a cat dies on the tick to 17');
const rabbitEight = progressPetsForYear(host([pet({ species: 'pet_rabbit', petAge: 7 })]), 20);
assert(petAt(rabbitEight.animals, 0).petAge === 8 && petAt(rabbitEight.animals, 0).status === 'living', 'a rabbit at 8 is alive');
const rabbitNine = progressPetsForYear(host([pet({ species: 'pet_rabbit', petAge: 8 })]), 20);
assert(petAt(rabbitNine.animals, 0).petAge === 9 && petAt(rabbitNine.animals, 0).status === 'memorial', 'a rabbit dies on the tick to 9');

const beforeFrail = progressPetsForYear(host([pet({ petAge: 8, health: 80 })]), 40);
assert(petAt(beforeFrail.animals, 0).petAge === 9 && petAt(beforeFrail.animals, 0).health === 80, 'a dog is not frail at 9');
const becomesFrail = progressPetsForYear(host([pet({ petAge: 9, health: 80 })]), 40);
assert(petAt(becomesFrail.animals, 0).petAge === 10 && petAt(becomesFrail.animals, 0).health === 45, 'a dog becomes frail at 10');
const catFrail = progressPetsForYear(host([pet({ species: 'pet_cat', petAge: 13, health: 90 })]), 30);
assert(petAt(catFrail.animals, 0).health === 45, 'a cat becomes frail at 14');
const rabbitFrail = progressPetsForYear(host([pet({ species: 'pet_rabbit', petAge: 5, health: 70 })]), 20);
assert(petAt(rabbitFrail.animals, 0).health === 45, 'a rabbit becomes frail at 6');
assert(petAt(progressPetsForYear(host([pet({ petAge: 9, health: 46 })]), 40).animals, 0).health === 45, 'health above 45 drops to 45');
assert(petAt(progressPetsForYear(host([pet({ petAge: 9, health: 45 })]), 40).animals, 0).health === 45, 'frailty does not lower health that is already 45');
assert(petAt(progressPetsForYear(host([pet({ petAge: 9, health: 44 })]), 40).animals, 0).health === 44, 'frailty does not lower health below 45');
const vetted = progressPetsForYear(host([pet({ petAge: 9, health: 90, lastVetAge: 30 })]), 40);
assert(petAt(vetted.animals, 0).health === 90, 'a vet visit in the settled year blocks frailty');

const starved = progressPetsForYear(host([pet({ health: 8, petAge: 3, attachment: 80, lastMoment: shelter })]), 0);
const starvedPet = petAt(starved.animals, 0);
assert(starvedPet.status === 'memorial' && starvedPet.health === 0 && starved.events.length === 1, 'health falling to 0 causes one death');
assert(starved.happinessDelta === -8, 'a health death costs 8 happiness once');
assert(
  starvedPet.closingLine === 'Moth waited by the bowl and you were not there to fill it.',
  'the death keeps the neglect memory',
);
const bothReasons = progressPetsForYear(host([pet({ health: 0, petAge: 12 })]), 40);
assert(bothReasons.events.length === 1 && bothReasons.happinessDelta === -8, 'age and health together still make one death');
assert(petAt(bothReasons.animals, 0).health === 0 && petAt(bothReasons.animals, 0).petAge === 13, 'the memorial keeps the final age');

const rememberedHost = host(turnsThirteen.animals, { age: 31, cash: 500 });
const rememberedYear = progressPetsForYear(rememberedHost, 100);
assert(rememberedYear.animals[0] === turnsThirteen.animals[0], 'a memorial is not copied or progressed');
assert(rememberedYear.cashSpent === 0 && rememberedYear.events.length === 0 && rememberedYear.happinessDelta === 0, 'a memorial costs nothing next year');

const repeatA = progressPetsForYear(host([pet({ id: 'same' })]), 40);
const repeatB = progressPetsForYear(host([pet({ id: 'same' })]), 40);
assert(JSON.stringify(repeatA) === JSON.stringify(repeatB), 'the same inputs produce the same year');
assert(progressPetsForYear(host([pet()]), -5).cashSpent === 0, 'a negative pool spends nothing');
assert(progressPetsForYear(character(), 40).animals.length === 0, 'a life with no pets spends nothing');

const plain = character({ pets: undefined, cash: 400 });
const plainAged = withStableRandom(() => ageUpCharacter(plain));
assert(plain.cash === 400 && plainAged.pets === undefined && plainAged.cash === 400, 'a life without pets gains no pet field and spends no food');

const pebble = pet({
  id: 'pebble',
  name: 'Pebble',
  species: 'pet_cat',
  temperament: 'playful',
  petAge: 1,
  adoptedAtAge: 20,
  health: 80,
  attachment: 20,
  lastMoment: 'You brought Pebble home from the shelter.',
});
const catLife = character({ cash: 500, bankBalance: 800, pets: { animals: [pebble] } });
const catAged = withStableRandom(() => ageUpCharacter(catLife));
const grownCat = petAt(catAged.pets?.animals ?? [], 0);
assert(catLife.cash === 500 && catLife.pets?.animals[0] === pebble, 'age up does not mutate the cat or the cash');
assert(catAged.cash === 470 && catAged.bankBalance === 800, 'age up charges the cat food once');
assert(grownCat.petAge === 2 && grownCat.health === 80 && grownCat.lastFedAge === 30, 'the cat ages once without a care bonus');
assert(grownCat.lastMoment === pebble.lastMoment, 'age up keeps the cat memory');
assert(catAged.stats.happiness === 70, 'ordinary food does not change happiness');
assert(catAged.netWorth === calculatePlayerNetWorth(catAged) && catAged.netWorth === 1270, 'net worth is stamped from cash and bank');
assert(catAged.age === 31, 'the player enters the next age');

const drained = character({
  cash: 1000,
  bankBalance: 0,
  netWorth: 1000,
  partner: spouse(1000),
  assets: { properties: [loft()] },
  pets: { animals: [pebble] },
});
const drainedAged = withStableRandom(() => ageUpCharacter(drained));
const drainedCat = petAt(drainedAged.pets?.animals ?? [], 0);
assert(drainedAged.cash === 0, 'property claims the cash and the spouse contribution before pet food');
assert(drainedCat.health === 72 && drainedCat.attachment === 14 && drainedCat.lastFedAge === null, 'the cat is neglected when nothing remains');
assert(drainedAged.netWorth === calculatePlayerNetWorth(drainedAged), 'the drained year stamps net worth once');
const drainedHome = drainedAged.assets?.properties?.[0];
assert(isValidPet(drainedCat) && drainedHome && typeof drainedHome === 'object' && 'marketValue' in drainedHome && drainedHome.marketValue === 90640, 'the home appreciates and the pet is not added to it');

const shared = character({
  cash: 1000,
  bankBalance: 0,
  partner: spouse(5000),
  assets: { properties: [loft()] },
  pets: { animals: [{ ...pebble, id: 'pebble-2' }] },
});
const sharedAged = withStableRandom(() => ageUpCharacter(shared));
const sharedCat = petAt(sharedAged.pets?.animals ?? [], 0);
assert(sharedAged.cash === 770, 'final cash is pay plus cash, minus upkeep, minus one food bill');
assert(sharedCat.health === 80 && sharedCat.lastFedAge === 30 && sharedCat.petAge === 2, 'the remaining money buys the cat food');
assert(sharedAged.netWorth === 770 + 90640, 'net worth includes the appreciated home and the cash left after both bills');

const dying = character({
  cash: 500,
  bankBalance: 0,
  pets: { animals: [pet({ petAge: 12, health: 80, lastMoment: 'Kept close.', attachment: 40 })] },
});
const died = withStableRandom(() => ageUpCharacter(dying));
const memorial = petAt(died.pets?.animals ?? [], 0);
const deaths = died.timeline.filter((event: LifeEvent) => event.category === 'misfortune' && event.title === 'Moth');
assert(died.cash === 460 && died.stats.happiness === 62, 'the death year charges food once and happiness once');
assert(deaths.length === 1 && deaths[0]?.age === 31 && deaths[0]?.year === 2021, 'age up writes one death at the age being entered');
assert(memorial.status === 'memorial' && memorial.petAge === 13 && memorial.closingLine === 'Kept close.', 'the memorial keeps the final memory');
const after = withStableRandom(() => ageUpCharacter(died));
const laterDeaths = after.timeline.filter((event: LifeEvent) => event.category === 'misfortune' && event.title === 'Moth');
assert(after.cash === 460 && after.stats.happiness === 62 && laterDeaths.length === 1, 'the memorial does not die or spend again');
assert(petAt(after.pets?.animals ?? [], 0).petAge === 13, 'the memorial does not age on the next birthday');

const terminal = character({
  stats: { health: 0, happiness: 70, smarts: 40, looks: 60, karma: 55 },
  cash: 80,
  bankBalance: 0,
  pets: { animals: [pebble] },
});
const buried = withStableRandom(() => ageUpCharacter(terminal));
assert(buried.isAlive === false, 'the player can still die on the same birthday');
assert(buried.cash === 50 && petAt(buried.pets?.animals ?? [], 0).petAge === 2, 'the pet year is kept on the life that ended');

const alreadyDead = character({ isAlive: false, pets: { animals: [pebble] } });
assert(ageUpCharacter(alreadyDead) === alreadyDead, 'a dead player does not progress pets again');
