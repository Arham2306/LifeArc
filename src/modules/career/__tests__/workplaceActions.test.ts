import {
  performWorkHarder,
  performSlackOff,
  performAskForRaise,
  performAskForPromotion,
  performSocializeWithCoworkers,
  performRetire,
  checkPromotionEligibility,
  createInitialCareerState,
} from '../services/careerService';
import { ageUpCharacter } from '../../aging/services/agingService';
import { createInitialEducation } from '../../education/services/educationService';
import type { CharacterProfile } from '../../../types/game';

function createMockCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_test_actions',
    firstName: 'Leo',
    lastName: 'Bennett',
    gender: 'male',
    age: 24,
    birthYear: 2002,
    country: 'United States',
    city: 'New York',
    occupation: 'Junior Software Engineer',
    cash: 5000,
    bankBalance: 0,
    netWorth: 5000,
    isAlive: true,
    stats: {
      health: 85,
      happiness: 80,
      smarts: 85,
      looks: 75,
      karma: 90,
    },
    parents: {
      wealth: 'comfortable',
      father: {
        id: 'p1',
        role: 'father',
        firstName: 'John',
        lastName: 'Bennett',
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
        lastName: 'Bennett',
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
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'ft_software_engineer',
        title: 'Junior Software Engineer',
        companyName: 'Apex Cybernetics',
        field: 'technology',
        type: 'full_time',
        salary: 86000,
        yearsInJob: 2,
        performance: 92,
        hiredAge: 22,
        icon: '💻',
      },
    },
    relationships: [],
    seenEventIds: [],
    timeline: [],
    ...overrides,
  };
}

console.log('--- STARTING WORKPLACE ACTIONS & DEGREE PROMOTION TESTS ---');

// 1. Work Harder Action
const baseChar = createMockCharacter();
const workedRes = performWorkHarder(baseChar);
console.assert(workedRes.isSuccess === true, 'Work harder should succeed');
console.assert(
  workedRes.character.career.yearActions.workedHarder === true,
  'workedHarder action should be flagged'
);
const initialPerf = baseChar.career.currentJob!.performance;
const newPerf = workedRes.character.career.currentJob!.performance;
console.assert(newPerf > initialPerf, 'Job performance should increase');
console.log(`✅ Work Harder: Performance increased from ${initialPerf}% to ${newPerf}%`);

// Try working harder again in the same year (should be blocked)
const repeatRes = performWorkHarder(workedRes.character);
console.assert(repeatRes.isSuccess === false, 'Cannot work harder twice in the same year');
console.log('✅ Cooldown: Repeated work harder blocked for the current year');

// 2. Slack Off Action
const slackRes = performSlackOff(baseChar);
console.assert(
  slackRes.character.career.yearActions.slackedOff === true,
  'slackedOff action should be flagged'
);
console.log(`✅ Slack Off: Processed (Performance reduced, Happiness gained)`);

// 3. Ask for a Raise
const newHireChar = createMockCharacter({
  career: {
    ...createInitialCareerState(),
    currentJob: {
      ...baseChar.career.currentJob!,
      yearsInJob: 0,
    },
  },
});
const earlyRaiseRes = performAskForRaise(newHireChar);
console.assert(earlyRaiseRes.isSuccess === false, 'Raise with < 1 year tenure should be rejected');
console.log('✅ Ask for Raise: Correctly rejected for new hire with < 1 yr tenure');

const raiseRes = performAskForRaise(baseChar);
console.assert(raiseRes.isSuccess === true, 'Raise should be approved for high performance and tenure');
console.assert(
  raiseRes.character.career.currentJob!.salary > 86000,
  'Salary should increase after approved raise'
);
console.log(`✅ Ask for Raise: Approved! New salary: $${raiseRes.character.career.currentJob!.salary.toLocaleString()}/yr`);

// 4. Ask for Promotion (Tier 1: Senior Software Engineer)
const promo1Res = performAskForPromotion(baseChar);
console.assert(promo1Res.isSuccess === true, 'Promotion to Senior Software Engineer should succeed');
console.assert(
  promo1Res.character.career.currentJob!.title === 'Senior Software Engineer',
  'Title should be Senior Software Engineer'
);
console.assert(
  promo1Res.character.career.currentJob!.salary === 125000,
  'Salary should jump to $125,000'
);
console.log(`✅ Promotion Tier 1: Promoted to "${promo1Res.character.career.currentJob!.title}" with salary $${promo1Res.character.career.currentJob!.salary.toLocaleString()}/yr`);

