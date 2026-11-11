import type { EducationProfile } from '../modules/education/types'
import type { PlayerCareerState } from '../modules/career/types'
import type { ActiveBusinessProfile } from '../modules/business/types'
import type { PlayerAssetPortfolio } from '../modules/assets/types'
import type { PlayerLifestyle } from '../modules/lifestyle/types'
import type { PlayerPets } from '../modules/pets/types'
import type { PlayerHealthcare } from '../modules/healthcare/types'
import type { WorldSimulationState } from '../modules/autonomy/types'

export interface CharacterStats {
  health: number;      // 0 - 100
  happiness: number;   // 0 - 100
  smarts: number;      // 0 - 100
  looks: number;       // 0 - 100
  karma: number;       // 0 - 100
}

export type StatKey = keyof CharacterStats;

export type FamilyWealth = 'struggling' | 'modest' | 'comfortable' | 'wealthy';

export interface ParentProfile {
  id: string;
  role: 'father' | 'mother';
  firstName: string;
  lastName: string;
  age: number;
  occupation: string;
  isAlive: boolean;
  /** Player's relationship with this parent (0 - 100). */
  relationship: number;
  /** How generous this parent is when asked for things (0 - 100). */
  generosity: number;
  /** Optional lineage distinction (defaults to 'biological'). */
  lineageRelation?: 'biological' | 'adoptive' | 'step';
}

export interface ParentsInfo {
  father: ParentProfile;
  mother: ParentProfile;
  wealth: FamilyWealth;
}

export interface SiblingProfile {
  id: string;
  role: 'brother' | 'sister';
  firstName: string;
  lastName: string;
  age: number;
  gender: 'male' | 'female';
  relationship: number; // 0 - 100
  occupation: string;
  isAlive: boolean;
  birthOrder: 'older' | 'younger' | 'twin';
}

/** A set of changes to apply to a character. All fields are optional deltas. */
export type StatEffects = Partial<Record<StatKey, number>> & {
  cash?: number;
  /** Changes relationship with both parents. */
  parents?: number;
  /** Changes relationship with father specifically. */
  fatherRelationship?: number;
  /** Changes relationship with mother specifically. */
  motherRelationship?: number;
  /** Academic grades percentage (0 - 100). */
  grades?: number;
  /** School popularity score (0 - 100). */
  popularity?: number;
  /** Current job performance delta (-100 to +100). Clamped to 0 - 100 on current job. */
  jobPerformance?: number;
  /** Active business brand reputation delta (-100 to +100). */
  businessBrand?: number;
  /** Active business workforce morale delta (-100 to +100). */
  businessMorale?: number;
  /** Active business product quality delta (-100 to +100). */
  businessQuality?: number;
  /** Active business corporate treasury cash delta ($). */
  businessTreasury?: number;
};

export type RelationshipType =
  | 'friend'
  | 'best_friend'
  | 'crush'
  | 'dating'
  | 'partner'
  | 'spouse'
  | 'ex'
  | 'rival'
  | 'enemy'
  | 'classmate'
  | 'roommate'
  | 'mentor'
  | 'coworker';

export type RomanticStage =
  | 'none'
  | 'crush'
  | 'flirting'
  | 'dating'
  | 'engaged'
  | 'married'
  | 'ex'
  | 'widowed';

export interface PartnerStats {
  craziness: number; // 0 - 100 (drama, jealousy)
  generosity: number; // 0 - 100 (gift reaction, allowance)
  looks: number; // 0 - 100
  smarts: number; // 0 - 100
  fertility: number; // 0 - 100
  occupation?: string;
  annualIncome?: number;
  hasPrenup?: boolean;
  yearsTogether?: number;
  engagementRing?: {
    name: string;
    value: number;
  };
  weddingVenue?: string;
  isPregnant?: boolean;
}

export interface ChildProfile {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'male' | 'female';
  relationship: number; // 0 - 100
  smarts: number;
  looks: number;
  happiness: number;
  health: number;
  isAdopted: boolean;
  occupation: string; // "Infant", "Elementary School Student", etc.
  isAlive: boolean;
}

export interface PersonProfile {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'non-binary';
  age: number;
  role: string;
  relationshipType: RelationshipType;
  /** Player's relationship score with this person (0 - 100). */
  relationship: number;
  originStory: string;
  stageMet: 'childhood' | 'middle_school' | 'high_school' | 'university' | 'adulthood';
  avatarEmoji?: string;

  // Module 7: Romance & Dating Dual-Meter & Partner Attributes
  romanceUnlocked?: boolean;
  romanceMeter?: number; // 0 - 100 (Romantic Chemistry & Love)
  romanticStage?: RomanticStage;
  partnerStats?: PartnerStats;

  // Cohort & Lifecycle Tracking
  cohortType?: 'classmate' | 'coworker' | 'friend' | 'best_friend';
  lastInteractedAge?: number;
  yearsNeglected?: number;
  personalityArchetype?: 'class_clown' | 'studious' | 'popular' | 'rebel' | 'quiet' | 'athletic';
}

export interface CharacterProfile {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'non-binary';
  age: number;
  birthYear: number;
  country: string;
  flag?: string;
  city: string;
  occupation: string;
  cash: number;
  bankBalance: number;
  netWorth: number;
  isAlive: boolean;
  causeOfDeath?: string;
  stats: CharacterStats;
  parents: ParentsInfo;
  siblings?: SiblingProfile[];
  education: EducationProfile;
  career: PlayerCareerState;
  business?: ActiveBusinessProfile | null;
  /** Personally owned residential property. Absent on lives started before Module 8. */
  assets?: PlayerAssetPortfolio;
  /** Books, equipment, and hobbies. Absent until the first lifestyle purchase. */
  lifestyle?: PlayerLifestyle;
  /** Shelter pets and the ones you still remember. Absent until the first adoption. */
  pets?: PlayerPets;
  /** Doctor visits and named concerns. Absent until the first visit or the first concern. */
  healthcare?: PlayerHealthcare;
  relationships: PersonProfile[];
  /** Active primary romantic partner (dating / engaged / married) */
  partner?: PersonProfile | null;
  /** Past lovers and ex-spouses */
  exPartners?: PersonProfile[];
  /** Biological and adopted children */
  children?: ChildProfile[];
  /** Pregnancy tracking */
  isPregnant?: boolean;
  pregnancyPartnerId?: string;
  datingPreference?: 'women' | 'men' | 'everyone';
  /** Temporary payload when a baby is born on age up, awaiting player naming */
  newbornAnnouncement?: ChildProfile;
  /** Track interactive social actions performed on people this year: personId -> actionType[] */
  yearlySocialActions?: Record<string, string[]>;
  timeline: LifeEvent[];
  /** Ids of one-time interactive events this character has already experienced. */
  seenEventIds: string[];
  /** Canonical NPC Autonomy Engine world state (Schema Version 2). */
  worldState?: WorldSimulationState;
}

export type LifeEventCategory =
  | 'birth'
  | 'childhood'
  | 'education'
  | 'career'
  | 'business'
  | 'health'
  | 'relationship'
  | 'social'
  | 'money'
  | 'misfortune'
  | 'milestone';

export interface LifeEvent {
  id: string;
  age: number;
  year: number;
  title?: string;
  message: string;
  category: LifeEventCategory;
  icon?: string;
}
