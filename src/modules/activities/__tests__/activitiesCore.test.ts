import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MenuScreen } from '../../../components/layout/MenuScreen';
import type { CharacterProfile } from '../../../types/game';
import { ageUpCharacter } from '../../aging/services/agingService';
import { createInitialCareerState } from '../../career/services/careerService';
import { createEmptyCrimeState } from '../../crime/services/crimeSelectors';
import { createInitialEducation } from '../../education/services/educationService';
import { ActivitiesScreen } from '../components/ActivitiesScreen';
import {
  getHighestMartialArtBelt,
  getRemainingActivityUses,
  getRemainingMartialArtsSessionsThisYear,
  getSanitizedActivitiesState,
  getSelfDefenseScore,
} from '../services/activitiesSelectors';
import {
  performMindBodyAction,
  progressActivitiesForYear,
  setCharacterDiet,
  toggleGymMembership,
  trainMartialArt,
} from '../services/activitiesService';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const age = overrides.age ?? 22;
  const occupation =
    overrides.occupation ?? (age < 18 ? 'Student' : 'Software Developer');

  return {
    id: 'char-activities-test',
    firstName: 'Jordan',
    lastName: 'Lee',
    gender: 'male',
    age,
    birthYear: 2026 - age,
    country: 'United States',
    flag: '🇺🇸',
    city: 'Seattle',
    occupation,
    parents: {
      father: {
        id: 'father-act-1',
        role: 'father',
        firstName: 'David',
        lastName: 'Lee',
        age: age + 28,
        occupation: 'Engineer',
        isAlive: true,
        relationship: 75,
        generosity: 60,
      },
      mother: {
        id: 'mother-act-1',
        role: 'mother',
        firstName: 'Grace',
        lastName: 'Lee',
        age: age + 26,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 80,
        generosity: 65,
      },
      wealth: 'modest',
    },
    cash: 2000,
    bankBalance: 10000,
    netWorth: 12000,
    isAlive: true,
    stats: {
      health: 60,
      happiness: 60,
      smarts: 60,
      looks: 60,
      karma: 60,
    },
    relationships: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function makeIncarceratedCharacter(age = 24): CharacterProfile {
  return makeCharacter({
    age,
    occupation: 'Incarcerated',
    crime: {
      ...createEmptyCrimeState(),
      prison: {
        facilityName: 'Oakridge State Prison',
        securityLevel: 'medium',
        chargeTitle: 'Burglary',
        yearsTotal: 3,
        yearsServed: 0,
        yearsRemaining: 3,
        behaviorScore: 60,
        paroleEligibleAtServed: 1,
        actionsTakenThisYear: 0,
        lastActionAge: age,
        lastProgressedAge: null,
      },
    },
  });
}

// 1. Age gates and parent sponsorship (< Age 16)
{
  const childTooYoung = makeCharacter({ age: 7, cash: 0, bankBalance: 0, netWorth: 0 });
  assert(
    !performMindBodyAction(childTooYoung, 'walk_jog').succeeded,
    'Walk/Jog must be locked before Age 8'
  );
  assert(
    !trainMartialArt(childTooYoung, 'karate').succeeded,
    'Martial Arts must be locked before Age 8'
  );
  assert(
    !setCharacterDiet(childTooYoung, 'mediterranean').succeeded,
    'Custom diet must be locked before Age 12'
  );

  const kidAge8 = makeCharacter({ age: 8, cash: 0, bankBalance: 0, netWorth: 0 });
  const walkRes = performMindBodyAction(kidAge8, 'walk_jog');
  assert(walkRes.succeeded && walkRes.costPaid === 0, 'Walk/Jog unlocks at Age 8 at $0');
  assert(
    walkRes.character.stats.health === 64 && walkRes.character.stats.happiness === 62,
    'Walk/Jog awards +4 Health and +2 Happiness'
  );
  assert(
    !performMindBodyAction(walkRes.character, 'walk_jog').succeeded,
    'Walk/Jog enforces 1x/year cap'
  );
  assert(
    getRemainingActivityUses(walkRes.character, 'walk_jog') === 0,
    'Remaining uses for Walk/Jog drops to 0 after completion'
  );

  const minorKarate = trainMartialArt(kidAge8, 'karate');
  assert(
    minorKarate.succeeded && minorKarate.costPaid === 0,
    'Martial arts at Age 8 are parent-sponsored ($0 wallet fee)'
  );
  assert(
    minorKarate.character.activities?.martialArts.karate?.beltRank === 1,
    'First martial arts lesson awards White Belt (rank 1)'
  );

  const teenAge12 = makeCharacter({ age: 12, cash: 0, bankBalance: 0, netWorth: 0 });
  assert(
    !performMindBodyAction(teenAge12, 'salon_haircut').succeeded,
    'Salon Haircut remains locked until Age 14'
  );
  const teenGym = performMindBodyAction(teenAge12, 'gym_workout');
  assert(
    teenGym.succeeded && teenGym.costPaid === 0,
    'Gym workout at Age 12 is parent-sponsored ($0)'
  );
  const teenDiet = setCharacterDiet(teenGym.character, 'mediterranean');
  assert(
    teenDiet.succeeded && teenDiet.character.activities?.diet === 'mediterranean',
    'Diet unlocks at Age 12'
  );

  const teenAge14 = makeCharacter({ age: 14, cash: 0 });
  const spaMinor = performMindBodyAction(teenAge14, 'spa_day');
  assert(
    spaMinor.succeeded && spaMinor.costPaid === 0,
    'Spa Day at Age 14 is parent-sponsored ($0)'
  );
}

// 2. Adult cash-only enforcement (never touches bankBalance)
{
  const brokeAdult = makeCharacter({ age: 25, cash: 40, bankBalance: 50000, netWorth: 50040 });
  const gymFail = performMindBodyAction(brokeAdult, 'gym_workout');
  assert(
    !gymFail.succeeded && gymFail.character.cash === 40 && gymFail.character.bankBalance === 50000,
    'Gym drop-in ($50) rejects when wallet cash is $40 despite $50k bankBalance'
  );

  const salonFail = performMindBodyAction(brokeAdult, 'salon_haircut');
  assert(!salonFail.succeeded, 'Salon ($60) rejects when wallet cash is $40');

  const therapyAdult = makeCharacter({ age: 25, cash: 300, bankBalance: 5000, netWorth: 5300 });
  const therapyRes = performMindBodyAction(therapyAdult, 'therapy_session');
  assert(
    therapyRes.succeeded &&
      therapyRes.costPaid === 200 &&
      therapyRes.character.cash === 100 &&
      therapyRes.character.bankBalance === 5000 &&
      therapyRes.character.stats.happiness === 72,
    'Therapy deducts $200 from wallet cash only and grants +12 Happiness'
  );
}

// 3. Gym 2x/year strain check & Membership idempotency
{
  const adult = makeCharacter({ age: 22, cash: 500 });
  const passRes = toggleGymMembership(adult, true);
  assert(
    passRes.succeeded && passRes.costPaid === 200 && passRes.character.cash === 300,
    'Gym membership deducts $200 on activation'
  );

  const workout1 = performMindBodyAction(passRes.character, 'gym_workout');
  assert(
    workout1.succeeded && workout1.costPaid === 0 && workout1.character.cash === 300,
    'Gym workout is $0 while Gym Pass is active'
  );

  // 2nd workout with deterministic strain roll (< 0.15)
  const strained2 = performMindBodyAction(workout1.character, 'gym_workout', () => 0.05);
  assert(
    strained2.succeeded &&
      strained2.character.stats.health === workout1.character.stats.health + 3,
    '2nd gym session in a year with rng=0.05 triggers mild strain (+6 - 3 = +3 net Health)'
  );
  assert(
    !performMindBodyAction(strained2.character, 'gym_workout').succeeded,
    '3rd gym workout in the same year is blocked'
  );

  // Without strain (rng=0.5)
  const clean2 = performMindBodyAction(workout1.character, 'gym_workout', () => 0.5);
  assert(
    clean2.succeeded &&
      clean2.character.stats.health === workout1.character.stats.health + 6,
    '2nd gym session with rng=0.5 grants full +6 Health'
  );

  // Toggling pass off and back on at same age does not double-charge
  const cancelled = toggleGymMembership(workout1.character, false);
  assert(
    cancelled.succeeded && !cancelled.character.activities?.gymMembershipActive,
    'Gym membership cancellation succeeds'
  );
  const reactivated = toggleGymMembership(cancelled.character, true);
  assert(
    reactivated.succeeded &&
      reactivated.costPaid === 0 &&
      reactivated.character.cash === workout1.character.cash,
    'Re-enrolling within the same age does not double-charge $200'
  );
}

// 4. Martial Arts 7-belt progression, annual caps, and Self-Defense score
{
  let fighter = makeCharacter({ age: 18, cash: 5000 });
  for (let i = 0; i < 7; i++) {
    const trainRes = trainMartialArt(fighter, 'karate');
    assert(trainRes.succeeded && trainRes.costPaid === 120, `Karate lesson ${i + 1} succeeds`);
    fighter = {
      ...trainRes.character,
      age: trainRes.character.age + 1,
    };
  }
  const highestAfterKarate = getHighestMartialArtBelt(fighter);
  assert(
    highestAfterKarate.rank === 7 && highestAfterKarate.label === 'Black Belt',
    'Karate reaches Black Belt (rank 7) after 7 lessons'
  );
  assert(
    getSelfDefenseScore(fighter) === 84,
    '1 Black Belt gives permanent self-defense score of 84'
  );
  assert(
    !trainMartialArt(fighter, 'karate').succeeded,
    'Training a discipline already at Black Belt is blocked'
  );

  // Train 4 additional disciplines to reach 100 self-defense (2/yr max cap check included)
  const j1 = trainMartialArt(fighter, 'judo');
  const j2 = trainMartialArt(j1.character, 'jiu_jitsu');
  assert(j1.succeeded && j2.succeeded, 'Can train 2 distinct martial arts in one year');
  assert(
    getRemainingMartialArtsSessionsThisYear(j2.character) === 0 &&
      !trainMartialArt(j2.character, 'muay_thai').succeeded,
    'Cannot train a 3rd martial arts discipline in the same year'
  );

  const nextYear = { ...j2.character, age: j2.character.age + 1 };
  const m1 = trainMartialArt(nextYear, 'muay_thai');
  const t1 = trainMartialArt(m1.character, 'taekwondo');
  assert(m1.succeeded && t1.succeeded, 'Remaining 2 disciplines succeed in following year');
  assert(
    getSelfDefenseScore(t1.character) === 100,
    'Black Belt (84) + 4 extra disciplines (+16) caps Self-Defense score at 100'
  );
}

// 5. Aging integration, untouched baseline preservation, diet fallback, idempotency, prison pause
{
  // Untouched character keeps activities undefined across ageUpCharacter
  const untouched = makeCharacter({ age: 20 });
  const agedUntouched = ageUpCharacter(untouched);
  assert(
    agedUntouched.activities === undefined,
    'Untouched character activities remains undefined across ageUpCharacter'
  );

  // Active Mediterranean diet + Gym Pass on ageUpCharacter
  let activeChar = makeCharacter({ age: 25, cash: 2000, bankBalance: 10000 });
  activeChar = setCharacterDiet(activeChar, 'mediterranean').character;
  activeChar = performMindBodyAction(activeChar, 'walk_jog').character;
  assert(
    getRemainingActivityUses(activeChar, 'walk_jog') === 0,
    'Walk/Jog used once before Age Up'
  );

  const cashBefore = activeChar.cash;
  const agedActive = ageUpCharacter(activeChar);
  assert(
    getRemainingActivityUses(agedActive, 'walk_jog') === 1,
    'Annual activity cooldowns reset on Age Up'
  );
  assert(
    agedActive.activities?.diet === 'mediterranean' &&
      agedActive.activities.dietLastProgressedAge === 26,
    'Diet remains Mediterranean and stamps dietLastProgressedAge on Age Up'
  );
  assert(
    agedActive.bankBalance === 10000,
    'Diet annual cost never modifies bankBalance'
  );
  // Check exact diet delta impact indirectly by checking cash was reduced by at least 450 vs base or calling progressActivitiesForYear directly
  assert(agedActive.cash <= cashBefore + 5000, 'Cash updated cleanly on Age Up');

  // Direct idempotency check
  const directCheck = progressActivitiesForYear(activeChar, 26, 1000, {
    isIncarceratedForYear: false,
  });
  assert(
    directCheck.cashSpent === 450 &&
      directCheck.healthDelta === 4 &&
      directCheck.happinessDelta === 1,
    'progressActivitiesForYear charges $450 and applies +4 Health / +1 Happiness for Mediterranean diet'
  );
  const alreadyProgressed = {
    ...activeChar,
    activities: directCheck.activities,
  };
  const duplicateYear = progressActivitiesForYear(alreadyProgressed, 26, 1000, {
    isIncarceratedForYear: false,
  });
  assert(
    duplicateYear.cashSpent === 0 && duplicateYear.healthDelta === 0,
    'progressActivitiesForYear is strictly idempotent for same nextAge'
  );

  // Insufficient cash auto-reverts diet to standard
  const lowCashDiet = setCharacterDiet(
    makeCharacter({ age: 25, cash: 100, bankBalance: 50000 }),
    'mediterranean'
  ).character;
  const lapsed = progressActivitiesForYear(lowCashDiet, 26, 100, {
    isIncarceratedForYear: false,
  });
  assert(
    lapsed.activities?.diet === 'standard' &&
      lapsed.cashSpent === 0 &&
      lapsed.healthDelta === 0 &&
      lapsed.events.some((e) => e.title === 'Diet Lapsed'),
    'Mediterranean diet auto-reverts to Standard with Diet Lapsed event when wallet cash < $450'
  );

  // Prison pauses Diet & Gym billing while preserving state
  let prisonerWithPlan = setCharacterDiet(
    makeCharacter({ age: 25, cash: 2000 }),
    'high_protein'
  ).character;
  prisonerWithPlan = toggleGymMembership(prisonerWithPlan, true).character;
  const pausedPrisonYear = progressActivitiesForYear(prisonerWithPlan, 26, 2000, {
    isIncarceratedForYear: true,
  });
  assert(
    pausedPrisonYear.cashSpent === 0 &&
      pausedPrisonYear.healthDelta === 0 &&
      pausedPrisonYear.activities?.diet === 'high_protein' &&
      pausedPrisonYear.activities?.gymMembershipActive === true,
    'Prison year suspends Diet & Gym billing/deltas while preserving settings'
  );
}

// 6. Incarceration lockouts & SSR UI checks
{
  const prisoner = makeIncarceratedCharacter(24);
  assert(
    !performMindBodyAction(prisoner, 'walk_jog').succeeded &&
      !toggleGymMembership(prisoner, true).succeeded &&
      !trainMartialArt(prisoner, 'karate').succeeded &&
      !setCharacterDiet(prisoner, 'mediterranean').succeeded,
    'All Mind & Body service functions lock cleanly while incarcerated'
  );

  const menuYoungHtml = renderToStaticMarkup(
    React.createElement(MenuScreen, {
      character: makeCharacter({ age: 6 }),
      onOpenRelationships: () => {},
    })
  );
  assert(
    menuYoungHtml.includes('Everyday Activities') && menuYoungHtml.includes('Age 8'),
    'MenuScreen renders Everyday Activities locked with Age 8 badge below Age 8'
  );

  const menuPrisonHtml = renderToStaticMarkup(
    React.createElement(MenuScreen, {
      character: prisoner,
      onOpenRelationships: () => {},
    })
  );
  assert(
    menuPrisonHtml.includes('Everyday Activities') && menuPrisonHtml.includes('In Prison'),
    'MenuScreen renders Everyday Activities locked with In Prison badge while incarcerated'
  );

  const directoryHtml = renderToStaticMarkup(
    React.createElement(ActivitiesScreen, {
      character: makeCharacter({ age: 24, cash: 1200 }),
      onUpdateCharacter: () => {},
      onBackToMenu: () => {},
    })
  );
  assert(
    directoryHtml.includes('Everyday Activities') &&
      directoryHtml.includes('Mind &amp; Body') &&
      directoryHtml.includes('Cosmetic Surgery') &&
      directoryHtml.includes('Licenses &amp; Travel') &&
      directoryHtml.includes('Nightlife &amp; Legal') &&
      directoryHtml.includes('Back to Menu'),
    'ActivitiesScreen default SSR renders the 4-row mobile Everyday Activities directory'
  );

  const screenAdultHtml = renderToStaticMarkup(
    React.createElement(ActivitiesScreen, {
      character: makeCharacter({ age: 24, cash: 1200 }),
      onUpdateCharacter: () => {},
      onBackToMenu: () => {},
      initialTab: 'mind_body',
    })
  );
  assert(
    screenAdultHtml.includes('Back to Activities') &&
      screenAdultHtml.includes('Mind &amp; Body Routines') &&
      screenAdultHtml.includes('Martial Arts Dojo') &&
      screenAdultHtml.includes('Diet &amp; Nutrition') &&
      screenAdultHtml.includes('Mediterranean'),
    'ActivitiesScreen mind_body drill-down renders Back to Activities, routines, dojo, and diets cleanly'
  );

  const screenPrisonHtml = renderToStaticMarkup(
    React.createElement(ActivitiesScreen, {
      character: prisoner,
      onUpdateCharacter: () => {},
      onBackToMenu: () => {},
    })
  );
  assert(
    screenPrisonHtml.includes('Locked While In Prison'),
    'ActivitiesScreen SSR renders prison lock card when incarcerated'
  );

  // Sanitization check for malformed save
  const sanitized = getSanitizedActivitiesState({
    activities: {
      diet: 'invalid_diet' as never,
      martialArts: { karate: { discipline: 'karate', beltRank: 99 as never, lastTrainedAge: 20 } },
    } as never,
  });
  assert(
    sanitized.diet === 'standard' && sanitized.martialArts.karate?.beltRank === 7,
    'getSanitizedActivitiesState clamps invalid belt ranks and falls back invalid diets cleanly'
  );
}

// 7. Actual appliedEffects telemetry on gym strain (#7) & heart death attribution with diet delta (#5)
{
  const gymBase = makeCharacter({ age: 23, cash: 500, stats: { health: 60, happiness: 70, smarts: 70, looks: 70, karma: 80 } });
  const firstSession = performMindBodyAction(gymBase, 'gym_workout');
  assert(
    firstSession.succeeded && firstSession.appliedEffects?.health === 6,
    'First gym session reports exact appliedEffects.health === 6'
  );
  const strainedSecond = performMindBodyAction(firstSession.character, 'gym_workout', () => 0);
  assert(
    strainedSecond.succeeded && strainedSecond.appliedEffects?.health === 3,
    'Strained second gym session reports actual +3 Health (not static +6) on appliedEffects (#7)'
  );

  const crashDietHeartChar = setCharacterDiet(
    makeCharacter({
      age: 25,
      cash: 250,
      stats: { health: 4, happiness: 80, smarts: 70, looks: 70, karma: 80 },
      healthcare: {
        conditions: [
          {
            id: 'heart-test-non-decisive',
            catalogId: 'heart',
            status: 'known',
            acquiredAtAge: 24,
            symptom: 'Chest tightness',
            diagnosedAtAge: 24,
            untreatedYears: 1,
            enrolled: false,
            procedureCompleted: false,
          },
        ],
        visits: [],
      },
    }),
    'crash_diet'
  ).character;
  const diedCombined = ageUpCharacter(crashDietHeartChar);
  assert(
    !diedCombined.isAlive && diedCombined.causeOfDeath !== 'A tired heart',
    'When diet health loss already drops health to 0, death is not solely attributed to A tired heart (#5)'
  );

  const decisiveHeartChar = {
    ...crashDietHeartChar,
    stats: { ...crashDietHeartChar.stats, health: 12 },
    healthcare: {
      conditions: [
        {
          id: 'heart-test-decisive',
          catalogId: 'heart',
          status: 'known' as const,
          acquiredAtAge: 24,
          symptom: 'Chest tightness',
          diagnosedAtAge: 24,
          untreatedYears: 1,
          enrolled: false,
          procedureCompleted: false,
        },
      ],
      visits: [],
    },
  };
  const diedFromHeart = ageUpCharacter(decisiveHeartChar);
  assert(
    !diedFromHeart.isAlive && diedFromHeart.causeOfDeath === 'A tired heart',
    'When character survives diet loss (>0) and heart condition drops health to 0, causeOfDeath is A tired heart (#5)'
  );

  const crashDietTippedHeartChar = {
    ...crashDietHeartChar,
    stats: { ...crashDietHeartChar.stats, health: 18 },
    healthcare: {
      conditions: [
        {
          id: 'heart-test-crash-tipped',
          catalogId: 'heart',
          status: 'known' as const,
          acquiredAtAge: 24,
          symptom: 'Chest tightness',
          diagnosedAtAge: 24,
          untreatedYears: 1,
          enrolled: false,
          procedureCompleted: false,
        },
      ],
      visits: [],
    },
  };
  const diedWithCrashPlusHeart = ageUpCharacter(crashDietTippedHeartChar);
  assert(
    !diedWithCrashPlusHeart.isAlive && diedWithCrashPlusHeart.causeOfDeath === 'A tired heart',
    'When crash diet leaves positive health (>0) and heart drops health to <=0, causeOfDeath is still A tired heart'
  );

  const medDietHeartSurvivor = setCharacterDiet(
    makeCharacter({
      age: 25,
      cash: 500,
      stats: { health: 14, happiness: 80, smarts: 70, looks: 70, karma: 80 },
      healthcare: {
        conditions: [
          {
            id: 'heart-test-med-saved',
            catalogId: 'heart',
            status: 'known',
            acquiredAtAge: 24,
            symptom: 'Chest tightness',
            diagnosedAtAge: 24,
            untreatedYears: 1,
            enrolled: false,
            procedureCompleted: false,
          },
        ],
        visits: [],
      },
    }),
    'mediterranean'
  ).character;
  const survivedHeart = ageUpCharacter(medDietHeartSurvivor);
  assert(
    survivedHeart.isAlive && survivedHeart.causeOfDeath === undefined,
    'Living character saved by Mediterranean diet (+4 Health) never receives a stale causeOfDeath'
  );
}

console.log('activitiesCore.test.ts: All assertions passed.');
