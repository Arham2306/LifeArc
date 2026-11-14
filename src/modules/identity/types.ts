import type { FamilyWealth, LifeEventCategory } from '../../types/game';
import type { BusinessSector } from '../business/types';
import type { CareerField, CareerHistoryEntry, EmploymentType } from '../career/types';
import type { LegalJurisdiction, OffenseClass, PrisonSecurityLevel } from '../crime/types';
import type { DisciplineRecord, SchoolHistoryEntry, SchoolStage } from '../education/types';

export type IdentityLifeStage = 'childhood' | 'teens' | 'adulthood' | 'middle_age' | 'old_age';

export type IdentityEmploymentStatus =
  | 'deceased'
  | 'incarcerated'
  | 'retired'
  | 'self_employed'
  | 'employed'
  | 'student'
  | 'infant'
  | 'unemployed';

export interface IdentityBirthplaceSummary {
  city: string | null;
  country: string | null;
  flag: string | null;
}

export interface IdentityCoreSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: 'male' | 'female' | 'non-binary' | 'unknown';
  age: number;
  ageValid: boolean;
  birthYear: number | null;
  birthplace: IdentityBirthplaceSummary;
  lifeStage: IdentityLifeStage | null;
  occupation: string;
  isAlive: boolean;
  causeOfDeath: string | null;
  familyWealth: FamilyWealth | null;
}

export interface IdentityFinancialSummary {
  cash: number;
  bankBalance: number;
  personalNetWorth: number;
  realEstateCount: number;
  realEstateValue: number;
  realEstateMortgageDebt: number;
  activeBusinessValuation: number | null;
  activeBusinessOwnershipPct: number | null;
  activeBusinessOwnershipStakeValue: number | null;
  hasMalformedNumericFields: boolean;
}

export interface IdentityUniversitySummary {
  universityName: string;
  majorName: string;
  degreeTitle: string;
  year: number;
  totalYears: number;
}

export interface IdentityProfessionalSchoolSummary {
  schoolName: string;
  programName: string;
  degreeAwarded: string;
  year: number;
  totalYears: number;
}

export interface IdentityEducationSummary {
  hasData: boolean;
  currentStage: SchoolStage | 'unavailable';
  schoolName: string | null;
  gradeLevelLabel: string | null;
  grades: number | null;
  diplomas: string[];
  history: SchoolHistoryEntry[];
  disciplines: DisciplineRecord[];
  activeUniversity: IdentityUniversitySummary | null;
  activeProfessionalSchool: IdentityProfessionalSchoolSummary | null;
  studentDebt: number;
}

export interface IdentityActiveJobSummary {
  jobId: string;
  title: string;
  companyName: string;
  field: CareerField;
  type: EmploymentType;
  salary: number;
  yearsInJob: number;
  performance: number;
  hiredAge: number;
}

export interface IdentityCareerSummary {
  hasData: boolean;
  employmentStatus: IdentityEmploymentStatus;
  occupation: string;
  currentJob: IdentityActiveJobSummary | null;
  history: CareerHistoryEntry[];
  totalCareerEarnings: number | null;
}

export interface IdentityActiveBusinessSummary {
  id: string;
  name: string;
  slogan: string | null;
  sector: BusinessSector;
  foundedYear: number;
  foundedAge: number;
  valuation: number;
  equityPct: number;
  ownershipStakeValue: number;
  treasury: number;
  locationsCount: number;
  yearsInOperation: number;
  lifetimeRevenue: number;
  lifetimeProfit: number;
  isPubliclyTraded: boolean;
  tickerSymbol: string | null;
}

export interface TimelineDerivedBusinessExit {
  eventId: string;
  exitType: 'acquisition' | 'liquidation';
  businessName: string;
  age: number;
  year: number;
  title: string;
  message: string;
  source: 'timeline_derived';
}

