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

/** Replaces placeholders like {firstName}, {fatherName}, {motherName}, {jobTitle}, {companyName}, {peerName}, {classmateName}, {coworkerName} in event text. */
export function formatEventText(
  text: string,
  character: CharacterProfile,
  boundPerson?: PersonProfile
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
    .replace(/\{peerObjective\}/g, peerObjective);
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
  choice: EventChoice,
  boundPerson?: PersonProfile
): EventResolution {
  const weightedOutcomes = weightOutcomesForParents(choice.outcomes, character);
  const outcome = pickWeighted(weightedOutcomes);
  const message = formatEventText(outcome.message, character, boundPerson);
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
        romanceMeter: isRomantic ? (existing.romanceMeter ?? 50) : existing.romanceMeter,
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
        romanceMeter: isRomantic ? 50 : undefined,
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
              romanceMeter: target.romanceMeter ?? 50,
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
      partner: updatedPartner,
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
