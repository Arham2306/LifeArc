import type { FamilyWealth, PartnerStats, RelationshipType, RomanticStage } from '../../types/game';

export type NpcTier = 'core' | 'social' | 'background' | 'historical';

export type BiologicalGender = 'male' | 'female';
export type GenderIdentity = 'male' | 'female' | 'non-binary';

export type LineageRelationType = 'biological' | 'adoptive' | 'step' | 'in_law' | 'none';
export type ParentRoleType = 'father' | 'mother' | 'parent';

export type NpcPrngDomain =
  | 'health'
  | 'education'
  | 'career'
  | 'finance'
  | 'relocation'
  | 'romance'
  | 'family'
  | 'social'
  | 'goals'
  | 'memory'
  | 'migration';

export interface NpcPersonality {
  // Big Five Traits (0 - 100)
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;

  // Secondary Facets (0 - 100)
  ambition: number;
  generosity: number;
  loyalty: number;
  riskTolerance: number;
  empathy: number;
  sociability: number;
  patience: number;
  materialism: number;

  archetype?: 'class_clown' | 'studious' | 'popular' | 'rebel' | 'quiet' | 'athletic';
}

export type NpcGoalStatus = 'active' | 'completed' | 'failed' | 'abandoned';

export interface NpcGoal {
  id: string;
  templateId?: string;
  category: 'education' | 'career' | 'financial' | 'romance' | 'family' | 'lifestyle';
  title: string;
  priority: 'primary' | 'secondary';
  targetYear?: number;
  targetValue?: number;
  baselineValue?: number;
  progress: number; // 0 - 100
  status?: NpcGoalStatus;
  isCompleted: boolean;
  isAbandoned: boolean;
  createdYear?: number;
  completedYear?: number;
  failedReason?: string;
}

export interface NpcLifestyle {
  diet: 'standard' | 'vegetarian' | 'vegan' | 'junk_food' | 'organic';
  fitnessHabit: 'sedentary' | 'casual' | 'regular' | 'athlete';
  substances: {
    alcohol: 'none' | 'social' | 'heavy';
    smoking: boolean;
  };
  interests: string[];
  hobbies: string[];
}

export interface NpcHealthCondition {
  id: string;
  name: string;
  severity: 'minor' | 'chronic' | 'critical';
  diagnosedYear: number;
  isTreated: boolean;
}

export interface NpcEducationHistoryEntry {
  stage: string;
  schoolName: string;
  startYear: number;
  endYear: number;
  gpaOrGrade: string;
  graduated: boolean;
}

export interface NpcEducationState {
  currentStage:
    | 'none'
    | 'elementary'
    | 'middle_school'
    | 'high_school'
    | 'university'
    | 'professional'
    | 'graduated'
    | 'dropped_out';
  schoolName: string | null;
  grades: number; // 0 - 100
  degreeEarned?: string;
  fieldOfStudy?: string;
  enrolledProgramId?: string;
  stageStartYear?: number;
  stageYearsCompleted?: number;
  stageTotalYears?: number;
  tuitionPerYear?: number;
  fundingType?: 'scholarship_merit' | 'scholarship_athletic' | 'parents' | 'student_loan' | 'self_paid';
  diplomas?: string[];
  // NOTE: studentDebt is stored solely in NpcFinanceState to maintain a single financial source of truth.
  history: NpcEducationHistoryEntry[];
}

export interface NpcCareerHistoryEntry {
  jobId: string;
  title: string;
  companyName: string;
  startYear: number;
  endYear: number;
  finalSalary: number;
  reasonForLeaving: 'resigned' | 'promoted' | 'terminated' | 'retired';
}

export interface NpcCareerState {
  jobId: string | null;
  title: string;
  companyName: string;
  occupation: string;
  salary: number;
  performance: number; // 0 - 100
  yearsInRole: number;
  isRetired: boolean;
  pensionAnnual: number;
  history: NpcCareerHistoryEntry[];
}

