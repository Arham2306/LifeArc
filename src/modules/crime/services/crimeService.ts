import type {
  CharacterProfile,
  LifeEvent,
  PersonProfile,
  StatEffects,
} from '../../../types/game';
import { stampPlayerNetWorth } from '../../assets/services/assetService';
import { applyBusinessCrimeConsequence } from '../../business/services/businessService';
import { applyCareerCrimeConsequence } from '../../career/services/careerService';
import { resolveCharacterOccupation } from '../../character/services/occupationService';
import { applyEffects } from '../../character/services/statService';
import { applyEducationCrimeConsequence } from '../../education/services/educationService';
import { divorceService } from '../../romance/services/divorceService';
import { romanceService } from '../../romance/services/romanceService';
import { getCrimeTemplate, isValidCrimeId } from '../data/crimeCatalog';
import {
  evaluateArrestSocialAwareness,
  evaluateAttemptMoodAndKarma,
  evaluateAwarenessSocialScale,
  evaluateEvidenceBasedExposure,
  evaluatePhysicalAndMoodImpact,
  evaluateProbationRevocationModifier,
  evaluateVictimLossAndRestitution,
} from '../data/crimeConsequences';
import {
  getAttorneyFeeForCase,
  getDefenseStrategy,
  JUVENILE_WARNING_RESTITUTION_MAX,
  selectPrisonFacility,
} from '../data/legalCatalog';
import type {
  CrimeAttemptResult,
  CrimeExposureLevel,
  CrimeId,
  CrimeOutcomeStatus,
  CrimeRecordEntry,
  CourtResolutionResult,
  DefenseStrategyId,
  ExpungementResult,
  FinePaymentResult,
  LegalJurisdiction,
  PendingCourtCase,
  PrisonConsequencesSummary,
  PrisonPartnerConsequenceSummary,
  PrisonSocialPenaltyGroup,
  PrisonState,
  ProbationActionId,
  ProbationActionResult,
  ProbationConditionId,
  ProbationState,
  ProbationTermEntry,
  RecordReliefOptionId,
  RecordReliefPetitionResult,
} from '../types';
import { CRIME_SIM_VERSION, evaluateCrimeAttempt } from './crimeRiskService';
import { deterministicUUID, hashSeed, SeededPRNG } from '../../autonomy/services/seededPrngService';
import {
  evaluateRecordReliefStatus,
  getActiveAdultConvictions,
  getExpungementEligibleRecords,
  getJurisdictionForAge,
  getSanitizedCrimeState,
  isCrimeEligibleForCharacter,
  isCurrentlyIncarcerated,
  isOnProbation,
} from './crimeSelectors';

function clamp0to100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function createLegalPrng(
  character: Pick<CharacterProfile, 'id' | 'birthYear' | 'age'>,
  caseIdOrSeed: string,
  salt: string,
): SeededPRNG {
  return new SeededPRNG(
    hashSeed(
      character.id,
      character.birthYear,
      character.age,
      caseIdOrSeed,
      CRIME_SIM_VERSION,
      salt,
    ),
  );
}

interface RelationshipDeltaSpec {
  parents: number;
  partner: number;
  siblings: number;
}

function applyCrimeRelationshipConsequences(
  character: CharacterProfile,
  spec: RelationshipDeltaSpec,
): { character: CharacterProfile; statEffects: Partial<StatEffects> } {
  const parentEffects: Partial<StatEffects> = {};
  if (spec.parents !== 0) {
    if (character.parents.father.isAlive) {
      parentEffects.fatherRelationship = spec.parents;
    }
    if (character.parents.mother.isAlive) {
      parentEffects.motherRelationship = spec.parents;
    }
  }

  let updatedPartner = character.partner;
  let updatedRelationships = character.relationships;

  if (spec.partner !== 0 && character.partner && character.partner.romanticStage !== 'widowed') {
    const partnerId = character.partner.id;
    const nextPartnerRel = clamp0to100(character.partner.relationship + spec.partner);
    updatedPartner = {
      ...character.partner,
      relationship: nextPartnerRel,
    };

    if (Array.isArray(character.relationships)) {
      const idx = character.relationships.findIndex((r) => r.id === partnerId);
      if (idx !== -1 && character.relationships[idx].romanticStage !== 'widowed') {
        updatedRelationships = character.relationships.map((r: PersonProfile, i: number) =>
          i === idx ? { ...r, relationship: nextPartnerRel } : r,
        );
      }
    }
  }

  let updatedSiblings = character.siblings;
  if (spec.siblings !== 0 && Array.isArray(character.siblings) && character.siblings.length > 0) {
    updatedSiblings = character.siblings.map((sib) =>
      sib.isAlive ? { ...sib, relationship: clamp0to100(sib.relationship + spec.siblings) } : sib,
    );
  }

  return {
    character: {
      ...character,
      partner: updatedPartner,
      relationships: updatedRelationships,
      siblings: updatedSiblings,
    },
    statEffects: parentEffects,
  };
}

function getNpcDedupKey(
  person: { id?: string | null; firstName?: string; lastName?: string },
  fallbackPrefix: string,
): string {
  const id = typeof person.id === 'string' ? person.id.trim() : '';
  if (id.length > 0) return id;
  const first = (person.firstName || '').trim().toLowerCase();
  const last = (person.lastName || '').trim().toLowerCase();
  return `${fallbackPrefix}:${first}:${last}`;
}

function syncPartnerIntoRelationships(
  relationships: PersonProfile[] | undefined,
  partnerId: string,
  partnerKey: string,
  updatedRecord: PersonProfile,
): PersonProfile[] {
  if (!Array.isArray(relationships)) return [];
  return relationships.map((person) => {
    const personKey = getNpcDedupKey(person, 'rel');
    return person.id === partnerId || personKey === partnerKey ? updatedRecord : person;
  });
}

function applyImprisonmentPartnerConsequence(
  character: CharacterProfile,
  sentenceYears: number,
  isFelony: boolean,
): {
  character: CharacterProfile;
  excludedPartnerId: string | null;
  excludedPartnerKey: string | null;
  summary: PrisonPartnerConsequenceSummary;
} {
  const partner = character.partner;
  if (!partner || partner.romanticStage === 'widowed') {
    return {
      character,
      excludedPartnerId: null,
      excludedPartnerKey: null,
      summary: {
        hadPartner: false,
        action: 'none',
        relationshipDelta: 0,
        romanceDelta: 0,
      },
    };
  }

  const partnerId = partner.id;
  const partnerKey = getNpcDedupKey(partner, 'partner');
  const partnerName = `${partner.firstName} ${partner.lastName}`.trim();
  const previousStage = partner.romanticStage;
  const isMarried = partner.romanticStage === 'married' || partner.relationshipType === 'spouse';
  const beforeRel = partner.relationship;
  const beforeRomance = partner.romanceMeter ?? 50;
  const isOneYearMisdemeanor = sentenceYears === 1 && !isFelony;

  if (isOneYearMisdemeanor) {
    const nextRel = clamp0to100(beforeRel - 50);
    const nextRomance = clamp0to100(beforeRomance - 50);

    if (nextRel < 35) {
      const penalizedPartner: PersonProfile = {
        ...partner,
        relationship: nextRel,
        romanceMeter: nextRomance,
      };

      if (isMarried) {
        const divorced = divorceService.executeDivorce(character, penalizedPartner, 'standard', {
          skipFeesAndAssetSplit: true,
          happinessDelta: 0,
          relationshipDelta: 0,
          timelineTitle: 'Marriage Ended Upon Imprisonment',
          timelineMessage: `Your prison sentence strained your marriage past the breaking point, and ${partnerName} filed for divorce.`,
        });
        const syncedRelationships = syncPartnerIntoRelationships(
          divorced.updatedCharacter.relationships,
          partnerId,
          partnerKey,
          divorced.updatedSpouse,
        );
        return {
          character: {
            ...divorced.updatedCharacter,
            relationships: syncedRelationships,
          },
          excludedPartnerId: partnerId,
          excludedPartnerKey: partnerKey,
          summary: {
            hadPartner: true,
            partnerName,
            previousStage,
            action: 'divorced',
            relationshipDelta: nextRel - beforeRel,
            romanceDelta: -beforeRomance,
            resultingRelationship: divorced.updatedSpouse.relationship,
            resultingRomanceMeter: 0,
          },
        };
      }

      const breakup = romanceService.executeBreakup(character, penalizedPartner, {
        relationshipDelta: 0,
        happinessDelta: 0,
        message: `${partnerName} ended your relationship after you were sentenced to prison.`,
      });
      const existingEx = character.exPartners || [];
      const existingIdx = existingEx.findIndex(
        (ex) => ex.id === breakup.updatedTarget.id || getNpcDedupKey(ex, 'ex') === partnerKey,
      );
      const nextExPartners =
        existingIdx >= 0
          ? existingEx.map((ex, idx) => (idx === existingIdx ? breakup.updatedTarget : ex))
          : [...existingEx, breakup.updatedTarget];
      const nextRelationships = syncPartnerIntoRelationships(
        character.relationships,
        partnerId,
        partnerKey,
        breakup.updatedTarget,
      );
      const breakupEvent: LifeEvent = {
        id: `${character.id}-prison-breakup-${character.age}-${partnerId}`,
        age: character.age,
        year: character.birthYear + character.age,
        title: 'Relationship Ended Upon Imprisonment',
        message: breakup.result.message,
        category: 'relationship',
        icon: '💔',
      };
      return {
        character: stampPlayerNetWorth({
          ...character,
          partner: null,
          exPartners: nextExPartners,
          relationships: nextRelationships,
          timeline: [...character.timeline, breakupEvent],
        }),
        excludedPartnerId: partnerId,
        excludedPartnerKey: partnerKey,
        summary: {
          hadPartner: true,
          partnerName,
          previousStage,
          action: 'broke_up',
          relationshipDelta: nextRel - beforeRel,
          romanceDelta: -beforeRomance,
          resultingRelationship: breakup.updatedTarget.relationship,
          resultingRomanceMeter: 0,
        },
      };
    }

    // 1-year misdemeanor relationship survived (>= 35)
    const damagedPartner: PersonProfile = {
      ...partner,
      relationship: nextRel,
      romanceMeter: nextRomance,
    };
    return {
      character: {
        ...character,
        partner: damagedPartner,
        relationships: syncPartnerIntoRelationships(
          character.relationships,
          partnerId,
          partnerKey,
          damagedPartner,
        ),
      },
      excludedPartnerId: partnerId,
      excludedPartnerKey: partnerKey,
      summary: {
        hadPartner: true,
        partnerName,
        previousStage,
        action: 'damaged',
        relationshipDelta: nextRel - beforeRel,
        romanceDelta: nextRomance - beforeRomance,
        resultingRelationship: nextRel,
        resultingRomanceMeter: nextRomance,
      },
    };
  }

  // 2+ years or any felony -> automatic divorce / breakup (-45 relationship penalty via DivorceService/breakup)
  if (isMarried) {
    const divorced = divorceService.executeDivorce(character, partner, 'standard', {
      skipFeesAndAssetSplit: true,
      happinessDelta: 0,
      relationshipDelta: -45,
      timelineTitle: 'Marriage Ended Upon Imprisonment',
      timelineMessage: `Following your prison sentence, ${partnerName} divorced you and severed marital ties.`,
    });
    const syncedRelationships = syncPartnerIntoRelationships(
      divorced.updatedCharacter.relationships,
      partnerId,
      partnerKey,
      divorced.updatedSpouse,
    );
    return {
      character: {
        ...divorced.updatedCharacter,
        relationships: syncedRelationships,
      },
      excludedPartnerId: partnerId,
      excludedPartnerKey: partnerKey,
      summary: {
        hadPartner: true,
        partnerName,
        previousStage,
        action: 'divorced',
        relationshipDelta: divorced.updatedSpouse.relationship - beforeRel,
        romanceDelta: -beforeRomance,
        resultingRelationship: divorced.updatedSpouse.relationship,
        resultingRomanceMeter: 0,
      },
    };
  }

  const breakup = romanceService.executeBreakup(character, partner, {
    relationshipDelta: -45,
    happinessDelta: 0,
    message: `Following your prison sentence, ${partnerName} ended the relationship.`,
  });
  const existingEx = character.exPartners || [];
  const existingIdx = existingEx.findIndex(
    (ex) => ex.id === breakup.updatedTarget.id || getNpcDedupKey(ex, 'ex') === partnerKey,
  );
  const nextExPartners =
    existingIdx >= 0
      ? existingEx.map((ex, idx) => (idx === existingIdx ? breakup.updatedTarget : ex))
      : [...existingEx, breakup.updatedTarget];
  const nextRelationships = syncPartnerIntoRelationships(
    character.relationships,
    partnerId,
    partnerKey,
    breakup.updatedTarget,
  );
  const breakupEvent: LifeEvent = {
    id: `${character.id}-prison-breakup-${character.age}-${partnerId}`,
    age: character.age,
    year: character.birthYear + character.age,
    title: 'Relationship Ended Upon Imprisonment',
    message: breakup.result.message,
    category: 'relationship',
    icon: '💔',
  };
  return {
    character: stampPlayerNetWorth({
      ...character,
      partner: null,
      exPartners: nextExPartners,
      relationships: nextRelationships,
      timeline: [...character.timeline, breakupEvent],
    }),
    excludedPartnerId: partnerId,
    excludedPartnerKey: partnerKey,
    summary: {
      hadPartner: true,
      partnerName,
      previousStage,
      action: 'broke_up',
      relationshipDelta: breakup.updatedTarget.relationship - beforeRel,
      romanceDelta: -beforeRomance,
      resultingRelationship: breakup.updatedTarget.relationship,
      resultingRomanceMeter: 0,
    },
  };
}

