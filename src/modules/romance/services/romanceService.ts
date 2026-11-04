import type { CharacterProfile, PersonProfile } from '../../../types/game';
import type {
  FlirtOption,
  DateVenue,
  RomanticTalkOption,
  RomanticGift,
  EngagementRing,
  ProposalVenue,
  WeddingVenue,
  RomanceActionResult,
  DatingCandidate,
} from '../types';
import { createId } from '../../../utils/id';
import { MALE_NAMES, FEMALE_NAMES, LAST_NAMES } from '../../character/data/names';

export class RomanceService {
  /**
   * Unlocks the romance / love meter for an eligible acquaintance or friend.
   */
  sparkRomance(target: PersonProfile, playerAge?: number): PersonProfile {
    if (playerAge !== undefined && playerAge < 16) {
      return target;
    }

    const defaultStats = target.partnerStats || {
      craziness: Math.floor(Math.random() * 50) + 15,
      generosity: Math.floor(Math.random() * 60) + 30,
      looks: Math.floor(Math.random() * 50) + 45,
      smarts: Math.floor(Math.random() * 50) + 45,
      fertility: Math.floor(Math.random() * 50) + 45,
      yearsTogether: 0,
    };

    return {
      ...target,
      romanceUnlocked: true,
      romanceMeter: target.romanceMeter && target.romanceMeter > 0 ? target.romanceMeter : 0,
      romanticStage: target.romanticStage && target.romanticStage !== 'none' ? target.romanticStage : 'flirting',
      partnerStats: defaultStats,
    };
  }

  /**
   * Executes an interactive flirt action.
   */
  executeFlirt(
    character: CharacterProfile,
    target: PersonProfile,
    flirt: FlirtOption
  ): { updatedTarget: PersonProfile; result: RomanceActionResult } {
    if (character.age < 16) {
      return {
        updatedTarget: target,
        result: {
          success: false,
          message: 'You must be at least 16 years old to pursue romance.',
          relationshipDelta: 0,
          romanceDelta: 0,
        },
      };
    }

    const currentRel = target.relationship;
    const currentRomance = target.romanceMeter ?? 0;
    const playerAppeal = (character.stats.looks * 0.6) + (character.stats.smarts * 0.4);

    // Roll difficulty
    const roll = Math.floor(Math.random() * 100);
    const successThreshold = Math.max(20, flirt.difficulty - Math.floor(playerAppeal * 0.3));

    let relationshipDelta = 0;
    let romanceDelta = 0;
    let message = '';
    let success = false;

    if (roll >= successThreshold) {
      // Big success
      success = true;
      relationshipDelta = Math.floor(Math.random() * 3) + 3; // +3 to +5
      romanceDelta = flirt.style === 'bold' ? Math.floor(Math.random() * 2) + 5 : Math.floor(Math.random() * 2) + 4; // +4 to +6
      message = `${target.firstName} ${flirt.successMessage}`;
    } else if (roll >= successThreshold - 20) {
      // Awkward but safe
      success = true;
      relationshipDelta = 2;
      romanceDelta = 3;
      message = `${target.firstName} ${flirt.awkwardMessage}`;
    } else {
      // Rejected
      success = false;
      relationshipDelta = -3;
      romanceDelta = -2;
      message = `${target.firstName} ${flirt.rejectionMessage}`;
    }

    const updatedTarget: PersonProfile = {
      ...target,
      romanceUnlocked: true,
      relationship: Math.min(100, Math.max(0, currentRel + relationshipDelta)),
      romanceMeter: Math.min(100, Math.max(0, currentRomance + romanceDelta)),
      romanticStage: target.romanticStage === 'none' ? 'flirting' : target.romanticStage,
    };

    return {
      updatedTarget,
      result: {
        success,
        message,
        relationshipDelta,
        romanceDelta,
        happinessDelta: success ? 8 : -5,
      },
    };
  }

