import type { CharacterProfile, ParentProfile, PersonProfile, SiblingProfile } from '../../../types/game';
import { calculatePlayerNetWorth } from '../../assets/services/assetService';
import { getPropertyListing } from '../../assets/data/propertyCatalog';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { executeSocialAction, hasPerformedActionThisYear } from '../services/relationshipService';
import type { TargetPersonRef } from '../services/relationshipService';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function character(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_outing',
    firstName: 'Mina',
    lastName: 'Cole',
    gender: 'female',
    age: 18,
    birthYear: 2000,
    city: 'Austin',
    country: 'United States',
    isAlive: true,
    stats: { health: 80, happiness: 50, smarts: 40, looks: 60, karma: 55 },
    cash: 500,
    bankBalance: 100,
    netWorth: 600,
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
        relationship: 40,
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
        relationship: 40,
        generosity: 60,
      },
      wealth: 'comfortable',
    },
    siblings: [sibling()],
    relationships: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    yearlySocialActions: {},
    ...overrides,
  };
}

function sibling(overrides: Partial<SiblingProfile> = {}): SiblingProfile {
  return {
    id: 'sib_1',
    role: 'sister',
    firstName: 'Chloe',
    lastName: 'Cole',
    age: 20,
    gender: 'female',
    relationship: 40,
    occupation: 'Student',
    isAlive: true,
    birthOrder: 'older',
    ...overrides,
  };
}

function friend(overrides: Partial<PersonProfile> = {}): PersonProfile {
  return {
    id: 'friend_1',
    firstName: 'Sam',
    lastName: 'Parker',
    gender: 'male',
    age: 18,
    role: 'Classmate',
    relationshipType: 'friend',
    relationship: 40,
    originStory: 'Met at school.',
    stageMet: 'high_school',
    ...overrides,
  };
}

function parentRef(parent: ParentProfile, overrides: Partial<TargetPersonRef> = {}): TargetPersonRef {
  return {
    id: parent.id,
    name: `${parent.firstName} ${parent.lastName}`,
    role: parent.role === 'father' ? 'Father' : 'Mother',
    type: 'parent',
    relationship: parent.relationship,
    isAlive: parent.isAlive,
    age: parent.age,
    ...overrides,
  };
}

function siblingRef(person: SiblingProfile, overrides: Partial<TargetPersonRef> = {}): TargetPersonRef {
  return {
    id: person.id,
    name: `${person.firstName} ${person.lastName}`,
    role: 'Sister',
    type: 'sibling',
    relationship: person.relationship,
    isAlive: person.isAlive,
    age: person.age,
    ...overrides,
  };
}

function friendRef(person: PersonProfile, overrides: Partial<TargetPersonRef> = {}): TargetPersonRef {
  return {
    id: person.id,
    name: `${person.firstName} ${person.lastName}`,
    role: person.role,
    type: 'friend',
    relationship: person.relationship,
    isAlive: true,
    age: person.age,
    romanticStage: person.romanticStage,
    ...overrides,
  };
}

