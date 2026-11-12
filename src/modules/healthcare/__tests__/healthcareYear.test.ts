import type { CharacterProfile, LifeEvent } from '../../../types/game';
import { getPropertyListing } from '../../assets/data/propertyCatalog';
import type { OwnedProperty } from '../../assets/types';
import { ageUpCharacter } from '../../aging/services/agingService';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { getConditionListing } from '../data/conditionCatalog';
import {
  enrollCare,
  progressHealthcareForYear,
  startTreatment,
} from '../services/healthcareService';
import type { ConditionId, ConditionRecord } from '../types';
import type { PetRecord } from '../../pets/types';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function character(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_health_year',
    firstName: 'Mina',
    lastName: 'Cole',
    gender: 'female',
    age: 30,
    birthYear: 1990,
    city: 'Austin',
    country: 'United States',
    isAlive: true,
    stats: { health: 80, happiness: 70, smarts: 40, looks: 60, karma: 55 },
    cash: 1000,
    bankBalance: 2000,
    netWorth: 3000,
    occupation: 'Unemployed',
    parents: {
      father: {
        id: 'dad',
        role: 'father',
        firstName: 'Owen',
        lastName: 'Cole',
        age: 55,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      mother: {
        id: 'mom',
        role: 'mother',
        firstName: 'Irene',
        lastName: 'Cole',
        age: 53,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      wealth: 'comfortable',
    },
    relationships: [],
    education: { ...createInitialEducation(), currentStage: 'graduated' },
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function concern(
  catalogId: ConditionId,
  status: 'undiagnosed' | 'known' | 'closed' = 'known',
  overrides: Partial<ConditionRecord> = {},
): ConditionRecord {
  const listing = getConditionListing(catalogId);
  return {
    id: `${catalogId}-${overrides.acquiredAtAge ?? 30}`,
    catalogId,
    status,
    acquiredAtAge: 30,
    symptom: listing?.symptom ?? '',
    untreatedYears: 0,
    ...overrides,
  };
}

function withMockRandom<T>(value: number, run: () => T): T {
  const original = Math.random;
  Math.random = () => value;
  try {
    return run();
  } finally {
    Math.random = original;
  }
}

// 1. Acquisition-year protection: A newly acquired condition must not receive an untreated penalty in the same Age Up.
function testAcquisitionYearProtection() {
  // Age 15 -> 16, health 50 (qualifies for chest infection at 16)
  const young = character({
    age: 15,
    birthYear: 2000,
    stats: { health: 50, happiness: 70, smarts: 40, looks: 60, karma: 55 },
    healthcare: undefined,
  });

  const aged = withMockRandom(0.5, () => ageUpCharacter(young));
  assert(aged.age === 16, 'character aged up to 16');

  const conditions = (aged.healthcare?.conditions ?? []) as ConditionRecord[];
  const acquiredChest = conditions.find((c) => c.catalogId === 'chest');
  assert(acquiredChest !== undefined, 'chest infection acquired at age 16');
  assert(acquiredChest && acquiredChest.acquiredAtAge === 16, 'acquiredAtAge is 16');
  assert(acquiredChest && acquiredChest.untreatedYears === 0, 'untreatedYears is 0 in acquisition year');

  // Verify health did not receive the -12 untreated penalty in this age up
  // Projected health drift for age 16 is randomInt(-1, 1). With 0.5 mock random, drift is 0.
  // Chest penalty (-12) must NOT have been applied.
  assert(aged.stats.health >= 49, `same-year acquisition gave no penalty (health: ${aged.stats.health})`);

  // Now age up to 17: NOW the chest infection penalty (-12) should be applied!
  const agedAgain = withMockRandom(0.5, () => ageUpCharacter(aged));
  assert(agedAgain.age === 17, 'character aged up to 17');
  const chestAt17 = (agedAgain.healthcare?.conditions ?? []) as ConditionRecord[];
  const chest17 = chestAt17.find((c) => c.catalogId === 'chest');
  assert(chest17 !== undefined, 'chest remains open at age 17');
  assert(chest17 && chest17.untreatedYears === 1, 'untreatedYears is 1 after first year');
  assert(agedAgain.stats.health <= 38, `untreated penalty applied in year 2 (health: ${agedAgain.stats.health})`);
}

// 2. Chest infection progression schedule and treated close
function testChestInfectionProgressionAndTreatedClose() {
  // Branch A: Untreated chest infection closes after exactly 2 years of untreated progression
  const charWithChest = character({
    age: 20,
    healthcare: {
      conditions: [concern('chest', 'known', { acquiredAtAge: 20, untreatedYears: 0 })],
      visits: [],
    },
    stats: { health: 100, happiness: 70, smarts: 40, looks: 60, karma: 55 },
  });

  // Year 1 of untreated progression: 20 -> 21
  const year1 = withMockRandom(0.5, () => ageUpCharacter(charWithChest));
  const condsYear1 = (year1.healthcare?.conditions ?? []) as ConditionRecord[];
  const chestY1 = condsYear1.find((c) => c.id === 'chest-20');
  assert(chestY1 !== undefined && chestY1.status === 'known', 'chest stays known after year 1');
  assert(chestY1 && chestY1.untreatedYears === 1, 'untreatedYears is 1 after year 1');

  // Year 2 of untreated progression: 21 -> 22
  const year2 = withMockRandom(0.5, () => ageUpCharacter(year1));
  const condsYear2 = (year2.healthcare?.conditions ?? []) as ConditionRecord[];
  const chestY2 = condsYear2.find((c) => c.id === 'chest-20');
  assert(chestY2 !== undefined && chestY2.status === 'closed', 'chest closes after 2 untreated years');
  assert(chestY2 && chestY2.closure === 'recovered', 'chest closure is recovered');
  assert(chestY2 && chestY2.closedAtAge === 22, 'closedAtAge is 22');
  assert(chestY2 && chestY2.untreatedYears === 2, 'untreatedYears is 2');

  // Year 3: 22 -> 23: chest is closed, receives no further penalties
  const healthAt22 = year2.stats.health;
  const year3 = withMockRandom(0.5, () => ageUpCharacter(year2));
  assert(Math.abs(year3.stats.health - healthAt22) <= 1, 'no further health loss from closed chest');

  // Branch B: Treated chest infection closes at the next Age Up with no penalty
  const beforeTreatment = character({
    age: 25,
    cash: 500,
    healthcare: {
      conditions: [concern('chest', 'known', { id: 'chest-treat', acquiredAtAge: 25 })],
      visits: [],
    },
    stats: { health: 60, happiness: 70, smarts: 40, looks: 60, karma: 55 },
  });

  const treatedResult = startTreatment(beforeTreatment, 'chest-treat');
  assert(treatedResult.ok, 'treatment started successfully');
  assert(treatedResult.character.stats.health === 70, 'remedy gave +10 health');

  // Age up 25 -> 26: Treated course awaits close, should close with 0 penalty
  const agedTreated = withMockRandom(0.5, () => ageUpCharacter(treatedResult.character));
  const condsTreated = (agedTreated.healthcare?.conditions ?? []) as ConditionRecord[];
  const chestClosed = condsTreated.find((c) => c.id === 'chest-treat');
  assert(chestClosed !== undefined && chestClosed.status === 'closed', 'treated chest closed on age up');
  assert(chestClosed && chestClosed.closure === 'recovered', 'treated closure is recovered');
  assert(chestClosed && chestClosed.closedAtAge === 26, 'closedAtAge is 26');
  // Health should not have dropped by 12
  assert(agedTreated.stats.health >= 69, `health was preserved after treatment (health: ${agedTreated.stats.health})`);
}

// 3. Worn-joints and heart follow-up coverage do not charge twice
function testWornJointsAndHeartDoNotChargeTwice() {
  const charWithJoints = character({
    age: 60,
    cash: 500,
    healthcare: {
      conditions: [concern('joints', 'known', { id: 'joints-60', acquiredAtAge: 60 })],
      visits: [],
    },
    stats: { health: 70, happiness: 70, smarts: 40, looks: 60, karma: 55 },
  });

  // Enroll at 60: charges $80, covers age 60
  const enrolled = enrollCare(charWithJoints, 'joints-60');
  assert(enrolled.ok, 'enrolled in joints care');
  assert(enrolled.character.cash === 420, 'cash is 420 after $80 initial enrollment');

  // Age up 60 -> 61:
  // Year 60 was covered -> managed loss (-2).
  // Renewal for 61 charges $80 from cash -> cash becomes 340.
  const aged61 = withMockRandom(0.5, () => ageUpCharacter(enrolled.character));
  assert(aged61.cash === 340, `renewed once for $80 (cash: ${aged61.cash})`);
  const joints61 = ((aged61.healthcare?.conditions ?? []) as ConditionRecord[]).find((c) => c.id === 'joints-60');
  assert(joints61?.coverageThroughAge === 61, 'coverageThroughAge updated to 61');

  // Calling progressHealthcareForYear again for same year does not charge or penalize twice
  const repeated = progressHealthcareForYear(
    { ...enrolled.character, healthcare: aged61.healthcare },
    420,
  );
  assert(repeated.cashSpent === 0, 'repeated progress spends $0');
  assert(repeated.healthDelta === 0, 'repeated progress has 0 health delta');

  // Test Heart follow-up procedure and enrollment
  const charWithHeart = character({
    age: 70,
    cash: 1000,
    healthcare: {
      conditions: [concern('heart', 'known', { id: 'heart-70', acquiredAtAge: 70, procedureCompleted: true })],
      visits: [],
    },
    stats: { health: 60, happiness: 70, smarts: 40, looks: 60, karma: 55 },
  });

  const enrolledHeart = enrollCare(charWithHeart, 'heart-70');
  assert(enrolledHeart.ok, 'enrolled in heart follow-up');
  assert(enrolledHeart.character.cash === 940, 'cash is 940 after $60 enrollment');

  const agedHeart71 = withMockRandom(0.5, () => ageUpCharacter(enrolledHeart.character));
  // Managed loss (-4), renewed for $60 -> cash 880
  assert(agedHeart71.cash === 880, `heart renewed once for $60 (cash: ${agedHeart71.cash})`);
  const heart71 = ((agedHeart71.healthcare?.conditions ?? []) as ConditionRecord[]).find((c) => c.id === 'heart-70');
  assert(heart71?.coverageThroughAge === 71, 'heart coverageThroughAge updated to 71');
}

// 4. Failed renewals apply untreated penalties and do not automatically re-enroll
function testFailedRenewalsApplyUntreatedPenaltiesAndDoNotAutoReenroll() {
  const brokeWithJoints = character({
    age: 60,
    cash: 0, // Cannot afford renewal
    healthcare: {
      conditions: [
        concern('joints', 'known', {
          id: 'joints-broke',
          acquiredAtAge: 59,
          enrolled: true,
          coverageThroughAge: 60, // Year 60 was covered
        }),
      ],
      visits: [],
    },
    stats: { health: 70, happiness: 70, smarts: 40, looks: 60, karma: 55 },
  });

  // Age up 60 -> 61:
  // Year 60 was covered -> managed loss (-2).
  // Renewal for 61 attempted, but cash is $0 -> renewal fails, lapses (enrolled: false).
  const aged61 = withMockRandom(0.5, () => ageUpCharacter(brokeWithJoints));
  const conds61 = (aged61.healthcare?.conditions ?? []) as ConditionRecord[];
  const joints61 = conds61.find((c) => c.id === 'joints-broke');
  assert(joints61 !== undefined, 'joints condition exists');
  assert(joints61 && joints61.enrolled === false, 'renewal lapsed: enrolled is false');
  assert(joints61 && joints61.coverageThroughAge === 60, 'coverageThroughAge stayed at 60');

  // Now give the player money, but age up 61 -> 62:
  // Year 61 was NOT covered (coverage was only through 60).
  // Therefore, untreated penalty (-6) MUST apply!
  // And because enrolled is false, it must NOT automatically re-enroll despite having cash!
  const richAt61 = {
    ...aged61,
    cash: 2000,
  };

  const aged62 = withMockRandom(0.5, () => ageUpCharacter(richAt61));
  const conds62 = (aged62.healthcare?.conditions ?? []) as ConditionRecord[];
  const joints62 = conds62.find((c) => c.id === 'joints-broke');
  assert(joints62 !== undefined, 'joints condition exists');
  assert(joints62 && joints62.enrolled === false, 'did not automatically re-enroll');
  assert(joints62 && joints62.coverageThroughAge === 60, 'coverage was not renewed');
  assert(joints62 && joints62.untreatedYears === 1, 'untreatedYears incremented to 1');
  assert(aged62.cash === 2000, 'cash was not spent on lapsed care');
}

function makePet(): any {
  return {
    id: 'dog-1',
    name: 'Buddy',
    species: 'pet_dog',
    temperament: 'playful',
    petAge: 3,
    adoptedAtAge: 58,
    health: 80,
    attachment: 60,
    lastFedAge: null,
    lastPlayedAge: null,
    lastVetAge: null,
    lastMoment: 'You brought Buddy home from the shelter.',
    status: 'living',
  };
}

// 5. Property and pet expenses retain priority over healthcare
function testCashPriorityPropertyPetHealthcare() {
  const listing = getPropertyListing('studio_austin_loft');
  if (!listing) throw new Error('missing listing');

  const property: OwnedProperty = {
    id: 'prop-1',
    catalogId: listing.id,
    type: listing.type,
    name: listing.name,
    city: listing.city,
    purchasePrice: listing.purchasePrice,
    purchaseAge: 30,
    marketValue: 88000,
    mortgage: {
      originalPrincipal: 49600,
      principal: 49600,
      annualInterestRate: 0.04,
      annualPrincipalPayment: 1653,
    },
  };

  // Property takes 1984 (interest) + 1200 (maintenance) + 1653 (principal) = 4837.
  // Pet dog food takes $40.
  // Total priority expenses = 4877.
  // Give player $4900. Leftover after property and pet = $23.
  // Healthcare renewal for joints needs $80. $23 < $80 -> healthcare cannot afford renewal!
  const charWithExpenses = character({
    age: 60,
    cash: 4900,
    assets: {
      properties: [property],
    },
    pets: {
      animals: [makePet()],
    },
    healthcare: {
      conditions: [
        concern('joints', 'known', {
          id: 'joints-priority',
          acquiredAtAge: 59,
          enrolled: true,
          coverageThroughAge: 60,
        }),
      ],
      visits: [],
    },
  });

  const aged = withMockRandom(0.5, () => ageUpCharacter(charWithExpenses));

  // Property mortgage is paid
  const propAged = aged.assets?.properties?.[0] as OwnedProperty | undefined;
  assert(propAged && propAged.mortgage && propAged.mortgage.principal === 47947, 'property mortgage was paid');

  // Pet food is paid ($40)
  const petAged = aged.pets?.animals?.[0] as PetRecord | undefined;
  assert(petAged && petAged.lastFedAge === 60, 'pet food was paid');

  // Healthcare renewal for joints ($80) could not be afforded from leftover cash ($23)
  const jointsAged = ((aged.healthcare?.conditions ?? []) as ConditionRecord[]).find((c) => c.id === 'joints-priority');
  assert(jointsAged?.enrolled === false, 'healthcare renewal lapsed because prior expenses took priority');
}

// 6. Heart-related death attribution works when heart loss alone causes death
function testHeartRelatedDeathAttribution() {
  const terminalHeart = character({
    age: 74,
    stats: { health: 10, happiness: 70, smarts: 40, looks: 60, karma: 55 },
    healthcare: {
      conditions: [
        concern('heart', 'known', {
          id: 'heart-lethal',
          acquiredAtAge: 73,
          enrolled: false,
          untreatedYears: 1, // Untreated loss is -15
        }),
      ],
      visits: [],
    },
  });

  // Natural drift at age 75 with mock 0.5 is -1 or -2.
  // Without heart, health would be 10 - 2 = 8 (> 0).
  // With heart loss (-15), health drops to 0.
  // Heart loss alone is independently responsible!
  const deceased = withMockRandom(0.5, () => ageUpCharacter(terminalHeart));
  assert(deceased.isAlive === false, 'character died');
  assert(deceased.causeOfDeath === 'A tired heart', `cause of death is "A tired heart" (actual: ${deceased.causeOfDeath})`);

  const deathEvents = deceased.timeline.filter((e: LifeEvent) => e.category === 'misfortune' && e.title === 'Rest in Peace');
  assert(deathEvents.length === 1, 'death event logged');
  assert(deathEvents[0].message.includes('A tired heart'), 'timeline event names A tired heart as cause');
}

// 7. Generic poor-health death remains the cause when other health losses would already cause death
function testGenericPoorHealthDeathWhenOtherHealthLossCausesDeath() {
  const frailChar = character({
    age: 74,
    stats: { health: 1, happiness: 70, smarts: 40, looks: 60, karma: 55 },
    healthcare: {
      conditions: [
        concern('heart', 'known', {
          id: 'heart-frail',
          acquiredAtAge: 73,
          enrolled: false,
          untreatedYears: 1, // -15
        }),
      ],
      visits: [],
    },
  });

  // Natural drift at age 75 with mock 0.5 is negative (-1 or -2).
  // Without heart, health is 1 - 2 <= 0.
  // Heart loss is NOT independently responsible!
  const deceased = withMockRandom(0.5, () => ageUpCharacter(frailChar));
  assert(deceased.isAlive === false, 'character died');
  assert(
    deceased.causeOfDeath === 'Succumbed to poor health',
    `generic cause preserved when other health losses already cause death (actual: ${deceased.causeOfDeath})`,
  );
}

// 8. Existing old-age mortality behavior is unchanged
function testOldAgeMortalityPreserved() {
  const elder = character({
    age: 80,
    stats: { health: 70, happiness: 70, smarts: 40, looks: 60, karma: 55 },
    healthcare: undefined,
  });

  // Mock random close to 0 to trigger rollNaturalOldAgeDeath (which rolls chance)
  const deceased = withMockRandom(0.01, () => ageUpCharacter(elder));
  assert(deceased.isAlive === false, 'elder died of natural old age');
  assert(
    deceased.causeOfDeath === 'Passed away peacefully in sleep of old age',
    `natural old age cause of death preserved (actual: ${deceased.causeOfDeath})`,
  );
}

// 9. Repeated or invalid annual progression cannot charge or penalize twice
function testRepeatedAndInvalidProgressionSafety() {
  const char = character({
    age: 40,
    cash: 500,
    healthcare: {
      conditions: [concern('cold', 'known', { acquiredAtAge: 39, untreatedYears: 0 })],
      visits: [],
    },
    stats: { health: 80, happiness: 70, smarts: 40, looks: 60, karma: 55 },
  });

  const progress1 = progressHealthcareForYear(char, 500);
  assert(progress1.healthDelta === -6, 'first pass applied untreated cold (-6)');
  assert(progress1.healthcare?.lastProgressedAge === 40, 'lastProgressedAge stamped');

  const charAfter1 = {
    ...char,
    healthcare: progress1.healthcare,
  };

  // Repeated call on the same year
  const progress2 = progressHealthcareForYear(charAfter1, 500);
  assert(progress2.cashSpent === 0, 'second pass spent $0');
  assert(progress2.healthDelta === 0, 'second pass applied 0 health delta');
  assert(progress2.happinessDelta === 0, 'second pass applied 0 happiness delta');

  // Dead character safety
  const deadChar = character({ isAlive: false });
  const deadProgress = progressHealthcareForYear(deadChar, 500);
  assert(deadProgress.cashSpent === 0 && deadProgress.healthDelta === 0, 'dead character is a no-op');

  // Corrupted healthcare object safety
  const badChar = character({
    healthcare: {
      conditions: 'not an array' as unknown as unknown[],
      visits: [],
    },
  });
  const badProgress = progressHealthcareForYear(badChar, 500);
  assert(badProgress.cashSpent === 0 && badProgress.healthDelta === 0, 'corrupted record returns safe no-op');
}

// RUN ALL TESTS
testAcquisitionYearProtection();
testChestInfectionProgressionAndTreatedClose();
testWornJointsAndHeartDoNotChargeTwice();
testFailedRenewalsApplyUntreatedPenaltiesAndDoNotAutoReenroll();
testCashPriorityPropertyPetHealthcare();
testHeartRelatedDeathAttribution();
testGenericPoorHealthDeathWhenOtherHealthLossCausesDeath();
testOldAgeMortalityPreserved();
testRepeatedAndInvalidProgressionSafety();

console.log('--- ALL MODULE 10.3 HEALTHCARE ANNUAL PROGRESSION & AGE UP TESTS PASSED PERFECTLY! ---');
