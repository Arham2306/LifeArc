import type { LifeEventCategory, PersonProfile, RelationshipType, RomanticStage, StatEffects } from '../../types/game'
import type { SchoolStage } from '../education/types'
import type { CareerField, EmploymentType } from '../career/types'
import type { BusinessSector } from '../business/types'

/** Dashboard life-stage bands used by contextual eligibility. */
export type EventLifeStage = 'childhood' | 'teens' | 'adulthood' | 'middle_age' | 'old_age';

/** Cash and student-debt band. Null on the context when either input is invalid. */
export type FinancialBand = 'dependent' | 'struggling' | 'stable' | 'comfortable' | 'wealthy';

/** One namespaced fact contributed by an event-context provider. */
export interface EventExtensionFact {
  providerId: string;
  key: string;
  equals: string | number | boolean;
}

/**
 * Optional contextual gates. Array fields match with OR.
 * Separate fields match with AND. Omitted fields are not checked.
 */
export interface EventRequirements {
  lifeStages?: EventLifeStage[];
  financialBands?: FinancialBand[];
  minCash?: number;
  maxCash?: number;
  minStudentDebt?: number;
  minKarma?: number;
  maxKarma?: number;
  minHealth?: number;
  maxHealth?: number;
  requiresPartner?: boolean;
  requiresSpouse?: boolean;
  requiresNoPartner?: boolean;
  partnerStages?: RomanticStage[];
  minChildren?: number;
  maxChildren?: number;
  requiresSchoolAgeChild?: boolean;
  requiresUnemployed?: boolean;
  minYearsInJob?: number;
  extensionAll?: EventExtensionFact[];
}

/**
 * Optional rejection rules. A template is ineligible when any present field matches.
 * An omitted field does not exclude. A present empty array does not exclude.
 */
export interface EventExclusions {
  seenEventIds?: string[];
  lifeStages?: EventLifeStage[];
  financialBands?: FinancialBand[];
  partnerStages?: RomanticStage[];
  hasPartner?: boolean;
  hasSpouse?: boolean;
  hasBusiness?: boolean;
  isEmployed?: boolean;
}

/** One possible result of picking a choice. Multiple outcomes = random result. */
export interface EventOutcome {
  message: string;
  effects: StatEffects;
  /** Relative likelihood when a choice has several outcomes. Defaults to 1. */
  weight?: number;
  /**
   * Optional tag for parent-funded choices:
   * - true = parents agreed / could afford to pay (boosted by family wealth & parent relationship)
   * - false = parents refused / couldn't afford
   */
  parentPaid?: boolean;
  /** When this outcome introduces a new person or establishes a relationship. */
  personIntroduced?: Omit<PersonProfile, 'id' | 'age'> & { id?: string; age?: number };
  /** When this outcome modifies relationship with a previously introduced person. */
  relationshipDelta?: {
    personName: string;
    delta: number;
    newType?: RelationshipType;
  };
}

export interface EventChoice {
  id: string;
  label: string;
  icon: string;
  outcomes: EventOutcome[];
}

/** A template for an interactive life event that asks the player to make a choice. */
export interface LifeEventTemplate {
  id: string;
  title: string;
  icon: string;
  /** Supports {firstName}, {lastName}, {fatherName}, and {motherName} placeholders. */
  description: string;
  category: LifeEventCategory;
  minAge: number;
  maxAge: number;
  /** Relative likelihood of being picked. Defaults to 1. */
  weight?: number;
  /** If true the event can happen more than once in a life. Defaults to false. */
  repeatable?: boolean;
  /** Optional schooling stage requirement (e.g. 'university', 'middle_school', 'high_school'). */
  requiredStage?: SchoolStage | SchoolStage[];
  /** Requires active employment to roll. */
  requiresEmployed?: boolean;
  /** Restricts event to specific career fields (e.g. 'technology', 'medicine_healthcare', 'hospitality_retail'). */
  requiredCareerField?: CareerField | CareerField[];
  /** Restricts event to employment type (e.g. 'part_time', 'full_time', 'freelance'). */
  requiredEmploymentType?: EmploymentType | EmploymentType[];
  /** Restricts event to specific job IDs (e.g. ['ft_medical_physician']). */
  requiredJobIds?: string[];
  /** Requires player to own an active business to roll this event. */
  requiresBusiness?: boolean;
  /** Restricts event to specific business sector(s). */
  requiredBusinessSector?: BusinessSector | BusinessSector[];
  /** Contextual gates. Absent means the template keeps structural eligibility only. */
  requires?: EventRequirements;
  /** Contextual rejections. Absent means no extra rejection. */
  excludes?: EventExclusions;
  choices: EventChoice[];
}