interface SocialWinnerEntry {
  category: PrisonSocialPenaltyGroup['category'];
  label: string;
  intendedDelta: number;
  rank: number;
  newRelationship: number;
}

interface SocialPenaltyDeltas {
  parents: number;
  siblings: number;
  childrenOlder: number;
  childrenYoung: number;
  colleagues: number;
  bestFriends: number;
  friends: number;
  otherContacts: number;
}

const PRISON_SOCIAL_DELTAS: SocialPenaltyDeltas = {
  parents: -22,
  siblings: -16,
  childrenOlder: -12,
  childrenYoung: -8,
  colleagues: -30,
  bestFriends: -18,
  friends: -22,
  otherContacts: -24,
};

const PROBATION_FELONY_SOCIAL_DELTAS: SocialPenaltyDeltas = {
  parents: -16,
  siblings: -8,
  childrenOlder: -8,
  childrenYoung: -4,
  colleagues: -20,
  bestFriends: -12,
  friends: -14,
  otherContacts: -12,
};

const PROBATION_MISDEMEANOR_SOCIAL_DELTAS: SocialPenaltyDeltas = {
  parents: -10,
  siblings: -6,
  childrenOlder: -4,
  childrenYoung: 0,
  colleagues: -14,
  bestFriends: -8,
  friends: -10,
  otherContacts: -8,
};

function mapBusinessDisposition(
  action: 'none' | 'scandal' | 'continue_delegated' | 'pause_incarceration' | 'liquidate',
): CourtResolutionResult['businessDisposition'] {
  if (action === 'continue_delegated') return 'delegated_continued';
  if (action === 'pause_incarceration') return 'paused_incarceration';
  if (action === 'liquidate') return 'liquidated';
  return action;
}

function applyProbationPartnerConsequence(
  character: CharacterProfile,
  isFelony: boolean,
  householdScale = 1,
): {
  character: CharacterProfile;
  excludedPartnerId: string | null;
  excludedPartnerKey: string | null;
} {
  const partner = character.partner;
  if (!partner || partner.romanticStage === 'widowed' || householdScale <= 0) {
    return {
      character,
      excludedPartnerId: null,
      excludedPartnerKey: null,
    };
  }

  const partnerId = partner.id;
  const partnerKey = getNpcDedupKey(partner, 'partner');
  const relDelta = Math.round((isFelony ? -20 : -12) * householdScale);
  const romanceDelta = Math.round((isFelony ? -18 : -10) * householdScale);
  if (relDelta === 0 && romanceDelta === 0) {
    return {
      character,
      excludedPartnerId: partnerId,
      excludedPartnerKey: partnerKey,
    };
  }
  const updatedPartner: PersonProfile = {
    ...partner,
    relationship: clamp0to100(partner.relationship + relDelta),
    romanceMeter: clamp0to100((partner.romanceMeter ?? 50) + romanceDelta),
  };

  return {
    character: {
      ...character,
      partner: updatedPartner,
      relationships: syncPartnerIntoRelationships(
        character.relationships,
        partnerId,
        partnerKey,
        updatedPartner,
      ),
    },
    excludedPartnerId: partnerId,
    excludedPartnerKey: partnerKey,
  };
}

function scaleSocialDeltas(
  base: SocialPenaltyDeltas,
  outcome: CrimeOutcomeStatus,
  exposure: CrimeExposureLevel,
): SocialPenaltyDeltas {
  const scale = evaluateAwarenessSocialScale(outcome, exposure);
  return {
    parents: Math.round(base.parents * scale.householdScale),
    siblings: Math.round(base.siblings * scale.householdScale),
    childrenOlder: Math.round(base.childrenOlder * scale.householdScale),
    childrenYoung: Math.round(base.childrenYoung * scale.householdScale),
    colleagues: Math.round(base.colleagues * scale.colleagueScale),
    bestFriends: Math.round(base.bestFriends * scale.socialCircleScale),
    friends: Math.round(base.friends * scale.socialCircleScale),
    otherContacts: Math.round(base.otherContacts * scale.socialCircleScale),
  };
}

const SOCIAL_CATEGORY_ORDER: PrisonSocialPenaltyGroup['category'][] = [
  'parents',
  'siblings',
  'children_older',
  'children_young',
  'colleagues',
  'best_friends',
  'friends',
  'other_contacts',
];

function classifyGeneralRelationshipEntry(
  person: PersonProfile,
  deltas: SocialPenaltyDeltas = PRISON_SOCIAL_DELTAS,
): {
  category: PrisonSocialPenaltyGroup['category'];
  label: string;
  intendedDelta: number;
  rank: number;
} {
  const roleLower = (person.role || '').toLowerCase();
  if (
    person.relationshipType === 'coworker' ||
    person.cohortType === 'coworker' ||
    roleLower.includes('coworker') ||
    roleLower.includes('colleague')
  ) {
    return {
      category: 'colleagues',
      label: 'Colleagues & Coworkers',
      intendedDelta: deltas.colleagues,
      rank: 5,
    };
  }
  if (
    person.relationshipType === 'best_friend' ||
    person.cohortType === 'best_friend' ||
    roleLower.includes('best friend') ||
    roleLower.includes('close friend')
  ) {
    return {
      category: 'best_friends',
      label: 'Best Friends',
      intendedDelta: deltas.bestFriends,
      rank: 6,
    };
  }
  if (
    person.relationshipType === 'friend' ||
    person.cohortType === 'friend' ||
    roleLower === 'friend'
  ) {
    return {
      category: 'friends',
      label: 'Friends',
      intendedDelta: deltas.friends,
      rank: 7,
    };
  }
  return {
    category: 'other_contacts',
    label: 'Acquaintances & Other Contacts',
    intendedDelta: deltas.otherContacts,
    rank: 8,
  };
}

