import type { CharacterProfile } from '../../../types/game';
import type { ActiveBusinessProfile } from '../../business/types';
import type { CareerField } from '../../career/types';
import { isValidCrimeId } from '../data/crimeCatalog';
import type {
  CrimeEligibilityResult,
  CrimeExposureLevel,
  CrimeLegalStatus,
  CrimeOutcomeStatus,
  CrimeRecordEntry,
  CrimeRecordSentenceStatus,
  CrimeTemplate,
  FinancingChannel,
  FinancingEligibilityResult,
  LegalJurisdiction,
  PendingCourtCase,
  PlayerCrimeState,
  PrisonSecurityLevel,
  PrisonState,
  ProbationConditionId,
  ProbationState,
  ProbationTermEntry,
  RecordReliefOption,
  RecordReliefStatus,
  RecordReliefTier,
} from '../types';

export const MAX_CRIME_ATTEMPTS_PER_YEAR = 2;

export const SENSITIVE_CAREER_FIELDS: readonly CareerField[] = [
  'law_government',
  'medicine_healthcare',
  'business_finance',
  'education_science',
];

const FORMAL_ARREST_OUTCOMES: ReadonlySet<CrimeOutcomeStatus> = new Set([
  'dismissed',
  'acquitted',
  'fined',
  'probation',
  'imprisoned',
]);

const CONVICTION_OR_ADJUDICATION_OUTCOMES: ReadonlySet<CrimeOutcomeStatus> = new Set([
  'fined',
  'probation',
  'imprisoned',
]);

const VALID_OUTCOMES: ReadonlySet<string> = new Set([
  'undetected',
  'aborted',
  'warned',
  'dismissed',
  'acquitted',
  'fined',
  'probation',
  'imprisoned',
]);

const VALID_TIERS: ReadonlySet<string> = new Set(['petty', 'mid', 'high_stakes']);
const VALID_OFFENSE_CLASSES: ReadonlySet<string> = new Set(['misdemeanor', 'felony']);
const VALID_JURISDICTIONS: ReadonlySet<string> = new Set(['juvenile', 'adult']);
const VALID_SECURITY_LEVELS: ReadonlySet<string> = new Set(['minimum', 'medium', 'maximum']);
const VALID_EXPOSURES: ReadonlySet<string> = new Set(['private', 'witness_known', 'publicly_reported']);
const VALID_SENTENCE_STATUSES: ReadonlySet<string> = new Set(['not_applicable', 'active', 'completed']);
const VALID_PROBATION_CONDITIONS: ReadonlySet<string> = new Set([
  'supervision_checkins',
  'community_service',
  'restitution_payments',
  'activity_restriction',
  'no_new_offenses',
]);
const VALID_PRISON_ACTION_IDS: ReadonlySet<string> = new Set([
  'work',
  'study',
  'workout',
  'good_behavior',
  'infirmary',
  'appeal',
  'parole',
]);

