import type { CharacterProfile, PersonProfile, ChildProfile } from '../../../types/game';
import { createId } from '../../../utils/id';
import { MALE_NAMES, FEMALE_NAMES } from '../../character/data/names';

export class ReproductionService {
  /**
   * Executes intimate encounter with chosen protection style.
   */
  executeIntimacy(
    character: CharacterProfile,
    partner: PersonProfile,
    protection: 'unprotected' | 'pill' | 'condom'
  ): {
    success: boolean;
    conceptionOccurred: boolean;
    message: string;
    relationshipDelta: number;
    romanceDelta: number;
    happinessDelta: number;
  } {
    const relDelta = Math.floor(Math.random() * 3) + 3;
    const romanceDelta = Math.floor(Math.random() * 3) + 3;
    const happinessDelta = 12;

    let conceptionOccurred = false;

    // Check conception eligibility
    // One partner must be female and one must be male for natural conception
    const isBiologicallyViable =
      (character.gender === 'female' && partner.gender === 'male') ||
      (character.gender === 'male' && partner.gender === 'female');

    const femaleAge = character.gender === 'female' ? character.age : partner.age;
    const femaleFertility =
      character.gender === 'female'
        ? 75
        : (partner.partnerStats?.fertility ?? 65);

    if (isBiologicallyViable && femaleAge >= 16 && femaleAge <= 46) {
      let baseChance = 0.25; // 25% base for youth
      if (femaleAge > 35) baseChance = 0.15;
      if (femaleAge > 40) baseChance = 0.05;
      if (femaleAge > 44) baseChance = 0.01;

      // Fertility modifier
      const fertilityMod = femaleFertility / 100;
      let finalChance = baseChance * fertilityMod;

      if (protection === 'pill') {
        finalChance *= 0.01; // 1% failure rate
      } else if (protection === 'condom') {
        finalChance *= 0.02; // 2% failure rate
      }

      const roll = Math.random();
      if (roll < finalChance) {
        conceptionOccurred = true;
      }
    }

    let message = `You and ${partner.firstName} spent a deeply passionate, intimate evening together.`;
    if (protection === 'unprotected') {
      message += ` (Unprotected intimacy).`;
      if (conceptionOccurred) {
        message += ` ✨ A life has begun! (Pregnancy conceived).`;
      }
    } else {
      message += ` (Safe intimacy with ${protection === 'pill' ? 'birth control' : 'protection'}).`;
    }

    return {
      success: true,
      conceptionOccurred,
      message,
      relationshipDelta: relDelta,
      romanceDelta,
      happinessDelta,
    };
  }

  /**
   * Performs an In Vitro Fertilization (IVF) cycle at a fertility clinic.
   */
  executeIVF(
    character: CharacterProfile,
    partner: PersonProfile
  ): { success: boolean; message: string; cashDelta: number } {
    const cost = 15000;
    if (character.cash < cost) {
      return {
        success: false,
        message: `You cannot afford the IVF cycle ($${cost.toLocaleString()}).`,
        cashDelta: 0,
      };
    }

    const successRoll = Math.random();
    const isSuccess = successRoll < 0.65; // 65% success

    if (isSuccess) {
      return {
        success: true,
        message: `The IVF implantation was a complete success! You and ${partner.firstName} are expecting a baby! 🍼🎉`,
        cashDelta: -cost,
      };
    }

    return {
      success: false,
      message: `Unfortunately, the IVF cycle did not take this time. The medical team advised resting before trying again.`,
      cashDelta: -cost,
    };
  }

  /**
   * Adopts a child through a licensed adoption agency.
   */
  executeAdoption(
    character: CharacterProfile,
    ageGroup: 'infant' | 'toddler' | 'child',
    customFirstName?: string
  ): { success: boolean; child?: ChildProfile; message: string; cashDelta: number } {
    const fee = 6000;
    if (character.age < 21) {
      return {
        success: false,
        message: 'The adoption agency requires prospective parents to be at least 21 years old.',
        cashDelta: 0,
      };
    }

    if (character.cash < fee) {
      return {
        success: false,
        message: `You need at least $${fee.toLocaleString()} to cover legal and agency adoption fees.`,
        cashDelta: 0,
      };
    }

    let age = 0;
    let occupation = 'Infant';
    if (ageGroup === 'toddler') {
      age = Math.floor(Math.random() * 3) + 2; // 2 - 4
      occupation = 'Toddler';
    } else if (ageGroup === 'child') {
      age = Math.floor(Math.random() * 4) + 6; // 6 - 9
      occupation = 'Elementary Student';
    }

    const gender: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';
    const pool = gender === 'female' ? FEMALE_NAMES : MALE_NAMES;
    const firstName = customFirstName || pool[Math.floor(Math.random() * pool.length)];

    const child: ChildProfile = {
      id: createId(),
      firstName,
      lastName: character.lastName,
      age,
      gender,
      relationship: 90,
      smarts: Math.floor(Math.random() * 40) + 50,
      looks: Math.floor(Math.random() * 40) + 50,
      happiness: 85,
      health: 90,
      isAdopted: true,
      occupation,
      isAlive: true,
    };

    return {
      success: true,
      child,
      message: `Congratulations! The court has finalized the adoption paperwork. Welcome little ${child.firstName} ${child.lastName} to your family! 👶🏠`,
      cashDelta: -fee,
    };
  }

  /**
   * Generates a biological newborn baby inheriting parental genetics.
   */
  generateBaby(
    parentA: CharacterProfile,
    parentB?: PersonProfile,
    customFirstName?: string
  ): ChildProfile {
    const gender: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';
    const pool = gender === 'female' ? FEMALE_NAMES : MALE_NAMES;
    const firstName = customFirstName || pool[Math.floor(Math.random() * pool.length)];

    const parentLooks = parentA.stats.looks;
    const partnerLooks = parentB?.partnerStats?.looks ?? 60;
    const blendedLooks = Math.round((parentLooks + partnerLooks) / 2) + Math.floor(Math.random() * 11) - 5;

    const parentSmarts = parentA.stats.smarts;
    const partnerSmarts = parentB?.partnerStats?.smarts ?? 60;
    const blendedSmarts = Math.round((parentSmarts + partnerSmarts) / 2) + Math.floor(Math.random() * 11) - 5;

    return {
      id: createId(),
      firstName,
      lastName: parentA.lastName,
      age: 0,
      gender,
      relationship: 95,
      looks: Math.min(100, Math.max(10, blendedLooks)),
      smarts: Math.min(100, Math.max(10, blendedSmarts)),
      happiness: 100,
      health: 95,
      isAdopted: false,
      occupation: 'Infant',
      isAlive: true,
    };
  }
}

export const reproductionService = new ReproductionService();