function applySocialConsequencesForSentence(
  character: CharacterProfile,
  excludedPartnerId: string | null,
  excludedPartnerKey: string | null,
  deltas: SocialPenaltyDeltas = PRISON_SOCIAL_DELTAS,
): {
  character: CharacterProfile;
  totalImpacted: number;
  groups: PrisonSocialPenaltyGroup[];
} {
  const winnerByKey = new Map<string, SocialWinnerEntry>();

  const isExcludedPartner = (key: string, id?: string): boolean =>
    (excludedPartnerId !== null && id === excludedPartnerId) ||
    (excludedPartnerKey !== null && key === excludedPartnerKey);

  // Priority 1: Parents
  const fatherKey = getNpcDedupKey(character.parents.father, 'father');
  if (
    deltas.parents !== 0 &&
    character.parents.father.isAlive &&
    !isExcludedPartner(fatherKey, character.parents.father.id)
  ) {
    winnerByKey.set(fatherKey, {
      category: 'parents',
      label: 'Parents',
      intendedDelta: deltas.parents,
      rank: 1,
      newRelationship: clamp0to100(character.parents.father.relationship + deltas.parents),
    });
  }

  const motherKey = getNpcDedupKey(character.parents.mother, 'mother');
  if (
    deltas.parents !== 0 &&
    character.parents.mother.isAlive &&
    !winnerByKey.has(motherKey) &&
    !isExcludedPartner(motherKey, character.parents.mother.id)
  ) {
    winnerByKey.set(motherKey, {
      category: 'parents',
      label: 'Parents',
      intendedDelta: deltas.parents,
      rank: 1,
      newRelationship: clamp0to100(character.parents.mother.relationship + deltas.parents),
    });
  }

  // Priority 2: Siblings
  if (deltas.siblings !== 0) {
    for (const sib of character.siblings || []) {
      if (!sib.isAlive) continue;
      const key = getNpcDedupKey(sib, 'sibling');
      if (isExcludedPartner(key, sib.id) || winnerByKey.has(key)) continue;
      winnerByKey.set(key, {
        category: 'siblings',
        label: 'Siblings',
        intendedDelta: deltas.siblings,
        rank: 2,
        newRelationship: clamp0to100(sib.relationship + deltas.siblings),
      });
    }
  }

  // Priority 3: Children (age >= 5 vs age < 5)
  for (const child of character.children || []) {
    if (!child.isAlive) continue;
    const key = getNpcDedupKey(child, 'child');
    if (isExcludedPartner(key, child.id) || winnerByKey.has(key)) continue;
    const isOlder = child.age >= 5;
    const delta = isOlder ? deltas.childrenOlder : deltas.childrenYoung;
    if (delta === 0) continue;
    winnerByKey.set(key, {
      category: isOlder ? 'children_older' : 'children_young',
      label: isOlder ? 'Children (Age 5+)' : 'Young Children (<5)',
      intendedDelta: delta,
      rank: 3,
      newRelationship: clamp0to100(child.relationship + delta),
    });
  }

  const worldNpcRegistry = character.worldState?.npcRegistry;
  const isGeneralContactDeceased = (person: PersonProfile): boolean => {
    const inlineAlive = (person as PersonProfile & { isAlive?: boolean }).isAlive;
    if (inlineAlive === false) return true;
    if (person.id && worldNpcRegistry?.[person.id]?.isAlive === false) return true;
    return false;
  };

  // Priorities 5-8: relationships[] (Colleagues -> Best Friends -> Friends -> Other Contacts)
  for (const person of character.relationships || []) {
    if (!person || isGeneralContactDeceased(person)) continue;
    if (
      person.romanticStage === 'widowed' ||
      person.relationshipType === 'ex' ||
      person.romanticStage === 'ex'
    ) {
      continue;
    }
    const key = getNpcDedupKey(person, 'rel');
    if (isExcludedPartner(key, person.id)) continue;

    const spec = classifyGeneralRelationshipEntry(person, deltas);
    if (spec.intendedDelta === 0) continue;
    const existing = winnerByKey.get(key);
    if (existing) {
      // Ranks 1-3 strictly win; between 5-8, smaller rank number wins.
      if (existing.rank <= 4 || spec.rank >= existing.rank) {
        continue;
      }
    }

    winnerByKey.set(key, {
      ...spec,
      newRelationship: clamp0to100(person.relationship + spec.intendedDelta),
    });
  }

  // Pass 2: Synchronize final clamped relationship values across all mirrored records
  const updatedFather =
    character.parents.father.isAlive && winnerByKey.has(fatherKey)
      ? {
          ...character.parents.father,
          relationship: winnerByKey.get(fatherKey)!.newRelationship,
        }
      : character.parents.father;

  const updatedMother =
    character.parents.mother.isAlive && winnerByKey.has(motherKey)
      ? {
          ...character.parents.mother,
          relationship: winnerByKey.get(motherKey)!.newRelationship,
        }
      : character.parents.mother;

  const updatedSiblings = Array.isArray(character.siblings)
    ? character.siblings.map((sib) => {
        if (!sib.isAlive) return sib;
        const win = winnerByKey.get(getNpcDedupKey(sib, 'sibling'));
        return win ? { ...sib, relationship: win.newRelationship } : sib;
      })
    : character.siblings;

  const updatedChildren = Array.isArray(character.children)
    ? character.children.map((child) => {
        if (!child.isAlive) return child;
        const win = winnerByKey.get(getNpcDedupKey(child, 'child'));
        return win ? { ...child, relationship: win.newRelationship } : child;
      })
    : character.children;

  const updatedRelationships = Array.isArray(character.relationships)
    ? character.relationships.map((person) => {
        if (!person || isGeneralContactDeceased(person)) return person;
        if (
          person.romanticStage === 'widowed' ||
          person.relationshipType === 'ex' ||
          person.romanticStage === 'ex'
        ) {
          return person;
        }
        const key = getNpcDedupKey(person, 'rel');
        if (isExcludedPartner(key, person.id)) return person;
        const win = winnerByKey.get(key);
        return win ? { ...person, relationship: win.newRelationship } : person;
      })
    : character.relationships;

  const grouped = new Map<PrisonSocialPenaltyGroup['category'], PrisonSocialPenaltyGroup>();
  for (const winner of winnerByKey.values()) {
    const existing = grouped.get(winner.category);
    if (existing) {
      existing.affectedCount += 1;
    } else {
      grouped.set(winner.category, {
        category: winner.category,
        label: winner.label,
        affectedCount: 1,
        intendedDelta: winner.intendedDelta,
      });
    }
  }

  const orderedGroups = SOCIAL_CATEGORY_ORDER.map((cat) => grouped.get(cat)).filter(
    (entry): entry is PrisonSocialPenaltyGroup => Boolean(entry),
  );

  return {
    character: {
      ...character,
      parents: {
        ...character.parents,
        father: updatedFather,
        mother: updatedMother,
      },
      siblings: updatedSiblings,
      children: updatedChildren,
      relationships: updatedRelationships,
    },
    totalImpacted: winnerByKey.size,
    groups: orderedGroups,
  };
}

function syncImprisonmentToWorldState(character: CharacterProfile): CharacterProfile {
  const world = character.worldState;
  if (!world || world.schemaVersion !== 2) return character;

  const relationshipsById = { ...world.relationshipsById };
  const npcRegistry = { ...world.npcRegistry };

  const exPartnerById = new Map<string, PersonProfile>();
  for (const ex of character.exPartners || []) {
    if (ex.id) exPartnerById.set(ex.id, ex);
  }

  const activePartner = character.partner && character.partner.id ? character.partner : null;
  const relById = new Map<string, number>();

  if (character.parents.father.id) {
    relById.set(character.parents.father.id, character.parents.father.relationship);
  }
  if (character.parents.mother.id) {
    relById.set(character.parents.mother.id, character.parents.mother.relationship);
  }
  for (const sib of character.siblings || []) {
    if (sib.id) relById.set(sib.id, sib.relationship);
  }
  for (const child of character.children || []) {
    if (child.id) relById.set(child.id, child.relationship);
  }
  for (const person of character.relationships || []) {
    if (person?.id) relById.set(person.id, person.relationship);
  }

  for (const [edgeId, edge] of Object.entries(relationshipsById)) {
    if (edge.participantAId !== character.id && edge.participantBId !== character.id) continue;
    const otherId = edge.participantAId === character.id ? edge.participantBId : edge.participantAId;

    const exMatch = exPartnerById.get(otherId);
    if (
      exMatch &&
      edge.category !== 'parent_child' &&
      edge.category !== 'sibling'
    ) {
      const clampedRel = clamp0to100(exMatch.relationship);
      relationshipsById[edgeId] = {
        ...edge,
        category: 'ex',
        roleForA: 'ex',
        roleForB: 'ex',
        status: 'former',
        trust: clampedRel,
        affection: clampedRel,
        respect: clampedRel,
        romance: 0,
      };
      if (npcRegistry[otherId]) {
        npcRegistry[otherId] = {
          ...npcRegistry[otherId],
          romanticStage: 'ex',
          legacyRoleLabel: exMatch.role,
          legacyRelationshipType: 'ex',
        };
      }
      continue;
    }

    if (activePartner && activePartner.id === otherId) {
      const clampedRel = clamp0to100(activePartner.relationship);
      const clampedRomance = clamp0to100(activePartner.romanceMeter ?? edge.romance);
      relationshipsById[edgeId] = {
        ...edge,
        trust: clampedRel,
        affection: clampedRel,
        respect: clampedRel,
        romance: clampedRomance,
      };
      continue;
    }

    const updatedRel = relById.get(otherId);
    if (updatedRel !== undefined) {
      const clampedRel = clamp0to100(updatedRel);
      relationshipsById[edgeId] = {
        ...edge,
        trust: clampedRel,
        affection: clampedRel,
        respect: clampedRel,
      };
    }
  }

  return {
    ...character,
    worldState: {
      ...world,
      npcRegistry,
      relationshipsById,
    },
  };
}

export interface MergeProbationOptions {
  recordId?: string;
  offenseClass?: PendingCourtCase['offenseClass'];
  restitutionImposed?: number;
  isParole?: boolean;
  offendedWhileOnProbation?: boolean;
  conditions?: readonly ProbationConditionId[];
}

/**
 * Merges an incoming probation or parole supervision term into `ProbationState`:
 * preserves prior active terms inside `activeTerms[]` cleanly, maintains unique supervision
 * conditions, enforces adult precedence over juvenile jurisdiction, and preserves scalar
 * compatibility for legacy callers.
 */
export function mergeProbationState(
  existing: ProbationState | null,
  incomingChargeTitle: string,
  incomingJurisdiction: LegalJurisdiction,
  incomingYears: number,
  currentAge: number,
  options: MergeProbationOptions = {},
): ProbationState {
  const normalizedYears = Math.max(1, Math.round(incomingYears));
  const incomingConditions = new Set<ProbationConditionId>([
    ...(existing?.conditions ?? []),
    'supervision_checkins',
    'no_new_offenses',
    ...(options.conditions ?? []),
  ]);
  if ((options.restitutionImposed ?? 0) > 0) {
    incomingConditions.add('restitution_payments');
  }
  const communityServiceHours = options.isParole
    ? 0
    : incomingJurisdiction === 'juvenile'
      ? 8 * normalizedYears
      : options.offenseClass === 'felony'
        ? 20 * normalizedYears
        : 12 * normalizedYears;
  if (communityServiceHours > 0) {
    incomingConditions.add('community_service');
  }

  const baseTerms: ProbationTermEntry[] = [];
  if (existing && existing.yearsRemaining > 0) {
    if (Array.isArray(existing.activeTerms) && existing.activeTerms.length > 0) {
      for (const term of existing.activeTerms) {
        if (term.yearsRemaining > 0 || term.communityServiceHoursRemaining > 0) {
          baseTerms.push({ ...term });
        }
      }
    } else if (options.recordId) {
      baseTerms.push({
        recordId: `legacy-probation-${existing.startedAtAge}`,
        chargeTitle: existing.chargeTitle,
        jurisdiction: existing.jurisdiction,
        yearsRemaining: Math.max(1, Math.round(existing.yearsRemaining)),
        startedAtAge: existing.startedAtAge,
        communityServiceHoursRemaining: 0,
        technicalWarnings: existing.technicalWarnings ?? 0,
        violationCount: existing.violationCount ?? 0,
      });
    }
  }

  if (options.recordId) {
    const newTerm: ProbationTermEntry = {
      recordId: options.recordId,
      chargeTitle: incomingChargeTitle,
      jurisdiction: incomingJurisdiction,
      yearsRemaining: normalizedYears,
      startedAtAge: currentAge,
      communityServiceHoursRemaining: communityServiceHours,
      technicalWarnings: 0,
      violationCount: options.offendedWhileOnProbation ? 1 : 0,
    };
    const existingIdx = baseTerms.findIndex((t) => t.recordId === options.recordId);
    if (existingIdx >= 0) {
      baseTerms[existingIdx] = newTerm;
    } else {
      baseTerms.push(newTerm);
    }
  }

  const nextViolationCount =
    (existing?.violationCount ?? 0) + (options.offendedWhileOnProbation ? 1 : 0);

  if (!existing || existing.yearsRemaining <= 0) {
    return {
      chargeTitle: incomingChargeTitle,
      jurisdiction: incomingJurisdiction,
      yearsRemaining: normalizedYears,
      startedAtAge: currentAge,
      lastProgressedAge: null,
      ...(baseTerms.length > 0 ? { activeTerms: baseTerms } : {}),
      conditions: Array.from(incomingConditions),
      lastCheckInAge: existing?.lastCheckInAge ?? null,
      lastServiceActionAge: existing?.lastServiceActionAge ?? null,
      serviceActionsThisYear: existing?.serviceActionsThisYear ?? 0,
      restitutionPaidThisYear: existing?.restitutionPaidThisYear ?? 0,
      technicalWarnings: existing?.technicalWarnings ?? 0,
      violationCount: nextViolationCount,
    };
  }

  return {
    chargeTitle: incomingChargeTitle,
    jurisdiction:
      existing.jurisdiction === 'adult' || incomingJurisdiction === 'adult'
        ? 'adult'
        : 'juvenile',
    yearsRemaining: Math.max(existing.yearsRemaining, normalizedYears),
    startedAtAge: existing.startedAtAge,
    lastProgressedAge: existing.lastProgressedAge,
    ...(baseTerms.length > 0 ? { activeTerms: baseTerms } : {}),
    conditions: Array.from(incomingConditions),
    lastCheckInAge: existing.lastCheckInAge ?? null,
    lastServiceActionAge: existing.lastServiceActionAge ?? null,
    serviceActionsThisYear: existing.serviceActionsThisYear ?? 0,
    restitutionPaidThisYear: existing.restitutionPaidThisYear ?? 0,
    technicalWarnings: existing.technicalWarnings ?? 0,
    violationCount: nextViolationCount,
  };
}