export interface NpcFinanceState {
  currency: string;             // ISO 4217 currency code (e.g. 'USD', 'GBP', 'PKR', 'EUR')
  cash: number;                 // Liquid checking balance
  savings: number;              // Savings balance (cash <-> savings transfers are net-worth neutral)
  realEstateValue: number;      // Market value of owned properties
  businessEquity: number;       // Valuation of owned business equity
  studentDebt: number;          // Canonical student loan principal balance
  mortgageBalance: number;      // Canonical mortgage principal balance
  otherLiabilities: number;     // Personal loans or unpaid liabilities
  annualIncome: number;
  annualExpenses: number;
  netWorth: number;             // (cash + savings + realEstateValue + businessEquity) - (studentDebt + mortgageBalance + otherLiabilities)
}

export interface NpcResidenceHistoryEntry {
  country: string;
  city: string;
  startYear: number;
  endYear?: number;
  reason: 'birth' | 'career' | 'education' | 'marriage' | 'retirement' | 'financial' | 'relocation' | 'adoption';
}

export interface NpcLocation {
  country: string;
  city: string;
  residenceHistory: NpcResidenceHistoryEntry[];
}

export type NpcLifeEventType =
  | 'birth'
  | 'education_enrollment'
  | 'graduation'
  | 'hired'
  | 'promoted'
  | 'resigned'
  | 'terminated'
  | 'relationship_started'
  | 'friendship_drifted'
  | 'reconciliation'
  | 'breakup'
  | 'engagement'
  | 'wedding'
  | 'divorce'
  | 'child_born'
  | 'child_adopted'
  | 'relocated'
  | 'major_purchase'
  | 'diagnosed'
  | 'recovered'
  | 'inheritance_received'
  | 'retired'
  | 'death';

