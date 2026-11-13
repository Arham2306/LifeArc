import type { CharacterProfile, LifeEvent } from '../../../types/game';
import { deterministicUUID } from '../../autonomy/services/seededPrngService';
import type {
  CrimeYearProgress,
  PlayerCrimeState,
  ProbationState,
} from '../types';
import {
  getJuvenileRecordsEligibleForSealing,
  getSanitizedCrimeState,
} from './crimeSelectors';
import { progressPrisonForYear } from './prisonService';

export const MAX_GARNISHMENT_INCOME_RATE = 0.25;

function clamp0to100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Computes annual adult unpaid-fine garnishment after annual property, pet, and healthcare expenses.
 * Capped simultaneously at outstanding unpaidFines, 25% of incoming cash, and spendable cash.
 */
export function calculateAnnualGarnishment(
  unpaidFines: number,
  incomingCash: number,
  postExpenseSpendableCash: number,
): number {
  if (!Number.isFinite(unpaidFines) || unpaidFines <= 0) return 0;
  if (!Number.isFinite(incomingCash) || incomingCash <= 0) return 0;
  if (!Number.isFinite(postExpenseSpendableCash) || postExpenseSpendableCash <= 0) return 0;

  const incomeCap = Math.floor(incomingCash * MAX_GARNISHMENT_INCOME_RATE);
  const spendableCap = Math.floor(postExpenseSpendableCash);
  return Math.max(0, Math.min(Math.floor(unpaidFines), incomeCap, spendableCap));
}

function progressProbationForYear(
  character: Pick<CharacterProfile, 'id' | 'birthYear'>,
  probation: ProbationState | null,
  nextAge: number,
): {
  probation: ProbationState | null;
  completed: boolean;
  happinessDelta: number;
  events: LifeEvent[];
} {
  if (!probation || probation.yearsRemaining <= 0) {
    return { probation: null, completed: false, happinessDelta: 0, events: [] };
  }

  if (probation.lastProgressedAge === nextAge) {
    return { probation, completed: false, happinessDelta: 0, events: [] };
  }

  const nextRemaining = Math.max(0, probation.yearsRemaining - 1);
  if (nextRemaining === 0) {
    const event: LifeEvent = {
      id: deterministicUUID('probation_complete', character.id, nextAge, probation.chargeTitle),
      age: nextAge,
      year: character.birthYear + nextAge,
      title: 'Probation Completed',
      message: `You completed your ${probation.jurisdiction} probation term for ${probation.chargeTitle}.`,
      category: 'milestone',
      icon: '📜',
    };

    return {
      probation: null,
      completed: true,
      happinessDelta: 4,
      events: [event],
    };
  }

  // Strictly preserve probation.jurisdiction even when turning 18+.
  return {
    probation: {
      ...probation,
      yearsRemaining: nextRemaining,
      lastProgressedAge: nextAge,
    },
    completed: false,
    happinessDelta: 0,
    events: [],
  };
}

export interface ProgressCrimeYearOptions {
  incomingCash: number;
  postExpenseSpendableCash: number;
}

/**
 * Advances all annual crime & legal state for 1 year during Age Up:
 * 1) Prison sentence progression & release
 * 2) Probation duration decrement & completion (preserving juvenile jurisdiction at 18+)
 * 3) Automatic juvenile record sealing (after probation completion & 2 clean years)
 * 4) Adult unpaid-fine garnishment (up to 25% of incomingCash and available spendable cash)
 */