/**
 * Attempts a crime from the v1 catalog using the deterministic 3-stream risk engine.
 * Credited proceeds occur immediately ONLY on undetected success; detected proceeds are
 * held inside PendingCourtCase until immediate legal resolution.
 */
export function attemptCrime(character: CharacterProfile, crimeId: CrimeId): CrimeAttemptResult {
  if (!isValidCrimeId(crimeId)) {
    return {
      ok: false,
      character,
      reason: 'Selected criminal activity does not exist.',
      message: 'Selected criminal activity does not exist.',
    };
  }

  const template = getCrimeTemplate(crimeId);
  const eligibility = isCrimeEligibleForCharacter(character, template);
  if (!eligibility.eligible) {
    const reason = eligibility.reason || 'Not eligible to attempt this crime.';
    return {
      ok: false,
      character,
      reason,
      message: reason,
    };
  }

  const sanitized = getSanitizedCrimeState(character);
  const attemptIndex = sanitized.attemptCountLifetime;
  const nextLifetimeCount = attemptIndex + 1;
  const nextAttemptsThisYear =
    (sanitized.lastAttemptAge === character.age ? sanitized.attemptsThisYear : 0) + 1;

  const roll = evaluateCrimeAttempt(character, template, attemptIndex);
  const year = character.birthYear + character.age;
  const exposure = evaluateEvidenceBasedExposure(character, template, roll, {
    seedKey: String(attemptIndex),
  });
  const moodEval = evaluateAttemptMoodAndKarma(template, roll, character.stats.karma);

  const nextHeat = clamp0to100(
    sanitized.policeHeat + (roll.detected ? template.heatGain : Math.ceil(template.heatGain * 0.6)),
  );
  const nextNotoriety = clamp0to100(
    sanitized.notoriety +
      (roll.executionSucceeded ? template.notorietyGain : Math.floor(template.notorietyGain * 0.25)),
  );

  const statEffects: StatEffects = {
    karma: moodEval.karmaDelta,
  };
  if (moodEval.happinessDelta !== 0) {
    statEffects.happiness = moodEval.happinessDelta;
  }
  if (moodEval.healthDelta !== 0) {
    statEffects.health = moodEval.healthDelta;
  }

  if (roll.executionSucceeded && !roll.detected && roll.attemptedPayout > 0) {
    statEffects.cash = roll.attemptedPayout;
  }

  const baseEventId = deterministicUUID(
    'crime_attempt',
    character.id,
    character.birthYear,
    character.age,
    nextLifetimeCount,
    template.id,
  );

  if (roll.detected) {
    const legalBasePrng = createLegalPrng(character, baseEventId, 'legal_base');
    const baseFine =
      template.baseFineMax > template.baseFineMin
        ? legalBasePrng.nextInt(template.baseFineMin, template.baseFineMax)
        : template.baseFineMin;
    const rawBaseSentence =
      template.baseSentenceYearsMax > template.baseSentenceYearsMin
        ? legalBasePrng.nextInt(template.baseSentenceYearsMin, template.baseSentenceYearsMax)
        : template.baseSentenceYearsMin;
    const baseSentenceYears = roll.jurisdiction === 'juvenile' ? 0 : rawBaseSentence;

    const pendingCase: PendingCourtCase = {
      id: baseEventId,
      crimeId: template.id,
      title: template.title,
      tier: template.tier,
      offenseClass: template.adultOffenseClass,
      jurisdiction: roll.jurisdiction,
      arrestedAtAge: character.age,
      arrestedAtYear: year,
      executionSucceeded: roll.executionSucceeded,
      injured: roll.injured,
      attemptedPayout: roll.attemptedPayout,
      baseFine,
      baseSentenceYears,
      legalStatus: 'pending_trial',
      exposure,
      offendedOnProbation: isOnProbation(character),
      arrestHappinessApplied: moodEval.happinessDelta,
      // Keep non-injury arrest stress strictly separate from roll.injured getaway trauma.
      arrestHealthApplied: 0,
      institutionalReportFiled: false,
    };

    const injuryText = roll.injured
      ? ` You suffered an injury (-${roll.injuryHealthLoss} Health) during the incident.`
      : '';
    const message = roll.executionSucceeded
      ? `Police intercepted you right after attempting ${template.title}. $${roll.attemptedPayout.toLocaleString()} in suspected proceeds was seized by authorities.${injuryText}`
      : `Your ${template.title.toLowerCase()} attempt failed and authorities apprehended you at the scene.${injuryText}`;

    const arrestEvent: LifeEvent = {
      id: `${baseEventId}-evt`,
      age: character.age,
      year,
      title:
        roll.jurisdiction === 'juvenile'
          ? `Juvenile Apprehension: ${template.title}`
          : `Arrested for ${template.title}`,
      message,
      category: 'misfortune',
      icon: '🚓',
    };

    const arrestAwareness = evaluateArrestSocialAwareness({
      jurisdiction: roll.jurisdiction,
      exposure,
      statutoryParentNotification: roll.jurisdiction === 'juvenile',
      institutionalReportFiled: false,
      institutionalTarget: 'none',
    });

    const { character: relUpdated, statEffects: parentEffects } = applyCrimeRelationshipConsequences(
      character,
      {
        parents: arrestAwareness.parentsDelta,
        partner: arrestAwareness.partnerDelta,
        siblings: 0,
      },
    );

    const { character: affected } = applyEffects(
      {
        ...relUpdated,
        crime: {
          ...sanitized,
          policeHeat: nextHeat,
          notoriety: nextNotoriety,
          attemptsThisYear: nextAttemptsThisYear,
          attemptCountLifetime: nextLifetimeCount,
          lastAttemptAge: character.age,
          pendingCase,
        },
        timeline: [...relUpdated.timeline, arrestEvent],
      },
      { ...statEffects, ...parentEffects },
    );

    const careerArrest = applyCareerCrimeConsequence(affected, pendingCase, 'arrest', exposure);

    return {
      ok: true,
      character: careerArrest.character,
      roll,
      exposure,
      pendingCase,
      message,
    };
  }

  // Undetected branch: either clean profit ('undetected') or slipped away empty-handed ('aborted').
  const outcome: CrimeOutcomeStatus = roll.executionSucceeded ? 'undetected' : 'aborted';
  const payout = roll.executionSucceeded ? roll.attemptedPayout : 0;

  const record: CrimeRecordEntry = {
    id: baseEventId,
    crimeId: template.id,
    title: template.title,
    tier: template.tier,
    offenseClass: template.adultOffenseClass,
    jurisdiction: getJurisdictionForAge(character.age),
    age: character.age,
    year,
    executionSucceeded: roll.executionSucceeded,
    detected: false,
    injured: roll.injured,
    outcome,
    exposure,
    sentenceStatus: 'not_applicable',
    attemptedPayout: roll.attemptedPayout,
    payout,
    fineImposed: 0,
    finePaid: 0,
    attorneyFeePaid: 0,
    sentenceYears: 0,
    sealed: false,
    expunged: false,
  };

  const injuryText = roll.injured
    ? ` You took a minor injury (-${roll.injuryHealthLoss} Health) making your getaway.`
    : '';
  const message = roll.executionSucceeded
    ? payout > 0
      ? `You pulled off ${template.title} undetected and pocketed $${payout.toLocaleString()}.${injuryText}`
      : `You completed ${template.title} and slipped away without detection.${injuryText}`
    : `Your ${template.title.toLowerCase()} attempt fell apart, but you escaped before police arrived.${injuryText}`;

  const crimeEvent: LifeEvent = {
    id: `${baseEventId}-evt`,
    age: character.age,
    year,
    title: roll.executionSucceeded ? `${template.title} Unnoticed` : `${template.title} Aborted`,
    message,
    category: roll.executionSucceeded ? 'money' : 'misfortune',
    icon: template.icon,
  };

  const { character: affected } = applyEffects(
    {
      ...character,
      crime: {
        ...sanitized,
        policeHeat: nextHeat,
        notoriety: nextNotoriety,
        attemptsThisYear: nextAttemptsThisYear,
        attemptCountLifetime: nextLifetimeCount,
        lastAttemptAge: character.age,
        records: [...sanitized.records, record],
      },
      timeline: [...character.timeline, crimeEvent],
    },
    statEffects,
  );

  return {
    ok: true,
    character: affected,
    roll,
    exposure,
    record,
    message,
  };
}

