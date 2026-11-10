import type { CharacterProfile, RomanticStage } from '../../../types/game';
import {
  getChildrenSelector,
  getParentsSelector,
  getPartnerSelector,
  getSiblingsSelector,
} from '../../autonomy/services/npcRegistryService';
import type { EventLifeStage, FinancialBand } from '../types';

/**
 * Named cash and student-debt thresholds. Comparisons against cash are strict.
 * Cash equal to a boundary does not fall into the lower band.
 */
export const FINANCIAL_BAND_THRESHOLDS = {
  strugglingCashBelow: 1000,
  debtToCashStruggleRatio: 4,
  debtStruggleCashBelow: 10000,
  stableCashBelow: 15000,
  comfortableCashBelow: 75000,
} as const;

export type RelationshipSource = 'legacy' | 'canonical' | 'invalid';

export type ExtensionValue = string | number | boolean;

/**
 * Read-only contribution from a future gameplay module.
 * `contribute` must not mutate character or world state, draw random numbers,
 * migrate the world, or call simulation services.
 */
export interface EventContextProvider {
  id: string;
  contribute(character: CharacterProfile): Record<string, ExtensionValue>;
}

export interface EventContextRegistry {
  providers: readonly EventContextProvider[];
}

export interface EventContext {
  age: number;
  lifeStage: EventLifeStage;
  cash: number;
  cashValid: boolean;
  studentDebt: number;
  studentDebtValid: boolean;
  financialBand: FinancialBand | null;
  karma: number;
  health: number;
  isEmployed: boolean;
  hasBusiness: boolean;
  isUnemployed: boolean;
  yearsInJob: number | null;
  relationshipSource: RelationshipSource;
  partnerStage: RomanticStage | null;
  hasPartner: boolean | null;
  hasSpouse: boolean | null;
  livingChildren: number | null;
  schoolAgeChildren: number | null;
  livingParents: number | null;
  livingSiblings: number | null;
  seenEventIds: readonly string[];
  /** Primitive copies of journal rows in the prior three years. Not the live timeline. */
  recentTimeline: readonly RecentTimelineEntry[];
  extensions: Record<string, Record<string, ExtensionValue>>;
  failedProviderIds: readonly string[];
}

/** A detached journal row used only for anti-repetition counts. */
export interface RecentTimelineEntry {
  age: number;
  title: string;
  category: string;
}

const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const EXTENSION_KEY_PATTERN = /^[a-z][a-z0-9_]{0,40}$/;
const RECENT_TIMELINE_YEARS = 3;
const RECENT_TIMELINE_LIMIT = 24;

