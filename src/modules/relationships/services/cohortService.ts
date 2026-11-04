import type { CharacterProfile, PersonProfile, LifeEvent } from '../../../types/game';
import { createId } from '../../../utils/id';
import { randomInt, chance, pickRandom } from '../../../utils/random';
import { MALE_NAMES, FEMALE_NAMES, LAST_NAMES } from '../../character/data/names';

export type StageCohortType =
  | 'elementary'
  | 'middle_school'
  | 'high_school'
  | 'university'
  | 'workplace';

export const ARCHETYPES = [
  'class_clown',
  'studious',
  'popular',
  'rebel',
  'quiet',
  'athletic',
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

export const ARCHETYPE_LABELS: Record<Archetype, { label: string; emoji: string }> = {
  class_clown: { label: 'Class Clown', emoji: '🤡' },
  studious: { label: 'Studious', emoji: '📚' },
  popular: { label: 'Popular', emoji: '✨' },
  rebel: { label: 'Rebel', emoji: '🎸' },
  quiet: { label: 'Quiet Artist', emoji: '🎨' },
  athletic: { label: 'Athletic', emoji: '⚡' },
};

export class CohortService {
  /**
   * Generates a batch of distinct, realistic cohort peers for a life stage or workplace.
   */
  generateStageCohort(
    character: CharacterProfile,
    stage: StageCohortType,
    customCount?: number
  ): PersonProfile[] {
    let defaultCount = 4;
    if (stage === 'elementary') defaultCount = 6;
    else if (stage === 'middle_school') defaultCount = 4;
    else if (stage === 'high_school') defaultCount = 4;
    else if (stage === 'university') defaultCount = 4;
    else if (stage === 'workplace') defaultCount = 4;

    const count = customCount ?? defaultCount;
    const cohort: PersonProfile[] = [];

    const existingNames = new Set(
      (character.relationships || []).map((r) => `${r.firstName} ${r.lastName}`.toLowerCase())
    );

    const availableArchetypes = [...ARCHETYPES];

    for (let i = 0; i < count; i++) {
      const gender: 'male' | 'female' = i % 2 === 0 ? 'female' : 'male';
      const namePool = gender === 'female' ? FEMALE_NAMES : MALE_NAMES;

      let firstName = pickRandom(namePool);
      let lastName = pickRandom(LAST_NAMES);
      let attempts = 0;
      while (existingNames.has(`${firstName} ${lastName}`.toLowerCase()) && attempts < 10) {
        firstName = pickRandom(namePool);
        lastName = pickRandom(LAST_NAMES);
        attempts++;
      }
      existingNames.add(`${firstName} ${lastName}`.toLowerCase());

      const archetype = availableArchetypes[i % availableArchetypes.length];

      let age = character.age;
      let role = 'Classmate';
      let stageMet: 'childhood' | 'middle_school' | 'high_school' | 'university' | 'adulthood' = 'childhood';
      let originStory = 'You were placed in the same homeroom class.';
      let avatarEmoji = gender === 'female' ? '👧' : '👦';

      switch (stage) {
        case 'elementary': {
          stageMet = 'childhood';
          age = Math.max(5, character.age + randomInt(-1, 0));
          role = 'Elementary Classmate';
          avatarEmoji = gender === 'female' ? '👧' : '👦';
          const elementaryStories = [
            'Sat next to you in homeroom and offered to share colored markers.',
            'Laughed together on the playground swing set during afternoon recess.',
            'Paired up with you during the kindergarten reading circle.',
            'Traded snacks with you at the school cafeteria lunch table.',
          ];
          originStory = pickRandom(elementaryStories);
          break;
        }

        case 'middle_school': {
          stageMet = 'middle_school';
          age = Math.max(11, character.age + randomInt(-1, 1));
          role = 'Middle School Classmate';
          avatarEmoji = gender === 'female' ? '🎒' : '🧢';
          const middleSchoolStories = [
            'Assigned as your science lab experiment partner for the semester.',
            'Shared a locker row with you near the gymnasium hallway.',
            'Sat at your lunch table and debated video games and music.',
            'Joined the same middle school after-school club as you.',
          ];
          originStory = pickRandom(middleSchoolStories);
          break;
        }

        case 'high_school': {
          stageMet = 'high_school';
          age = Math.max(14, character.age + randomInt(-1, 1));
          role = 'High School Classmate';
          avatarEmoji = gender === 'female' ? '👱‍♀️' : '👱‍♂️';
          const highSchoolStories = [
            'Assigned the desk directly beside yours in homeroom.',
            'Joined your group presentation team in history class.',
            'Shared homeroom and bonded over mutual music tastes.',
            'Teamed up with you during physical education volleyball.',
          ];
          originStory = pickRandom(highSchoolStories);
          break;
        }

        case 'university': {
          stageMet = 'university';
          age = Math.max(18, character.age + randomInt(0, 2));
          role = i === 0 ? 'Dorm Roommate' : 'University Peer';
          avatarEmoji = gender === 'female' ? '👩‍🎓' : '👨‍🎓';
          const uniStories = [
            'Assigned to your residence hall suite on campus move-in day.',
            'Formed a semester-long study group for lectures and finals.',
            'Met during freshmen campus orientation week.',
            'Sat beside you in a crowded lecture hall and struck up a great discussion.',
          ];
          originStory = pickRandom(uniStories);
          break;
        }

        case 'workplace': {
          stageMet = 'adulthood';
          const company = character.career.currentJob?.companyName || character.business?.name || 'the office';
          age = Math.max(22, character.age + randomInt(-3, 8));
          role = i === 0 ? `Team Lead at ${company}` : `Coworker at ${company}`;
          avatarEmoji = gender === 'female' ? '👩‍💼' : '👨‍💼';
          originStory = `Met during your new-hire onboarding week at ${company}.`;
          break;
        }
      }

      // Archetype-tailored initial partner stats for future romance/friendship
      let looks = randomInt(40, 75);
      let smarts = randomInt(40, 75);
      let craziness = randomInt(20, 60);

      if (archetype === 'studious') smarts = randomInt(75, 95);
      else if (archetype === 'popular') looks = randomInt(75, 95);
      else if (archetype === 'class_clown') craziness = randomInt(60, 90);
      else if (archetype === 'athletic') looks = randomInt(70, 90);

      // Starting relationship in neutral-to-friendly range (35% to 55%)
      const relationship = randomInt(35, 55);

      cohort.push({
        id: createId(),
        firstName,
        lastName,
        gender,
        age,
        role,
        relationshipType: 'classmate',
        relationship,
        originStory,
        stageMet,
        avatarEmoji,
        cohortType: stage === 'workplace' ? 'coworker' : 'classmate',
        personalityArchetype: archetype,
        lastInteractedAge: character.age,
        yearsNeglected: 0,
        romanceUnlocked: false,
        romanceMeter: 0,
        romanticStage: 'none',
        partnerStats: {
          craziness,
          generosity: randomInt(35, 75),
          looks,
          smarts,
          fertility: randomInt(40, 80),
          annualIncome: stage === 'workplace' ? randomInt(40000, 85000) : 0,
          occupation: stage === 'workplace' ? 'Coworker' : 'Student',
          yearsTogether: 0,
        },
      });
    }

    return cohort;
  }

  /**
   * Evaluates current non-family contacts for natural attrition / drifting apart.
   * Runs at stage transitions or periodically every 3-4 years.
   */
  evaluateDriftingApart(
    character: CharacterProfile,
    isStageTransition: boolean
  ): { updatedRelationships: PersonProfile[]; departedEvents: LifeEvent[] } {
    const relationships = character.relationships || [];
    const remaining: PersonProfile[] = [];
    const departedEvents: LifeEvent[] = [];

    const partnerId = character.partner?.id;

    for (const person of relationships) {
      // 1. IMMUNITY SHIELD: Never prune family, active/ex-partners, or close/best friends
      const isPartner = partnerId === person.id || (person.romanticStage && person.romanticStage !== 'none');
      const isCloseFriend = person.relationship >= 60 || person.cohortType === 'best_friend';

      if (isPartner || isCloseFriend) {
        remaining.push(person);
        continue;
      }

      // 2. PRUNING EVALUATION FOR WEAK OR NEGLECTED CONTACTS
      let shouldDrift = false;
      let driftReason = '';

      if (isStageTransition) {
        // Upon moving to next school stage or leaving workplace:
        // People with rapport < 40% drift away almost always (80%)
        // People with rapport 40% - 59% have a 50% chance to drift away
        if (person.relationship < 40 && chance(0.8)) {
          shouldDrift = true;
          driftReason = `after graduating to the next school stage.`;
        } else if (person.relationship < 60 && chance(0.5)) {
          shouldDrift = true;
          driftReason = `as you moved into different classes and social circles.`;
        }
      } else {
        // Periodic check (every 3-4 years):
        // Contacts with very low relationship (<30%) or neglected for >= 3 years
        const isNeglected = (person.yearsNeglected ?? 0) >= 3;
        const isLowRapport = person.relationship < 30;

        if (isLowRapport && chance(0.5)) {
          shouldDrift = true;
          driftReason = `because you rarely spoke and drifted out of each other's lives.`;
        } else if (isNeglected && chance(0.4)) {
          shouldDrift = true;
          driftReason = `after losing touch over several years.`;
        }
      }

      if (shouldDrift) {
        departedEvents.push({
          id: createId(),
          age: character.age,
          year: character.birthYear + character.age,
          title: 'Drifted Apart 🍃',
          message: `You and your ${person.role.toLowerCase()}, ${person.firstName} ${person.lastName}, naturally drifted apart ${driftReason}`,
          category: 'relationship',
          icon: '🍃',
        });
      } else {
        remaining.push(person);
      }
    }

    return {
      updatedRelationships: remaining,
      departedEvents,
    };
  }

  /**
   * Resets neglect counter and records last interaction age when player spends time/chats with an NPC.
   */
  touchInteraction(person: PersonProfile, playerAge: number): PersonProfile {
    return {
      ...person,
      lastInteractedAge: playerAge,
      yearsNeglected: 0,
    };
  }

  /**
   * Increments yearsNeglected on non-interacted contacts during yearly aging.
   */
  ageContacts(relationships: PersonProfile[], playerAge: number): PersonProfile[] {
    return relationships.map((p) => {
      const interactedThisYear = p.lastInteractedAge === playerAge;
      const yearsNeglected = interactedThisYear ? 0 : (p.yearsNeglected ?? 0) + 1;
      return {
        ...p,
        age: p.age + 1,
        yearsNeglected,
      };
    });
  }
}

export const cohortService = new CohortService();

