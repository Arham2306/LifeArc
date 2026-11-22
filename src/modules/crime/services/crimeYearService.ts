import type { CharacterProfile, LifeEvent } from '../../../types/game';
import { deterministicUUID } from '../../autonomy/services/seededPrngService';
import type {
  CrimeYearProgress,
  PlayerCrimeState,
  ProbationState,
  ProbationTermEntry,
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
 * Computes annual adult unpaid-debt garnishment after annual property, pet, and healthcare expenses.
 * Capped simultaneously at outstanding legal debt, 25% of incoming cash, and spendable cash.
 */
export function calculateAnnualGarnishment(
  unpaidDebt: number,
  incomingCash: number,
  postExpenseSpendableCash: number,
): number {
  if (!Number.isFinite(unpaidDebt) || unpaidDebt <= 0) return 0;
  if (!Number.isFinite(incomingCash) || incomingCash <= 0) return 0;
  if (!Number.isFinite(postExpenseSpendableCash) || postExpenseSpendableCash <= 0) return 0;

  const incomeCap = Math.floor(incomingCash * MAX_GARNISHMENT_INCOME_RATE);
  const spendableCap = Math.floor(postExpenseSpendableCash);
  return Math.max(0, Math.min(Math.floor(unpaidDebt), incomeCap, spendableCap));
}

function progressProbationForYear(
  character: Pick<CharacterProfile, 'id' | 'birthYear'>,
  probation: ProbationState | null,
  nextAge: number,
  frozenByPrisonOrRelease: boolean,
): {
  probation: ProbationState | null;
  completed: boolean;
  completedRecordIds: string[];
  legacyFallbackCompleted: boolean;
  happinessDelta: number;
  events: LifeEvent[];
} {
  if (!probation || probation.yearsRemaining <= 0) {
    return {
      probation: null,
      completed: false,
      completedRecordIds: [],
      legacyFallbackCompleted: false,
      happinessDelta: 0,
      events: [],
    };
  }

  // Prison years and the release-year grace period must NEVER consume probation terms or conditions.
  if (frozenByPrisonOrRelease || probation.lastProgressedAge === nextAge) {
    return {
      probation,
      completed: false,
      completedRecordIds: [],
      legacyFallbackCompleted: false,
      happinessDelta: 0,
      events: [],
    };
  }

  if (Array.isArray(probation.activeTerms) && probation.activeTerms.length > 0) {
    const completedTerms: ProbationTermEntry[] = [];
    const remainingTerms: ProbationTermEntry[] = [];

    for (const term of probation.activeTerms) {
      const nextTermYears = Math.max(0, term.yearsRemaining - 1);
      if (nextTermYears === 0) {
        completedTerms.push({ ...term, yearsRemaining: 0 });
      } else {
        remainingTerms.push({ ...term, yearsRemaining: nextTermYears });
      }
    }

    const completedRecordIds = completedTerms.map((t) => t.recordId);
    const events: LifeEvent[] = [];

    if (remainingTerms.length === 0) {
      events.push({
        id: deterministicUUID('probation_complete', character.id, nextAge, probation.chargeTitle),
        age: nextAge,
        year: character.birthYear + nextAge,
        title: 'Probation Completed',
        message: `You completed your ${probation.jurisdiction} probation term for ${probation.chargeTitle}.`,
        category: 'milestone',
        icon: '📜',
      });

      return {
        probation: null,
        completed: true,
        completedRecordIds,
        legacyFallbackCompleted: false,
        happinessDelta: 4,
        events,
      };
    }

    for (const finished of completedTerms) {
      events.push({
        id: deterministicUUID('probation_term_complete', character.id, nextAge, finished.recordId),
        age: nextAge,
        year: character.birthYear + nextAge,
        title: 'Supervision Term Completed',
        message: `Completed ${finished.jurisdiction} probation term for ${finished.chargeTitle}; other active supervision remains in effect.`,
        category: 'milestone',
        icon: '📜',
      });
    }

    const nextMaxRemaining = Math.max(...remainingTerms.map((t) => t.yearsRemaining));
    const stillMatchesTitle = remainingTerms.some((t) => t.chargeTitle === probation.chargeTitle);
    const nextChargeTitle = stillMatchesTitle
      ? probation.chargeTitle
      : [...remainingTerms].sort((a, b) => b.yearsRemaining - a.yearsRemaining)[0].chargeTitle;
    const nextJurisdiction = remainingTerms.some((t) => t.jurisdiction === 'adult')
      ? 'adult'
      : 'juvenile';

    return {
      probation: {
        ...probation,
        chargeTitle: nextChargeTitle,
        jurisdiction: nextJurisdiction,
        yearsRemaining: nextMaxRemaining,
        activeTerms: remainingTerms,
        lastProgressedAge: nextAge,
        serviceActionsThisYear: 0,
        restitutionPaidThisYear: 0,
      },
      completed: false,
      completedRecordIds,
      legacyFallbackCompleted: false,
      happinessDelta: completedTerms.length > 0 ? 2 : 0,
      events,
    };
  }

  // Legacy scalar probation fallback (saves without activeTerms[])
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
      completedRecordIds: [],
      legacyFallbackCompleted: true,
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
      serviceActionsThisYear: 0,
      restitutionPaidThisYear: 0,
    },
    completed: false,
    completedRecordIds: [],
    legacyFallbackCompleted: false,
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
 * 1) Prison sentence progression & release (marking only originCaseId completed)
 * 2) Probation duration decrement & term-isolated completion (frozen during prison & release year)
 * 3) Automatic juvenile record sealing (after probation completion & 2 clean years)
 * 4) Restitution-first adult legal-debt garnishment (up to 25% of incomingCash and spendable cash)
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
  const hadActivePrisonBeforeStep =
    sanitized.prison !== null && sanitized.prison.yearsRemaining > 0;
  const completedPrisonRecordId =
    sanitized.prison?.originCaseId ?? null;
  const prisonStep = progressPrisonForYear(character, nextAge);
  happinessDelta += prisonStep.happinessDelta;
  events.push(...prisonStep.events);

  // 2. Probation progression (frozen during prison years and the release-year grace period,
  //    including mid-year parole or appeal releases that cleared PrisonState at age nextAge - 1)
  const hadMidYearReleaseInCurrentYear =
    sanitized.lastMidYearReleaseAge !== undefined &&
    sanitized.lastMidYearReleaseAge !== null &&
    sanitized.lastMidYearReleaseAge === nextAge - 1;
  const freezeProbationThisYear =
    hadActivePrisonBeforeStep || prisonStep.releasedFromPrison || hadMidYearReleaseInCurrentYear;
  const probationStep = progressProbationForYear(
    character,
    sanitized.probation,
    nextAge,
    freezeProbationThisYear,
  );
  happinessDelta += probationStep.happinessDelta;
  events.push(...probationStep.events);

  // Determine exact originating record IDs completed this tick (never mark unrelated records complete).
  const completedRecordIdSet = new Set<string>(probationStep.completedRecordIds);
  if (prisonStep.releasedFromPrison && completedPrisonRecordId) {
    completedRecordIdSet.add(completedPrisonRecordId);
  }
  if (probationStep.legacyFallbackCompleted && completedRecordIdSet.size === 0 && sanitized.probation) {
    const legacyCharge = sanitized.probation.chargeTitle;
    const legacyTarget =
      [...sanitized.records]
        .reverse()
        .find(
          (r) =>
            r.outcome === 'probation' &&
            r.sentenceStatus === 'active' &&
            r.title === legacyCharge,
        ) ??
      (() => {
        const activeProbRecords = sanitized.records.filter(
          (r) => r.outcome === 'probation' && r.sentenceStatus === 'active',
        );
        return activeProbRecords.length === 1 ? activeProbRecords[0] : undefined;
      })();
    if (legacyTarget) {
      completedRecordIdSet.add(legacyTarget.id);
    }
  }

  const recordsAfterCompletion = sanitized.records.map((entry) =>
    completedRecordIdSet.has(entry.id) && entry.sentenceStatus === 'active'
      ? { ...entry, sentenceStatus: 'completed' as const }
      : entry,
  );

  // 3. Juvenile automatic sealing (runs after probation progression)
  const postProbationState: PlayerCrimeState = {
    ...sanitized,
    prison: prisonStep.prison,
    probation: probationStep.probation,
    records: recordsAfterCompletion,
  };
  const eligibleToSeal = getJuvenileRecordsEligibleForSealing(
    { age: nextAge, crime: postProbationState },
    nextAge,
  );
  const sealedIdSet = new Set(eligibleToSeal.map((r) => r.id));
  const sealedRecordIds: string[] = [];

  const updatedRecords = recordsAfterCompletion.map((entry) => {
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

  // 4. Adult legal-debt garnishment (single 25% cap, paying unpaidRestitution before unpaidFines)
  const outstandingRestitution = Math.max(0, sanitized.unpaidRestitution ?? 0);
  const totalLegalDebt = outstandingRestitution + sanitized.unpaidFines;
  const garnishedAmount = calculateAnnualGarnishment(
    totalLegalDebt,
    options.incomingCash,
    options.postExpenseSpendableCash,
  );
  const garnishedRestitution = Math.min(outstandingRestitution, garnishedAmount);
  const garnishedFines = Math.min(sanitized.unpaidFines, garnishedAmount - garnishedRestitution);
  const nextUnpaidRestitution = Math.max(0, outstandingRestitution - garnishedRestitution);
  const nextUnpaidFines = Math.max(0, sanitized.unpaidFines - garnishedFines);

  if (garnishedAmount > 0) {
    const breakdownParts: string[] = [];
    if (garnishedRestitution > 0) {
      breakdownParts.push(`$${garnishedRestitution.toLocaleString()} toward victim restitution`);
    }
    if (garnishedFines > 0) {
      breakdownParts.push(`$${garnishedFines.toLocaleString()} toward unpaid court fines`);
    }
    const remainingTotal = nextUnpaidRestitution + nextUnpaidFines;
    events.push({
      id: deterministicUUID(
        'crime_garnish',
        character.id,
        nextAge,
        garnishedAmount,
        remainingTotal,
      ),
      age: nextAge,
      year: character.birthYear + nextAge,
      title: garnishedRestitution > 0 ? 'Legal Debt Garnishment' : 'Court Fine Garnishment',
      message: `Garnished ${breakdownParts.join(' and ')}. Remaining balance: $${(garnishedRestitution > 0 && nextUnpaidRestitution > 0 ? nextUnpaidRestitution + nextUnpaidFines : nextUnpaidFines).toLocaleString()}.`,
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
    unpaidRestitution: nextUnpaidRestitution,
    attemptsThisYear: 0,
    lastProgressedAge: nextAge,
    ...(sanitized.lastMidYearReleaseAge !== undefined ? { lastMidYearReleaseAge: null } : {}),
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

