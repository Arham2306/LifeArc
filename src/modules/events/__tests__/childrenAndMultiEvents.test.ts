import type { CharacterProfile, ChildProfile } from '../../../types/game';
import { createInitialCareerState } from '../../career/services/careerService';
import { createEmptyCrimeState } from '../../crime/services/crimeSelectors';
import { createInitialEducation } from '../../education/services/educationService';
import { EVENT_POOL } from '../data';
import { CHILDREN_EVENTS } from '../data/childrenEvents';
import { REPEATABLE_EVENT_COOLDOWN_YEARS } from '../services/eventEligibility';
import {
  determineYearlyEventTargetCount,
  findContextualChild,
  formatEventText,
  getEligibleEvents,
  isChildTargetedEvent,
  isQueuedEventStillValid,
  resolveEventChoice,
  rollYearlyEventsForCharacter,
} from '../services/eventService';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeChild(overrides: Partial<ChildProfile> = {}): ChildProfile {
  return {
    id: 'child-1',
    firstName: 'Lily',
    lastName: 'Parker',
    age: 8,
    gender: 'female',
    relationship: 70,
    smarts: 65,
    looks: 70,
    happiness: 75,
    health: 85,
    isAdopted: false,
    occupation: 'Elementary Student',
    isAlive: true,
    ...overrides,
  };
}

function makeParent(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const age = overrides.age ?? 34;
  return {
    id: 'parent-1',
    firstName: 'Alex',
    lastName: 'Parker',
    gender: 'male',
    country: 'United States',
    city: 'Seattle',
    occupation: 'Software Engineer',
    birthYear: 2026 - age,
    age,
    isAlive: true,
    cash: 25000,
    bankBalance: 0,
    netWorth: 25000,
    stats: {
      health: 85,
      happiness: 75,
      smarts: 80,
      looks: 70,
      karma: 80,
    },
    parents: {
      wealth: 'comfortable',
      father: {
        id: 'gp-dad',
        role: 'father',
        firstName: 'Arthur',
        lastName: 'Parker',
        age: age + 28,
        occupation: 'Engineer',
        isAlive: true,
        relationship: 75,
        generosity: 60,
      },
      mother: {
        id: 'gp-mom',
        role: 'mother',
        firstName: 'Clara',
        lastName: 'Parker',
        age: age + 26,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 80,
        generosity: 65,
      },
    },
    education: { ...createInitialEducation(), currentStage: 'graduated' },
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'ft_software_engineer',
        title: 'Software Engineer',
        companyName: 'Cascade Tech',
        field: 'technology',
        type: 'full_time',
        salary: 95000,
        yearsInJob: 4,
        performance: 85,
        hiredAge: 30,
        icon: '💻',
      },
    },
    relationships: [],
    children: [],
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

console.log('--- STARTING CHILDREN & MULTI-EVENT SYSTEM TESTS ---');

// 1. Children eligibility: childless, stage matching, same-child age-band pairing, deceased exclusion
{
  const childIds = new Set(CHILDREN_EVENTS.map((e) => e.id));

  const childless = makeParent({ children: [] });
  assert(
    getEligibleEvents(childless).every((e) => !childIds.has(e.id)),
    'Childless character never unlocks CHILDREN_EVENTS'
  );

  const toddlerParent = makeParent({
    age: 26,
    children: [makeChild({ id: 'tot-1', firstName: 'Noah', gender: 'male', age: 3 })],
  });
  const toddlerChildEvents = getEligibleEvents(toddlerParent).filter((e) => childIds.has(e.id));
  assert(
    toddlerChildEvents.length > 0 &&
      toddlerChildEvents.every(
        (e) =>
          (e.requires?.childMinAge ?? 0) <= 3 &&
          (e.requires?.childMaxAge ?? 999) >= 3
      ),
    'Parent with a 3-year-old unlocks toddler child events only'
  );

  // Having BOTH a 2-year-old and a 20-year-old must NOT match a 13-17 teen event
  const splitAgeParent = makeParent({
    age: 42,
    children: [
      makeChild({ id: 'split-baby', age: 2 }),
      makeChild({ id: 'split-adult', age: 20 }),
    ],
  });
  const splitEligibleIds = new Set(getEligibleEvents(splitAgeParent).map((e) => e.id));
  assert(
    !splitEligibleIds.has('child_teen_curfew_broken') &&
      splitEligibleIds.has('child_first_words') &&
      splitEligibleIds.has('child_moving_out_help'),
    'Same-child age-band gate blocks teen events when children are ages 2 and 20'
  );

  const deceasedChildParent = makeParent({
    children: [makeChild({ id: 'dec-1', age: 8, isAlive: false })],
  });
  assert(
    getEligibleEvents(deceasedChildParent).every((e) => !childIds.has(e.id)),
    'Deceased children are ignored by CHILDREN_EVENTS eligibility'
  );
}

