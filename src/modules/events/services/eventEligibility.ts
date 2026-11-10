import type { CharacterProfile } from '../../../types/game';
import type { EventContext } from './eventContext';
import type { EventExclusions, EventRequirements, LifeEventTemplate } from '../types';

/** Today's structural gates. Contextual rules are applied separately. */
function isStructurallyEligible(
  event: LifeEventTemplate,
  character: CharacterProfile
): boolean {
  if (!character.isAlive) return false;
  const currentStage = character.education?.currentStage;
  const currentJob = character.career?.currentJob;
  const isEmployedOrBusiness = Boolean(currentJob || character.business);

  if (character.age < event.minAge || character.age > event.maxAge) return false;

  if (event.requiredStage) {
    if (Array.isArray(event.requiredStage)) {
      if (!event.requiredStage.includes(currentStage)) return false;
    } else if (currentStage !== event.requiredStage) {
      return false;
    }
  }

  if (event.requiresEmployed && !isEmployedOrBusiness) return false;

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
    if (!currentJob || !event.requiredJobIds.includes(currentJob.jobId)) return false;
  }

  if (event.requiresBusiness && !character.business) return false;

  if (event.requiredBusinessSector) {
    if (!character.business) return false;
    if (Array.isArray(event.requiredBusinessSector)) {
      if (!event.requiredBusinessSector.includes(character.business.sector)) return false;
    } else if (character.business.sector !== event.requiredBusinessSector) {
      return false;
    }
  }

  if (event.description.includes('{fatherName}') && !character.parents?.father?.isAlive) {
    return false;
  }
  if (event.description.includes('{motherName}') && !character.parents?.mother?.isAlive) {
    return false;
  }

  return event.repeatable || !character.seenEventIds.includes(event.id);
}

function hasContradiction(requires: EventRequirements | undefined): boolean {
  if (!requires) return false;
  if (requires.requiresPartner && requires.requiresNoPartner) return true;
  if (requires.requiresSpouse && requires.requiresNoPartner) return true;
  if (
    requires.minCash !== undefined &&
    requires.maxCash !== undefined &&
    requires.minCash > requires.maxCash
  ) {
    return true;
  }
  if (
    requires.minChildren !== undefined &&
    requires.maxChildren !== undefined &&
    requires.minChildren > requires.maxChildren
  ) {
    return true;
  }
  if (
    requires.minKarma !== undefined &&
    requires.maxKarma !== undefined &&
    requires.minKarma > requires.maxKarma
  ) {
    return true;
  }
  if (
    requires.minHealth !== undefined &&
    requires.maxHealth !== undefined &&
    requires.minHealth > requires.maxHealth
  ) {
    return true;
  }
  return false;
}

/** True only when a requirement must read partner, child, parent, or sibling facts. */
function needsRelationshipFacts(requires: EventRequirements | undefined): boolean {
  if (!requires) return false;
  return (
    requires.requiresPartner === true ||
    requires.requiresSpouse === true ||
    requires.requiresNoPartner === true ||
    (requires.partnerStages !== undefined && requires.partnerStages.length > 0) ||
    requires.minChildren !== undefined ||
    requires.maxChildren !== undefined ||
    requires.requiresSchoolAgeChild === true
  );
}

function readsRelationshipExclusion(excludes: EventExclusions | undefined): boolean {
  if (!excludes) return false;
  return (
    excludes.partnerStages !== undefined ||
    excludes.hasPartner !== undefined ||
    excludes.hasSpouse !== undefined
  );
}

function listMatches<T>(list: readonly T[] | undefined, value: T | null): boolean {
  if (list === undefined) return true;
  if (value === null) return false;
  return list.includes(value);
}

