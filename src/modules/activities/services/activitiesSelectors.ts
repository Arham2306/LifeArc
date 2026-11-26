import type { CharacterProfile, ChildProfile, PersonProfile } from '../../../types/game';
import { isPartnerProfile } from '../../relationships/services/relationshipService';
import {
  BELT_RANKS,
  DIET_CATALOG,
  MARTIAL_ARTS_CATALOG,
  MAX_MARTIAL_ARTS_SESSIONS_PER_YEAR,
  MINOR_FREE_CUTOFF_AGE,
  getMindBodyActionTemplate,
} from '../data/activitiesCatalog';
import { MAX_CLUBBING_PER_YEAR } from '../data/nightlifeLawsuitCatalog';
import type {
  ActiveAddiction,
  AddictionId,
  DietId,
  LicenseId,
  MartialArtBeltRank,
  MartialArtId,
  MartialArtProgress,
  MindBodyActionId,
  PendingLawsuitClaim,
  PlayerActivitiesState,
} from '../types';

const VALID_DIET_IDS = new Set<DietId>(DIET_CATALOG.map((item) => item.id));
const VALID_MARTIAL_ART_IDS = new Set<MartialArtId>(
  MARTIAL_ARTS_CATALOG.map((item) => item.id)
);
const VALID_LICENSE_IDS = new Set<LicenseId>(['drivers', 'boating', 'pilot']);
const VALID_ADDICTION_IDS = new Set<AddictionId>(['alcohol', 'gambling', 'substances']);
const VALID_CLAIM_SOURCES = new Set<PendingLawsuitClaim['source']>([
  'botched_surgery',
  'nightlife_assault',
  'defamation',
]);

function clampBeltRank(value: unknown): MartialArtBeltRank {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  const rounded = Math.max(0, Math.min(7, Math.floor(value)));
  return rounded as MartialArtBeltRank;
}

export function createEmptyActivitiesState(): PlayerActivitiesState {
  return {
    diet: 'standard',
    dietLastProgressedAge: null,
    gymMembershipActive: false,
    gymMembershipAge: null,
    martialArts: {},
    annualActionCounts: {},
    lastActionAge: null,
    licenses: {},
    lastDriversTestAge: null,
    lastVacationAge: null,
    lastEmigrationAge: null,
    plasticSurgeryCount: 0,
    addictions: [],
    lastRehabAge: null,
    pendingClaims: [],
  };
}

/**
 * Defensive normalizer for legacy/partial saves. Never mutates input.
 */