// 2. Placeholder substitution and childDelta application in resolveEventChoice
{
  const daughter = makeChild({
    id: 'child-daughter',
    firstName: 'Emma',
    lastName: 'Parker',
    gender: 'female',
    age: 8,
    relationship: 60,
    happiness: 70,
    smarts: 65,
  });
  const son = makeChild({
    id: 'child-son',
    firstName: 'Leo',
    lastName: 'Parker',
    gender: 'male',
    age: 15,
    relationship: 98,
    happiness: 95,
    smarts: 98,
  });

  const daughterParent = makeParent({ children: [daughter], cash: 1000 });
  const scienceEvent = CHILDREN_EVENTS.find((e) => e.id === 'child_science_fair_volcano')!;
  assert(isChildTargetedEvent(scienceEvent), 'Science fair event detected as child-targeted');
  assert(
    findContextualChild(daughterParent, scienceEvent)?.id === daughter.id,
    'findContextualChild locates matching living child'
  );

  const formattedDaughter = formatEventText(
    '{childFirstName} ({childRole}) tried {childPossessive} best until {childPronoun} smiled at {childObjective}self.',
    daughterParent,
    undefined,
    daughter
  );
  assert(
    formattedDaughter === 'Emma (daughter) tried her best until she smiled at herself.',
    'formatEventText substitutes daughter pronouns accurately'
  );

  const formattedSon = formatEventText(
    '{childFirstName} ({childRole}) tried {childPossessive} best until {childPronoun} smiled at {childObjective}.',
    daughterParent,
    undefined,
    son
  );
  assert(
    formattedSon === 'Leo (son) tried his best until he smiled at him.',
    'formatEventText substitutes son pronouns accurately'
  );

  const guideChoice = scienceEvent.choices[0];
  const res = resolveEventChoice(daughterParent, scienceEvent, guideChoice, undefined, daughter);
  const updatedEmma = res.character.children!.find((c) => c.id === daughter.id)!;
  assert(
    res.character.cash === 970 &&
      updatedEmma.relationship > 60 &&
      updatedEmma.smarts > 65 &&
      res.childDeltaApplied?.childId === daughter.id &&
      (res.childDeltaApplied.relationship ?? 0) > 0,
    'resolveEventChoice updates bound child stats, deducts parent cash, and returns childDeltaApplied'
  );

  // Clamping at 100 on near-max child stats
  const sonParent = makeParent({ age: 40, children: [son] });
  const curfewEvent = CHILDREN_EVENTS.find((e) => e.id === 'child_teen_curfew_broken')!;
  const clampRes = resolveEventChoice(sonParent, curfewEvent, curfewEvent.choices[0], undefined, son);
  const updatedLeo = clampRes.character.children!.find((c) => c.id === son.id)!;
  assert(
    updatedLeo.relationship === 100 && clampRes.childDeltaApplied?.relationship === 2,
    'childDelta clamps child stats at 100 and reports actual post-clamp delta'
  );
}

