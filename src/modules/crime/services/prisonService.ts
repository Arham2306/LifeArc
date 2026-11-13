import type { CharacterProfile, LifeEvent, StatEffects } from '../../../types/game';
import { deterministicUUID, hashSeed, SeededPRNG } from '../../autonomy/services/seededPrngService';
import { resolveCharacterOccupation } from '../../character/services/occupationService';
import { applyEffects } from '../../character/services/statService';
import type {
  PrisonActionId,
  PrisonActionResult,
  PrisonState,
  PrisonYearProgress,
} from '../types';
import { CRIME_SIM_VERSION } from './crimeRiskService';
import { getSanitizedCrimeState, isCurrentlyIncarcerated } from './crimeSelectors';
import { mergeProbationState } from './crimeService';

export const MAX_PRISON_ACTIONS_PER_YEAR = 1;
export const PRISON_WORK_PAY = 45;

const VALID_PRISON_ACTIONS: ReadonlySet<string> = new Set([
  'work',
  'study',
  'workout',
  'good_behavior',
  'appeal',
  'parole',
]);

function clamp0to100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function failPrisonAction(
  character: CharacterProfile,
  actionId: PrisonActionId,
  reason: string,
): PrisonActionResult {
  return {
    ok: false,
    character,
    actionId,
    reason,
    released: false,
    cashEarned: 0,
    sentenceReductionYears: 0,
    behaviorDelta: 0,
    message: reason,
  };
}

/**
 * Executes one annual prison action for an incarcerated character.
 * Supports only the approved v1 actions (work, study, workout, good_behavior, appeal, parole).
 */
export function performPrisonAction(
  character: CharacterProfile,
  actionId: PrisonActionId,
): PrisonActionResult {
  if (!VALID_PRISON_ACTIONS.has(actionId)) {
    return failPrisonAction(character, actionId, 'Unsupported prison action.');
  }
  if (!character.isAlive) {
    return failPrisonAction(character, actionId, 'Deceased characters cannot take prison actions.');
  }

  const sanitized = getSanitizedCrimeState(character);
  const prison = sanitized.prison;
  if (!isCurrentlyIncarcerated(character) || !prison) {
    return failPrisonAction(character, actionId, 'Character is not currently incarcerated.');
  }

  const actionsTaken =
    prison.lastActionAge === character.age ? prison.actionsTakenThisYear : 0;
  if (actionsTaken >= MAX_PRISON_ACTIONS_PER_YEAR) {
    return failPrisonAction(
      character,
      actionId,
      'You have already completed your annual prison action for this age.',
    );
  }

  if (actionId === 'parole' && prison.yearsServed < prison.paroleEligibleAtServed) {
    return failPrisonAction(
      character,
      actionId,
      `Parole hearing unlocks after serving ${prison.paroleEligibleAtServed} year(s).`,
    );
  }

  let nextBehavior = prison.behaviorScore;
  let nextYearsRemaining = prison.yearsRemaining;
  let released = false;
  let cashEarned = 0;
  let sentenceReductionYears = 0;
  let nextProbation = sanitized.probation;
  let nextOccupation = character.occupation;
  const statEffects: StatEffects = {};
  let eventTitle = '';
  let eventIcon = '🏛️';
  let eventCategory: LifeEvent['category'] = 'milestone';
  let message = '';

  switch (actionId) {
    case 'work': {
      cashEarned = PRISON_WORK_PAY;
      nextBehavior = clamp0to100(prison.behaviorScore + 3);
      statEffects.cash = PRISON_WORK_PAY;
      statEffects.happiness = 2;
      statEffects.health = -1;
      eventTitle = 'Prison Work Detail';
      eventIcon = '🛠️';
      eventCategory = 'money';
      message = `Completed prison work assignment for $${PRISON_WORK_PAY} commissary pay.`;
      break;
    }

    case 'study': {
      nextBehavior = clamp0to100(prison.behaviorScore + 3);
      statEffects.smarts = 2;
      statEffects.happiness = 1;
      eventTitle = 'Prison Library Study';
      eventIcon = '📚';
      message = 'Studied legal and vocational texts in the prison library (+2 Smarts).';
      break;
    }

    case 'workout': {
      nextBehavior = clamp0to100(prison.behaviorScore + 1);
      statEffects.health = 3;
      statEffects.happiness = 2;
      eventTitle = 'Prison Yard Workout';
      eventIcon = '🏋️';
      eventCategory = 'health';
      message = 'Completed strength conditioning in the prison yard (+3 Health).';
      break;
    }

    case 'good_behavior': {
      nextBehavior = clamp0to100(prison.behaviorScore + 8);
      statEffects.karma = 2;
      statEffects.happiness = 2;
      eventTitle = 'Rehabilitation Program';
      eventIcon = '🕊️';
      message = 'Demonstrated exemplary conduct and completed counseling (+8 Behavior Score).';
      break;
    }

    case 'appeal': {
      const prng = new SeededPRNG(
        hashSeed(
          character.id,
          character.age,
          prison.yearsServed,
          prison.behaviorScore,
          CRIME_SIM_VERSION,
          'prison_appeal',
        ),
      );
      const appealChance = Math.max(
        0.08,
        Math.min(
          0.45,
          0.15 +
            Math.max(0, (prison.behaviorScore - 50) * 0.003) +
            (character.stats.smarts - 50) * 0.0015,
        ),
      );
      const granted = prng.chance(appealChance);
      if (granted) {
        sentenceReductionYears = 1;
        nextYearsRemaining = Math.max(0, prison.yearsRemaining - 1);
        statEffects.happiness = 12;
        eventTitle = 'Appeal Granted';
        eventIcon = '⚖️';
        if (nextYearsRemaining === 0) {
          released = true;
          nextOccupation = resolveCharacterOccupation(character, {
            prisonContext: prison,
            currentOccupationBaseline: 'Unemployed',
          });
          message =
            'Your judicial appeal succeeded and commuted your remaining time. You were released from prison!';
        } else {
          message = `Your judicial appeal reduced your remaining sentence by 1 year (${nextYearsRemaining} year(s) left).`;
        }
      } else {
        statEffects.happiness = -5;
        eventTitle = 'Appeal Denied';
        eventIcon = '⚖️';
        eventCategory = 'misfortune';
        message = 'The appellate court denied your sentence reduction petition.';
      }
      break;
    }

    case 'parole': {
      const prng = new SeededPRNG(
        hashSeed(
          character.id,
          character.age,
          prison.yearsServed,
          prison.behaviorScore,
          CRIME_SIM_VERSION,
          'prison_parole',
        ),
      );
      const paroleChance = Math.max(
        0.1,
        Math.min(0.85, 0.25 + (prison.behaviorScore - 50) * 0.008),
      );
      const granted = prng.chance(paroleChance);
      if (granted) {
        released = true;
        const paroleYears = Math.max(1, prison.yearsRemaining);
        nextYearsRemaining = 0;
        nextProbation = mergeProbationState(
          sanitized.probation,
          prison.chargeTitle,
          'adult',
          paroleYears,
          character.age,
        );
        nextOccupation = resolveCharacterOccupation(character, {
          prisonContext: prison,
          currentOccupationBaseline: 'Unemployed',
        });
        statEffects.happiness = 15;
        eventTitle = 'Parole Granted';
        eventIcon = '🔓';
        message = `The parole board approved your early release with ${paroleYears} year(s) of adult parole supervision.`;
      } else {
        statEffects.happiness = -6;
        eventTitle = 'Parole Denied';
        eventIcon = '🔒';
        eventCategory = 'misfortune';
        message =
          'The parole board denied early release this year. Maintain strong conduct for your next hearing.';
      }
      break;
    }
  }

  const behaviorDelta = nextBehavior - prison.behaviorScore;
  const updatedPrison: PrisonState | null = released
    ? null
    : {
        ...prison,
        yearsRemaining: nextYearsRemaining,
        behaviorScore: nextBehavior,
        actionsTakenThisYear: actionsTaken + 1,
        lastActionAge: character.age,
      };

  const actionEvent: LifeEvent = {
    id: deterministicUUID(
      'prison_action',
      character.id,
      character.age,
      actionId,
      prison.yearsServed,
    ),
    age: character.age,
    year: character.birthYear + character.age,
    title: eventTitle,
    message,
    category: eventCategory,
    icon: eventIcon,
  };

  const { character: updatedChar } = applyEffects(
    {
      ...character,
      occupation: nextOccupation,
      crime: {
        ...sanitized,
        prison: updatedPrison,
        probation: nextProbation,
      },
      timeline: [...character.timeline, actionEvent],
    },
    statEffects,
  );

  return {
    ok: true,
    character: updatedChar,
    actionId,
    released,
    cashEarned,
    sentenceReductionYears,
    behaviorDelta,
    message,
  };
}