/** Objective, structured historical life event (separate from emotional memories, deduplicated via dedupeKey) */
export interface NpcLifeEvent {
  id: string;
  dedupeKey: string; // Deterministic: `${npcId}:${type}:${year}:${referenceId ?? 'none'}`
  npcId: string;
  year: number;
  age: number;
  type: NpcLifeEventType;
  title: string;
  description: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface NpcProfile {
  id: string; // Globally unique stable UUID
  tier: NpcTier;
  firstName: string;
  lastName: string;
  gender: GenderIdentity;
  biologicalGender: BiologicalGender;
  age: number;
  birthYear: number;
  isAlive: boolean;
  deathYear?: number;
  causeOfDeath?: string;
  estateSettled?: boolean;
  location: NpcLocation;

  // Identity & Migration Provenance
  identityResolutionStatus: 'canonical' | 'ambiguous_flagged';
  provenanceSource?: string;

  // Vitality & Genetics
  looks: number;     // 0 - 100
  smarts: number;    // 0 - 100
  health: number;    // 0 - 100
  happiness: number; // 0 - 100
  fertility: number; // 0 - 100
  craziness: number; // 0 - 100 (for partner compatibility/drama)

  // Behavioral & Lifecycle Systems
  personality: NpcPersonality;
  lifestyle: NpcLifestyle;
  goals: NpcGoal[];
  healthConditions: NpcHealthCondition[];
  education: NpcEducationState;
  career: NpcCareerState;
  finances: NpcFinanceState;
  lifeHistory: NpcLifeEvent[];

  // Parentage Lineage (Immutable biological & legal ties)
  biologicalFatherId?: string;
  biologicalMotherId?: string;
  adoptiveParentIds: string[];
  stepParentIds: string[];
  isAdopted: boolean;

  // Legacy UI Presentation Compatibility Metadata
  birthOrder?: 'older' | 'younger' | 'twin';
  originStory?: string;
  stageMet?: 'childhood' | 'middle_school' | 'high_school' | 'university' | 'adulthood';
  avatarEmoji?: string;
  legacyRoleLabel?: string;
  legacyRelationshipType?: RelationshipType;
  legacyCohortType?: 'classmate' | 'coworker' | 'friend' | 'best_friend';
  romanceUnlocked?: boolean;
  romanticStage?: RomanticStage;
  partnerStatsSnapshot?: PartnerStats;
  lastInteractedAge?: number;
  yearsNeglected?: number;

  // Turn Lifecycle Transient Flags
  bornThisYear?: boolean;
  processedTurnYear?: number;
  /** Set when population pressure demotes a social NPC to background, so they can be restored. */
  demotedByPopulationCap?: boolean;
  /**
   * Who this NPC will date. Missing values are derived from the world seed and id
   * and are not written back onto existing profiles.
   */
  romanticOrientation?: 'women' | 'men' | 'everyone';
}

export type RelationshipCategory =
  | 'parent_child'
  | 'sibling'
  | 'spouse'
  | 'former_spouse'
  | 'deceased_spouse'
  | 'dating'
  | 'fiance'
  | 'ex'
  | 'best_friend'
  | 'friend'
  | 'coworker'
  | 'classmate'
  | 'roommate'
  | 'mentor'
  | 'rival'
  | 'enemy';

export type ParticipantRoleLabel =
  | 'parent'
  | 'child'
  | 'sibling'
  | 'spouse'
  | 'former_spouse'
  | 'deceased_spouse'
  | 'dating'
  | 'fiance'
  | 'ex'
  | 'best_friend'
  | 'friend'
  | 'coworker'
  | 'classmate'
  | 'roommate'
  | 'mentor'
  | 'rival'
  | 'enemy';

export interface RelationshipEpisode {
  episodeId: string;
  category: RelationshipCategory;
  startYear: number;
  endYear?: number;
  endReason?:
    | 'breakup'
    | 'divorce'
    | 'reconciled'
    | 'marriage'
    | 'death'
    | 'drifted'
    | 'deepened'
    | 'conflict'
    | 'coupled'
    | 'engaged';
}

export interface RelationshipEdge {
  id: string; // Unique edge UUID (one canonical object per dyad)
  participantAId: string; // Canonical: lexicographically smaller ID
  participantBId: string; // Canonical: lexicographically larger ID
  category: RelationshipCategory;
  roleForA: ParticipantRoleLabel; // Role of A relative to B (e.g. 'parent' if A is parent of B)
  roleForB: ParticipantRoleLabel; // Role of B relative to A (e.g. 'child' if B is child of A)
  lineageRelation: LineageRelationType; // Distinguishes 'biological', 'adoptive', 'step', 'in_law', 'none'
  parentRoleForA?: ParentRoleType; // If roleForA === 'parent', specifies 'father' | 'mother' | 'parent'
  parentRoleForB?: ParentRoleType; // If roleForB === 'parent', specifies 'father' | 'mother' | 'parent'
  status: 'active' | 'former' | 'deceased';

  // Shared Dyadic Metrics (0 - 100)
  trust: number;
  affection: number;
  respect: number;
  romance: number;       // Applicable for adult romantic categories (0 - 100)
  compatibility: number; // Inherent dyadic compatibility (0 - 100)

  yearsTogether: number;
  hasPrenup?: boolean;
  engagementRingName?: string;
  engagementRingValue?: number;
  weddingVenue?: string;
  isPregnant?: boolean;
  /** Year a conception was recorded on this couple edge. */
  conceptionYear?: number;
  /** NPC carrying the pregnancy. The biological mother for a natural conception. */
  pregnantParentId?: string;
  /** Spouse edge that created a step parent-child edge. */
  stepSourceEdgeId?: string;
  lastInteractedYear: number;

