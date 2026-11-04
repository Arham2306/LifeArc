import { cohortService } from '../services/cohortService';
import { ageUpCharacter } from '../../aging/services/agingService';
import { generateParents } from '../../character/services/familyService';
import { createInitialEducation } from '../../education/services/educationService';
import { createInitialCareerState, applyForJob } from '../../career/services/careerService';
import { formatEventText, resolveEventChoice } from '../../events/services/eventService';
import type { LifeEventTemplate } from '../../events/types';
import type { CharacterProfile, PersonProfile } from '../../../types/game';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function createMockCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'test-player-cohort',
    firstName: 'Leo',
    lastName: 'Vance',
    gender: 'male',
    age: 4,
    birthYear: 2020,
    country: 'United States',
    city: 'Chicago',
    occupation: 'Toddler',
    cash: 500,
    bankBalance: 0,
    netWorth: 500,
    isAlive: true,
    stats: {
      health: 90,
      happiness: 85,
      smarts: 80,
      looks: 80,
      karma: 80,
    },
    parents: generateParents('Vance'),
    siblings: [],
    relationships: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

console.log('\n--- STARTING DYNAMIC COHORT & SOCIAL LIFECYCLE TESTS ---');

// Test 1: Elementary School Cohort Generation at Age 5/6
let player = createMockCharacter({ age: 4 });
player = ageUpCharacter(player); // Age 5 (Elementary entry)

const elementaryClassmates = (player.relationships || []).filter(
  (r) => r.cohortType === 'classmate' && r.stageMet === 'childhood'
);
assert(elementaryClassmates.length === 6, 'Generated 6 elementary school classmates');
assert(
  elementaryClassmates.every((c) => c.relationship >= 35 && c.relationship <= 55),
  'Elementary classmates start in neutral-to-friendly rapport (35-55%)'
);
assert(
  elementaryClassmates.some((c) => Boolean(c.personalityArchetype)),
  'Classmates have personality archetypes assigned'
);
console.log(`✅ Elementary Cohort: Introduced ${elementaryClassmates.length} classmates with diverse archetypes!`);

// Test 2: Nurture One Best Friend and Keep Others at Low Rapport
// Boost first classmate to 85% (Best Friend status)
player.relationships[0].relationship = 85;
player.relationships[0].cohortType = 'best_friend';
const bestFriendId = player.relationships[0].id;
const bestFriendName = `${player.relationships[0].firstName} ${player.relationships[0].lastName}`;

// Lower another classmate to 25% (unmaintained)
player.relationships[1].relationship = 25;

// Test 3: Middle School Transition at Age 11 (Batch Introduction + Pruning)
// Fast forward player to age 10
player.age = 10;
player = ageUpCharacter(player); // Turns 11 (Middle school entry)

const postMiddleRels = player.relationships || [];
const bestFriendRetained = postMiddleRels.some((r) => r.id === bestFriendId);
assert(bestFriendRetained === true, 'Best friend survived middle school transition with high rapport');

const middleSchoolers = postMiddleRels.filter((r) => r.stageMet === 'middle_school');
assert(middleSchoolers.length === 4, 'Introduced 4 new middle school classmates');
console.log(`✅ Middle School Transition: Retained best friend (${bestFriendName}) and added 4 new middle school peers!`);

// Test 4: High School Transition at Age 14
player.age = 13;
player = ageUpCharacter(player); // Turns 14 (High school entry)

const highSchoolers = (player.relationships || []).filter((r) => r.stageMet === 'high_school');
assert(highSchoolers.length === 4, 'Introduced 4 new high school classmates upon entering high school');
console.log(`✅ High School Transition: Added 4 new high school classmates!`);

// Test 5: Workplace Coworker Cohort Generation
const adultChar = createMockCharacter({
  age: 22,
  occupation: 'Unemployed',
  relationships: [],
  education: {
    ...createInitialEducation(),
    diplomas: ['Elementary School', 'Middle School', 'High School Diploma', 'B.S. in Computer Science'],
  },
  stats: { health: 90, happiness: 85, smarts: 90, looks: 80, karma: 80 },
});

const hireResult = applyForJob(adultChar, 'ft_software_engineer', 0, 'Acme Robotics');
assert(hireResult.hired === true, 'Player hired as Software Engineer');

const coworkers = (hireResult.character.relationships || []).filter(
  (r) => r.cohortType === 'coworker'
);
assert(coworkers.length === 4, 'Generated 4 coworkers upon starting new career at Acme Robotics');
assert(coworkers.some((c) => c.role.includes('Team Lead')), 'Includes a Team Lead among coworkers');
console.log(`✅ Workplace Cohort: Successfully generated 4 coworkers at Acme Robotics!`);

// Test 6: Immunity Shield (Family and Partner Never Pruned)
const partnerPeer: PersonProfile = {
  id: 'partner-123',
  firstName: 'Elena',
  lastName: 'Rostova',
  gender: 'female',
  age: 22,
  role: 'Girlfriend',
  relationshipType: 'dating',
  relationship: 30, // Even with low relationship!
  originStory: 'Met in college',
  stageMet: 'university',
  romanceUnlocked: true,
  romanceMeter: 40,
  romanticStage: 'dating',
};

const charWithShield = createMockCharacter({
  age: 24,
  partner: partnerPeer,
  relationships: [partnerPeer],
});

const driftResult = cohortService.evaluateDriftingApart(charWithShield, true);
assert(
  driftResult.updatedRelationships.some((r) => r.id === 'partner-123'),
  'Romantic partner is shielded from drifting apart even at low relationship score'
);
console.log('✅ Immunity Shield: Romantic partners, spouses, and family are immune to random drifting.');

// Test 7: Dynamic Event Text Formatting & Real-Time Impact
const testPeer: PersonProfile = {
  id: 'peer-test-1',
  firstName: 'Lucas',
  lastName: 'Miller',
  gender: 'male',
  age: 15,
  role: 'High School Classmate',
  relationshipType: 'classmate',
  relationship: 50,
  originStory: 'Homeroom neighbor',
  stageMet: 'high_school',
};

const teenChar = createMockCharacter({
  age: 15,
  relationships: [testPeer],
});

const rawDesc = '{peerFirstName} asks if {peerPronoun} can borrow your class notes before the quiz.';
const formatted = formatEventText(rawDesc, teenChar, testPeer);
assert(formatted.includes('Lucas asks if he can borrow your class notes'), 'Dynamically formatted peer text');

const testEvent: LifeEventTemplate = {
  id: 'event-notes-share',
  title: 'Lending Notes',
  description: rawDesc,
  minAge: 14,
  maxAge: 18,
  category: 'social',
  icon: '📝',
  choices: [
    {
      id: 'share_notes',
      label: 'Share your notes',
      icon: '🤝',
      outcomes: [
        {
          weight: 1,
          message: '{peerFirstName} thanked you enthusiastically!',
          effects: { happiness: 3 },
          relationshipDelta: {
            personName: 'Lucas Miller',
            delta: 15,
          },
        },
      ],
    },
  ],
};

const eventRes = resolveEventChoice(teenChar, testEvent, testEvent.choices[0], testPeer);
const updatedLucas = eventRes.character.relationships.find((r) => r.id === testPeer.id);
assert(updatedLucas?.relationship === 65, 'Real-time relationship bar increased from 50% to 65%');
console.log(`✅ Dynamic Event Integration: Event choice directly boosted ${testPeer.firstName}'s relationship (50% -> 65%)!`);

console.log('--- ALL DYNAMIC COHORT & LIFECYCLE TESTS PASSED! ---\n');
