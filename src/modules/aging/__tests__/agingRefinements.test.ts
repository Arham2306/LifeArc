import { ageUpCharacter, getOccupationForAge } from '../services/agingService';
import { progressCareerForYear, applyForJob } from '../../career/services/careerService';
import { getJobTemplateById, generateCompanyName } from '../../career/data/jobCatalog';
import { getEligibleEvents } from '../../events/services/eventService';
import type { CharacterProfile } from '../../../types/game';
import { createInitialEducation } from '../../education/services/educationService';
import { createInitialCareerState } from '../../career/services/careerService';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function createMockCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_test',
    firstName: 'Alex',
    lastName: 'Rivera',
    gender: 'non-binary',
    age: 24,
    birthYear: 2000,
    city: 'New York',
    country: 'United States',
    isAlive: true,
    stats: {
      health: 85,
      happiness: 80,
      smarts: 80,
      looks: 75,
      karma: 90,
    },
    cash: 5000,
    bankBalance: 0,
    netWorth: 5000,
    occupation: 'Unemployed',
    parents: {
      father: {
        id: 'dad_1',
        role: 'father',
        firstName: 'Marcus',
        lastName: 'Rivera',
        age: 52,
        occupation: 'Accountant',
        isAlive: true,
        relationship: 85,
        generosity: 75,
      },
      mother: {
        id: 'mom_1',
        role: 'mother',
        firstName: 'Elena',
        lastName: 'Rivera',
        age: 50,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 90,
        generosity: 80,
      },
      wealth: 'comfortable',
    },
    relationships: [
      {
        id: 'rel_friend_1',
        firstName: 'Sam',
        lastName: 'Taylor',
        relationshipType: 'friend',
        gender: 'female',
        age: 24,
        relationship: 80,
        role: 'Friend',
        originStory: 'Met in high school',
        stageMet: 'high_school',
      },
    ],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

console.log('--- STARTING AGING & CAREER REFINEMENT TESTS ---');

// 1. Occupation Resolution Test
{
  assert(getOccupationForAge(2) === 'Infant', 'Age 2 is Infant');
  assert(getOccupationForAge(7) === 'Elementary Student', 'Age 7 is Elementary Student');
  assert(getOccupationForAge(12) === 'Middle School Student', 'Age 12 is Middle School Student');
  assert(getOccupationForAge(16) === 'High School Student', 'Age 16 is High School Student');
  assert(getOccupationForAge(22, undefined, 'university') === 'University Student', 'University stage resolves University Student');
  assert(getOccupationForAge(25, undefined, 'none', 'Senior Software Engineer') === 'Senior Software Engineer', 'Active job title resolves');
  // When activeJobTitle is undefined and was previously an old job title, it should revert to Unemployed
  assert(getOccupationForAge(25, 'Junior Software Engineer', 'none', undefined) === 'Unemployed', 'Reverts to Unemployed');
  // Retired stays Retired
  assert(getOccupationForAge(66, 'Retired', 'none', undefined) === 'Retired', 'Retired stays Retired');
  console.log('✅ Occupation resolution: Correctly returns Unemployed when no longer working');
}

// 2. Relationship Aging Test
{
  const char = createMockCharacter({
    age: 20,
    relationships: [
      {
        id: 'rel_1',
        firstName: 'Casey',
        lastName: 'Smith',
        relationshipType: 'friend',
        gender: 'male',
        age: 20,
        relationship: 80,
        role: 'Friend',
        originStory: 'Met in college',
        stageMet: 'university',
      },
    ],
  });

  const aged = ageUpCharacter(char);
  assert(aged.age === 21, 'Character aged to 21');
  assert(aged.relationships[0].age === 21, 'Friend aged to 21');
  console.log('✅ Relationships: Friend ages up alongside the character (20 -> 21)');
}

// 3. Low Performance Firing Test
{
  const char = createMockCharacter({
    age: 25,
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'ft_software_engineer',
        title: 'Junior Software Engineer',
        companyName: 'Apex Systems',
        field: 'technology',
        type: 'full_time',
        salary: 75000,
        yearsInJob: 2,
        performance: 8, // dangerously low (< 15)
        hiredAge: 23,
        icon: '💻',
      },
    },
  });

  // Annual career progress with abysmal performance
  const result = progressCareerForYear(char, 26);
  assert(result.career.currentJob === null, 'Employee should be fired when performance is under 15%');
  assert(result.career.history.length === 1, 'Fired job recorded in history');
  assert(result.career.history[0].reasonForLeaving === 'fired', 'reasonForLeaving is fired');
  assert(result.career.history[0].title === 'Junior Software Engineer', 'History title matches');
  assert(result.events.some((e) => (e.title ?? '').includes('Terminated')), 'Termination event logged in events');
  console.log('✅ Career Termination: Underperforming employee (<15% performance) was fired and archived into history');
}

// 4. Stable Company Name Generation Test
{
  const job = getJobTemplateById('ft_software_engineer')!;
  const name1 = generateCompanyName('Seattle', job);
  const name2 = generateCompanyName('Seattle', job);
  assert(name1.length > 0, 'Name 1 not empty');
  assert(name2.length > 0, 'Name 2 not empty');

  // Apply with custom company name override
  const baseChar = createMockCharacter({
    age: 22,
    education: {
      ...createInitialEducation(),
      diplomas: ['High School Diploma', 'B.S. in Computer Science'],
    },
  });

  const hiredResult = applyForJob(baseChar, 'ft_software_engineer', 0, 'Cyberdyne Systems');
  assert(hiredResult.companyName === 'Cyberdyne Systems', 'Interview outcome has company name');
  assert(hiredResult.character.career.currentJob?.companyName === 'Cyberdyne Systems', 'Job has company name');
  console.log('✅ Company Name Stability: Custom company name "Cyberdyne Systems" preserved across interview and job state');
}

// 5. Parent Mortality and Event Protection Test
{
  const charWithElderlyDad = createMockCharacter({
    age: 60,
    parents: {
      father: {
        id: 'dad_elderly',
        role: 'father',
        firstName: 'Arthur',
        lastName: 'Rivera',
        age: 89,
        occupation: 'Retired',
        isAlive: true,
        relationship: 95,
        generosity: 90,
      },
      mother: {
        id: 'mom_elderly',
        role: 'mother',
        firstName: 'Martha',
        lastName: 'Rivera',
        age: 87,
        occupation: 'Retired',
        isAlive: true,
        relationship: 95,
        generosity: 90,
      },
      wealth: 'comfortable',
    },
  });

  // Verify that an deceased parent does not trigger events addressing them
  const charWithDeceasedMom = createMockCharacter({
    age: 30,
    parents: {
      ...charWithElderlyDad.parents,
      mother: {
        ...charWithElderlyDad.parents.mother,
        isAlive: false,
      },
    },
  });

  const eligible = getEligibleEvents(charWithDeceasedMom);
  const momEvents = eligible.filter((e) => e.description.includes('{motherName}'));
  assert(momEvents.length === 0, 'No event addressing {motherName} should trigger when mother is deceased');
  console.log('✅ Parent Safety: No events featuring deceased mother are eligible for triggering');
}

console.log('--- ALL AGING & CAREER REFINEMENT TESTS PASSED PERFECTLY! ---');
