import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import type { ActiveBusinessProfile } from '../../business/types';
import type { ActiveCareerProfile, CareerField, EmploymentType } from '../../career/types';
import type { SchoolStage } from '../../education/types';
import type { CharacterProfile } from '../../../types/game';
import type { LifeEventTemplate } from '../types';
import { EVENT_POOL } from '../data';
import { gameEventContextRegistry } from '../../../composition/eventContextRegistry';
import { buildEventContext, createEventContextRegistry } from '../services/eventContext';
import { isEventEligible } from '../services/eventEligibility';
import { getEligibleEvents } from '../services/eventService';
import { scoreEventWeight } from '../services/eventWeight';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/**
 * Independent copy of the structural rules that existed before contextual eligibility.
 * This function must not call the production structural helper.
 */
function legacyStructuralEligible(event: LifeEventTemplate, character: CharacterProfile): boolean {
  if (!character.isAlive) return false;
  const currentStage = character.education?.currentStage;
  const currentJob = character.career?.currentJob;
  const isEmployedOrBusiness = Boolean(currentJob || character.business);

  if (character.age < event.minAge || character.age > event.maxAge) return false;

  if (event.requiredStage) {
    if (Array.isArray(event.requiredStage)) {
      if (!event.requiredStage.includes(currentStage as SchoolStage)) return false;
    } else if (currentStage !== event.requiredStage) {
      return false;
    }
  }

  if (event.requiresEmployed && !isEmployedOrBusiness) return false;

  if (event.requiredCareerField) {
    if (!currentJob) return false;
    if (Array.isArray(event.requiredCareerField)) {
      if (!event.requiredCareerField.includes(currentJob.field)) return false;
    } else if (currentJob.field !== event.requiredCareerField) {
      return false;
    }
  }

  if (event.requiredEmploymentType) {
    if (!currentJob) return false;
    if (Array.isArray(event.requiredEmploymentType)) {
      if (!event.requiredEmploymentType.includes(currentJob.type)) return false;
    } else if (currentJob.type !== event.requiredEmploymentType) {
      return false;
    }
  }

  if (event.requiredJobIds) {
    if (!currentJob || !event.requiredJobIds.includes(currentJob.jobId)) return false;
  }

  if (event.requiresBusiness && !character.business) return false;

  if (event.requiredBusinessSector) {
    if (!character.business) return false;
    if (Array.isArray(event.requiredBusinessSector)) {
      if (!event.requiredBusinessSector.includes(character.business.sector)) return false;
    } else if (character.business.sector !== event.requiredBusinessSector) {
      return false;
    }
  }

  if (event.description.includes('{fatherName}') && !character.parents?.father?.isAlive) return false;
  if (event.description.includes('{motherName}') && !character.parents?.mother?.isAlive) return false;

  return Boolean(event.repeatable) || !character.seenEventIds.includes(event.id);
}