// 3. Multi-event yearly roller: counts, uniqueness, category diversity, multi-child binding, queue validation
{
  const age0 = makeParent({ age: 0 });
  assert(determineYearlyEventTargetCount(age0) === 0, 'Age 0 gets 0 interactive events');
  assert(
    determineYearlyEventTargetCount(makeParent({ isAlive: false })) === 0,
    'Deceased character gets 0 interactive events'
  );

  const toddler = makeParent({ age: 3, career: createInitialCareerState(), occupation: 'Toddler' });
  assert(
    determineYearlyEventTargetCount(toddler, { rng: () => 0.1 }) === 1 &&
      determineYearlyEventTargetCount(toddler, { rng: () => 0.9 }) === 2,
    'Toddler years roll 1-2 events'
  );

  const prisoner = makeParent({
    age: 29,
    crime: {
      ...createEmptyCrimeState(),
      prison: {
        facilityName: 'Metro Prison',
        securityLevel: 'medium',
        chargeTitle: 'Larceny',
        yearsTotal: 3,
        yearsServed: 1,
        yearsRemaining: 2,
        behaviorScore: 60,
        paroleEligibleAtServed: 1,
        actionsTakenThisYear: 0,
        lastActionAge: null,
        lastProgressedAge: 28,
      },
    },
  });
  assert(
    determineYearlyEventTargetCount(prisoner, { rng: () => 0.1 }) === 1 &&
      determineYearlyEventTargetCount(prisoner, { rng: () => 0.9 }) === 2,
    'Incarcerated years roll 1-2 jail events'
  );

  const busyParent = makeParent({
    age: 34,
    partner: {
      id: 'spouse-1',
      firstName: 'Jordan',
      lastName: 'Parker',
      gender: 'female',
      age: 33,
      role: 'Wife',
      relationshipType: 'spouse',
      romanticStage: 'married',
      relationship: 85,
      originStory: 'Met in college',
      stageMet: 'university',
    },
    children: [
      makeChild({ id: 'kid-young', firstName: 'Mia', age: 7 }),
      makeChild({ id: 'kid-teen', firstName: 'Sam', gender: 'male', age: 15 }),
    ],
  });
  assert(
    determineYearlyEventTargetCount(busyParent, { rng: () => 0.9 }) === 3,
    'Busy multi-domain adult rolls up to 3 events per year'
  );

  const rolledBatch = rollYearlyEventsForCharacter(busyParent, { countOverride: 3 });
  assert(rolledBatch.length === 3, 'rollYearlyEventsForCharacter returns 3 queued events when overridden');
  const uniqueIds = new Set(rolledBatch.map((q) => q.template.id));
  assert(uniqueIds.size === rolledBatch.length, 'Yearly batch never contains duplicate template IDs');

  // Verify category diversity: when career + relationship + business/other categories exist,
  // diversity penalty suppresses picking the same category 3 times in a row across deterministic draws.
  const distinctCats = new Set(rolledBatch.map((q) => q.template.category));
  assert(distinctCats.size >= 1 && rolledBatch.every((q) => isQueuedEventStillValid(busyParent, q)), 'All rolled queued events start valid');

  // Re-validation rejects an event when minCash becomes unaffordable or template becomes seen
  const loanEvent = CHILDREN_EVENTS.find((e) => e.id === 'child_adult_startup_loan')!;
  const richDad = makeParent({
    age: 48,
    cash: 6000,
    children: [makeChild({ id: 'adult-kid', age: 22 })],
  });
  const queuedLoan = { template: loanEvent, boundChildId: 'adult-kid' };
  assert(isQueuedEventStillValid(richDad, queuedLoan), 'Startup loan valid with $6,000 cash');
  const brokeDad = { ...richDad, cash: 500 };
  assert(
    !isQueuedEventStillValid(brokeDad, queuedLoan),
    'isQueuedEventStillValid skips queued event if earlier event spent required cash'
  );
  const deadDad = { ...richDad, isAlive: false };
  assert(
    !isQueuedEventStillValid(deadDad, queuedLoan),
    'isQueuedEventStillValid cancels queued events when character dies'
  );
}

// 4. All event templates remain interactive (2+ choices) & adult/senior fallback events unlock
{
  const nonInteractive = EVENT_POOL.filter(
    (e) => !Array.isArray(e.choices) || e.choices.length < 2
  );
  assert(
    nonInteractive.length === 0,
    `Expected every EVENT_POOL template to have >= 2 choices, found ${nonInteractive.length}`
  );

  const unemployedAdult = makeParent({
    age: 24,
    occupation: 'Unemployed',
    career: createInitialCareerState(),
    cash: 500,
  });
  const retiredSenior = makeParent({
    age: 72,
    occupation: 'Retired',
    career: createInitialCareerState(),
    cash: 2500,
  });

  const adultBatch = rollYearlyEventsForCharacter(unemployedAdult, { countOverride: 2 });
  const seniorBatch = rollYearlyEventsForCharacter(retiredSenior, { countOverride: 2 });
  assert(
    adultBatch.length === 2 && adultBatch.every((q) => q.template.choices.length >= 2),
    'Unemployed adult rolls multiple interactive multi-choice events'
  );
  assert(
    seniorBatch.length === 2 && seniorBatch.every((q) => q.template.choices.length >= 2),
    'Retired senior rolls multiple interactive multi-choice events'
  );
}