function requirementsPass(requires: EventRequirements | undefined, context: EventContext): boolean {
  if (!requires) return true;
  if (hasContradiction(requires)) return false;
  if (needsRelationshipFacts(requires) && context.relationshipSource === 'invalid') {
    return false;
  }

  if (!listMatches(requires.lifeStages, context.lifeStage)) return false;
  if (!listMatches(requires.financialBands, context.financialBand)) return false;
  if (!listMatches(requires.partnerStages, context.partnerStage)) return false;

  if (requires.minCash !== undefined) {
    if (!context.cashValid || context.cash < requires.minCash) return false;
  }
  if (requires.maxCash !== undefined) {
    if (!context.cashValid || context.cash > requires.maxCash) return false;
  }
  if (requires.minStudentDebt !== undefined) {
    if (!context.studentDebtValid || context.studentDebt < requires.minStudentDebt) return false;
  }

  if (requires.minKarma !== undefined || requires.maxKarma !== undefined) {
    if (!Number.isFinite(context.karma)) return false;
    if (requires.minKarma !== undefined && context.karma < requires.minKarma) return false;
    if (requires.maxKarma !== undefined && context.karma > requires.maxKarma) return false;
  }
  if (requires.minHealth !== undefined || requires.maxHealth !== undefined) {
    if (!Number.isFinite(context.health)) return false;
    if (requires.minHealth !== undefined && context.health < requires.minHealth) return false;
    if (requires.maxHealth !== undefined && context.health > requires.maxHealth) return false;
  }

  if (requires.requiresPartner && context.hasPartner !== true) return false;
  if (requires.requiresSpouse && context.hasSpouse !== true) return false;
  if (requires.requiresNoPartner && context.hasPartner !== false) return false;
  if (requires.requiresUnemployed && !context.isUnemployed) return false;
  if (requires.requiresSchoolAgeChild && (context.schoolAgeChildren ?? 0) < 1) return false;

  if (requires.minChildren !== undefined) {
    if (context.livingChildren === null || context.livingChildren < requires.minChildren) return false;
  }
  if (requires.maxChildren !== undefined) {
    if (context.livingChildren === null || context.livingChildren > requires.maxChildren) return false;
  }
  if (requires.minYearsInJob !== undefined) {
    if (context.yearsInJob === null || context.yearsInJob < requires.minYearsInJob) return false;
  }

  if (requires.extensionAll !== undefined) {
    for (const fact of requires.extensionAll) {
      const bag = context.extensions[fact.providerId];
      if (!bag || !Object.is(bag[fact.key], fact.equals)) return false;
    }
  }

  return true;
}

function exclusionsMatch(excludes: EventExclusions | undefined, context: EventContext): boolean {
  if (!excludes) return false;
  if (readsRelationshipExclusion(excludes) && context.relationshipSource === 'invalid') {
    return true;
  }

  if (excludes.seenEventIds?.some((id) => context.seenEventIds.includes(id))) return true;
  if (
    excludes.lifeStages !== undefined &&
    excludes.lifeStages.length > 0 &&
    excludes.lifeStages.includes(context.lifeStage)
  ) {
    return true;
  }
  if (
    excludes.financialBands !== undefined &&
    context.financialBand !== null &&
    excludes.financialBands.includes(context.financialBand)
  ) {
    return true;
  }
  if (
    excludes.partnerStages !== undefined &&
    context.partnerStage !== null &&
    excludes.partnerStages.includes(context.partnerStage)
  ) {
    return true;
  }
  if (excludes.hasPartner !== undefined && context.hasPartner === excludes.hasPartner) return true;
  if (excludes.hasSpouse !== undefined && context.hasSpouse === excludes.hasSpouse) return true;
  if (excludes.hasBusiness !== undefined && context.hasBusiness === excludes.hasBusiness) return true;
  if (excludes.isEmployed !== undefined && context.isEmployed === excludes.isEmployed) return true;
  return false;
}

/** Structural eligibility plus optional requires and excludes. */
export function isEventEligible(
  event: LifeEventTemplate,
  character: CharacterProfile,
  context: EventContext
): boolean {
  return (
    isStructurallyEligible(event, character) &&
    requirementsPass(event.requires, context) &&
    !exclusionsMatch(event.excludes, context)
  );
}
