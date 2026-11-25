import type { CharacterProfile, LifeEvent } from '../../../types/game';
import { createId } from '../../../utils/id';
import { applyEffects } from '../../character/services/statService';
import { isCurrentlyIncarcerated } from '../../crime/services/crimeSelectors';
import {
  ACTIVITIES_MIN_AGE,
  DIET_MIN_AGE,
  GYM_MEMBERSHIP_ANNUAL_FEE,
  GYM_SECOND_SESSION_STRAIN_CHANCE,
  GYM_SECOND_SESSION_STRAIN_HEALTH_PENALTY,
  MARTIAL_ARTS_LESSON_FEE,
  MAX_MARTIAL_ARTS_SESSIONS_PER_YEAR,
  MINOR_FREE_CUTOFF_AGE,
  getBeltRankLabel,
  getDietTemplate,
  getMartialArtTemplate,
  getMindBodyActionTemplate,
} from '../data/activitiesCatalog';
import type {
  ActivitiesYearProgress,
  ActivityActionResult,
  DietId,
  MartialArtBeltRank,
  MartialArtId,
  MindBodyActionId,
  PlayerActivitiesState,
} from '../types';
import {
  getActivityActionsUsedThisYear,
  getEffectiveActivityFee,
  getEffectiveGymWorkoutFee,
  getMartialArtsSessionsUsedThisYear,
  getSanitizedActivitiesState,
} from './activitiesSelectors';

function makeEvent(
  character: Pick<CharacterProfile, 'birthYear'>,
  age: number,
  title: string,
  message: string,
  category: LifeEvent['category'],
  icon?: string
): LifeEvent {
  return {
    id: createId(),
    age,
    year: character.birthYear + age,
    title,
    message,
    category,
    ...(icon ? { icon } : {}),
  };
}

function blockedResult(
  character: CharacterProfile,
  title: string,
  summary: string
): ActivityActionResult {
  return {
    character,
    succeeded: false,
    title,
    summary,
    costPaid: 0,
  };
}

function withUpdatedActivities(
  character: CharacterProfile,
  nextActivities: PlayerActivitiesState
): CharacterProfile {
  return {
    ...character,
    activities: nextActivities,
  };
}

function getNormalizedAnnualCounts(
  activities: PlayerActivitiesState,
  currentAge: number
): Record<string, number> {
  if (activities.lastActionAge !== currentAge) {
    return {};
  }
  return { ...activities.annualActionCounts };
}

export function performMindBodyAction(
  character: CharacterProfile,
  actionId: MindBodyActionId,
  rng: () => number = Math.random
): ActivityActionResult {
  if (!character.isAlive) {
    return blockedResult(character, 'Unavailable', 'This life has already ended.');
  }
  if (isCurrentlyIncarcerated(character)) {
    return blockedResult(
      character,
      'Locked in Prison',
      'External Mind & Body activities are unavailable while serving a prison sentence.'
    );
  }

  const action = getMindBodyActionTemplate(actionId);
  if (!action) {
    return blockedResult(character, 'Unavailable', 'That activity could not be found.');
  }

  if (character.age < action.minAge) {
    return blockedResult(
      character,
      action.name,
      `${action.name} unlocks at Age ${action.minAge}.`
    );
  }

  const usedThisYear = getActivityActionsUsedThisYear(character, actionId);
  if (usedThisYear >= action.annualLimit) {
    return blockedResult(
      character,
      action.name,
      `You have already completed ${action.name} (${usedThisYear}/${action.annualLimit}) this year.`
    );
  }

  const fee =
    actionId === 'gym_workout'
      ? getEffectiveGymWorkoutFee(character, action.baseCost)
      : getEffectiveActivityFee(character, action.baseCost);

  if (character.cash < fee) {
    return blockedResult(
      character,
      action.name,
      `You need $${fee.toLocaleString()} in wallet cash for ${action.name}.`
    );
  }

  const statEffects = { ...action.effects };
  let strained = false;
  if (actionId === 'gym_workout' && usedThisYear === 1) {
    if (rng() < GYM_SECOND_SESSION_STRAIN_CHANCE) {
      strained = true;
      statEffects.health =
        (statEffects.health ?? 0) + GYM_SECOND_SESSION_STRAIN_HEALTH_PENALTY;
    }
  }

  const activities = getSanitizedActivitiesState(character);
  const annualActionCounts = getNormalizedAnnualCounts(activities, character.age);
  annualActionCounts[actionId] = usedThisYear + 1;

  const updatedActivities: PlayerActivitiesState = {
    ...activities,
    annualActionCounts,
    lastActionAge: character.age,
  };

  const feeNote =
    fee > 0
      ? ` Paid $${fee.toLocaleString()}.`
      : action.baseCost > 0 && character.age < MINOR_FREE_CUTOFF_AGE
        ? ' Covered by your parents.'
        : action.baseCost > 0 && activities.gymMembershipActive
          ? ' Covered by your annual Gym Pass.'
          : '';

  const summary = strained
    ? `You pushed through a second Gym Workout this year and pulled a muscle (${GYM_SECOND_SESSION_STRAIN_HEALTH_PENALTY} extra Health impact).${feeNote}`
    : `${action.description}${feeNote}`;

  const eventCategory: LifeEvent['category'] =
    action.category === 'Mind' || action.category === 'Self-Care' ? 'health' : 'health';

  const event = makeEvent(
    character,
    character.age,
    strained ? 'Gym Workout (Mild Strain)' : action.name,
    summary,
    eventCategory
  );

  const preStatChar: CharacterProfile = {
    ...withUpdatedActivities(character, updatedActivities),
    timeline: [...character.timeline, event],
  };

  const { character: nextCharacter } = applyEffects(preStatChar, {
    ...statEffects,
    ...(fee > 0 ? { cash: -fee } : {}),
  });

  return {
    character: nextCharacter,
    succeeded: true,
    title: strained ? 'Gym Workout (Mild Strain)' : action.name,
    summary,
    costPaid: fee,
  };
}