  /**
   * Executes a date at a selected venue.
   */
  executeDate(
    character: CharacterProfile,
    target: PersonProfile,
    venue: DateVenue
  ): { updatedTarget: PersonProfile; result: RomanceActionResult } {
    if (character.age < 16) {
      return {
        updatedTarget: target,
        result: {
          success: false,
          message: 'You must be at least 16 years old to go on romantic dates.',
          relationshipDelta: 0,
          romanceDelta: 0,
        },
      };
    }

    if (character.cash < venue.cost) {
      return {
        updatedTarget: target,
        result: {
          success: false,
          message: `You don't have enough cash for ${venue.name} ($${venue.cost.toLocaleString()}).`,
          relationshipDelta: 0,
          romanceDelta: 0,
        },
      };
    }

    const partnerCraziness = target.partnerStats?.craziness ?? 25;
    const isDrama = partnerCraziness > 70 && Math.random() < 0.25;

    let relationshipDelta = venue.relationshipBonus;
    let romanceDelta = venue.romanceBonus;
    let happinessDelta = venue.happinessBonus;
    let message = `You took ${target.firstName} to ${venue.name}! You both had an unforgettable, romantic time.`;

    if (isDrama) {
      relationshipDelta = -8;
      romanceDelta = -5;
      happinessDelta = -10;
      message = `During your date at ${venue.name}, ${target.firstName} got into a heated argument with the staff and caused an embarrassing scene!`;
    }

    const updatedTarget: PersonProfile = {
      ...target,
      romanceUnlocked: true,
      relationship: Math.min(100, target.relationship + relationshipDelta),
      romanceMeter: Math.min(100, (target.romanceMeter ?? 0) + romanceDelta),
    };

    return {
      updatedTarget,
      result: {
        success: !isDrama,
        message,
        relationshipDelta,
        romanceDelta,
        happinessDelta,
        cashDelta: -venue.cost,
      },
    };
  }

  /**
   * Executes a romantic deep conversation.
   */
  executeRomanticTalk(
    _character: CharacterProfile,
    target: PersonProfile,
    talk: RomanticTalkOption
  ): { updatedTarget: PersonProfile; result: RomanceActionResult } {
    const relationshipDelta = Math.floor(Math.random() * 3) + 6; // +6 to +8
    const romanceDelta = Math.floor(Math.random() * 3) + 5; // +5 to +7
    const message = `You discussed "${talk.topic}" with ${target.firstName}. They ${talk.reaction}`;

    const updatedTarget: PersonProfile = {
      ...target,
      relationship: Math.min(100, target.relationship + relationshipDelta),
      romanceMeter: Math.min(100, (target.romanceMeter ?? 0) + romanceDelta),
    };

    return {
      updatedTarget,
      result: {
        success: true,
        message,
        relationshipDelta,
        romanceDelta,
        happinessDelta: 6,
      },
    };
  }

  /**
   * Gives a romantic gift to the target.
   */
  executeRomanticGift(
    character: CharacterProfile,
    target: PersonProfile,
    gift: RomanticGift
  ): { updatedTarget: PersonProfile; result: RomanceActionResult } {
    if (character.cash < gift.cost) {
      return {
        updatedTarget: target,
        result: {
          success: false,
          message: `You cannot afford the ${gift.name} ($${gift.cost.toLocaleString()}).`,
          relationshipDelta: 0,
          romanceDelta: 0,
        },
      };
    }

    const updatedTarget: PersonProfile = {
      ...target,
      relationship: Math.min(100, target.relationship + gift.relationshipDelta),
      romanceMeter: Math.min(100, (target.romanceMeter ?? 0) + gift.romanceDelta),
    };

    return {
      updatedTarget,
      result: {
        success: true,
        message: `You presented ${target.firstName} with ${gift.name}. They ${gift.reaction}`,
        relationshipDelta: gift.relationshipDelta,
        romanceDelta: gift.romanceDelta,
        happinessDelta: 10,
        cashDelta: -gift.cost,
      },
    };
  }