export function getSanitizedActivitiesState(
  character: Pick<CharacterProfile, 'activities'>
): PlayerActivitiesState {
  const raw = character.activities;
  if (!raw || typeof raw !== 'object') {
    return createEmptyActivitiesState();
  }

  const diet: DietId = VALID_DIET_IDS.has(raw.diet) ? raw.diet : 'standard';
  const martialArts: Partial<Record<MartialArtId, MartialArtProgress>> = {};
  if (raw.martialArts && typeof raw.martialArts === 'object') {
    for (const [key, entry] of Object.entries(raw.martialArts)) {
      if (!VALID_MARTIAL_ART_IDS.has(key as MartialArtId) || !entry || typeof entry !== 'object') {
        continue;
      }
      const discipline = key as MartialArtId;
      martialArts[discipline] = {
        discipline,
        beltRank: clampBeltRank(entry.beltRank),
        lastTrainedAge:
          typeof entry.lastTrainedAge === 'number' && Number.isFinite(entry.lastTrainedAge)
            ? entry.lastTrainedAge
            : null,
      };
    }
  }

  const annualActionCounts: Record<string, number> = {};
  if (raw.annualActionCounts && typeof raw.annualActionCounts === 'object') {
    for (const [key, count] of Object.entries(raw.annualActionCounts)) {
      if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
        annualActionCounts[key] = Math.floor(count);
      }
    }
  }

  const licenses: Partial<Record<LicenseId, { acquiredAtAge: number }>> = {};
  if (raw.licenses && typeof raw.licenses === 'object') {
    for (const [key, entry] of Object.entries(raw.licenses)) {
      if (
        VALID_LICENSE_IDS.has(key as LicenseId) &&
        entry &&
        typeof entry === 'object' &&
        typeof entry.acquiredAtAge === 'number' &&
        Number.isFinite(entry.acquiredAtAge)
      ) {
        licenses[key as LicenseId] = { acquiredAtAge: entry.acquiredAtAge };
      }
    }
  }

  return {
    diet,
    dietLastProgressedAge:
      typeof raw.dietLastProgressedAge === 'number' && Number.isFinite(raw.dietLastProgressedAge)
        ? raw.dietLastProgressedAge
        : null,
    gymMembershipActive: Boolean(raw.gymMembershipActive),
    gymMembershipAge:
      typeof raw.gymMembershipAge === 'number' && Number.isFinite(raw.gymMembershipAge)
        ? raw.gymMembershipAge
        : null,
    martialArts,
    annualActionCounts,
    lastActionAge:
      typeof raw.lastActionAge === 'number' && Number.isFinite(raw.lastActionAge)
        ? raw.lastActionAge
        : null,
    licenses,
    lastDriversTestAge:
      typeof raw.lastDriversTestAge === 'number' && Number.isFinite(raw.lastDriversTestAge)
        ? raw.lastDriversTestAge
        : null,
    lastVacationAge:
      typeof raw.lastVacationAge === 'number' && Number.isFinite(raw.lastVacationAge)
        ? raw.lastVacationAge
        : null,
    lastEmigrationAge:
      typeof raw.lastEmigrationAge === 'number' && Number.isFinite(raw.lastEmigrationAge)
        ? raw.lastEmigrationAge
        : null,
    plasticSurgeryCount:
      typeof raw.plasticSurgeryCount === 'number' && Number.isFinite(raw.plasticSurgeryCount)
        ? Math.max(0, Math.floor(raw.plasticSurgeryCount))
        : 0,
    addictions: Array.isArray(raw.addictions)
      ? raw.addictions
          .filter(
            (item): item is ActiveAddiction =>
              Boolean(item) &&
              typeof item === 'object' &&
              VALID_ADDICTION_IDS.has(item.id) &&
              typeof item.acquiredAtAge === 'number' &&
              Number.isFinite(item.acquiredAtAge)
          )
          .map((item) => ({
            id: item.id,
            severity:
              typeof item.severity === 'number' && Number.isFinite(item.severity)
                ? Math.max(1, Math.min(100, Math.round(item.severity)))
                : 35,
            acquiredAtAge: item.acquiredAtAge,
            lastProgressedAge:
              typeof item.lastProgressedAge === 'number' &&
              Number.isFinite(item.lastProgressedAge)
                ? item.lastProgressedAge
                : null,
          }))
      : [],
    lastRehabAge:
      typeof raw.lastRehabAge === 'number' && Number.isFinite(raw.lastRehabAge)
        ? raw.lastRehabAge
        : null,
    pendingClaims: Array.isArray(raw.pendingClaims)
      ? raw.pendingClaims.filter(
          (claim): claim is PendingLawsuitClaim =>
            Boolean(claim) &&
            typeof claim === 'object' &&
            typeof claim.id === 'string' &&
            claim.id.length > 0 &&
            VALID_CLAIM_SOURCES.has(claim.source) &&
            typeof claim.defendantName === 'string' &&
            typeof claim.summary === 'string' &&
            typeof claim.occurredAtAge === 'number' &&
            Number.isFinite(claim.occurredAtAge) &&
            typeof claim.expiresAtAge === 'number' &&
            Number.isFinite(claim.expiresAtAge) &&
            typeof claim.claimedDamages === 'number' &&
            Number.isFinite(claim.claimedDamages) &&
            claim.claimedDamages >= 0 &&
            typeof claim.resolved === 'boolean'
        )
      : [],
  };
}

/**
 * Minors under Age 16 receive parent sponsorship ($0 wallet fee) for
 * age-unlocked lessons, gym workouts, salon, spa, therapy, and diets.
 */
export function getEffectiveActivityFee(
  character: Pick<CharacterProfile, 'age'>,
  basePrice: number
): number {
  if (basePrice <= 0) return 0;
  if (character.age < MINOR_FREE_CUTOFF_AGE) return 0;
  return basePrice;
}

export function getEffectiveGymWorkoutFee(
  character: Pick<CharacterProfile, 'age' | 'activities'>,
  baseDropInFee: number
): number {
  if (character.age < MINOR_FREE_CUTOFF_AGE) return 0;
  const activities = getSanitizedActivitiesState(character);
  if (activities.gymMembershipActive) return 0;
  return baseDropInFee;
}

export function getActivityActionsUsedThisYear(
  character: Pick<CharacterProfile, 'age' | 'activities'>,
  actionId: MindBodyActionId
): number {
  const activities = getSanitizedActivitiesState(character);
  if (activities.lastActionAge !== character.age) {
    return 0;
  }
  return activities.annualActionCounts[actionId] ?? 0;
}