export function determineCourtOutcome(
  character: Pick<CharacterProfile, 'id' | 'birthYear' | 'age' | 'stats' | 'crime'>,
  pendingCase: PendingCourtCase,
  strategyId: DefenseStrategyId,
): CrimeOutcomeStatus {
  const strategy = getDefenseStrategy(strategyId);
  const sanitized = getSanitizedCrimeState(character);
  const prng = createLegalPrng(character, pendingCase.id, `court_resolution::${strategyId}`);
  const smartsBonus = (character.stats.smarts - 50) * 0.001;
  const failedAttemptBonus = pendingCase.executionSucceeded ? 0 : 0.07;

  if (pendingCase.jurisdiction === 'juvenile') {
    const priorJuvenileFindings = sanitized.records.filter(
      (r) =>
        r.jurisdiction === 'juvenile' &&
        (r.outcome === 'fined' || r.outcome === 'probation' || r.outcome === 'warned'),
    ).length;

    const candidates: Array<{ outcome: CrimeOutcomeStatus; weight: number }> = [
      {
        outcome: 'dismissed',
        weight: Math.max(0.04, 0.14 + strategy.dismissalBonus + failedAttemptBonus + smartsBonus),
      },
      {
        outcome: 'acquitted',
        weight: Math.max(0.04, 0.14 + strategy.acquittalBonus + failedAttemptBonus),
      },
      {
        outcome: 'warned',
        weight: Math.max(
          0.05,
          (priorJuvenileFindings === 0 ? 0.34 : 0.14) -
            (pendingCase.offenseClass === 'felony' ? 0.08 : 0),
        ),
      },
      {
        outcome: 'fined',
        weight: 0.24,
      },
      {
        outcome: 'probation',
        weight: Math.max(
          0.08,
          (priorJuvenileFindings > 0 ? 0.28 : 0.14) +
            (pendingCase.offenseClass === 'felony' ? 0.1 : 0) -
            strategy.acquittalBonus * 0.3,
        ),
      },
    ];

    const picked = prng.pickWeighted(candidates);
    return picked ? picked.outcome : 'warned';
  }

  const priorAdultCount = getActiveAdultConvictions(character).length;
  const isFelony = pendingCase.offenseClass === 'felony';
  const isHighStakes = pendingCase.tier === 'high_stakes';
  const isBankHeist = pendingCase.crimeId === 'bank_heist';
  const offendingOnProbation = Boolean(pendingCase.offendedOnProbation || isOnProbation(character));
  const revMod = offendingOnProbation
    ? evaluateProbationRevocationModifier(pendingCase, sanitized.probation?.violationCount ?? 0)
    : null;
  const effectiveProbationShift = revMod
    ? Math.max(0, strategy.shiftsPrisonToProbationBonus - revMod.probationShiftReduction)
    : strategy.shiftsPrisonToProbationBonus;
  const prisonBoost = revMod ? revMod.prisonWeightBoost : 0;

  let adultCandidates: Array<{ outcome: CrimeOutcomeStatus; weight: number }>;
  if (isHighStakes) {
    // High-stakes violent felonies (Armed Robbery, Bank Heist): never fine-only, heavily weighted
    // toward incarceration when caught red-handed, with very low public-defender walk-free odds.
    const failedBoost = pendingCase.executionSucceeded ? 0 : 0.03;
    adultCandidates = [
      {
        outcome: 'dismissed',
        weight: Math.max(
          0.005,
          (isBankHeist ? 0.01 : 0.015) +
            strategy.dismissalBonus * 0.45 +
            failedBoost +
            smartsBonus * 0.3,
        ),
      },
      {
        outcome: 'acquitted',
        weight: Math.max(
          0.005,
          (isBankHeist ? 0.015 : 0.025) + strategy.acquittalBonus * 0.5 + failedBoost,
        ),
      },
      {
        outcome: 'probation',
        weight: Math.max(
          0.02,
          (isBankHeist ? 0.04 : 0.1) +
            effectiveProbationShift * 0.45 -
            Math.min(0.06, priorAdultCount * 0.03),
        ),
      },
      {
        outcome: 'imprisoned',
        weight: Math.max(
          0.25,
          (isBankHeist ? 0.93 : 0.86) +
            Math.min(0.24, priorAdultCount * 0.08) +
            prisonBoost -
            effectiveProbationShift * 0.45 -
            strategy.acquittalBonus * 0.3,
        ),
      },
    ];
  } else if (isFelony) {
    // Mid-tier felonies (Financial Scam, Burglary, Vehicle Theft)
    adultCandidates = [
      {
        outcome: 'dismissed',
        weight: Math.max(
          0.02,
          0.06 + strategy.dismissalBonus * 0.85 + failedAttemptBonus + smartsBonus,
        ),
      },
      {
        outcome: 'acquitted',
        weight: Math.max(0.02, 0.08 + strategy.acquittalBonus * 0.85 + failedAttemptBonus),
      },
      {
        outcome: 'fined',
        weight: Math.max(0.05, 0.14 - Math.min(0.08, priorAdultCount * 0.03)),
      },
      {
        outcome: 'probation',
        weight: Math.max(0.08, 0.3 + effectiveProbationShift * 0.7),
      },
      {
        outcome: 'imprisoned',
        weight: Math.max(
          0.05,
          0.42 +
            Math.min(0.2, priorAdultCount * 0.07) +
            prisonBoost -
            effectiveProbationShift -
            strategy.acquittalBonus * 0.35,
        ),
      },
    ];
  } else {
    // Petty misdemeanors (Shoplifting, Vandalism, Pickpocketing)
    adultCandidates = [
      {
        outcome: 'dismissed',
        weight: Math.max(0.03, 0.1 + strategy.dismissalBonus + failedAttemptBonus + smartsBonus),
      },
      {
        outcome: 'acquitted',
        weight: Math.max(0.04, 0.12 + strategy.acquittalBonus + failedAttemptBonus),
      },
      {
        outcome: 'fined',
        weight: 0.42,
      },
      {
        outcome: 'probation',
        weight: Math.max(0.08, 0.22 + effectiveProbationShift * 0.7),
      },
      {
        outcome: 'imprisoned',
        weight: Math.max(
          0.02,
          (pendingCase.baseSentenceYears > 0
            ? 0.08 + Math.min(0.18, priorAdultCount * 0.06) + prisonBoost
            : 0.02 + prisonBoost * 0.5) -
            effectiveProbationShift -
            strategy.acquittalBonus * 0.4,
        ),
      },
    ];
  }

  const picked = prng.pickWeighted(adultCandidates);
  return picked ? picked.outcome : 'fined';
}

/**
 * Resolves the character's pending court case with the selected defense strategy.
 * Handles held proceeds release/forfeiture, juvenile cash-capped fines vs. adult unpaidFines,
 * probation merging, custodial job firing, and targeted family/partner relationship reactions.
 */
export function resolveCourtCase(
  character: CharacterProfile,
  strategyId: DefenseStrategyId,
): CourtResolutionResult {
  const sanitized = getSanitizedCrimeState(character);
  const pendingCase = sanitized.pendingCase;
  if (!pendingCase) {
    return {
      ok: false,
      character,
      reason: 'No pending court case to resolve.',
      releasedPayout: 0,
      fineImposed: 0,
      finePaid: 0,
      unpaidFineAdded: 0,
      attorneyFeePaid: 0,
      sentenceYears: 0,
      probationYears: 0,
      employmentTerminated: false,
      message: 'No pending court case to resolve.',
    };
  }

  const strategy = getDefenseStrategy(strategyId);
  const attorneyFee = getAttorneyFeeForCase(strategyId, pendingCase.tier);
  if (attorneyFee > 0 && character.cash < attorneyFee) {
    return {
      ok: false,
      character,
      reason: `You need $${attorneyFee.toLocaleString()} in cash to retain ${strategy.title}.`,
      releasedPayout: 0,
      fineImposed: 0,
      finePaid: 0,
      unpaidFineAdded: 0,
      attorneyFeePaid: 0,
      sentenceYears: 0,
      probationYears: 0,
      employmentTerminated: false,
      message: `Insufficient cash for ${strategy.title}.`,
    };
  }

  const outcome = determineCourtOutcome(character, pendingCase, strategyId);
  return applyCourtOutcome(character, pendingCase, strategyId, outcome);
}

/**
 * Applies a resolved legal outcome for a pending case (used directly by resolveCourtCase).
 */