  /**
   * Milestone: Ask someone to become your Girlfriend / Boyfriend / Partner.
   * Requires Relationship >= 60% and Romance >= 40%.
   */
  executeAskOut(
    character: CharacterProfile,
    target: PersonProfile
  ): { updatedTarget: PersonProfile; result: RomanceActionResult } {
    if (character.age < 16) {
      return {
        updatedTarget: target,
        result: {
          success: false,
          message: 'You must be at least 16 years old to ask someone to be your romantic partner.',
          relationshipDelta: 0,
          romanceDelta: 0,
        },
      };
    }

    const rel = target.relationship;
    const romance = target.romanceMeter ?? 0;

    if (rel < 45 || romance < 30) {
      return {
        updatedTarget: target,
        result: {
          success: false,
          message: `${target.firstName} smiled gently and said: "I really value our connection, but I don't think we're quite there yet as partners. Let's keep hanging out and see where things go!"`,
          relationshipDelta: -2,
          romanceDelta: -2,
          happinessDelta: -5,
        },
      };
    }

    // Success! Determine partner role title
    let roleTitle = 'Partner';
    if (target.gender === 'female') roleTitle = 'Girlfriend';
    if (target.gender === 'male') roleTitle = 'Boyfriend';

    const updatedTarget: PersonProfile = {
      ...target,
      role: roleTitle,
      relationshipType: 'dating',
      romanticStage: 'dating',
      relationship: Math.min(100, rel + 15),
      romanceMeter: Math.min(100, romance + 15),
      partnerStats: {
        ...(target.partnerStats || {
          craziness: Math.floor(Math.random() * 40) + 20,
          generosity: Math.floor(Math.random() * 50) + 40,
          looks: Math.floor(Math.random() * 40) + 50,
          smarts: Math.floor(Math.random() * 40) + 50,
          fertility: Math.floor(Math.random() * 40) + 50,
        }),
        yearsTogether: 0,
        annualIncome: target.partnerStats?.annualIncome ?? (character.age >= 18 ? Math.floor(Math.random() * 35000) + 30000 : 0),
        occupation: target.partnerStats?.occupation ?? (character.age >= 18 ? 'Marketing Specialist' : 'Student'),
      },
    };

    return {
      updatedTarget,
      result: {
        success: true,
        message: `With butterflies in your stomach, you asked ${target.firstName} to be your ${roleTitle}. With a bright blush and a joyful kiss, they said YES!`,
        relationshipDelta: 8,
        romanceDelta: 8,
        happinessDelta: 15,
        newRomanticStage: 'dating',
      },
    };
  }

