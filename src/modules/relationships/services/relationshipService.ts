import type {
  CharacterProfile,
  FamilyWealth,
  LifeEvent,
  PersonProfile,
  StatEffects,
} from '../../../types/game';
import { applyEffects } from '../../character/services/statService';
import { createId } from '../../../utils/id';
import { pickRandom, randomInt } from '../../../utils/random';
import { MALE_NAMES, FEMALE_NAMES, LAST_NAMES } from '../../character/data/names';
import {
  CHAT_OPTIONS,
  COMPLIMENT_OPTIONS,
  GIFT_CATALOG,
  getHangoutOptions,
  INSULT_OPTIONS,
} from '../data/socialInteractions';
import type { GiftOption, SocialActionOutcome, SocialActionType } from '../types';

export interface TargetPersonRef {
  id: string;
  name: string;
  role: string;
  type: 'parent' | 'sibling' | 'friend';
  relationship: number;
  generosity?: number;
  wealth?: FamilyWealth;
  isAlive: boolean;
  age: number;
}

const clamp = (val: number, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(val)));

/**
 * Checks whether an interactive action has already been performed with a target this year.
 */
export function hasPerformedActionThisYear(
  character: CharacterProfile,
  targetId: string,
  actionType: SocialActionType
): boolean {
  if (actionType === 'insult') return false; // Insults can be done repeatedly
  const actions = character.yearlySocialActions?.[targetId] || [];
  return actions.includes(actionType);
}

/**
 * Executes a social action between the active player and an NPC (parent, sibling, or friend).
 */
