import type { CharacterProfile, ChildProfile, LifeEvent, SiblingProfile, StatEffects } from '../../../types/game'
import { applyEffects } from '../../character/services/statService'
import { progressEducationForYear } from '../../education/services/educationService'
import { progressCareerForYear } from '../../career/services/careerService'
import { progressBusinessForYear } from '../../business/services/businessService'
import { reproductionService } from '../../romance/services/reproductionService'
import { cohortService } from '../../relationships/services/cohortService'
import { getSiblingOccupation } from '../../character/services/familyService'
import { MALE_NAMES, FEMALE_NAMES } from '../../character/data/names'
import type { ActiveBusinessProfile } from '../../business/types'
import { createId } from '../../../utils/id'
import { chance, pickRandom, randomInt } from '../../../utils/random'
import { EARLY_MILESTONES, getMilestoneForAge } from '../data/milestones'

/** Resolves the character's occupation label based on age, education stage, active job, and business. */
export function getOccupationForAge(
  age: number,
  currentOccupation?: string,
  educationStage?: string,
  activeJobTitle?: string,
  activeBusinessName?: string
): string {
  if (age <= 2) return 'Infant';
  if (age <= 4) return 'Toddler';
  if (age <= 10) return 'Elementary Student';
  if (age <= 13) return 'Middle School Student';
  if (activeBusinessName) return `Founder & CEO (${activeBusinessName})`;
  if (activeJobTitle) return activeJobTitle;
  if (age <= 17) {
    if (currentOccupation === 'High School Dropout') return 'High School Dropout';
    return 'High School Student';
  }
  if (educationStage === 'university') return 'University Student';
  if (educationStage === 'professional_school') {
    return currentOccupation && currentOccupation.endsWith('Student')
      ? currentOccupation
      : 'Graduate Student';
  }
  if (
    currentOccupation === 'Retired' ||
    currentOccupation === 'Retired Entrepreneur'
  ) {
    return currentOccupation;
  }
  if (currentOccupation === 'High School Dropout' && age < 18) {
    return 'High School Dropout';
  }
  return 'Unemployed';
}

/** Yearly natural health change based on age. */
function getAgeHealthDelta(age: number): number {
  if (age < 45) return randomInt(-1, 1);
  if (age < 65) return randomInt(-3, 0);
  if (age < 80) return randomInt(-6, -1);
  return randomInt(-12, -3);
}

/** Checks if a character passes away of natural old age this year. */
function rollNaturalOldAgeDeath(age: number, health: number): boolean {
  if (age < 75) return false;
  const baseProbability = (age - 72) * 0.035;
  const lowHealthPenalty = health < 35 ? (35 - health) * 0.01 : 0;
  return chance(Math.min(0.85, baseProbability + lowHealthPenalty));
}

/**
 * Advances a character by one year:
 * - Ages up parents
 * - Applies milestone effects and natural stat drift
 * - Checks for mortality (health hitting 0 or natural old age)
 * - Logs the milestone (and obituary entry if deceased)
 */