export function applyCourtOutcome(
  character: CharacterProfile,
  pendingCase: PendingCourtCase,
  strategyId: DefenseStrategyId,
  rawOutcome: CrimeOutcomeStatus,
): CourtResolutionResult {
  const sanitized = getSanitizedCrimeState(character);
  const strategy = getDefenseStrategy(strategyId);
  const attorneyFee = getAttorneyFeeForCase(strategyId, pendingCase.tier);
  const isJuvenile = pendingCase.jurisdiction === 'juvenile';

  if (sanitized.records.some((r) => r.id === pendingCase.id)) {
    return {
      ok: false,
      character,
      reason: 'Court case has already been finalized.',
      releasedPayout: 0,
      fineImposed: 0,
      finePaid: 0,
      unpaidFineAdded: 0,
      attorneyFeePaid: 0,
      sentenceYears: 0,
      probationYears: 0,
      employmentTerminated: false,
      message: 'Court case has already been finalized.',
    };
  }

  // Enforce strict jurisdiction boundary on outcome status.
  let outcome = rawOutcome;
  if (isJuvenile && outcome === 'imprisoned') {
    outcome = 'probation';
  }
  if (!isJuvenile && outcome === 'warned') {
    outcome = 'fined';
  }

  // Deduct cash-only attorney fee upfront (leaving bankBalance untouched).
  let workingChar = character;
  if (attorneyFee > 0) {
    workingChar = applyEffects(workingChar, { cash: -attorneyFee }).character;
  }

  const prng = createLegalPrng(workingChar, pendingCase.id, `disposition::${strategyId}`);
  const isFelony = pendingCase.offenseClass === 'felony';
  const template = getCrimeTemplate(pendingCase.crimeId);
  const exposure: CrimeExposureLevel =
    pendingCase.exposure ??
    evaluateEvidenceBasedExposure(
      workingChar,
      template,
      {
        detected: true,
        jurisdiction: pendingCase.jurisdiction,
        executionSucceeded: pendingCase.executionSucceeded,
      },
      {
        explicitWitnessSignal: pendingCase.explicitWitnessSignal,
        institutionalReportFiled: pendingCase.institutionalReportFiled,
        seedKey: pendingCase.id,
      },
    );
  const offendingOnProbation = Boolean(pendingCase.offendedOnProbation || isOnProbation(workingChar));

  let releasedPayout = 0;
  let fineImposed = 0;
  let finePaid = 0;
  let unpaidFineAdded = 0;
  let sentenceYears = 0;
  let probationYears = 0;
  let employmentTerminated = false;
  let careerReinstated = false;
  let terminatedJobTitle: string | null = null;
  let closedBusinessName: string | null = null;
  let businessLiquidationProceeds = 0;
  let businessDisposition: CourtResolutionResult['businessDisposition'] = 'none';
  let forfeitedProceeds = 0;
  let nextPrison: PrisonState | null = sanitized.prison;
  let nextProbation: ProbationState | null = sanitized.probation;
  let relSpec: RelationshipDeltaSpec = { parents: 0, partner: 0, siblings: 0 };
  const extraStatEffects: StatEffects = {};
  let heatDelta = 0;

  // Approach B: separate statutory fines, state forfeiture, and victim restitution.
  const victimEval = evaluateVictimLossAndRestitution(pendingCase, outcome, prng);
  const restitutionImposed = victimEval.restitutionImposed;
  const restitutionPaid = 0;
  const unpaidRestitutionAdded =
    !isJuvenile && outcome !== 'dismissed' && outcome !== 'acquitted' && outcome !== 'warned'
      ? restitutionImposed
      : 0;
  const probationViolated = Boolean(
    offendingOnProbation &&
      (outcome === 'fined' || outcome === 'probation' || outcome === 'imprisoned'),
  );

  const baseRawFine = Math.max(
    isJuvenile ? 25 : 75,
    Math.round(pendingCase.baseFine * (isJuvenile ? 0.4 : 1) * strategy.fineMultiplier),
  );
  const preSettlementCash = Math.max(0, workingChar.cash);

  switch (outcome) {
    case 'dismissed':
    case 'acquitted': {
      // Seized stolen proceeds are never paid out as criminal profit upon dismissal or acquittal.
      releasedPayout = 0;
      relSpec = {
        parents: isJuvenile || exposure !== 'private' ? 2 : 0,
        partner: exposure === 'publicly_reported' ? 2 : 0,
        siblings: 0,
      };
      heatDelta = -6;
      break;
    }

    case 'warned': {
      // Juvenile informal warning: held loot forfeited, cash-capped modest statutory fine/restitution, $0 unpaid debt.
      const suggestedRestitution = prng.nextInt(0, JUVENILE_WARNING_RESTITUTION_MAX);
      fineImposed = Math.min(preSettlementCash, suggestedRestitution);
      finePaid = fineImposed;
      if (finePaid > 0) {
        extraStatEffects.cash = -finePaid;
      }
      relSpec = { parents: -4, partner: -2, siblings: 0 };
      heatDelta = -4;
      break;
    }

    case 'fined': {
      if (isJuvenile) {
        fineImposed = Math.min(preSettlementCash, baseRawFine);
        finePaid = fineImposed;
      } else {
        fineImposed = baseRawFine;
        finePaid = Math.min(preSettlementCash, fineImposed);
        unpaidFineAdded = fineImposed - finePaid;
      }
      if (finePaid > 0) {
        extraStatEffects.cash = -finePaid;
      }
      relSpec = {
        parents: isFelony ? -12 : -6,
        partner: isFelony ? -10 : -6,
        siblings: -4,
      };
      heatDelta = -5;
      break;
    }

    case 'probation': {
      probationYears = isJuvenile
        ? prng.nextInt(1, 2)
        : isFelony
          ? prng.nextInt(2, 4)
          : prng.nextInt(1, 2);

      nextProbation = mergeProbationState(
        sanitized.probation,
        pendingCase.title,
        pendingCase.jurisdiction,
        probationYears,
        workingChar.age,
        {
          recordId: pendingCase.id,
          offenseClass: pendingCase.offenseClass,
          restitutionImposed: unpaidRestitutionAdded,
          offendedWhileOnProbation: offendingOnProbation,
        },
      );

      const probationFineRaw = Math.round(baseRawFine * 0.5);
      if (isJuvenile) {
        fineImposed = Math.min(preSettlementCash, probationFineRaw);
        finePaid = fineImposed;
      } else {
        fineImposed = probationFineRaw;
        finePaid = Math.min(preSettlementCash, fineImposed);
        unpaidFineAdded = fineImposed - finePaid;
      }
      if (finePaid > 0) {
        extraStatEffects.cash = -finePaid;
      }
      relSpec = {
        parents: isFelony ? -14 : -8,
        partner: isFelony ? -12 : -8,
        siblings: -4,
      };
      heatDelta = -8;
      break;
    }

    case 'imprisoned': {
      sentenceYears = Math.max(
        1,
        Math.round(Math.max(1, pendingCase.baseSentenceYears) * strategy.sentenceMultiplier),
      );
      forfeitedProceeds = victimEval.stateForfeitedProceeds;

      const priorAdultPrisonCount = sanitized.records.filter(
        (r) => r.jurisdiction === 'adult' && r.outcome === 'imprisoned',
      ).length;
      const facility = selectPrisonFacility(
        pendingCase.tier,
        pendingCase.offenseClass,
        sentenceYears,
        priorAdultPrisonCount,
      );

      const priorRetirementOccupation =
        sanitized.prison?.priorRetirementOccupation !== undefined
          ? sanitized.prison.priorRetirementOccupation
          : workingChar.occupation === 'Retired' ||
              workingChar.occupation === 'Retired Entrepreneur'
            ? workingChar.occupation
            : null;

      nextPrison = {
        facilityName: facility.facilityName,
        securityLevel: facility.securityLevel,
        chargeTitle: pendingCase.title,
        yearsTotal: sentenceYears,
        yearsServed: 0,
        yearsRemaining: sentenceYears,
        behaviorScore: 55,
        paroleEligibleAtServed: Math.max(1, Math.ceil(sentenceYears * 0.5)),
        actionsTakenThisYear: 0,
        lastActionAge: null,
        lastProgressedAge: null,
        originCaseId: pendingCase.id,
        priorRetirementOccupation,
      };

      if (nextProbation && offendingOnProbation) {
        nextProbation = {
          ...nextProbation,
          violationCount: (nextProbation.violationCount ?? 0) + 1,
        };
      }

      // Apply business continuity/liquidation BEFORE statutory fine settlement so any legitimate
      // shareholder winding-up distribution becomes personal cash cleanly once (never using
      // an active/paused company's corporate treasury to pay personal fines or restitution).
      const bizPrisonRes = applyBusinessCrimeConsequence(workingChar, pendingCase, 'imprisoned', exposure);
      workingChar = {
        ...bizPrisonRes.character,
        occupation: 'Incarcerated',
      };
      closedBusinessName = bizPrisonRes.closedBusinessName;
      businessLiquidationProceeds = bizPrisonRes.payoutAmount;
      businessDisposition = mapBusinessDisposition(bizPrisonRes.decision.action);

      // Settle statutory court fine from personal wallet cash only (bankBalance untouched).
      const postLiquidationCash = Math.max(0, workingChar.cash);
      const prisonFineRaw = Math.round(baseRawFine * 0.6);
      fineImposed = prisonFineRaw;
      finePaid = Math.min(postLiquidationCash, fineImposed);
      unpaidFineAdded = fineImposed - finePaid;
      if (finePaid > 0) {
        extraStatEffects.cash = -finePaid;
      }

      heatDelta = -12;
      break;
    }

    default:
      break;
  }

  // Evaluate mood, karma, and cause-driven physical health (de-duplicating arrest shock, 0 looks loss).
  const physicalMood = evaluatePhysicalAndMoodImpact(
    pendingCase,
    outcome,
    workingChar.stats.health,
  );
  if (physicalMood.happinessDelta !== 0) {
    extraStatEffects.happiness = physicalMood.happinessDelta;
  }
  if (physicalMood.karmaDelta !== 0) {
    extraStatEffects.karma = physicalMood.karmaDelta;
  }
  if (physicalMood.healthDelta !== 0) {
    extraStatEffects.health = physicalMood.healthDelta;
  }

  // Integrate Phase 2 Career consequences cleanly (idempotent per caseId).
  const careerRes = applyCareerCrimeConsequence(workingChar, pendingCase, outcome, exposure);
  workingChar = careerRes.character;
  employmentTerminated = careerRes.terminated;
  terminatedJobTitle = careerRes.terminatedJobTitle;
  careerReinstated = careerRes.reinstated;

  // Integrate Phase 2 Business scandal consequences for non-custodial verdicts.
  if (outcome !== 'imprisoned') {
    const bizRes = applyBusinessCrimeConsequence(workingChar, pendingCase, outcome, exposure);
    workingChar = bizRes.character;
    businessDisposition = mapBusinessDisposition(bizRes.decision.action);
  }

  // Integrate Phase 2 Education consequences cleanly across K-12 & higher education.
  const eduRes = applyEducationCrimeConsequence(workingChar, pendingCase, outcome, exposure);
  workingChar = eduRes.character;
  const expelledFromSchool = eduRes.expelledFromSchool;
  const educationDisposition = eduRes.disposition;

  if (
    outcome !== 'imprisoned' &&
    (employmentTerminated || careerReinstated || educationDisposition === 'expelled')
  ) {
    workingChar = {
      ...workingChar,
      occupation: resolveCharacterOccupation(workingChar, {
        age: workingChar.age,
        currentOccupationBaseline: 'Unemployed',
        educationStage: workingChar.education.currentStage,
        professionalSchool: workingChar.education.professionalSchool,
        activeJobTitle: workingChar.career.currentJob?.title,
        business: workingChar.business,
      }),
    };
  }

  const record: CrimeRecordEntry = {
    id: pendingCase.id,
    crimeId: pendingCase.crimeId,
    title: pendingCase.title,
    tier: pendingCase.tier,
    offenseClass: pendingCase.offenseClass,
    jurisdiction: pendingCase.jurisdiction,
    age: workingChar.age,
    year: workingChar.birthYear + workingChar.age,
    executionSucceeded: pendingCase.executionSucceeded,
    detected: true,
    injured: pendingCase.injured,
    outcome,
    exposure,
    sentenceStatus:
      outcome === 'imprisoned' || outcome === 'probation' ? 'active' : 'not_applicable',
    attemptedPayout: pendingCase.attemptedPayout,
    payout: releasedPayout,
    stateForfeitedProceeds: victimEval.stateForfeitedProceeds,
    recoveredPropertyReturnedToVictim: victimEval.recoveredPropertyReturnedToVictim,
    remainingVictimLoss: victimEval.remainingVictimLoss,
    restitutionImposed,
    restitutionPaid,
    fineImposed,
    finePaid,
    attorneyFeePaid: attorneyFee,
    sentenceYears,
    sealed: false,
    expunged: false,
  };

  let message = '';
  let eventCategory: LifeEvent['category'] = 'misfortune';
  let eventIcon = '⚖️';

  if (outcome === 'dismissed') {
    eventCategory = 'milestone';
    message = `Charges for ${pendingCase.title} were dismissed.${
      pendingCase.executionSucceeded && pendingCase.attemptedPayout > 0
        ? ' Seized property and suspected proceeds remained in police custody.'
        : ''
    }`;
  } else if (outcome === 'acquitted') {
    eventCategory = 'milestone';
    message = `Found Not Guilty of ${pendingCase.title}.${
      pendingCase.executionSucceeded && pendingCase.attemptedPayout > 0
        ? ' Seized property and suspected proceeds remained in police custody.'
        : ''
    }`;
  } else if (outcome === 'warned') {
    eventIcon = '⚠️';
    message = `Juvenile intake issued an official warning for ${pendingCase.title} and notified your parents.${
      finePaid > 0 ? ` Paid $${finePaid.toLocaleString()} in restitution.` : ''
    }`;
  } else if (outcome === 'fined') {
    const expelledText = expelledFromSchool ? ` You were expelled from ${expelledFromSchool}.` : '';
    const restitutionText =
      unpaidRestitutionAdded > 0
        ? ` Victim restitution ordered: $${unpaidRestitutionAdded.toLocaleString()}.`
        : '';
    message = `${
      isJuvenile ? 'Juvenile court' : 'Criminal court'
    } ordered a $${fineImposed.toLocaleString()} fine for ${pendingCase.title}. Paid $${finePaid.toLocaleString()}${
      unpaidFineAdded > 0 ? ` ($${unpaidFineAdded.toLocaleString()} added to unpaid fines)` : ''
    }.${restitutionText}${expelledText}`;
  } else if (outcome === 'probation') {
    const jobLossText = employmentTerminated ? ' Your civilian job was terminated.' : '';
    const expelledText = expelledFromSchool ? ` You were expelled from ${expelledFromSchool}.` : '';
    message = `Sentenced to ${probationYears} year(s) of ${
      isJuvenile ? 'juvenile' : 'adult'
    } probation for ${pendingCase.title}.${
      fineImposed > 0 ? ` Fine: $${fineImposed.toLocaleString()} (paid $${finePaid.toLocaleString()}).` : ''
    }${jobLossText}${expelledText}`;
  } else {
    eventIcon = '⛓️';
    const closedBizText = closedBusinessName
      ? ` ${closedBusinessName} was liquidated ($${businessLiquidationProceeds.toLocaleString()} recovered).`
      : '';
    const expelledText = expelledFromSchool ? ` Expelled from ${expelledFromSchool}.` : '';
    message = `Sentenced to ${sentenceYears} year(s) at ${nextPrison?.facilityName || 'state prison'} for ${pendingCase.title}.${
      employmentTerminated ? ' Your civilian job was terminated.' : ''
    }${closedBizText}${expelledText}`;
  }

  const courtEvent: LifeEvent = {
    id: `${pendingCase.id}-court`,
    age: workingChar.age,
    year: workingChar.birthYear + workingChar.age,
    title: `Court Verdict: ${pendingCase.title}`,
    message,
    category: eventCategory,
    icon: eventIcon,
  };

  let relChar: CharacterProfile;
  let parentEffects: Partial<StatEffects> = {};
  let prisonConsequences: PrisonConsequencesSummary | undefined;

  if (outcome === 'imprisoned' && nextPrison) {
    const partnerResult = applyImprisonmentPartnerConsequence(
      workingChar,
      sentenceYears,
      isFelony,
    );
    const socialResult = applySocialConsequencesForSentence(
      partnerResult.character,
      partnerResult.excludedPartnerId,
      partnerResult.excludedPartnerKey,
      PRISON_SOCIAL_DELTAS,
    );
    relChar = socialResult.character;

    prisonConsequences = {
      facilityName: nextPrison.facilityName,
      securityLevel: nextPrison.securityLevel,
      sentenceYears,
      paroleEligibleAtServed: nextPrison.paroleEligibleAtServed,
      paroleEligibleAge: workingChar.age + nextPrison.paroleEligibleAtServed,
      releaseAge: workingChar.age + sentenceYears,
      forfeitedProceeds,
      fineImposed,
      finePaid,
      unpaidFineAdded,
      attorneyFeePaid: attorneyFee,
      terminatedJobTitle,
      closedBusinessName,
      businessLiquidationProceeds,
      expelledFromSchool,
      partnerConsequence: partnerResult.summary,
      socialConsequences: {
        totalImpacted: socialResult.totalImpacted,
        groups: socialResult.groups,
      },
      happinessDelta: extraStatEffects.happiness ?? -18,
      restrictions: [
        'Street crimes locked until release',
        'Civilian employment & business ownership blocked',
        'Ordinary outside-world events suspended',
      ],
    };
  } else if (outcome === 'probation' && !isJuvenile) {
    const probAwareness = evaluateAwarenessSocialScale('probation', exposure);
    const probPartnerResult = applyProbationPartnerConsequence(
      workingChar,
      isFelony,
      probAwareness.householdScale,
    );
    const scaledProbDeltas = scaleSocialDeltas(
      isFelony ? PROBATION_FELONY_SOCIAL_DELTAS : PROBATION_MISDEMEANOR_SOCIAL_DELTAS,
      'probation',
      exposure,
    );
    const probSocialResult = applySocialConsequencesForSentence(
      probPartnerResult.character,
      probPartnerResult.excludedPartnerId,
      probPartnerResult.excludedPartnerKey,
      scaledProbDeltas,
    );
    relChar = probSocialResult.character;
  } else {
    const verdictAwareness =
      outcome === 'dismissed' || outcome === 'acquitted'
        ? { householdScale: 1 }
        : evaluateAwarenessSocialScale(outcome, exposure);
    const scaledRelSpec: RelationshipDeltaSpec = {
      parents: Math.round(relSpec.parents * verdictAwareness.householdScale),
      partner: Math.round(relSpec.partner * verdictAwareness.householdScale),
      siblings: Math.round(relSpec.siblings * verdictAwareness.householdScale),
    };
    const relOutcome = applyCrimeRelationshipConsequences(workingChar, scaledRelSpec);
    relChar = relOutcome.character;
    parentEffects = relOutcome.statEffects;
  }

  const { character: effectedChar } = applyEffects(
    {
      ...relChar,
      occupation: outcome === 'imprisoned' ? 'Incarcerated' : relChar.occupation,
      crime: {
        ...sanitized,
        policeHeat: clamp0to100(sanitized.policeHeat + heatDelta),
        unpaidFines: sanitized.unpaidFines + unpaidFineAdded,
        unpaidRestitution: (sanitized.unpaidRestitution ?? 0) + unpaidRestitutionAdded,
        pendingCase: null,
        prison: nextPrison,
        probation: nextProbation,
        ...(outcome === 'imprisoned' ? { lastMidYearReleaseAge: null } : {}),
        records: [...sanitized.records, record],
      },
      timeline: [...relChar.timeline, courtEvent],
    },
    { ...extraStatEffects, ...parentEffects },
  );

  let finalChar = stampPlayerNetWorth(effectedChar);
  if ((outcome === 'imprisoned' || outcome === 'probation') && character.worldState?.schemaVersion === 2) {
    finalChar = syncImprisonmentToWorldState(finalChar);
  }

  const appliedStatDeltas: Partial<Record<'happiness' | 'karma' | 'health' | 'looks', number>> = {};
  if (extraStatEffects.happiness) appliedStatDeltas.happiness = extraStatEffects.happiness;
  if (extraStatEffects.karma) appliedStatDeltas.karma = extraStatEffects.karma;
  if (extraStatEffects.health) appliedStatDeltas.health = extraStatEffects.health;

  return {
    ok: true,
    character: finalChar,
    outcome,
    exposure,
    record,
    releasedPayout,
    stateForfeitedProceeds: victimEval.stateForfeitedProceeds,
    recoveredPropertyReturnedToVictim: victimEval.recoveredPropertyReturnedToVictim,
    remainingVictimLoss: victimEval.remainingVictimLoss,
    restitutionImposed,
    restitutionPaid,
    unpaidRestitutionAdded,
    fineImposed,
    finePaid,
    unpaidFineAdded,
    attorneyFeePaid: attorneyFee,
    sentenceYears,
    probationYears,
    probationViolated,
    employmentTerminated,
    terminatedJobTitle,
    expelledFromSchool,
    educationDisposition,
    businessDisposition,
    appliedStatDeltas,
    prisonConsequences,
    message,
  };
}