/** Code-unit order for restricted lowercase ASCII ids. Not localeCompare. */
export function compareAsciiId(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function getEventLifeStage(age: number): EventLifeStage {
  if (age <= 12) return 'childhood';
  if (age <= 17) return 'teens';
  if (age <= 39) return 'adulthood';
  if (age <= 64) return 'middle_age';
  return 'old_age';
}

export function createEventContextRegistry(
  providers: readonly EventContextProvider[]
): EventContextRegistry {
  const seen = new Set<string>();
  for (const provider of providers) {
    if (!PROVIDER_ID_PATTERN.test(provider.id)) {
      throw new Error(`Invalid event context provider id: ${provider.id}`);
    }
    if (seen.has(provider.id)) {
      throw new Error(`Duplicate event context provider id: ${provider.id}`);
    }
    seen.add(provider.id);
  }
  return { providers: [...providers] };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isExtensionValue(value: unknown): value is ExtensionValue {
  return typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number';
}

export function financialBandFor(age: number, cash: number, studentDebt: number): FinancialBand {
  if (age < 18) return 'dependent';
  const thresholds = FINANCIAL_BAND_THRESHOLDS;
  if (cash < thresholds.strugglingCashBelow) return 'struggling';
  if (
    studentDebt > cash * thresholds.debtToCashStruggleRatio &&
    cash < thresholds.debtStruggleCashBelow
  ) {
    return 'struggling';
  }
  if (cash < thresholds.stableCashBelow) return 'stable';
  if (cash < thresholds.comfortableCashBelow) return 'comfortable';
  return 'wealthy';
}

function relationshipSourceOf(character: CharacterProfile): RelationshipSource {
  const world = character.worldState;
  if (!world || world.schemaVersion !== 2) return 'legacy';
  if (typeof character.id !== 'string' || character.id.trim() === '') return 'invalid';
  if (
    !isPlainRecord(world.npcRegistry) ||
    !isPlainRecord(world.relationshipsById) ||
    !isPlainRecord(world.relationshipIndex)
  ) {
    return 'invalid';
  }
  return 'canonical';
}

function isUnemployed(character: CharacterProfile): boolean {
  if (character.age < 18) return false;
  if (character.career?.currentJob) return false;
  if (character.business) return false;
  const stage = character.education?.currentStage;
  if (stage === 'university' || stage === 'professional_school') return false;
  if (character.occupation === 'Retired' || character.occupation === 'Retired Entrepreneur') {
    return false;
  }
  return true;
}

function yearsInJobOf(character: CharacterProfile): number | null {
  const years = character.career?.currentJob?.yearsInJob;
  if (typeof years !== 'number' || !Number.isFinite(years) || years < 0) return null;
  return years;
}

interface RelationshipFacts {
  partnerStage: RomanticStage | null;
  hasPartner: boolean | null;
  hasSpouse: boolean | null;
  livingChildren: number | null;
  schoolAgeChildren: number | null;
  livingParents: number | null;
  livingSiblings: number | null;
}

function emptyRelationshipFacts(): RelationshipFacts {
  return {
    partnerStage: null,
    hasPartner: null,
    hasSpouse: null,
    livingChildren: null,
    schoolAgeChildren: null,
    livingParents: null,
    livingSiblings: null,
  };
}

function countSchoolAge(ages: number[]): number {
  return ages.filter((age) => age >= 5 && age <= 17).length;
}

function legacyRelationshipFacts(character: CharacterProfile): RelationshipFacts {
  const partner = character.partner ?? null;
  const partnerStage = partner?.romanticStage ?? 'none';
  const livingChildren = (character.children ?? []).filter((child) => child.isAlive);
  const livingParents =
    (character.parents?.father?.isAlive ? 1 : 0) + (character.parents?.mother?.isAlive ? 1 : 0);
  const livingSiblings = (character.siblings ?? []).filter((sibling) => sibling.isAlive).length;
  return {
    partnerStage,
    hasPartner: partner !== null,
    hasSpouse:
      partner !== null &&
      (partner.romanticStage === 'married' || partner.relationshipType === 'spouse'),
    livingChildren: livingChildren.length,
    schoolAgeChildren: countSchoolAge(livingChildren.map((child) => child.age)),
    livingParents,
    livingSiblings,
  };
}

function canonicalRelationshipFacts(character: CharacterProfile): RelationshipFacts {
  const partner = getPartnerSelector(character);
  const partnerStage =
    partner?.romanticStage === 'married' ||
    partner?.romanticStage === 'engaged' ||
    partner?.romanticStage === 'dating'
      ? partner.romanticStage
      : 'none';
  const livingChildren = getChildrenSelector(character).filter((child) => child.isAlive);
  const livingParents = getParentsSelector(character, { viewerId: character.id }).filter(
    (parent) => parent.npc.isAlive
  ).length;
  const livingSiblings = getSiblingsSelector(character).filter((sibling) => sibling.isAlive).length;
  return {
    partnerStage: partner ? partnerStage : 'none',
    hasPartner: partner !== null,
    hasSpouse: partnerStage === 'married',
    livingChildren: livingChildren.length,
    schoolAgeChildren: countSchoolAge(livingChildren.map((child) => child.age)),
    livingParents,
    livingSiblings,
  };
}

function recentTimelineOf(character: CharacterProfile): RecentTimelineEntry[] {
  if (typeof character.age !== 'number' || !Number.isFinite(character.age)) return [];
  const timeline = character.timeline as unknown;
  if (!Array.isArray(timeline)) return [];

  const currentAge = character.age;
  const oldestAge = currentAge - RECENT_TIMELINE_YEARS;
  const qualified: Array<RecentTimelineEntry & { index: number }> = [];

  for (let index = 0; index < timeline.length; index += 1) {
    const entry: unknown = timeline[index];
    if (!isPlainRecord(entry)) continue;
    const age = entry.age;
    if (typeof age !== 'number' || !Number.isFinite(age) || age < oldestAge || age >= currentAge) {
      continue;
    }
    if (typeof entry.title !== 'string') continue;
    const title = entry.title.trim();
    if (title === '') continue;
    if (typeof entry.category !== 'string') continue;
    qualified.push({ age, title, category: entry.category, index });
  }

  qualified.sort((left, right) => left.age - right.age || left.index - right.index);
  return qualified
    .slice(-RECENT_TIMELINE_LIMIT)
    .map(({ age, title, category }) => ({ age, title, category }));
}

function collectExtensions(
  character: CharacterProfile,
  registry: EventContextRegistry
): { extensions: EventContext['extensions']; failedProviderIds: string[] } {
  const extensions: EventContext['extensions'] = {};
  const failedProviderIds: string[] = [];
  const providers = [...registry.providers].sort((left, right) => compareAsciiId(left.id, right.id));

  for (const provider of providers) {
    let raw: Record<string, ExtensionValue>;
    try {
      raw = provider.contribute(character);
    } catch {
      extensions[provider.id] = {};
      failedProviderIds.push(provider.id);
      continue;
    }

    const keys = Object.keys(raw)
      .filter((key) => EXTENSION_KEY_PATTERN.test(key) && isExtensionValue(raw[key]))
      .sort(compareAsciiId);
    const bag: Record<string, ExtensionValue> = {};
    for (const key of keys) {
      bag[key] = raw[key];
    }
    extensions[provider.id] = bag;
  }

  return { extensions, failedProviderIds };
}

/**
 * Builds a read-only snapshot. Does not write to the character, migrate a missing
 * world, or draw random numbers. Callers pass the composition registry.
 */
export function buildEventContext(
  character: CharacterProfile,
  registry: EventContextRegistry
): EventContext {
  const cashValid = isValidMoney(character.cash);
  const studentDebtValid = isValidMoney(character.education?.studentDebt);
  const source = relationshipSourceOf(character);
  const relationships =
    source === 'legacy'
      ? legacyRelationshipFacts(character)
      : source === 'canonical'
        ? canonicalRelationshipFacts(character)
        : emptyRelationshipFacts();
  const { extensions, failedProviderIds } = collectExtensions(character, registry);
  const currentJob = character.career?.currentJob;

  return {
    age: character.age,
    lifeStage: getEventLifeStage(character.age),
    cash: character.cash,
    cashValid,
    studentDebt: character.education?.studentDebt ?? Number.NaN,
    studentDebtValid,
    financialBand:
      cashValid && studentDebtValid
        ? financialBandFor(character.age, character.cash, character.education.studentDebt)
        : null,
    karma: character.stats.karma,
    health: character.stats.health,
    isEmployed: Boolean(currentJob || character.business),
    hasBusiness: Boolean(character.business),
    isUnemployed: isUnemployed(character),
    yearsInJob: yearsInJobOf(character),
    relationshipSource: source,
    ...relationships,
    seenEventIds: [...(character.seenEventIds ?? [])],
    recentTimeline: recentTimelineOf(character),
    extensions,
    failedProviderIds,
  };
}
