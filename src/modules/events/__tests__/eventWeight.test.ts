import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import type { CharacterProfile, LifeEvent, LifeEventCategory } from '../../../types/game';
import type { LifeEventTemplate } from '../types';
import { buildEventContext, createEventContextRegistry, type EventContext } from '../services/eventContext';
import { combineEventWeight, scoreEventWeight, selectionShares } from '../services/eventWeight';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function near(actual: number, expected: number, message: string): void {
  if (!(Math.abs(actual - expected) < 1e-12)) {
    throw new Error(`${message}. Expected ${expected}, received ${actual}.`);
  }
}

function template(
  category: LifeEventCategory,
  overrides: Partial<LifeEventTemplate> = {}
): LifeEventTemplate {
  return {
    id: overrides.id ?? `weight_${category}`,
    title: overrides.title ?? `${category} template`,
    icon: '🎯',
    description: 'A quiet afternoon.',
    minAge: 0,
    maxAge: 120,
    choices: [
      {
        id: 'ok',
        label: 'Continue',
        icon: '✅',
        outcomes: [{ message: 'The moment passes.', effects: {} }],
      },
    ],
    ...overrides,
    category: overrides.category ?? category,
  };
}

function context(overrides: Partial<EventContext> = {}): EventContext {
  return {
    age: 30,
    lifeStage: 'adulthood',
    cash: 5000,
    cashValid: true,
    studentDebt: 0,
    studentDebtValid: true,
    financialBand: 'stable',
    karma: 50,
    health: 80,
    isEmployed: false,
    hasBusiness: false,
    isUnemployed: false,
    yearsInJob: null,
    relationshipSource: 'legacy',
    partnerStage: 'none',
    hasPartner: false,
    hasSpouse: false,
    livingChildren: 0,
    schoolAgeChildren: 0,
    livingParents: 2,
    livingSiblings: 0,
    seenEventIds: [],
    recentTimeline: [],
    extensions: {},
    failedProviderIds: [],
    ...overrides,
  };
}

function score(
  category: LifeEventCategory,
  snapshot: Partial<EventContext> = {},
  overrides: Partial<LifeEventTemplate> = {},
  titles?: ReadonlySet<string>
): number {
  const event = template(category, overrides);
  const interactiveTitles = titles ?? new Set<string>([event.title]);
  return scoreEventWeight(event, context(snapshot), interactiveTitles);
}

function journal(age: number, title: string, category: LifeEventCategory, id = title): LifeEvent {
  return {
    id,
    age,
    year: 2000 + age,
    title,
    message: title,
    category,
  };
}

function baseCharacter(age: number): CharacterProfile {
  return {
    id: 'player-weight',
    firstName: 'Jamie',
    lastName: 'Taylor',
    gender: 'female',
    age,
    birthYear: 2000,
    country: 'United States',
    city: 'Chicago',
    occupation: 'Unemployed',
    cash: 5000,
    bankBalance: 0,
    netWorth: 5000,
    isAlive: true,
    stats: { health: 80, happiness: 70, smarts: 60, looks: 55, karma: 50 },
    parents: {
      wealth: 'comfortable',
      father: {
        id: 'dad',
        role: 'father',
        firstName: 'Robert',
        lastName: 'Taylor',
        age: 50,
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
        age: 48,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 80,
        generosity: 70,
      },
    },
    education: createInitialEducation(),
    career: createInitialCareerState(),
    relationships: [],
    timeline: [],
    seenEventIds: [],
  };
}

function snapshotOf(character: CharacterProfile) {
  return buildEventContext(character, createEventContextRegistry([])).recentTimeline;
}

near(score('social'), 1, 'A missing weight with no modifiers stays 1');
near(score('money', {}, { weight: 1000 }), 5, 'An authored weight of 1000 clamps to the base ceiling');
near(score('social', {}, { weight: 0.05 }), 0.1, 'A positive weight below 0.1 clamps to the base floor');
for (const weight of [0, -3, Number.NaN]) {
  near(score('social', {}, { weight }), 1, `Authored weight ${weight} uses the default base`);
}

near(score('money', { isUnemployed: true }), 1.35, 'Unemployment boosts money');
near(score('misfortune', { isUnemployed: true }), 1.2, 'Unemployment boosts misfortune');
near(score('career', { isUnemployed: true }), 1, 'Unemployment does not boost career');
near(score('business', { hasBusiness: true }, { weight: 1.2 }), 1.62, 'A business owner boosts business');
near(score('business', { hasBusiness: false }), 1, 'A missing business skips the business boost');
near(
  score('career', { isEmployed: true, yearsInJob: 3 }),
  1.25,
  'Three years in the current job boosts career'
);
near(score('career', { isEmployed: true, yearsInJob: 2 }), 1, 'Fewer than three years skips the tenure boost');
near(score('career', { isEmployed: true, yearsInJob: null }), 1, 'A null tenure skips the career boost');
near(score('career', { isEmployed: false, yearsInJob: 5 }), 1, 'Tenure without employment skips the career boost');
near(score('money', { isEmployed: true, yearsInJob: 4 }), 1, 'Tenure does not boost money');

