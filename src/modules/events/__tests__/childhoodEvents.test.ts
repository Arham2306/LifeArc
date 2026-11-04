import { EVENT_POOL } from '../data';
import { resolveEventChoice, getEligibleEvents } from '../services/eventService';
import { createInitialEducation } from '../../education/services/educationService';
import { createInitialCareerState } from '../../career/services/careerService';
import type { CharacterProfile } from '../../../types/game';

function createMockChild(age: number, stage: 'elementary' | 'middle_school' | 'none' = 'elementary'): CharacterProfile {
  return {
    id: 'test-child-1',
    firstName: 'Jamie',
    lastName: 'Taylor',
    gender: 'female',
    age,
    birthYear: 2020,
    country: 'United States',
    city: 'Chicago',
    occupation: 'None',
    cash: 0,
    bankBalance: 0,
    netWorth: 0,
    isAlive: true,
    stats: {
      health: 80,
      happiness: 80,
      smarts: 70,
      looks: 65,
      karma: 75,
    },
    parents: {
      wealth: 'comfortable',
      father: {
        id: 'dad',
        role: 'father',
        firstName: 'Robert',
        lastName: 'Taylor',
        age: 35,
        occupation: 'Architect',
        isAlive: true,
        relationship: 90,
        generosity: 70,
      },
      mother: {
        id: 'mom',
        role: 'mother',
        firstName: 'Sarah',
        lastName: 'Taylor',
        age: 34,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 92,
        generosity: 75,
      },
    },
    education: {
      ...createInitialEducation(),
      currentStage: stage,
    },
    career: createInitialCareerState(),
    relationships: [],
    timeline: [],
    seenEventIds: [],
  };
}

console.log('--- STARTING CHILDHOOD EVENTS EXPANSION VERIFICATION TESTS ---');

// 1. Rich event coverage across all childhood ages (1 - 12)
for (let age = 1; age <= 12; age++) {
  const child = createMockChild(age, age >= 6 && age <= 10 ? 'elementary' : 'none');
  const eligible = getEligibleEvents(child);
  if (eligible.length < 3) {
    throw new Error(`Expected at least 3 eligible events for age ${age}, got ${eligible.length}`);
  }
}
console.log('✅ All childhood ages (1-12) have a rich pool of eligible events');

// 2. Infant & toddler events at age 1 and 2
const baby = createMockChild(1, 'none');
const eligibleBabyEvents = getEligibleEvents(baby);
const babyEventIds = eligibleBabyEvents.map((e) => e.id);

if (!babyEventIds.includes('first_steps_wobble')) {
  throw new Error('Should include first steps at age 1');
}
if (!babyEventIds.includes('smash_cake_chaos')) {
  throw new Error('Should include smash cake at age 1');
}
if (!babyEventIds.includes('first_word_debate')) {
  throw new Error('Should include first word at age 1');
}
console.log('✅ Age 1 baby events properly registered and eligible');

// 3. Resolves kickball event and introduces classmate friend
const child = createMockChild(8, 'elementary');
const kickballEvent = EVENT_POOL.find((e) => e.id === 'recess_kickball_clutch');
if (!kickballEvent) throw new Error('recess_kickball_clutch event should exist');

const grandSlamChoice = kickballEvent.choices.find((c) => c.id === 'power_kick_fence');
if (!grandSlamChoice) throw new Error('Power kick choice should exist');

const resolution = resolveEventChoice(child, kickballEvent, grandSlamChoice);
if (resolution.character.relationships.length === 0) {
  throw new Error('Should have added classmate to relationships');
}
const friend = resolution.character.relationships.find((r) => r.firstName === 'Maya');
if (!friend || friend.role !== 'Recess Sports Partner') {
  throw new Error('Maya Lin should be introduced with Recess Sports Partner role');
}
if (resolution.character.stats.happiness <= 80) {
  throw new Error('Happiness should increase from walk-off hit');
}
console.log(`✅ Recess kickball successfully introduced classmate ${friend.firstName} ${friend.lastName} (${friend.role})`);

// 4. Resolves summer lemonade stand
const lemonadeEvent = EVENT_POOL.find((e) => e.id === 'lemonade_stand_hustle');
if (!lemonadeEvent) throw new Error('lemonade_stand_hustle event should exist');

const cookieUpsellChoice = lemonadeEvent.choices.find((c) => c.id === 'cookie_combo_upsell');
if (!cookieUpsellChoice) throw new Error('cookie_combo_upsell choice should exist');

const lemonadeRes = resolveEventChoice(child, lemonadeEvent, cookieUpsellChoice);
if (lemonadeRes.character.stats.happiness <= 80 || lemonadeRes.character.stats.smarts <= 70) {
  throw new Error('Happiness and smarts should increase from junior entrepreneurship');
}
console.log(`✅ Lemonade stand choice resolved with message: "${lemonadeRes.message.slice(0, 50)}..."`);

console.log('--- ALL CHILDHOOD EVENT VERIFICATION TESTS PASSED PERFECTLY! ---');
