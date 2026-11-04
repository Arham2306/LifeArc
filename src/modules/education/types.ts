import type { StatEffects } from '../../types/game'

export type SchoolStage =
  | 'none'
  | 'elementary'
  | 'middle_school'
  | 'high_school'
  | 'graduated'
  | 'dropped_out'
  | 'university'
  | 'professional_school';

export type ActiveSchoolStage = 'elementary' | 'middle_school' | 'high_school';

export type DisciplineId =
  | 'soccer'
  | 'basketball'
  | 'robotics'
  | 'debate'
  | 'drama'
  | 'music'
  | 'journalism'
  | 'visual_arts';

export type ActivityCategory = 'athletics' | 'academics' | 'arts';

export type ActivityRole = 'member' | 'captain' | 'president' | 'lead';

export type TuitionFunding =
  | 'scholarship_merit'
  | 'scholarship_athletic'
  | 'parents'
  | 'student_loan'
  | 'self_paid';

export interface DisciplineRecord {
  disciplineId: DisciplineId;
  label: string;
  icon: string;
  totalYears: number;
  highestRole: ActivityRole;
  trophiesWon: number;
}

export interface ExtracurricularTemplate {
  id: string;
  disciplineId: DisciplineId;
  name: string;
  category: ActivityCategory;
  icon: string;
  stage: ActiveSchoolStage;
  requiresTryout: boolean;
  requiredStat?: 'health' | 'smarts' | 'looks';
  minStatValue?: number;
  leaderRole: Exclude<ActivityRole, 'member'>;
  leaderTitle: string;
  description: string;
  careerPipelineLabel: string;
  annualPerks: StatEffects;
  practiceEffects: StatEffects;
}

export interface ActiveExtracurricular {
  activityId: string;
  disciplineId: DisciplineId;
  name: string;
  category: ActivityCategory;
  icon: string;
  joinedAge: number;
  yearsInClub: number;
  role: ActivityRole;
  leaderTitle: string;
  practicedThisYear: boolean;
}

export interface UniversityMajor {
  id: string;
  name: string;
  icon: string;
  disciplineId?: DisciplineId;
  degreeTitle: string;
  tuitionPerYear: number;
  minGrades: number;
  minSmarts: number;
  minHealth?: number;
  description: string;
  careerUnlocks: string;
}

export interface UniversityProfile {
  universityName: string;
  majorId: string;
  majorName: string;
  degreeTitle: string;
  year: number;
  totalYears: number;
  fundingType: TuitionFunding;
  tuitionPerYear: number;
}

export interface ProfessionalSchoolTemplate {
  id: string;
  name: string;
  icon: string;
  degreeAwarded: string;
  durationYears: number;
  /** List of accepted undergraduate degree titles. If empty, any high school graduate can apply. */
  requiredDegreeTitles: string[];
  minGrades: number;
  minSmarts: number;
  minHealth?: number;
  tuitionPerYear: number;
  description: string;
  careerUnlocks: string;
}

export interface ProfessionalSchoolProfile {
  schoolId: string;
  schoolName: string;
  programName: string;
  degreeAwarded: string;
  year: number;
  totalYears: number;
  fundingType: TuitionFunding;
  tuitionPerYear: number;
}

export interface SchoolHistoryEntry {
  id: string;
  stage: ActiveSchoolStage | 'university' | 'professional_school';
  stageLabel: string;
  schoolName: string;
  startAge: number;
  endAge: number;
  finalGrades: number;
  status: 'graduated' | 'dropped_out';
}

export interface YearlyStudentActions {
  studiedHard: boolean;
  slackedOff: boolean;
  askedForTutor: boolean;
}

export interface EducationProfile {
  currentStage: SchoolStage;
  schoolName: string | null;
  stageStartAge: number | null;
  yearInStage: number;
  totalYearsInStage: number;
  gradeLevelLabel: string | null;
  /** Academic performance / GPA score (0 - 100). */
  grades: number;
  /** Social standing among classmates (0 - 100). */
  popularity: number;
  /** Diplomas, certificates, and university degrees earned so far. */
  diplomas: string[];
  /** Completed or left schools. */
  history: SchoolHistoryEntry[];
  /** Tracks which optional student actions have been used during the current school year. */
  yearActions: YearlyStudentActions;
  /** Currently active extracurricular clubs and sports (maximum 2). */
  activities: ActiveExtracurricular[];
  /** Lifelong cumulative discipline mastery across Elementary, Middle, High School & University. */
  disciplines: Record<DisciplineId, DisciplineRecord>;
  /** Active undergraduate university enrollment (if currently in university). */
  university: UniversityProfile | null;
  /** Active professional or graduate school enrollment (Medical, Law, Flight, etc.). */
  professionalSchool: ProfessionalSchoolProfile | null;
  /** Accumulated student loan debt from higher education. */
  studentDebt: number;
}

export type SchoolMilestoneType =
  | 'elementary'
  | 'middle_school'
  | 'high_school'
  | 'high_school_graduation'
  | 'university_graduation'
  | 'professional_graduation';

export interface SchoolMilestoneNotice {
  milestoneType: SchoolMilestoneType;
  title: string;
  subtitle: string;
  schoolName: string;
  gradeLevel: string;
  description: string;
  icon: string;
  grades: number;
  popularity: number;
  isGraduation?: boolean;
  diplomaEarned?: string;
}

export interface ActionOutcomeNotice {
  title: string;
  subtitle?: string;
  message: string;
  icon: string;
  appliedEffects: StatEffects;
}
