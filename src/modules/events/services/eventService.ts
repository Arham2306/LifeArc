import type { CharacterProfile, LifeEvent, PersonProfile, StatEffects } from '../../../types/game'
import type { EventChoice, EventOutcome, LifeEventTemplate } from '../types'
import { EVENT_POOL } from '../data'
import { applyEffects } from '../../character/services/statService'
import { WEALTH_META } from '../../character/services/familyService'
import { chance, pickWeighted } from '../../../utils/random'
import { createId } from '../../../utils/id'

/** Chance that an interactive event pops up on any given age up. */
export const EVENT_TRIGGER_CHANCE = 0.7;

/** Characters younger than this don't get interactive events. */
export const MIN_EVENT_AGE = 1;

/** Replaces placeholders like {firstName}, {fatherName}, {motherName}, {jobTitle}, and {companyName} in event text. */
export function formatEventText(text: string, character: CharacterProfile): string {
  const currentJob = character.career?.currentJob;
  const companyName =
    currentJob?.companyName || character.business?.name || 'your workplace';
  const jobTitle =
    currentJob?.title || (character.business ? 'Founder & CEO' : 'worker');

  return text
    .replace(/\{firstName\}/g, character.firstName)
    .replace(/\{lastName\}/g, character.lastName)
    .replace(/\{fatherName\}/g, character.parents.father.firstName)
    .replace(/\{motherName\}/g, character.parents.mother.firstName)
    .replace(/\{jobTitle\}/g, jobTitle)
    .replace(/\{companyName\}/g, companyName);
}

/** All events that can currently happen to this character. */
export function getEligibleEvents(character: CharacterProfile): LifeEventTemplate[] {
  if (!character.isAlive) return [];
  const currentStage = character.education?.currentStage;
  const currentJob = character.career?.currentJob;
  const isEmployedOrBusiness = Boolean(currentJob || character.business);

  return EVENT_POOL.filter((event) => {
    if (character.age < event.minAge || character.age > event.maxAge) return false;

    if (event.requiredStage) {
      if (Array.isArray(event.requiredStage)) {
        if (!event.requiredStage.includes(currentStage)) return false;
      } else if (currentStage !== event.requiredStage) {
        return false;
      }
    }

    // Employment checks: allows both standard employees and active business founders
    if (event.requiresEmployed && !isEmployedOrBusiness) {
      return false;
    }

    if (event.requiredCareerField) {
      if (!currentJob) return false;
      if (Array.isArray(event.requiredCareerField)) {
        if (!event.requiredCareerField.includes(currentJob.field)) return false;
      } else if (currentJob.field !== event.requiredCareerField) {
        return false;
      }
    }

    if (event.requiredEmploymentType) {
      if (!currentJob) return false;
      if (Array.isArray(event.requiredEmploymentType)) {
        if (!event.requiredEmploymentType.includes(currentJob.type)) return false;
      } else if (currentJob.type !== event.requiredEmploymentType) {
        return false;
      }
    }

    if (event.requiredJobIds) {
      if (!currentJob || !event.requiredJobIds.includes(currentJob.jobId)) {
        return false;
      }
    }

    // Business entrepreneur checks
    if (event.requiresBusiness && !character.business) {
      return false;
    }

    if (event.requiredBusinessSector) {
      if (!character.business) return false;
      if (Array.isArray(event.requiredBusinessSector)) {
        if (!event.requiredBusinessSector.includes(character.business.sector)) {
          return false;
        }
      } else if (character.business.sector !== event.requiredBusinessSector) {
        return false;
      }
    }

    // Defensive check: If an event description explicitly features parents who have passed away
    if (event.description.includes('{fatherName}') && !character.parents?.father?.isAlive) {
      return false;
    }
    if (event.description.includes('{motherName}') && !character.parents?.mother?.isAlive) {
      return false;
    }

    return event.repeatable || !character.seenEventIds.includes(event.id);
  });
}

/** Rolls the dice to see if an event happens this year, and which one. */
export function rollEventForCharacter(
  character: CharacterProfile,
  triggerChance: number = EVENT_TRIGGER_CHANCE
): LifeEventTemplate | null {
  if (!character.isAlive || character.age < MIN_EVENT_AGE) return null;
  if (!chance(triggerChance)) return null;

  const eligible = getEligibleEvents(character);
  if (eligible.length === 0) return null;

  return pickWeighted(eligible);
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

export interface EventResolution {
  character: CharacterProfile;
  outcome: EventOutcome;
  message: string;
  applied: StatEffects;
  personIntroduced?: PersonProfile;
}

/**
 * Resolves the player's choice: rolls the outcome, applies its effects,
 * tracks introduced people into character.relationships,
 * marks the event as seen and writes it into the life journal.
 */
export function resolveEventChoice(
  character: CharacterProfile,
  event: LifeEventTemplate,
  choice: EventChoice
): EventResolution {
  const weightedOutcomes = weightOutcomesForParents(choice.outcomes, character);
  const outcome = pickWeighted(weightedOutcomes);
  const message = formatEventText(outcome.message, character);
  const { character: updated, applied } = applyEffects(character, outcome.effects);

  const journalEntry: LifeEvent = {
    id: createId(),
    age: character.age,
    year: character.birthYear + character.age,
    title: event.title,
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

  // Manage relationships: introduce new persons or modify relationship scores
  const updatedRelationships: PersonProfile[] = [...(updated.relationships || [])];
  let resolvedPerson: PersonProfile | undefined;

  if (outcome.personIntroduced) {
    const p = outcome.personIntroduced;
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
      };
      updatedRelationships[existingIndex] = updatedPerson;
      resolvedPerson = updatedPerson;
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
      };
      updatedRelationships.push(newPerson);
      resolvedPerson = newPerson;
    }
  }

  if (outcome.relationshipDelta) {
    const { personName, delta, newType } = outcome.relationshipDelta;
    const targetIdx = updatedRelationships.findIndex(
      (r) => `${r.firstName} ${r.lastName}`.toLowerCase() === personName.toLowerCase()
    );
    if (targetIdx >= 0) {
      const target = updatedRelationships[targetIdx];
      updatedRelationships[targetIdx] = {
        ...target,
        relationship: Math.min(100, Math.max(0, target.relationship + delta)),
        ...(newType ? { relationshipType: newType } : {}),
      };
    }
  }

  return {
    character: {
      ...updated,
      relationships: updatedRelationships,
      seenEventIds: [...updated.seenEventIds, event.id],
      timeline: newTimeline,
    },
    outcome,
    message,
    applied,
    personIntroduced: resolvedPerson,
  };
}