export function executeSocialAction(
  character: CharacterProfile,
  target: TargetPersonRef,
  actionType: SocialActionType,
  giftOption?: GiftOption,
  selectedOptionId?: string
): { character: CharacterProfile; outcome: SocialActionOutcome } {
  if (!target.isAlive) {
    return {
      character,
      outcome: {
        actionType,
        success: false,
        headline: 'Rest in Peace',
        narrative: `${target.name} has passed away. You visited their resting place to pay your respects.`,
        relationshipDelta: 0,
        statEffects: {},
        targetName: target.name,
      },
    };
  }

  let relationshipDelta = 0;
  let headline = '';
  let narrative = '';
  let success = true;
  let cashDelta = 0;
  const statChanges: StatEffects = {};

  const stage =
    character.age <= 12 ? 'childhood' : character.age <= 17 ? 'teens' : 'adulthood';

  switch (actionType) {
    case 'spend_time': {
      const hangoutOptions = getHangoutOptions(stage);
      const option = selectedOptionId
        ? hangoutOptions.find((o) => o.id === selectedOptionId) || hangoutOptions[0]
        : pickRandom(hangoutOptions);
      relationshipDelta = randomInt(8, 15);
      statChanges.happiness = randomInt(4, 9);
      headline = option.title;
      narrative = `You spent quality time with ${target.name} and ${option.activityNarrative}`;
      break;
    }

    case 'conversation': {
      const option = selectedOptionId
        ? CHAT_OPTIONS.find((o) => o.id === selectedOptionId) || CHAT_OPTIONS[0]
        : pickRandom(CHAT_OPTIONS);
      const isPositive = target.relationship >= 25 || Math.random() > 0.3;
      if (isPositive) {
        relationshipDelta = randomInt(6, 12);
        statChanges.happiness = randomInt(3, 7);
        headline = option.title;
        narrative = `You had an engaging conversation with ${target.name}, ${option.positiveLine}`;
      } else {
        success = false;
        relationshipDelta = randomInt(-6, -2);
        statChanges.happiness = randomInt(-4, -1);
        headline = 'Awkward Silence';
        narrative = `You tried talking with ${target.name} about ${option.title.toLowerCase()}, but ended up ${option.awkwardLine}`;
      }
      break;
    }

    case 'compliment': {
      const option = selectedOptionId
        ? COMPLIMENT_OPTIONS.find((o) => o.id === selectedOptionId) || COMPLIMENT_OPTIONS[0]
        : pickRandom(COMPLIMENT_OPTIONS);
      const wellReceived = target.relationship >= 20 || Math.random() > 0.2;
      if (wellReceived) {
        relationshipDelta = randomInt(7, 14);
        statChanges.happiness = randomInt(3, 6);
        headline = 'Flattered!';
        narrative = `You warmly ${option.complimentText} ${target.name} beamed with genuine appreciation.`;
      } else {
        success = false;
        relationshipDelta = randomInt(-3, 1);
        headline = 'Skeptical Reaction';
        narrative = `You complimented ${target.name} on their ${option.title.toLowerCase()}, but they looked at you suspiciously and wondered if you were mocking them.`;
      }
      break;
    }

    case 'insult': {
      const option = selectedOptionId
        ? INSULT_OPTIONS.find((o) => o.id === selectedOptionId) || INSULT_OPTIONS[0]
        : pickRandom(INSULT_OPTIONS);
      relationshipDelta = randomInt(-28, -15);
      statChanges.happiness = randomInt(-6, -2);
      statChanges.karma = -5;
      success = false;
      headline = 'Heated Clash!';
      narrative = `You confronted ${target.name} and ${option.insultText} Things became intensely bitter between you two.`;
      break;
    }

    case 'give_gift': {
      const gift = giftOption || GIFT_CATALOG[0];
      if (gift.cost > character.cash) {
        return {
          character,
          outcome: {
            actionType,
            success: false,
            headline: 'Insufficient Funds',
            narrative: `You could not afford to purchase the ${gift.name} ($${gift.cost.toLocaleString()}).`,
            relationshipDelta: 0,
            statEffects: {},
            targetName: target.name,
          },
        };
      }

      cashDelta = -gift.cost;
      statChanges.cash = -gift.cost;

      let baseBoost = 10;
      if (gift.tier === 'thoughtful') baseBoost = 16;
      if (gift.tier === 'luxury') baseBoost = 26;
      if (gift.tier === 'lavish') baseBoost = 40;

      relationshipDelta = baseBoost + randomInt(-2, 4);
      statChanges.happiness = randomInt(3, 8);
      headline = 'Gift Accepted!';
      narrative = `You gifted ${target.name} a ${gift.name} ${gift.icon}. They were touched by your generosity!`;
      break;
    }

    case 'ask_money': {
      // Parents or close friends
      const generosity = target.generosity ?? 65;
      const wealth = target.wealth || 'modest';

      let maxAsk = 100;
      if (wealth === 'struggling') maxAsk = 60;
      if (wealth === 'modest') maxAsk = 180;
      if (wealth === 'comfortable') maxAsk = 550;
      if (wealth === 'wealthy') maxAsk = 2200;

      const willGive = (target.relationship * 0.6 + generosity * 0.4) > 55;

      if (willGive) {
        const giftAmount = randomInt(Math.round(maxAsk * 0.4), maxAsk);
        cashDelta = giftAmount;
        statChanges.cash = giftAmount;
        relationshipDelta = randomInt(1, 4);
        headline = 'Request Approved!';
        narrative = `${target.name} gladly handed you $${giftAmount.toLocaleString()} to help you out.`;
      } else {
        success = false;
        relationshipDelta = randomInt(-6, -2);
        statChanges.happiness = randomInt(-5, -2);
        headline = 'Request Denied';
        narrative = `${target.name} turned down your request for cash and advised you to be more responsible with money.`;
      }
      break;
    }
  }

  // Record this action into yearly cooldown tracking
  const currentActions = character.yearlySocialActions?.[target.id] || [];
  const updatedYearlyActions = {
    ...(character.yearlySocialActions || {}),
    [target.id]: [...currentActions, actionType],
  };

  // Update target's relationship meter in character state
  const newRelScore = clamp(target.relationship + relationshipDelta);

  let updatedParents = character.parents;
  let updatedSiblings = character.siblings;
  let updatedRelationships = character.relationships;

  if (target.type === 'parent') {
    if (target.id === character.parents.father.id) {
      updatedParents = {
        ...updatedParents,
        father: { ...updatedParents.father, relationship: newRelScore },
      };
    } else if (target.id === character.parents.mother.id) {
      updatedParents = {
        ...updatedParents,
        mother: { ...updatedParents.mother, relationship: newRelScore },
      };
    }
  } else if (target.type === 'sibling') {
    updatedSiblings = (character.siblings || []).map((sib) =>
      sib.id === target.id ? { ...sib, relationship: newRelScore } : sib
    );
  } else {
    updatedRelationships = (character.relationships || []).map((rel) =>
      rel.id === target.id ? { ...rel, relationship: newRelScore } : rel
    );
  }

  // Create Life Timeline Journal entry
  const journalEntry: LifeEvent = {
    id: createId(),
    age: character.age,
    year: character.birthYear + character.age,
    title: headline,
    message: narrative,
    category: 'relationship',
    icon: actionType === 'insult' ? '😠' : actionType === 'give_gift' ? '🎁' : '👥',
  };

  // Apply stat and cash effects to character
  const { character: affectedCharacter } = applyEffects(
    {
      ...character,
      parents: updatedParents,
      siblings: updatedSiblings,
      relationships: updatedRelationships,
      yearlySocialActions: updatedYearlyActions,
      timeline: [...character.timeline, journalEntry],
    },
    statChanges
  );

  return {
    character: affectedCharacter,
    outcome: {
      actionType,
      success,
      headline,
      narrative,
      relationshipDelta,
      statEffects: statChanges,
      targetName: target.name,
      cashDelta,
    },
  };
}

