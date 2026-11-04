import type { CharacterProfile, PersonProfile } from '../../../types/game';
import type { DivorceSettlement } from '../types';

export class DivorceService {
  /**
   * Resolves a divorce between player and spouse.
   */
  executeDivorce(
    character: CharacterProfile,
    spouse: PersonProfile,
    attorneyTier: 'public' | 'standard' | 'high_powered' = 'standard'
  ): {
    updatedCharacter: CharacterProfile;
    updatedSpouse: PersonProfile;
    settlement: DivorceSettlement;
  } {
    const hasPrenup = spouse.partnerStats?.hasPrenup ?? false;
    let attorneyFee = 1500;
    if (attorneyTier === 'public') attorneyFee = 300;
    if (attorneyTier === 'high_powered') attorneyFee = 12000;

    let partnerShareCash = 0;
    let playerRetainedCash = character.cash;

    if (hasPrenup) {
      // Prenup protects assets
      partnerShareCash = 0;
      playerRetainedCash = Math.max(0, character.cash - attorneyFee);
    } else {
      // 50/50 Marital Property division
      // Attorney tier can slightly improve outcome
      let splitPercent = 0.5;
      if (attorneyTier === 'high_powered') splitPercent = 0.42;
      if (attorneyTier === 'public') splitPercent = 0.55;

      const distributableCash = Math.max(0, character.cash - attorneyFee);
      partnerShareCash = Math.floor(distributableCash * splitPercent);
      playerRetainedCash = distributableCash - partnerShareCash;
    }

    // Children calculation
    const minorChildren = (character.children || []).filter((c) => c.age < 18);
    const childSupportAnnual = minorChildren.length * 4000;

    const summaryMessage = hasPrenup
      ? `The divorce was finalized in family court. Thanks to your legally binding Prenuptial Agreement, your assets remained fully protected! 🛡️`
      : `The court ordered a formal dissolution of marriage. In the absence of a prenuptial agreement, your former spouse was awarded $${partnerShareCash.toLocaleString()} of marital assets. 💔`;

    const updatedSpouse: PersonProfile = {
      ...spouse,
      role: 'Ex-Spouse',
      relationshipType: 'ex',
      romanticStage: 'ex',
      relationship: Math.max(0, spouse.relationship - 45),
      romanceMeter: 0,
    };

    const exList = character.exPartners || [];
    const updatedCharacter: CharacterProfile = {
      ...character,
      cash: playerRetainedCash,
      partner: null,
      exPartners: [...exList, updatedSpouse],
      stats: {
        ...character.stats,
        happiness: Math.max(0, character.stats.happiness - 30),
      },
      timeline: [
        ...character.timeline,
        {
          id: String(Date.now()),
          age: character.age,
          year: character.birthYear + character.age,
          title: 'Divorce Finalized',
          message: summaryMessage,
          category: 'relationship',
          icon: '💔',
        },
      ],
    };

    return {
      updatedCharacter,
      updatedSpouse,
      settlement: {
        partnerShareCash,
        playerRetainedCash,
        childSupportAnnual,
        custodyHolder: 'shared',
        alimonyPaid: 0,
        summaryMessage,
      },
    };
  }
}

export const divorceService = new DivorceService();