export interface IdentityBusinessSummary {
  hasAnyRecord: boolean;
  activeBusiness: IdentityActiveBusinessSummary | null;
  timelineDerivedExits: TimelineDerivedBusinessExit[];
}

export interface IdentityCustodyStatus {
  isIncarcerated: boolean;
  facilityName: string | null;
  securityLevel: PrisonSecurityLevel | null;
  chargeTitle: string | null;
  yearsRemaining: number | null;
  yearsServed: number | null;
}

export interface IdentityProbationStatus {
  isOnProbation: boolean;
  chargeTitle: string | null;
  jurisdiction: LegalJurisdiction | null;
  yearsRemaining: number | null;
}

export interface IdentityPendingCaseSummary {
  title: string;
  offenseClass: OffenseClass;
  jurisdiction: LegalJurisdiction;
  arrestedAtAge: number;
  arrestedAtYear: number;
}

export interface IdentityLegalObligations {
  hasPendingCourtCase: boolean;
  pendingCase: IdentityPendingCaseSummary | null;
  unpaidFines: number;
}

export interface IdentityPublicConvictionRecord {
  id: string;
  title: string;
  offenseClass: OffenseClass;
  age: number;
  year: number;
  outcome: 'fined' | 'probation' | 'imprisoned';
  sentenceYears: number;
  fineImposed: number;
}

export interface IdentityUnsealedJuvenileAdjudication {
  id: string;
  title: string;
  offenseClass: OffenseClass;
  age: number;
  year: number;
  outcome: 'fined' | 'probation' | 'imprisoned';
  sentenceYears: number;
  fineImposed: number;
}

export interface IdentityNonConvictionDisposition {
  id: string;
  title: string;
  jurisdiction: LegalJurisdiction;
  age: number;
  year: number;
  outcome: 'dismissed' | 'acquitted';
  isConviction: false;
}

export interface IdentityLegalStandingSummary {
  /** True only when there are neither active adult convictions nor unsealed juvenile adjudications. */
  hasNoActivePublicCriminalRecord: boolean;
  hasActivePublicCriminalRecord: boolean;
  custody: IdentityCustodyStatus;
  probation: IdentityProbationStatus;
  obligations: IdentityLegalObligations;
  activeAdultConvictions: IdentityPublicConvictionRecord[];
  unsealedJuvenileAdjudications: IdentityUnsealedJuvenileAdjudication[];
  /** True when sealed juvenile records exist; underlying offense details are never exposed. */
  hasSealedJuvenileRecords: boolean;
  /** Unsealed juvenile warnings only; never represented as arrests or convictions. */
  juvenileWarningCount: number;
  /** Unsealed, non-expunged dismissed/acquitted dispositions; never represented as convictions. */
  nonConvictionDispositions: IdentityNonConvictionDisposition[];
}

export interface IdentityTimelineHighlight {
  id: string;
  age: number;
  year: number;
  category: LifeEventCategory;
  title: string | null;
  message: string;
  icon: string | null;
}

export interface IdentityTimelineSummary {
  totalEventsScanned: number;
  highlights: IdentityTimelineHighlight[];
}

export interface IdentityHeritageReadModel {
  core: IdentityCoreSummary;
  financial: IdentityFinancialSummary;
  education: IdentityEducationSummary;
  career: IdentityCareerSummary;
  business: IdentityBusinessSummary;
  legal: IdentityLegalStandingSummary;
  timeline: IdentityTimelineSummary;
}

// ============================================================================
// Milestone 12.2 — Family Graph & Recorded Estate Read-Model Types
// ============================================================================

export type FamilyRelationKind =
  | 'parent'
  | 'sibling'
  | 'partner'
  | 'former_spouse'
  | 'deceased_spouse'
  | 'ex_partner'
  | 'child'
  | 'grandchild'
  | 'niece_nephew'
  | 'sibling_in_law'
  | 'child_in_law'
  | 'parent_in_law';

export type FamilyGenerationOffset = 1 | 0 | -1 | -2;

