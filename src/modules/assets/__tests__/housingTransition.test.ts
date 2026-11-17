import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CharacterProfile } from '../../../types/game';
import { ageUpCharacter } from '../../aging/services/agingService';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { MenuScreen } from '../../../components/layout/MenuScreen';
import { HousingNoticeModal } from '../components/HousingNoticeModal';
import { HousingStatusBanner } from '../components/HousingStatusBanner';
import { PropertyDetailModal } from '../components/PropertyDetailModal';
import { getPropertyListing } from '../data/propertyCatalog';
import { purchaseProperty, sellProperty } from '../services/assetService';
import {
  HOMELESSNESS_DEATH_CAUSE,
  createInitialHousingState,
  deriveHousingStatus,
  evaluateHousingForYear,
  getHousingStatus,
  getPendingHousingNotice,
  hydrateHousingStateOnLoad,
  markHousingNoticeAcknowledged,
  resolvePostAgeUpModalStep,
} from '../services/housingService';

function assert(condition: boolean, message = 'Assertion failed'): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

assert.equal = function assertEqual<T>(actual: T, expected: T, message = ''): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed${message ? `: ${message}` : ''} (expected ${String(expected)}, got ${String(actual)})`
    );
  }
};

assert.notEqual = function assertNotEqual<T>(actual: T, unexpected: T, message = ''): void {
  if (actual === unexpected) {
    throw new Error(
      `Assertion failed${message ? `: ${message}` : ''} (did not expect ${String(unexpected)})`
    );
  }
};

function buildCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const base: CharacterProfile = {
    id: 'housing-test-char',
    firstName: 'Maya',
    lastName: 'Lin',
    gender: 'female',
    age: 17,
    birthYear: 2005,
    country: 'United States',
    flag: '🇺🇸',
    city: 'Austin',
    occupation: 'High School Student',
    cash: 0,
    bankBalance: 0,
    netWorth: 0,
    isAlive: true,
    stats: {
      health: 95,
      happiness: 85,
      smarts: 70,
      looks: 70,
      karma: 100,
    },
    parents: {
      father: {
        id: 'father-1',
        role: 'father',
        firstName: 'David',
        lastName: 'Lin',
        age: 45,
        occupation: 'Technician',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      mother: {
        id: 'mother-1',
        role: 'mother',
        firstName: 'Grace',
        lastName: 'Lin',
        age: 44,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 85,
        generosity: 65,
      },
      wealth: 'comfortable',
    },
    siblings: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    assets: { properties: [] },
    housing: createInitialHousingState(),
    relationships: [],
    seenEventIds: [],
    timeline: [],
  };

  return {
    ...base,
    ...overrides,
    stats: { ...base.stats, ...(overrides.stats ?? {}) },
  };
}

function ownedAustinStudio(id = 'home-1') {
  return {
    id,
    catalogId: 'studio_austin_loft',
    type: 'studio' as const,
    name: 'Austin Loft Studio',
    city: 'Austin',
    purchasePrice: 62000,
    purchaseAge: 20,
    marketValue: 62000,
    mortgage: null,
  };
}

// 1. Canonical arrangement & derived status (no duplicate persisted status)
{
  const initial = createInitialHousingState();
  assert(!('status' in initial), 'PlayerHousingState must not store duplicate status field');
  assert.equal(deriveHousingStatus('with_parents'), 'with_parents');
  assert.equal(deriveHousingStatus('owned_property'), 'housed');
  assert.equal(deriveHousingStatus('rented_accommodation'), 'housed');
  assert.equal(deriveHousingStatus('university_accommodation'), 'housed');
  assert.equal(deriveHousingStatus('unhoused'), 'unhoused');
}

// 2–5. Complete Age 16 -> 24 lifecycle: notices, grace period, move-out, escalating drain
{
  let char = buildCharacter({ age: 16 });
  char = ageUpCharacter(char); // 17
  assert.equal(char.housing?.arrangement, 'with_parents');
  assert.equal(getPendingHousingNotice(char), null);
  assert.equal(char.housing?.yearsUnhoused, 0);

  // Age 17 -> 18: queues Age 18 independence modal once, zero penalty
  char = ageUpCharacter(char); // 18
  assert.equal(char.age, 18);
  assert.equal(char.housing?.arrangement, 'with_parents');
  assert.equal(getPendingHousingNotice(char), 'age18_independence');
  assert.equal(char.housing?.age18PromptShown, true);
  assert(
    char.timeline.some((evt) => evt.age === 18 && evt.title === 'Living at Home — Adulthood Notice'),
    'Age 18 timeline notice should be logged'
  );

  // Acknowledge Age 18 modal
  char = markHousingNoticeAcknowledged(char);
  assert.equal(getPendingHousingNotice(char), null);

  // Age 18 -> 19: stays with_parents, logs reminder only, no modal
  char = ageUpCharacter(char); // 19
  assert.equal(char.housing?.arrangement, 'with_parents');
  assert.equal(getPendingHousingNotice(char), null);
  assert.equal(char.housing?.age19ReminderLogged, true);
  assert(
    char.timeline.some((evt) => evt.age === 19 && evt.title === 'Two Years Left to Find Housing'),
    'Age 19 timeline reminder should be logged'
  );

  // Age 19 -> 20: queues Age 20 final warning once, does not re-trigger Age 18
  char = ageUpCharacter(char); // 20
  assert.equal(char.housing?.arrangement, 'with_parents');
  assert.equal(getPendingHousingNotice(char), 'age20_final_warning');
  assert.equal(char.housing?.age20WarningShown, true);
  assert(
    char.timeline.some((evt) => evt.age === 20 && evt.title === 'Final Year at Home'),
    'Age 20 timeline warning should be logged'
  );
  char = markHousingNoticeAcknowledged(char);

  // Exact escalating penalties verified via evaluateHousingForYear
  const y1 = evaluateHousingForYear(char, 21);
  assert.equal(y1.housing.arrangement, 'unhoused');
  assert.equal(y1.housing.movedOutAtAge, 21);
  assert.equal(y1.housing.yearsUnhoused, 1);
  assert.equal(y1.housing.pendingNotice, 'age21_moved_out');
  assert.equal(y1.healthDelta, -10);
  assert.equal(y1.happinessDelta, -15);

  const y2 = evaluateHousingForYear(
    { ...char, age: 21, housing: { ...y1.housing, pendingNotice: null } },
    22
  );
  assert.equal(y2.housing.yearsUnhoused, 2);
  assert.equal(y2.housing.pendingNotice, null);
  assert.equal(y2.healthDelta, -12);
  assert.equal(y2.happinessDelta, -18);

  const y3 = evaluateHousingForYear({ ...char, age: 22, housing: y2.housing }, 23);
  assert.equal(y3.housing.yearsUnhoused, 3);
  assert.equal(y3.healthDelta, -15);
  assert.equal(y3.happinessDelta, -20);

  const y4 = evaluateHousingForYear({ ...char, age: 23, housing: y3.housing }, 24);
  assert.equal(y4.housing.yearsUnhoused, 4);
  assert.equal(y4.healthDelta, -15);
  assert.equal(y4.happinessDelta, -20);

  // Full ageUpCharacter 20 -> 21 integration + non-double-counting check
  const before21Health = char.stats.health;
  char = ageUpCharacter(char); // 21
  assert.equal(char.housing?.arrangement, 'unhoused');
  assert.equal(char.housing?.yearsUnhoused, 1);
  assert.equal(getPendingHousingNotice(char), 'age21_moved_out');
  assert.equal(char.stats.health, Math.max(0, Math.min(100, char.stats.health)));
  assert(
    before21Health - char.stats.health <= 11 && before21Health - char.stats.health >= 9,
    `Expected single Year 1 health loss (-10 ±1 age drift), got ${before21Health - char.stats.health}`
  );
}

// 6. Healthcare externalHealthDelta non-double-counting proof
{
  const unhousedWithCold = buildCharacter({
    age: 21,
    stats: { health: 90, happiness: 90, smarts: 70, looks: 70, karma: 100 },
    housing: {
      arrangement: 'unhoused',
      moveOutDeadlineAge: 21,
      yearsUnhoused: 1,
      movedOutAtAge: 21,
      lastProgressedAge: 21,
      age18PromptShown: true,
      age19ReminderLogged: true,
      age20WarningShown: true,
      movedOutPromptShown: true,
      pendingNotice: null,
    },
    healthcare: {
      conditions: [
        {
          id: 'cold-1',
          catalogId: 'cold',
          status: 'known',
          acquiredAtAge: 21,
          diagnosedAtAge: 21,
          symptom: 'Your throat has been sore all week.',
          untreatedYears: 0,
        },
      ],
      visits: [],
    },
  });

  const aged = ageUpCharacter(unhousedWithCold);
  // Year 2 housing (-12) + untreated cold (-6) + age<45 drift (-1..+1) = -17 to -19 (NOT -29..-31!)
  const totalDrop = 90 - aged.stats.health;
  assert(
    totalDrop >= 17 && totalDrop <= 19,
    `Expected combined health drop of 17-19 (single housing -12 + cold -6 + drift), got ${totalDrop}`
  );
}

// 7. Property purchase while unhoused resets streak, stops future drain, does NOT heal past loss
{
  const unhoused = buildCharacter({
    age: 22,
    cash: 25000,
    stats: { health: 60, happiness: 50, smarts: 70, looks: 70, karma: 100 },
    housing: {
      arrangement: 'unhoused',
      moveOutDeadlineAge: 21,
      yearsUnhoused: 2,
      movedOutAtAge: 21,
      lastProgressedAge: 22,
      age18PromptShown: true,
      age19ReminderLogged: true,
      age20WarningShown: true,
      movedOutPromptShown: true,
      pendingNotice: 'age21_moved_out',
    },
  });

  const bought = purchaseProperty(unhoused, 'studio_austin_loft', 'mortgage');
  assert.equal(bought.ok, true);
  assert.equal(bought.character.housing?.arrangement, 'owned_property');
  assert.equal(getHousingStatus(bought.character), 'housed');
  assert.equal(bought.character.housing?.yearsUnhoused, 0);
  assert.equal(getPendingHousingNotice(bought.character), null);
  assert.equal(bought.character.stats.health, 60, 'Buying home must not auto-restore lost health');
  assert.equal(
    bought.character.stats.happiness,
    50,
    'Buying home must not auto-restore lost happiness'
  );

  const agedAfterBuy = ageUpCharacter(bought.character);
  assert.equal(agedAfterBuy.housing?.arrangement, 'owned_property');
  assert.equal(agedAfterBuy.housing?.yearsUnhoused, 0);
  assert.equal(
    agedAfterBuy.timeline.some((e) => e.title === 'Living Unhoused' && e.age === 23),
    false
  );
}

// 8. Selling properties: after 21, retaining 1 of 2, and before 21
{
  // 8a. Sell only home at 22 -> unhoused, drain resumes next Age Up
  const singleHomeAdult = buildCharacter({
    age: 22,
    cash: 10000,
    assets: { properties: [ownedAustinStudio('home-a')] },
    housing: {
      arrangement: 'owned_property',
      moveOutDeadlineAge: 21,
      yearsUnhoused: 0,
      lastProgressedAge: 22,
      age18PromptShown: true,
      age19ReminderLogged: true,
      age20WarningShown: true,
      movedOutPromptShown: true,
      pendingNotice: null,
    },
  });
  const soldLast = sellProperty(singleHomeAdult, 'home-a');
  assert.equal(soldLast.ok, true);
  assert.equal(soldLast.character.housing?.arrangement, 'unhoused');
  assert.equal(soldLast.character.housing?.yearsUnhoused, 0);
  const nextYear = evaluateHousingForYear(soldLast.character, 23);
  assert.equal(nextYear.housing.yearsUnhoused, 1);
  assert.equal(nextYear.healthDelta, -10);
  assert.equal(nextYear.happinessDelta, -15);

  // 8b. Sell one of two properties -> remains housed
  const twoHomes = buildCharacter({
    age: 22,
    assets: { properties: [ownedAustinStudio('home-a'), ownedAustinStudio('home-b')] },
    housing: {
      arrangement: 'owned_property',
      moveOutDeadlineAge: 21,
      yearsUnhoused: 0,
      age18PromptShown: true,
      age19ReminderLogged: true,
      age20WarningShown: true,
      movedOutPromptShown: true,
      pendingNotice: null,
    },
  });
  const soldOneOfTwo = sellProperty(twoHomes, 'home-a');
  assert.equal(soldOneOfTwo.ok, true);
  assert.equal(soldOneOfTwo.character.housing?.arrangement, 'owned_property');
  assert.equal(getHousingStatus(soldOneOfTwo.character), 'housed');

  // 8c. Sell only home before deadline (age 19, never moved out) -> returns to with_parents
  const teenBuyer = buildCharacter({
    age: 19,
    assets: { properties: [ownedAustinStudio('home-19')] },
    housing: {
      arrangement: 'owned_property',
      moveOutDeadlineAge: 21,
      yearsUnhoused: 0,
      age18PromptShown: true,
      age19ReminderLogged: true,
      age20WarningShown: false,
      movedOutPromptShown: false,
      pendingNotice: null,
    },
  });
  const soldEarly = sellProperty(teenBuyer, 'home-19');
  assert.equal(soldEarly.ok, true);
  assert.equal(soldEarly.character.housing?.arrangement, 'with_parents');
  assert.equal(getHousingStatus(soldEarly.character), 'with_parents');
}

// 9. Prison exemption + exact Age 21 release-turn deferral -> Age 22 move-out
{
  const prisonerTurning21 = buildCharacter({
    age: 20,
    occupation: 'Incarcerated',
    stats: { health: 90, happiness: 80, smarts: 70, looks: 70, karma: 50 },
    housing: {
      arrangement: 'with_parents',
      moveOutDeadlineAge: 21,
      yearsUnhoused: 0,
      lastProgressedAge: 20,
      age18PromptShown: true,
      age19ReminderLogged: true,
      age20WarningShown: true,
      movedOutPromptShown: false,
      pendingNotice: null,
    },
    crime: {
      policeHeat: 10,
      notoriety: 20,
      unpaidFines: 0,
      attemptsThisYear: 0,
      attemptCountLifetime: 1,
      lastAttemptAge: 19,
      lastProgressedAge: 20,
      records: [],
      pendingCase: null,
      probation: null,
      prison: {
        facilityName: 'Oakridge State Prison',
        securityLevel: 'medium',
        chargeTitle: 'Burglary',
        yearsTotal: 2,
        yearsServed: 1,
        yearsRemaining: 1,
        behaviorScore: 75,
        paroleEligibleAtServed: 1,
        actionsTakenThisYear: 0,
        lastActionAge: null,
        lastProgressedAge: 20,
      },
    },
  });

  // Turns 21 and is released on the same Age Up
  const releasedAt21 = ageUpCharacter(prisonerTurning21);
  assert.equal(releasedAt21.age, 21);
  assert.equal(releasedAt21.crime?.prison, null, 'Prisoner should be released at 21');
  assert.equal(
    releasedAt21.housing?.arrangement,
    'with_parents',
    'Release turn spent behind bars must defer move-out transition'
  );
  assert.equal(releasedAt21.housing?.yearsUnhoused, 0);
  assert.equal(getPendingHousingNotice(releasedAt21), null);
  assert.equal(
    releasedAt21.timeline.some((e) => e.title === 'Asked to Move Out'),
    false
  );

  // Next eligible Age Up after release (21 -> 22) triggers move-out & Year 1 penalty
  const firstYearFree = evaluateHousingForYear(releasedAt21, 22, { isIncarceratedForYear: false });
  assert.equal(firstYearFree.housing.arrangement, 'unhoused');
  assert.equal(firstYearFree.housing.movedOutAtAge, 22);
  assert.equal(firstYearFree.housing.yearsUnhoused, 1);
  assert.equal(firstYearFree.housing.pendingNotice, 'age21_moved_out');
  assert.equal(firstYearFree.healthDelta, -10);
  assert.equal(firstYearFree.happinessDelta, -15);

  // Already-unhoused prisoner pauses yearsUnhoused during prison and increments after release
  const unhousedInmate = {
    ...prisonerTurning21,
    age: 22,
    housing: {
      arrangement: 'unhoused' as const,
      moveOutDeadlineAge: 21,
      yearsUnhoused: 1,
      movedOutAtAge: 21,
      lastProgressedAge: 22,
      age18PromptShown: true,
      age19ReminderLogged: true,
      age20WarningShown: true,
      movedOutPromptShown: true,
      pendingNotice: null,
    },
  };
  const duringPrison = evaluateHousingForYear(unhousedInmate, 23, { isIncarceratedForYear: true });
  assert.equal(duringPrison.housing.yearsUnhoused, 1);
  assert.equal(duringPrison.healthDelta, 0);
  assert.equal(duringPrison.happinessDelta, 0);
  const afterPrison = evaluateHousingForYear(
    { ...unhousedInmate, age: 23, housing: duringPrison.housing },
    24,
    { isIncarceratedForYear: false }
  );
  assert.equal(afterPrison.housing.yearsUnhoused, 2);
  assert.equal(afterPrison.healthDelta, -12);
  assert.equal(afterPrison.happinessDelta, -18);
}

// 10. Legacy saves (housing === undefined), Age 18 load hydration & headless fallback, and assets === undefined safety
{
  const legacy18 = buildCharacter({ age: 18 });
  delete (legacy18 as { housing?: unknown }).housing;
  delete (legacy18 as { assets?: unknown }).assets;

  // 10a. Load hydration path
  const hydrated18 = hydrateHousingStateOnLoad(legacy18);
  assert.equal(hydrated18.housing?.arrangement, 'with_parents');
  assert.equal(getPendingHousingNotice(hydrated18), 'age18_independence');
  assert.equal(hydrated18.housing?.age18PromptShown, true);
  assert.equal(hydrated18.assets, undefined, 'Must not fabricate assets');
  const acked18 = markHousingNoticeAcknowledged(hydrated18);
  const agedTo19 = ageUpCharacter(acked18);
  assert.equal(getPendingHousingNotice(agedTo19), null, 'Notice must not repeat after acknowledgment');

  // 10b. Direct headless Age Up from legacy Age 18 -> 19 still delivers notice once
  const directAged18To19 = ageUpCharacter(legacy18);
  assert.equal(getPendingHousingNotice(directAged18To19), 'age18_independence');
  assert.equal(directAged18To19.housing?.age18PromptShown, true);
  assert.equal(directAged18To19.assets, undefined, 'Age Up must not allocate assets when undefined');

  // 10c. Legacy Adult aged 25 with 0 homes gets 3 penalty-free grace years (deadline = 29)
  const legacy25 = buildCharacter({ age: 25 });
  delete (legacy25 as { housing?: unknown }).housing;
  const aged26 = ageUpCharacter(legacy25);
  assert.equal(aged26.housing?.arrangement, 'with_parents');
  assert.equal(aged26.housing?.moveOutDeadlineAge, 29);
  assert.equal(aged26.housing?.yearsUnhoused, 0);
  assert.equal(getPendingHousingNotice(aged26), null);

  // 10d. Legacy owner aged 25 immediately recognizes owned_property
  const legacyOwner = buildCharacter({
    age: 25,
    assets: { properties: [ownedAustinStudio('legacy-home')] },
  });
  delete (legacyOwner as { housing?: unknown }).housing;
  const agedOwner = ageUpCharacter(legacyOwner);
  assert.equal(agedOwner.housing?.arrangement, 'owned_property');
  assert.equal(agedOwner.housing?.yearsUnhoused, 0);
  assert.equal(getPendingHousingNotice(agedOwner), null);
}

// 11. Idempotency & JSON persistence round-trip
{
  const c = buildCharacter({ age: 20, housing: createInitialHousingState() });
  const first = evaluateHousingForYear(c, 21);
  const second = evaluateHousingForYear({ ...c, age: 21, housing: first.housing }, 21);
  assert.equal(second.healthDelta, 0);
  assert.equal(second.happinessDelta, 0);
  assert.equal(second.events.length, 0);
  assert.equal(second.housing.yearsUnhoused, 1);

  const persisted = JSON.parse(
    JSON.stringify({ ...c, age: 21, housing: { ...first.housing, pendingNotice: null } })
  ) as CharacterProfile;
  assert.equal(getPendingHousingNotice(persisted), null);
  assert.equal(persisted.housing?.movedOutPromptShown, true);
  const year2AfterReload = evaluateHousingForYear(persisted, 22);
  assert.equal(year2AfterReload.housing.pendingNotice, null);
  assert.equal(year2AfterReload.housing.yearsUnhoused, 2);
}

// 12. Canonical Death Attribution Precedence
{
  // 12a. Homelessness decisive when survived non-housing losses
  const frailUnhoused = buildCharacter({
    age: 21,
    stats: { health: 6, happiness: 50, smarts: 70, looks: 70, karma: 100 },
    housing: {
      arrangement: 'unhoused',
      moveOutDeadlineAge: 21,
      yearsUnhoused: 1,
      movedOutAtAge: 21,
      lastProgressedAge: 21,
      age18PromptShown: true,
      age19ReminderLogged: true,
      age20WarningShown: true,
      movedOutPromptShown: true,
      pendingNotice: null,
    },
  });
  const diedFromExposure = ageUpCharacter(frailUnhoused);
  assert.equal(diedFromExposure.isAlive, false);
  assert.equal(diedFromExposure.causeOfDeath, HOMELESSNESS_DEATH_CAUSE);

  // 12b. Simultaneous lethal untreated condition where non-housing losses are already fatal
  const lethalConditionToo = buildCharacter({
    age: 21,
    stats: { health: 6, happiness: 50, smarts: 70, looks: 70, karma: 100 },
    housing: frailUnhoused.housing,
    healthcare: {
      conditions: [
        {
          id: 'chest-1',
          catalogId: 'chest',
          status: 'known',
          acquiredAtAge: 21,
          diagnosedAtAge: 21,
          symptom: 'A cough has settled in your chest.',
          untreatedYears: 0,
        },
      ],
      visits: [],
    },
  });
  const diedFromConditionAndExposure = ageUpCharacter(lethalConditionToo);
  assert.equal(diedFromConditionAndExposure.isAlive, false);
  assert.notEqual(
    diedFromConditionAndExposure.causeOfDeath,
    HOMELESSNESS_DEATH_CAUSE,
    'Non-decisive homelessness must not override already-fatal non-housing causes'
  );

  // 12c. Heart condition alone pushes combined health below 0 -> preserves "A tired heart"
  const heartAndHousing = buildCharacter({
    age: 21,
    stats: { health: 14, happiness: 50, smarts: 70, looks: 70, karma: 100 },
    housing: {
      arrangement: 'unhoused',
      moveOutDeadlineAge: 21,
      yearsUnhoused: 0,
      movedOutAtAge: 21,
      lastProgressedAge: 21,
      age18PromptShown: true,
      age19ReminderLogged: true,
      age20WarningShown: true,
      movedOutPromptShown: true,
      pendingNotice: null,
    },
    healthcare: {
      conditions: [
        {
          id: 'heart-1',
          catalogId: 'heart',
          status: 'known',
          acquiredAtAge: 21,
          diagnosedAtAge: 21,
          symptom: 'Your chest feels heavy when you climb the stairs.',
          untreatedYears: 0,
        },
      ],
      visits: [],
    },
  });
  const diedHeart = ageUpCharacter(heartAndHousing);
  assert.equal(diedHeart.isAlive, false);
  assert.equal(diedHeart.causeOfDeath, 'A tired heart');
}

// 13. University enrollment without accommodation does NOT satisfy independent housing
{
  const baseEdu = createInitialEducation();
  const uniStudentAt20 = buildCharacter({
    age: 20,
    education: {
      ...baseEdu,
      currentStage: 'university',
      university: {
        universityName: 'Austin State University',
        majorId: 'cs',
        majorName: 'Computer Science',
        degreeTitle: 'B.S. in Computer Science',
        year: 3,
        totalYears: 4,
        tuitionPerYear: 11500,
        fundingType: 'student_loan',
      },
    },
    housing: {
      arrangement: 'with_parents',
      moveOutDeadlineAge: 21,
      lastProgressedAge: 20,
      yearsUnhoused: 0,
      age18PromptShown: true,
      age19ReminderLogged: true,
      age20WarningShown: true,
      movedOutPromptShown: false,
      pendingNotice: null,
    },
  });
  const uniAt21 = ageUpCharacter(uniStudentAt20);
  assert.equal(uniAt21.housing?.arrangement, 'unhoused');
  assert.equal(uniAt21.housing?.yearsUnhoused, 1);
  assert.equal(getPendingHousingNotice(uniAt21), 'age21_moved_out');
}

// 14. SSR UI Verification (No unsupported rental claims + live status badges + sale warning)
{
  const noticeChar18 = buildCharacter({
    age: 18,
    cash: 2400,
    housing: {
      ...createInitialHousingState(),
      age18PromptShown: true,
      pendingNotice: 'age18_independence',
    },
  });
  const modal18Html = renderToStaticMarkup(
    React.createElement(HousingNoticeModal, {
      isOpen: true,
      noticeKind: 'age18_independence',
      character: noticeChar18,
      onBrowseHomes: () => {},
      onExploreCareers: () => {},
      onDismiss: () => {},
    })
  );
  assert(modal18Html.includes('Time to Find Your Own Place'));
  assert(modal18Html.includes('$12,400'));
  assert(
    !/\b(rent|renting|rental|dorm|dorms)\b/i.test(modal18Html),
    'Housing notice modal must not suggest renting or dorms are currently available'
  );

  const unhousedChar = buildCharacter({
    age: 22,
    housing: {
      arrangement: 'unhoused',
      moveOutDeadlineAge: 21,
      yearsUnhoused: 2,
      movedOutAtAge: 21,
      age18PromptShown: true,
      age19ReminderLogged: true,
      age20WarningShown: true,
      movedOutPromptShown: true,
      pendingNotice: null,
    },
  });
  const menuHtml = renderToStaticMarkup(
    React.createElement(MenuScreen, {
      character: unhousedChar,
      onOpenRelationships: () => {},
    })
  );
  assert(menuHtml.includes('Unhoused!'));

  const assetsBannerHtml = renderToStaticMarkup(
    React.createElement(HousingStatusBanner, {
      character: unhousedChar,
    })
  );
  assert(assetsBannerHtml.includes('Housing Status'));
  assert(assetsBannerHtml.includes('Unhoused (2y)'));

  const saleModalHtml = renderToStaticMarkup(
    React.createElement(PropertyDetailModal, {
      listing: getPropertyListing('studio_austin_loft') ?? null,
      owned: ownedAustinStudio('home-warn'),
      imageSrc: null,
      cash: 5000,
      error: null,
      saleHousingWarning:
        'Warning: Selling your only home will leave you unhoused, causing yearly Health and Happiness loss until you buy another home.',
      actionsDisabled: false,
      confirmingSale: true,
      onClose: () => {},
      onPurchase: () => {},
      onStartSale: () => {},
      onCancelSale: () => {},
      onConfirmSale: () => {},
    })
  );
  assert(saleModalHtml.includes('Selling your only home will leave you unhoused'));
}

// 15. Sequential Non-Dropping Post-Age-Up Modal Queue Verification
{
  const queueFlags = {
    isDeathOpen: false,
    hasBabyNotice: true,
    hasSchoolNotice: true,
    isAdmissionsOpen: false,
    hasHousingNotice: true,
    hasFiscalReport: true,
    hasPendingEvent: true,
    isCourtBlocking: false,
  };

  assert.equal(resolvePostAgeUpModalStep(queueFlags), 'baby');
  queueFlags.hasBabyNotice = false;
  assert.equal(resolvePostAgeUpModalStep(queueFlags), 'school');

  // Opening university/professional admissions pauses housing, fiscal, and event without dropping them
  queueFlags.hasSchoolNotice = false;
  queueFlags.isAdmissionsOpen = true;
  assert.equal(resolvePostAgeUpModalStep(queueFlags), 'admissions');

  // Closing admissions immediately resumes housing -> fiscal -> event in order
  queueFlags.isAdmissionsOpen = false;
  assert.equal(resolvePostAgeUpModalStep(queueFlags), 'housing');
  queueFlags.hasHousingNotice = false;
  assert.equal(resolvePostAgeUpModalStep(queueFlags), 'fiscal');
  queueFlags.hasFiscalReport = false;
  assert.equal(resolvePostAgeUpModalStep(queueFlags), 'event');
  queueFlags.hasPendingEvent = false;
  assert.equal(resolvePostAgeUpModalStep(queueFlags), null);

  // Death preempts all queued modals
  assert.equal(
    resolvePostAgeUpModalStep({ ...queueFlags, isDeathOpen: true, hasHousingNotice: true, hasPendingEvent: true }),
    'death'
  );
}

console.log('housingTransition.test.ts: All assertions passed.');
