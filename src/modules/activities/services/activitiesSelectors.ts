import type { CharacterProfile } from '../../../types/game';
import {
  BELT_RANKS,
  DIET_CATALOG,
  MARTIAL_ARTS_CATALOG,
  MAX_MARTIAL_ARTS_SESSIONS_PER_YEAR,
  MINOR_FREE_CUTOFF_AGE,
  getMindBodyActionTemplate,
} from '../data/activitiesCatalog';
import type {
  DietId,
  MartialArtBeltRank,
  MartialArtId,
  MartialArtProgress,
  MindBodyActionId,
  PlayerActivitiesState,
} from '../types';

const VALID_DIET_IDS = new Set<DietId>(DIET_CATALOG.map((item) => item.id));
const VALID_MARTIAL_ART_IDS = new Set<MartialArtId>(
  MARTIAL_ARTS_CATALOG.map((item) => item.id)
);

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
    licenses: raw.licenses && typeof raw.licenses === 'object' ? { ...raw.licenses } : {},
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
    addictions: Array.isArray(raw.addictions) ? raw.addictions : [],
    lastRehabAge:
      typeof raw.lastRehabAge === 'number' && Number.isFinite(raw.lastRehabAge)
        ? raw.lastRehabAge
        : null,
    pendingClaims: Array.isArray(raw.pendingClaims) ? raw.pendingClaims : [],
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