/**
 * Advances active incarceration by 1 year during Age Up.
 * Clears active PrisonState upon sentence completion while preserving criminal records.
 */
export function progressPrisonForYear(
  character: CharacterProfile,
  nextAge: number,
): PrisonYearProgress {
  const sanitized = getSanitizedCrimeState(character);
  const prison = sanitized.prison;

  if (!character.isAlive || !prison || prison.yearsRemaining <= 0) {
    return {
      prison: null,
      releasedFromPrison: false,
      happinessDelta: 0,
      events: [],
    };
  }

  if (prison.lastProgressedAge === nextAge) {
    return {
      prison,
      releasedFromPrison: false,
      happinessDelta: 0,
      events: [],
    };
  }

  const nextYearsServed = prison.yearsServed + 1;
  const nextYearsRemaining = Math.max(0, prison.yearsRemaining - 1);
  const nextYear = character.birthYear + nextAge;

  if (nextYearsRemaining === 0) {
    const releaseEvent: LifeEvent = {
      id: deterministicUUID('prison_release', character.id, nextAge, prison.chargeTitle),
      age: nextAge,
      year: nextYear,
      title: 'Released From Prison',
      message: `After serving ${prison.yearsTotal} year(s) at ${prison.facilityName} for ${prison.chargeTitle}, you completed your sentence and returned to society.`,
      category: 'milestone',
      icon: '🔓',
    };

    return {
      prison: null,
      releasedFromPrison: true,
      happinessDelta: 8,
      events: [releaseEvent],
    };
  }

  const updatedPrison: PrisonState = {
    ...prison,
    yearsServed: nextYearsServed,
    yearsRemaining: nextYearsRemaining,
    actionsTakenThisYear: 0,
    lastActionAge: null,
    lastProgressedAge: nextAge,
  };

  return {
    prison: updatedPrison,
    releasedFromPrison: false,
    happinessDelta: -2,
    events: [],
  };
}