function home() {
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

const movieParent = character();
const parentResult = executeSocialAction(
  movieParent,
  parentRef(movieParent.parents.mother),
  'outing',
  undefined,
  'outing_movie',
);
assert(parentResult.outcome.success, 'a living parent can go to a movie');
assert(parentResult.character.cash === 478, 'parent movie spends $22');
assert(parentResult.character.bankBalance === 100, 'parent movie leaves the bank alone');
assert(parentResult.character.parents.mother.relationship === 48, 'parent movie uses the full relationship gain');
assert(parentResult.character.parents.father.relationship === 40, 'the other parent stays put');
assert(parentResult.character.stats.happiness === 54, 'parent movie raises happiness by 4');
assert(
  parentResult.outcome.narrative ===
    'You bought two tickets and watched the whole film together. You spent $22.',
  'parent movie narrative includes the scene and the cost',
);
assert(parentResult.character.timeline.length === 1, 'parent movie writes one journal line');
assert(parentResult.character.timeline[0]?.category === 'relationship', 'parent movie journal is a relationship event');
assert(parentResult.character.timeline[0]?.title === 'Movie', 'parent movie journal uses the outing name');
assert(
  parentResult.character.timeline[0]?.message === parentResult.outcome.narrative,
  'parent movie journal keeps the scene and the cost',
);

const movieSibling = character();
const sister = movieSibling.siblings?.[0];
if (!sister) throw new Error('Missing sibling');
const siblingResult = executeSocialAction(movieSibling, siblingRef(sister), 'outing', undefined, 'outing_movie');
assert(siblingResult.outcome.success, 'a living sibling can go to a movie');
assert(siblingResult.character.cash === 478, 'sibling movie spends $22');
assert(siblingResult.character.siblings?.[0]?.relationship === 48, 'sibling movie uses the full relationship gain');
assert(
  siblingResult.outcome.narrative.includes('You spent $22.'),
  'sibling movie narrative includes the cost',
);

const coolFriend = friend({ relationship: 10 });
const coolPlayer = character({ relationships: [coolFriend] });
const cool = executeSocialAction(
  coolPlayer,
  friendRef(coolFriend, { relationship: 70 }),
  'outing',
  undefined,
  'outing_movie',
);
assert(cool.outcome.success, 'a cool movie still succeeds');
assert(cool.character.cash === 478, 'a cool movie still spends $22');
assert(cool.character.relationships[0]?.relationship === 13, 'a lying ref cannot raise the stored relationship band');
assert(cool.character.stats.happiness === 51, 'a cool movie raises happiness by 1');
assert(
  cool.outcome.narrative ===
    'You bought two tickets. They checked the time more than the screen. You spent $22.',
  'a cool movie says the time fell flat and still names the price',
);
assert(!cool.outcome.narrative.includes('It felt easy.'), 'a cool movie does not use the close clause');

const fullFriend = friend({ relationship: 40 });
const fullPlayer = character({ relationships: [fullFriend] });
const full = executeSocialAction(fullPlayer, friendRef(fullFriend), 'outing', undefined, 'outing_movie');
assert(full.character.relationships[0]?.relationship === 48, 'relationship 40 uses the full movie gain');
assert(
  full.outcome.narrative ===
    'You bought two tickets and watched the whole film together. You spent $22.',
  'relationship 40 uses the full movie scene and the cost',
);

const closeFriend = friend({ relationship: 70 });
const closePlayer = character({ relationships: [closeFriend] });
const close = executeSocialAction(closePlayer, friendRef(closeFriend), 'outing', undefined, 'outing_movie');
assert(close.character.relationships[0]?.relationship === 80, 'relationship 70 adds the extra 2');
assert(close.outcome.narrative.includes('It felt easy.'), 'relationship 70 adds the warmer clause');
assert(close.outcome.narrative.endsWith('You spent $22.'), 'a close movie still names the price');

const brokeFriend = friend();
const broke = character({ relationships: [brokeFriend], cash: 21 });
const refusedCash = executeSocialAction(broke, friendRef(brokeFriend), 'outing', undefined, 'outing_movie');
assert(refusedCash.character === broke, 'unaffordable movie returns the same character');
assert(refusedCash.outcome.success === false, 'unaffordable movie is refused');
assert(broke.cash === 21, 'unaffordable movie leaves cash unchanged');
assert(broke.relationships[0]?.relationship === 40, 'unaffordable movie leaves relationship unchanged');
assert(broke.timeline.length === 0, 'unaffordable movie writes no journal line');
assert(broke.yearlySocialActions?.friend_1 === undefined, 'unaffordable movie records no yearly action');
assert(!refusedCash.outcome.narrative.includes('You spent'), 'a refusal does not claim a spend');

const sameFriend = friend();
const otherFriend = friend({
  id: 'friend_2',
  firstName: 'Jules',
  lastName: 'Nguyen',
  relationship: 40,
});
const pair = character({ relationships: [sameFriend, otherFriend], cash: 500 });
const firstOuting = executeSocialAction(pair, friendRef(sameFriend), 'outing', undefined, 'outing_movie');
const secondOuting = executeSocialAction(
  firstOuting.character,
  friendRef(sameFriend),
  'outing',
  undefined,
  'outing_meal',
);
assert(secondOuting.character === firstOuting.character, 'a second outing with the same person returns that character');
assert(secondOuting.outcome.success === false, 'a second outing with the same person is refused');
assert(firstOuting.character.cash === 478, 'the refused restaurant does not spend again');
assert(firstOuting.character.relationships[0]?.relationship === 48, 'the refused restaurant does not change relationship');
assert(firstOuting.character.timeline.length === 1, 'the refused restaurant adds no journal line');
assert(
  firstOuting.character.yearlySocialActions?.friend_1?.length === 1,
  'the refused restaurant does not record another yearly action',
);

const twoPeople = character({ relationships: [sameFriend, otherFriend], cash: 500 });
const withFirst = executeSocialAction(twoPeople, friendRef(sameFriend), 'outing', undefined, 'outing_movie');
const withSecond = executeSocialAction(
  withFirst.character,
  friendRef(otherFriend),
  'outing',
  undefined,
  'outing_concert',
);
assert(withFirst.outcome.success && withSecond.outcome.success, 'two different people can go out in the same year');
assert(withSecond.character.cash === 393, 'movie then concert spends $22 and then $85');
assert(withSecond.character.relationships[0]?.relationship === 48, 'the first friend keeps the movie gain');
assert(withSecond.character.relationships[1]?.relationship === 54, 'the second friend receives the concert gain');
assert(
  hasPerformedActionThisYear(withSecond.character, 'friend_1', 'outing'),
  'the first friend records an outing',
);
assert(
  hasPerformedActionThisYear(withSecond.character, 'friend_2', 'outing'),
  'the second friend records an outing',
);
assert(withSecond.outcome.narrative.endsWith('You spent $85.'), 'the concert narrative names its own price');

const hangoutFriend = friend();
const hangoutPlayer = character({ relationships: [hangoutFriend] });
const afterPaid = executeSocialAction(hangoutPlayer, friendRef(hangoutFriend), 'outing', undefined, 'outing_movie');
const afterFree = executeSocialAction(afterPaid.character, friendRef(hangoutFriend), 'spend_time');
assert(afterFree.outcome.success, 'a free hangout still succeeds after a paid outing');
assert(afterFree.character.cash === 478, 'a free hangout does not spend the outing cash again');
assert(
  hasPerformedActionThisYear(afterFree.character, 'friend_1', 'outing'),
  'the paid outing remains recorded',
);
assert(
  hasPerformedActionThisYear(afterFree.character, 'friend_1', 'spend_time'),
  'the free hangout is recorded separately',
);

const youngFriend = friend();
const young = character({ age: 15, relationships: [youngFriend] });
const tooYoung = executeSocialAction(young, friendRef(youngFriend), 'outing', undefined, 'outing_concert');
assert(tooYoung.character === young, 'an under-age concert returns the same character');

const unknownFriend = friend();
const unknownPlayer = character({ relationships: [unknownFriend] });
const unknownOuting = executeSocialAction(
  unknownPlayer,
  friendRef(unknownFriend),
  'outing',
  undefined,
  'outing_nope',
);
assert(unknownOuting.character === unknownPlayer, 'an unknown outing returns the same character');

const distant = friend({ relationship: 44 });
const distantPlayer = character({ relationships: [distant], age: 18, cash: 500 });
const lockedDay = executeSocialAction(
  distantPlayer,
  friendRef(distant, { relationship: 90 }),
  'outing',
  undefined,
  'outing_day',
);
assert(lockedDay.character === distantPlayer, 'a day out below relationship 45 returns the same character');

const ready = friend({ relationship: 45 });
const readyPlayer = character({ relationships: [ready], age: 18, cash: 500 });
const dayOut = executeSocialAction(readyPlayer, friendRef(ready), 'outing', undefined, 'outing_day');
assert(dayOut.outcome.success, 'relationship 45 unlocks the day out');
assert(dayOut.character.cash === 340, 'the day out spends $160');
assert(dayOut.character.relationships[0]?.relationship === 61, 'the day out uses the full gain');
assert(
  dayOut.outcome.narrative ===
    'You spent the day out and came home later than you planned. You spent $160.',
  'the day out names the scene and the price',
);
assert(!dayOut.outcome.narrative.includes('It felt easy.'), 'relationship 45 does not add the close clause');

for (const stage of ['dating', 'engaged', 'married'] as const) {
  const partner = friend({ id: stage, romanticStage: stage, relationship: 80 });
  const player = character({ relationships: [partner] });
  const refused = executeSocialAction(
    player,
    friendRef(partner, { romanticStage: 'none' }),
    'outing',
    undefined,
    'outing_movie',
  );
  assert(refused.character === player, `${stage} is refused even when the ref hides the stage`);
}

const spouse = friend({
  id: 'spouse',
  relationshipType: 'spouse',
  romanticStage: 'none',
  role: 'Classmate',
  relationship: 80,
});
const spousePlayer = character({ relationships: [spouse] });
const refusedSpouse = executeSocialAction(
  spousePlayer,
  friendRef(spouse, { romanticStage: 'none' }),
  'outing',
  undefined,
  'outing_movie',
);
assert(refusedSpouse.character === spousePlayer, 'relationship type spouse is refused');

const hiddenPartner = friend({ id: 'hidden', romanticStage: 'none', relationship: 80 });
const hiddenPlayer = character({
  relationships: [hiddenPartner],
  partner: { ...hiddenPartner, romanticStage: 'married', relationshipType: 'spouse', role: 'Wife' },
});
const refusedHidden = executeSocialAction(
  hiddenPlayer,
  friendRef(hiddenPartner, { romanticStage: 'none' }),
  'outing',
  undefined,
  'outing_movie',
);
assert(refusedHidden.character === hiddenPlayer, 'character.partner is refused even when the ref says none');

for (const stage of ['crush', 'flirting'] as const) {
  const person = friend({ id: stage, romanticStage: stage, relationship: 40 });
  const player = character({ relationships: [person] });
  const allowed = executeSocialAction(player, friendRef(person), 'outing', undefined, 'outing_movie');
  assert(allowed.outcome.success, `${stage} can still go out`);
  assert(allowed.character.cash === 478, `${stage} pays for the movie`);
}

const deadRefPlayer = character();
const deadRef = executeSocialAction(
  deadRefPlayer,
  parentRef(deadRefPlayer.parents.mother, { isAlive: false }),
  'outing',
  undefined,
  'outing_movie',
);
assert(deadRef.character === deadRefPlayer, 'a dead ref returns the same character');

const deadMother = { ...character().parents.mother, isAlive: false };
const deadStored = character({
  parents: { ...character().parents, mother: deadMother },
});
const deadStoredResult = executeSocialAction(
  deadStored,
  parentRef(deadMother, { isAlive: true }),
  'outing',
  undefined,
  'outing_movie',
);
assert(deadStoredResult.character === deadStored, 'a stored dead parent returns the same character');
assert(deadStored.cash === 500, 'a stored dead parent spends nothing');
assert(deadStored.timeline.length === 0, 'a stored dead parent writes no journal line');

const missingSibling = character();
const missingSiblingResult = executeSocialAction(
  missingSibling,
  siblingRef(sibling({ id: 'missing' })),
  'outing',
  undefined,
  'outing_movie',
);
assert(missingSiblingResult.character === missingSibling, 'an unknown sibling returns the same character');

const missingFriend = character();
const missingFriendResult = executeSocialAction(
  missingFriend,
  friendRef(friend({ id: 'ghost' })),
  'outing',
  undefined,
  'outing_movie',
);
assert(missingFriendResult.character === missingFriend, 'an unknown friend returns the same character');

const keyboardFriend = friend({ relationship: 40 });
const withKeyboard = character({
  relationships: [keyboardFriend],
  lifestyle: {
    possessions: [
      {
        id: 'keys',
        catalogId: 'instrument_keyboard',
        kind: 'durable',
        purchasePrice: 180,
        purchaseAge: 16,
        status: 'owned',
      },
      { id: 'bad', catalogId: 'instrument_piano', kind: 'durable', status: 'read' },
    ],
    hobbies: [{ id: 'music', level: 2, lastActionAge: 16 }],
  },
});
const concert = executeSocialAction(withKeyboard, friendRef(keyboardFriend), 'outing', undefined, 'outing_concert');
assert(
  concert.outcome.narrative.includes("You caught yourself watching the player's hands."),
  'an owned keyboard adds the concert sentence',
);
assert(concert.outcome.narrative.endsWith('You spent $85.'), 'the concert names its price');
assert(concert.character.lifestyle === withKeyboard.lifestyle, 'the concert does not change possessions or hobbies');
assert(concert.character.cash === 415, 'the concert spends $85');

const computerFriend = friend({ relationship: 40 });
const withComputer = character({
  relationships: [computerFriend],
  lifestyle: {
    possessions: [
      {
        id: 'pc',
        catalogId: 'computer_home',
        kind: 'durable',
        purchasePrice: 650,
        purchaseAge: 16,
        status: 'owned',
      },
    ],
    hobbies: [{ id: 'gaming', level: 1, lastActionAge: null }],
  },
});
const plainConcert = executeSocialAction(
  withComputer,
  friendRef(computerFriend),
  'outing',
  undefined,
  'outing_concert',
);
assert(
  !plainConcert.outcome.narrative.includes("player's hands"),
  'a computer does not add the concert sentence',
);

const malformedFriend = friend({ relationship: 40 });
const malformed = character({
  relationships: [malformedFriend],
  lifestyle: {
    possessions: [{ id: 'bad', catalogId: 'instrument_piano', kind: 'durable', status: 'read' }],
    hobbies: [],
  },
});
const malformedConcert = executeSocialAction(
  malformed,
  friendRef(malformedFriend),
  'outing',
  undefined,
  'outing_concert',
);
assert(
  !malformedConcert.outcome.narrative.includes("player's hands"),
  'a malformed instrument does not add the concert sentence',
);

const deed = home();
const ownerFriend = friend({ relationship: 40 });
const owner = character({
  relationships: [ownerFriend],
  cash: 500,
  bankBalance: 200,
  assets: { properties: [deed] },
});
const worthBefore = calculatePlayerNetWorth(owner);
const boughtNight = executeSocialAction(owner, friendRef(ownerFriend), 'outing', undefined, 'outing_movie');
assert(boughtNight.character.assets?.properties?.[0] === deed, 'the property record stays put');
assert(deed.marketValue === 88000, 'market value stays put');
assert(boughtNight.character.bankBalance === 200, 'bank balance stays put');
assert(calculatePlayerNetWorth(boughtNight.character) === worthBefore - 22, 'net worth moves only by the cash spent');
assert(boughtNight.character.netWorth === calculatePlayerNetWorth(boughtNight.character), 'net worth is stamped from the cash change');

console.log('paid outings: parent, sibling, friend, refusal, and net worth checks passed');