/**
 * Voluntary cash-only payment toward outstanding adult unpaidFines.
 */
export function payUnpaidFines(character: CharacterProfile, amount?: number): FinePaymentResult {
  const sanitized = getSanitizedCrimeState(character);
  if (!character.isAlive) {
    return {
      ok: false,
      character,
      reason: 'Deceased characters cannot pay fines.',
      paidAmount: 0,
      remainingUnpaidFines: sanitized.unpaidFines,
      message: 'Deceased characters cannot pay fines.',
    };
  }
  if (sanitized.unpaidFines <= 0) {
    return {
      ok: false,
      character,
      reason: 'You have no outstanding court fines.',
      paidAmount: 0,
      remainingUnpaidFines: 0,
      message: 'No outstanding court fines.',
    };
  }

  const availableCash = Math.max(0, Math.floor(character.cash));
  if (availableCash <= 0) {
    return {
      ok: false,
      character,
      reason: 'You have no available cash to put toward court fines.',
      paidAmount: 0,
      remainingUnpaidFines: sanitized.unpaidFines,
      message: 'Insufficient cash to pay court fines.',
    };
  }

  const requested =
    amount !== undefined && Number.isFinite(amount) && amount > 0
      ? Math.floor(amount)
      : sanitized.unpaidFines;
  const paidAmount = Math.min(availableCash, sanitized.unpaidFines, requested);
  if (paidAmount <= 0) {
    return {
      ok: false,
      character,
      reason: 'Invalid fine payment amount.',
      paidAmount: 0,
      remainingUnpaidFines: sanitized.unpaidFines,
      message: 'Invalid fine payment amount.',
    };
  }

  const remainingUnpaidFines = sanitized.unpaidFines - paidAmount;
  const paymentEvent: LifeEvent = {
    id: deterministicUUID(
      'crime_fine_pay',
      character.id,
      character.age,
      sanitized.unpaidFines,
      paidAmount,
    ),
    age: character.age,
    year: character.birthYear + character.age,
    title: 'Court Fine Payment',
    message: `Paid $${paidAmount.toLocaleString()} toward outstanding court fines. Remaining balance: $${remainingUnpaidFines.toLocaleString()}.`,
    category: 'money',
    icon: '💵',
  };

  const { character: finalChar } = applyEffects(
    {
      ...character,
      crime: {
        ...sanitized,
        unpaidFines: remainingUnpaidFines,
      },
      timeline: [...character.timeline, paymentEvent],
    },
    { cash: -paidAmount },
  );

  return {
    ok: true,
    character: finalChar,
    paidAmount,
    remainingUnpaidFines,
    message: paymentEvent.message,
  };
}

/**
 * Petitions to formally expunge an eligible adult conviction record after clean waiting years.
 * Never sets `sealed` on adult records and never alters juvenile records.
 */
export function expungeAdultRecord(
  character: CharacterProfile,
  recordId: string,
): ExpungementResult {
  const sanitized = getSanitizedCrimeState(character);
  if (!character.isAlive) {
    return {
      ok: false,
      character,
      reason: 'Deceased characters cannot file for expungement.',
      message: 'Deceased characters cannot file for expungement.',
    };
  }

  const eligibleRecords = getExpungementEligibleRecords(character);
  const targetRecord = eligibleRecords.find((r) => r.id === recordId);
  if (!targetRecord) {
    return {
      ok: false,
      character,
      reason: 'This record is not eligible for adult expungement.',
      message: 'Record does not meet clean waiting period or adult eligibility requirements.',
    };
  }

  const expungedEntry: CrimeRecordEntry = {
    ...targetRecord,
    expunged: true,
  };

  const nextRecords = sanitized.records.map((entry) =>
    entry.id === targetRecord.id ? expungedEntry : entry,
  );

  const expungeEvent: LifeEvent = {
    id: `${targetRecord.id}-expunged`,
    age: character.age,
    year: character.birthYear + character.age,
    title: 'Record Expunged',
    message: `Your adult conviction for ${targetRecord.title} was formally expunged after completing the clean waiting period.`,
    category: 'milestone',
    icon: '📜',
  };

  const { character: finalChar } = applyEffects(
    {
      ...character,
      crime: {
        ...sanitized,
        records: nextRecords,
      },
      timeline: [...character.timeline, expungeEvent],
    },
    { happiness: 5 },
  );

  return {
    ok: true,
    character: finalChar,
    expungedRecord: expungedEntry,
    message: expungeEvent.message,
  };
}

/**
 * Handles the 3-Tier Record Relief petition flow:
 * - Tier 1 (`standard`): delegates to `expungeAdultRecord` ($0 fee, guaranteed).
 * - Tier 2 (`court_petition`): imprisoned non-violent felonies (self-filed $2k or attorney $8k).
 * - Tier 3 (`executive_pardon`): imprisoned violent felonies (Governor's Pardon $15k, Karma >= 60).
 *
 * Fees are strictly cash-only (never touching bank balance or corporate treasury).
 * Approved petitions set `expunged: true` (and `pardoned: true` for Tier 3), which automatically
 * clears all downstream financing, career, business, and identity record checks.
 */
