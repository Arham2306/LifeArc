import type { NpcGoal, NpcProfile } from '../types';
import { getCountryEconomicProfile } from './currencyService';
import { rankCandidatesDeterministically } from './decisionEngine';
import { deterministicUUID, type SeededPRNG } from './seededPrngService';

export type NpcGoalTemplateId =
  | 'excel_in_school'
  | 'graduate_high_school'
  | 'earn_university_degree'
  | 'earn_graduate_degree'
  | 'land_first_career'
  | 'climb_career_ladder'
  | 'achieve_high_performance'
  | 'pay_off_student_debt'
  | 'build_emergency_fund'
  | 'accumulate_wealth'
  | 'purchase_property'
  | 'retire_comfortably'
  | 'maintain_peak_vitality';

interface GoalTemplateDefinition {
  id: NpcGoalTemplateId;
  category: NpcGoal['category'];
  buildTitle: (npc: NpcProfile, targetValue?: number) => string;
  isEligible: (npc: NpcProfile) => boolean;
  scoreUtility: (npc: NpcProfile, prng: SeededPRNG) => number;
  createGoalInstance: (
    npc: NpcProfile,
    priority: 'primary' | 'secondary',
    currentYear: number
  ) => NpcGoal;
}

const clampProgress = (val: number): number =>
  Math.max(0, Math.min(100, Math.round(Number.isFinite(val) ? val : 0)));

function hasDiplomaContaining(npc: NpcProfile, substring: string): boolean {
  const lower = substring.toLowerCase();
  if (npc.education.degreeEarned?.toLowerCase().includes(lower)) return true;
  if (npc.education.diplomas?.some((d) => d.toLowerCase().includes(lower))) return true;
  return false;
}