export function getRemainingActivityUses(
  character: Pick<CharacterProfile, 'age' | 'activities'>,
  actionId: MindBodyActionId
): number {
  const action = getMindBodyActionTemplate(actionId);
  if (!action) return 0;
  const used = getActivityActionsUsedThisYear(character, actionId);
  return Math.max(0, action.annualLimit - used);
}

export function getMartialArtsSessionsUsedThisYear(
  character: Pick<CharacterProfile, 'age' | 'activities'>
): number {
  const activities = getSanitizedActivitiesState(character);
  return Object.values(activities.martialArts).filter(
    (entry) => entry && entry.lastTrainedAge === character.age
  ).length;
}

export function getRemainingMartialArtsSessionsThisYear(
  character: Pick<CharacterProfile, 'age' | 'activities'>
): number {
  return Math.max(
    0,
    MAX_MARTIAL_ARTS_SESSIONS_PER_YEAR - getMartialArtsSessionsUsedThisYear(character)
  );
}

export function getHighestMartialArtBelt(
  character: Pick<CharacterProfile, 'activities'>
): {
  rank: MartialArtBeltRank;
  label: string;
  discipline: MartialArtId | null;
} {
  const activities = getSanitizedActivitiesState(character);
  let bestRank: MartialArtBeltRank = 0;
  let bestDiscipline: MartialArtId | null = null;

  for (const item of MARTIAL_ARTS_CATALOG) {
    const progress = activities.martialArts[item.id];
    if (progress && progress.beltRank > bestRank) {
      bestRank = progress.beltRank;
      bestDiscipline = item.id;
    }
  }

  return {
    rank: bestRank,
    label: BELT_RANKS[bestRank].label,
    discipline: bestDiscipline,
  };
}

/**
 * Permanent 0-100 self-defense rating derived from highest Martial Arts belt
 * rank (rank * 12, max 84 from Black Belt) plus +4 for each additional
 * discipline trained beyond the first.
 */
export function getSelfDefenseScore(
  character: Pick<CharacterProfile, 'activities'>
): number {
  const activities = getSanitizedActivitiesState(character);
  const trainedEntries = Object.values(activities.martialArts).filter(
    (entry): entry is MartialArtProgress => Boolean(entry && entry.beltRank > 0)
  );
  if (trainedEntries.length === 0) return 0;

  let highestRank = 0;
  for (const entry of trainedEntries) {
    if (entry.beltRank > highestRank) {
      highestRank = entry.beltRank;
    }
  }

  const additionalDisciplines = Math.max(0, trainedEntries.length - 1);
  return Math.min(100, highestRank * 12 + additionalDisciplines * 4);
}

export function hasLicense(
  character: Pick<CharacterProfile, 'activities'>,
  licenseId: LicenseId
): boolean {
  return Boolean(getSanitizedActivitiesState(character).licenses[licenseId]);
}

export function hasDriversLicense(character: Pick<CharacterProfile, 'activities'>): boolean {
  return hasLicense(character, 'drivers');
}

export function hasBoatingLicense(character: Pick<CharacterProfile, 'activities'>): boolean {
  return hasLicense(character, 'boating');
}

export function hasPilotLicense(character: Pick<CharacterProfile, 'activities'>): boolean {
  return hasLicense(character, 'pilot');
}

export function getActiveVacationCompanions(
  character: Pick<CharacterProfile, 'partner' | 'relationships' | 'children'>
): {
  partner: PersonProfile | null;
  children: ChildProfile[];
  totalCount: number;
} {
  const candidatePartner =
    character.partner ??
    (character.relationships || []).find((p) => isPartnerProfile(p)) ??
    null;
  const partner =
    candidatePartner && isPartnerProfile(candidatePartner)
      ? candidatePartner
      : null;
  const children = (character.children || []).filter((child) => child.isAlive);

  return {
    partner,
    children,
    totalCount: (partner ? 1 : 0) + children.length,
  };
}

export function getClubbingSessionsRemaining(
  character: Pick<CharacterProfile, 'age' | 'activities'>
): number {
  const activities = getSanitizedActivitiesState(character);
  const used =
    activities.lastActionAge === character.age
      ? (activities.annualActionCounts.go_clubbing ?? 0)
      : 0;
  return Math.max(0, MAX_CLUBBING_PER_YEAR - used);
}

export function getActiveAddictions(
  character: Pick<CharacterProfile, 'activities'>
): ActiveAddiction[] {
  return getSanitizedActivitiesState(character).addictions;
}

export function getOpenLawsuitClaims(
  character: Pick<CharacterProfile, 'age' | 'activities'>
): PendingLawsuitClaim[] {
  return getSanitizedActivitiesState(character).pendingClaims.filter(
    (claim) => !claim.resolved && claim.expiresAtAge >= character.age
  );
}