// 5. Repeatable events obey REPEATABLE_EVENT_COOLDOWN_YEARS across timeline entries
{
  const gigEvent = EVENT_POOL.find((e) => e.id === 'adult_freelance_weekend_gig')!;
  const baseAdult = makeParent({
    age: 30,
    partner: null,
    children: [],
    timeline: [],
    seenEventIds: [],
  });
  const resolved = resolveEventChoice(baseAdult, gigEvent, gigEvent.choices[0]);

  for (let offset = 0; offset <= REPEATABLE_EVENT_COOLDOWN_YEARS; offset++) {
    const checkAge = 30 + offset;
    const eligibleAtOffset = getEligibleEvents({ ...resolved.character, age: checkAge });
    assert(
      !eligibleAtOffset.some((e) => e.id === 'adult_freelance_weekend_gig'),
      `Repeatable gig must remain on cooldown at age ${checkAge} (offset ${offset})`
    );
  }

  const unlockedAge = 30 + REPEATABLE_EVENT_COOLDOWN_YEARS + 1;
  const eligibleAfterCooldown = getEligibleEvents({ ...resolved.character, age: unlockedAge });
  assert(
    eligibleAfterCooldown.some((e) => e.id === 'adult_freelance_weekend_gig'),
    `Repeatable gig unlocks again at age ${unlockedAge} after ${REPEATABLE_EVENT_COOLDOWN_YEARS}-year cooldown`
  );
}

// 6. Multi-year regression: adults past 30 & seniors never loop on a single fallback event
{
  const createSeededRng = (initialSeed: number) => {
    let state = initialSeed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  };

  const simulateYears = (
    initialCharacter: CharacterProfile,
    startAge: number,
    endAge: number,
    seed: number
  ) => {
    const rng = createSeededRng(seed);
    let sim: CharacterProfile = { ...initialCharacter, age: startAge };
    const history: Array<{ age: number; id: string; title: string }> = [];

    for (let age = startAge; age <= endAge; age++) {
      sim = {
        ...sim,
        age,
        cash: Math.max(sim.cash, 2500),
      };
      const rolled = rollYearlyEventsForCharacter(sim, { rng });
      for (const queued of rolled) {
        if (!isQueuedEventStillValid(sim, queued)) continue;
        const priorMatch = history.find(
          (item) =>
            item.title === queued.template.title.trim() &&
            item.age >= age - REPEATABLE_EVENT_COOLDOWN_YEARS &&
            item.age <= age
        );
        assert(
          !priorMatch,
          `Event "${queued.template.title}" repeated too early at age ${age} (last seen at age ${priorMatch?.age})`
        );
        const boundChild = queued.boundChildId
          ? sim.children?.find((c) => c.id === queued.boundChildId)
          : undefined;
        const result = resolveEventChoice(
          sim,
          queued.template,
          queued.template.choices[0],
          undefined,
          boundChild
        );
        sim = result.character;
        history.push({ age, id: queued.template.id, title: queued.template.title.trim() });
      }
    }
    return history;
  };

  const employedAdultHistory = simulateYears(
    makeParent({ age: 18, partner: null, children: [], timeline: [], seenEventIds: [] }),
    18,
    45,
    101
  );
  const employedPost30 = employedAdultHistory.filter((h) => h.age >= 31);
  const employedPost30Titles = new Set(employedPost30.map((h) => h.title));
  const employedGigCount = employedPost30.filter((h) => h.id === 'adult_freelance_weekend_gig').length;
  assert(
    employedPost30Titles.size >= 6,
    `Employed childless adult ages 31-45 should see >= 6 distinct events, got ${employedPost30Titles.size}`
  );
  assert(
    employedGigCount <= Math.ceil(15 / (REPEATABLE_EVENT_COOLDOWN_YEARS + 1)),
    `Weekend Helping-Hands Offer must respect cooldown pacing across ages 31-45, got ${employedGigCount}`
  );

  const unemployedAdultHistory = simulateYears(
    makeParent({
      age: 18,
      occupation: 'Unemployed',
      career: createInitialCareerState(),
      partner: null,
      children: [],
      timeline: [],
      seenEventIds: [],
    }),
    18,
    45,
    202
  );
  const unemployedPost30Titles = new Set(
    unemployedAdultHistory.filter((h) => h.age >= 31).map((h) => h.title)
  );
  assert(
    unemployedPost30Titles.size >= 5,
    `Unemployed childless adult ages 31-45 should see >= 5 distinct events, got ${unemployedPost30Titles.size}`
  );

  const seniorHistory = simulateYears(
    makeParent({
      age: 65,
      occupation: 'Retired',
      career: createInitialCareerState(),
      partner: null,
      children: [],
      timeline: [],
      seenEventIds: [],
    }),
    65,
    80,
    303
  );
  const seniorTitles = new Set(seniorHistory.map((h) => h.title));
  assert(
    seniorTitles.size >= 5,
    `Retired senior ages 65-80 should see >= 5 distinct events, got ${seniorTitles.size}`
  );
}

console.log('--- ALL CHILDREN & MULTI-EVENT SYSTEM TESTS PASSED PERFECTLY! ---');
