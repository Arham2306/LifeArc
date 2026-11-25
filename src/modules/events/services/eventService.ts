import type { CharacterProfile, ChildProfile, LifeEvent, LifeEventCategory, PersonProfile, StatEffects } from '../../../types/game'
import type { EventChoice, EventOutcome, LifeEventTemplate, QueuedLifeEvent } from '../types'
import { EVENT_POOL } from '../data'
import { applyEffects } from '../../character/services/statService'
import { WEALTH_META } from '../../character/services/familyService'
import { getChildrenSelector } from '../../autonomy/services/npcRegistryService'
import { isCurrentlyIncarcerated } from '../../crime/services/crimeSelectors'
import { chance, pickWeighted } from '../../../utils/random'
import { createId } from '../../../utils/id'
import { gameEventContextRegistry } from '../../../composition/eventContextRegistry'
import { buildEventContext, type EventContextRegistry } from './eventContext'
import { isEventEligible, type EventEligibilityOptions } from './eventEligibility'
import { scoreEventWeight } from './eventWeight'

/** Chance that an interactive event pops up on single-event roll calls. */
export const EVENT_TRIGGER_CHANCE = 0.7;

/** Characters younger than this don't get interactive events. */
export const MIN_EVENT_AGE = 1;

/** Penalty applied when a category has already appeared in the same year's event batch. */
export const SAME_YEAR_CATEGORY_DIVERSITY_FACTOR = 0.25;

export interface YearlyEventRollOptions extends EventEligibilityOptions {
  /** Overrides rolled count (useful for deterministic unit tests). */
  countOverride?: number;
  /** Optional deterministic RNG in [0, 1). Defaults to Math.random. */
  rng?: () => number;
}

const clampStat = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function isChildTargetedEvent(event: LifeEventTemplate): boolean {
  const req = event.requires;
  if (!req) return false;
  return (
    (req.minChildren !== undefined && req.minChildren > 0) ||
    req.requiresSchoolAgeChild === true ||
    req.childMinAge !== undefined ||
    req.childMaxAge !== undefined
  );
}

function getLivingChildrenList(character: CharacterProfile): ChildProfile[] {
  const legacy = (character.children ?? []).filter((c) => c.isAlive);
  if (legacy.length > 0 || character.worldState?.schemaVersion !== 2) {
    return legacy;
  }
  return getChildrenSelector(character).filter((c) => c.isAlive);
}

/** Returns living children matching a child-targeted event's age-band gates. */
export function getMatchingLivingChildren(
  character: CharacterProfile,
  event: LifeEventTemplate,
): ChildProfile[] {
  const living = getLivingChildrenList(character);
  const req = event.requires;
  if (!req) return living;

  return living.filter((child) => {
    if (req.requiresSchoolAgeChild && (child.age < 5 || child.age > 17)) {
      return false;
    }
    if (req.childMinAge !== undefined && child.age < req.childMinAge) {
      return false;
    }
    if (req.childMaxAge !== undefined && child.age > req.childMaxAge) {
      return false;
    }
    return true;
  });
}

/** Resolves the bound living child (preferring `boundChildId` when still eligible). */
export function findContextualChild(
  character: CharacterProfile,
  event: LifeEventTemplate,
  boundChildId?: string,
): ChildProfile | undefined {
  const matching = getMatchingLivingChildren(character, event);
  if (matching.length === 0) return undefined;
  if (boundChildId) {
    const exact = matching.find((c) => c.id === boundChildId);
    if (exact) return exact;
  }
  return matching[0];
}

export function findContextualPeer(
  character: CharacterProfile,
  context?: 'classmate' | 'coworker' | 'friend'
): PersonProfile | undefined {
  const rels = character.relationships || [];
  if (rels.length === 0) return undefined;

  if (context === 'coworker') {
    return (
      rels.find((r) => r.cohortType === 'coworker' || r.role.toLowerCase().includes('coworker')) ||
      rels[0]
    );
  }
  if (context === 'classmate') {
    return (
      rels.find((r) => r.cohortType === 'classmate' || r.role.toLowerCase().includes('classmate')) ||
      rels[0]
    );
  }
  return rels[0];
}