function normalizeDegreeTitle(title: string): string {
  return title.toLowerCase().replace(/[’']/g, "'");
}

function collectDegreeTitles(npc: NpcProfile): string[] {
  const titles: string[] = [];
  if (npc.education.degreeEarned) titles.push(npc.education.degreeEarned);
  if (npc.education.diplomas) titles.push(...npc.education.diplomas);
  return titles;
}

/** Bachelor titles, including "Bachelor's Degree" and "B.S." / "B.A." / "B.B.A." / "B.S.N." forms. */
function isBachelorTitle(title: string): boolean {
  const normalized = normalizeDegreeTitle(title);
  return (
    normalized.startsWith('bachelor') ||
    normalized.startsWith('b.s') ||
    normalized.startsWith('b.a') ||
    normalized.startsWith('b.b') ||
    normalized.includes('b.s.') ||
    normalized.includes('b.a.') ||
    normalized.includes('b.b.a') ||
    normalized.includes('b.s.n')
  );
}

function isGraduateTitle(title: string): boolean {
  const normalized = normalizeDegreeTitle(title);
  return (
    normalized.startsWith('master') ||
    normalized.startsWith('doctor') ||
    normalized.startsWith('juris') ||
    normalized.includes('m.d.') ||
    normalized.includes('j.d.') ||
    normalized.includes('m.b.a.') ||
    normalized.includes('ph.d.')
  );
}

function hasAnyUniversityDegree(npc: NpcProfile): boolean {
  return collectDegreeTitles(npc).some(
    (title) => isBachelorTitle(title) || isGraduateTitle(title)
  );
}

function hasGraduateDegree(npc: NpcProfile): boolean {
  return collectDegreeTitles(npc).some((title) => isGraduateTitle(title));
}

function npcAlreadyHasCareer(npc: NpcProfile): boolean {
  const occupation = npc.career.occupation ?? '';
  return (
    npc.career.salary > 0 &&
    occupation !== 'Unemployed' &&
    !occupation.includes('Student')
  );
}

const GOAL_TEMPLATES: readonly GoalTemplateDefinition[] = [
  {
    id: 'excel_in_school',
    category: 'education',
    buildTitle: () => 'Achieve Honor Roll Standing (88%+ Grades)',
    isEligible: (npc) =>
      npc.age >= 6 &&
      npc.age <= 16 &&
      (npc.education.currentStage === 'elementary' ||
        npc.education.currentStage === 'middle_school' ||
        npc.education.currentStage === 'high_school') &&
      npc.education.grades < 88,
    scoreUtility: (npc, prng) =>
      npc.smarts * 0.4 +
      npc.personality.conscientiousness * 0.35 +
      npc.personality.ambition * 0.25 +
      prng.nextInt(-5, 5),
    createGoalInstance: (npc, priority, currentYear) => ({
      id: deterministicUUID('npc-goal', npc.id, 'excel_in_school', currentYear),
      templateId: 'excel_in_school',
      category: 'education',
      title: 'Achieve Honor Roll Standing (88%+ Grades)',
      priority,
      targetYear: currentYear + 4,
      targetValue: 88,
      baselineValue: npc.education.grades,
      progress: clampProgress((npc.education.grades / 88) * 100),
      status: 'active',
      isCompleted: false,
      isAbandoned: false,
      createdYear: currentYear,
    }),
  },
  {
    id: 'graduate_high_school',
    category: 'education',
    buildTitle: () => 'Graduate from High School',
    isEligible: (npc) =>
      npc.age >= 13 &&
      npc.age <= 17 &&
      npc.education.currentStage === 'high_school' &&
      !hasDiplomaContaining(npc, 'high school'),
    scoreUtility: (npc, prng) =>
      60 + npc.personality.conscientiousness * 0.25 + npc.smarts * 0.15 + prng.nextInt(-4, 4),
    createGoalInstance: (npc, priority, currentYear) => ({
      id: deterministicUUID('npc-goal', npc.id, 'graduate_high_school', currentYear),
      templateId: 'graduate_high_school',
      category: 'education',
      title: 'Graduate from High School',
      priority,
      targetYear: npc.birthYear + 19,
      targetValue: 18,
      baselineValue: npc.age,
      progress: clampProgress(((npc.age - 14) / 4) * 100),
      status: 'active',
      isCompleted: false,
      isAbandoned: false,
      createdYear: currentYear,
    }),
  },
  {
    id: 'earn_university_degree',
    category: 'education',
    buildTitle: () => 'Earn a University Bachelor’s Degree',
    isEligible: (npc) =>
      npc.age >= 17 &&
      npc.age <= 24 &&
      npc.education.currentStage !== 'dropped_out' &&
      !hasAnyUniversityDegree(npc) &&
      (npc.smarts >= 50 || npc.personality.openness >= 60 || npc.personality.ambition >= 60),
    scoreUtility: (npc, prng) =>
      npc.smarts * 0.35 +
      npc.personality.openness * 0.25 +
      npc.personality.ambition * 0.25 +
      npc.personality.conscientiousness * 0.15 +
      prng.nextInt(-5, 5),
    createGoalInstance: (npc, priority, currentYear) => ({
      id: deterministicUUID('npc-goal', npc.id, 'earn_university_degree', currentYear),
      templateId: 'earn_university_degree',
      category: 'education',
      title: 'Earn a University Bachelor’s Degree',
      priority,
      targetYear: currentYear + 6,
      targetValue: 4,
      baselineValue: npc.education.stageYearsCompleted ?? 0,
      progress:
        npc.education.currentStage === 'university'
          ? clampProgress(((npc.education.stageYearsCompleted ?? 1) / 4) * 100)
          : 10,
      status: 'active',
      isCompleted: false,
      isAbandoned: false,
      createdYear: currentYear,
    }),
  },
  {
    id: 'earn_graduate_degree',
    category: 'education',
    buildTitle: () => 'Earn an Advanced Graduate or Professional Degree',
    isEligible: (npc) =>
      npc.age >= 21 &&
      npc.age <= 32 &&
      hasAnyUniversityDegree(npc) &&
      !hasGraduateDegree(npc) &&
      npc.smarts >= 62 &&
      npc.personality.ambition >= 58,
    scoreUtility: (npc, prng) =>
      npc.smarts * 0.4 +
      npc.personality.ambition * 0.35 +
      npc.personality.conscientiousness * 0.25 +
      prng.nextInt(-5, 5),
    createGoalInstance: (npc, priority, currentYear) => ({
      id: deterministicUUID('npc-goal', npc.id, 'earn_graduate_degree', currentYear),
      templateId: 'earn_graduate_degree',
      category: 'education',
      title: 'Earn an Advanced Graduate or Professional Degree',
      priority,
      targetYear: currentYear + 6,
      targetValue: 100,
      progress:
        npc.education.currentStage === 'professional'
          ? clampProgress(
              ((npc.education.stageYearsCompleted ?? 1) /
                Math.max(1, npc.education.stageTotalYears ?? 3)) *
                100
            )
          : 15,
      status: 'active',
      isCompleted: false,
      isAbandoned: false,
      createdYear: currentYear,
    }),
  },
  {
    id: 'land_first_career',
    category: 'career',
    buildTitle: () => 'Launch a Full-Time Career',
    isEligible: (npc) =>
      npc.age >= 18 &&
      npc.age <= 32 &&
      !npc.career.isRetired &&
      npc.education.currentStage !== 'university' &&
      npc.education.currentStage !== 'professional' &&
      !npcAlreadyHasCareer(npc),
    scoreUtility: (npc, prng) =>
      65 +
      npc.personality.ambition * 0.2 +
      npc.personality.conscientiousness * 0.15 +
      prng.nextInt(-4, 4),
    createGoalInstance: (npc, priority, currentYear) => ({
      id: deterministicUUID('npc-goal', npc.id, 'land_first_career', currentYear),
      templateId: 'land_first_career',
      category: 'career',
      title: 'Launch a Full-Time Career',
      priority,
      targetYear: currentYear + 3,
      targetValue: 1,
      progress: 0,
      status: 'active',
      isCompleted: false,
      isAbandoned: false,
      createdYear: currentYear,
    }),
  },
  {
    id: 'climb_career_ladder',
    category: 'career',
    buildTitle: (_, targetVal) =>
      `Earn Promotion & Reach ${targetVal ? targetVal.toLocaleString() : 'Higher'} Annual Salary`,
    isEligible: (npc) =>
      npc.age >= 19 &&
      npc.age <= 58 &&
      !npc.career.isRetired &&
      npc.career.salary > 0 &&
      npc.education.currentStage !== 'university' &&
      npc.education.currentStage !== 'professional',
    scoreUtility: (npc, prng) =>
      npc.personality.ambition * 0.45 +
      npc.personality.conscientiousness * 0.3 +
      npc.personality.materialism * 0.25 +
      prng.nextInt(-5, 5),
    createGoalInstance: (npc, priority, currentYear) => {
      const targetSalary = Math.round(npc.career.salary * 1.22);
      return {
        id: deterministicUUID('npc-goal', npc.id, 'climb_career_ladder', currentYear, targetSalary),
        templateId: 'climb_career_ladder',
        category: 'career',
        title: `Earn Promotion & Reach ${targetSalary.toLocaleString()} ${npc.finances.currency} Salary`,
        priority,
        targetYear: currentYear + 5,
        targetValue: targetSalary,
        baselineValue: npc.career.salary,
        progress: 10,
        status: 'active',
        isCompleted: false,
        isAbandoned: false,
        createdYear: currentYear,
      };
    },
  },
  {
    id: 'achieve_high_performance',
    category: 'career',
    buildTitle: () => 'Achieve Peak Workplace Performance (88%+)',
    isEligible: (npc) =>
      npc.age >= 18 &&
      npc.age <= 60 &&
      !npc.career.isRetired &&
      npc.career.salary > 0 &&
      npc.career.performance < 88,
    scoreUtility: (npc, prng) =>
      npc.personality.conscientiousness * 0.5 +
      npc.personality.ambition * 0.35 +
      prng.nextInt(-5, 5),
    createGoalInstance: (npc, priority, currentYear) => ({
      id: deterministicUUID('npc-goal', npc.id, 'achieve_high_performance', currentYear),
      templateId: 'achieve_high_performance',
      category: 'career',
      title: 'Achieve Peak Workplace Performance (88%+)',
      priority,
      targetYear: currentYear + 4,
      targetValue: 88,
      baselineValue: npc.career.performance,
      progress: clampProgress((npc.career.performance / 88) * 100),
      status: 'active',
      isCompleted: false,
      isAbandoned: false,
      createdYear: currentYear,
    }),
  },
  {
    id: 'pay_off_student_debt',
    category: 'financial',
    buildTitle: () => 'Pay Off All Student Loan Debt',
    isEligible: (npc) =>
      npc.age >= 20 &&
      npc.finances.studentDebt > 0 &&
      npc.education.currentStage !== 'university' &&
      npc.education.currentStage !== 'professional',
    scoreUtility: (npc, prng) =>
      55 +
      npc.personality.conscientiousness * 0.35 +
      npc.personality.patience * 0.15 +
      prng.nextInt(-4, 4),
    createGoalInstance: (npc, priority, currentYear) => ({
      id: deterministicUUID('npc-goal', npc.id, 'pay_off_student_debt', currentYear),
      templateId: 'pay_off_student_debt',
      category: 'financial',
      title: 'Pay Off All Student Loan Debt',
      priority,
      targetYear: currentYear + 10,
      targetValue: 0,
      baselineValue: npc.finances.studentDebt,
      progress: 0,
      status: 'active',
      isCompleted: false,
      isAbandoned: false,
      createdYear: currentYear,
    }),
  },
  {
    id: 'build_emergency_fund',
    category: 'financial',
    buildTitle: (npc, targetVal) =>
      `Build ${targetVal?.toLocaleString() ?? '15,000'} ${npc.finances.currency} Savings Reserve`,
    isEligible: (npc) => {
      if (npc.age < 18) return false;
      const econ = getCountryEconomicProfile(npc.location.country);
      const targetReserve = Math.max(
        Math.round(15000 * econ.pppCostMultiplier),
        Math.round(npc.finances.annualExpenses * 0.5)
      );
      return npc.finances.savings < targetReserve;
    },
    scoreUtility: (npc, prng) =>
      npc.personality.conscientiousness * 0.45 +
      npc.personality.patience * 0.3 +
      (100 - npc.personality.riskTolerance) * 0.25 +
      prng.nextInt(-5, 5),
    createGoalInstance: (npc, priority, currentYear) => {
      const econ = getCountryEconomicProfile(npc.location.country);
      const targetReserve = Math.max(
        Math.round(15000 * econ.pppCostMultiplier),
        Math.round(npc.finances.annualExpenses * 0.5)
      );
      return {
        id: deterministicUUID('npc-goal', npc.id, 'build_emergency_fund', currentYear, targetReserve),
        templateId: 'build_emergency_fund',
        category: 'financial',
        title: `Build ${targetReserve.toLocaleString()} ${npc.finances.currency} Savings Reserve`,
        priority,
        targetYear: currentYear + 6,
        targetValue: targetReserve,
        baselineValue: npc.finances.savings,
        progress: clampProgress((npc.finances.savings / Math.max(1, targetReserve)) * 100),
        status: 'active',
        isCompleted: false,
        isAbandoned: false,
        createdYear: currentYear,
      };
    },
  },
  {
    id: 'purchase_property',
    category: 'financial',
    buildTitle: () => 'Purchase a Home & Build Real Estate Equity',
    isEligible: (npc) =>
      npc.age >= 24 &&
      npc.age <= 65 &&
      npc.finances.realEstateValue <= 0 &&
      npc.finances.annualIncome > 0,
    scoreUtility: (npc, prng) =>
      npc.personality.materialism * 0.35 +
      npc.personality.conscientiousness * 0.35 +
      npc.personality.ambition * 0.3 +
      prng.nextInt(-5, 5),
    createGoalInstance: (npc, priority, currentYear) => {
      const econ = getCountryEconomicProfile(npc.location.country);
      const targetDownPayment = Math.round(35000 * econ.pppCostMultiplier);
      const currentLiquid = Math.max(0, npc.finances.cash + npc.finances.savings);
      return {
        id: deterministicUUID('npc-goal', npc.id, 'purchase_property', currentYear),
        templateId: 'purchase_property',
        category: 'financial',
        title: 'Purchase a Home & Build Real Estate Equity',
        priority,
        targetYear: currentYear + 8,
        targetValue: targetDownPayment,
        baselineValue: currentLiquid,
        progress: clampProgress((currentLiquid / Math.max(1, targetDownPayment)) * 100),
        status: 'active',
        isCompleted: false,
        isAbandoned: false,
        createdYear: currentYear,
      };
    },
  },
  {
    id: 'accumulate_wealth',
    category: 'financial',
    buildTitle: (npc, targetVal) =>
      `Grow Net Worth to ${targetVal?.toLocaleString() ?? '100,000'} ${npc.finances.currency}`,
    isEligible: (npc) => npc.age >= 20 && npc.age <= 75,
    scoreUtility: (npc, prng) =>
      npc.personality.materialism * 0.4 +
      npc.personality.ambition * 0.4 +
      npc.personality.conscientiousness * 0.2 +
      prng.nextInt(-5, 5),
    createGoalInstance: (npc, priority, currentYear) => {
      const econ = getCountryEconomicProfile(npc.location.country);
      const baseMilestone = Math.round(75000 * econ.pppCostMultiplier);
      const currentNW = Math.max(0, npc.finances.netWorth);
      const targetNW = Math.max(
        currentNW + baseMilestone,
        Math.round(currentNW * 1.45)
      );
      return {
        id: deterministicUUID('npc-goal', npc.id, 'accumulate_wealth', currentYear, targetNW),
        templateId: 'accumulate_wealth',
        category: 'financial',
        title: `Grow Net Worth to ${targetNW.toLocaleString()} ${npc.finances.currency}`,
        priority,
        targetYear: currentYear + 8,
        targetValue: targetNW,
        baselineValue: currentNW,
        progress: clampProgress((currentNW / Math.max(1, targetNW)) * 90),
        status: 'active',
        isCompleted: false,
        isAbandoned: false,
        createdYear: currentYear,
      };
    },
  },
  {
    id: 'retire_comfortably',
    category: 'lifestyle',
    buildTitle: () => 'Retire with Financial Security',
    isEligible: (npc) => npc.age >= 54 && !npc.career.isRetired,
    scoreUtility: (npc, prng) =>
      60 + (npc.age - 54) * 3 + (100 - npc.health) * 0.2 + prng.nextInt(-4, 4),
    createGoalInstance: (npc, priority, currentYear) => ({
      id: deterministicUUID('npc-goal', npc.id, 'retire_comfortably', currentYear),
      templateId: 'retire_comfortably',
      category: 'lifestyle',
      title: 'Retire with Financial Security',
      priority,
      targetYear: Math.max(currentYear + 4, npc.birthYear + 65),
      targetValue: 60,
      baselineValue: npc.age,
      progress: clampProgress(((npc.age - 50) / 12) * 100),
      status: 'active',
      isCompleted: false,
      isAbandoned: false,
      createdYear: currentYear,
    }),
  },
  {
    id: 'maintain_peak_vitality',
    category: 'lifestyle',
    buildTitle: () => 'Maintain High Health & Happiness',
    isEligible: (npc) => npc.age >= 5,
    scoreUtility: (npc, prng) =>
      45 +
      (100 - npc.health) * 0.25 +
      (100 - npc.happiness) * 0.25 +
      prng.nextInt(-4, 4),
    createGoalInstance: (npc, priority, currentYear) => {
      const currentComposite = Math.round((npc.health + npc.happiness) / 2);
      return {
        id: deterministicUUID('npc-goal', npc.id, 'maintain_peak_vitality', currentYear),
        templateId: 'maintain_peak_vitality',
        category: 'lifestyle',
        title: 'Maintain High Health & Happiness',
        priority,
        targetYear: currentYear + 4,
        targetValue: 82,
        baselineValue: currentComposite,
        progress: clampProgress((currentComposite / 82) * 100),
        status: 'active',
        isCompleted: false,
        isAbandoned: false,
        createdYear: currentYear,
      };
    },
  },
];

export function isGoalTemplateEligible(
  npc: NpcProfile,
  templateId: NpcGoalTemplateId
): boolean {
  const template = GOAL_TEMPLATES.find((candidate) => candidate.id === templateId);
  return template ? template.isEligible(npc) : false;
}

/**
 * Evaluates a single active goal's progression, completion, or failure/abandonment
 * against the NPC's current state and simulation year.
 */
export function evaluateSingleGoalLifecycle(
  goal: NpcGoal,
  npc: NpcProfile,
  currentYear: number
): NpcGoal {
  if (goal.isCompleted || goal.isAbandoned) {
    return goal;
  }

  let progress = goal.progress;
  let completed = false;
  let failed = false;
  let failedReason: string | undefined;

  switch (goal.templateId as NpcGoalTemplateId | undefined) {
    case 'excel_in_school': {
      const targetGrades = goal.targetValue ?? 88;
      progress = clampProgress((npc.education.grades / targetGrades) * 100);
      if (npc.education.grades >= targetGrades) {
        completed = true;
      } else if (
        npc.education.currentStage === 'dropped_out' ||
        npc.education.currentStage === 'graduated' ||
        npc.age >= 19
      ) {
        failed = true;
        failedReason = 'Left K-12 schooling before reaching Honor Roll standing';
      }
      break;
    }

    case 'graduate_high_school': {
      if (hasDiplomaContaining(npc, 'high school') || npc.education.currentStage === 'university' || npc.education.currentStage === 'graduated') {
        completed = true;
      } else if (npc.education.currentStage === 'dropped_out' || npc.age > 20) {
        failed = true;
        failedReason = 'Dropped out or aged out of high school without a diploma';
      } else {
        progress = clampProgress(((npc.age - 14) / 4) * 100);
      }
      break;
    }

    case 'earn_university_degree': {
      if (hasAnyUniversityDegree(npc)) {
        completed = true;
      } else if (npc.education.currentStage === 'dropped_out') {
        failed = true;
        failedReason = 'Dropped out of university before graduating';
      } else if (npc.education.currentStage === 'university') {
        const yrs = npc.education.stageYearsCompleted ?? 1;
        const total = Math.max(1, npc.education.stageTotalYears ?? 4);
        progress = clampProgress((yrs / total) * 100);
      } else if (npc.age > 26) {
        failed = true;
        failedReason = 'Did not enroll in university within target window';
      } else {
        progress = Math.max(15, goal.progress);
      }
      break;
    }

    case 'earn_graduate_degree': {
      if (hasGraduateDegree(npc)) {
        completed = true;
      } else if (npc.education.currentStage === 'dropped_out') {
        failed = true;
        failedReason = 'Left graduate program before completion';
      } else if (npc.education.currentStage === 'professional') {
        const yrs = npc.education.stageYearsCompleted ?? 1;
        const total = Math.max(1, npc.education.stageTotalYears ?? 3);
        progress = clampProgress((yrs / total) * 100);
      } else if (npc.age > 35) {
        failed = true;
        failedReason = 'Did not complete graduate studies within target window';
      }
      break;
    }

    case 'land_first_career': {
      if (
        npc.career.salary > 0 &&
        npc.career.occupation !== 'Unemployed' &&
        !npc.career.occupation.includes('Student')
      ) {
        completed = true;
      } else if (npc.career.isRetired) {
        failed = true;
        failedReason = 'Retired before establishing career';
      } else {
        progress = Math.min(90, goal.progress + 20);
      }
      break;
    }

    case 'climb_career_ladder': {
      const targetSalary = goal.targetValue ?? Math.round((goal.baselineValue ?? 40000) * 1.2);
      if (npc.career.salary >= targetSalary) {
        completed = true;
      } else if (npc.career.isRetired) {
        failed = true;
        failedReason = 'Retired before reaching target salary tier';
      } else if (npc.career.salary <= 0) {
        progress = Math.max(0, goal.progress - 15);
      } else {
        const base = goal.baselineValue ?? Math.round(targetSalary * 0.8);
        const span = Math.max(1, targetSalary - base);
        progress = clampProgress(((npc.career.salary - base) / span) * 100);
      }
      break;
    }

    case 'achieve_high_performance': {
      const targetPerf = goal.targetValue ?? 88;
      if (npc.career.performance >= targetPerf && npc.career.salary > 0) {
        completed = true;
      } else if (npc.career.isRetired || npc.career.salary <= 0) {
        failed = true;
        failedReason = 'Left employment before reaching peak performance goal';
      } else {
        progress = clampProgress((npc.career.performance / targetPerf) * 100);
      }
      break;
    }

    case 'pay_off_student_debt': {
      if (npc.finances.studentDebt <= 0) {
        completed = true;
      } else {
        const initialDebt = Math.max(npc.finances.studentDebt, goal.baselineValue ?? npc.finances.studentDebt);
        progress = clampProgress(((initialDebt - npc.finances.studentDebt) / Math.max(1, initialDebt)) * 100);
      }
      break;
    }

    case 'build_emergency_fund': {
      const targetSavings = goal.targetValue ?? 15000;
      if (npc.finances.savings >= targetSavings) {
        completed = true;
      } else {
        progress = clampProgress((npc.finances.savings / Math.max(1, targetSavings)) * 100);
      }
      break;
    }

    case 'purchase_property': {
      if (npc.finances.realEstateValue > 0) {
        completed = true;
      } else {
        const targetDown = goal.targetValue ?? 35000;
        const liquid = Math.max(0, npc.finances.cash + npc.finances.savings);
        progress = clampProgress((liquid / Math.max(1, targetDown)) * 95);
      }
      break;
    }

    case 'accumulate_wealth': {
      const targetNW = goal.targetValue ?? 100000;
      if (npc.finances.netWorth >= targetNW) {
        completed = true;
      } else {
        progress = clampProgress((Math.max(0, npc.finances.netWorth) / Math.max(1, targetNW)) * 100);
      }
      break;
    }

    case 'retire_comfortably': {
      if (npc.career.isRetired && npc.finances.netWorth >= 0) {
        completed = true;
      } else if (npc.career.isRetired && npc.finances.netWorth < 0) {
        failed = true;
        failedReason = 'Entered retirement with negative net worth';
      } else {
        progress = clampProgress(((npc.age - 50) / 12) * 90);
      }
      break;
    }

    case 'maintain_peak_vitality': {
      const targetVitality = goal.targetValue ?? 82;
      const currentComposite = Math.round((npc.health + npc.happiness) / 2);
      if (currentComposite >= targetVitality) {
        completed = true;
      } else {
        progress = clampProgress((currentComposite / targetVitality) * 100);
      }
      break;
    }

    default: {
      // Custom or legacy goals without templateId
      if (goal.progress >= 100) {
        completed = true;
      }
      break;
    }
  }

  // Deadline expiration check if not yet completed or failed
  if (!completed && !failed && goal.targetYear !== undefined && currentYear > goal.targetYear) {
    failed = true;
    failedReason = 'Target deadline expired before completion';
  }

  if (completed) {
    return {
      ...goal,
      progress: 100,
      status: 'completed',
      isCompleted: true,
      isAbandoned: false,
      completedYear: currentYear,
    };
  }

  if (failed) {
    return {
      ...goal,
      status: 'failed',
      isCompleted: false,
      isAbandoned: true,
      failedReason: failedReason ?? 'Goal became unachievable',
    };
  }

  return {
    ...goal,
    progress: clampProgress(progress),
    status: 'active',
  };
}

/**
 * Generates new stage- and personality-appropriate goals to fill any missing
 * `'primary'` or `'secondary'` active goal slots for a living NPC.
 */
export function generateReplacementGoalsForNpc(
  npc: NpcProfile,
  existingGoals: readonly NpcGoal[],
  currentYear: number,
  prng: SeededPRNG
): NpcGoal[] {
  if (!npc.isAlive || npc.age < 6) {
    return [...existingGoals];
  }

  const activeGoals = existingGoals.filter((g) => !g.isCompleted && !g.isAbandoned);
  const hasPrimary = activeGoals.some((g) => g.priority === 'primary');
  const hasSecondary = activeGoals.some((g) => g.priority === 'secondary');

  if (hasPrimary && hasSecondary) {
    return [...existingGoals];
  }

  // Prevent re-assigning the exact same templateId if already active or completed this year
  const excludedTemplateIds = new Set<string>();
  for (const g of existingGoals) {
    if (g.templateId && (!g.isCompleted && !g.isAbandoned)) {
      excludedTemplateIds.add(g.templateId);
    }
    if (g.templateId && g.completedYear === currentYear) {
      excludedTemplateIds.add(g.templateId);
    }
  }

  const eligibleTemplates = GOAL_TEMPLATES.filter(
    (tpl) => !excludedTemplateIds.has(tpl.id) && tpl.isEligible(npc)
  );

  if (eligibleTemplates.length === 0) {
    return [...existingGoals];
  }

  const ranked = rankCandidatesDeterministically(eligibleTemplates, (tpl) =>
    tpl.scoreUtility(npc, prng)
  );

  const updatedGoals = [...existingGoals];
  let rankIndex = 0;

  if (!hasPrimary && rankIndex < ranked.length) {
    const chosenTpl = ranked[rankIndex++].candidate;
    updatedGoals.push(chosenTpl.createGoalInstance(npc, 'primary', currentYear));
    excludedTemplateIds.add(chosenTpl.id);
  }

  if (!hasSecondary && rankIndex < ranked.length) {
    const chosenTpl = ranked[rankIndex++].candidate;
    updatedGoals.push(chosenTpl.createGoalInstance(npc, 'secondary', currentYear));
  }

  return updatedGoals;
}

export interface GoalLifecyclePassResult {
  updatedNpc: NpcProfile;
  newlyCompletedGoals: NpcGoal[];
  newlyFailedGoals: NpcGoal[];
  newlyGeneratedGoals: NpcGoal[];
}

/**
 * Complete annual goal lifecycle pass for an NPC:
 * 1. Progresses all active goals.
 * 2. Detects and marks completed goals (rewarding happiness).
 * 3. Detects and marks failed / impossible / expired goals.
 * 4. Replaces completed or failed slots with new personality-driven active goals.
 */
export function processNpcGoalsLifecycle(
  npc: NpcProfile,
  currentYear: number,
  prng: SeededPRNG
): GoalLifecyclePassResult {
  if (!npc.isAlive) {
    return {
      updatedNpc: npc,
      newlyCompletedGoals: [],
      newlyFailedGoals: [],
      newlyGeneratedGoals: [],
    };
  }

  const newlyCompletedGoals: NpcGoal[] = [];
  const newlyFailedGoals: NpcGoal[] = [];

  const evaluatedExisting = npc.goals.map((goal) => {
    const wasActive = !goal.isCompleted && !goal.isAbandoned;
    const updated = evaluateSingleGoalLifecycle(goal, npc, currentYear);
    if (wasActive && updated.isCompleted) {
      newlyCompletedGoals.push(updated);
    } else if (wasActive && updated.isAbandoned) {
      newlyFailedGoals.push(updated);
    }
    return updated;
  });

  // Apply happiness adjustments for newly completed or failed primary goals
  let happinessDelta = 0;
  for (const cg of newlyCompletedGoals) {
    happinessDelta += cg.priority === 'primary' ? 4 : 2;
  }
  for (const fg of newlyFailedGoals) {
    happinessDelta -= fg.priority === 'primary' ? 2 : 1;
  }

  const intermediateNpc: NpcProfile = {
    ...npc,
    happiness: Math.max(0, Math.min(100, npc.happiness + happinessDelta)),
    goals: evaluatedExisting,
  };

  const countBeforeReplacement = evaluatedExisting.length;
  const finalGoals = generateReplacementGoalsForNpc(
    intermediateNpc,
    evaluatedExisting,
    currentYear,
    prng
  );
  const newlyGeneratedGoals = finalGoals.slice(countBeforeReplacement);

  return {
    updatedNpc: {
      ...intermediateNpc,
      goals: finalGoals,
    },
    newlyCompletedGoals,
    newlyFailedGoals,
    newlyGeneratedGoals,
  };
}