function toFiniteNonNegative(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function clamp0to100(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

function toNullableAge(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function isValidCrimeRecord(value: unknown): value is CrimeRecordEntry {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<CrimeRecordEntry>;
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    isValidCrimeId(r.crimeId) &&
    typeof r.title === 'string' &&
    typeof r.tier === 'string' &&
    VALID_TIERS.has(r.tier) &&
    typeof r.offenseClass === 'string' &&
    VALID_OFFENSE_CLASSES.has(r.offenseClass) &&
    typeof r.jurisdiction === 'string' &&
    VALID_JURISDICTIONS.has(r.jurisdiction) &&
    typeof r.age === 'number' &&
    Number.isFinite(r.age) &&
    r.age >= 0 &&
    typeof r.year === 'number' &&
    Number.isFinite(r.year) &&
    typeof r.executionSucceeded === 'boolean' &&
    typeof r.detected === 'boolean' &&
    typeof r.injured === 'boolean' &&
    typeof r.outcome === 'string' &&
    VALID_OUTCOMES.has(r.outcome) &&
    typeof r.attemptedPayout === 'number' &&
    Number.isFinite(r.attemptedPayout) &&
    r.attemptedPayout >= 0 &&
    typeof r.payout === 'number' &&
    Number.isFinite(r.payout) &&
    r.payout >= 0 &&
    typeof r.fineImposed === 'number' &&
    Number.isFinite(r.fineImposed) &&
    r.fineImposed >= 0 &&
    typeof r.finePaid === 'number' &&
    Number.isFinite(r.finePaid) &&
    r.finePaid >= 0 &&
    typeof r.attorneyFeePaid === 'number' &&
    Number.isFinite(r.attorneyFeePaid) &&
    r.attorneyFeePaid >= 0 &&
    typeof r.sentenceYears === 'number' &&
    Number.isFinite(r.sentenceYears) &&
    r.sentenceYears >= 0 &&
    typeof r.sealed === 'boolean' &&
    typeof r.expunged === 'boolean'
  );
}

export function isValidPendingCase(value: unknown): value is PendingCourtCase {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<PendingCourtCase>;
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    isValidCrimeId(c.crimeId) &&
    typeof c.title === 'string' &&
    typeof c.tier === 'string' &&
    VALID_TIERS.has(c.tier) &&
    typeof c.offenseClass === 'string' &&
    VALID_OFFENSE_CLASSES.has(c.offenseClass) &&
    typeof c.jurisdiction === 'string' &&
    VALID_JURISDICTIONS.has(c.jurisdiction) &&
    typeof c.arrestedAtAge === 'number' &&
    Number.isFinite(c.arrestedAtAge) &&
    c.arrestedAtAge >= 0 &&
    typeof c.arrestedAtYear === 'number' &&
    Number.isFinite(c.arrestedAtYear) &&
    typeof c.executionSucceeded === 'boolean' &&
    typeof c.injured === 'boolean' &&
    typeof c.attemptedPayout === 'number' &&
    Number.isFinite(c.attemptedPayout) &&
    c.attemptedPayout >= 0 &&
    typeof c.baseFine === 'number' &&
    Number.isFinite(c.baseFine) &&
    c.baseFine >= 0 &&
    typeof c.baseSentenceYears === 'number' &&
    Number.isFinite(c.baseSentenceYears) &&
    c.baseSentenceYears >= 0
  );
}

export function isValidPrisonState(value: unknown): value is PrisonState {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<PrisonState>;
  return (
    typeof p.facilityName === 'string' &&
    typeof p.securityLevel === 'string' &&
    VALID_SECURITY_LEVELS.has(p.securityLevel as PrisonSecurityLevel) &&
    typeof p.chargeTitle === 'string' &&
    typeof p.yearsTotal === 'number' &&
    Number.isFinite(p.yearsTotal) &&
    p.yearsTotal >= 0 &&
    typeof p.yearsServed === 'number' &&
    Number.isFinite(p.yearsServed) &&
    p.yearsServed >= 0 &&
    typeof p.yearsRemaining === 'number' &&
    Number.isFinite(p.yearsRemaining) &&
    p.yearsRemaining >= 0 &&
    typeof p.behaviorScore === 'number' &&
    Number.isFinite(p.behaviorScore) &&
    typeof p.paroleEligibleAtServed === 'number' &&
    Number.isFinite(p.paroleEligibleAtServed) &&
    p.paroleEligibleAtServed >= 0 &&
    typeof p.actionsTakenThisYear === 'number' &&
    Number.isFinite(p.actionsTakenThisYear) &&
    p.actionsTakenThisYear >= 0
  );
}

export function isValidProbationState(value: unknown): value is ProbationState {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<ProbationState>;
  return (
    typeof p.chargeTitle === 'string' &&
    typeof p.jurisdiction === 'string' &&
    VALID_JURISDICTIONS.has(p.jurisdiction) &&
    typeof p.yearsRemaining === 'number' &&
    Number.isFinite(p.yearsRemaining) &&
    p.yearsRemaining >= 0 &&
    typeof p.startedAtAge === 'number' &&
    Number.isFinite(p.startedAtAge) &&
    p.startedAtAge >= 0
  );
}

function isValidProbationTermEntry(value: unknown): value is ProbationTermEntry {
  if (!value || typeof value !== 'object') return false;
  const t = value as Partial<ProbationTermEntry>;
  return (
    typeof t.recordId === 'string' &&
    t.recordId.length > 0 &&
    typeof t.chargeTitle === 'string' &&
    typeof t.jurisdiction === 'string' &&
    VALID_JURISDICTIONS.has(t.jurisdiction) &&
    typeof t.yearsRemaining === 'number' &&
    Number.isFinite(t.yearsRemaining) &&
    t.yearsRemaining >= 0 &&
    typeof t.startedAtAge === 'number' &&
    Number.isFinite(t.startedAtAge) &&
    t.startedAtAge >= 0 &&
    typeof t.communityServiceHoursRemaining === 'number' &&
    Number.isFinite(t.communityServiceHoursRemaining) &&
    t.communityServiceHoursRemaining >= 0
  );
}

function sanitizeCrimeRecord(entry: CrimeRecordEntry): CrimeRecordEntry {
  const exposure =
    typeof entry.exposure === 'string' && VALID_EXPOSURES.has(entry.exposure)
      ? (entry.exposure as CrimeExposureLevel)
      : undefined;
  const sentenceStatus =
    typeof entry.sentenceStatus === 'string' && VALID_SENTENCE_STATUSES.has(entry.sentenceStatus)
      ? (entry.sentenceStatus as CrimeRecordSentenceStatus)
      : undefined;

  return {
    id: entry.id,
    crimeId: entry.crimeId,
    title: entry.title,
    tier: entry.tier,
    offenseClass: entry.offenseClass,
    jurisdiction: entry.jurisdiction,
    age: entry.age,
    year: entry.year,
    executionSucceeded: entry.executionSucceeded,
    detected: entry.detected,
    injured: entry.injured,
    outcome: entry.outcome,
    attemptedPayout: entry.attemptedPayout,
    payout: entry.payout,
    fineImposed: entry.fineImposed,
    finePaid: entry.finePaid,
    attorneyFeePaid: entry.attorneyFeePaid,
    sentenceYears: entry.sentenceYears,
    sealed: entry.sealed,
    expunged: entry.expunged,
    ...(typeof entry.pardoned === 'boolean' ? { pardoned: entry.pardoned } : {}),
    ...(typeof entry.lastPetitionDeniedAge === 'number' &&
    Number.isFinite(entry.lastPetitionDeniedAge) &&
    entry.lastPetitionDeniedAge >= 0
      ? { lastPetitionDeniedAge: Math.floor(entry.lastPetitionDeniedAge) }
      : entry.lastPetitionDeniedAge === null
        ? { lastPetitionDeniedAge: null }
        : {}),
    ...(exposure !== undefined ? { exposure } : {}),
    ...(sentenceStatus !== undefined ? { sentenceStatus } : {}),
    ...(typeof entry.stateForfeitedProceeds === 'number' &&
    Number.isFinite(entry.stateForfeitedProceeds) &&
    entry.stateForfeitedProceeds >= 0
      ? { stateForfeitedProceeds: Math.round(entry.stateForfeitedProceeds) }
      : {}),
    ...(typeof entry.recoveredPropertyReturnedToVictim === 'number' &&
    Number.isFinite(entry.recoveredPropertyReturnedToVictim) &&
    entry.recoveredPropertyReturnedToVictim >= 0
      ? { recoveredPropertyReturnedToVictim: Math.round(entry.recoveredPropertyReturnedToVictim) }
      : {}),
    ...(typeof entry.remainingVictimLoss === 'number' &&
    Number.isFinite(entry.remainingVictimLoss) &&
    entry.remainingVictimLoss >= 0
      ? { remainingVictimLoss: Math.round(entry.remainingVictimLoss) }
      : {}),
    ...(typeof entry.restitutionImposed === 'number' &&
    Number.isFinite(entry.restitutionImposed) &&
    entry.restitutionImposed >= 0
      ? { restitutionImposed: Math.round(entry.restitutionImposed) }
      : {}),
    ...(typeof entry.restitutionPaid === 'number' &&
    Number.isFinite(entry.restitutionPaid) &&
    entry.restitutionPaid >= 0
      ? { restitutionPaid: Math.round(entry.restitutionPaid) }
      : {}),
  };
}

function sanitizePendingCase(pending: PendingCourtCase): PendingCourtCase {
  const exposure =
    typeof pending.exposure === 'string' && VALID_EXPOSURES.has(pending.exposure)
      ? (pending.exposure as CrimeExposureLevel)
      : undefined;
  const legalStatus =
    pending.legalStatus === 'arrested' || pending.legalStatus === 'pending_trial'
      ? pending.legalStatus
      : undefined;

  return {
    id: pending.id,
    crimeId: pending.crimeId,
    title: pending.title,
    tier: pending.tier,
    offenseClass: pending.offenseClass,
    jurisdiction: pending.jurisdiction,
    arrestedAtAge: pending.arrestedAtAge,
    arrestedAtYear: pending.arrestedAtYear,
    executionSucceeded: pending.executionSucceeded,
    injured: pending.injured,
    attemptedPayout: pending.attemptedPayout,
    baseFine: pending.baseFine,
    baseSentenceYears: pending.baseSentenceYears,
    ...(exposure !== undefined ? { exposure } : {}),
    ...(legalStatus !== undefined ? { legalStatus } : {}),
    ...(typeof pending.offendedOnProbation === 'boolean'
      ? { offendedOnProbation: pending.offendedOnProbation }
      : {}),
    ...(typeof pending.arrestHappinessApplied === 'number' &&
    Number.isFinite(pending.arrestHappinessApplied)
      ? { arrestHappinessApplied: Math.round(pending.arrestHappinessApplied) }
      : {}),
    ...(typeof pending.arrestHealthApplied === 'number' &&
    Number.isFinite(pending.arrestHealthApplied)
      ? { arrestHealthApplied: Math.round(pending.arrestHealthApplied) }
      : {}),
    ...(typeof pending.explicitWitnessSignal === 'boolean'
      ? { explicitWitnessSignal: pending.explicitWitnessSignal }
      : {}),
    ...(typeof pending.institutionalReportFiled === 'boolean'
      ? { institutionalReportFiled: pending.institutionalReportFiled }
      : {}),
  };
}

export function createEmptyCrimeState(): PlayerCrimeState {
  return {
    policeHeat: 0,
    notoriety: 0,
    unpaidFines: 0,
    unpaidRestitution: 0,
    attemptsThisYear: 0,
    attemptCountLifetime: 0,
    lastAttemptAge: null,
    lastProgressedAge: null,
    pendingCase: null,
    prison: null,
    probation: null,
    records: [],
  };
}

export function getSanitizedCrimeState(
  character: Pick<CharacterProfile, 'crime'>,
): PlayerCrimeState {
  const raw = character.crime;
  if (!raw || typeof raw !== 'object') {
    return createEmptyCrimeState();
  }

  const rawRecords = Array.isArray(raw.records) ? raw.records : [];
  const records = rawRecords.filter(isValidCrimeRecord).map(sanitizeCrimeRecord);

  const rawPrison = raw.prison as Partial<PrisonState> | null;
  const priorRetirementOccupation =
    rawPrison?.priorRetirementOccupation === 'Retired' ||
    rawPrison?.priorRetirementOccupation === 'Retired Entrepreneur' ||
    rawPrison?.priorRetirementOccupation === null
      ? rawPrison.priorRetirementOccupation
      : undefined;
  const originCaseId =
    typeof rawPrison?.originCaseId === 'string' && rawPrison.originCaseId.trim().length > 0
      ? rawPrison.originCaseId.trim()
      : undefined;

  const actionIdsThisYear = Array.isArray(rawPrison?.actionIdsThisYear)
    ? rawPrison.actionIdsThisYear.filter(
        (id): id is import('../types').PrisonActionId =>
          typeof id === 'string' && VALID_PRISON_ACTION_IDS.has(id),
      )
    : undefined;

  const prison: PrisonState | null = isValidPrisonState(raw.prison)
    ? {
        facilityName: raw.prison.facilityName,
        securityLevel: raw.prison.securityLevel,
        chargeTitle: raw.prison.chargeTitle,
        yearsTotal: raw.prison.yearsTotal,
        yearsServed: raw.prison.yearsServed,
        yearsRemaining: raw.prison.yearsRemaining,
        behaviorScore: clamp0to100(raw.prison.behaviorScore, 50),
        paroleEligibleAtServed: raw.prison.paroleEligibleAtServed,
        actionsTakenThisYear: raw.prison.actionsTakenThisYear,
        ...(actionIdsThisYear !== undefined ? { actionIdsThisYear } : {}),
        lastActionAge: toNullableAge(raw.prison.lastActionAge),
        lastProgressedAge: toNullableAge(raw.prison.lastProgressedAge),
        ...(originCaseId !== undefined ? { originCaseId } : {}),
        ...(priorRetirementOccupation !== undefined ? { priorRetirementOccupation } : {}),
      }
    : null;

  const probation: ProbationState | null = isValidProbationState(raw.probation)
    ? (() => {
        const rawProb = raw.probation;
        const activeTerms = Array.isArray(rawProb.activeTerms)
          ? rawProb.activeTerms.filter(isValidProbationTermEntry).map((term) => ({
              recordId: term.recordId,
              chargeTitle: term.chargeTitle,
              jurisdiction: term.jurisdiction,
              yearsRemaining: Math.floor(toFiniteNonNegative(term.yearsRemaining, 0)),
              startedAtAge: term.startedAtAge,
              communityServiceHoursRemaining: Math.round(
                toFiniteNonNegative(term.communityServiceHoursRemaining, 0),
              ),
              technicalWarnings: Math.floor(toFiniteNonNegative(term.technicalWarnings, 0)),
              violationCount: Math.floor(toFiniteNonNegative(term.violationCount, 0)),
            }))
          : undefined;
        const conditions = Array.isArray(rawProb.conditions)
          ? (rawProb.conditions.filter(
              (c): c is ProbationConditionId =>
                typeof c === 'string' && VALID_PROBATION_CONDITIONS.has(c),
            ) as ProbationConditionId[])
          : undefined;

        return {
          chargeTitle: rawProb.chargeTitle,
          jurisdiction: rawProb.jurisdiction,
          yearsRemaining: rawProb.yearsRemaining,
          startedAtAge: rawProb.startedAtAge,
          lastProgressedAge: toNullableAge(rawProb.lastProgressedAge),
          ...(activeTerms !== undefined ? { activeTerms } : {}),
          ...(conditions !== undefined ? { conditions } : {}),
          ...(rawProb.lastCheckInAge !== undefined
            ? { lastCheckInAge: toNullableAge(rawProb.lastCheckInAge) }
            : {}),
          ...(rawProb.lastServiceActionAge !== undefined
            ? { lastServiceActionAge: toNullableAge(rawProb.lastServiceActionAge) }
            : {}),
          ...(typeof rawProb.serviceActionsThisYear === 'number' &&
          Number.isFinite(rawProb.serviceActionsThisYear) &&
          rawProb.serviceActionsThisYear >= 0
            ? { serviceActionsThisYear: Math.floor(rawProb.serviceActionsThisYear) }
            : {}),
          ...(typeof rawProb.restitutionPaidThisYear === 'number' &&
          Number.isFinite(rawProb.restitutionPaidThisYear) &&
          rawProb.restitutionPaidThisYear >= 0
            ? { restitutionPaidThisYear: Math.round(rawProb.restitutionPaidThisYear) }
            : {}),
          ...(typeof rawProb.technicalWarnings === 'number' &&
          Number.isFinite(rawProb.technicalWarnings) &&
          rawProb.technicalWarnings >= 0
            ? { technicalWarnings: Math.floor(rawProb.technicalWarnings) }
            : {}),
          ...(typeof rawProb.violationCount === 'number' &&
          Number.isFinite(rawProb.violationCount) &&
          rawProb.violationCount >= 0
            ? { violationCount: Math.floor(rawProb.violationCount) }
            : {}),
        };
      })()
    : null;

  return {
    policeHeat: clamp0to100(raw.policeHeat, 0),
    notoriety: clamp0to100(raw.notoriety, 0),
    unpaidFines: Math.round(toFiniteNonNegative(raw.unpaidFines, 0)),
    unpaidRestitution: Math.round(toFiniteNonNegative(raw.unpaidRestitution, 0)),
    attemptsThisYear: Math.floor(toFiniteNonNegative(raw.attemptsThisYear, 0)),
    attemptCountLifetime: Math.floor(toFiniteNonNegative(raw.attemptCountLifetime, 0)),
    lastAttemptAge: toNullableAge(raw.lastAttemptAge),
    lastProgressedAge: toNullableAge(raw.lastProgressedAge),
    ...(raw.lastMidYearReleaseAge !== undefined
      ? { lastMidYearReleaseAge: toNullableAge(raw.lastMidYearReleaseAge) }
      : {}),
    pendingCase: isValidPendingCase(raw.pendingCase) ? sanitizePendingCase(raw.pendingCase) : null,
    prison,
    probation,
    records,
  };
}

export function getJurisdictionForAge(age: number): LegalJurisdiction {
  return age < 18 ? 'juvenile' : 'adult';
}

export function isRecordClearedForAdultChecks(entry: CrimeRecordEntry): boolean {
  return entry.sealed || entry.expunged;
}

/**
 * Counts formal arrests only (`dismissed`, `acquitted`, `fined`, `probation`, `imprisoned`).
 * Excludes undetected escapes, aborted attempts, and informal juvenile warnings.
 */
export function getArrestCount(character: Pick<CharacterProfile, 'crime'>): number {
  const crime = getSanitizedCrimeState(character);
  return crime.records.filter((entry) => FORMAL_ARREST_OUTCOMES.has(entry.outcome)).length;
}

export function getJuvenileWarningCount(character: Pick<CharacterProfile, 'crime'>): number {
  const crime = getSanitizedCrimeState(character);
  return crime.records.filter(
    (entry) => entry.jurisdiction === 'juvenile' && entry.outcome === 'warned',
  ).length;
}

export function getActiveAdultConvictions(
  character: Pick<CharacterProfile, 'crime'>,
): CrimeRecordEntry[] {
  const crime = getSanitizedCrimeState(character);
  return crime.records.filter(
    (entry) =>
      entry.jurisdiction === 'adult' &&
      !isRecordClearedForAdultChecks(entry) &&
      CONVICTION_OR_ADJUDICATION_OUTCOMES.has(entry.outcome),
  );
}

export function getJuvenileAdjudications(
  character: Pick<CharacterProfile, 'crime'>,
  options: { includeSealed?: boolean } = {},
): CrimeRecordEntry[] {
  const crime = getSanitizedCrimeState(character);
  return crime.records.filter(
    (entry) =>
      entry.jurisdiction === 'juvenile' &&
      (options.includeSealed || !entry.sealed) &&
      CONVICTION_OR_ADJUDICATION_OUTCOMES.has(entry.outcome),
  );
}

export function hasActiveAdultConviction(character: Pick<CharacterProfile, 'crime'>): boolean {
  return getActiveAdultConvictions(character).length > 0;
}

/**
 * Only non-expunged, non-sealed adult felonies count toward adult felony restrictions.
 */
export function hasActiveFelony(character: Pick<CharacterProfile, 'crime'>): boolean {
  return getActiveAdultConvictions(character).some((entry) => entry.offenseClass === 'felony');
}

export function hasSensitiveFieldConviction(
  character: Pick<CharacterProfile, 'age' | 'crime'>,
  field?: CareerField,
): boolean {
  if (field && !SENSITIVE_CAREER_FIELDS.includes(field)) {
    return false;
  }
  const activeAdult = getActiveAdultConvictions(character);
  return activeAdult.some(
    (entry) => entry.offenseClass === 'felony' || character.age - entry.age <= 5,
  );
}

export function getJuvenileRecordsEligibleForSealing(
  character: Pick<CharacterProfile, 'age' | 'crime'>,
  referenceAge = character.age,
): CrimeRecordEntry[] {
  if (referenceAge < 18) return [];
  const crime = getSanitizedCrimeState(character);

  // Active juvenile probation blocks automatic sealing until completed.
  if (crime.probation && crime.probation.jurisdiction === 'juvenile' && crime.probation.yearsRemaining > 0) {
    return [];
  }

  const blockingOffenseRecords = crime.records.filter(
    (entry) =>
      entry.outcome !== 'dismissed' &&
      entry.outcome !== 'acquitted' &&
      entry.outcome !== 'aborted',
  );

  if (blockingOffenseRecords.length > 0) {
    const latestOffenseAge = Math.max(...blockingOffenseRecords.map((entry) => entry.age));
    if (referenceAge - latestOffenseAge < 2) {
      return [];
    }
  }

  return crime.records.filter(
    (entry) => entry.jurisdiction === 'juvenile' && !entry.sealed,
  );
}

export function isCurrentlyIncarcerated(character: Pick<CharacterProfile, 'crime'>): boolean {
  const crime = getSanitizedCrimeState(character);
  return crime.prison !== null && crime.prison.yearsRemaining > 0;
}

export function hasPendingCourtCase(character: Pick<CharacterProfile, 'crime'>): boolean {
  const crime = getSanitizedCrimeState(character);
  return crime.pendingCase !== null;
}

export function isOnProbation(character: Pick<CharacterProfile, 'crime'>): boolean {
  const crime = getSanitizedCrimeState(character);
  return crime.probation !== null && crime.probation.yearsRemaining > 0;
}

export function getUnpaidFines(character: Pick<CharacterProfile, 'crime'>): number {
  return getSanitizedCrimeState(character).unpaidFines;
}

export const EXPUNGEMENT_MISDEMEANOR_CLEAN_YEARS = 5;
export const EXPUNGEMENT_FELONY_CLEAN_YEARS = 8;
export const RECORD_RELIEF_NONVIOLENT_PRISON_CLEAN_YEARS = 8;
export const RECORD_RELIEF_VIOLENT_PRISON_CLEAN_YEARS = 12;
export const RECORD_RELIEF_RETRY_COOLDOWN_YEARS = 2;
export const EXECUTIVE_PARDON_MIN_KARMA = 60;
export const RECORD_RELIEF_FEES = {
  standard_free: 0,
  self_filed: 2000,
  attorney: 8000,
  executive_pardon: 15000,
} as const;

export function getExpungementEligibleRecords(
  character: Pick<CharacterProfile, 'age' | 'crime'>,
  referenceAge = character.age,
): CrimeRecordEntry[] {
  if (isCurrentlyIncarcerated(character) || isOnProbation(character)) {
    return [];
  }

  const sanitized = getSanitizedCrimeState(character);
  const convictionOrAdjudicationRecords = sanitized.records.filter((entry) =>
    CONVICTION_OR_ADJUDICATION_OUTCOMES.has(entry.outcome),
  );
  const latestConvictionResolutionAge =
    convictionOrAdjudicationRecords.length > 0
      ? Math.max(...convictionOrAdjudicationRecords.map((r) => r.age + r.sentenceYears))
      : 0;

  return getActiveAdultConvictions(character).filter((entry) => {
    const cleanStartAge = Math.max(
      entry.age + entry.sentenceYears,
      latestConvictionResolutionAge,
    );
    const cleanYears = referenceAge - cleanStartAge;
    if (entry.offenseClass === 'misdemeanor') {
      return cleanYears >= EXPUNGEMENT_MISDEMEANOR_CLEAN_YEARS;
    }
    return entry.outcome !== 'imprisoned' && cleanYears >= EXPUNGEMENT_FELONY_CLEAN_YEARS;
  });
}

/**
 * Evaluates the 3-tier Record Relief eligibility, waiting-period countdown, legal debt/karma
 * requirements, and interactive petition options for any active adult conviction.
 * Returns `null` for juvenile, already cleared, or non-conviction records.
 */
export function evaluateRecordReliefStatus(
  character: Pick<
    CharacterProfile,
    'isAlive' | 'age' | 'cash' | 'stats' | 'career' | 'business' | 'crime'
  >,
  entry: CrimeRecordEntry,
  referenceAge = character.age,
): RecordReliefStatus | null {
  if (
    entry.jurisdiction !== 'adult' ||
    entry.sealed ||
    entry.expunged ||
    !CONVICTION_OR_ADJUDICATION_OUTCOMES.has(entry.outcome)
  ) {
    return null;
  }

  const isViolentPrisonFelony =
    entry.offenseClass === 'felony' &&
    entry.outcome === 'imprisoned' &&
    (entry.crimeId === 'robbery' || entry.crimeId === 'bank_heist');

  const tier: RecordReliefTier =
    entry.offenseClass === 'misdemeanor' || entry.outcome !== 'imprisoned'
      ? 'standard'
      : isViolentPrisonFelony
        ? 'executive_pardon'
        : 'court_petition';

  const requiredCleanYears =
    tier === 'standard'
      ? entry.offenseClass === 'misdemeanor'
        ? EXPUNGEMENT_MISDEMEANOR_CLEAN_YEARS
        : EXPUNGEMENT_FELONY_CLEAN_YEARS
      : tier === 'court_petition'
        ? RECORD_RELIEF_NONVIOLENT_PRISON_CLEAN_YEARS
        : RECORD_RELIEF_VIOLENT_PRISON_CLEAN_YEARS;

  const sanitized = getSanitizedCrimeState(character);
  const convictionOrAdjudicationRecords = sanitized.records.filter((r) =>
    CONVICTION_OR_ADJUDICATION_OUTCOMES.has(r.outcome),
  );
  const latestConvictionResolutionAge =
    convictionOrAdjudicationRecords.length > 0
      ? Math.max(...convictionOrAdjudicationRecords.map((r) => r.age + r.sentenceYears))
      : entry.age + entry.sentenceYears;

  const cleanStartAge = Math.max(
    entry.age + entry.sentenceYears,
    latestConvictionResolutionAge,
  );
  const cleanYearsCompleted = Math.max(0, referenceAge - cleanStartAge);
  const yearsRemaining = Math.max(0, requiredCleanYears - cleanYearsCompleted);
  const unlockAge = cleanStartAge + requiredCleanYears;

  const unpaidLegalDebt = getUnpaidFines(character) + getUnpaidRestitution(character);
  const rawKarma = character.stats?.karma;
  const currentKarma = Math.max(
    0,
    Math.min(100, Math.round(Number.isFinite(rawKarma) ? rawKarma : 50)),
  );
  const karmaShortfall =
    tier === 'executive_pardon' ? Math.max(0, EXECUTIVE_PARDON_MIN_KARMA - currentKarma) : 0;

  const cooldownYearsRemaining =
    tier !== 'standard' &&
    typeof entry.lastPetitionDeniedAge === 'number' &&
    Number.isFinite(entry.lastPetitionDeniedAge)
      ? Math.max(
          0,
          RECORD_RELIEF_RETRY_COOLDOWN_YEARS - (referenceAge - entry.lastPetitionDeniedAge),
        )
      : 0;

  const blockingReasons: string[] = [];
  if (!character.isAlive) {
    blockingReasons.push('Deceased characters cannot petition for record relief.');
  }
  if (isCurrentlyIncarcerated(character)) {
    blockingReasons.push('Complete prison sentence first.');
  }
  if (isOnProbation(character)) {
    blockingReasons.push('Complete active probation first.');
  }
  if (hasPendingCourtCase(character)) {
    blockingReasons.push('Resolve pending court case first.');
  }
  if (yearsRemaining > 0) {
    blockingReasons.push(`Need ${yearsRemaining} more clean year${yearsRemaining === 1 ? '' : 's'} (Age ${unlockAge}).`);
  }
  if (tier !== 'standard' && unpaidLegalDebt > 0) {
    blockingReasons.push(`Pay off $${unpaidLegalDebt.toLocaleString()} in legal fines/restitution first.`);
  }
  if (tier !== 'standard' && cooldownYearsRemaining > 0) {
    blockingReasons.push(
      `Wait ${cooldownYearsRemaining} more year${cooldownYearsRemaining === 1 ? '' : 's'} after last denial.`,
    );
  }
  if (tier === 'executive_pardon' && karmaShortfall > 0) {
    blockingReasons.push(`Requires Karma ≥ ${EXECUTIVE_PARDON_MIN_KARMA} (currently ${currentKarma}).`);
  }

  const eligibleNow = blockingReasons.length === 0;
  const safeCash = Math.max(0, Math.floor(Number.isFinite(character.cash) ? character.cash : 0));
  const hasSteadyIncome = Boolean(character.career?.currentJob || character.business);
  const extraCleanYears = Math.max(0, cleanYearsCompleted - requiredCleanYears);

  let options: RecordReliefOption[] = [];
  if (tier === 'standard') {
    options = [
      {
        id: 'standard_free',
        label: 'Standard Expungement',
        description: 'Administrative record clearance after completing the clean waiting period.',
        fee: RECORD_RELIEF_FEES.standard_free,
        canAfford: true,
        approvalProbability: 1,
      },
    ];
  } else if (tier === 'court_petition') {
    const cleanBonus = Math.min(0.15, extraCleanYears * 0.03);
    const workBonus = hasSteadyIncome ? 0.12 : 0;
    const karmaAdj = ((currentKarma - 50) / 50) * 0.15;
    const sharedBonus = cleanBonus + workBonus + karmaAdj;

    const selfProb = Math.round(Math.max(0.15, Math.min(0.88, 0.45 + sharedBonus)) * 100) / 100;
    const attorneyProb =
      Math.round(Math.max(0.35, Math.min(0.96, 0.72 + sharedBonus)) * 100) / 100;

    options = [
      {
        id: 'self_filed',
        label: 'Self-Filed Petition (Pro Se)',
        description:
          'File your own rehabilitation petition with the court. Lower cost, but harder to convince the judge.',
        fee: RECORD_RELIEF_FEES.self_filed,
        canAfford: safeCash >= RECORD_RELIEF_FEES.self_filed,
        approvalProbability: selfProb,
      },
      {
        id: 'attorney',
        label: 'Expungement Specialist Attorney',
        description:
          'Retain a specialist attorney to present your rehabilitation record and employment history.',
        fee: RECORD_RELIEF_FEES.attorney,
        canAfford: safeCash >= RECORD_RELIEF_FEES.attorney,
        approvalProbability: attorneyProb,
      },
    ];
  } else {
    const cleanBonus = Math.min(0.18, extraCleanYears * 0.03);
    const workBonus = hasSteadyIncome ? 0.1 : 0;
    const highKarmaBonus = Math.min(0.2, Math.max(0, currentKarma - EXECUTIVE_PARDON_MIN_KARMA) * 0.005);
    const pardonProb =
      Math.round(
        Math.max(0.2, Math.min(0.82, 0.38 + cleanBonus + workBonus + highKarmaBonus)) * 100,
      ) / 100;

    options = [
      {
        id: 'executive_pardon',
        label: "Governor's Executive Pardon",
        description:
          'Submit a formal clemency dossier for a violent felony. Rare, costly, and requires strong rehabilitation.',
        fee: RECORD_RELIEF_FEES.executive_pardon,
        canAfford: safeCash >= RECORD_RELIEF_FEES.executive_pardon,
        approvalProbability: pardonProb,
      },
    ];
  }

  const tierLabel =
    tier === 'standard'
      ? 'Expungement'
      : tier === 'court_petition'
        ? 'Court Petition'
        : "Governor's Pardon";

  const summaryText = eligibleNow
    ? tier === 'standard'
      ? 'Eligible for Standard Expungement'
      : tier === 'court_petition'
        ? 'Eligible to Petition Court for Expungement'
        : "Eligible to Apply for Governor's Pardon"
    : `${tierLabel}: ${blockingReasons.slice(0, 2).join(' ')}`;

  return {
    recordId: entry.id,
    tier,
    eligibleNow,
    cleanYearsCompleted,
    requiredCleanYears,
    yearsRemaining,
    unlockAge,
    cooldownYearsRemaining,
    unpaidLegalDebt,
    karmaShortfall,
    blockingReasons,
    summaryText,
    options,
  };
}

export function getAttemptsUsedThisYear(character: Pick<CharacterProfile, 'age' | 'crime'>): number {
  const crime = getSanitizedCrimeState(character);
  if (crime.lastAttemptAge !== character.age) return 0;
  return crime.attemptsThisYear;
}

export function getRemainingAttemptsThisYear(
  character: Pick<CharacterProfile, 'age' | 'crime'>,
): number {
  return Math.max(0, MAX_CRIME_ATTEMPTS_PER_YEAR - getAttemptsUsedThisYear(character));
}

export function isCrimeEligibleForCharacter(
  character: Pick<CharacterProfile, 'isAlive' | 'age' | 'crime'>,
  template: CrimeTemplate,
): CrimeEligibilityResult {
  if (!character.isAlive) {
    return { eligible: false, reason: 'Deceased characters cannot attempt crimes.' };
  }
  if (isCurrentlyIncarcerated(character)) {
    return { eligible: false, reason: 'Cannot attempt street crimes while incarcerated.' };
  }
  if (hasPendingCourtCase(character)) {
    return {
      eligible: false,
      reason: 'Resolve your pending court case before attempting another crime.',
    };
  }
  if (character.age < template.minAge) {
    return {
      eligible: false,
      reason: `Requires age ${template.minAge}+ to attempt ${template.title}.`,
    };
  }
  if (getRemainingAttemptsThisYear(character) <= 0) {
    return {
      eligible: false,
      reason: `Annual limit of ${MAX_CRIME_ATTEMPTS_PER_YEAR} crime attempts reached for this year.`,
    };
  }
  return { eligible: true };
}

/**
 * Distinguishes formal criminal-justice records from private attempt telemetry
 * (`undetected` and `aborted` attempts never count as criminal records or arrests).
 */
export function isCriminalRecordEntry(entry: Pick<CrimeRecordEntry, 'outcome'>): boolean {
  return entry.outcome !== 'undetected' && entry.outcome !== 'aborted';
}

/**
 * Derives an individual record's legal status strictly per record (linked via `sentenceStatus`,
 * `prison.originCaseId`, and `probation.activeTerms`) so newer concurrent cases cannot overwrite
 * historical completed convictions.
 */
export function getCrimeLegalStatus(
  entry: CrimeRecordEntry,
  character?: Pick<CharacterProfile, 'age' | 'crime'>,
): CrimeLegalStatus {
  if (!isCriminalRecordEntry(entry)) {
    return 'attempted';
  }
  if (entry.outcome === 'dismissed' || entry.outcome === 'acquitted') {
    return 'acquitted';
  }
  if (entry.sealed) {
    return 'sealed';
  }
  if (entry.expunged) {
    return 'expunged';
  }
  if (entry.outcome === 'warned') {
    return 'detected';
  }
  if (entry.sentenceStatus === 'active') {
    return 'convicted';
  }
  if (entry.sentenceStatus === 'completed' || entry.sentenceStatus === 'not_applicable') {
    return 'sentence_completed';
  }

  // Legacy records lacking sentenceStatus: check explicit case linkage first, then record age.
  if (character) {
    const crime = getSanitizedCrimeState(character);
    if (
      crime.prison &&
      crime.prison.yearsRemaining > 0 &&
      crime.prison.originCaseId === entry.id
    ) {
      return 'convicted';
    }
    if (
      crime.probation?.activeTerms?.some(
        (term) =>
          term.recordId === entry.id &&
          (term.yearsRemaining > 0 || term.communityServiceHoursRemaining > 0),
      )
    ) {
      return 'convicted';
    }
    if (entry.outcome === 'fined') {
      return 'sentence_completed';
    }
    if (entry.age + Math.max(1, entry.sentenceYears) <= character.age) {
      return 'sentence_completed';
    }
  }

  return entry.outcome === 'fined' ? 'sentence_completed' : 'convicted';
}

export function getUnpaidRestitution(character: Pick<CharacterProfile, 'crime'>): number {
  return getSanitizedCrimeState(character).unpaidRestitution ?? 0;
}

export function getTotalLegalDebt(character: Pick<CharacterProfile, 'crime'>): number {
  const sanitized = getSanitizedCrimeState(character);
  return sanitized.unpaidFines + (sanitized.unpaidRestitution ?? 0);
}

/** True when the character has an active, unexpunged adult financial dishonesty conviction (`fraud_scam`). */
export function hasFinancialFraudConviction(character: Pick<CharacterProfile, 'crime'>): boolean {
  return getActiveAdultConvictions(character).some((entry) => entry.crimeId === 'fraud_scam');
}

/** True when the character has an active, unexpunged adult violent felony conviction (`robbery` / `bank_heist`). */
export function hasViolentFelonyConviction(character: Pick<CharacterProfile, 'crime'>): boolean {
  return getActiveAdultConvictions(character).some(
    (entry) => entry.crimeId === 'robbery' || entry.crimeId === 'bank_heist',
  );
}

export type BusinessLoanGuaranteeType = 'corporate_only' | 'personally_guaranteed';

type BusinessWithLoanGuaranteeMeta = ActiveBusinessProfile & {
  loanGuaranteeType?: BusinessLoanGuaranteeType;
};

/**
 * Resolves personal vs. corporate liability for a business loan.
 * Preserves explicit `loanGuaranteeType`; for legacy saves with `outstandingLoan > 0` and
 * omitted metadata, preserves `'personally_guaranteed'` regardless of audit, public listing,
 * or equity dilution so personal liability is never silently erased.
 */
export function resolveBusinessLoanGuaranteeType(
  business: BusinessWithLoanGuaranteeMeta | null | undefined,
): BusinessLoanGuaranteeType {
  if (!business || !Number.isFinite(business.outstandingLoan) || business.outstandingLoan <= 0) {
    return 'corporate_only';
  }
  if (business.loanGuaranteeType === 'corporate_only') {
    return 'corporate_only';
  }
  if (business.loanGuaranteeType === 'personally_guaranteed') {
    return 'personally_guaranteed';
  }
  return 'personally_guaranteed';
}

/**
 * Reads and validates active residential mortgage principal directly from `character.assets`
 * without creating a runtime import dependency on `assetService.ts`.
 */
function sumValidPropertyMortgagePrincipal(
  character: Pick<CharacterProfile, 'assets'>,
): number {
  const properties = character.assets?.properties;
  if (!Array.isArray(properties)) return 0;

  let total = 0;
  for (const item of properties) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const prop = item as {
      id?: unknown;
      catalogId?: unknown;
      mortgage?: { principal?: unknown } | null;
    };
    if (typeof prop.id !== 'string' || prop.id.trim() === '') continue;
    if (typeof prop.catalogId !== 'string' || prop.catalogId.trim() === '') continue;
    const mortgage = prop.mortgage;
    if (!mortgage || typeof mortgage !== 'object' || Array.isArray(mortgage)) continue;
    if (
      typeof mortgage.principal === 'number' &&
      Number.isFinite(mortgage.principal) &&
      mortgage.principal > 0
    ) {
      total += mortgage.principal;
    }
  }
  return total;
}