/** Replaces placeholders like {firstName}, {fatherName}, {motherName}, {jobTitle}, {companyName}, {peerName}, {childFirstName}, etc. */
export function formatEventText(
  text: string,
  character: CharacterProfile,
  boundPerson?: PersonProfile,
  boundChild?: ChildProfile,
): string {
  const currentJob = character.career?.currentJob;
  const companyName =
    currentJob?.companyName || character.business?.name || 'your workplace';
  const jobTitle =
    currentJob?.title || (character.business ? 'Founder & CEO' : 'worker');

  let peer = boundPerson;
  if (!peer) {
    if (text.includes('{coworkerName}')) {
      peer = findContextualPeer(character, 'coworker');
    } else if (text.includes('{classmateName}') || text.includes('{peerName}') || text.includes('{peerFirstName}')) {
      peer = findContextualPeer(character, 'classmate');
    }
  }

  const peerFullName = peer ? `${peer.firstName} ${peer.lastName}` : 'your peer';
  const peerFirstName = peer ? peer.firstName : 'your friend';
  const peerPronoun = peer?.gender === 'female' ? 'she' : 'he';
  const peerPossessive = peer?.gender === 'female' ? 'her' : 'his';
  const peerObjective = peer?.gender === 'female' ? 'her' : 'him';

  const child =
    boundChild ??
    (text.includes('{child') ? getLivingChildrenList(character)[0] : undefined);
  const childFirstName = child ? child.firstName : 'your child';
  const childFullName = child ? `${child.firstName} ${child.lastName}` : 'your child';
  const childAge = child ? String(child.age) : '';
  const childIsFemale = child?.gender === 'female';
  const childRole = child ? (childIsFemale ? 'daughter' : 'son') : 'child';
  const childPronoun = child ? (childIsFemale ? 'she' : 'he') : 'they';
  const childPronounCap = child ? (childIsFemale ? 'She' : 'He') : 'They';
  const childPossessive = child ? (childIsFemale ? 'her' : 'his') : 'their';
  const childObjective = child ? (childIsFemale ? 'her' : 'him') : 'them';

  return text
    .replace(/\{firstName\}/g, character.firstName)
    .replace(/\{lastName\}/g, character.lastName)
    .replace(/\{fatherName\}/g, character.parents.father.firstName)
    .replace(/\{motherName\}/g, character.parents.mother.firstName)
    .replace(/\{jobTitle\}/g, jobTitle)
    .replace(/\{companyName\}/g, companyName)
    .replace(/\{peerName\}/g, peerFullName)
    .replace(/\{peerFirstName\}/g, peerFirstName)
    .replace(/\{classmateName\}/g, peerFullName)
    .replace(/\{coworkerName\}/g, peerFullName)
    .replace(/\{peerPronoun\}/g, peerPronoun)
    .replace(/\{peerPossessive\}/g, peerPossessive)
    .replace(/\{peerObjective\}/g, peerObjective)
    .replace(/\{childName\}/g, childFullName)
    .replace(/\{childFirstName\}/g, childFirstName)
    .replace(/\{childAge\}/g, childAge)
    .replace(/\{childRole\}/g, childRole)
    .replace(/\{childPronoun\}/g, childPronoun)
    .replace(/\{childPronounCap\}/g, childPronounCap)
    .replace(/\{childPossessive\}/g, childPossessive)
    .replace(/\{childObjective\}/g, childObjective);
}

/** All events that can currently happen to this character. */
export function getEligibleEvents(
  character: CharacterProfile,
  registry: EventContextRegistry = gameEventContextRegistry,
  options?: EventEligibilityOptions
): LifeEventTemplate[] {
  if (!character.isAlive) return [];
  const context = buildEventContext(character, registry);
  return EVENT_POOL.filter((event) => isEventEligible(event, character, context, options));
}

