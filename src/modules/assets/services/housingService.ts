import type { CharacterProfile, LifeEvent } from '../../../types/game';
import { createId } from '../../../utils/id';
import type {
  HousingArrangement,
  HousingNoticeKind,
  HousingStatus,
  PlayerHousingState,
} from '../types';
import { validProperties } from './assetService';

export const DEFAULT_MOVE_OUT_DEADLINE_AGE = 21;
export const LEGACY_ADULT_GRACE_OFFSET_YEARS = 4;
export const HOMELESSNESS_DEATH_CAUSE = 'Succumbed to prolonged homelessness and exposure';

const VALID_ARRANGEMENTS: ReadonlySet<HousingArrangement> = new Set([
  'with_parents',
  'owned_property',
  'rented_accommodation',
  'university_accommodation',
  'unhoused',
]);

const VALID_NOTICES: ReadonlySet<HousingNoticeKind> = new Set([
  'age18_independence',
  'age20_final_warning',
  'age21_moved_out',
]);

export interface HousingYearOptions {
  /** True if the year just lived (character.age -> nextAge) was spent incarcerated. */
  isIncarceratedForYear?: boolean;
}

export interface HousingYearProgress {
  housing: PlayerHousingState;
  healthDelta: number;
  happinessDelta: number;
  events: LifeEvent[];
}