export type FamilyDataSource = 'canonical' | 'legacy' | 'reconciled';

export interface FamilyMemberEducationDetails {
  currentStage: string;
  degreeEarned: string | null;
  fieldOfStudy: string | null;
}

export interface FamilyMemberCareerDetails {
  title: string | null;
  companyName: string | null;
  occupation: string | null;
  isRetired: boolean;
}

export interface FamilyMemberMaritalDetails {
  romanticStage: string | null;
  yearsTogether: number | null;
  hasPrenup: boolean | null;
  weddingVenue: string | null;
}

export interface FamilyMemberLifeHistoryItem {
  id: string;
  year: number;
  age: number;
  type: string;
  title: string;
  description: string;
}

export interface IdentityFamilyMember {
  id: string;
  hasCanonicalId: boolean;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: 'male' | 'female' | 'non-binary' | 'unknown';
  relationKind: FamilyRelationKind;
  relationLabel: string;
  lineageRelation: 'biological' | 'adoptive' | 'step' | 'in_law' | 'none';
  generationOffset: FamilyGenerationOffset;
  traversalDepth: 1 | 2;
  source: FamilyDataSource;
  isAlive: boolean;
  isCurrent: boolean;
  isFormerRelationship: boolean;
  age: number | null;
  birthYear: number | null;
  deathYear: number | null;
  causeOfDeath: string | null;
  occupation: string | null;
  birthOrder: 'older' | 'younger' | 'twin' | null;
  education: FamilyMemberEducationDetails | null;
  career: FamilyMemberCareerDetails | null;
  maritalDetails: FamilyMemberMaritalDetails | null;
  lifeHistoryHighlights: FamilyMemberLifeHistoryItem[];
}

export interface IdentityPetMemorialSummary {
  id: string;
  name: string;
  species: 'pet_dog' | 'pet_cat' | 'pet_rabbit';
  petAge: number;
  adoptedAtAge: number;
  closedAtAge: number | null;
  closingLine: string;
}

export interface IdentityFamilyGraphSummary {
  canonicalStateUsed: boolean;
  parents: IdentityFamilyMember[];
  siblings: IdentityFamilyMember[];
  currentPartner: IdentityFamilyMember | null;
  formerPartners: IdentityFamilyMember[];
  children: IdentityFamilyMember[];
  grandchildren: IdentityFamilyMember[];
  niecesAndNephews: IdentityFamilyMember[];
  extendedFamily: IdentityFamilyMember[];
  allMembers: IdentityFamilyMember[];
  petMemorials: IdentityPetMemorialSummary[];
}

export type RecordedEstateStatus = 'settled' | 'insolvent' | 'escheated';

export interface RecordedEstateShareItem {
  beneficiaryId: string;
  beneficiaryName: string | null;
  isPlayer: boolean;
  relationshipToDeceased: string | null;
  sourceCurrency: string | null;
  targetCurrency: string | null;
  amountInSourceCurrency: number | null;
  amountAwardedInTargetCurrency: number | null;
}

export interface IdentityRecordedEstateRecord {
  recordId: string;
  deceasedOwnerId: string;
  deceasedOwnerName: string;
  relationshipToPlayerKind: FamilyRelationKind;
  relationshipToPlayerLabel: string;
  settlementYear: number | null;
  currency: string | null;
  status: RecordedEstateStatus;
  grossAssets: number | null;
  totalLiabilities: number | null;
  liabilitiesPaid: number | null;
  unpaidLiabilities: number | null;
  netDistributableEstate: number | null;
  escheatedToState: boolean;
  escheatedAmount: number | null;
  distributions: RecordedEstateShareItem[];
  playerDistributions: RecordedEstateShareItem[];
  hasMalformedFields: boolean;
}

export interface IdentityRecordedEstatesSummary {
  canonicalStateAvailable: boolean;
  records: IdentityRecordedEstateRecord[];
  omittedRecordCount: number;
}
