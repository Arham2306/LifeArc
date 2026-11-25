import type { LifeEvent } from '../../types/game';

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
  // Phase 1A
  diet: DietId;
  dietLastProgressedAge: number | null;
  gymMembershipActive: boolean;
  gymMembershipAge: number | null;
  martialArts: Partial<Record<MartialArtId, MartialArtProgress>>;
  /** Annual per-action counts keyed by action id, reset when lastActionAge !== character.age */
  annualActionCounts: Record<string, number>;
  lastActionAge: number | null;

  // Phase 1B
  licenses: Partial<Record<LicenseId, { acquiredAtAge: number }>>;
  lastDriversTestAge: number | null;
  lastVacationAge: number | null;
  lastEmigrationAge: number | null;
  plasticSurgeryCount: number;

  // Phase 1C
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