/** Rolls the dice to see if an event happens this year, and which one. */
export function rollEventForCharacter(
  character: CharacterProfile,
  triggerChance: number = EVENT_TRIGGER_CHANCE,
  options?: EventEligibilityOptions
): LifeEventTemplate | null {
  if (!character.isAlive || character.age < MIN_EVENT_AGE) return null;
  if (!chance(triggerChance)) return null;

  const eligible = getEligibleEvents(character, gameEventContextRegistry, options);
  if (eligible.length === 0) return null;

  const context = buildEventContext(character, gameEventContextRegistry);
  const interactiveTitles = new Set(EVENT_POOL.map((event) => event.title));
  const weighted = eligible.map((event) => ({
    ...event,
    weight: scoreEventWeight(event, context, interactiveTitles),
  }));
  return pickWeighted(weighted);
}

/** Determines how many events (1–3) to surface for the character this year. */
export function determineYearlyEventTargetCount(
  character: CharacterProfile,
  options?: YearlyEventRollOptions,
): number {
  if (!character.isAlive || character.age < MIN_EVENT_AGE) return 0;
  if (options?.countOverride !== undefined) {
    return Math.max(0, Math.floor(options.countOverride));
  }

  const rng = options?.rng ?? Math.random;
  const roll = rng();

  const incarceratedThisYear = Boolean(
    options?.incarceratedThisYear ?? isCurrentlyIncarcerated(character)
  );
  if (character.age <= 4) {
    return roll < 0.55 ? 1 : 2;
  }
  if (incarceratedThisYear) {
    return roll < 0.6 ? 1 : 2;
  }

  const stage = character.education?.currentStage;
  const inSchool = stage === 'elementary' || stage === 'middle_school' || stage === 'high_school' || stage === 'university' || stage === 'professional_school';
  const activeDomains =
    (character.career?.currentJob || character.business ? 1 : 0) +
    (inSchool ? 1 : 0) +
    (getLivingChildrenList(character).length > 0 ? 1 : 0) +
    (character.partner ? 1 : 0);

  if (activeDomains >= 2) {
    if (roll < 0.15) return 1;
    if (roll < 0.65) return 2;
    return 3;
  }
  if (roll < 0.2) return 1;
  if (roll < 0.75) return 2;
  return 3;
}

/**
 * Rolls a diverse batch of 1–3 distinct interactive events for the current Age Up,
 * weighting down categories already selected in this year's queue and binding matching children.
 */
export function rollYearlyEventsForCharacter(
  character: CharacterProfile,
  options?: YearlyEventRollOptions,
): QueuedLifeEvent[] {
  const targetCount = determineYearlyEventTargetCount(character, options);
  if (targetCount <= 0) return [];

  const eligible = getEligibleEvents(character, gameEventContextRegistry, options);
  if (eligible.length === 0) return [];

  const finalCount = Math.min(targetCount, eligible.length);
  const context = buildEventContext(character, gameEventContextRegistry);
  const interactiveTitles = new Set(EVENT_POOL.map((event) => event.title));
  const selectedIds = new Set<string>();
  const categoryCounts: Partial<Record<LifeEventCategory, number>> = {};
  const usedChildIds = new Set<string>();
  const queued: QueuedLifeEvent[] = [];

  for (let i = 0; i < finalCount; i += 1) {
    const remaining = eligible.filter((event) => !selectedIds.has(event.id));
    if (remaining.length === 0) break;

    const weighted = remaining.map((event) => {
      const priorHits = categoryCounts[event.category] ?? 0;
      const diversityMult = Math.pow(SAME_YEAR_CATEGORY_DIVERSITY_FACTOR, priorHits);
      return {
        ...event,
        weight: Math.max(0.01, scoreEventWeight(event, context, interactiveTitles) * diversityMult),
      };
    });

    const picked = pickWeighted(weighted);
    selectedIds.add(picked.id);
    categoryCounts[picked.category] = (categoryCounts[picked.category] ?? 0) + 1;

    let boundChildId: string | undefined;
    if (isChildTargetedEvent(picked)) {
      const candidates = getMatchingLivingChildren(character, picked);
      if (candidates.length > 0) {
        const freshChild = candidates.find((c) => !usedChildIds.has(c.id)) ?? candidates[0];
        boundChildId = freshChild.id;
        usedChildIds.add(freshChild.id);
      }
    }

    queued.push({ template: picked, boundChildId });
  }

  return queued;
}