export function progressCrimeForYear(
  character: CharacterProfile,
  nextAge: number,
  options: ProgressCrimeYearOptions,
): CrimeYearProgress {
  if (!character.crime) {
    return {
      crime: undefined,
      cashSpent: 0,
      happinessDelta: 0,
      releasedFromPrison: false,
      probationCompleted: false,
      sealedRecordIds: [],
      garnishedAmount: 0,
      events: [],
    };
  }

  const sanitized = getSanitizedCrimeState(character);
  if (!character.isAlive || !Number.isInteger(nextAge)) {
    return {
      crime: sanitized,
      cashSpent: 0,
      happinessDelta: 0,
      releasedFromPrison: false,
      probationCompleted: false,
      sealedRecordIds: [],
      garnishedAmount: 0,
      events: [],
    };
  }

  // Duplicate Age Up protection
  if (sanitized.lastProgressedAge === nextAge) {
    return {
      crime: sanitized,
      cashSpent: 0,
      happinessDelta: 0,
      releasedFromPrison: false,
      probationCompleted: false,
      sealedRecordIds: [],
      garnishedAmount: 0,
      events: [],
    };
  }

  const events: LifeEvent[] = [];
  let happinessDelta = 0;

  // 1. Prison progression
  const prisonStep = progressPrisonForYear(character, nextAge);
  happinessDelta += prisonStep.happinessDelta;
  events.push(...prisonStep.events);

  // 2. Probation progression
  const probationStep = progressProbationForYear(character, sanitized.probation, nextAge);
  happinessDelta += probationStep.happinessDelta;
  events.push(...probationStep.events);

  // 3. Juvenile automatic sealing (runs after probation progression)
  const postProbationState: PlayerCrimeState = {
    ...sanitized,
    prison: prisonStep.prison,
    probation: probationStep.probation,
  };
  const eligibleToSeal = getJuvenileRecordsEligibleForSealing(
    { age: nextAge, crime: postProbationState },
    nextAge,
  );
  const sealedIdSet = new Set(eligibleToSeal.map((r) => r.id));
  const sealedRecordIds: string[] = [];

  const updatedRecords = sanitized.records.map((entry) => {
    if (sealedIdSet.has(entry.id) && entry.jurisdiction === 'juvenile' && !entry.sealed) {
      sealedRecordIds.push(entry.id);
      return {
        ...entry,
        sealed: true,
      };
    }
    return entry;
  });

  if (sealedRecordIds.length > 0) {
    events.push({
      id: deterministicUUID('juvenile_sealing', character.id, nextAge, sealedRecordIds.length),
      age: nextAge,
      year: character.birthYear + nextAge,
      title: 'Juvenile Record Sealed',
      message: `${sealedRecordIds.length} eligible juvenile record(s) were automatically sealed from adult background checks.`,
      category: 'milestone',
      icon: '🗂️',
    });
  }

  // 4. Adult unpaid-fine garnishment
  const garnishedAmount = calculateAnnualGarnishment(
    sanitized.unpaidFines,
    options.incomingCash,
    options.postExpenseSpendableCash,
  );
  const nextUnpaidFines = Math.max(0, sanitized.unpaidFines - garnishedAmount);

  if (garnishedAmount > 0) {
    events.push({
      id: deterministicUUID(
        'crime_garnish',
        character.id,
        nextAge,
        garnishedAmount,
        nextUnpaidFines,
      ),
      age: nextAge,
      year: character.birthYear + nextAge,
      title: 'Court Fine Garnishment',
      message: `Garnished $${garnishedAmount.toLocaleString()} toward unpaid court fines. Remaining balance: $${nextUnpaidFines.toLocaleString()}.`,
      category: 'money',
      icon: '⚖️',
    });
  }

  const nextHeat = clamp0to100(
    sanitized.policeHeat - (prisonStep.prison !== null ? 10 : 8),
  );

  const nextCrimeState: PlayerCrimeState = {
    ...sanitized,
    policeHeat: nextHeat,
    unpaidFines: nextUnpaidFines,
    attemptsThisYear: 0,
    lastProgressedAge: nextAge,
    prison: prisonStep.prison,
    probation: probationStep.probation,
    records: updatedRecords,
  };

  return {
    crime: nextCrimeState,
    cashSpent: garnishedAmount,
    happinessDelta,
    releasedFromPrison: prisonStep.releasedFromPrison,
    probationCompleted: probationStep.completed,
    sealedRecordIds,
    garnishedAmount,
    events,
  };
}