/**
 * Finds a new prospective friend based on player's current stage of life.
 */
export function findNewFriend(character: CharacterProfile): {
  character: CharacterProfile;
  friend: PersonProfile;
} {
  const isMale = Math.random() < 0.5;
  const gender = isMale ? 'male' : 'female';
  const firstName = isMale ? pickRandom(MALE_NAMES) : pickRandom(FEMALE_NAMES);
  const lastName = pickRandom(LAST_NAMES);

  let role = 'Neighbor';
  let originStory = 'You struck up a conversation at a neighborhood block party.';
  let stageMet: 'childhood' | 'middle_school' | 'high_school' | 'university' | 'adulthood' = 'adulthood';
  let age = character.age + randomInt(-2, 2);

  if (character.age <= 10) {
    stageMet = 'childhood';
    role = 'Classmate';
    originStory = 'You bonded during afternoon recess sharing colored pencils and snacks.';
    age = Math.max(5, character.age + randomInt(-1, 1));
  } else if (character.age <= 13) {
    stageMet = 'middle_school';
    role = 'Middle School Classmate';
    originStory = 'You were paired as lab partners for science class.';
    age = Math.max(11, character.age + randomInt(-1, 1));
  } else if (character.age <= 17) {
    stageMet = 'high_school';
    role = 'High School Friend';
    originStory = 'You sat together in the cafeteria and bonded over mutual interests.';
    age = Math.max(14, character.age + randomInt(-1, 1));
  } else if (character.education.currentStage === 'university') {
    stageMet = 'university';
    role = 'University Student';
    originStory = 'You met at a campus seminar and formed a study group together.';
    age = Math.max(18, character.age + randomInt(-1, 2));
  } else if (character.career.currentJob) {
    stageMet = 'adulthood';
    role = `Coworker at ${character.career.currentJob.companyName}`;
    originStory = `You met at ${character.career.currentJob.companyName} during an all-hands team lunch.`;
    age = Math.max(22, character.age + randomInt(-4, 5));
  } else {
    stageMet = 'adulthood';
    role = 'Local Friend';
    originStory = 'You met at a local gym and hit it off right away.';
    age = Math.max(18, character.age + randomInt(-3, 4));
  }

  const newFriend: PersonProfile = {
    id: createId(),
    firstName,
    lastName,
    gender,
    age,
    role,
    relationshipType: 'friend',
    relationship: randomInt(65, 85),
    originStory,
    stageMet,
    avatarEmoji: gender === 'male' ? '👦' : '👧',
  };

  const journalEntry: LifeEvent = {
    id: createId(),
    age: character.age,
    year: character.birthYear + character.age,
    title: 'New Friendship!',
    message: `You became good friends with ${firstName} ${lastName} (${role}). ${originStory}`,
    category: 'relationship',
    icon: '🤝',
  };

  return {
    character: {
      ...character,
      relationships: [...character.relationships, newFriend],
      timeline: [...character.timeline, journalEntry],
    },
    friend: newFriend,
  };
}