/** Re-validates a queued event after earlier same-year events mutate character state. */
export function isQueuedEventStillValid(
  character: CharacterProfile,
  queued: QueuedLifeEvent,
  options?: EventEligibilityOptions,
): boolean {
  if (!character.isAlive) return false;
  const context = buildEventContext(character, gameEventContextRegistry);
  if (!isEventEligible(queued.template, character, context, options)) {
    return false;
  }
  if (queued.boundChildId) {
    const matching = getMatchingLivingChildren(character, queued.template);
    if (!matching.some((c) => c.id === queued.boundChildId)) {
      return false;
    }
  }
  return true;
}

/**
 * Adjusts outcome weights when a choice involves asking parents to pay,
 * factoring in both family wealth and the player's relationship with their parents.
 */
function weightOutcomesForParents(
  outcomes: EventOutcome[],
  character: CharacterProfile
): EventOutcome[] {
  const wealthMult = WEALTH_META[character.parents.wealth]?.paySuccessMultiplier ?? 1.0;
  const avgRel =
    (character.parents.father.relationship + character.parents.mother.relationship) / 2;
  const relMult = 0.5 + (avgRel / 100); // 0.5x at 0 rel -> 1.5x at 100 rel

  return outcomes.map((outcome) => {
    if (outcome.parentPaid === undefined) return outcome;
    const baseWeight = outcome.weight ?? 1;
    const adjustedWeight = outcome.parentPaid
      ? baseWeight * wealthMult * relMult
      : baseWeight;
    return { ...outcome, weight: Math.max(0.1, adjustedWeight) };
  });
}

export interface ChildDeltaApplied {
  childId: string;
  childFirstName: string;
  relationship?: number;
  happiness?: number;
  smarts?: number;
  health?: number;
  looks?: number;
}

export interface EventResolution {
  character: CharacterProfile;
  outcome: EventOutcome;
  message: string;
  applied: StatEffects;
  personIntroduced?: PersonProfile;
  childDeltaApplied?: ChildDeltaApplied;
}

/**
 * Resolves the player's choice: rolls the outcome, applies its effects,
 * tracks introduced people into character.relationships, updates bound child stats,
 * marks the event as seen and writes it into the life journal.
 */