/**
 * Calculates personal liabilities for personal underwriting (e.g. residential mortgages):
 * includes student debt, unpaid legal debts, personal mortgages, and business loans ONLY
 * when personally guaranteed (`corporate_only` business debt is excluded from personal DTI).
 */
export function calculatePersonalLiabilitiesForUnderwriting(
  character: Pick<CharacterProfile, 'education' | 'crime' | 'assets' | 'business'>,
): number {
  const studentDebt = Math.max(0, character.education?.studentDebt ?? 0);
  const legalDebt = getTotalLegalDebt(character);
  const mortgageDebt = sumValidPropertyMortgagePrincipal(character);
  const biz = character.business as BusinessWithLoanGuaranteeMeta | null | undefined;
  const guaranteedBusinessDebt =
    biz &&
    biz.outstandingLoan > 0 &&
    resolveBusinessLoanGuaranteeType(biz) === 'personally_guaranteed'
      ? Math.max(0, biz.outstandingLoan)
      : 0;

  return Math.round(studentDebt + legalDebt + mortgageDebt + guaranteedBusinessDebt);
}

/**
 * Estimates annual personal income for credit underwriting from civilian employment
 * (respecting any pre-trial administrative leave multiplier) and active business earnings.
 */
export function estimateAnnualUnderwritingIncome(
  character: Pick<CharacterProfile, 'career' | 'business'>,
): number {
  const job = character.career?.currentJob as
    | (NonNullable<CharacterProfile['career']['currentJob']> & {
        suspendedPendingTrial?: { payMultiplier?: number } | null;
      })
    | null
    | undefined;
  const payMult =
    job?.suspendedPendingTrial && typeof job.suspendedPendingTrial.payMultiplier === 'number'
      ? Math.max(0, Math.min(1, job.suspendedPendingTrial.payMultiplier))
      : 1;
  const jobIncome = job ? Math.round(Math.max(0, job.salary) * payMult) : 0;

  const biz = character.business;
  const bizIncome = biz
    ? Math.max(
        0,
        Math.round(
          (biz.ownerSalary ?? 0) +
            Math.max(0, biz.lastFiscalReport?.ownerDividendPaid ?? 0),
        ),
      )
    : 0;

  return jobIncome + bizIncome;
}