export function toggleGymMembership(
  character: CharacterProfile,
  active: boolean
): ActivityActionResult {
  if (!character.isAlive) {
    return blockedResult(character, 'Gym Membership', 'This life has already ended.');
  }
  if (isCurrentlyIncarcerated(character)) {
    return blockedResult(
      character,
      'Locked in Prison',
      'Gym memberships cannot be changed while incarcerated.'
    );
  }
  if (character.age < MINOR_FREE_CUTOFF_AGE) {
    return blockedResult(
      character,
      'Gym Membership',
      `Gym workouts under Age ${MINOR_FREE_CUTOFF_AGE} are already parent-sponsored. Annual memberships open at Age ${MINOR_FREE_CUTOFF_AGE}.`
    );
  }

  const activities = getSanitizedActivitiesState(character);
  if (!active) {
    if (!activities.gymMembershipActive) {
      return blockedResult(
        character,
        'Gym Membership',
        'You do not currently have an active gym membership.'
      );
    }
    const nextActivities: PlayerActivitiesState = {
      ...activities,
      gymMembershipActive: false,
    };
    const event = makeEvent(
      character,
      character.age,
      'Gym Pass Cancelled',
      'You cancelled your annual Gym Membership.',
      'money'
    );
    return {
      character: {
        ...withUpdatedActivities(character, nextActivities),
        timeline: [...character.timeline, event],
      },
      succeeded: true,
      title: 'Gym Membership Cancelled',
      summary: 'Your annual gym membership will not renew next year.',
      costPaid: 0,
    };
  }

  if (activities.gymMembershipActive) {
    return blockedResult(
      character,
      'Gym Membership',
      'Your annual gym membership is already active.'
    );
  }

  const alreadyPaidThisYear = activities.gymMembershipAge === character.age;
  const cost = alreadyPaidThisYear ? 0 : GYM_MEMBERSHIP_ANNUAL_FEE;

  if (character.cash < cost) {
    return blockedResult(
      character,
      'Gym Membership',
      `You need $${cost.toLocaleString()} in wallet cash to start an annual Gym Membership.`
    );
  }

  const nextActivities: PlayerActivitiesState = {
    ...activities,
    gymMembershipActive: true,
    gymMembershipAge: character.age,
  };

  const summary =
    cost > 0
      ? `Activated your annual Gym Membership for $${cost.toLocaleString()}. Gym workouts are free for the rest of the year.`
      : 'Reactivated your Gym Membership for the remainder of the year (already covered this age).';

  const event = makeEvent(
    character,
    character.age,
    'Gym Membership Active',
    summary,
    'health'
  );

  const preEffectChar: CharacterProfile = {
    ...withUpdatedActivities(character, nextActivities),
    timeline: [...character.timeline, event],
  };

  const { character: nextCharacter } = applyEffects(
    preEffectChar,
    cost > 0 ? { cash: -cost } : {}
  );

  return {
    character: nextCharacter,
    succeeded: true,
    title: 'Gym Membership Active',
    summary,
    costPaid: cost,
  };
}