  /**
   * Milestone: Marriage proposal with ring and venue.
   */
  executeProposal(
    character: CharacterProfile,
    target: PersonProfile,
    ring: EngagementRing,
    venue: ProposalVenue
  ): { updatedTarget: PersonProfile; result: RomanceActionResult } {
    const totalCost = ring.cost + venue.cost;
    if (character.cash < totalCost) {
      return {
        updatedTarget: target,
        result: {
          success: false,
          message: `You cannot afford the ring and proposal venue ($${totalCost.toLocaleString()}).`,
          relationshipDelta: 0,
          romanceDelta: 0,
        },
      };
    }

    const rel = target.relationship;
    const romance = target.romanceMeter ?? 0;
    const craziness = target.partnerStats?.craziness ?? 30;
    const yearsDating = target.partnerStats?.yearsTogether ?? 0;

    // Gate 1: Must be in dating stage, with at least 2 full years of dating
    if (yearsDating < 2) {
      return {
        updatedTarget: target,
        result: {
          success: false,
          message: `${target.firstName} blushes and hugs you affectionately: "I love you so much, but we've only been dating for ${yearsDating === 0 ? 'less than a year' : '1 year'}! Let's enjoy being together before rushing into marriage."`,
          relationshipDelta: -2,
          romanceDelta: 0,
          happinessDelta: -5,
        },
      };
    }

    if (target.romanticStage === 'flirting' || rel < 70 || romance < 70) {
      return {
        updatedTarget: target,
        result: {
          success: false,
          message: `${target.firstName} was caught completely off guard: "A proposal?! We haven't built a deep, committed partnership yet for that step!"`,
          relationshipDelta: -10,
          romanceDelta: -10,
          happinessDelta: -15,
        },
      };
    }

    // Proposal acceptance score
    const score = (rel * 0.35) + (romance * 0.35) + (ring.tierScore * 0.25) + (venue.atmosphereScore * 0.1) - (craziness * 0.1);

    if (score >= 60) {
      // Accepted!
      let roleTitle = 'Fiancé';
      if (target.gender === 'female') roleTitle = 'Fiancée';

      const updatedTarget: PersonProfile = {
        ...target,
        role: roleTitle,
        romanticStage: 'engaged',
        relationship: 100,
        romanceMeter: 100,
        partnerStats: {
          ...target.partnerStats!,
          engagementRing: {
            name: ring.name,
            value: ring.cost,
          },
        },
      };

      return {
        updatedTarget,
        result: {
          success: true,
          message: `At ${venue.name}, you got down on one knee and presented the ${ring.name}. With tears in their eyes, ${target.firstName} gasped and shouted: "YES! A thousand times yes!" 💍✨`,
          relationshipDelta: 25,
          romanceDelta: 30,
          happinessDelta: 40,
          cashDelta: -totalCost,
          newRomanticStage: 'engaged',
        },
      };
    }

    // Rejected
    if (score < 35 || ring.tierScore <= 5) {
      // Catastrophic breakup
      const updatedTarget: PersonProfile = {
        ...target,
        role: 'Ex-Partner',
        romanticStage: 'ex',
        relationship: Math.max(0, rel - 40),
        romanceMeter: 0,
      };

      return {
        updatedTarget,
        result: {
          success: false,
          message: `${target.firstName} was deeply insulted by your proposal and ring choice. They threw the ring back at you and broke up on the spot! 💔`,
          relationshipDelta: -40,
          romanceDelta: -100,
          happinessDelta: -35,
          cashDelta: -totalCost,
          newRomanticStage: 'ex',
        },
      };
    }

    // Gentle postponement
    return {
      updatedTarget: {
        ...target,
        relationship: Math.max(0, rel - 8),
        romanceMeter: Math.max(0, romance - 10),
      },
      result: {
        success: false,
        message: `${target.firstName} held your hands tenderly and said: "I love you with all my heart, but I'm just not ready to get married yet. Please let's take a little more time."`,
        relationshipDelta: -8,
        romanceDelta: -10,
        happinessDelta: -15,
        cashDelta: -venue.cost, // Kept the ring
      },
    };
  }

  /**
   * Milestone: Wedding ceremony and optional prenuptial agreement.
   */
  executeWedding(
    character: CharacterProfile,
    target: PersonProfile,
    venue: WeddingVenue,
    demandPrenup: boolean
  ): { updatedTarget: PersonProfile; result: RomanceActionResult; prenupSigned: boolean } {
    if (character.cash < venue.cost) {
      return {
        updatedTarget: target,
        result: {
          success: false,
          message: `You cannot afford the wedding at ${venue.name} ($${venue.cost.toLocaleString()}).`,
          relationshipDelta: 0,
          romanceDelta: 0,
        },
        prenupSigned: false,
      };
    }

    let prenupSigned = false;
    let message = '';
    const partnerGenerosity = target.partnerStats?.generosity ?? 50;
    const partnerCraziness = target.partnerStats?.craziness ?? 30;

    if (demandPrenup) {
      if (partnerCraziness > 70 && partnerGenerosity < 40) {
        // Partner is furious and calls off wedding
        return {
          updatedTarget: {
            ...target,
            relationship: Math.max(0, target.relationship - 35),
            romanceMeter: Math.max(0, (target.romanceMeter ?? 50) - 40),
          },
          result: {
            success: false,
            message: `${target.firstName} was outraged by your request for a prenuptial agreement! They yelled: "You don't trust me at all!" and stormed out, canceling the wedding!`,
            relationshipDelta: -35,
            romanceDelta: -40,
            happinessDelta: -25,
          },
          prenupSigned: false,
        };
      }
      prenupSigned = true;
    }

    let spouseRole = 'Spouse';
    if (target.gender === 'female') spouseRole = 'Wife';
    if (target.gender === 'male') spouseRole = 'Husband';

    const updatedTarget: PersonProfile = {
      ...target,
      role: spouseRole,
      relationshipType: 'spouse',
      romanticStage: 'married',
      relationship: 100,
      romanceMeter: 100,
      partnerStats: {
        ...target.partnerStats!,
        hasPrenup: prenupSigned,
        weddingVenue: venue.name,
      },
    };

    message = `You and ${target.firstName} officially tied the knot at ${venue.name}! 💒💍 Guests cheered as you exchanged vows and danced into the night as ${spouseRole} and partner!`;
    if (prenupSigned) {
      message += ` (Prenuptial agreement was signed beforehand).`;
    }

    return {
      updatedTarget,
      result: {
        success: true,
        message,
        relationshipDelta: 20,
        romanceDelta: 25,
        happinessDelta: venue.happinessDelta,
        cashDelta: -venue.cost,
        newRomanticStage: 'married',
      },
      prenupSigned,
    };
  }

