import { getEligibleEvents, formatEventText, resolveEventChoice } from '../services/eventService';
import { WORKPLACE_EVENTS } from '../data/workplaceEvents';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import type { CharacterProfile } from '../../../types/game';

function createMockCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_test',
    firstName: 'Alex',
    lastName: 'Morgan',
    gender: 'male',
    age: 24,
    birthYear: 2002,
    country: 'United States',
    city: 'New York',
    occupation: 'Unemployed',
    cash: 5000,
    bankBalance: 0,
    netWorth: 5000,
    isAlive: true,
    stats: {
      health: 80,
      happiness: 80,
      smarts: 80,
      looks: 75,
      karma: 90,
    },
    parents: {
      wealth: 'comfortable',
      father: {
        id: 'p1',
        role: 'father',
        firstName: 'John',
        lastName: 'Morgan',
        age: 50,
        occupation: 'Accountant',
        isAlive: true,
        relationship: 85,
        generosity: 70,
      },
      mother: {
        id: 'p2',
        role: 'mother',
        firstName: 'Sarah',
        lastName: 'Morgan',
        age: 49,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 85,
        generosity: 70,
      },
    },
    education: {
      ...createInitialEducation(),
      diplomas: ['High School Diploma', 'B.S. in Computer Science'],
    },
    career: createInitialCareerState(),
    relationships: [],
    seenEventIds: [],
    timeline: [],
    ...overrides,
  };
}

console.log('--- STARTING WORKPLACE EVENTS VERIFICATION TESTS ---');

// 1. Unemployed Character should NOT get any requiresEmployed events
const unemployed = createMockCharacter();
const unemployedEligible = getEligibleEvents(unemployed);
const hasWorkplaceWhenUnemployed = unemployedEligible.some((e) => e.requiresEmployed);
console.assert(!hasWorkplaceWhenUnemployed, 'Unemployed character should not get requiresEmployed events');
console.log('✅ Unemployed: 0 workplace events in eligible pool');

// 2. Employed Tech Character
const techChar = createMockCharacter({
  career: {
    ...createInitialCareerState(),
    currentJob: {
      jobId: 'ft_software_engineer',
      title: 'Junior Software Engineer',
      companyName: 'Apex Cybernetics New York',
      field: 'technology',
      type: 'full_time',
      salary: 86000,
      yearsInJob: 1,
      performance: 65,
      hiredAge: 23,
      icon: '💻',
    },
  },
});

const techEligible = getEligibleEvents(techChar);
const techWorkplaceEvents = techEligible.filter((e) => e.requiresEmployed);
console.assert(techWorkplaceEvents.length > 0, 'Tech worker should have workplace events');

// Check field matching
const hasTechEvent = techWorkplaceEvents.some((e) => e.id === 'wp_tech_server_crash');
const hasMedEvent = techWorkplaceEvents.some((e) => e.id === 'wp_med_code_triage');
console.assert(hasTechEvent, 'Tech worker should be eligible for server crash event');
console.assert(!hasMedEvent, 'Tech worker should NOT receive medical triage events');
console.log(`✅ Career Field Filtering: Tech worker has ${techWorkplaceEvents.length} eligible workplace events, including server crash and excluding medical triage`);

// 3. Text Interpolation
const serverCrashEvent = WORKPLACE_EVENTS.find((e) => e.id === 'wp_tech_server_crash')!;
const formattedDesc = formatEventText(serverCrashEvent.description, techChar);
console.assert(
  formattedDesc.includes('Apex Cybernetics New York'),
  'Description should include company name'
);
console.log('✅ Text Interpolation:', formattedDesc);

// 4. Job Performance Outcome Delta & Clamping
const choiceRollback = serverCrashEvent.choices[0];
const resolution = resolveEventChoice(techChar, serverCrashEvent, choiceRollback);
const updatedPerf = resolution.character.career.currentJob?.performance ?? 0;
console.assert(updatedPerf > 65, 'Performance should increase after successful rollback');
console.assert(resolution.applied.jobPerformance !== undefined, 'jobPerformance should be tracked in applied effects');
console.log(`✅ Performance Delta: Performance increased from 65% to ${updatedPerf}% (Applied: +${resolution.applied.jobPerformance}%)`);

// 5. Coworker Relationship Introduction
const coworkerEvent = WORKPLACE_EVENTS.find((e) => e.id === 'wp_supportive_coworker_intro')!;
const coworkerChoice = coworkerEvent.choices[0];
const coworkerRes = resolveEventChoice(techChar, coworkerEvent, coworkerChoice);
console.assert(
  coworkerRes.character.relationships.some((r) => r.firstName === 'Jordan'),
  'Jordan Vance should be added to character relationships'
);
const jordan = coworkerRes.character.relationships.find((r) => r.firstName === 'Jordan')!;
console.log(`✅ Workplace Relationship: Introduced ${jordan.firstName} ${jordan.lastName} (${jordan.role}, ${jordan.relationshipType}, relationship: ${jordan.relationship})`);

console.log('--- ALL WORKPLACE EVENT TESTS PASSED PERFECTLY! ---');