/**
 * Explainable financial underwriting evaluator across commercial loans, angel equity, and
 * residential mortgages. Uses real income, personal vs. corporate liabilities, liquid reserves,
 * business health, and specific conviction relevance rather than using `karma` as a credit score.
 */
export function evaluateFinancingEligibility(
  character: CharacterProfile,
  channel: FinancingChannel,
  requestedAmount = 0,
): FinancingEligibilityResult {
  const personalLiabilities = calculatePersonalLiabilitiesForUnderwriting(character);
  const annualIncome = estimateAnnualUnderwritingIncome(character);
  const normalizedRequest = Math.max(0, Math.round(requestedAmount));
  const projectedPersonalDebt =
    channel === 'mortgage' ? personalLiabilities + normalizedRequest : personalLiabilities;
  const debtToIncomeRatio =
    annualIncome > 0 ? Number((projectedPersonalDebt / annualIncome).toFixed(2)) : null;

  if (isCurrentlyIncarcerated(character)) {
    return {
      eligible: false,
      channel,
      reason: 'Financing is unavailable while incarcerated.',
      extraDownPaymentRate: 0,
      personalLiabilities,
      annualIncome,
      debtToIncomeRatio,
      criminalRecordRisk: 'incarcerated',
    };
  }

  if (hasFinancialFraudConviction(character)) {
    return {
      eligible: false,
      channel,
      reason:
        'Denied due to an active financial fraud conviction on record. Clear or expunge the conviction to restore credit access.',
      extraDownPaymentRate: 0,
      personalLiabilities,
      annualIncome,
      debtToIncomeRatio,
      criminalRecordRisk: 'fraud_blocked',
    };
  }

  const hasViolentRecord = hasViolentFelonyConviction(character);
  if (channel === 'angel_equity' && hasViolentRecord) {
    return {
      eligible: false,
      channel,
      reason:
        'Angel investors declined due to reputational risk from an active violent felony record.',
      extraDownPaymentRate: 0,
      personalLiabilities,
      annualIncome,
      debtToIncomeRatio,
      criminalRecordRisk: 'violent_caution',
    };
  }

  const totalLegalDebt = getTotalLegalDebt(character);
  const liquidAssets = Math.max(0, character.cash || 0) + Math.max(0, character.bankBalance || 0);
  const extraDownPaymentRate = hasViolentRecord && channel !== 'angel_equity' ? 0.1 : 0;
  const criminalRecordRisk = hasViolentRecord ? 'violent_caution' : 'none';

  if (channel === 'mortgage') {
    if (normalizedRequest <= 0) {
      return {
        eligible: false,
        channel,
        reason: 'Mortgage underwriting requires a positive requested loan amount.',
        extraDownPaymentRate,
        personalLiabilities,
        annualIncome,
        debtToIncomeRatio,
        criminalRecordRisk,
      };
    }

    if (totalLegalDebt > 0 && totalLegalDebt > Math.max(5000, annualIncome * 0.5)) {
      return {
        eligible: false,
        channel,
        reason: 'Mortgage denied due to high delinquent legal debt relative to income.',
        extraDownPaymentRate,
        personalLiabilities,
        annualIncome,
        debtToIncomeRatio,
        criminalRecordRisk,
      };
    }

    const maxDebtToIncomeMultiple = hasViolentRecord ? 3.5 : 5.0;
    // Proportional liquid-reserve qualification for zero-income/retired borrowers:
    // net liquid reserves after existing personal obligations cover >= 60% of requested principal.
    const netLiquidReserves = liquidAssets - personalLiabilities;
    const hasStrongCashBacking = netLiquidReserves >= normalizedRequest * 0.6;
    if (annualIncome <= 0 && !hasStrongCashBacking) {
      return {
        eligible: false,
        channel,
        reason: 'Mortgage underwriting requires verifiable income or net liquid reserves covering at least 60% of the loan.',
        extraDownPaymentRate,
        personalLiabilities,
        annualIncome,
        debtToIncomeRatio,
        criminalRecordRisk,
      };
    }

    if (
      debtToIncomeRatio !== null &&
      debtToIncomeRatio > maxDebtToIncomeMultiple &&
      !hasStrongCashBacking
    ) {
      return {
        eligible: false,
        channel,
        reason: `Personal debt-to-income ratio (${debtToIncomeRatio}x) exceeds mortgage underwriting limit (${maxDebtToIncomeMultiple}x).`,
        extraDownPaymentRate,
        personalLiabilities,
        annualIncome,
        debtToIncomeRatio,
        criminalRecordRisk,
      };
    }

    return {
      eligible: true,
      channel,
      extraDownPaymentRate,
      personalLiabilities,
      annualIncome,
      debtToIncomeRatio,
      criminalRecordRisk,
    };
  }

  if (channel === 'commercial_loan') {
    if (totalLegalDebt > 0 && totalLegalDebt > Math.max(5000, annualIncome * 0.5)) {
      return {
        eligible: false,
        channel,
        reason: 'Commercial bank loan denied due to substantial unpaid court debt.',
        extraDownPaymentRate,
        personalLiabilities,
        annualIncome,
        debtToIncomeRatio,
        criminalRecordRisk,
      };
    }

    // Corporate solvency check when an existing company carries heavy corporate leverage.
    const existingBiz = character.business;
    if (
      existingBiz &&
      existingBiz.outstandingLoan > 0 &&
      existingBiz.outstandingLoan > existingBiz.valuation * 0.9
    ) {
      return {
        eligible: false,
        channel,
        reason: 'Commercial credit denied because existing corporate debt leverage is too high.',
        extraDownPaymentRate,
        personalLiabilities,
        annualIncome,
        debtToIncomeRatio,
        criminalRecordRisk,
      };
    }

    // Commercial underwriting matches existing 25% equity/down-payment backing or manageable DTI.
    const netLiquidReserves = liquidAssets - personalLiabilities;
    const requiredReserve = normalizedRequest > 0 ? Math.round(normalizedRequest * 0.25) : 0;
    const hasReserveBacking =
      normalizedRequest > 0 ? netLiquidReserves >= requiredReserve : netLiquidReserves > 0;
    const hasIncomeBacking =
      annualIncome > 0 && (debtToIncomeRatio === null || debtToIncomeRatio <= 4.0);
    if (!hasIncomeBacking && !hasReserveBacking) {
      return {
        eligible: false,
        channel,
        reason: 'Commercial loan requires manageable income-to-debt standing or net liquid reserves covering at least 25% of the loan.',
        extraDownPaymentRate,
        personalLiabilities,
        annualIncome,
        debtToIncomeRatio,
        criminalRecordRisk,
      };
    }

    return {
      eligible: true,
      channel,
      extraDownPaymentRate,
      personalLiabilities,
      annualIncome,
      debtToIncomeRatio,
      criminalRecordRisk,
    };
  }

  // 'angel_equity': governed by founder credentials / non-fraud / non-violent standing (not karma).
  return {
    eligible: true,
    channel,
    extraDownPaymentRate: 0,
    personalLiabilities,
    annualIncome,
    debtToIncomeRatio,
    criminalRecordRisk,
  };
}