export function resolveEventChoice(
  character: CharacterProfile,
  event: LifeEventTemplate,
  choice: EventChoice,
  boundPerson?: PersonProfile,
  boundChild?: ChildProfile,
): EventResolution {
  const targetChild =
    boundChild ??
    (isChildTargetedEvent(event) ? findContextualChild(character, event) : undefined);

  const weightedOutcomes = weightOutcomesForParents(choice.outcomes, character);
  const outcome = pickWeighted(weightedOutcomes);
  const message = formatEventText(outcome.message, character, boundPerson, targetChild);
  const { character: updated, applied } = applyEffects(character, outcome.effects);

  const journalEntry: LifeEvent = {
    id: createId(),
    age: character.age,
    year: character.birthYear + character.age,
    title: formatEventText(event.title, character, boundPerson, targetChild),
    message,
    category: event.category,
    icon: event.icon,
  };

  const newTimeline = [...updated.timeline, journalEntry];

  if (character.isAlive && !updated.isAlive) {
    newTimeline.push({
      id: createId(),
      age: character.age,
      year: character.birthYear + character.age,
      title: 'Rest in Peace',
      message: `You died at age ${character.age}. Cause of death: ${updated.causeOfDeath || 'Succumbed to injuries'}.`,
      category: 'misfortune',
      icon: '🪦',
    });
  }

  let updatedChildren = updated.children;
  let childDeltaApplied: ChildDeltaApplied | undefined;
  if (outcome.childDelta && targetChild && Array.isArray(updated.children)) {
    const d = outcome.childDelta;
    const childIndex = updated.children.findIndex((c) => c.id === targetChild.id && c.isAlive);
    if (childIndex >= 0) {
      const existing = updated.children[childIndex];
      const nextRel = d.relationship !== undefined ? clampStat(existing.relationship + d.relationship) : existing.relationship;
      const nextHappy = d.happiness !== undefined ? clampStat(existing.happiness + d.happiness) : existing.happiness;
      const nextSmarts = d.smarts !== undefined ? clampStat(existing.smarts + d.smarts) : existing.smarts;
      const nextHealth = d.health !== undefined ? clampStat(existing.health + d.health) : existing.health;
      const nextLooks = d.looks !== undefined ? clampStat(existing.looks + d.looks) : existing.looks;

      const deltaRecord: ChildDeltaApplied = {
        childId: existing.id,
        childFirstName: existing.firstName,
        ...(nextRel !== existing.relationship ? { relationship: nextRel - existing.relationship } : {}),
        ...(nextHappy !== existing.happiness ? { happiness: nextHappy - existing.happiness } : {}),
        ...(nextSmarts !== existing.smarts ? { smarts: nextSmarts - existing.smarts } : {}),
        ...(nextHealth !== existing.health ? { health: nextHealth - existing.health } : {}),
        ...(nextLooks !== existing.looks ? { looks: nextLooks - existing.looks } : {}),
      };

      updatedChildren = updated.children.map((c, idx) =>
        idx === childIndex
          ? {
              ...c,
              relationship: nextRel,
              happiness: nextHappy,
              smarts: nextSmarts,
              health: nextHealth,
              looks: nextLooks,
            }
          : c
      );

      if (
        deltaRecord.relationship !== undefined ||
        deltaRecord.happiness !== undefined ||
        deltaRecord.smarts !== undefined ||
        deltaRecord.health !== undefined ||
        deltaRecord.looks !== undefined
      ) {
        childDeltaApplied = deltaRecord;
      }
    }
  }

  // Manage relationships: introduce new persons or modify relationship scores
  const updatedRelationships: PersonProfile[] = [...(updated.relationships || [])];
  let resolvedPerson: PersonProfile | undefined;
  let updatedPartner = updated.partner ? { ...updated.partner } : null;

  if (outcome.personIntroduced) {
    const p = outcome.personIntroduced;
    const isRomantic =
      p.relationshipType === 'dating' ||
      p.romanticStage === 'dating' ||
      p.role === 'Girlfriend' ||
      p.role === 'Boyfriend' ||
      p.role === 'Partner' ||
      p.role?.toLowerCase().includes('sweetheart') ||
      p.role?.toLowerCase().includes('date');

    const defaultPartnerStats = {
      craziness: Math.floor(Math.random() * 40) + 20,
      generosity: Math.floor(Math.random() * 50) + 40,
      looks: Math.floor(Math.random() * 40) + 50,
      smarts: Math.floor(Math.random() * 40) + 50,
      fertility: Math.floor(Math.random() * 40) + 50,
      yearsTogether: 0,
      annualIncome: character.age >= 18 ? Math.floor(Math.random() * 35000) + 30000 : 0,
      occupation: character.age >= 18 ? 'Employed' : 'Student',
    };

    const existingIndex = updatedRelationships.findIndex(
      (r) =>
        r.firstName.toLowerCase() === p.firstName.toLowerCase() &&
        r.lastName.toLowerCase() === p.lastName.toLowerCase()
    );

    if (existingIndex >= 0) {
      const existing = updatedRelationships[existingIndex];
      const updatedPerson: PersonProfile = {
        ...existing,
        role: p.role || existing.role,
        relationshipType: p.relationshipType || existing.relationshipType,
        relationship: Math.min(100, Math.max(0, p.relationship ?? existing.relationship)),
        avatarEmoji: p.avatarEmoji || existing.avatarEmoji,
        romanceUnlocked: isRomantic ? true : existing.romanceUnlocked,
        romanceMeter: isRomantic ? (existing.romanceMeter ?? 0) : existing.romanceMeter,
        romanticStage: isRomantic ? 'dating' : existing.romanticStage,
        partnerStats: isRomantic ? (existing.partnerStats || defaultPartnerStats) : existing.partnerStats,
      };
      updatedRelationships[existingIndex] = updatedPerson;
      resolvedPerson = updatedPerson;
      if (isRomantic && !updatedPartner) {
        updatedPartner = updatedPerson;
      }
    } else {
      const newPerson: PersonProfile = {
        id: p.id || createId(),
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        age: p.age ?? character.age,
        role: p.role,
        relationshipType: p.relationshipType,
        relationship: Math.min(100, Math.max(0, p.relationship)),
        originStory: p.originStory || `Met during "${event.title}" at age ${character.age}`,
        stageMet: p.stageMet,
        avatarEmoji: p.avatarEmoji,
        romanceUnlocked: isRomantic ? true : undefined,
        romanceMeter: isRomantic ? 0 : undefined,
        romanticStage: isRomantic ? 'dating' : undefined,
        partnerStats: isRomantic ? defaultPartnerStats : undefined,
      };
      updatedRelationships.push(newPerson);
      resolvedPerson = newPerson;
      if (isRomantic && !updatedPartner) {
        updatedPartner = newPerson;
      }
    }
  }

  if (outcome.relationshipDelta) {
    const { personName, delta, newType } = outcome.relationshipDelta;
    const targetIdx = updatedRelationships.findIndex(
      (r) =>
        (boundPerson && r.id === boundPerson.id) ||
        (personName && `${r.firstName} ${r.lastName}`.toLowerCase() === personName.toLowerCase()) ||
        (personName && r.firstName.toLowerCase() === personName.toLowerCase())
    );
    if (targetIdx >= 0) {
      const target = updatedRelationships[targetIdx];
      const isNewDating = newType === 'dating';
      const updatedTarget: PersonProfile = {
        ...target,
        relationship: Math.min(100, Math.max(0, target.relationship + delta)),
        ...(newType ? { relationshipType: newType } : {}),
        ...(isNewDating
          ? {
              romanticStage: 'dating' as const,
              romanceUnlocked: true,
              romanceMeter: target.romanceMeter ?? 0,
              partnerStats: target.partnerStats || {
                craziness: 30,
                generosity: 50,
                looks: 60,
                smarts: 60,
                fertility: 50,
                yearsTogether: 0,
                annualIncome: character.age >= 18 ? 35000 : 0,
                occupation: character.age >= 18 ? 'Employed' : 'Student',
              },
            }
          : {}),
      };
      updatedRelationships[targetIdx] = updatedTarget;
      if (isNewDating && !updatedPartner) {
        updatedPartner = updatedTarget;
      }
    }
  }

  return {
    character: {
      ...updated,
      ...(updatedChildren !== undefined ? { children: updatedChildren } : {}),
      partner: updatedPartner,
      relationships: updatedRelationships,
      seenEventIds: updated.seenEventIds.includes(event.id)
        ? updated.seenEventIds
        : [...updated.seenEventIds, event.id],
      timeline: newTimeline,
    },
    outcome,
    message,
    applied,
    personIntroduced: resolvedPerson,
    childDeltaApplied,
  };
}
