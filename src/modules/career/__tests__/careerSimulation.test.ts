import {
  applyCareerCrimeConsequence,
  evaluateJobEligibility,
  getSortedJobListings,
  applyForJob,
  performWorkHarder,
  performAskForRaise,
  progressCareerForYear,
  resignFromJob,
  createInitialCareerState,
} from '../services/careerService';
import { getJobTemplateById } from '../data/jobCatalog';
import { ageUpCharacter } from '../../aging/services/agingService';
import { createInitialEducation } from '../../education/services/educationService';
import type { CharacterProfile } from '../../../types/game';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createMockCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_test',
    firstName: 'Alex',
    lastName: 'Morgan',
    gender: 'male',
    age: 18,
    birthYear: 2008,
    country: 'United States',
    city: 'New York',
    occupation: 'High School Graduate',
    cash: 0,
    bankBalance: 0,
    netWorth: 0,
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
        age: 45,
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
        age: 44,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 85,
        generosity: 70,
      },
    },
    education: {
      ...createInitialEducation(),
      diplomas: ['Elementary School', 'Middle School', 'High School Diploma'],
    },
    career: createInitialCareerState(),
    relationships: [],
    seenEventIds: [],
    timeline: [],
    ...overrides,
  };
}

console.log('--- STARTING CAREER MODULE SIMULATION TESTS ---');

// 1. Age Gating Tests
const kidChar = createMockCharacter({ age: 14 });
const teenChar = createMockCharacter({ age: 16 });
const adultChar = createMockCharacter({ age: 18 });

const kidListings = getSortedJobListings(kidChar);
console.assert(kidListings.length === 0, 'Age 14 should have 0 job listings');
console.log('✅ Age 14: Job market properly locked (0 listings)');

const teenListings = getSortedJobListings(teenChar);
console.assert(teenListings.length > 0, 'Age 16 should have listings');
console.assert(
  teenListings.every((l) => l.job.type === 'part_time'),
  'Age 16 should only see part-time gigs'
);
console.log(`✅ Age 16: Part-time gigs unlocked (${teenListings.length} listings, all part-time)`);

const adultListings = getSortedJobListings(adultChar);
console.assert(
  adultListings.some((l) => l.job.type === 'full_time'),
  'Age 18 should see full-time careers'
);
console.assert(
  adultListings.some((l) => l.job.type === 'freelance'),
  'Age 18 should see freelance gigs'
);
console.log(`✅ Age 18: Full job market unlocked (${adultListings.length} total listings)`);

// 2. High School Grad vs Degree Careers
const sweJob = getJobTemplateById('ft_software_engineer')!;
const hsSweElig = evaluateJobEligibility(adultChar, sweJob);
console.assert(
  !hsSweElig.isAdmissible && !hsSweElig.hasRequiredDegree,
  'HS Graduate without CS degree cannot apply for Software Engineer'
);
console.assert(
  hsSweElig.missingRequirementLabel?.includes('B.S. in Computer Science'),
  'Missing requirement message should mention B.S. in Computer Science'
);
console.log('✅ High School Grad: High-paying degree jobs show locked requirement:', hsSweElig.missingRequirementLabel);

const dishwasherJob = getJobTemplateById('ft_dishwasher')!;
const hsDishElig = evaluateJobEligibility(adultChar, dishwasherJob);
console.assert(
  hsDishElig.isAdmissible,
  'Restaurant Dishwasher should be open to high school graduate'
);
console.log('✅ High School Grad: Open-tier jobs are immediately accessible');

// 3. Degree Match Priority Sorting
const csGrad = createMockCharacter({
  age: 22,
  education: {
    ...createInitialEducation(),
    diplomas: [
      'Elementary School',
      'Middle School',
      'High School Diploma',
      'B.S. in Computer Science',
    ],
  },
});

const csListings = getSortedJobListings(csGrad);
const topJob = csListings[0];
console.assert(
  topJob.eligibility.isDegreeMatch === true,
  'Top job for CS grad should be a degree match'
);
console.assert(
  topJob.job.id === 'ft_software_engineer' || topJob.job.id === 'ft_cybersecurity_analyst',
  'Software Engineer or Cybersecurity Analyst should be top recommendation'
);
console.log(`✅ CS Graduate: Top recommended job is "${topJob.job.title}" (Degree Match: ${topJob.eligibility.matchedDegreeTitle})`);

