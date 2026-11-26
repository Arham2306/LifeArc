import type { LifeEvent, StatEffects } from '../../types/game';

export type DietId =
  | 'standard'
  | 'mediterranean'
  | 'high_protein'
  | 'vegetarian'
  | 'fast_food'
  | 'crash_diet';

export type MartialArtId =
  | 'karate'
  | 'judo'
  | 'jiu_jitsu'
  | 'muay_thai'
  | 'taekwondo';

// 0 = None, 1 = White, 2 = Yellow, 3 = Orange, 4 = Green, 5 = Blue, 6 = Brown, 7 = Black Belt
export type MartialArtBeltRank = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type MindBodyActionId =
  | 'walk_jog'
  | 'meditate'
  | 'public_library'
  | 'gym_workout'
  | 'salon_haircut'
  | 'spa_day'
  | 'therapy_session';

export type LicenseId = 'drivers' | 'boating' | 'pilot';

export type AddictionId = 'alcohol' | 'gambling' | 'substances';

export interface MartialArtProgress {
  discipline: MartialArtId;
  beltRank: MartialArtBeltRank;
  lastTrainedAge: number | null;
}

export interface ActiveAddiction {
  id: AddictionId;
  severity: number; // 1 - 100
  acquiredAtAge: number;
  lastProgressedAge: number | null;
}

export interface PendingLawsuitClaim {
  id: string;
  source: 'botched_surgery' | 'nightlife_assault' | 'defamation';
  defendantName: string;
  summary: string;
  occurredAtAge: number;
  expiresAtAge: number; // valid for 2 years
  claimedDamages: number;
  resolved: boolean;
}

export interface PlayerActivitiesState {
  // Mind & Body Core
  diet: DietId;
  dietLastProgressedAge: number | null;
  gymMembershipActive: boolean;
  gymMembershipAge: number | null;
  martialArts: Partial<Record<MartialArtId, MartialArtProgress>>;
  /** Annual per-action counts keyed by action id, reset when lastActionAge !== character.age */
  annualActionCounts: Record<string, number>;
  lastActionAge: number | null;

  // Surgery, Licenses & Travel
  licenses: Partial<Record<LicenseId, { acquiredAtAge: number }>>;
  lastDriversTestAge: number | null;
  lastVacationAge: number | null;
  lastEmigrationAge: number | null;
  plasticSurgeryCount: number;

  // Nightlife, Addictions & Lawsuits
  addictions: ActiveAddiction[];
  lastRehabAge: number | null;
  pendingClaims: PendingLawsuitClaim[];
}

export interface DietTemplate {
  id: DietId;
  name: string;
  description: string;
  annualCost: number;
  healthDelta: number;
  happinessDelta: number;
  looksDelta: number;
  karmaDelta: number;
}

export interface MartialArtTemplate {
  id: MartialArtId;
  name: string;
  origin: string;
  description: string;
}

export interface MindBodyActionTemplate {
  id: MindBodyActionId;
  name: string;
  description: string;
  category: 'Mind' | 'Body' | 'Self-Care';
  minAge: number;
  baseCost: number;
  annualLimit: number;
  effects: {
    health?: number;
    happiness?: number;
    smarts?: number;
    looks?: number;
    karma?: number;
  };
}

export interface ActivityActionResult {
  character: import('../../types/game').CharacterProfile;
  succeeded: boolean;
  title: string;
  summary: string;
  costPaid: number;
  appliedEffects?: StatEffects;
}

export interface ActivitiesYearProgress {
  activities: PlayerActivitiesState | undefined;
  cashSpent: number;
  healthDelta: number;
  happinessDelta: number;
  looksDelta: number;
  karmaDelta: number;
  events: LifeEvent[];
}

// Cosmetic Surgery, Licenses & Travel types
export type PlasticSurgeryId =
  | 'veneers'
  | 'rhinoplasty'
  | 'hair_transplant'
  | 'liposuction'
  | 'facelift';

export type SurgeryClinicTierId = 'budget' | 'board_certified' | 'celebrity';

export type VacationDestinationId =
  | 'coastal_road_trip'
  | 'tropical_resort'
  | 'european_capitals'
  | 'private_island';

export type VacationCabinClassId = 'economy' | 'business' | 'first_class';

export type VacationCompanionMode = 'solo' | 'partner' | 'family';

export interface PlasticSurgeryTemplate {
  id: PlasticSurgeryId;
  name: string;
  description: string;
  baseCost: number;
  looksGain: number;
  happinessGain: number;
}

export interface SurgeryClinicTier {
  id: SurgeryClinicTierId;
  name: string;
  priceMultiplier: number;
  botchChance: number;
  clinicLabel: string;
}

export interface LicenseTemplate {
  id: LicenseId;
  name: string;
  minAge: number;
  fee: number;
  minSmarts: number;
  description: string;
}

export interface DriversQuizQuestion {
  id: string;
  prompt: string;
  options: readonly [string, string, string];
  correctIndex: 0 | 1 | 2;
}

export interface VacationDestinationTemplate {
  id: VacationDestinationId;
  name: string;
  description: string;
  baseCost: number;
  healthGain: number;
  happinessGain: number;
  looksGain: number;
}

export interface VacationCabinClass {
  id: VacationCabinClassId;
  name: string;
  priceMultiplier: number;
  bonusHappiness: number;
}

export interface EmigrationDestinationTemplate {
  country: string;
  city: string;
  flag: string;
  movingCost: number;
  baseApproval: number;
  strictnessLabel: 'Moderate' | 'Strict';
}

// Nightlife, Addictions & Civil Lawsuits types
export type RehabTierId = 'community' | 'standard' | 'luxury';

export type CivilAttorneyTierId = 'public' | 'private' | 'elite';

export interface AddictionTemplate {
  id: AddictionId;
  name: string;
  temptationTitle: string;
  temptationPrompt: string;
  riskChance: number;
  baseAnnualCost: number;
  maxAnnualCost: number;
}

export interface RehabTierTemplate {
  id: RehabTierId;
  name: string;
  description: string;
  fee: number;
  recoveryChance: number;
  bonusHappiness: number;
  bonusKarma: number;
}

export interface CivilAttorneyTierTemplate {
  id: CivilAttorneyTierId;
  name: string;
  description: string;
  fee: number;
  winChance: number;
}

export interface ViceTemptationOffer {
  addictionId: AddictionId;
  title: string;
  prompt: string;
  riskChance: number;
}

export interface ClubbingActionResult extends ActivityActionResult {
  temptation?: ViceTemptationOffer;
}