// 5. Ask for Promotion to Executive Tier WITHOUT required Master's Degree
// Re-enable promotion for test by clearing yearActions and setting tenure/performance
const seniorCharWithoutMasters: CharacterProfile = {
  ...promo1Res.character,
  career: {
    ...promo1Res.character.career,
    currentJob: {
      ...promo1Res.character.career.currentJob!,
      yearsInJob: 3,
      performance: 92,
    },
    yearActions: {
      ...promo1Res.character.career.yearActions,
      askedForPromotion: false,
    },
  },
};

const degreeCheck = checkPromotionEligibility(seniorCharWithoutMasters);
console.assert(degreeCheck.missingDegree === true, 'Next tier should require graduate degree');
console.assert(
  degreeCheck.missingDegreeName?.includes('Master of Science'),
  'Missing degree should be Master of Science (M.S. / Ph.D.)'
);
console.log(`✅ Degree Gate Checked: ${degreeCheck.reason}`);

const promoBlockedRes = performAskForPromotion(seniorCharWithoutMasters);
console.assert(promoBlockedRes.isSuccess === false, 'Promotion without required degree should be denied');
console.assert(
  promoBlockedRes.missingDegreeRequirement?.includes('Master of Science'),
  'Outcome should specify missing Master of Science requirement'
);
console.log(`✅ Degree Gate Enforced: Promotion denied with guidance: "${promoBlockedRes.message.slice(0, 100)}..."`);

// 6. Award Master of Science and re-attempt promotion
const seniorCharWithMasters: CharacterProfile = {
  ...seniorCharWithoutMasters,
  education: {
    ...seniorCharWithoutMasters.education,
    diplomas: [
      ...seniorCharWithoutMasters.education.diplomas,
      'Master of Science (M.S. / Ph.D.)',
    ],
  },
  career: {
    ...seniorCharWithoutMasters.career,
    yearActions: {
      ...seniorCharWithoutMasters.career.yearActions,
      askedForPromotion: false,
    },
  },
};

const promoExecutiveRes = performAskForPromotion(seniorCharWithMasters);
console.assert(promoExecutiveRes.isSuccess === true, 'Promotion with Master of Science should succeed!');
console.assert(
  promoExecutiveRes.character.career.currentJob!.title === 'Principal AI Scientist & Tech Director',
  'Title should update to Principal AI Scientist & Tech Director'
);
console.assert(
  promoExecutiveRes.character.career.currentJob!.salary === 185000,
  'Salary should jump to $185,000'
);
console.log(`✅ Smart Degree Promotion: Successfully promoted to "${promoExecutiveRes.character.career.currentJob!.title}" ($${promoExecutiveRes.character.career.currentJob!.salary.toLocaleString()}/yr) after earning Master of Science!`);

// 7. Socialize with Coworkers
const socializeRes = performSocializeWithCoworkers(baseChar);
console.assert(socializeRes.isSuccess === true, 'Socialize should succeed');
console.assert(
  socializeRes.character.relationships.some((r) => r.relationshipType === 'coworker'),
  'Coworker should exist in relationships'
);
console.log('✅ Socialize with Coworkers: Bonded with team and boosted coworker relationships');

// 8. Retirement (Age 65)
const olderChar: CharacterProfile = {
  ...baseChar,
  age: 65,
};
const retireRes = performRetire(olderChar);
console.assert(retireRes.isSuccess === true, 'Retirement at age 65 should succeed');
console.assert(retireRes.character.occupation === 'Retired', 'Occupation should be Retired');
console.assert(retireRes.character.career.currentJob === null, 'Active job should be null');
console.assert(retireRes.character.career.history.length === 1, 'Job moved to history with reason retired');
console.log(`✅ Retirement: Formally retired at Age 65 with pension package!`);

// 9. Age-Up Resets Year Actions
const charWithUsedActions = workedRes.character;
console.assert(charWithUsedActions.career.yearActions.workedHarder === true);
const agedChar = ageUpCharacter(charWithUsedActions);
console.assert(
  agedChar.career.yearActions.workedHarder === false,
  'Year actions should be reset upon aging up'
);
console.assert(
  agedChar.career.yearActions.askedForRaise === false,
  'Raise action reset on age up'
);
console.log('✅ Year Actions Reset: All workplace actions reset on Age-Up');

console.log('--- ALL WORKPLACE ACTIONS & DEGREE PROMOTION TESTS PASSED! ---');