near(score('money', { financialBand: 'struggling' }), 1.4, 'A struggling band boosts money');
near(score('money', { financialBand: 'wealthy' }), 0.85, 'A wealthy band reduces money');
near(score('money', { financialBand: null, isUnemployed: true }), 1.35, 'A null band skips both money-band modifiers');
near(score('career', { financialBand: 'struggling' }), 1, 'A struggling band does not boost career');
near(
  score('money', { isUnemployed: true, financialBand: 'struggling' }),
  1.89,
  'Unemployment and struggling money stack under the relevance cap'
);
near(
  score('money', { isUnemployed: true, financialBand: 'struggling', karma: 10 }),
  1.89,
  'A misfortune modifier does not change a money template'
);
near(
  score('misfortune', { isUnemployed: true, karma: 10 }),
  1.5,
  'Unemployment and low karma stack on misfortune'
);

near(score('relationship', { hasSpouse: true, hasPartner: true }), 1.3, 'A spouse boosts relationship');
near(
  score('relationship', { hasSpouse: false, hasPartner: true, partnerStage: 'dating' }),
  1.15,
  'A non-spouse partner boosts relationship less than a spouse'
);
near(score('relationship', { hasPartner: false, hasSpouse: false }), 1, 'No partner leaves relationship at 1');
near(
  score('relationship', {
    relationshipSource: 'invalid',
    hasSpouse: true,
    hasPartner: true,
  }),
  1,
  'An invalid relationship source skips spouse and partner modifiers'
);
near(
  score('relationship', { hasSpouse: null, hasPartner: true }),
  1,
  'A null spouse flag skips both partner modifiers'
);
near(
  score('relationship', { hasSpouse: true, hasPartner: true, schoolAgeChildren: 1 }),
  1.56,
  'A spouse and a school-age child stack on relationship'
);
near(score('relationship', { schoolAgeChildren: 2 }), 1.2, 'School-age children boost relationship');
near(score('relationship', { schoolAgeChildren: null }), 1, 'A null school-age count skips that modifier');
near(score('relationship', { schoolAgeChildren: 0 }), 1, 'Zero school-age children skips that modifier');
near(score('social', { schoolAgeChildren: 2, hasSpouse: true, hasPartner: true }), 1, 'Relationship modifiers stay on relationship');

near(score('health', { health: 39 }, { weight: 2 }), 2.8, 'Health below 40 boosts a health template');
near(score('health', { health: 40 }, { weight: 2 }), 2, 'Health of 40 does not boost health');
near(score('health', { health: Number.NaN }, { weight: 2 }), 2, 'Non-finite health skips the health modifier');
near(score('misfortune', { karma: 29 }), 1.25, 'Karma below 30 boosts misfortune');
near(score('misfortune', { karma: 30 }), 1, 'Karma of 30 does not boost misfortune');
near(score('misfortune', { karma: 81 }), 0.85, 'Karma above 80 reduces misfortune');
near(score('misfortune', { karma: 80 }), 1, 'Karma of 80 does not reduce misfortune');
near(score('misfortune', { karma: Number.NaN }), 1, 'Non-finite karma skips both karma modifiers');
near(score('childhood', { age: 8, lifeStage: 'childhood' }), 1.15, 'Childhood boosts childhood');
near(score('education', { age: 8, lifeStage: 'childhood' }), 1, 'Childhood does not boost education');
near(score('education', { age: 16, lifeStage: 'teens' }), 1.1, 'Teens boost education');
near(score('childhood', { age: 16, lifeStage: 'teens' }), 1, 'Teens do not boost childhood');

const careerHistory = [
  { age: 29, title: 'Past Career Event', category: 'career' },
];
const careerTitles = new Set(['Past Career Event', 'Different Career', 'Another Career', 'Same Career']);
near(
  score('career', { recentTimeline: careerHistory }, { title: 'Different Career', weight: 1 }, careerTitles),
  2 / 3,
  'One recent career row reduces a different career template to 2/3'
);
near(
  score(
    'career',
    { recentTimeline: careerHistory },
    { title: 'Past Career Event', weight: 1 },
    careerTitles
  ),
  1 / 3,
  'The same title inside the window multiplies the category penalty by 1/2'
);
near(
  score('social', { recentTimeline: careerHistory }, { title: 'Party', weight: 1 }, careerTitles),
  1,
  'A career journal row does not penalize a social template'
);
near(
  score(
    'career',
    { recentTimeline: [{ age: 29, title: 'Family Loss', category: 'career' }] },
    { title: 'Different Career' },
    careerTitles
  ),
  1,
  'A title outside the interactive set does not count'
);
near(score('career', { recentTimeline: [] }, { title: 'Different Career' }, careerTitles), 1, 'An empty recent timeline has no penalty');