function baseCharacter(age: number, stage: SchoolStage = 'none'): CharacterProfile {
  return {
    id: `player-${age}`,
    firstName: 'Jamie',
    lastName: 'Taylor',
    gender: 'female',
    age,
    birthYear: 2000,
    country: 'United States',
    city: 'Chicago',
    occupation: 'Unemployed',
    cash: 1000,
    bankBalance: 0,
    netWorth: 1000,
    isAlive: true,
    stats: { health: 80, happiness: 70, smarts: 60, looks: 55, karma: 50 },
    parents: {
      wealth: 'comfortable',
      father: {
        id: 'dad',
        role: 'father',
        firstName: 'Robert',
        lastName: 'Taylor',
        age: 40 + age,
        occupation: 'Architect',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      mother: {
        id: 'mom',
        role: 'mother',
        firstName: 'Sarah',
        lastName: 'Taylor',
        age: 38 + age,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 80,
        generosity: 70,
      },
    },
    education: { ...createInitialEducation(), currentStage: stage },
    career: createInitialCareerState(),
    relationships: [],
    timeline: [],
    seenEventIds: [],
  };
}

function withJob(
  character: CharacterProfile,
  field: CareerField,
  type: EmploymentType,
  jobId: string,
  yearsInJob: number
): CharacterProfile {
  const job: ActiveCareerProfile = {
    jobId,
    title: jobId,
    companyName: 'Northwind',
    field,
    type,
    salary: 50000,
    yearsInJob,
    performance: 70,
    hiredAge: Math.max(0, character.age - yearsInJob),
    icon: '💼',
  };
  return {
    ...character,
    occupation: job.title,
    career: { ...character.career, currentJob: job },
  };
}

function withBusiness(character: CharacterProfile): CharacterProfile {
  return {
    ...character,
    business: { sector: 'software_tech' } as ActiveBusinessProfile,
  };
}

function compareIds(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function expectSameEligibility(name: string, character: CharacterProfile): void {
  const expected = EVENT_POOL.filter((event) => legacyStructuralEligible(event, character))
    .map((event) => event.id)
    .sort(compareIds);
  const actual = getEligibleEvents(character)
    .map((event) => event.id)
    .sort(compareIds);
  if (expected.join('|') !== actual.join('|')) {
    const missing = expected.filter((id) => !actual.includes(id));
    const extra = actual.filter((id) => !expected.includes(id));
    throw new Error(
      `${name} eligibility drifted. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`
    );
  }
}

assert(EVENT_POOL.length === 150, `Expected 150 templates, found ${EVENT_POOL.length}`);
assert(
  EVENT_POOL.every((event) => event.requires === undefined && event.excludes === undefined),
  'Existing templates must not define requires or excludes'
);

const fixtures: Array<[string, CharacterProfile]> = [
  ['age 0', baseCharacter(0, 'none')],
  ['age 4', baseCharacter(4, 'none')],
  ['age 8 elementary', baseCharacter(8, 'elementary')],
  ['age 12 middle school', baseCharacter(12, 'middle_school')],
  ['age 13 middle school', baseCharacter(13, 'middle_school')],
  [
    'age 16 part-time hospitality',
    withJob(baseCharacter(16, 'high_school'), 'hospitality_retail', 'part_time', 'pt_cafe_barista', 1),
  ],
  [
    'age 17 dead father',
    (() => {
      const character = baseCharacter(17, 'high_school');
      character.parents.father.isAlive = false;
      return character;
    })(),
  ],
  [
    'age 17 dead mother',
    (() => {
      const character = baseCharacter(17, 'high_school');
      character.parents.mother.isAlive = false;
      return character;
    })(),
  ],
  ['age 20 university', baseCharacter(20, 'university')],
  [
    'age 30 technology job',
    withJob(baseCharacter(30, 'none'), 'technology', 'full_time', 'ft_software_engineer', 3),
  ],
  ['age 35 business', withBusiness(baseCharacter(35, 'none'))],
  [
    'age 40 job and business',
    withBusiness(withJob(baseCharacter(40, 'none'), 'technology', 'full_time', 'ft_software_engineer', 6)),
  ],
  ['age 45 unemployed', { ...baseCharacter(45, 'graduated'), occupation: 'Unemployed' }],
  [
    'age 64 employed',
    withJob(baseCharacter(64, 'none'), 'technology', 'full_time', 'ft_software_engineer', 10),
  ],
  ['age 70 retired', { ...baseCharacter(70, 'none'), occupation: 'Retired' }],
  ['dead character', { ...baseCharacter(30, 'none'), isAlive: false }],
  [
    'age 30 employed with a recent career journal',
    {
      ...withJob(baseCharacter(30, 'none'), 'technology', 'full_time', 'ft_software_engineer', 3),
      timeline: [
        {
          id: 'recent-career',
          age: 29,
          year: 2029,
          title: 'Past Career Event',
          message: 'A journal row must not change hard eligibility.',
          category: 'career',
        },
      ],
    },
  ],
  [
    'age 30 seen every template',
    {
      ...withJob(baseCharacter(30, 'none'), 'technology', 'full_time', 'ft_software_engineer', 3),
      seenEventIds: EVENT_POOL.map((event) => event.id),
    },
  ],
];

for (const [name, character] of fixtures) {
  expectSameEligibility(name, character);
}

assert(
  !legacyStructuralEligible.toString().includes('scoreEventWeight') &&
    !expectSameEligibility.toString().includes('scoreEventWeight') &&
    !getEligibleEvents.toString().includes('scoreEventWeight'),
  'Eligibility comparison must not consult scoreEventWeight'
);

const authoredWeights = EVENT_POOL.map((event) => event.weight);
const interactiveTitles = new Set(EVENT_POOL.map((event) => event.title));
for (const [name, character] of fixtures) {
  const eligible = getEligibleEvents(character);
  const weightedContext = buildEventContext(character, gameEventContextRegistry);
  const copies = eligible.map((event) => ({
    ...event,
    weight: scoreEventWeight(event, weightedContext, interactiveTitles),
  }));
  assert(
    copies.length === eligible.length && copies.every((copy, index) => copy.id === eligible[index].id),
    `${name} weighted copies changed the eligible ids or pool order`
  );
  for (const copy of copies) {
    assert(
      Number.isFinite(copy.weight) && copy.weight > 0 && copy.weight <= 10,
      `${name} final weight ${copy.weight} is outside (0, 10]`
    );
  }
}
assert(
  authoredWeights.every((weight, index) => weight === EVENT_POOL[index].weight),
  'Scoring must not write weights back onto the event pool'
);

const employed = fixtures.find(([name]) => name === 'age 30 technology job');
const employedWithJournal = fixtures.find(
  ([name]) => name === 'age 30 employed with a recent career journal'
);
assert(employed !== undefined && employedWithJournal !== undefined, 'Expected both employed fixtures');
assert(
  getEligibleEvents(employed[1]).map((event) => event.id).join('|') ===
    getEligibleEvents(employedWithJournal[1]).map((event) => event.id).join('|'),
  'A recent journal row must not add or remove eligible templates'
);

const repeatable: LifeEventTemplate = {
  id: 'synthetic_repeatable',
  title: 'Repeatable probe',
  icon: '🔁',
  description: 'This synthetic template is not part of the pool.',
  category: 'social',
  minAge: 0,
  maxAge: 120,
  repeatable: true,
  choices: [
    {
      id: 'ok',
      label: 'OK',
      icon: '✅',
      outcomes: [{ message: 'Done.', effects: {} }],
    },
  ],
};
const seenRepeatable = { ...baseCharacter(30, 'none'), seenEventIds: ['synthetic_repeatable'] };
const repeatableContext = buildEventContext(seenRepeatable, createEventContextRegistry([]));
assert(legacyStructuralEligible(repeatable, seenRepeatable), 'The independent copy keeps a seen repeatable template');
assert(
  isEventEligible(repeatable, seenRepeatable, repeatableContext),
  'A seen repeatable template stays eligible'
);

console.log(`✅ Structural eligibility matched across ${EVENT_POOL.length} templates and ${fixtures.length} fixtures`);
