import type { CharacterProfile } from '../../../types/game';
import { createInitialCareerState } from '../../career/services/careerService';
import {
  createInitialEducation,
  enrollInUniversity,
  expelFromHigherEducationForCrime,
  getSchoolMilestoneNotice,
  progressEducationForYear,
} from '../services/educationService';

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function makeStudentCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const age = overrides.age ?? 4;
  return {
    id: 'char-edu-test',
    firstName: 'Maya',
    lastName: 'Lin',
    gender: 'female',
    country: 'United States',
    city: 'Seattle',
    occupation: 'Toddler',
    birthYear: 2026 - age,
    age,
    isAlive: true,
    cash: 5000,
    bankBalance: 0,
    netWorth: 5000,
    stats: {
      health: 90,
      happiness: 85,
      smarts: 88,
      looks: 75,
      karma: 85,
    },
    parents: {
      father: {
        id: 'dad-edu',
        role: 'father',
        firstName: 'Ken',
        lastName: 'Lin',
        age: age + 28,
        occupation: 'Accountant',
        isAlive: true,
        relationship: 80,
        generosity: 70,
      },
      mother: {
        id: 'mom-edu',
        role: 'mother',
        firstName: 'Grace',
        lastName: 'Lin',
        age: age + 26,
        occupation: 'Pharmacist',
        isAlive: true,
        relationship: 85,
        generosity: 75,
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

console.log('--- STARTING EDUCATION SERVICE TESTS ---');

// 1. K-12 entry at age 5 and High School graduation at age 18
{
  const age4Char = makeStudentCharacter({ age: 4 });
  const age5Progress = progressEducationForYear(age4Char, 5);
  assert(
    age5Progress.education.currentStage === 'elementary' &&
      Boolean(age5Progress.education.schoolName),
    'Age 4 -> 5 automatically enrolls child in Elementary School'
  );

  const elementaryNotice = getSchoolMilestoneNotice({
    ...age4Char,
    age: 5,
    education: age5Progress.education,
  });
  assert(
    elementaryNotice?.milestoneType === 'elementary',
    'getSchoolMilestoneNotice returns elementary milestone at age 5'
  );

  const hsSenior = makeStudentCharacter({
    age: 17,
    occupation: 'High School Student',
    education: {
      ...createInitialEducation(),
      currentStage: 'high_school',
      schoolName: 'Seattle High School',
      stageStartAge: 14,
      yearInStage: 4,
      totalYearsInStage: 4,
      gradeLevelLabel: '12th Grade (Senior)',
      grades: 90,
      popularity: 70,
      diplomas: ['Elementary School', 'Middle School'],
    },
  });
  const hsGradProgress = progressEducationForYear(hsSenior, 18);
  assert(
    hsGradProgress.education.currentStage === 'graduated' &&
      hsGradProgress.education.diplomas.some((d) => d.includes('High School Diploma')),
    'Age 17 -> 18 graduates student from High School with a diploma'
  );
}

// 2. University enrollment: student_loan vs denied scholarship, annual debt accrual, suspension, and crime expulsion
{
  const gradChar = makeStudentCharacter({
    age: 18,
    occupation: 'Unemployed',
    stats: { health: 90, happiness: 85, smarts: 88, looks: 75, karma: 90 },
    education: {
      ...createInitialEducation(),
      currentStage: 'graduated',
      grades: 82,
      diplomas: ['High School Diploma'],
    },
  });

  // Low-grade scholarship check should deny full ride cleanly
  const lowGradesGrad = {
    ...gradChar,
    education: { ...gradChar.education, grades: 70 },
  };
  const deniedScholarship = enrollInUniversity(lowGradesGrad, 'cs', 'scholarship');
  assert(
    !deniedScholarship.enrolled && deniedScholarship.outcome.title === 'Scholarship Denied',
    'enrollInUniversity rejects merit scholarship when high school grades fall short'
  );

  // Enroll in Computer Science with student loan
  const enrolledLoan = enrollInUniversity(gradChar, 'cs', 'student_loan');
  assert(
    enrolledLoan.enrolled &&
      enrolledLoan.character.education.currentStage === 'university' &&
      enrolledLoan.character.education.university?.fundingType === 'student_loan',
    'enrollInUniversity enrolls qualified graduate with student_loan funding'
  );

  // Year 1 -> 2 progression accrues annual tuition onto studentDebt
  const afterUniYear1 = progressEducationForYear(enrolledLoan.character, 19);
  assert(
    afterUniYear1.education.studentDebt > 0 &&
      afterUniYear1.education.university?.year === 2,
    'progressEducationForYear advances university year and accrues student loan debt'
  );

  // Academic suspension pauses progression without accruing additional debt
  const suspendedStudent: CharacterProfile = {
    ...enrolledLoan.character,
    age: 19,
    education: {
      ...afterUniYear1.education,
      disciplinaryStatus: 'suspended',
      disciplinaryDurationYears: 1,
    },
  };
  const duringSuspension = progressEducationForYear(suspendedStudent, 20);
  assert(
    duringSuspension.education.studentDebt === afterUniYear1.education.studentDebt &&
      duringSuspension.education.disciplinaryStatus === 'none' &&
      duringSuspension.education.university?.year === 2,
    'Academic suspension pauses degree progression and debt accrual for 1 year before clearing'
  );

  // Crime expulsion removes active university enrollment while preserving earned diplomas & debt
  const expelled = expelFromHigherEducationForCrime(
    { ...enrolledLoan.character, education: afterUniYear1.education },
    'Grand Theft',
    'imprisoned',
  );
  assert(
    expelled.expelled &&
      expelled.character.education.currentStage === 'graduated' &&
      expelled.character.education.university === null &&
      expelled.character.education.studentDebt === afterUniYear1.education.studentDebt &&
      expelled.character.education.diplomas.includes('High School Diploma'),
    'expelFromHigherEducationForCrime expels student while preserving existing diplomas and studentDebt'
  );
}

console.log('--- ALL EDUCATION SERVICE TESTS PASSED PERFECTLY! ---');