  // Shared Episodic Relationship History (cannot diverge between A and B)
  episodes: RelationshipEpisode[];
}

export interface InheritanceBeneficiaryShare {
  beneficiaryId: string;
  relationshipToDeceased: 'spouse' | 'child' | 'grandchild_per_stirpes' | 'parent' | 'sibling';
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRateApplied: number;
  amountInSourceCurrency: number;
  amountAwardedInTargetCurrency: number;
}

export interface InheritanceRecord {
  id: string;
  deceasedNpcId: string;
  settlementYear: number;
  currency: string;
  /** Rounded cash + savings + real estate + business equity. Net worth is not used. */
  grossAssets: number;
  totalLiabilities: number;
  liabilitiesPaid: number;
  /** Liabilities that remain after assets are exhausted. Written off, not passed to heirs. */
  unpaidLiabilities: number;
  netDistributableEstate: number;
  distributions: InheritanceBeneficiaryShare[];
  escheatedToState: boolean;
  escheatedAmount: number;
  status: 'settled' | 'insolvent' | 'escheated';
}

export interface NpcMemory {
  id: string;
  dedupeKey: string; // `${ownerId}:${category}:${year}:${relatedId ?? 'none'}`
  ownerId: string;
  relatedCharacterId?: string;
  category:
    | 'family'
    | 'romance'
    | 'friendship'
    | 'career'
    | 'financial'
    | 'conflict'
    | 'kindness'
    | 'betrayal'
    | 'milestone';
  description: string;
  year: number;
  importance: number;      // 1 - 100
  emotionalImpact: number; // -100 to +100
}

export interface LifeUpdateEvent {
  id: string;
  dedupeKey: string; // `${npcId}:${category}:${year}:${referenceId ?? 'none'}`
  npcId: string;
  relatedNpcId?: string;
  year: number;
  category:
    | 'marriage'
    | 'birth'
    | 'death'
    | 'graduation'
    | 'promotion'
    | 'job_change'
    | 'divorce'
    | 'relocation'
    | 'inheritance'
    | 'retirement';
  priority: 'critical' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  isRead: boolean;
}

export interface PopulationConfig {
  activeNpcTarget: number;              // Configurable performance target (Default: 120)
  maxChildrenPerCouple: number;         // Default: 4
  allowMultipleBirths: boolean;         // Default: true (twins)
  elderMortalityAgeCutoff: number;      // Default: 75
  minAutonomousRomanceAge: number;      // Default: 18 (adult-only autonomous romance)
  minAutonomousReproductionAge: number; // Default: 18 (adult-only autonomous reproduction)
  maxFemaleBiologicalFertilityAge: number; // Default: 46
  minEngagementYears: number;           // Default: 2
  /** Completed dating years required before engagement. Missing means 2. */
  minDatingYears?: number;
  retirementTargetAge: number;          // Default: 60 (matches careerService.ts)
  allowRelocation: boolean;             // Default: true
}

export interface WorldSimulationState {
  schemaVersion: 2;
  worldSeed: number;
  simulationVersion: number;
  lastSimulatedYear: number;
  lastSimulationTurnId: string;
  /** Last year the NPC social pass completed. A repeat or earlier year is a no-op. */
  lastSocialSimYear?: number;
  /** Last year the NPC romance pass completed. A repeat or earlier year is a no-op. */
  lastRomanceSimYear?: number;
  /** Last year the NPC mortality pass completed. A repeat or earlier year is a no-op. */
  lastMortalitySimYear?: number;
  familyWealth: FamilyWealth;

  /**
   * Safeguard #1: Persistent mapping of legacy entity fingerprints -> canonical NPC UUIDs.
   * Ensures fallback IDs generated for legacy characters without explicit IDs remain stable
   * across subsequent loads and array reorderings.
   */
  legacyIdMappings: Record<string, string>;

  // Canonical Stores
  npcRegistry: Record<string, NpcProfile>;
  relationshipsById: Record<string, RelationshipEdge>;   // edgeId -> canonical RelationshipEdge
  relationshipIndex: Record<string, string[]>;           // characterId -> edgeId[] (derived index)
  inheritanceRecords: Record<string, InheritanceRecord>; // deceasedNpcId -> InheritanceRecord
  memories: Record<string, NpcMemory[]>;                 // npcId -> NpcMemory[]
  lifeUpdatesFeed: LifeUpdateEvent[];

  // Configurable Life & Population Controls
  populationConfig: PopulationConfig;
}

