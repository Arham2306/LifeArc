import type { CharacterProfile } from '../../../types/game';
import { calculatePlayerNetWorth } from '../../assets/services/assetService';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { getPetListing, missedYearHealthLoss, PET_CATALOG, temperamentAttachmentGain } from '../data/petCatalog';
import {
  adoptPet,
  adoptionMemory,
  attachmentBand,
  careSentence,
  feedPet,
  isValidPet,
  livingPets,
  playWithPet,
  rehomePet,
  validPets,
  visitVet,
  VET_PRICE,
} from '../services/petService';
import type { PetRecord, PetSpeciesId, PetTemperament } from '../types';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function character(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_pets',
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

function onlyPet(profile: CharacterProfile): PetRecord {
  const pets = validPets(profile);
  if (pets.length !== 1) throw new Error(`expected one valid pet, found ${pets.length}`);
  const pet = pets[0];
  if (!pet) throw new Error('expected one valid pet');
  return pet;
}

function withPet(profile: CharacterProfile, patch: Partial<PetRecord>): CharacterProfile {
  const animals = (profile.pets?.animals ?? []).map((entry, index) => {
    if (index !== 0 || !isValidPet(entry)) return entry;
    return { ...entry, ...patch };
  });
  return { ...profile, pets: { animals } };
}

const dog = getPetListing('pet_dog');
const cat = getPetListing('pet_cat');
const rabbit = getPetListing('pet_rabbit');
if (!dog || !cat || !rabbit) throw new Error('pet catalog is missing a species');

assert(PET_CATALOG.length === 3, 'three species');
assert(dog.adoptionPrice === 80 && dog.foodPrice === 40 && dog.lifespan === 12 && dog.frailAge === 10, 'dog catalog');
assert(dog.attachmentGain === 8 && dog.missedYearHealthLoss === 12 && dog.playActivity === 'Walk', 'dog care numbers');
assert(cat.adoptionPrice === 50 && cat.foodPrice === 30 && cat.lifespan === 16 && cat.frailAge === 14, 'cat catalog');
assert(cat.attachmentGain === 6 && cat.missedYearHealthLoss === 8 && cat.playActivity === 'Floor play', 'cat care numbers');
assert(rabbit.adoptionPrice === 35 && rabbit.foodPrice === 20 && rabbit.lifespan === 8 && rabbit.frailAge === 6, 'rabbit catalog');
assert(rabbit.attachmentGain === 5 && rabbit.missedYearHealthLoss === 14 && rabbit.playActivity === 'Grass play', 'rabbit care numbers');
assert(getPetListing('pet_bird') === null, 'unknown species has no listing');

for (const listing of [dog, cat, rabbit]) {
  assert(temperamentAttachmentGain(listing, 'playful') === listing.attachmentGain, `${listing.id} playful gain`);
  assert(temperamentAttachmentGain(listing, 'steady') === listing.attachmentGain, `${listing.id} steady gain`);
  assert(temperamentAttachmentGain(listing, 'shy') === listing.attachmentGain - 2, `${listing.id} shy gain`);
  assert(missedYearHealthLoss(listing, 'playful') === listing.missedYearHealthLoss, `${listing.id} playful neglect`);
  assert(missedYearHealthLoss(listing, 'shy') === listing.missedYearHealthLoss, `${listing.id} shy neglect`);
  assert(missedYearHealthLoss(listing, 'steady') === listing.missedYearHealthLoss - 4, `${listing.id} steady neglect`);
}

assert(attachmentBand(0) === 'distant' && attachmentBand(24) === 'distant', 'distant band');
assert(attachmentBand(25) === 'familiar' && attachmentBand(59) === 'familiar', 'familiar band');
assert(attachmentBand(60) === 'close' && attachmentBand(100) === 'close', 'close band');
assert(careSentence('feed', 'pet_dog', 'Moth', 22) === 'You fed Moth. They waited until you stepped back.', 'distant feed');
assert(
  careSentence('feed', 'pet_cat', 'Moth', 25) === 'You fed Moth and they ate while you were still in the room.',
  'familiar feed',
);
assert(
  careSentence('feed', 'pet_rabbit', 'Moth', 61) === "You put Moth's food down and they stayed near your hand.",
  'close feed',
);
assert(careSentence('play', 'pet_dog', 'Moth', 70) === 'Moth walked beside you and leaned in when you stopped.', 'close walk');
assert(careSentence('play', 'pet_dog', 'Moth', 40) === 'You walked Moth around the block.', 'familiar walk');
assert(careSentence('play', 'pet_dog', 'Moth', 8) === 'Moth took the walk and kept a little ahead.', 'distant walk');
assert(
  careSentence('play', 'pet_cat', 'Moth', 70) === 'Moth played on the floor beside you and leaned into your hand.',
  'close floor play',
);
assert(careSentence('play', 'pet_cat', 'Moth', 40) === 'You played with Moth on the floor.', 'familiar floor play');
assert(careSentence('play', 'pet_cat', 'Moth', 8) === 'Moth took the floor and kept a little away.', 'distant floor play');
assert(
  careSentence('play', 'pet_rabbit', 'Moth', 70) === 'Moth stayed in the grass beside you and leaned in when you stopped.',
  'close grass play',
);
assert(careSentence('play', 'pet_rabbit', 'Moth', 40) === 'You played with Moth in the grass.', 'familiar grass play');
assert(careSentence('play', 'pet_rabbit', 'Moth', 8) === 'Moth took the grass and kept a little ahead.', 'distant grass play');
assert(
  careSentence('vet', 'pet_dog', 'Moth', 70) === 'The vet looked over Moth while they stayed against you.',
  'close vet',
);
assert(careSentence('vet', 'pet_cat', 'Moth', 40) === 'You took Moth to the vet and waited with them.', 'familiar vet');
assert(
  careSentence('vet', 'pet_rabbit', 'Moth', 10) === 'You took Moth to the vet. They kept to the far side of the table.',
  'distant vet',
);
assert(
  careSentence('neglect', 'pet_dog', 'Moth', 80) === 'Moth waited by the bowl and you were not there to fill it.',
  'close neglect',
);
assert(careSentence('neglect', 'pet_cat', 'Moth', 40) === 'Moth got through the year with an empty bowl.', 'familiar neglect');
assert(
  careSentence('neglect', 'pet_rabbit', 'Moth', 10) === 'Moth managed the year without coming to find you.',
  'distant neglect',
);
assert(adoptionMemory('Moth') === 'You brought Moth home from the shelter.', 'adoption memory');

const young = character({ age: 15, cash: 5000 });
const refusedAge = adoptPet(young, 'pet_dog', 'playful', 'Moth');
assert(refusedAge.ok === false && refusedAge.character === young, 'age 15 returns the same character');
assert(young.pets === undefined && young.timeline.length === 0 && young.cash === 5000, 'age 15 changes nothing');

const adult = character();
const refusedSpecies = adoptPet(adult, 'pet_bird', 'playful', 'Moth');
assert(refusedSpecies.ok === false && refusedSpecies.character === adult, 'unknown species returns the same character');

const refusedTemperament = adoptPet(adult, 'pet_dog', 'wild', 'Moth');
assert(refusedTemperament.character === adult, 'unknown temperament returns the same character');

const refusedName = adoptPet(adult, 'pet_dog', 'playful', '   ');
assert(refusedName.ok === false && refusedName.character === adult, 'empty name returns the same character');

const broke = character({ cash: 79, bankBalance: 9000 });
const refusedCash = adoptPet(broke, 'pet_dog', 'playful', 'Moth');
assert(refusedCash.ok === false && refusedCash.character === broke, 'short cash returns the same character');
assert(broke.cash === 79 && broke.bankBalance === 9000 && broke.timeline.length === 0, 'bank is not a wallet');

const exact = character({ cash: 80, bankBalance: 800 });
const exactWorth = calculatePlayerNetWorth(exact);
const boughtExact = adoptPet(exact, 'pet_dog', 'steady', ' Moth ');
assert(boughtExact.ok, 'exact cash adoption succeeds');
assert(boughtExact.character.cash === 0, 'exact adoption spends the price once');
assert(boughtExact.character.bankBalance === 800, 'exact adoption leaves the bank');
assert(calculatePlayerNetWorth(boughtExact.character) === exactWorth - 80, 'net worth moves only by cash');
assert(boughtExact.character.netWorth === calculatePlayerNetWorth(boughtExact.character), 'stamped net worth matches');
assert(!exact.pets, 'the original character still has no pets');

const buyer = character({ cash: 5000, bankBalance: 800 });
const beforeWorth = calculatePlayerNetWorth(buyer);
const adopted = adoptPet(buyer, 'pet_dog', 'playful', 'Moth');
assert(adopted.ok, 'age 16 adoption succeeds');
const owner = adopted.character;
const moth = onlyPet(owner);
assert(owner.cash === 4920, 'dog adoption deducts $80 once');
assert(owner.bankBalance === 800, 'adoption leaves the bank');
assert(owner.stats.happiness === 70, 'adoption does not change happiness');
assert(calculatePlayerNetWorth(owner) === beforeWorth - 80, 'adoption net worth moves by cash only');
assert(owner.netWorth === calculatePlayerNetWorth(owner), 'adoption stamps net worth');
assert(moth.species === 'pet_dog' && moth.temperament === 'playful', 'chosen species and temperament');
assert(moth.name === 'Moth', 'name is trimmed');
assert(moth.petAge === 1 && moth.adoptedAtAge === 16 && moth.status === 'living', 'starting age and status');
assert(moth.health === 80 && moth.attachment === 20, 'starting health and attachment');
assert(moth.lastFedAge === null && moth.lastPlayedAge === null && moth.lastVetAge === null, 'care ages start empty');
assert(moth.lastMoment === 'You brought Moth home from the shelter.', 'adoption memory is stored');
assert(owner.timeline.length === 1 && owner.timeline[0]?.category === 'money', 'adoption writes one money event');
assert(
  owner.timeline[0]?.message === 'You brought Moth home from the shelter. You spent $80.',
  'adoption journal names the price',
);

const broken = { id: 'bad-row', species: 'pet_dog', health: 80 };
let household = character({ pets: { animals: [broken] } });
const first = adoptPet(household, 'pet_dog', 'playful', 'Ash');
const second = adoptPet(first.character, 'pet_cat', 'shy', 'Pebble');
const third = adoptPet(second.character, 'pet_rabbit', 'steady', 'Clover');
assert(first.ok && second.ok, 'invalid row does not consume a living slot');
assert(second.character.cash === 5000 - 80 - 50, 'two adoptions charge each price once');
assert(third.ok === false && third.character === second.character, 'a full household returns the same character');
assert(third.character.cash === second.character.cash && third.character.timeline.length === 2, 'refused adoption writes nothing');
assert(second.character.pets?.animals[0] === broken, 'the invalid row stays in place');
assert(livingPets(second.character).length === 2, 'only valid living pets fill the house');
assert(validPets(second.character).every((pet) => pet.id !== 'bad-row'), 'the broken row is not a pet');

const remembered = withPet(owner, {
  status: 'memorial',
  health: 0,
  closingLine: moth.lastMoment,
  closedAtAge: 16,
});
const afterMemorial = adoptPet(remembered, 'pet_cat', 'steady', 'Pebble');
assert(afterMemorial.ok, 'a memorial does not take a living slot');
assert(livingPets(afterMemorial.character).length === 1, 'the memorial stays out of the living count');
assert(validPets(afterMemorial.character).length === 2, 'the memorial stays on the life');

const fed = feedPet(owner, moth.id);
assert(fed.ok, 'feeding succeeds');
const fedPet = onlyPet(fed.character);
assert(fed.character.cash === 4920 - 40, 'feeding charges the dog food price once');
assert(fed.character.stats.happiness === 70, 'feeding does not change happiness');
assert(fed.character.timeline.length === 1, 'feeding does not add a journal entry');
assert(fedPet.health === 88 && fedPet.attachment === 22, 'feeding adds 8 health and 2 attachment');
assert(fedPet.lastFedAge === 16, 'feeding records the player age');
assert(fedPet.lastMoment === 'You fed Moth. They waited until you stepped back.', 'feed memory uses the new band');
const fedAgain = feedPet(fed.character, moth.id);
assert(fedAgain.ok === false && fedAgain.character === fed.character, 'a second feed returns the same character');
assert(onlyPet(fedAgain.character).health === 88, 'a second feed does not change the pet');

const poorFeed = { ...owner, cash: 39 };
const shortFeed = feedPet(poorFeed, moth.id);
assert(shortFeed.ok === false && shortFeed.character === poorFeed, 'short feed cash returns the same character');
assert(poorFeed.cash === 39 && poorFeed.timeline.length === 1, 'short feed writes nothing and spends nothing');

const familiarHost = withPet(owner, { attachment: 23 });
const familiarFed = feedPet(familiarHost, moth.id);
assert(onlyPet(familiarFed.character).attachment === 25, 'feed crosses into the familiar band');
assert(
  onlyPet(familiarFed.character).lastMoment === 'You fed Moth and they ate while you were still in the room.',
  'familiar feed memory',
);
const closeHost = withPet(owner, { attachment: 99, health: 95 });
const closeFed = feedPet(closeHost, moth.id);
assert(onlyPet(closeFed.character).attachment === 100 && onlyPet(closeFed.character).health === 100, 'scores cap at 100');
assert(
  onlyPet(closeFed.character).lastMoment === "You put Moth's food down and they stayed near your hand.",
  'close feed memory',
);

const catOwner = adoptPet(character(), 'pet_cat', 'playful', 'Pebble').character;
const catFed = feedPet(catOwner, onlyPet(catOwner).id);
assert(catFed.character.cash === 5000 - 50 - 30, 'cat food costs $30');
const rabbitOwner = adoptPet(character(), 'pet_rabbit', 'shy', 'Clover').character;
const rabbitFed = feedPet(rabbitOwner, onlyPet(rabbitOwner).id);
assert(rabbitFed.character.cash === 5000 - 35 - 20, 'rabbit food costs $20');

const speciesGains: Array<[PetSpeciesId, PetTemperament, number]> = [
  ['pet_dog', 'playful', 8],
  ['pet_dog', 'shy', 6],
  ['pet_dog', 'steady', 8],
  ['pet_cat', 'playful', 6],
  ['pet_cat', 'shy', 4],
  ['pet_cat', 'steady', 6],
  ['pet_rabbit', 'playful', 5],
  ['pet_rabbit', 'shy', 3],
  ['pet_rabbit', 'steady', 5],
];
for (const [species, temperament, gain] of speciesGains) {
  const profile = adoptPet(character(), species, temperament, 'Moth').character;
  const before = profile.cash;
  const played = playWithPet(profile, onlyPet(profile).id);
  assert(played.ok, `${species} ${temperament} play succeeds`);
  assert(played.character.cash === before, `${species} ${temperament} play is free`);
  assert(played.character.stats.happiness === 72, `${species} ${temperament} play adds 2 happiness`);
  assert(onlyPet(played.character).attachment === 20 + gain, `${species} ${temperament} attachment gain`);
  assert(onlyPet(played.character).lastPlayedAge === 16, `${species} ${temperament} records play age`);
  assert(played.character.timeline.length === 1, `${species} ${temperament} play adds no journal`);
  const again = playWithPet(played.character, onlyPet(profile).id);
  assert(again.ok === false && again.character === played.character, `${species} ${temperament} second play is refused`);
}

const walked = playWithPet(owner, moth.id);
assert(onlyPet(walked.character).lastMoment === 'You walked Moth around the block.', 'a new dog play uses the familiar walk');
assert(onlyPet(walked.character).health === 80, 'play does not change health');

const lowHealth = withPet(owner, { health: 49 });
const refusedHealthy = visitVet(owner, moth.id);
assert(refusedHealthy.ok === false && refusedHealthy.character === owner, 'a young healthy pet cannot see the vet');
assert(
  refusedHealthy.reason === 'Vet care becomes available when your pet is older or needs medical attention.',
  'vet refusal explains when care opens',
);
const treated = visitVet(lowHealth, moth.id);
assert(treated.ok, 'health under 50 can see the vet');
assert(treated.character.cash === lowHealth.cash - VET_PRICE, 'vet costs $90');
assert(VET_PRICE === 90, 'vet price is $90');
assert(onlyPet(treated.character).health === 80, 'vet sets health to 80');
assert(onlyPet(treated.character).attachment === 22, 'vet adds 2 attachment');
assert(onlyPet(treated.character).lastVetAge === 16, 'vet records the player age');
assert(
  onlyPet(treated.character).lastMoment === 'You took Moth to the vet. They kept to the far side of the table.',
  'distant vet memory',
);
assert(treated.character.timeline.length === 1, 'vet adds no journal entry');
const treatedAgain = visitVet(treated.character, moth.id);
assert(treatedAgain.ok === false && treatedAgain.character === treated.character, 'a second vet visit returns the same character');
assert(treatedAgain.reason === 'Already seen the vet this year.', 'the second visit says it was used');
assert(onlyPet(treatedAgain.character).health === 80, 'a second visit does not change health');

const frailDog = withPet(owner, { petAge: 10, health: 80, attachment: 60 });
const frailVisit = visitVet(frailDog, moth.id);
assert(frailVisit.ok, 'a frail dog can see the vet at full health');
assert(onlyPet(frailVisit.character).health === 80 && onlyPet(frailVisit.character).attachment === 62, 'frail visit keeps the vet results');
assert(
  onlyPet(frailVisit.character).lastMoment === 'The vet looked over Moth while they stayed against you.',
  'close vet memory',
);

const youngCat = withPet(catOwner, { petAge: 13, health: 80 });
assert(visitVet(youngCat, onlyPet(catOwner).id).character === youngCat, 'a cat before frail age at health 80 is refused');
const frailCat = withPet(catOwner, { petAge: 14, health: 80 });
assert(visitVet(frailCat, onlyPet(catOwner).id).ok, 'a cat at the frail age can see the vet');
const youngRabbit = withPet(rabbitOwner, { petAge: 5, health: 50 });
assert(visitVet(youngRabbit, onlyPet(rabbitOwner).id).ok === false, 'a rabbit at health 50 before frail age is refused');
const frailRabbit = withPet(rabbitOwner, { petAge: 6, health: 80 });
assert(visitVet(frailRabbit, onlyPet(rabbitOwner).id).ok, 'a rabbit at the frail age can see the vet');

const poorVetHost = { ...lowHealth, cash: 89 };
const poorVet = visitVet(poorVetHost, moth.id);
assert(poorVet.ok === false && poorVet.character === poorVetHost, 'an unaffordable vet visit returns the same character');
assert(poorVetHost.cash === 89 && poorVetHost.timeline.length === lowHealth.timeline.length, 'an unaffordable vet visit writes nothing');
assert(onlyPet(poorVetHost).lastVetAge === null, 'an unaffordable vet visit does not record the visit');

const rehomed = rehomePet(owner, moth.id);
assert(rehomed.ok, 'rehome succeeds');
const rehomedPet = onlyPet(rehomed.character);
assert(rehomed.character.stats.happiness === 64, 'rehome lowers happiness by 6 once');
assert(rehomed.character.cash === owner.cash, 'rehome does not spend cash');
assert(rehomedPet.status === 'rehomed' && rehomedPet.closedAtAge === 16, 'rehome closes the record at the current age');
assert(rehomedPet.closingLine === moth.lastMoment && rehomedPet.closingLine !== '', 'rehome keeps a closing line');
assert(livingPets(rehomed.character).length === 0, 'rehome frees the living slot');
assert(rehomed.character.timeline.length === 2 && rehomed.character.timeline[1]?.category === 'relationship', 'rehome writes one relationship event');
assert(
  rehomed.character.timeline[1]?.message === `You found Moth another home. ${moth.lastMoment}`,
  'rehome journal keeps the memory',
);
const rehomedAgain = rehomePet(rehomed.character, moth.id);
assert(rehomedAgain.ok === false && rehomedAgain.character === rehomed.character, 'a second rehome returns the same character');
assert(rehomedAgain.character.stats.happiness === 64, 'a second rehome does not change happiness');
const replacement = adoptPet(rehomed.character, 'pet_rabbit', 'playful', 'Clover');
assert(replacement.ok && livingPets(replacement.character).length === 1, 'the freed slot can be filled');

const memorialPet = withPet(owner, {
  status: 'memorial',
  health: 0,
  closingLine: moth.lastMoment,
  closedAtAge: 16,
});
const closedPet = rehomed.character;
for (const action of [feedPet, playWithPet, visitVet, rehomePet]) {
  const memorialResult = action(memorialPet, moth.id);
  assert(memorialResult.ok === false && memorialResult.character === memorialPet, 'a memorial cannot receive care');
  const closedResult = action(closedPet, moth.id);
  assert(closedResult.ok === false && closedResult.character === closedPet, 'a rehomed pet cannot receive care');
  const missing = action(owner, 'missing-pet');
  assert(missing.ok === false && missing.character === owner, 'an unknown pet cannot receive care');
}

const invalidHost = withPet(owner, { health: 101, lastVetAge: -1 });
assert(isValidPet(invalidHost.pets?.animals[0]) === false, 'an out-of-range pet is invalid');
const invalidCare = feedPet(invalidHost, moth.id);
assert(invalidCare.ok === false && invalidCare.character === invalidHost, 'an invalid pet cannot be fed');
assert(invalidHost.pets?.animals[0] === invalidCare.character.pets?.animals[0], 'invalid care leaves the row untouched');

const base = moth;
function spoil(patch: Record<string, unknown>): unknown {
  return { ...base, ...patch };
}
const invalidShapes: unknown[] = [
  spoil({ id: '  ' }),
  spoil({ name: '' }),
  spoil({ species: 'pet_bird' }),
  spoil({ temperament: 'wild' }),
  spoil({ petAge: 0 }),
  spoil({ petAge: 1.5 }),
  spoil({ adoptedAtAge: -1 }),
  spoil({ health: -1 }),
  spoil({ attachment: 100.2 }),
  spoil({ lastFedAge: -1 }),
  spoil({ lastPlayedAge: 1.2 }),
  spoil({ lastVetAge: undefined }),
  spoil({ lastMoment: '   ' }),
  spoil({ status: 'gone' }),
  spoil({ status: 'memorial', closingLine: undefined, closedAtAge: undefined }),
  spoil({ status: 'rehomed', closingLine: '   ', closedAtAge: 16 }),
  spoil({ status: 'memorial', closingLine: base.lastMoment, closedAtAge: -1 }),
  [],
  null,
];
for (const shape of invalidShapes) {
  assert(isValidPet(shape) === false, 'malformed pet shape is rejected');
}
const missingVetAge: Record<string, unknown> = { ...base };
delete missingVetAge.lastVetAge;
assert(isValidPet(missingVetAge) === false, 'a missing lastVetAge is invalid');
assert(
  isValidPet({ ...base, status: 'memorial', health: 0, closingLine: base.lastMoment, closedAtAge: 0 }),
  'a memorial with a closing line is valid',
);
assert(isValidPet({ ...base, lastFedAge: 0, lastPlayedAge: null, lastVetAge: 16 }), 'null and zero care ages are valid');

const other = adoptPet(character(), 'pet_cat', 'steady', 'Pebble').character;
const otherPet = onlyPet(other);
const playedOther = playWithPet(other, otherPet.id);
assert(playedOther.character.pets?.animals[0] !== otherPet, 'play replaces the cared-for pet');
const untouched = playedOther.character.pets?.animals[0];
const secondLiving = adoptPet(playedOther.character, 'pet_dog', 'playful', 'Ash');
assert(secondLiving.ok, 'one living pet leaves a slot');
assert(secondLiving.character.pets?.animals[0] === untouched, 'adopting another pet leaves the first record in place');
