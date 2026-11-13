import type { CharacterProfile } from '../../../types/game';
import type { CareerField } from '../../career/types';
import { isValidCrimeId } from '../data/crimeCatalog';
import type {
  CrimeEligibilityResult,
  CrimeOutcomeStatus,
  CrimeRecordEntry,
  CrimeTemplate,
  LegalJurisdiction,
  PendingCourtCase,
  PlayerCrimeState,
  PrisonSecurityLevel,
  PrisonState,
  ProbationState,
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

export function createEmptyCrimeState(): PlayerCrimeState {
  return {
    policeHeat: 0,
    notoriety: 0,
    unpaidFines: 0,
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
  const records = rawRecords.filter(isValidCrimeRecord);

  const prison = isValidPrisonState(raw.prison)
    ? {
        ...raw.prison,
        behaviorScore: clamp0to100(raw.prison.behaviorScore, 50),
        lastActionAge: toNullableAge(raw.prison.lastActionAge),
        lastProgressedAge: toNullableAge(raw.prison.lastProgressedAge),
      }
    : null;

  const probation = isValidProbationState(raw.probation)
    ? {
        ...raw.probation,
        lastProgressedAge: toNullableAge(raw.probation.lastProgressedAge),
      }
    : null;

  return {
    policeHeat: clamp0to100(raw.policeHeat, 0),
    notoriety: clamp0to100(raw.notoriety, 0),
    unpaidFines: Math.round(toFiniteNonNegative(raw.unpaidFines, 0)),
    attemptsThisYear: Math.floor(toFiniteNonNegative(raw.attemptsThisYear, 0)),
    attemptCountLifetime: Math.floor(toFiniteNonNegative(raw.attemptCountLifetime, 0)),
    lastAttemptAge: toNullableAge(raw.lastAttemptAge),
    lastProgressedAge: toNullableAge(raw.lastProgressedAge),
    pendingCase: isValidPendingCase(raw.pendingCase) ? raw.pendingCase : null,
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

export function getExpungementEligibleRecords(
  character: Pick<CharacterProfile, 'age' | 'crime'>,
  referenceAge = character.age,
): CrimeRecordEntry[] {
  if (
    isCurrentlyIncarcerated(character) ||
    isOnProbation(character) ||
    getUnpaidFines(character) > 0
  ) {
    return [];
  }

  return getActiveAdultConvictions(character).filter((entry) => {
    const yearsSinceResolution = referenceAge - (entry.age + entry.sentenceYears);
    if (entry.offenseClass === 'misdemeanor') {
      return yearsSinceResolution >= 3;
    }
    return entry.outcome !== 'imprisoned' && yearsSinceResolution >= 7;
  });
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

