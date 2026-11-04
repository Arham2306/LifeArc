import type { CharacterProfile, StatEffects } from '../../types/game';

export type EmploymentType = 'full_time' | 'part_time' | 'freelance';

export type CareerField =
  | 'technology'
  | 'medicine_healthcare'
  | 'business_finance'
  | 'law_government'
  | 'arts_media'
  | 'trades_services'
  | 'hospitality_retail'
  | 'aviation_transport'
  | 'education_science';

export type CredentialTier =
  | 'open_entry'
  | 'high_school'
  | 'bachelors'
  | 'masters_professional';

export interface InterviewOption {
  label: string;
  isPass: boolean;
  feedback: string;
}

export interface JobTemplate {
  id: string;
  title: string;
  field: CareerField;
  type: EmploymentType;
  credentialTier: CredentialTier;
  icon: string;
  companyNameTemplates: string[];
  baseSalary: number; // Annual pay in USD ($)
  hourlyRateLabel?: string; // Optional hourly label for part-time gigs (e.g. "$15/hr")
  minAge: number; // 16 for part-time, 18 for full-time & freelance

  /** Exact diploma strings fromcharacter.education.diplomas that unlock/match this job. */
  requiredDegreeTitles: string[];
  /** Friendly short label for the required degree badge (e.g. "B.S. in Computer Science"). */
  requiredDegreeShortLabel?: string;
  /** Whether any High School Diploma (or higher) is required. */
  requiresHighSchoolDiploma?: boolean;

  // Minimum stat thresholds
  minSmarts?: number;
  minHealth?: number;
  minLooks?: number;

  description: string;
  interviewQuestion: {
    interviewerRole: string;
    question: string;
    options: InterviewOption[];
  };
}

export interface ActiveCareerProfile {
  jobId: string;
  title: string;
  companyName: string;
  field: CareerField;
  type: EmploymentType;
  salary: number;
  yearsInJob: number;
  performance: number; // 0 - 100
  hiredAge: number;
  icon: string;
}

export interface CareerHistoryEntry {
  id: string;
  jobId: string;
  title: string;
  companyName: string;
  type: EmploymentType;
  startAge: number;
  endAge: number;
  finalSalary: number;
  reasonForLeaving: 'resigned' | 'switched_jobs' | 'fired' | 'retired';
}

export interface YearlyCareerActions {
  workedHarder: boolean;
  slackedOff: boolean;
  askedForRaise: boolean;
  askedForPromotion: boolean;
  socializedWithCoworkers: boolean;
}

export interface PlayerCareerState {
  currentJob: ActiveCareerProfile | null;
  history: CareerHistoryEntry[];
  totalCareerEarnings: number;
  /** Track job IDs the player already interviewed for and failed at their current age. */
  rejectedJobIdsThisYear: string[];
  yearActions: YearlyCareerActions;
}

export interface PromotionTier {
  title: string;
  salary: number;
  minPerformance: number;
  minYears: number;
  minSmarts?: number;
  minLooks?: number;
  /** Degree titles that unlock this promotion tier (e.g. ['Master of Business Administration (M.B.A.)']). */
  requiredDegreeTitles?: string[];
  requiredDegreeLabel?: string;
  description: string;
}

export interface CareerLadder {
  jobId: string;
  tiers: PromotionTier[];
}

export interface WorkplaceActionOutcome {
  character: CharacterProfile;
  title: string;
  subtitle: string;
  message: string;
  icon: string;
  appliedEffects: StatEffects;
  isSuccess: boolean;
  promotedTitle?: string;
  newSalary?: number;
  missingDegreeRequirement?: string;
}

export interface JobEligibilityResult {
  isAdmissible: boolean;
  isAgeEligible: boolean;
  hasRequiredDegree: boolean;
  hasHighSchoolDiploma: boolean;
  meetsStatRequirements: boolean;
  isDegreeMatch: boolean;
  matchedDegreeTitle?: string;
  missingRequirementLabel?: string;
  alreadyRejectedThisYear: boolean;
  isCurrentJob: boolean;
}

export interface SortedJobListing {
  job: JobTemplate;
  eligibility: JobEligibilityResult;
  priorityScore: number;
}