  /**
   * Break up with active partner or demote to ex.
   */
  executeBreakup(
    _character: CharacterProfile,
    target: PersonProfile
  ): { updatedTarget: PersonProfile; result: RomanceActionResult } {
    const updatedTarget: PersonProfile = {
      ...target,
      role: 'Ex-Partner',
      relationshipType: 'ex',
      romanticStage: 'ex',
      relationship: Math.max(0, target.relationship - 30),
      romanceMeter: 0,
    };

    return {
      updatedTarget,
      result: {
        success: true,
        message: `You sat down with ${target.firstName} and had a painful, solemn conversation ending your relationship. You have officially parted ways. 💔`,
        relationshipDelta: -30,
        romanceDelta: -100,
        happinessDelta: -25,
        newRomanticStage: 'ex',
      },
    };
  }

  /**
   * Generates prospective candidates for the Dating App (ArcDate) or organic encounters.
   */
  generateDatingCandidates(
    character: CharacterProfile,
    count: number = 3,
    preference?: 'women' | 'men' | 'everyone'
  ): DatingCandidate[] {
    if (character.age < 16) {
      return [];
    }

    const pref = preference || character.datingPreference || 'everyone';
    const occupations = [
      'Graphic Designer',
      'Architect',
      'Software Developer',
      'Physical Therapist',
      'Financial Analyst',
      'High School Teacher',
      'Chef de Cuisine',
      'Biomedical Engineer',
      'Commercial Pilot',
      'Journalist',
    ];

    const bios = [
      'Passionate about specialty coffee, dog shelters, and spontaneous weekend road trips.',
      'Always looking for someone to debate sci-fi novels with over rooftop tacos.',
      'Gym enthusiast by morning, aspiring chef by evening. Let me cook for you!',
      'Travel addict who has visited 18 countries. Looking for a partner in crime.',
      'Quiet artist who loves indie vinyl records and exploring modern art galleries.',
    ];

    const emojis = ['👩‍🎨', '👨‍💻', '👩‍⚕️', '👨‍🍳', '👩‍🔬', '👨‍🚀', '👩‍🏫', '👨‍🎨'];

    const candidates: DatingCandidate[] = [];

    for (let i = 0; i < count; i++) {
      let gender: 'male' | 'female' = Math.random() < 0.5 ? 'female' : 'male';
      if (pref === 'women') gender = 'female';
      if (pref === 'men') gender = 'male';

      const firstNamePool = gender === 'female' ? FEMALE_NAMES : MALE_NAMES;
      const firstName = firstNamePool[Math.floor(Math.random() * firstNamePool.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

      const ageOffset = Math.floor(Math.random() * 5) - 2;
      const age = Math.max(18, character.age + ageOffset);

      candidates.push({
        id: createId(),
        firstName,
        lastName,
        age,
        gender,
        looks: Math.floor(Math.random() * 45) + 50,
        smarts: Math.floor(Math.random() * 45) + 50,
        craziness: Math.floor(Math.random() * 60) + 15,
        generosity: Math.floor(Math.random() * 55) + 35,
        fertility: Math.floor(Math.random() * 50) + 45,
        occupation: occupations[Math.floor(Math.random() * occupations.length)],
        annualIncome: Math.floor(Math.random() * 55000) + 32000,
        bio: bios[Math.floor(Math.random() * bios.length)],
        avatarEmoji: emojis[Math.floor(Math.random() * emojis.length)],
      });
    }

    return candidates;
  }
}

export const romanceService = new RomanceService();