const repeatedTitleRows = [
  { age: 27, title: 'Same Career', category: 'career' },
  { age: 28, title: 'Same Career', category: 'career' },
  { age: 29, title: 'Other Career', category: 'career' },
];
near(
  score('career', { recentTimeline: repeatedTitleRows }, { title: 'Same Career', weight: 1 }, careerTitles),
  0.25,
  'Three category hits and two title hits sit on the repetition floor'
);

const sevenCareerRows = Array.from({ length: 7 }, (_, index) => ({
  age: 29,
  title: `Career ${index}`,
  category: 'career',
}));
const sevenTitles = new Set(sevenCareerRows.map((row) => row.title));
near(
  score('career', { recentTimeline: sevenCareerRows }, { title: 'Fresh Career', weight: 0.1 }, sevenTitles),
  0.05,
  'A crushed repetition product clamps to the final floor'
);
assert(
  combineEventWeight(5, 2, 1) === 10,
  'The component ceilings multiply to the final ceiling'
);
assert(
  combineEventWeight(6, 3, 1) === 10,
  'Inputs above the component ceilings stay on the final ceiling'
);
assert(combineEventWeight(0.1, 0.5, 0.1) === 0.05, 'The three floors clamp to the final floor');

const penalizedCareer = score(
  'career',
  { recentTimeline: careerHistory },
  { title: 'Different Career', weight: 1 },
  careerTitles
);
const untouchedSocial = score(
  'social',
  { recentTimeline: careerHistory },
  { title: 'Party', weight: 1 },
  careerTitles
);
near(penalizedCareer, 2 / 3, 'The small-pool career template keeps title factor 1');
assert(untouchedSocial === 1, 'The small-pool social template is unpenalized');
const smallPool = selectionShares([penalizedCareer, untouchedSocial]);
near(smallPool[0], 2 / 5, 'Category repetition gives the career template 2/5');
near(smallPool[1], 3 / 5, 'The social template receives 3/5');

const sharedPenalty = selectionShares([
  score('career', { recentTimeline: careerHistory }, { title: 'Different Career' }, careerTitles),
  score('career', { recentTimeline: careerHistory }, { title: 'Another Career' }, careerTitles),
]);
near(sharedPenalty[0], 0.5, 'The same category penalty cancels in the first share');
near(sharedPenalty[1], 0.5, 'The same category penalty cancels in the second share');

const onlyEvent = score(
  'career',
  { recentTimeline: sevenCareerRows },
  { title: 'Fresh Career', weight: 0.1 },
  sevenTitles
);
assert(onlyEvent === 0.05, 'One heavily repeated event stays selectable at the floor');
assert(selectionShares([onlyEvent])[0] === 1, 'A one-event pool still has the whole share');

assert(JSON.stringify(selectionShares([1, 1])) === JSON.stringify([0.5, 0.5]), 'Equal weights split in half');
assert(JSON.stringify(selectionShares([1, 3])) === JSON.stringify([0.25, 0.75]), 'Weights 1 and 3 split 25/75');
const boundaryTotal = 0.05 + 10;
const boundaryShares = selectionShares([0.05, 10]);
assert(boundaryShares[0] === 0.05 / boundaryTotal, 'The final floor keeps its normalized share');
assert(boundaryShares[1] === 10 / boundaryTotal, 'The final ceiling keeps its normalized share');
assert(selectionShares([]).length === 0, 'An empty weight list has no shares');
assert(selectionShares([Number.NaN]).length === 0, 'A non-finite weight has no shares');
assert(selectionShares([1, Number.POSITIVE_INFINITY]).length === 0, 'An infinite weight has no shares');
assert(selectionShares([1, -3]).length === 0, 'A negative weight has no shares');
assert(selectionShares([0, 1]).length === 0, 'A zero weight has no shares');
assert(selectionShares(undefined as unknown as number[]).length === 0, 'A missing weight list has no shares');

const currentAge = 30;
const shuffled = snapshotOf({
  ...baseCharacter(currentAge),
  timeline: [
    journal(29, 'Latest', 'career', 'latest'),
    journal(27, 'Oldest', 'money', 'oldest'),
    journal(28, 'Middle', 'social', 'middle'),
  ],
});
assert(
  shuffled.map((row) => row.title).join('|') === 'Oldest|Middle|Latest',
  'Out-of-order ages are returned oldest to newest'
);