export function trainMartialArt(
  character: CharacterProfile,
  discipline: MartialArtId
): ActivityActionResult {
  if (!character.isAlive) {
    return blockedResult(character, 'Martial Arts Dojo', 'This life has already ended.');
  }
  if (isCurrentlyIncarcerated(character)) {
    return blockedResult(
      character,
      'Locked in Prison',
      'Martial arts dojo lessons are unavailable while serving a prison sentence.'
    );
  }
  if (character.age < ACTIVITIES_MIN_AGE) {
    return blockedResult(
      character,
      'Martial Arts Dojo',
      `Martial arts classes unlock at Age ${ACTIVITIES_MIN_AGE}.`
    );
  }

  const template = getMartialArtTemplate(discipline);
  if (!template) {
    return blockedResult(character, 'Martial Arts Dojo', 'Discipline not found.');
  }

  const activities = getSanitizedActivitiesState(character);
  const currentProgress = activities.martialArts[discipline];

  if (currentProgress && currentProgress.lastTrainedAge === character.age) {
    return blockedResult(
      character,
      `${template.name} Lesson`,
      `You already completed your annual ${template.name} lesson this year.`
    );
  }

  const sessionsUsed = getMartialArtsSessionsUsedThisYear(character);
  if (sessionsUsed >= MAX_MARTIAL_ARTS_SESSIONS_PER_YEAR) {
    return blockedResult(
      character,
      'Dojo Limit Reached',
      `You can train at most ${MAX_MARTIAL_ARTS_SESSIONS_PER_YEAR} martial arts disciplines per year.`
    );
  }

  const currentRank = currentProgress?.beltRank ?? 0;
  if (currentRank >= 7) {
    return blockedResult(
      character,
      `${template.name} Black Belt`,
      `You have already mastered ${template.name} at Black Belt rank.`
    );
  }

  const fee = getEffectiveActivityFee(character, MARTIAL_ARTS_LESSON_FEE);
  if (character.cash < fee) {
    return blockedResult(
      character,
      `${template.name} Lesson`,
      `You need $${fee.toLocaleString()} in wallet cash for a ${template.name} lesson.`
    );
  }

  const nextRank = Math.min(7, currentRank + 1) as MartialArtBeltRank;
  const beltLabel = getBeltRankLabel(nextRank);
  const reachedBlackBelt = nextRank === 7;

  const nextActivities: PlayerActivitiesState = {
    ...activities,
    martialArts: {
      ...activities.martialArts,
      [discipline]: {
        discipline,
        beltRank: nextRank,
        lastTrainedAge: character.age,
      },
    },
  };

  const feeNote =
    fee > 0 ? ` Paid $${fee.toLocaleString()}.` : ' Sponsored by your parents.';
  const summary = reachedBlackBelt
    ? `Incredible dedication! You earned your ${template.name} Black Belt!${feeNote}`
    : `Completed your ${template.name} belt test and earned your ${beltLabel}!${feeNote}`;

  const event = makeEvent(
    character,
    character.age,
    reachedBlackBelt
      ? `${template.name} Black Belt!`
      : `${template.name}: ${beltLabel}`,
    summary,
    'milestone'
  );

  const preEffectChar: CharacterProfile = {
    ...withUpdatedActivities(character, nextActivities),
    timeline: [...character.timeline, event],
  };

  const { character: nextCharacter } = applyEffects(preEffectChar, {
    health: 4,
    happiness: reachedBlackBelt ? 5 : 2,
    smarts: 1,
    ...(fee > 0 ? { cash: -fee } : {}),
  });

  return {
    character: nextCharacter,
    succeeded: true,
    title: reachedBlackBelt
      ? `${template.name} Black Belt Earned!`
      : `${template.name}: ${beltLabel}`,
    summary,
    costPaid: fee,
  };
}

export function setCharacterDiet(
  character: CharacterProfile,
  dietId: DietId
): ActivityActionResult {
  if (!character.isAlive) {
    return blockedResult(character, 'Diet Plan', 'This life has already ended.');
  }
  if (isCurrentlyIncarcerated(character)) {
    return blockedResult(
      character,
      'Locked in Prison',
      'Diet selection is suspended while eating institutional prison meals.'
    );
  }
  if (character.age < DIET_MIN_AGE) {
    return blockedResult(
      character,
      'Diet Plan',
      `Custom diet planning unlocks at Age ${DIET_MIN_AGE}.`
    );
  }

  const template = getDietTemplate(dietId);
  const activities = getSanitizedActivitiesState(character);
  if (activities.diet === template.id) {
    return blockedResult(
      character,
      template.name,
      `You are already following the ${template.name}.`
    );
  }

  const nextActivities: PlayerActivitiesState = {
    ...activities,
    diet: template.id,
  };

  const effectiveAnnualCost = getEffectiveActivityFee(character, template.annualCost);
  const costText =
    template.annualCost === 0
      ? 'No annual surcharge.'
      : effectiveAnnualCost === 0
        ? `Covered by your parents under Age ${MINOR_FREE_CUTOFF_AGE}.`
        : `Costs $${effectiveAnnualCost.toLocaleString()}/year when you age up.`;

  const summary = `Switched your meal plan to ${template.name}. ${costText}`;
  const event = makeEvent(
    character,
    character.age,
    `Diet Changed: ${template.name}`,
    summary,
    'health'
  );

  return {
    character: {
      ...withUpdatedActivities(character, nextActivities),
      timeline: [...character.timeline, event],
    },
    succeeded: true,
    title: `Diet: ${template.name}`,
    summary,
    costPaid: 0,
  };
}