export function ageUpCharacter(character: CharacterProfile): CharacterProfile {
  if (!character.isAlive) return character;

  const nextAge = character.age + 1;
  const nextYear = character.birthYear + nextAge;
  const milestoneEffects = EARLY_MILESTONES[nextAge]?.statEffects ?? {};
  const milestone = {
    ...getMilestoneForAge(nextAge),
    year: nextYear,
  };

  const yearlyChanges: StatEffects = {
    happiness: (milestoneEffects.happiness ?? 0) + randomInt(-2, 2),
    health: (milestoneEffects.health ?? 0) + getAgeHealthDelta(nextAge),
    smarts: milestoneEffects.smarts ?? 0,
    looks: (milestoneEffects.looks ?? 0) + randomInt(-1, 1),
  };

  // Age up parents alongside player (only if still living)
  let fatherPassedAway = false;
  let motherPassedAway = false;
  let newFatherAge = character.parents.father.age;
  let newMotherAge = character.parents.mother.age;
  let fatherAlive = character.parents.father.isAlive;
  let motherAlive = character.parents.mother.isAlive;

  if (fatherAlive) {
    newFatherAge += 1;
    if (newFatherAge >= 75) {
      // Natural mortality chance begins at age 75 and scales with age
      const fatherDeathChance = Math.min(0.85, (newFatherAge - 72) * 0.04);
      if (chance(fatherDeathChance)) {
        fatherAlive = false;
        fatherPassedAway = true;
      }
    }
  }

  if (motherAlive) {
    newMotherAge += 1;
    if (newMotherAge >= 75) {
      // Natural mortality chance begins at age 75 and scales with age
      const motherDeathChance = Math.min(0.85, (newMotherAge - 72) * 0.04);
      if (chance(motherDeathChance)) {
        motherAlive = false;
        motherPassedAway = true;
      }
    }
  }

  const updatedParents = {
    ...character.parents,
    father: {
      ...character.parents.father,
      age: newFatherAge,
      isAlive: fatherAlive,
    },
    mother: {
      ...character.parents.mother,
      age: newMotherAge,
      isAlive: motherAlive,
    },
  };

  const familyDeathEvents: LifeEvent[] = [];
  let griefHappinessDelta = 0;

  if (fatherPassedAway) {
    familyDeathEvents.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'Family Loss',
      message: `Your father, ${character.parents.father.firstName} ${character.parents.father.lastName}, passed away peacefully of old age at age ${newFatherAge}. You attended the memorial service to honor his memory.`,
      category: 'misfortune',
      icon: '🕊️',
    });
    griefHappinessDelta -= 25;
  }

  if (motherPassedAway) {
    familyDeathEvents.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'Family Loss',
      message: `Your mother, ${character.parents.mother.firstName} ${character.parents.mother.lastName}, passed away peacefully of old age at age ${newMotherAge}. You gathered with family to celebrate her life.`,
      category: 'misfortune',
      icon: '🕊️',
    });
    griefHappinessDelta -= 25;
  }

  // Age up active partner alongside player and collect spouse salary contribution
  let spouseCashContribution = 0;
  let updatedPartner = character.partner ? { ...character.partner } : null;

  if (updatedPartner) {
    const nextPartnerAge = updatedPartner.age + 1;
    const yearsTogether = (updatedPartner.partnerStats?.yearsTogether ?? 0) + 1;
    const isMarried = updatedPartner.romanticStage === 'married';

    if (isMarried) {
      const spouseSalary = updatedPartner.partnerStats?.annualIncome ?? 42000;
      spouseCashContribution = Math.floor(spouseSalary * 0.2); // 20% household contribution
    }

    // Subtle annual relationship decay if neglected (0 interactions this year)
    const actionsDoneWithPartner = (character.yearlySocialActions?.[updatedPartner.id] || []).length;
    let relDecay = 0;
    let romanceDecay = 0;
    if (actionsDoneWithPartner === 0) {
      relDecay = 3;
      romanceDecay = 3;
    }

    updatedPartner = {
      ...updatedPartner,
      age: nextPartnerAge,
      relationship: Math.max(10, updatedPartner.relationship - relDecay),
      romanceMeter: Math.max(0, (updatedPartner.romanceMeter ?? 0) - romanceDecay),
      partnerStats: {
        ...(updatedPartner.partnerStats || {
          craziness: 30,
          generosity: 50,
          looks: 60,
          smarts: 60,
          fertility: 50,
        }),
        yearsTogether,
      },
    };
  }

  // Age up friends, partners, and coworkers alongside player, and track neglect
  let agedRelationships = cohortService.ageContacts(character.relationships || [], character.age);
  if (updatedPartner) {
    agedRelationships = agedRelationships.map((rel) => {
      if (rel.id === updatedPartner?.id) {
        return updatedPartner;
      }
      return rel;
    });
  }

  // Pregnancy resolution (Childbirth upon age up)
  const babyChildBirthEvents: LifeEvent[] = [];
  let updatedChildren: ChildProfile[] = (character.children || []).map((child) => {
    const nextChildAge = child.age + 1;
    let occupation = child.occupation;
    if (nextChildAge <= 1) occupation = 'Infant';
    else if (nextChildAge <= 4) occupation = 'Toddler';
    else if (nextChildAge <= 10) occupation = 'Elementary Student';
    else if (nextChildAge <= 13) occupation = 'Middle School Student';
    else if (nextChildAge <= 17) occupation = 'High School Student';
    else if (occupation === 'High School Student') occupation = 'Employed';

    return {
      ...child,
      age: nextChildAge,
      occupation,
    };
  });

  let childBirthHappinessDelta = 0;
  let isPregnantResolved = false;
  let newbornToAnnounce: ChildProfile | undefined = undefined;

  const partnerIsPregnant = !!updatedPartner?.partnerStats?.isPregnant;
  if (character.isPregnant || partnerIsPregnant) {
    const newborn = reproductionService.generateBaby(character, updatedPartner || undefined);
    updatedChildren = [...updatedChildren, newborn];
    childBirthHappinessDelta += 25;
    isPregnantResolved = true;
    newbornToAnnounce = newborn;

    if (updatedPartner?.partnerStats?.isPregnant) {
      updatedPartner = {
        ...updatedPartner,
        partnerStats: {
          ...updatedPartner.partnerStats,
          isPregnant: false,
        },
      };
    }

    babyChildBirthEvents.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'Baby Born! 👶',
      message: `You welcomed a beautiful newborn ${newborn.gender === 'female' ? 'daughter' : 'son'}, ${newborn.firstName} ${newborn.lastName}, into the world! Welcome to parenthood! 🍼✨`,
      category: 'milestone',
      icon: '👶',
    });
  }

  // Age up siblings alongside player
  let updatedSiblings = (character.siblings || []).map((sib) => {
    const nextSibAge = sib.age + 1;
    return {
      ...sib,
      age: nextSibAge,
      occupation: getSiblingOccupation(nextSibAge, sib.occupation),
    };
  });

  // Early-childhood dynamic baby sibling birth chance (Option A)
  const babySiblingEvents: LifeEvent[] = [];
  let babyHappinessDelta = 0;
  if (
    nextAge >= 1 &&
    nextAge <= 10 &&
    fatherAlive &&
    motherAlive &&
    newMotherAge <= 42 &&
    updatedSiblings.length < 4 &&
    chance(0.09)
  ) {
    const isBabyBrother = Math.random() < 0.5;
    const babyRole = isBabyBrother ? 'brother' : 'sister';
    const babyName = isBabyBrother ? pickRandom(MALE_NAMES) : pickRandom(FEMALE_NAMES);
    const newBabySibling: SiblingProfile = {
      id: createId(),
      role: babyRole,
      firstName: babyName,
      lastName: character.lastName,
      age: 0,
      gender: isBabyBrother ? 'male' : 'female',
      relationship: randomInt(85, 98),
      occupation: 'Infant',
      isAlive: true,
      birthOrder: 'younger',
    };
    updatedSiblings = [...updatedSiblings, newBabySibling];
    babyHappinessDelta += 5;
    babySiblingEvents.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'New Baby Sibling!',
      message: `Your mother gave birth to a healthy baby ${babyRole}, ${babyName} ${character.lastName}! You are officially an older sibling.`,
      category: 'milestone',
      icon: '🍼',
    });
  }

  // Progress schooling (Elementary -> Middle -> High School -> University -> Professional)
  const eduProgress = progressEducationForYear(character, nextAge);
  const eduEffects = eduProgress.statEffects ?? {};

  // Progress active career & annual salary payout
  const careerProgress = progressCareerForYear(
    { ...character, education: eduProgress.education },
    nextAge
  );

  // Progress active business & corporate financials (if player owns a company)
  let businessEvents: LifeEvent[] = [];
  let businessPayout = 0;
  let updatedBusiness: ActiveBusinessProfile | null = character.business ?? null;

  if (character.business) {
    const bizProgress = progressBusinessForYear(
      character.business,
      character,
      nextAge
    );
    updatedBusiness = bizProgress.business;
    businessPayout = bizProgress.netPayoutToPlayer;
    businessEvents = bizProgress.events;
  }

  // Stage Cohort Management & Drifting Apart
  const cohortEvents: LifeEvent[] = [];

  const existingClassmates = agedRelationships.filter(
    (r) => r.cohortType === 'classmate' || r.role.toLowerCase().includes('classmate')
  );

  const isElementaryEntry =
    (nextAge === 5 || nextAge === 6) && existingClassmates.length === 0;
  const isMiddleSchoolEntry = nextAge === 11;
  const isHighSchoolEntry = nextAge === 14;
  const isUniversityEntry =
    nextAge >= 18 &&
    eduProgress.education.currentStage === 'university' &&
    agedRelationships.filter((r) => r.stageMet === 'university').length === 0;
  const isPeriodicDriftCheck =
    !isMiddleSchoolEntry && !isHighSchoolEntry && nextAge > 6 && nextAge % 3 === 0;

  if (isElementaryEntry) {
    const classmates = cohortService.generateStageCohort(character, 'elementary', 6);
    agedRelationships = [...agedRelationships, ...classmates];
    cohortEvents.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'Elementary School Classmates! 🎒',
      message: `You started school and joined a homeroom class with ${classmates.slice(0, 3).map((c) => c.firstName).join(', ')}, and others!`,
      category: 'relationship',
      icon: '🎒',
    });
  } else if (isMiddleSchoolEntry) {
    const driftResult = cohortService.evaluateDriftingApart(
      { ...character, relationships: agedRelationships, partner: updatedPartner },
      true
    );
    agedRelationships = driftResult.updatedRelationships;
    cohortEvents.push(...driftResult.departedEvents);

    const newClassmates = cohortService.generateStageCohort(character, 'middle_school', 4);
    agedRelationships = [...agedRelationships, ...newClassmates];
    cohortEvents.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'New Middle School Classmates! 🏫',
      message: `You started middle school and were introduced to new classmates including ${newClassmates.slice(0, 2).map((c) => c.firstName).join(' and ')}!`,
      category: 'relationship',
      icon: '🏫',
    });
  } else if (isHighSchoolEntry) {
    const driftResult = cohortService.evaluateDriftingApart(
      { ...character, relationships: agedRelationships, partner: updatedPartner },
      true
    );
    agedRelationships = driftResult.updatedRelationships;
    cohortEvents.push(...driftResult.departedEvents);

    const newClassmates = cohortService.generateStageCohort(character, 'high_school', 4);
    agedRelationships = [...agedRelationships, ...newClassmates];
    cohortEvents.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'High School Peers! 🎓',
      message: `You entered high school! You were assigned homeroom with new peers including ${newClassmates.slice(0, 2).map((c) => c.firstName).join(' and ')}!`,
      category: 'relationship',
      icon: '🎓',
    });
  } else if (isUniversityEntry) {
    const uniPeers = cohortService.generateStageCohort(character, 'university', 4);
    agedRelationships = [...agedRelationships, ...uniPeers];
    cohortEvents.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'Campus Life & Roommates! 🏛️',
      message: `You arrived on campus and met fellow students, including your dorm roommate ${uniPeers[0].firstName} ${uniPeers[0].lastName}!`,
      category: 'relationship',
      icon: '🏛️',
    });
  } else if (isPeriodicDriftCheck) {
    const driftResult = cohortService.evaluateDriftingApart(
      { ...character, relationships: agedRelationships, partner: updatedPartner },
      false
    );
    agedRelationships = driftResult.updatedRelationships;
    cohortEvents.push(...driftResult.departedEvents);
  }

  const combinedChanges: StatEffects = {
    happiness:
      (yearlyChanges.happiness ?? 0) +
      (eduEffects.happiness ?? 0) +
      (careerProgress.statEffects?.happiness ?? 0) +
      griefHappinessDelta +
      babyHappinessDelta +
      childBirthHappinessDelta,
    health: (yearlyChanges.health ?? 0) + (eduEffects.health ?? 0),
    smarts: (yearlyChanges.smarts ?? 0) + (eduEffects.smarts ?? 0),
    looks: (yearlyChanges.looks ?? 0) + (eduEffects.looks ?? 0),
    parents: eduEffects.parents,
    cash: (careerProgress.netPayEarned || 0) + businessPayout + spouseCashContribution,
  };

  const { character: aged } = applyEffects(
    {
      ...character,
      age: nextAge,
      occupation: getOccupationForAge(
        nextAge,
        character.occupation,
        eduProgress.education.currentStage,
        careerProgress.career.currentJob?.title,
        updatedBusiness?.name
      ),
      parents: updatedParents,
      siblings: updatedSiblings,
      relationships: agedRelationships,
      partner: updatedPartner,
      children: updatedChildren,
      isPregnant: isPregnantResolved ? false : character.isPregnant,
      newbornAnnouncement: newbornToAnnounce,
      yearlySocialActions: {},
      education: {
        ...eduProgress.education,
        studentDebt: careerProgress.remainingStudentDebt,
      },
      career: careerProgress.career,
      business: updatedBusiness,
      timeline: [
        ...character.timeline,
        milestone,
        ...babySiblingEvents,
        ...babyChildBirthEvents,
        ...familyDeathEvents,
        ...eduProgress.events,
        ...careerProgress.events,
        ...businessEvents,
        ...cohortEvents,
      ],
    },
    combinedChanges
  );

  // Check if the character died from 0 health or natural old age
  const diedOfOldAge = aged.isAlive && rollNaturalOldAgeDeath(nextAge, aged.stats.health);
  if (!aged.isAlive || diedOfOldAge) {
    const cause = diedOfOldAge
      ? 'Passed away peacefully in sleep of old age'
      : aged.causeOfDeath || 'Succumbed to poor health';

    const deathEvent: LifeEvent = {
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'Rest in Peace',
      message: `You died at age ${nextAge}. Cause of death: ${cause}.`,
      category: 'misfortune',
      icon: '🪦',
    };

    return {
      ...aged,
      isAlive: false,
      causeOfDeath: cause,
      stats: { ...aged.stats, health: 0 },
      timeline: [...aged.timeline, deathEvent],
    };
  }

  return aged;
}