// 4. Job Interview Flow
const interviewResult = applyForJob(csGrad, 'ft_software_engineer', 0);
console.assert(interviewResult.hired === true, 'Passing interview option 0 should hire');
console.assert(
  interviewResult.character.career.currentJob?.title === 'Junior Software Engineer',
  'Current job should be Junior Software Engineer'
);
console.assert(
  interviewResult.character.occupation === 'Junior Software Engineer',
  'Occupation should be updated to Junior Software Engineer'
);
console.log('✅ Interview Flow: Passed interview, hired as Junior Software Engineer');

// 5. Annual Salary Payout & Student Debt Repayment on Age-Up
const employedCharWithDebt = {
  ...interviewResult.character,
  education: {
    ...interviewResult.character.education,
    studentDebt: 30000,
  },
};

const agedChar = ageUpCharacter(employedCharWithDebt);
console.assert(agedChar.age === 23, 'Age should increment to 23');
console.assert(agedChar.cash > 0, 'Cash should increase from annual salary payout');
console.assert(
  agedChar.education.studentDebt < 30000,
  'Student debt should decrease from automatic payroll installment'
);
console.assert(
  agedChar.career.currentJob?.yearsInJob === 1,
  'Years in job should increment to 1'
);
console.log(
  `✅ Annual Salary & Debt: Earned cash $${agedChar.cash.toLocaleString()}, student debt reduced from $30,000 to $${agedChar.education.studentDebt.toLocaleString()}`
);

// 6. Resignation
const resigned = resignFromJob(agedChar);
console.assert(resigned.character.career.currentJob === null, 'Current job should be null after resignation');
console.assert(
  resigned.character.career.history.length === 1,
  'Job should be moved to career history'
);
console.assert(
  resigned.character.occupation === 'Unemployed',
  'Occupation should reset to Unemployed'
);
console.log('✅ Resignation: Successfully resigned and archived into history');