export function petitionRecordRelief(
  character: CharacterProfile,
  recordId: string,
  optionId: RecordReliefOptionId,
  rng: () => number = Math.random,
): RecordReliefPetitionResult {
  if (!character.isAlive) {
    return {
      ok: false,
      granted: false,
      character,
      feePaid: 0,
      reason: 'Deceased characters cannot file for record relief.',
      message: 'Deceased characters cannot file for record relief.',
    };
  }

  const sanitized = getSanitizedCrimeState(character);
  const targetRecord = sanitized.records.find((r) => r.id === recordId);
  if (!targetRecord) {
    return {
      ok: false,
      granted: false,
      character,
      feePaid: 0,
      reason: 'Criminal record not found.',
      message: 'Criminal record not found.',
    };
  }

  const status = evaluateRecordReliefStatus(character, targetRecord);
  if (!status) {
    return {
      ok: false,
      granted: false,
      character,
      feePaid: 0,
      reason: 'This record is not an active adult conviction eligible for relief.',
      message: 'This record is not an active adult conviction eligible for relief.',
    };
  }

  if (status.tier === 'standard') {
    const stdRes = expungeAdultRecord(character, recordId);
    return {
      ok: stdRes.ok,
      granted: stdRes.ok,
      character: stdRes.character,
      tier: 'standard',
      optionId: 'standard_free',
      feePaid: 0,
      approvalProbability: 1,
      updatedRecord: stdRes.expungedRecord,
      reason: stdRes.reason,
      message: stdRes.message,
    };
  }

  if (!status.eligibleNow) {
    const reason = status.blockingReasons[0] || 'This record does not yet meet relief requirements.';
    return {
      ok: false,
      granted: false,
      character,
      tier: status.tier,
      optionId,
      feePaid: 0,
      reason,
      message: reason,
    };
  }

  const selectedOption = status.options.find((opt) => opt.id === optionId);
  if (!selectedOption) {
    return {
      ok: false,
      granted: false,
      character,
      tier: status.tier,
      optionId,
      feePaid: 0,
      reason: 'Selected petition option is not valid for this conviction tier.',
      message: 'Selected petition option is not valid for this conviction tier.',
    };
  }

  const safeCash = Math.max(0, Math.floor(Number.isFinite(character.cash) ? character.cash : 0));
  if (safeCash < selectedOption.fee) {
    const reason = `Insufficient wallet cash ($${safeCash.toLocaleString()}) to cover the $${selectedOption.fee.toLocaleString()} petition fee.`;
    return {
      ok: false,
      granted: false,
      character,
      tier: status.tier,
      optionId,
      feePaid: 0,
      reason,
      message: reason,
    };
  }

  const roll = Math.max(0, Math.min(0.999999, rng()));
  const granted = roll < selectedOption.approvalProbability;
  const isPardon = status.tier === 'executive_pardon';

  const updatedRecord: CrimeRecordEntry = granted
    ? {
        ...targetRecord,
        expunged: true,
        ...(isPardon ? { pardoned: true } : {}),
        lastPetitionDeniedAge: null,
      }
    : {
        ...targetRecord,
        lastPetitionDeniedAge: character.age,
      };

  const nextRecords = sanitized.records.map((entry) =>
    entry.id === targetRecord.id ? updatedRecord : entry,
  );

  const event: LifeEvent = granted
    ? {
        id: `${targetRecord.id}-${isPardon ? 'pardoned' : 'petition-granted'}-${character.age}`,
        age: character.age,
        year: character.birthYear + character.age,
        title: isPardon ? "Governor's Pardon Granted" : 'Court Petition Granted',
        message: isPardon
          ? `After years of demonstrated rehabilitation, the Governor granted a full executive pardon for your ${targetRecord.title} conviction. Your record has been cleared.`
          : `The judge granted your rehabilitation petition (${selectedOption.label}) and formally expunged your ${targetRecord.title} conviction. Your record and credit access have been restored.`,
        category: 'milestone',
        icon: isPardon ? '🏛️' : '⚖️',
      }
    : {
        id: `${targetRecord.id}-${isPardon ? 'pardon' : 'petition'}-denied-${character.age}`,
        age: character.age,
        year: character.birthYear + character.age,
        title: isPardon ? 'Pardon Application Denied' : 'Court Petition Denied',
        message: isPardon
          ? `The clemency board denied your Governor's Pardon petition for ${targetRecord.title}. You paid $${selectedOption.fee.toLocaleString()} in legal costs and may re-apply in 2 years.`
          : `The judge denied your rehabilitation petition (${selectedOption.label}) for ${targetRecord.title}. You paid $${selectedOption.fee.toLocaleString()} in legal costs and may re-petition in 2 years.`,
        category: 'misfortune',
        icon: '📋',
      };

  const effects = granted
    ? isPardon
      ? { happiness: 12, karma: 5 }
      : { happiness: 8, karma: 2 }
    : { happiness: -4 };

  const { character: finalChar } = applyEffects(
    {
      ...character,
      cash: Math.round(character.cash - selectedOption.fee),
      crime: {
        ...sanitized,
        records: nextRecords,
      },
      timeline: [...character.timeline, event],
    },
    effects,
  );

  return {
    ok: true,
    granted,
    character: finalChar,
    tier: status.tier,
    optionId: selectedOption.id,
    feePaid: selectedOption.fee,
    approvalProbability: selectedOption.approvalProbability,
    updatedRecord,
    message: event.message,
  };
}

export interface RestitutionPaymentResult {
  ok: boolean;
  character: CharacterProfile;
  reason?: string;
  paidAmount: number;
  remainingUnpaidRestitution: number;
  message: string;
}

/**
 * Voluntary cash-only payment toward outstanding adult unpaidRestitution (bankBalance and
 * corporate treasury remain untouched). Updates annual probation restitution telemetry cleanly.
 */
export function payUnpaidRestitution(
  character: CharacterProfile,
  amount?: number,
): RestitutionPaymentResult {
  const sanitized = getSanitizedCrimeState(character);
  const outstandingRestitution = Math.max(0, sanitized.unpaidRestitution ?? 0);
  if (!character.isAlive) {
    return {
      ok: false,
      character,
      reason: 'Deceased characters cannot pay restitution.',
      paidAmount: 0,
      remainingUnpaidRestitution: outstandingRestitution,
      message: 'Deceased characters cannot pay restitution.',
    };
  }

  if (outstandingRestitution <= 0) {
    return {
      ok: false,
      character,
      reason: 'You have no outstanding victim restitution.',
      paidAmount: 0,
      remainingUnpaidRestitution: 0,
      message: 'No outstanding victim restitution.',
    };
  }

  const availableCash = Math.max(0, Math.floor(character.cash));
  if (availableCash <= 0) {
    return {
      ok: false,
      character,
      reason: 'You have no available cash to put toward victim restitution.',
      paidAmount: 0,
      remainingUnpaidRestitution: outstandingRestitution,
      message: 'Insufficient cash to pay victim restitution.',
    };
  }

  const requested =
    amount !== undefined && Number.isFinite(amount) && amount > 0
      ? Math.floor(amount)
      : outstandingRestitution;
  const paidAmount = Math.min(availableCash, outstandingRestitution, requested);
  if (paidAmount <= 0) {
    return {
      ok: false,
      character,
      reason: 'Invalid restitution payment amount.',
      paidAmount: 0,
      remainingUnpaidRestitution: outstandingRestitution,
      message: 'Invalid restitution payment amount.',
    };
  }

  const remainingUnpaidRestitution = outstandingRestitution - paidAmount;
  const updatedProbation: ProbationState | null = sanitized.probation
    ? {
        ...sanitized.probation,
        restitutionPaidThisYear: (sanitized.probation.restitutionPaidThisYear ?? 0) + paidAmount,
      }
    : null;

  const paymentEvent: LifeEvent = {
    id: deterministicUUID(
      'crime_restitution_pay',
      character.id,
      character.age,
      outstandingRestitution,
      paidAmount,
    ),
    age: character.age,
    year: character.birthYear + character.age,
    title: 'Victim Restitution Payment',
    message: `Paid $${paidAmount.toLocaleString()} toward court-ordered victim restitution. Remaining balance: $${remainingUnpaidRestitution.toLocaleString()}.`,
    category: 'money',
    icon: '⚖️',
  };

  const { character: finalChar } = applyEffects(
    {
      ...character,
      crime: {
        ...sanitized,
        unpaidRestitution: remainingUnpaidRestitution,
        probation: updatedProbation,
      },
      timeline: [...character.timeline, paymentEvent],
    },
    { cash: -paidAmount },
  );

  return {
    ok: true,
    character: finalChar,
    paidAmount,
    remainingUnpaidRestitution,
    message: paymentEvent.message,
  };
}

export const MAX_PROBATION_SERVICE_ACTIONS_PER_YEAR = 2;
export const PROBATION_SERVICE_HOURS_PER_ACTION = 8;

/**
 * Executes an annual probation supervision check-in or community-service session.
 */
export function performProbationAction(
  character: CharacterProfile,
  actionId: ProbationActionId,
): ProbationActionResult {
  const sanitized = getSanitizedCrimeState(character);
  const probation = sanitized.probation;

  if (!character.isAlive) {
    return {
      ok: false,
      character,
      actionId,
      reason: 'Deceased characters cannot perform probation actions.',
      message: 'Deceased characters cannot perform probation actions.',
    };
  }
  if (isCurrentlyIncarcerated(character)) {
    return {
      ok: false,
      character,
      actionId,
      reason: 'Community probation supervision actions are unavailable while incarcerated.',
      message: 'Unavailable while incarcerated.',
    };
  }
  if (!probation || probation.yearsRemaining <= 0) {
    return {
      ok: false,
      character,
      actionId,
      reason: 'You are not currently under active probation supervision.',
      message: 'No active probation supervision.',
    };
  }

  if (actionId === 'check_in') {
    if (probation.lastCheckInAge === character.age) {
      return {
        ok: false,
        character,
        actionId,
        reason: 'You already completed your annual probation officer check-in for this age.',
        message: 'Annual check-in already completed this year.',
      };
    }

    const updatedProbation: ProbationState = {
      ...probation,
      lastCheckInAge: character.age,
    };
    const event: LifeEvent = {
      id: deterministicUUID('probation_checkin', character.id, character.age, probation.startedAtAge),
      age: character.age,
      year: character.birthYear + character.age,
      title: 'Probation Officer Check-In',
      message: `Completed scheduled ${probation.jurisdiction} supervision check-in for ${probation.chargeTitle}.`,
      category: 'milestone',
      icon: '📋',
    };

    const { character: nextChar } = applyEffects(
      {
        ...character,
        crime: {
          ...sanitized,
          probation: updatedProbation,
        },
        timeline: [...character.timeline, event],
      },
      { karma: 1 },
    );

    return {
      ok: true,
      character: nextChar,
      actionId,
      message: event.message,
    };
  }

  // actionId === 'community_service'
  const actionsThisYear =
    probation.lastServiceActionAge === character.age ? (probation.serviceActionsThisYear ?? 0) : 0;
  if (actionsThisYear >= MAX_PROBATION_SERVICE_ACTIONS_PER_YEAR) {
    return {
      ok: false,
      character,
      actionId,
      reason: `You can complete at most ${MAX_PROBATION_SERVICE_ACTIONS_PER_YEAR} community service sessions per year.`,
      message: 'Annual community service limit reached.',
    };
  }

  const activeTerms = probation.activeTerms ?? [];
  const totalHoursRemaining = activeTerms.reduce(
    (sum, t) => sum + Math.max(0, t.communityServiceHoursRemaining),
    0,
  );
  if (totalHoursRemaining <= 0) {
    return {
      ok: false,
      character,
      actionId,
      reason: 'You have no remaining court-ordered community service hours.',
      message: 'No community service hours remaining.',
    };
  }

  let hoursToDeduct = Math.min(PROBATION_SERVICE_HOURS_PER_ACTION, totalHoursRemaining);
  let hoursCompleted = 0;
  const nextTerms: ProbationTermEntry[] = activeTerms.map((term) => {
    if (hoursToDeduct <= 0 || term.communityServiceHoursRemaining <= 0) {
      return term;
    }
    const applied = Math.min(hoursToDeduct, term.communityServiceHoursRemaining);
    hoursToDeduct -= applied;
    hoursCompleted += applied;
    return {
      ...term,
      communityServiceHoursRemaining: term.communityServiceHoursRemaining - applied,
    };
  });

  const updatedProbation: ProbationState = {
    ...probation,
    activeTerms: nextTerms,
    lastServiceActionAge: character.age,
    serviceActionsThisYear: actionsThisYear + 1,
  };

  const serviceEvent: LifeEvent = {
    id: deterministicUUID(
      'probation_service',
      character.id,
      character.age,
      actionsThisYear + 1,
      hoursCompleted,
    ),
    age: character.age,
    year: character.birthYear + character.age,
    title: 'Community Service Completed',
    message: `Completed ${hoursCompleted} hour(s) of court-ordered community service (${Math.max(0, totalHoursRemaining - hoursCompleted)} hr remaining).`,
    category: 'milestone',
    icon: '🤝',
  };

  const { character: nextChar } = applyEffects(
    {
      ...character,
      crime: {
        ...sanitized,
        probation: updatedProbation,
      },
      timeline: [...character.timeline, serviceEvent],
    },
    { karma: 2, happiness: 1 },
  );

  return {
    ok: true,
    character: nextChar,
    actionId,
    hoursCompleted,
    message: serviceEvent.message,
  };
}