const sameAge = snapshotOf({
  ...baseCharacter(currentAge),
  timeline: [
    journal(29, 'After', 'career', 'after'),
    journal(28, 'Earlier', 'career', 'earlier'),
    journal(28, 'Later', 'social', 'later'),
  ],
});
assert(
  sameAge.map((row) => row.title).join('|') === 'Earlier|Later|After',
  'The same age keeps the later original index after the earlier one'
);

const sourceRow = journal(28, '  Kept Title  ', 'career', 'source');
sourceRow.message = 'original message';
const copiedFrom = {
  ...baseCharacter(currentAge),
  timeline: [sourceRow],
};
const copied = snapshotOf(copiedFrom);
assert(copied.length === 1, 'A valid row is retained');
assert(copied[0] !== sourceRow, 'The snapshot does not keep the journal object');
assert(copied[0].title === 'Kept Title', 'The snapshot stores the trimmed title');
assert(copied[0].age === 28 && copied[0].category === 'career', 'The snapshot stores age and category');
assert(
  Object.keys(copied[0]).sort().join('|') === 'age|category|title',
  'The snapshot stores only age, title, and category'
);
sourceRow.title = 'Mutated';
sourceRow.category = 'money';
sourceRow.age = 1;
assert(copied[0].title === 'Kept Title', 'Mutating the source title leaves the snapshot alone');
assert(copied[0].category === 'career' && copied[0].age === 28, 'Mutating the source row leaves the snapshot alone');
assert(copiedFrom.timeline[0] === sourceRow, 'Building the snapshot does not replace the timeline entry');

const missingTimeline = snapshotOf({
  ...baseCharacter(currentAge),
  timeline: undefined as unknown as LifeEvent[],
});
assert(missingTimeline.length === 0, 'A missing timeline yields an empty snapshot');
const nonArrayTimeline = snapshotOf({
  ...baseCharacter(currentAge),
  timeline: { 0: journal(28, 'Nope', 'career') } as unknown as LifeEvent[],
});
assert(nonArrayTimeline.length === 0, 'A non-array timeline yields an empty snapshot');
assert(snapshotOf({ ...baseCharacter(Number.NaN) }).length === 0, 'A non-finite current age yields an empty snapshot');
assert(
  snapshotOf({ ...baseCharacter(Number.POSITIVE_INFINITY) }).length === 0,
  'An infinite current age yields an empty snapshot'
);

const withoutCategory = {
  id: 'no-category-row',
  age: 28,
  year: 2028,
  title: 'No category',
  message: 'missing category',
} as LifeEvent;
const mixed = snapshotOf({
  ...baseCharacter(currentAge),
  timeline: [
    null as unknown as LifeEvent,
    4 as unknown as LifeEvent,
    journal(Number.NaN, 'Bad age', 'career', 'bad-age'),
    journal(28, '   ', 'career', 'blank'),
    withoutCategory,
    journal(28, 'Good', 'money', 'good'),
  ],
});
assert(mixed.length === 1 && mixed[0].title === 'Good', 'Malformed rows are omitted and a valid row remains');

const windowRows = snapshotOf({
  ...baseCharacter(currentAge),
  timeline: [
    journal(26, 'Too old', 'career', 'too-old'),
    journal(27, 'Window start', 'career', 'start'),
    journal(29, 'Window end', 'money', 'end'),
    journal(30, 'Current age', 'social', 'current'),
    journal(31, 'Future', 'health', 'future'),
  ],
});
assert(
  windowRows.map((row) => row.title).join('|') === 'Window start|Window end',
  'The snapshot keeps [currentAge - 3, currentAge) and drops the current age'
);

const overflowTitles = Array.from({ length: 30 }, (_, index) => `Row ${index}`);
const overflow = snapshotOf({
  ...baseCharacter(currentAge),
  timeline: [
    ...overflowTitles.map((title, index) => journal(29, title, 'career', `row-${index}`)),
    journal(27, 'Oldest extra', 'money', 'oldest-extra'),
  ],
});
assert(overflow.length === 24, 'More than 24 qualifying rows keep the newest 24');
assert(!overflow.some((row) => row.title === 'Oldest extra'), 'The oldest qualifying row is dropped first');
assert(overflow[0].title === 'Row 6', 'The kept rows start at the seventh same-age entry');
assert(overflow[23].title === 'Row 29', 'The kept rows end at the latest original index');
assert(
  overflow.every((row, index) => index === 0 || overflow[index - 1].age <= row.age),
  'The capped snapshot stays ordered by age'
);

console.log('✅ Contextual weights, probability shares, and recent timeline snapshots matched');