// 7. Phase 2: Pre-trial Suspension (50% Paid vs. Unpaid), Paused Progression, Acquittal, & Fraud Termination
{
  const accountantChar = createMockCharacter({
    id: 'acct-crime-1',
    age: 26,
    occupation: 'Accountant',
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'acct_1',
        title: 'Accountant',
        companyName: 'Ledger Co',
        field: 'business_finance',
        type: 'full_time',
        salary: 80000,
        yearsInJob: 3,
        performance: 10, // Low performance should NOT auto-fire while suspended pending trial
        hiredAge: 23,
        icon: '📊',
      },
    },
  });

  const fraudPending = {
    id: 'case-career-fraud-1',
    crimeId: 'fraud_scam' as const,
    title: 'Financial Scam',
    offenseClass: 'felony' as const,
    jurisdiction: 'adult' as const,
  };

  // Pre-trial arrest puts full-time Accountant on 50% paid administrative leave
  const suspendedRes = applyCareerCrimeConsequence(
    accountantChar,
    fraudPending,
    'arrest',
    'witness_known',
  );
  assert(
    suspendedRes.applied &&
      suspendedRes.suspended &&
      suspendedRes.character.career.currentJob?.suspendedPendingTrial?.payMultiplier === 0.5,
    'Sensitive full-time Accountant receives 50% paid administrative leave pending trial',
  );

  // Duplicate arrest call for same case is idempotent
  const duplicateArrest = applyCareerCrimeConsequence(
    suspendedRes.character,
    fraudPending,
    'arrest',
    'witness_known',
  );
  assert(!duplicateArrest.applied, 'Duplicate arrest suspension is a clean idempotent no-op');

  // Workplace actions are blocked while suspended pending trial
  const workBlocked = performWorkHarder(suspendedRes.character);
  const raiseBlocked = performAskForRaise(suspendedRes.character);
  assert(!workBlocked.isSuccess && !raiseBlocked.isSuccess, 'Workplace actions blocked while suspended');

  // Aging while suspended pays 50% salary ONCE ($80k * 0.5 = $40k gross; 22% tax -> $31,200 net),
  // pauses tenure (`yearsInJob` stays 3), and skips <15% performance auto-firing
  const suspendedYear = progressCareerForYear(suspendedRes.character, 27);
  assert(
    suspendedYear.netPayEarned === Math.round(40000 * (1 - 0.22)) &&
      suspendedYear.career.currentJob !== null &&
      suspendedYear.career.currentJob.yearsInJob === 3,
    'Suspended year pays 50% net salary once and pauses tenure & auto-firing',
  );

  // Acquittal reinstates held job cleanly
  const acquittedRes = applyCareerCrimeConsequence(
    suspendedRes.character,
    fraudPending,
    'acquitted',
    'witness_known',
  );
  assert(
    acquittedRes.reinstated &&
      acquittedRes.character.career.currentJob?.suspendedPendingTrial === null &&
      acquittedRes.character.career.currentJob?.salary === 80000,
    'Acquittal clears suspension and restores full active job cleanly',
  );

  // Violent felony arrest receives 0% unpaid leave
  const violentPreTrial = applyCareerCrimeConsequence(
    accountantChar,
    { id: 'case-rob-leave', crimeId: 'robbery', title: 'Robbery', offenseClass: 'felony', jurisdiction: 'adult' },
    'arrest',
    'publicly_reported',
  );
  assert(
    violentPreTrial.character.career.currentJob?.suspendedPendingTrial?.payMultiplier === 0 &&
      progressCareerForYear(violentPreTrial.character, 27).netPayEarned === 0,
    'Violent felony pre-trial suspension pays $0 unpaid leave',
  );

  // Unrelated non-custodial Burglary 'fined' preserves Accountant employment
  const burglaryFined = applyCareerCrimeConsequence(
    { ...accountantChar, career: { ...accountantChar.career, currentJob: { ...accountantChar.career.currentJob!, performance: 80 } } },
    { id: 'case-burg-1', crimeId: 'burglary', title: 'Burglary', offenseClass: 'felony', jurisdiction: 'adult' },
    'fined',
    'private',
  );
  assert(
    !burglaryFined.terminated && burglaryFined.character.career.currentJob !== null,
    'Unrelated non-custodial Burglary fine preserves Accountant employment',
  );

  // Out-of-order 'arrest' dispatch for already-settled case must NOT re-suspend the job
  const outOfOrderArrest = applyCareerCrimeConsequence(
    burglaryFined.character,
    { id: 'case-burg-1', crimeId: 'burglary', title: 'Burglary', offenseClass: 'felony', jurisdiction: 'adult' },
    'arrest',
    'publicly_reported',
  );
  assert(
    !outOfOrderArrest.applied &&
      !outOfOrderArrest.suspended &&
      outOfOrderArrest.character.career.currentJob?.suspendedPendingTrial == null,
    'Out-of-order arrest dispatch for an already settled case does not re-suspend active job',
  );

  // Relevant fraud_scam 'fined' terminates Accountant employment and is idempotent if re-applied
  const fraudFined = applyCareerCrimeConsequence(
    suspendedRes.character,
    fraudPending,
    'fined',
    'witness_known',
  );
  assert(
    fraudFined.terminated &&
      fraudFined.character.career.currentJob === null &&
      fraudFined.character.career.history.some((h) => h.id === 'case-career-fraud-1-career-fired' && h.reasonForLeaving === 'fired'),
    'Financial fraud fine immediately terminates business_finance Accountant and records fired history',
  );
  const dupFraudVerdict = applyCareerCrimeConsequence(
    fraudFined.character,
    fraudPending,
    'fined',
    'witness_known',
  );
  assert(
    !dupFraudVerdict.applied && dupFraudVerdict.character.career.history.length === fraudFined.character.career.history.length,
    'Duplicate verdict application never adds duplicate career history entries',
  );
}

console.log('--- ALL CAREER MODULE TESTS PASSED PERFECTLY! ---');
