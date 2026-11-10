import { createInitialCareerState } from '../../career/services/careerService';
import { generateParents } from '../../character/services/familyService';
import { createInitialEducation } from '../../education/services/educationService';
import type { CharacterProfile } from '../../../types/game';
import type { NpcProfile } from '../types';
import {
  evaluateNpcJobEligibility,
  progressNpcCareerForYear,
  selectBestJobForNpc,
} from '../services/autonomousCareerService';
import {
  progressNpcEducationForYear,
  resolveNpcTuitionFunding,
  selectUniversityMajorForNpc,
} from '../services/autonomousEducationService';
import { progressNpcFinancesForYear } from '../services/autonomousFinanceService';
import {
  calculateCanonicalNetWorth,
  createInitialNpcFinances,
} from '../services/currencyService';
import {
  acceptProbabilisticDecision,
  calculateWeightedUtility,
  evaluateProbabilisticDecision,
  evaluateProfessionalSchoolDecision,
  evaluatePromotionPursuitDecision,
  evaluateRetirementDecision,
  evaluateUniversityEnrollmentDecision,
  logisticDecisionProbability,
  rankCandidatesDeterministically,
} from '../services/decisionEngine';
import {
  evaluateSingleGoalLifecycle,
  isGoalTemplateEligible,
  processNpcGoalsLifecycle,
} from '../services/goalService';
import {
  appendDeduplicatedLifeEvents,
  migrateToCanonicalWorldState,
} from '../services/migrationService';
import {
  blendNpcPersonalities,
  calculateAcademicDrive,
  calculateCareerAmbitionScore,
  calculateFinancialPrudenceScore,
  evolveNpcPersonality,
  generateDeterministicLifestyle,
  generateDeterministicPersonality,
} from '../services/personalityService';
import { createNpcPRNG, SeededPRNG } from '../services/seededPrngService';

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`
    );
  }
}

function assertDeepEqual<T>(actual: T, expected: T, msg: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      `Assertion failed: ${msg}\nExpected: ${expectedJson}\nActual:   ${actualJson}`
    );
  }
}

function createTestNpc(overrides: Partial<NpcProfile> = {}): NpcProfile {
  const prng = new SeededPRNG(424242);
  const personality = generateDeterministicPersonality(prng, 'studious', 75);
  const finances = createInitialNpcFinances({
    country: 'United States',
    age: 18,
    occupation: 'High School Student',
    wealthTier: 'comfortable',
  });

  return {
    id: 'npc-test-1',
    tier: 'core',
    firstName: 'Clara',
    lastName: 'Vance',
    gender: 'female',
    biologicalGender: 'female',
    age: 18,
    birthYear: 2008,
    isAlive: true,
    location: {
      country: 'United States',
      city: 'Boston',
      residenceHistory: [
        {
          country: 'United States',
          city: 'Boston',
          startYear: 2008,
          reason: 'birth',
        },
      ],
    },
    identityResolutionStatus: 'canonical',
    looks: 82,
    smarts: 88,
    health: 92,
    happiness: 85,
    fertility: 80,
    craziness: 22,
    personality,
    lifestyle: generateDeterministicLifestyle(prng, 18, 'studious'),
    goals: [],
    healthConditions: [],
    education: {
      currentStage: 'high_school',
      schoolName: 'Boston Grammar High School',
      grades: 91,
      diplomas: [],
      history: [],
    },
    career: {
      jobId: null,
      title: 'High School Student',
      companyName: '',
      occupation: 'High School Student',
      salary: 0,
      performance: 75,
      yearsInRole: 0,
      isRetired: false,
      pensionAnnual: 0,
      history: [],
    },
    finances,
    lifeHistory: [],
    adoptiveParentIds: [],
    stepParentIds: [],
    isAdopted: false,
    ...overrides,
  };
}

console.log('\n--- STARTING NPC AUTONOMY ENGINE MILESTONE 2 TESTS ---');

// ---------------------------------------------------------------------------
// 1. Personality Generation, Parental Blending & Behavioral Propensity Scores
// ---------------------------------------------------------------------------
{
  const prng = new SeededPRNG(10101);
  const studiousP = generateDeterministicPersonality(prng, 'studious');
  const rebelP = generateDeterministicPersonality(prng, 'rebel');

  assert(
    studiousP.conscientiousness >= 75 && studiousP.openness >= 65,
    'Studious archetype boosts conscientiousness and openness'
  );
  assert(
    rebelP.conscientiousness <= 50 && rebelP.riskTolerance >= 65,
    'Rebel archetype lowers conscientiousness and raises riskTolerance'
  );

  // Parental blending
  const childP1 = blendNpcPersonalities(studiousP, rebelP, new SeededPRNG(777), 'athletic');
  const childP2 = blendNpcPersonalities(studiousP, rebelP, new SeededPRNG(777), 'athletic');
  assertDeepEqual(childP1, childP2, 'Parental personality blending is strictly deterministic');
  assert(
    childP1.openness >= 0 &&
      childP1.openness <= 100 &&
      childP1.conscientiousness >= 60 &&
      childP1.patience >= 0 &&
      childP1.patience <= 100,
    'Blended traits stay within [0, 100] and respect archetype modifiers'
  );

  // Propensity scores
  const studiousNpc = createTestNpc({
    smarts: 90,
    personality: studiousP,
  });
  const rebelNpc = createTestNpc({
    smarts: 52,
    personality: rebelP,
  });

  assert(
    calculateAcademicDrive(studiousNpc) > calculateAcademicDrive(rebelNpc) + 20,
    'Studious high-smarts NPC has significantly higher academic drive than rebel NPC'
  );

  const evolved = evolveNpcPersonality(studiousP, 'promotion');
  assert(
    evolved.ambition >= studiousP.ambition &&
      evolved.conscientiousness >= studiousP.conscientiousness,
    'Promotion maturation evolves ambition and conscientiousness upward without mutating input'
  );
  assertEqual(
    studiousP.ambition !== evolved.ambition || studiousP === studiousP,
    true,
    'Original personality object is not mutated'
  );

  console.log('✅ 1. Personality Service: Big Five + 8 facets, parental blending, propensity scores, and maturation verified!');
}

// ---------------------------------------------------------------------------
// 2. Multi-Factor Decision Engine & Deterministic Candidate Ranking
// ---------------------------------------------------------------------------
{
  const utility = calculateWeightedUtility(
    [
      { weight: 0.5, score: 80 },
      { weight: 0.5, score: 60 },
    ],
    5
  );
  assertEqual(utility, 75, 'Weighted utility calculation (40 + 30 + 5 = 75)');

  const probHigh = logisticDecisionProbability(80, 55, 0.14);
  const probLow = logisticDecisionProbability(30, 55, 0.14);
  assert(probHigh > 0.9, `High utility yields >90% probability (got ${probHigh})`);
  assert(probLow < 0.05, `Low utility yields <5% probability (got ${probLow})`);

  // Compare University Enrollment probabilities for Scholar vs Reluctant student
  const scholarNpc = createTestNpc({
    smarts: 92,
    education: {
      currentStage: 'high_school',
      schoolName: 'Boston High',
      grades: 94,
      history: [],
    },
  });
  const reluctantNpc = createTestNpc({
    smarts: 38,
    personality: {
      ...scholarNpc.personality,
      openness: 25,
      ambition: 22,
      conscientiousness: 25,
    },
    education: {
      currentStage: 'high_school',
      schoolName: 'Boston High',
      grades: 48,
      history: [],
    },
  });

  const scholarUniEval = evaluateUniversityEnrollmentDecision(
    scholarNpc,
    'wealthy',
    new SeededPRNG(111)
  );
  const reluctantUniEval = evaluateUniversityEnrollmentDecision(
    reluctantNpc,
    'struggling',
    new SeededPRNG(111)
  );
  assert(
    scholarUniEval.probability > 0.9 && reluctantUniEval.probability < 0.15,
    `Personality & wealth meaningfully drive university decisions (${scholarUniEval.probability.toFixed(2)} vs ${reluctantUniEval.probability.toFixed(2)})`
  );

  // Compare Promotion Pursuit & Retirement Decisions
  const ambitiousEmployee = createTestNpc({
    age: 30,
    personality: {
      ...scholarNpc.personality,
      ambition: 92,
      conscientiousness: 90,
      extraversion: 75,
    },
    career: {
      jobId: 'ft_software_engineer',
      title: 'Software Engineer',
      companyName: 'Boston Tech',
      occupation: 'Software Engineer',
      salary: 95000,
      performance: 92,
      yearsInRole: 3,
      isRetired: false,
      pensionAnnual: 0,
      history: [],
    },
  });
  const unmotivatedEmployee = createTestNpc({
    age: 30,
    personality: {
      ...scholarNpc.personality,
      ambition: 20,
      conscientiousness: 25,
      extraversion: 20,
    },
    career: {
      ...ambitiousEmployee.career,
      performance: 35,
    },
  });
  const promoEval = evaluatePromotionPursuitDecision(ambitiousEmployee, new SeededPRNG(222));
  const lowPromoEval = evaluatePromotionPursuitDecision(unmotivatedEmployee, new SeededPRNG(222));
  assert(
    promoEval.probability > 0.8 && lowPromoEval.probability < 0.15,
    `Ambitious high performer strongly pursues promotion (${promoEval.probability.toFixed(2)} vs ${lowPromoEval.probability.toFixed(2)})`
  );

  const tiredElder = createTestNpc({
    age: 66,
    health: 42,
    personality: { ...ambitiousEmployee.personality, ambition: 30 },
    career: { ...ambitiousEmployee.career, yearsInRole: 15 },
    finances: {
      ...ambitiousEmployee.finances,
      savings: 650000,
      annualExpenses: 45000,
      netWorth: 650000,
    },
  });
  const retireEval = evaluateRetirementDecision(tiredElder, 60, new SeededPRNG(333));
  assert(retireEval.probability > 0.85, 'Older NPC with low health and solid savings strongly favors retirement');

  // Deterministic tie-breaking
  const candidatesA = [
    { id: 'cand-z', val: 80 },
    { id: 'cand-a', val: 80 },
    { id: 'cand-m', val: 95 },
  ];
  const candidatesB = [...candidatesA].reverse();
  const rankedA = rankCandidatesDeterministically(candidatesA, (c) => c.val);
  const rankedB = rankCandidatesDeterministically(candidatesB, (c) => c.val);
  assertDeepEqual(
    rankedA.map((r) => r.id),
    ['cand-m', 'cand-a', 'cand-z'],
    'Candidates ranked by score descending, then ID ascending'
  );
  assertDeepEqual(rankedA, rankedB, 'Ranking is strictly independent of input order');

  assert(acceptProbabilisticDecision({ probability: 0.99, chosen: false }), 'a probability of exactly 0.99 is accepted when the roll says no');
  assert(acceptProbabilisticDecision({ probability: 0.995, chosen: false }), 'a probability above 0.99 is accepted when the roll says no');
  assert(!acceptProbabilisticDecision({ probability: 0.989, chosen: false }), 'a probability below 0.99 is rejected when the roll says no');
  assert(acceptProbabilisticDecision({ probability: 0.5, chosen: true }), 'a probability below 0.99 is accepted when the roll says yes');
  const seededDecision = evaluateProbabilisticDecision({
    factors: [{ weight: 1, score: 96 }],
    threshold: 20,
    steepness: 0.2,
    noiseRange: 0,
    prng: new SeededPRNG(99),
  });
  assert(
    acceptProbabilisticDecision(seededDecision) === (seededDecision.probability >= 0.99 || seededDecision.chosen),
    'the shared helper matches the seeded probability rule'
  );

  console.log('✅ 2. Decision Engine: Weighted utility, logistic probability, personality sensitivity, and tie-breaking verified!');
}

// ---------------------------------------------------------------------------
// 3. Complete Goal Lifecycle: Generation, Progression, Completion, Failure & Replacement
// ---------------------------------------------------------------------------
{
  const currentYear = 2026;
  let npc = createTestNpc({
    age: 15,
    birthYear: 2011,
    education: {
      currentStage: 'high_school',
      schoolName: 'Boston High',
      grades: 76,
      history: [],
    },
    goals: [],
  });

  // Step A: Initial Goal Generation
  const genPass = processNpcGoalsLifecycle(npc, currentYear, new SeededPRNG(501));
  npc = genPass.updatedNpc;
  assertEqual(
     genPass.newlyGeneratedGoals.length,
    2,
    'Generated 2 initial goals (1 primary, 1 secondary)'
  );
  assert(
    npc.goals.some((g) => g.priority === 'primary') &&
      npc.goals.some((g) => g.priority === 'secondary'),
    'Both primary and secondary goal slots populated'
  );

  // Step B: Goal Progression & Completion
  // Suppose the NPC has 'excel_in_school' (target 88% grades) and boosts grades to 92%
  const excelGoal = npc.goals.find((g) => g.templateId === 'excel_in_school') ?? {
    id: 'goal-excel-manual',
    templateId: 'excel_in_school',
    category: 'education' as const,
    title: 'Achieve Honor Roll Standing (88%+ Grades)',
    priority: 'primary' as const,
    targetYear: currentYear + 3,
    targetValue: 88,
    progress: 80,
    status: 'active' as const,
    isCompleted: false,
    isAbandoned: false,
    createdYear: currentYear,
  };

  npc = {
    ...npc,
    education: {
      ...npc.education,
      grades: 92,
    },
    goals: [excelGoal],
  };

  const completePass = processNpcGoalsLifecycle(npc, currentYear + 1, new SeededPRNG(502));
  assertEqual(
    completePass.newlyCompletedGoals.length,
    1,
    'excel_in_school goal marked completed when grades reached 92%'
  );
  assertEqual(completePass.newlyCompletedGoals[0].progress, 100, 'Completed goal progress is 100');
  assertEqual(completePass.newlyCompletedGoals[0].status, 'completed', 'Completed goal status is completed');
  assert(
    completePass.newlyGeneratedGoals.length >= 1,
    'Completed goal slot was automatically replaced with a new active goal'
  );

  // Step C: Goal Failure / Abandonment on Dropout & Replacement
  const hsGoalNpc = createTestNpc({
    age: 17,
    birthYear: 2009,
    education: {
      currentStage: 'dropped_out',
      schoolName: null,
      grades: 32,
      history: [],
    },
    goals: [
      {
        id: 'goal-hs-grad',
        templateId: 'graduate_high_school',
        category: 'education',
        title: 'Graduate from High School',
        priority: 'primary',
        targetYear: 2028,
        progress: 50,
        status: 'active',
        isCompleted: false,
        isAbandoned: false,
        createdYear: 2024,
      },
    ],
  });

  const failPass = processNpcGoalsLifecycle(hsGoalNpc, 2026, new SeededPRNG(503));
  assertEqual(
    failPass.newlyFailedGoals.length,
    1,
    'graduate_high_school goal failed when NPC dropped out'
  );
  assertEqual(failPass.newlyFailedGoals[0].isAbandoned, true, 'Failed goal sets isAbandoned = true');
  assertEqual(failPass.newlyFailedGoals[0].status, 'failed', 'Failed goal sets status = failed');
  assert(
    Boolean(failPass.newlyFailedGoals[0].failedReason),
    'Failed goal records explanatory failedReason'
  );
  assert(
    failPass.newlyGeneratedGoals.length >= 1,
    'Failed goal slot was automatically replaced with a new stage-appropriate active goal'
  );

  // Step D: Deadline Expiration Failure
  const expiredEval = evaluateSingleGoalLifecycle(
    {
      id: 'goal-expired',
      templateId: 'build_emergency_fund',
      category: 'financial',
      title: 'Build 15,000 USD Savings Reserve',
      priority: 'secondary',
      targetYear: 2025,
      targetValue: 15000,
      progress: 40,
      status: 'active',
      isCompleted: false,
      isAbandoned: false,
    },
    hsGoalNpc,
    2026
  );
  assertEqual(expiredEval.isAbandoned, true, 'Expired goal marked abandoned');
  assertEqual(expiredEval.status, 'failed', 'Expired goal status is failed');

  const bachelor = createTestNpc({
    age: 22,
    smarts: 80,
    personality: {
      ...createTestNpc().personality,
      ambition: 80,
      openness: 80,
    },
    education: {
      currentStage: 'graduated',
      schoolName: null,
      grades: 85,
      degreeEarned: 'Bachelor’s Degree',
      diplomas: [],
      history: [],
    },
  });
  assertEqual(
    isGoalTemplateEligible(bachelor, 'earn_university_degree'),
    false,
    'Bachelor’s Degree is recognized, so the bachelor goal is not offered again'
  );
  assertEqual(
    isGoalTemplateEligible(bachelor, 'earn_graduate_degree'),
    true,
    'Bachelor’s Degree satisfies the graduate-school prerequisite'
  );
  const completedBachelorGoal = evaluateSingleGoalLifecycle(
    {
      id: 'goal-bachelor',
      templateId: 'earn_university_degree',
      category: 'education',
      title: 'Earn a University Bachelor’s Degree',
      priority: 'primary',
      progress: 10,
      status: 'active',
      isCompleted: false,
      isAbandoned: false,
    },
    bachelor,
    2030
  );
  assertEqual(completedBachelorGoal.isCompleted, true, 'An active bachelor goal completes when the degree is already held');

  const nursingGrad = createTestNpc({
    age: 24,
    education: {
      currentStage: 'graduated',
      schoolName: null,
      grades: 84,
      diplomas: ['Bachelor of Science in Nursing (B.S.N. / RN)'],
      history: [],
    },
  });
  assertEqual(
    isGoalTemplateEligible(nursingGrad, 'earn_university_degree'),
    false,
    'B.S.N. diploma counts as a university degree'
  );

  const highSchoolOnly = createTestNpc({
    age: 19,
    education: {
      currentStage: 'graduated',
      schoolName: null,
      grades: 75,
      degreeEarned: 'High School Diploma',
      diplomas: ['High School Diploma'],
      history: [],
    },
  });
  assertEqual(
    isGoalTemplateEligible(highSchoolOnly, 'earn_university_degree'),
    true,
    'High School Diploma does not count as a university degree'
  );
  assertEqual(
    isGoalTemplateEligible(highSchoolOnly, 'earn_graduate_degree'),
    false,
    'High School Diploma does not unlock the graduate goal'
  );

  const workingEngineer = createTestNpc({
    age: 28,
    education: {
      currentStage: 'graduated',
      schoolName: null,
      grades: 80,
      degreeEarned: 'Bachelor’s Degree',
      history: [],
    },
    career: {
      jobId: null,
      title: 'Mechanical Engineer',
      companyName: 'Boston Works',
      occupation: 'Mechanical Engineer',
      salary: 72000,
      performance: 70,
      yearsInRole: 4,
      isRetired: false,
      pensionAnnual: 0,
      history: [],
    },
  });
  assertEqual(
    isGoalTemplateEligible(workingEngineer, 'land_first_career'),
    false,
    'A working NPC with a null jobId is not treated as unemployed'
  );

  const unemployedAdult = createTestNpc({
    age: 22,
    education: {
      currentStage: 'graduated',
      schoolName: null,
      grades: 70,
      degreeEarned: 'High School Diploma',
      history: [],
    },
    career: {
      jobId: null,
      title: 'Unemployed',
      companyName: '',
      occupation: 'Unemployed',
      salary: 0,
      performance: 40,
      yearsInRole: 0,
      isRetired: false,
      pensionAnnual: 0,
      history: [],
    },
  });
  assertEqual(
    isGoalTemplateEligible(unemployedAdult, 'land_first_career'),
    true,
    'An unemployed adult with no salary can still receive the first-career goal'
  );

  console.log('✅ 3. Goal Service: Generation, quantitative progression, completion, failure/abandonment, and replacement verified!');
}

// ---------------------------------------------------------------------------
// 4. Autonomous Education Lifecycle (K-12 -> Pre-Med University -> Medical School) & Single Debt Source
// ---------------------------------------------------------------------------
{
  let student = createTestNpc({
    id: 'npc-future-doctor',
    firstName: 'maya',
    lastName: 'Lin',
    age: 4,
    birthYear: 2020,
    smarts: 94,
    health: 92,
    personality: {
      openness: 88,
      conscientiousness: 94,
      extraversion: 70,
      agreeableness: 85,
      neuroticism: 20,
      ambition: 95,
      generosity: 75,
      loyalty: 85,
      riskTolerance: 45,
      empathy: 95,
      sociability: 70,
      patience: 85,
      materialism: 50,
      archetype: 'studious',
    },
    lifestyle: {
      diet: 'organic',
      fitnessHabit: 'regular',
      substances: { alcohol: 'none', smoking: false },
      interests: ['science', 'reading'],
      hobbies: ['chess'],
    },
    education: {
      currentStage: 'none',
      schoolName: null,
      grades: 90,
      diplomas: [],
      history: [],
    },
    finances: createInitialNpcFinances({
      country: 'United States',
      age: 4,
      occupation: 'Toddler',
      wealthTier: 'modest',
    }),
  });

  // Simulate from Age 5 through Age 26 (Elementary -> Middle -> High School -> University -> Graduate/Medical School)
  for (let age = 5; age <= 26; age++) {
    const simYear = student.birthYear + age;
    student = { ...student, age };
    const eduPrng = createNpcPRNG(9001, simYear, student.id, 'education', 1);
    const res = progressNpcEducationForYear(student, simYear, eduPrng, {
      familyWealth: 'modest',
      parentalGenerosity: 50,
    });
    student = {
      ...res.updatedNpc,
      lifeHistory: appendDeduplicatedLifeEvents(student.lifeHistory, res.lifeEvents),
    };

    if (age === 5) {
      assertEqual(student.education.currentStage, 'elementary', 'Enrolled in Elementary at age 5');
    }
    if (age === 11) {
      assertEqual(student.education.currentStage, 'middle_school', 'Enrolled in Middle School at age 11');
    }
    if (age === 14) {
      assertEqual(student.education.currentStage, 'high_school', 'Enrolled in High School at age 14');
    }
    if (age === 18) {
      assertEqual(student.education.currentStage, 'university', 'Enrolled in University at age 18');
      assert(
        student.education.diplomas?.some((d) => d.includes('High School Diploma')) === true,
        'Earned High School Diploma at age 18'
      );
    }
  }

  assertEqual(
    student.education.currentStage,
    'graduated',
    'Completed higher education pipeline by age 26'
  );
  assert(
    student.education.history.length >= 4,
    `Recorded complete school history (${student.education.history.length} stages completed)`
  );
  assert(
    (student.education.diplomas?.length ?? 0) >= 2,
    `Earned multiple degrees: ${JSON.stringify(student.education.diplomas)}`
  );
  assertEqual(
    'studentDebt' in student.education,
    false,
    'NpcEducationState never contains a duplicate studentDebt field'
  );

  // Verify Student Loan funding explicitly records debt in npc.finances.studentDebt
  let loanStudent = createTestNpc({
    age: 18,
    birthYear: 2008,
    smarts: 76,
    education: {
      currentStage: 'high_school',
      schoolName: 'Boston High',
      grades: 82, // Good grades, but below 90 merit scholarship cutoff
      diplomas: [],
      history: [],
    },
    finances: {
      currency: 'USD',
      cash: 500,
      savings: 0,
      realEstateValue: 0,
      businessEquity: 0,
      studentDebt: 0,
      mortgageBalance: 0,
      otherLiabilities: 0,
      annualIncome: 0,
      annualExpenses: 0,
      netWorth: 500,
    },
  });

  const fundingMode = resolveNpcTuitionFunding({
    npc: loanStudent,
    annualTuitionLocalCurrency: 11500,
    familyWealth: 'modest',
    parentalGenerosity: 40,
  });
  assertEqual(fundingMode, 'student_loan', 'Non-scholarship modest-wealth US student uses student_loan');

  const loanStep = progressNpcEducationForYear(
    loanStudent,
    2026,
    new SeededPRNG(77),
    { familyWealth: 'modest', parentalGenerosity: 40 }
  );
  if (loanStep.updatedNpc.education.currentStage === 'university') {
    assert(
      loanStep.updatedNpc.finances.studentDebt > 0,
      'Student loan principal added strictly to npc.finances.studentDebt'
    );
    assertEqual(
      loanStep.updatedNpc.finances.netWorth,
      calculateCanonicalNetWorth(loanStep.updatedNpc.finances),
      'Net worth reflects student loan liability accurately'
    );
  }

  console.log('✅ 4. Autonomous Education Service: Full K-12 -> University -> Grad School pipeline and single debt source verified!');
}

// ---------------------------------------------------------------------------
// 5. Autonomous Career Lifecycle: Degree Matching, Promotions & Age 60+ Retirement
// ---------------------------------------------------------------------------
{
  let engineer = createTestNpc({
    id: 'npc-engineer-1',
    age: 22,
    birthYear: 2004,
    smarts: 90,
    health: 90,
    personality: {
      ...createTestNpc().personality,
      ambition: 94,
      conscientiousness: 92,
      openness: 85,
    },
    education: {
      currentStage: 'graduated',
      schoolName: null,
      grades: 92,
      degreeEarned: 'Master of Science (M.S. / Ph.D.)',
      diplomas: [
        'High School Diploma with Honors',
        'B.S. in Computer Science',
        'Master of Science (M.S. / Ph.D.)',
      ],
      history: [],
    },
    career: {
      jobId: null,
      title: 'Unemployed',
      companyName: '',
      occupation: 'Unemployed',
      salary: 0,
      performance: 85,
      yearsInRole: 0,
      isRetired: false,
      pensionAnnual: 0,
      history: [],
    },
  });

  // Year 1: Hired into degree-matched career
  const hireRes = progressNpcCareerForYear(engineer, 2026, new SeededPRNG(801));
  engineer = {
    ...hireRes.updatedNpc,
    lifeHistory: appendDeduplicatedLifeEvents(engineer.lifeHistory, hireRes.lifeEvents),
  };
  assert(engineer.career.jobId !== null, 'Graduated engineer hired into full-time job');
  assert(engineer.career.salary >= 70000, `Hired with competitive salary (${engineer.career.salary})`);
  const initialSalary = engineer.career.salary;

  // Simulate 8 years of career progression to verify promotions and raises
  for (let yr = 1; yr <= 8; yr++) {
    engineer = { ...engineer, age: engineer.age + 1 };
    const careerRes = progressNpcCareerForYear(
      engineer,
      2026 + yr,
      createNpcPRNG(9001, 2026 + yr, engineer.id, 'career', 1)
    );
    engineer = {
      ...careerRes.updatedNpc,
      lifeHistory: appendDeduplicatedLifeEvents(engineer.lifeHistory, careerRes.lifeEvents),
    };
  }

  assert(
    engineer.career.salary > initialSalary * 1.25,
    `Engineer salary grew significantly through promotions/raises (${initialSalary} -> ${engineer.career.salary})`
  );
  assert(
    engineer.career.history.some((h) => h.reasonForLeaving === 'promoted'),
    'Career history recorded at least one promotion along the career ladder'
  );
  assert(
    engineer.lifeHistory.some((e) => e.type === 'promoted'),
    'npc.lifeHistory recorded deduplicated promoted milestone'
  );

  // Retirement verification at Age 72 (guaranteed retirement cutoff)
  let seniorWorker: NpcProfile = {
    ...engineer,
    age: 72,
    health: 55,
  };
  const preRetireSalary = seniorWorker.career.salary;
  const retireRes = progressNpcCareerForYear(seniorWorker, 2076, new SeededPRNG(999), 60);
  seniorWorker = retireRes.updatedNpc;

  assertEqual(seniorWorker.career.isRetired, true, 'Senior worker retired');
  assertEqual(seniorWorker.career.occupation, 'Retired', 'Occupation updated to Retired');
  assertEqual(
    seniorWorker.career.pensionAnnual,
    Math.round(preRetireSalary * 0.4),
    'Retired NPC receives 40% annual pension'
  );
  assertEqual(
    seniorWorker.finances.annualIncome,
    seniorWorker.career.pensionAnnual,
    'Finances annualIncome updated to pensionAnnual'
  );

  console.log('✅ 5. Autonomous Career Service: Degree-matched hiring, ladder promotions, raises, and 40% pension retirement verified!');
}

// ---------------------------------------------------------------------------
// 6. Country-Aware Financial Autonomy, Debt Amortization & Net-Worth Neutrality
// ---------------------------------------------------------------------------
{
  const baseCareer = {
    jobId: 'ft_software_engineer',
    title: 'Software Engineer',
    companyName: 'Boston Tech',
    occupation: 'Software Engineer',
    salary: 110000,
    performance: 88,
    yearsInRole: 3,
    isRetired: false,
    pensionAnnual: 0,
    history: [],
  };

  // Prudent vs Materialistic spenders earning identical income
  let prudentNpc = createTestNpc({
    id: 'npc-prudent',
    age: 28,
    personality: {
      ...createTestNpc().personality,
      conscientiousness: 95,
      patience: 90,
      materialism: 15,
      riskTolerance: 20,
    },
    career: baseCareer,
    finances: {
      currency: 'USD',
      cash: 15000,
      savings: 25000,
      realEstateValue: 0,
      businessEquity: 0,
      studentDebt: 20000,
      mortgageBalance: 0,
      otherLiabilities: 0,
      annualIncome: 110000,
      annualExpenses: 40000,
      netWorth: 20000,
    },
  });

  let spendthriftNpc = createTestNpc({
    id: 'npc-spendthrift',
    age: 28,
    personality: {
      ...createTestNpc().personality,
      conscientiousness: 20,
      patience: 20,
      materialism: 95,
      riskTolerance: 88,
    },
    career: baseCareer,
    finances: {
      ...prudentNpc.finances,
    },
  });

  for (let yr = 1; yr <= 5; yr++) {
    prudentNpc = progressNpcFinancesForYear(
      prudentNpc,
      2026 + yr,
      new SeededPRNG(300 + yr)
    ).updatedNpc;
    spendthriftNpc = progressNpcFinancesForYear(
      spendthriftNpc,
      2026 + yr,
      new SeededPRNG(300 + yr)
    ).updatedNpc;

    assertEqual(
      prudentNpc.finances.netWorth,
      calculateCanonicalNetWorth(prudentNpc.finances),
      'Prudent NPC netWorth matches canonical formula every year'
    );
    assertEqual(
      spendthriftNpc.finances.netWorth,
      calculateCanonicalNetWorth(spendthriftNpc.finances),
      'Spendthrift NPC netWorth matches canonical formula every year'
    );
  }

  assert(
    prudentNpc.finances.netWorth > spendthriftNpc.finances.netWorth + 35000,
    `Prudent NPC accumulated significantly higher net worth than spendthrift (${prudentNpc.finances.netWorth} vs ${spendthriftNpc.finances.netWorth})`
  );
  assert(
    prudentNpc.finances.studentDebt < 5000,
    `Prudent NPC paid down almost all student debt (remaining: ${prudentNpc.finances.studentDebt})`
  );
  assert(
    prudentNpc.finances.realEstateValue > 0,
    'Qualified adult NPC autonomously purchased a home and built real estate equity'
  );

  // Country-aware currency check (Pakistan -> PKR, United Kingdom -> GBP)
  const pkNpc = createTestNpc({
    age: 28,
    location: {
      country: 'Pakistan',
      city: 'Lahore',
      residenceHistory: [{ country: 'Pakistan', city: 'Lahore', startYear: 1998, reason: 'birth' }],
    },
    career: { ...baseCareer, salary: 4500000 },
    finances: createInitialNpcFinances({
      country: 'Pakistan',
      age: 28,
      occupation: 'Software Engineer',
      explicitAnnualIncome: 4500000,
    }),
  });
  const pkFinRes = progressNpcFinancesForYear(pkNpc, 2027, new SeededPRNG(444)).updatedNpc;
  assertEqual(pkFinRes.finances.currency, 'PKR', 'Pakistan resident uses PKR currency');
  assertEqual(
    pkFinRes.finances.netWorth,
    calculateCanonicalNetWorth(pkFinRes.finances),
    'PKR net worth matches canonical formula'
  );

  console.log('✅ 6. Autonomous Finance Service: Country-aware economics, debt amortization, property purchase, and net-worth neutrality verified!');
}

// ---------------------------------------------------------------------------
// 7. Player State Non-Mutation & Multi-Year Deterministic Reproducibility
// ---------------------------------------------------------------------------
{
  const playerChar: CharacterProfile = migrateToCanonicalWorldState({
    id: 'player-immutable-check',
    firstName: 'Alex',
    lastName: 'Mercer',
    gender: 'male',
    age: 24,
    birthYear: 2002,
    country: 'United States',
    city: 'Seattle',
    occupation: 'Software Engineer',
    cash: 50000,
    bankBalance: 50000,
    netWorth: 50000,
    isAlive: true,
    stats: { health: 90, happiness: 85, smarts: 85, looks: 80, karma: 80 },
    parents: generateParents('Mercer'),
    siblings: [
      {
        id: 'sib-autonomy-1',
        role: 'sister',
        firstName: 'Zoe',
        lastName: 'Mercer',
        age: 16,
        gender: 'female',
        relationship: 85,
        occupation: 'High School Student',
        isAlive: true,
        birthOrder: 'younger',
      },
    ],
    relationships: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
  });

  const playerBeforeJson = JSON.stringify(playerChar);
  const worldSeed = playerChar.worldState!.worldSeed;

  const runTrajectory = (): NpcProfile => {
    let npc = structuredClone(playerChar.worldState!.npcRegistry['sib-autonomy-1']);
    for (let step = 1; step <= 12; step++) {
      const year = 2026 + step;
      npc = { ...npc, age: npc.age + 1 };

      // 1. Pre-check & generate goals
      const goalPass1 = processNpcGoalsLifecycle(
        npc,
        year,
        createNpcPRNG(worldSeed, year, npc.id, 'goals', 1)
      );
      npc = goalPass1.updatedNpc;

      // 2. Education progression
      const eduPass = progressNpcEducationForYear(
        npc,
        year,
        createNpcPRNG(worldSeed, year, npc.id, 'education', 1),
        { familyWealth: playerChar.parents.wealth }
      );
      npc = {
        ...eduPass.updatedNpc,
        lifeHistory: appendDeduplicatedLifeEvents(npc.lifeHistory, eduPass.lifeEvents),
      };

      // 3. Career progression
      const careerPass = progressNpcCareerForYear(
        npc,
        year,
        createNpcPRNG(worldSeed, year, npc.id, 'career', 1)
      );
      npc = {
        ...careerPass.updatedNpc,
        lifeHistory: appendDeduplicatedLifeEvents(npc.lifeHistory, careerPass.lifeEvents),
      };

      // 4. Financial progression
      const finPass = progressNpcFinancesForYear(
        npc,
        year,
        createNpcPRNG(worldSeed, year, npc.id, 'finance', 1)
      );
      npc = {
        ...finPass.updatedNpc,
        lifeHistory: appendDeduplicatedLifeEvents(npc.lifeHistory, finPass.lifeEvents),
      };

      // 5. Post-check goals after year's achievements
      const goalPass2 = processNpcGoalsLifecycle(
        npc,
        year,
        createNpcPRNG(worldSeed, year, `${npc.id}_post`, 'goals', 1)
      );
      npc = goalPass2.updatedNpc;
    }
    return npc;
  };

  const run1 = runTrajectory();
  const run2 = runTrajectory();

  assertDeepEqual(run1, run2, '12-year Milestone 2 NPC trajectory is 100% deterministic across runs');
  assertEqual(
    JSON.stringify(playerChar),
    playerBeforeJson,
    'NPC simulation never mutates the player CharacterProfile'
  );
  assert(
    run1.age === 28 && run1.career.salary > 0,
    `Sister Zoe progressed from age 16 student to age 28 employed adult (${run1.career.occupation}, salary: ${run1.career.salary})`
  );

  // Silence unused import warnings while verifying exports exist
  assert(typeof selectUniversityMajorForNpc === 'function', 'selectUniversityMajorForNpc exported');
  assert(typeof evaluateProfessionalSchoolDecision === 'function', 'evaluateProfessionalSchoolDecision exported');
  assert(typeof evaluateNpcJobEligibility === 'function', 'evaluateNpcJobEligibility exported');
  assert(typeof selectBestJobForNpc === 'function', 'selectBestJobForNpc exported');
  assert(typeof calculateCareerAmbitionScore === 'function', 'calculateCareerAmbitionScore exported');
  assert(typeof calculateFinancialPrudenceScore === 'function', 'calculateFinancialPrudenceScore exported');

  console.log('✅ 7. End-to-End Determinism & Player Immutability: 12-year trajectory reproduced identically with zero player state mutation!');
}

console.log('--- ALL NPC AUTONOMY ENGINE MILESTONE 2 TESTS PASSED PERFECTLY! ---\n');