export interface HousingSummary {
  arrangement: HousingArrangement;
  status: HousingStatus;
  moveOutDeadlineAge: number;
  yearsUnhoused: number;
  movedOutAtAge: number | null;
  yearsUntilDeadline: number;
  isInGraceWindow: boolean;
  pendingNotice: HousingNoticeKind | null;
  ownedHomeCount: number;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function createHousingEvent(
  age: number,
  birthYear: number,
  title: string,
  message: string,
  icon: string,
  category: LifeEvent['category']
): LifeEvent {
  return {
    id: createId(),
    age,
    year: (finiteNumber(birthYear) ? Math.trunc(birthYear) : 2026) + age,
    title,
    message,
    category,
    icon,
  };
}

/**
 * Derives coarse HousingStatus purely from canonical HousingArrangement so both
 * concepts cannot diverge.
 */
export function deriveHousingStatus(arrangement: HousingArrangement): HousingStatus {
  if (arrangement === 'with_parents') return 'with_parents';
  if (arrangement === 'unhoused') return 'unhoused';
  return 'housed';
}

/**
 * Resolves whether the character currently holds any recognized independent
 * housing arrangement. Enrolling in university or professional school alone
 * never satisfies independent housing.
 */
export function resolveActiveIndependentArrangement(
  character: CharacterProfile,
  existingHousing?: PlayerHousingState | null
): HousingArrangement | null {
  if (validProperties(character).length > 0) {
    return 'owned_property';
  }

  // Future hook points for explicit lease / campus housing providers.
  if (
    existingHousing?.arrangement === 'rented_accommodation' ||
    existingHousing?.arrangement === 'university_accommodation'
  ) {
    return existingHousing.arrangement;
  }

  return null;
}

export function hasIndependentHousing(character: CharacterProfile): boolean {
  return resolveActiveIndependentArrangement(character, character.housing) !== null;
}

export function createInitialHousingState(): PlayerHousingState {
  return {
    arrangement: 'with_parents',
    moveOutDeadlineAge: DEFAULT_MOVE_OUT_DEADLINE_AGE,
    yearsUnhoused: 0,
    age18PromptShown: false,
    age19ReminderLogged: false,
    age20WarningShown: false,
    movedOutPromptShown: false,
    pendingNotice: null,
  };
}

function buildLegacyBaselineHousing(
  character: CharacterProfile,
  options?: { queueAge18NoticeImmediately?: boolean }
): PlayerHousingState {
  const safeAge = finiteNumber(character.age) ? Math.max(0, Math.floor(character.age)) : 0;
  const independent = resolveActiveIndependentArrangement(character, undefined);

  if (independent !== null) {
    return {
      arrangement: independent,
      moveOutDeadlineAge: DEFAULT_MOVE_OUT_DEADLINE_AGE,
      yearsUnhoused: 0,
      age18PromptShown: safeAge >= 18,
      age19ReminderLogged: safeAge >= 19,
      age20WarningShown: safeAge >= 20,
      movedOutPromptShown: safeAge >= DEFAULT_MOVE_OUT_DEADLINE_AGE,
      pendingNotice: null,
    };
  }

  if (safeAge < 18) {
    return createInitialHousingState();
  }

  if (safeAge === 18) {
    return {
      arrangement: 'with_parents',
      moveOutDeadlineAge: DEFAULT_MOVE_OUT_DEADLINE_AGE,
      yearsUnhoused: 0,
      age18PromptShown: Boolean(options?.queueAge18NoticeImmediately),
      age19ReminderLogged: false,
      age20WarningShown: false,
      movedOutPromptShown: false,
      pendingNotice: options?.queueAge18NoticeImmediately ? 'age18_independence' : null,
    };
  }

  // Legacy adults aged 19+ without a persisted housing slice receive a 3-year grace
  // window (move-out deadline at age + 4, final warning at age + 3) and zero
  // retroactive Age 18/19 notifications or surprise homelessness penalties.
  return {
    arrangement: 'with_parents',
    moveOutDeadlineAge: safeAge + LEGACY_ADULT_GRACE_OFFSET_YEARS,
    yearsUnhoused: 0,
    age18PromptShown: true,
    age19ReminderLogged: true,
    age20WarningShown: false,
    movedOutPromptShown: false,
    pendingNotice: null,
  };
}

/**
 * Sanitizes an existing PlayerHousingState or computes a safe baseline from a
 * legacy character without mutating read-only inputs.
 */
export function sanitizeOrInitializeHousingState(character: CharacterProfile): PlayerHousingState {
  const raw = character.housing;
  if (!raw || typeof raw !== 'object') {
    return buildLegacyBaselineHousing(character, { queueAge18NoticeImmediately: false });
  }

  const independent = resolveActiveIndependentArrangement(character, raw);
  const rawArrangement = VALID_ARRANGEMENTS.has(raw.arrangement)
    ? raw.arrangement
    : 'with_parents';

  let arrangement: HousingArrangement;
  if (independent !== null) {
    arrangement = independent;
  } else if (rawArrangement === 'owned_property') {
    const safeAge = finiteNumber(character.age) ? Math.floor(character.age) : 0;
    const rawDeadline = finiteNumber(raw.moveOutDeadlineAge)
      ? Math.max(18, Math.trunc(raw.moveOutDeadlineAge))
      : DEFAULT_MOVE_OUT_DEADLINE_AGE;
    const rawMovedOutAge = finiteNumber(raw.movedOutAtAge)
      ? Math.max(18, Math.trunc(raw.movedOutAtAge))
      : undefined;
    arrangement =
      safeAge >= rawDeadline || rawMovedOutAge !== undefined ? 'unhoused' : 'with_parents';
  } else {
    arrangement = rawArrangement;
  }

  const moveOutDeadlineAge = finiteNumber(raw.moveOutDeadlineAge)
    ? Math.max(18, Math.trunc(raw.moveOutDeadlineAge))
    : DEFAULT_MOVE_OUT_DEADLINE_AGE;

  const yearsUnhoused =
    arrangement === 'unhoused' && finiteNumber(raw.yearsUnhoused)
      ? Math.max(0, Math.trunc(raw.yearsUnhoused))
      : 0;

  const movedOutAtAge = finiteNumber(raw.movedOutAtAge)
    ? Math.max(0, Math.trunc(raw.movedOutAtAge))
    : undefined;

  const lastProgressedAge = finiteNumber(raw.lastProgressedAge)
    ? Math.max(0, Math.trunc(raw.lastProgressedAge))
    : undefined;

  const pendingNotice =
    independent === null && raw.pendingNotice && VALID_NOTICES.has(raw.pendingNotice)
      ? raw.pendingNotice
      : null;

  return {
    arrangement,
    moveOutDeadlineAge,
    ...(lastProgressedAge !== undefined ? { lastProgressedAge } : {}),
    yearsUnhoused,
    ...(movedOutAtAge !== undefined ? { movedOutAtAge } : {}),
    age18PromptShown: Boolean(raw.age18PromptShown),
    age19ReminderLogged: Boolean(raw.age19ReminderLogged),
    age20WarningShown: Boolean(raw.age20WarningShown),
    movedOutPromptShown: Boolean(raw.movedOutPromptShown),
    pendingNotice,
  };
}

/**
 * Normalizes legacy saves when loaded or hydrated into interactive App state.
 * In particular, ensures an existing Age 18 character (without housing state or
 * owned homes) receives the one-time Age 18 independence notice immediately rather
 * than skipping straight to Age 19 on their next Age Up.
 */
export function hydrateHousingStateOnLoad(character: CharacterProfile): CharacterProfile {
  if (character.housing !== undefined) {
    return character;
  }
  const initialized = buildLegacyBaselineHousing(character, {
    queueAge18NoticeImmediately: true,
  });
  return {
    ...character,
    housing: initialized,
  };
}

export function getHousingStatus(character: CharacterProfile): HousingStatus {
  const sanitized = sanitizeOrInitializeHousingState(character);
  return deriveHousingStatus(sanitized.arrangement);
}

export function getPendingHousingNotice(character: CharacterProfile): HousingNoticeKind | null {
  if (!character.isAlive) return null;
  if (!character.housing) return null;
  return sanitizeOrInitializeHousingState(character).pendingNotice ?? null;
}

export function getHousingSummary(character: CharacterProfile): HousingSummary {
  const housing = sanitizeOrInitializeHousingState(character);
  const status = deriveHousingStatus(housing.arrangement);
  const safeAge = finiteNumber(character.age) ? Math.max(0, Math.floor(character.age)) : 0;
  const yearsUntilDeadline = Math.max(0, housing.moveOutDeadlineAge - safeAge);

  return {
    arrangement: housing.arrangement,
    status,
    moveOutDeadlineAge: housing.moveOutDeadlineAge,
    yearsUnhoused: housing.yearsUnhoused,
    movedOutAtAge: housing.movedOutAtAge ?? null,
    yearsUntilDeadline,
    isInGraceWindow:
      status === 'with_parents' && safeAge >= 18 && safeAge < housing.moveOutDeadlineAge,
    pendingNotice: housing.pendingNotice ?? null,
    ownedHomeCount: validProperties(character).length,
  };
}

export type PostAgeUpModalStep =
  | 'death'
  | 'baby'
  | 'school'
  | 'admissions'
  | 'housing'
  | 'fiscal'
  | 'event';

export interface PostAgeUpQueueFlags {
  isDeathOpen: boolean;
  hasBabyNotice: boolean;
  hasSchoolNotice: boolean;
  isAdmissionsOpen: boolean;
  hasHousingNotice: boolean;
  hasFiscalReport: boolean;
  hasPendingEvent: boolean;
  isCourtBlocking: boolean;
}

/**
 * Resolves at most one active post-Age-Up modal step without discarding
 * downstream queued notifications or overlapping admissions modals.
 */
export function resolvePostAgeUpModalStep(
  flags: PostAgeUpQueueFlags
): PostAgeUpModalStep | null {
  if (flags.isDeathOpen) return 'death';
  if (flags.hasBabyNotice) return 'baby';
  if (flags.hasSchoolNotice) return 'school';
  if (flags.isAdmissionsOpen) return 'admissions';
  if (flags.isCourtBlocking) return null;
  if (flags.hasHousingNotice) return 'housing';
  if (flags.hasFiscalReport) return 'fiscal';
  if (flags.hasPendingEvent) return 'event';
  return null;
}

export function markHousingNoticeAcknowledged(character: CharacterProfile): CharacterProfile {
  const sanitized = sanitizeOrInitializeHousingState(character);
  return {
    ...character,
    housing: {
      ...sanitized,
      pendingNotice: null,
    },
  };
}

export function getUnhousedPenalties(yearsUnhousedAfterIncrement: number): {
  healthDelta: number;
  happinessDelta: number;
} {
  if (yearsUnhousedAfterIncrement <= 1) {
    return { healthDelta: -10, happinessDelta: -15 };
  }
  if (yearsUnhousedAfterIncrement === 2) {
    return { healthDelta: -12, happinessDelta: -18 };
  }
  return { healthDelta: -15, happinessDelta: -20 };
}

/**
 * Transitions housing immediately when a valid property purchase succeeds.
 * Stops future homelessness penalties and clears pending housing modals without
 * restoring already-lost Health or Happiness.
 */
export function applyHousingOnPropertyPurchased(character: CharacterProfile): PlayerHousingState {
  const current = sanitizeOrInitializeHousingState(character);
  return {
    ...current,
    arrangement: 'owned_property',
    yearsUnhoused: 0,
    pendingNotice: null,
  };
}

/**
 * Updates housing immediately after selling a property.
 */
export function applyHousingOnPropertySold(
  character: CharacterProfile,
  remainingOwnedCount: number
): PlayerHousingState {
  const current = sanitizeOrInitializeHousingState(character);
  if (remainingOwnedCount > 0) {
    return {
      ...current,
      arrangement: 'owned_property',
      yearsUnhoused: 0,
      pendingNotice: null,
    };
  }

  // Respect non-property independent accommodations if ever active in the future.
  if (
    current.arrangement === 'rented_accommodation' ||
    current.arrangement === 'university_accommodation'
  ) {
    return {
      ...current,
      yearsUnhoused: 0,
    };
  }

  const safeAge = finiteNumber(character.age) ? Math.max(0, Math.floor(character.age)) : 0;
  if (safeAge < current.moveOutDeadlineAge && current.movedOutAtAge === undefined) {
    return {
      ...current,
      arrangement: 'with_parents',
      yearsUnhoused: 0,
    };
  }

  return {
    ...current,
    arrangement: 'unhoused',
    movedOutAtAge: current.movedOutAtAge ?? safeAge,
    yearsUnhoused: 0,
  };
}

/**
 * Evaluates annual Age Up housing milestones, parental move-out transitions,
 * prison shelter exemptions, and escalating homelessness stat penalties.
 * Returns pure state + deltas without mutating inputs or creating `character.assets`.
 */
export function evaluateHousingForYear(
  character: CharacterProfile,
  nextAge: number,
  options: HousingYearOptions = {}
): HousingYearProgress {
  const hadNoPersistedHousing = character.housing === undefined;
  const startingAge = finiteNumber(character.age) ? Math.floor(character.age) : 0;
  const isLegacyAge18Transition = hadNoPersistedHousing && startingAge === 18;
  const baseHousing = sanitizeOrInitializeHousingState(character);

  if (!character.isAlive || !Number.isInteger(nextAge) || nextAge < 0) {
    return {
      housing: baseHousing,
      healthDelta: 0,
      happinessDelta: 0,
      events: [],
    };
  }

  // Duplicate-year idempotency guard matching crime/healthcare year progression.
  if (baseHousing.lastProgressedAge === nextAge) {
    return {
      housing: baseHousing,
      healthDelta: 0,
      happinessDelta: 0,
      events: [],
    };
  }

  const independentArrangement = resolveActiveIndependentArrangement(character, baseHousing);

  // 1. Character owns a home (or has another recognized independent housing source).
  if (independentArrangement !== null) {
    return {
      housing: {
        ...baseHousing,
        arrangement: independentArrangement,
        yearsUnhoused: 0,
        lastProgressedAge: nextAge,
        pendingNotice: null,
      },
      healthDelta: 0,
      happinessDelta: 0,
      events: [],
    };
  }

  // 2. Minors (< 18) always remain safely with parents.
  if (nextAge < 18) {
    return {
      housing: {
        ...baseHousing,
        arrangement: 'with_parents',
        yearsUnhoused: 0,
        lastProgressedAge: nextAge,
      },
      healthDelta: 0,
      happinessDelta: 0,
      events: [],
    };
  }

  // 3. Correctional custody shelters the inmate for the year spent incarcerated:
  // defer move-out transitions, freeze yearsUnhoused, and apply zero penalties.
  if (options.isIncarceratedForYear) {
    return {
      housing: {
        ...baseHousing,
        lastProgressedAge: nextAge,
      },
      healthDelta: 0,
      happinessDelta: 0,
      events: [],
    };
  }

  const events: LifeEvent[] = [];

  // 4. Still living with parents without independent housing.
  if (baseHousing.arrangement === 'with_parents') {
    if (nextAge < baseHousing.moveOutDeadlineAge) {
      let nextHousing: PlayerHousingState = {
        ...baseHousing,
        lastProgressedAge: nextAge,
      };

      if ((nextAge === 18 || isLegacyAge18Transition) && !baseHousing.age18PromptShown) {
        nextHousing = {
          ...nextHousing,
          age18PromptShown: true,
          age19ReminderLogged: nextAge === 19 ? true : nextHousing.age19ReminderLogged,
          pendingNotice: 'age18_independence',
        };
        events.push(
          createHousingEvent(
            nextAge,
            character.birthYear,
            'Living at Home — Adulthood Notice',
            `Your parents reminded you that you can stay at home until age ${baseHousing.moveOutDeadlineAge}, giving you time to work and save toward buying your own place.`,
            '🏡',
            'milestone'
          )
        );
      } else if (nextAge === baseHousing.moveOutDeadlineAge - 1 && !baseHousing.age20WarningShown) {
        nextHousing = {
          ...nextHousing,
          age20WarningShown: true,
          pendingNotice: 'age20_final_warning',
        };
        events.push(
          createHousingEvent(
            nextAge,
            character.birthYear,
            'Final Year at Home',
            `Your parents gave you a final warning: you have 1 year left to purchase a home in Assets & Real Estate before moving out at age ${baseHousing.moveOutDeadlineAge}.`,
            '⚠️',
            'milestone'
          )
        );
      } else if (
        nextAge === 19 &&
        baseHousing.moveOutDeadlineAge === DEFAULT_MOVE_OUT_DEADLINE_AGE &&
        !baseHousing.age19ReminderLogged
      ) {
        nextHousing = {
          ...nextHousing,
          age19ReminderLogged: true,
        };
        events.push(
          createHousingEvent(
            nextAge,
            character.birthYear,
            'Two Years Left to Find Housing',
            `You are still living at home. Start saving toward a down payment on a home in Assets & Real Estate before age ${baseHousing.moveOutDeadlineAge}.`,
            '🏠',
            'milestone'
          )
        );
      }

      return {
        housing: nextHousing,
        healthDelta: 0,
        happinessDelta: 0,
        events,
      };
    }

    // Move-out deadline reached (Age 21+, or first eligible free Age Up after release):
    // transition to unhoused and apply Year 1 exposure penalties.
    const nextYearsUnhoused = 1;
    const { healthDelta, happinessDelta } = getUnhousedPenalties(nextYearsUnhoused);
    const shouldQueueNotice = !baseHousing.movedOutPromptShown;

    events.push(
      createHousingEvent(
        nextAge,
        character.birthYear,
        'Asked to Move Out',
        `At age ${nextAge}, you had to move out of your parents' home without a place of your own. Living unhoused has begun taking a toll (${healthDelta} Health, ${happinessDelta} Happiness).`,
        '📦',
        'misfortune'
      )
    );

    return {
      housing: {
        ...baseHousing,
        arrangement: 'unhoused',
        movedOutAtAge: baseHousing.movedOutAtAge ?? nextAge,
        yearsUnhoused: nextYearsUnhoused,
        lastProgressedAge: nextAge,
        movedOutPromptShown: true,
        pendingNotice: shouldQueueNotice ? 'age21_moved_out' : baseHousing.pendingNotice ?? null,
      },
      healthDelta,
      happinessDelta,
      events,
    };
  }

  // 5. Already unhoused: increment streak and apply escalating annual penalties.
  const nextYearsUnhoused = baseHousing.yearsUnhoused + 1;
  const { healthDelta, happinessDelta } = getUnhousedPenalties(nextYearsUnhoused);

  events.push(
    createHousingEvent(
      nextAge,
      character.birthYear,
      'Living Unhoused',
      `Year ${nextYearsUnhoused} without stable housing weighed on your wellbeing (${healthDelta} Health, ${happinessDelta} Happiness).`,
      '🏚️',
      'misfortune'
    )
  );

  return {
    housing: {
      ...baseHousing,
      arrangement: 'unhoused',
      yearsUnhoused: nextYearsUnhoused,
      lastProgressedAge: nextAge,
    },
    healthDelta,
    happinessDelta,
    events,
  };
}
