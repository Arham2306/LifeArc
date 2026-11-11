import type { CharacterProfile, LifeEvent, StatEffects } from '../../../types/game';
import { applyEffects } from '../../character/services/statService';
import { createId } from '../../../utils/id';
import {
  CONDITION_PRIORITY,
  getConditionListing,
  isConditionEligible,
} from '../data/conditionCatalog';
import type {
  ConditionId,
  ConditionRecord,
  PlayerHealthcare,
  VisitRecord,
} from '../types';

export const DOCTOR_MIN_AGE = 6;
export const CONSULT_PRICE = 60;
export const OPEN_CONDITION_CAP = 2;
export const VISIT_HISTORY_CAP = 8;
export const CLOSED_HISTORY_CAP = 8;

const CLOSURES = ['recovered', 'resolved', 'displaced'] as const;
const TEMPORARY_LOWEST_FIRST: readonly ConditionId[] = ['cold', 'ankle', 'chest'];

export interface HealthcareResult {
  character: CharacterProfile;
  ok: boolean;
  reason?: string;
}

function finiteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function optionalAge(record: Record<string, unknown>, key: string): boolean {
  if (!(key in record) || record[key] === undefined) return true;
  return finiteInteger(record[key]) && (record[key] as number) >= 0;
}

function optionalBoolean(record: Record<string, unknown>, key: string): boolean {
  if (!(key in record) || record[key] === undefined) return true;
  return typeof record[key] === 'boolean';
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function spendableCash(character: CharacterProfile): number {
  return typeof character.cash === 'number' && Number.isFinite(character.cash) && character.cash > 0
    ? character.cash
    : 0;
}

function fail(character: CharacterProfile, reason: string): HealthcareResult {
  return { character, ok: false, reason };
}

function rawConditions(character: CharacterProfile): unknown[] {
  const conditions = character.healthcare?.conditions;
  return Array.isArray(conditions) ? conditions : [];
}

function rawVisits(character: CharacterProfile): unknown[] {
  const visits = character.healthcare?.visits;
  return Array.isArray(visits) ? visits : [];
}

export function isValidCondition(value: unknown): value is ConditionRecord {
  if (!isPlainRecord(value)) return false;
  if (!nonEmptyString(value.id)) return false;
  if (typeof value.catalogId !== 'string' || !getConditionListing(value.catalogId)) return false;
  if (value.status !== 'undiagnosed' && value.status !== 'known' && value.status !== 'closed') return false;
  if (!finiteInteger(value.acquiredAtAge) || value.acquiredAtAge < 0) return false;
  if (!nonEmptyString(value.symptom)) return false;
  if (!finiteInteger(value.untreatedYears) || value.untreatedYears < 0) return false;
  if (!optionalAge(value, 'diagnosedAtAge')) return false;
  if (!optionalAge(value, 'declinedAtAge')) return false;
  if (!optionalAge(value, 'treatedAtAge')) return false;
  if (!optionalAge(value, 'coverageThroughAge')) return false;
  if (!optionalBoolean(value, 'procedureCompleted')) return false;
  if (!optionalBoolean(value, 'enrolled')) return false;
  if (value.closure !== undefined && !CLOSURES.includes(value.closure as (typeof CLOSURES)[number])) {
    return false;
  }
  if (value.status === 'closed') {
    if (!finiteInteger(value.closedAtAge) || value.closedAtAge < 0) return false;
    if (!CLOSURES.includes(value.closure as (typeof CLOSURES)[number])) return false;
  } else if (!optionalAge(value, 'closedAtAge')) {
    return false;
  }
  return true;
}

export function isValidVisit(value: unknown): value is VisitRecord {
  if (!isPlainRecord(value)) return false;
  if (!nonEmptyString(value.id)) return false;
  if (!finiteInteger(value.age) || value.age < 0) return false;
  if (value.kind !== 'checkup' && value.kind !== 'treatment') return false;
  if (!finiteInteger(value.pricePaid) || value.pricePaid < 0) return false;
  if (value.catalogId !== undefined && (typeof value.catalogId !== 'string' || !getConditionListing(value.catalogId))) {
    return false;
  }
  if (!optionalBoolean(value, 'complimentary')) return false;
  return true;
}

export function openConditions(character: CharacterProfile): ConditionRecord[] {
  return rawConditions(character).filter(
    (entry): entry is ConditionRecord => isValidCondition(entry) && entry.status !== 'closed',
  );
}

function previewHealth(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function newCondition(catalogId: ConditionId, acquiredAtAge: number): ConditionRecord {
  const listing = getConditionListing(catalogId);
  return {
    id: `${catalogId}-${acquiredAtAge}`,
    catalogId,
    status: 'undiagnosed',
    acquiredAtAge,
    symptom: listing?.symptom ?? '',
    untreatedYears: 0,
  };
}

function trimByAge<T extends { age?: number; closedAtAge?: number }>(
  rows: unknown[],
  cap: number,
  isValid: (value: unknown) => value is T,
  ageOf: (value: T) => number,
): unknown[] {
  const validIndexes: number[] = [];
  rows.forEach((entry, index) => {
    if (isValid(entry)) validIndexes.push(index);
  });
  if (validIndexes.length <= cap) return rows;
  const ranked = validIndexes.slice().sort((left, right) => {
    const ageLeft = ageOf(rows[left] as T);
    const ageRight = ageOf(rows[right] as T);
    if (ageLeft !== ageRight) return ageLeft - ageRight;
    return left - right;
  });
  const drop = new Set(ranked.slice(0, validIndexes.length - cap));
  return rows.filter((_, index) => !drop.has(index));
}

function trimVisits(visits: unknown[]): unknown[] {
  return trimByAge(visits, VISIT_HISTORY_CAP, isValidVisit, (visit) => visit.age);
}

function trimClosed(conditions: unknown[]): unknown[] {
  return trimByAge(
    conditions,
    CLOSED_HISTORY_CAP,
    (value): value is ConditionRecord => isValidCondition(value) && value.status === 'closed',
    (condition) => condition.closedAtAge ?? 0,
  );
}

/**
 * Chooses at most one new concern for a later Age Up. Not called from Age Up.
 * `health` is the projected health after drift and before any condition delta.
 * A projection of 0 acquires nothing and displaces nothing.
 * A heart may displace the lowest-priority temporary when both slots are already open.
 */
export function acquireForYear(conditions: unknown[], health: number, nextAge: number): unknown[] {
  if (!Array.isArray(conditions)) return conditions;
  if (!Number.isInteger(nextAge) || nextAge < DOCTOR_MIN_AGE || !Number.isFinite(health)) return conditions;

  const preview = previewHealth(health);
  if (preview === 0) return conditions;
  const open = conditions.filter(
    (entry): entry is ConditionRecord => isValidCondition(entry) && entry.status !== 'closed',
  );
  const openIds = new Set(open.map((entry) => entry.catalogId));
  const candidate = CONDITION_PRIORITY.find(
    (id) => !openIds.has(id) && isConditionEligible(id, preview, nextAge),
  );
  if (!candidate) return conditions;

  if (open.length >= OPEN_CONDITION_CAP) {
    if (candidate !== 'heart') return conditions;
    const victimId = TEMPORARY_LOWEST_FIRST.find((id) => openIds.has(id));
    if (!victimId) return conditions;
    let displaced = false;
    const updated = conditions.map((entry) => {
      if (
        displaced
        || !isValidCondition(entry)
        || entry.status === 'closed'
        || entry.catalogId !== victimId
      ) {
        return entry;
      }
      displaced = true;
      return {
        ...entry,
        status: 'closed' as const,
        closedAtAge: nextAge,
        closure: 'displaced' as const,
      };
    });
    if (!displaced) return conditions;
    return trimClosed([...updated, newCondition(candidate, nextAge)]);
  }

  return [...conditions, newCondition(candidate, nextAge)];
}

function listPhrases(ids: ConditionId[]): string {
  const phrases = ids.map((id) => getConditionListing(id)?.phrase ?? id);
  if (phrases.length <= 1) return phrases[0] ?? '';
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`;
  return `${phrases.slice(0, -1).join(', ')}, and ${phrases[phrases.length - 1]}`;
}

function findingSentence(named: ConditionId[], knownAlready: number): string {
  if (named.length > 0) return `The doctor finds ${listPhrases(named)}.`;
  if (knownAlready > 0) return 'The doctor finds nothing new.';
  return 'The doctor finds nothing on your record.';
}

function journal(character: CharacterProfile, message: string): LifeEvent {
  return {
    id: createId(),
    age: character.age,
    year: character.birthYear + character.age,
    title: 'Doctor',
    message,
    category: 'health',
  };
}

function shortCashReason(character: CharacterProfile): string {
  return `A visit costs $${CONSULT_PRICE}. You have $${spendableCash(character)}. The bank is not used.`;
}

export function consultDoctor(character: CharacterProfile): HealthcareResult {
  if (!character.isAlive) return fail(character, 'You cannot see a doctor.');
  if (!Number.isInteger(character.age) || character.age < DOCTOR_MIN_AGE) {
    return fail(character, 'You can see a doctor from age 6.');
  }
  if (character.healthcare?.lastConsultAge === character.age) {
    return fail(character, 'You already saw the doctor this year.');
  }

  const existing = character.healthcare;
  if (existing) {
    if (!Array.isArray(existing.conditions) || !Array.isArray(existing.visits)) {
      return fail(character, 'Your medical record cannot be read.');
    }
  }

  const complimentary = character.age < 16;
  const price = complimentary ? 0 : CONSULT_PRICE;
  if (price > 0 && spendableCash(character) < price) return fail(character, shortCashReason(character));

  const before = rawConditions(character);
  const named: ConditionId[] = [];
  const diagnosed = before.map((entry) => {
    if (!isValidCondition(entry) || entry.status !== 'undiagnosed') return entry;
    named.push(entry.catalogId);
    return { ...entry, status: 'known' as const, diagnosedAtAge: character.age };
  });
  const knownAlready = before.filter(
    (entry) => isValidCondition(entry) && entry.status === 'known',
  ).length;

  const visit: VisitRecord = {
    id: createId(),
    age: character.age,
    kind: 'checkup',
    pricePaid: price,
    ...(complimentary ? { complimentary: true } : {}),
  };
  const healthcare: PlayerHealthcare = {
    conditions: diagnosed,
    visits: trimVisits([...rawVisits(character), visit]),
    lastConsultAge: character.age,
  };
  const finding = findingSentence(named, knownAlready);
  const message = complimentary
    ? `You saw the doctor. ${finding}`
    : `You paid $${CONSULT_PRICE} to see the doctor. ${finding}`;

  const recorded = price > 0
    ? applyEffects({ ...character, healthcare }, { cash: -price }).character
    : { ...character, healthcare };

  return {
    ok: true,
    character: {
      ...recorded,
      timeline: [...recorded.timeline, journal(character, message)],
    },
  };
}

/** A chest course bought this year stays known until a later Age Up closes it. */
export function chestCourseAwaitingClose(condition: ConditionRecord): boolean {
  return condition.catalogId === 'chest'
    && condition.status === 'known'
    && finiteInteger(condition.treatedAtAge);
}

function priceReason(price: number, character: CharacterProfile): string {
  return `That costs $${price}. You have $${spendableCash(character)}. The bank is not used.`;
}

function coverageIncludes(condition: ConditionRecord, age: number): boolean {
  return finiteInteger(condition.coverageThroughAge) && condition.coverageThroughAge >= age;
}

function knownConcern(
  character: CharacterProfile,
  conditionId: string,
  blocked: string,
): { ok: true; condition: ConditionRecord } | { ok: false; result: HealthcareResult } {
  if (!character.isAlive || !Number.isInteger(character.age)) {
    return { ok: false, result: fail(character, blocked) };
  }
  const existing = character.healthcare;
  if (existing && (!Array.isArray(existing.conditions) || !Array.isArray(existing.visits))) {
    return { ok: false, result: fail(character, 'Your medical record cannot be read.') };
  }
  const open = openConditions(character).find((entry) => entry.id === conditionId);
  if (!open) {
    const closed = rawConditions(character).some(
      (entry) => isValidCondition(entry) && entry.id === conditionId && entry.status === 'closed',
    );
    return {
      ok: false,
      result: fail(character, closed ? 'That concern has already closed.' : 'That concern is not on your record.'),
    };
  }
  if (open.status !== 'known') {
    return { ok: false, result: fail(character, 'The doctor has not named that yet.') };
  }
  return { ok: true, condition: open };
}

function replaceOpen(conditions: unknown[], conditionId: string, next: ConditionRecord): unknown[] {
  let replaced = false;
  return conditions.map((entry) => {
    if (replaced || !isValidCondition(entry) || entry.status === 'closed' || entry.id !== conditionId) {
      return entry;
    }
    replaced = true;
    return next;
  });
}

function treatmentVisit(character: CharacterProfile, price: number, catalogId: ConditionId): VisitRecord {
  return {
    id: createId(),
    age: character.age,
    kind: 'treatment',
    pricePaid: price,
    catalogId,
  };
}

function recordChange(
  character: CharacterProfile,
  conditions: unknown[],
  visit: VisitRecord | null,
  effects: StatEffects,
  message: string,
): HealthcareResult {
  const previous = character.healthcare;
  const healthcare: PlayerHealthcare = {
    ...(previous ?? { conditions: [], visits: [] }),
    conditions,
    visits: visit ? trimVisits([...rawVisits(character), visit]) : rawVisits(character),
  };
  const hasEffect = effects.cash !== undefined || effects.health !== undefined || effects.happiness !== undefined;
  const recorded = hasEffect
    ? applyEffects({ ...character, healthcare }, effects).character
    : { ...character, healthcare };
  return {
    ok: true,
    character: {
      ...recorded,
      timeline: [...recorded.timeline, journal(character, message)],
    },
  };
}

export function startTreatment(character: CharacterProfile, conditionId: string): HealthcareResult {
  const located = knownConcern(character, conditionId, 'You cannot start treatment.');
  if (!located.ok) return located.result;
  const condition = located.condition;
  const listing = getConditionListing(condition.catalogId);
  if (!listing) return fail(character, 'That concern is not on your record.');

  if (condition.catalogId === 'heart') {
    if (condition.procedureCompleted) return fail(character, 'That treatment is already done.');
    const price = listing.procedurePrice ?? 0;
    if (spendableCash(character) < price) return fail(character, priceReason(price, character));
    const next: ConditionRecord = {
      ...condition,
      treatedAtAge: character.age,
      procedureCompleted: true,
    };
    return recordChange(
      character,
      replaceOpen(rawConditions(character), condition.id, next),
      treatmentVisit(character, price, condition.catalogId),
      { cash: -price },
      `You paid $${price} for ${listing.phrase}. Health changed by 0.`,
    );
  }

  if (listing.remedyPrice === null) return fail(character, 'That care is a yearly enrollment.');
  if (condition.treatedAtAge !== undefined) return fail(character, 'That treatment is already done.');

  const price = listing.remedyPrice;
  if (spendableCash(character) < price) return fail(character, priceReason(price, character));
  const closes = condition.catalogId !== 'chest';
  const next: ConditionRecord = {
    ...condition,
    treatedAtAge: character.age,
    ...(closes
      ? { status: 'closed' as const, closedAtAge: character.age, closure: 'recovered' as const }
      : {}),
  };
  const effects: StatEffects = { cash: -price };
  if (listing.remedyHealth !== 0) effects.health = listing.remedyHealth;
  return recordChange(
    character,
    trimClosed(replaceOpen(rawConditions(character), condition.id, next)),
    treatmentVisit(character, price, condition.catalogId),
    effects,
    `You paid $${price} for ${listing.phrase}. Health changed by ${listing.remedyHealth}.`,
  );
}

export function declineTreatment(character: CharacterProfile, conditionId: string): HealthcareResult {
  const located = knownConcern(character, conditionId, 'You cannot decline treatment.');
  if (!located.ok) return located.result;
  const condition = located.condition;
  const listing = getConditionListing(condition.catalogId);
  if (!listing) return fail(character, 'That concern is not on your record.');
  if (condition.enrolled) return fail(character, 'Cancel the renewal if you want to stop that care.');
  if (condition.catalogId === 'chest' && condition.treatedAtAge !== undefined) {
    return fail(character, 'The course is already underway.');
  }
  if (condition.treatedAtAge !== undefined || condition.procedureCompleted) {
    return fail(character, 'That treatment is already done.');
  }
  if (condition.declinedAtAge === character.age) {
    return fail(character, 'You already turned that down this year.');
  }
  const next: ConditionRecord = { ...condition, declinedAtAge: character.age };
  return recordChange(
    character,
    replaceOpen(rawConditions(character), condition.id, next),
    null,
    {},
    `You decided to wait on ${listing.phrase}.`,
  );
}

export function enrollCare(character: CharacterProfile, conditionId: string): HealthcareResult {
  const located = knownConcern(character, conditionId, 'You cannot enroll in that care.');
  if (!located.ok) return located.result;
  const condition = located.condition;
  const listing = getConditionListing(condition.catalogId);
  if (!listing || listing.enrollPrice === null) return fail(character, 'That concern is treated once.');
  if (condition.catalogId === 'heart' && !condition.procedureCompleted) {
    return fail(character, 'The procedure has to come first.');
  }
  if (condition.enrolled && coverageIncludes(condition, character.age)) {
    return fail(character, 'That care is already enrolled for this year.');
  }

  const alreadyPaid = coverageIncludes(condition, character.age);
  const price = alreadyPaid ? 0 : listing.enrollPrice;
  if (price > 0 && spendableCash(character) < price) return fail(character, priceReason(price, character));

  const next: ConditionRecord = {
    ...condition,
    enrolled: true,
    coverageThroughAge: alreadyPaid ? condition.coverageThroughAge : character.age,
  };
  const message = alreadyPaid
    ? `${listing.phrase} is already paid for this year. Nothing more was charged.`
    : `You paid $${price} for ${listing.phrase}. Health changed by 0. This year is covered. Renewal is $${listing.enrollPrice} from cash on your birthday.`;
  return recordChange(
    character,
    replaceOpen(rawConditions(character), condition.id, next),
    treatmentVisit(character, price, condition.catalogId),
    price > 0 ? { cash: -price } : {},
    message,
  );
}

export function cancelEnrollment(character: CharacterProfile, conditionId: string): HealthcareResult {
  const located = knownConcern(character, conditionId, 'You cannot change that care.');
  if (!located.ok) return located.result;
  const condition = located.condition;
  const listing = getConditionListing(condition.catalogId);
  if (!listing || listing.enrollPrice === null) return fail(character, 'That care is not enrolled.');
  if (!condition.enrolled) return fail(character, 'That care is not enrolled.');

  const next: ConditionRecord = { ...condition, enrolled: false };
  const covered = coverageIncludes(condition, character.age);
  const message = covered
    ? `You stopped ${listing.phrase} from renewing. This year stays covered, and nothing was refunded.`
    : `You stopped ${listing.phrase} from renewing. Nothing was refunded.`;
  return recordChange(
    character,
    replaceOpen(rawConditions(character), condition.id, next),
    null,
    {},
    message,
  );
}