export function progressActivitiesForYear(
  character: CharacterProfile,
  nextAge: number,
  spendableCash: number,
  options: { isIncarceratedForYear: boolean }
): ActivitiesYearProgress {
  if (!character.isAlive || character.activities === undefined) {
    return {
      activities: character.activities,
      cashSpent: 0,
      healthDelta: 0,
      happinessDelta: 0,
      looksDelta: 0,
      karmaDelta: 0,
      events: [],
    };
  }

  const activities = getSanitizedActivitiesState(character);
  if (activities.dietLastProgressedAge === nextAge) {
    return {
      activities,
      cashSpent: 0,
      healthDelta: 0,
      happinessDelta: 0,
      looksDelta: 0,
      karmaDelta: 0,
      events: [],
    };
  }

  let nextActivities: PlayerActivitiesState = {
    ...activities,
    annualActionCounts: {},
    lastActionAge: nextAge,
    dietLastProgressedAge: nextAge,
  };

  if (options.isIncarceratedForYear) {
    return {
      activities: nextActivities,
      cashSpent: 0,
      healthDelta: 0,
      happinessDelta: 0,
      looksDelta: 0,
      karmaDelta: 0,
      events: [],
    };
  }

  let cashAvailable = Number.isFinite(spendableCash) ? Math.max(0, spendableCash) : 0;
  let cashSpent = 0;
  let healthDelta = 0;
  let happinessDelta = 0;
  let looksDelta = 0;
  let karmaDelta = 0;
  const events: LifeEvent[] = [];

  // 1. Annual Diet charge & stat deltas
  const dietTemplate = getDietTemplate(nextActivities.diet);
  if (dietTemplate.id !== 'standard') {
    const annualDietFee =
      nextAge < MINOR_FREE_CUTOFF_AGE ? 0 : dietTemplate.annualCost;

    if (annualDietFee > cashAvailable) {
      nextActivities = {
        ...nextActivities,
        diet: 'standard',
      };
      events.push(
        makeEvent(
          character,
          nextAge,
          'Diet Lapsed',
          `You could not afford the $${annualDietFee.toLocaleString()} annual cost of ${dietTemplate.name}, so you returned to a Standard Diet.`,
          'money'
        )
      );
    } else {
      cashAvailable -= annualDietFee;
      cashSpent += annualDietFee;
      healthDelta += dietTemplate.healthDelta;
      happinessDelta += dietTemplate.happinessDelta;
      looksDelta += dietTemplate.looksDelta;
      karmaDelta += dietTemplate.karmaDelta;
    }
  }

  // 2. Annual Gym Membership renewal (skip if already enrolled during nextAge)
  if (
    nextActivities.gymMembershipActive &&
    nextActivities.gymMembershipAge !== nextAge
  ) {
    if (nextAge < MINOR_FREE_CUTOFF_AGE) {
      nextActivities = {
        ...nextActivities,
        gymMembershipAge: nextAge,
      };
    } else if (cashAvailable >= GYM_MEMBERSHIP_ANNUAL_FEE) {
      cashAvailable -= GYM_MEMBERSHIP_ANNUAL_FEE;
      cashSpent += GYM_MEMBERSHIP_ANNUAL_FEE;
      nextActivities = {
        ...nextActivities,
        gymMembershipAge: nextAge,
      };
    } else {
      nextActivities = {
        ...nextActivities,
        gymMembershipActive: false,
      };
      events.push(
        makeEvent(
          character,
          nextAge,
          'Gym Pass Expired',
          `You did not have $${GYM_MEMBERSHIP_ANNUAL_FEE.toLocaleString()} in cash to renew your annual Gym Membership.`,
          'money'
        )
      );
    }
  }

  return {
    activities: nextActivities,
    cashSpent,
    healthDelta,
    happinessDelta,
    looksDelta,
    karmaDelta,
    events,
  };
}
