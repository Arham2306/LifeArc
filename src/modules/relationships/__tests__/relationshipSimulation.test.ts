import type { CharacterProfile, SiblingProfile } from '../../../types/game';
import { generateParents, generateSiblings, getSiblingOccupation } from '../../character/services/familyService';
import { createInitialEducation } from '../../education/services/educationService';
import { createInitialCareerState } from '../../career/services/careerService';
import { ageUpCharacter } from '../../aging/services/agingService';
import {
  executeSocialAction,
  findNewFriend,
  hasPerformedActionThisYear,
} from '../services/relationshipService';
import { GIFT_CATALOG } from '../data/socialInteractions';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function createMockCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const parents = generateParents('Sterling');
  return {
    id: 'char_rel_test',
    firstName: 'Miles',
    lastName: 'Sterling',
    gender: 'male',
    age: 16,
    birthYear: 2010,
    city: 'Chicago',
    country: 'United States',
    isAlive: true,
    stats: {
      health: 90,
      happiness: 80,
      smarts: 75,
      looks: 80,
      karma: 95,
    },
    cash: 500,
    bankBalance: 0,
    netWorth: 500,
    occupation: 'High School Student',
    parents,
    siblings: [
      {
        id: 'sib_1',
        role: 'sister',
        firstName: 'Chloe',
        lastName: 'Sterling',
        age: 18,
        gender: 'female',
        relationship: 85,
        occupation: 'High School Student',
        isAlive: true,
        birthOrder: 'older',
      },
      {
        id: 'sib_2',
        role: 'brother',
        firstName: 'Leo',
        lastName: 'Sterling',
        age: 10,
        gender: 'male',
        relationship: 90,
        occupation: 'Elementary Student',
        isAlive: true,
        birthOrder: 'younger',
      },
    ],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    relationships: [
      {
        id: 'friend_1',
        firstName: 'Sam',
        lastName: 'Parker',
        gender: 'male',
        age: 16,
        role: 'Classmate',
        relationshipType: 'friend',
        relationship: 70,
        originStory: 'Met in biology lab.',
        stageMet: 'high_school',
      },
    ],
    yearlySocialActions: {},
    seenEventIds: [],
    timeline: [],
    ...overrides,
  };
}

console.log('--- STARTING MODULE 6: RELATIONSHIPS & SOCIAL HUB TESTS ---');

// Test 1: Sibling Generation & Occupation Progression
let totalSiblingsSample = 0;
for (let i = 0; i < 50; i++) {
  const sample = generateSiblings('Sterling', 32);
  totalSiblingsSample += sample.length;
}
assert(totalSiblingsSample > 0, 'Generates realistic siblings distribution across iterations');
assert(getSiblingOccupation(2) === 'Infant', 'Age 2 resolves to Infant');
assert(getSiblingOccupation(8) === 'Elementary Student', 'Age 8 resolves to Elementary Student');
assert(getSiblingOccupation(15) === 'High School Student', 'Age 15 resolves to High School Student');
assert(getSiblingOccupation(20) === 'University Student', 'Age 20 resolves to University Student');
console.log('✅ Sibling Generation & Education Progression verified');

// Test 2: Social Action - Spend Time
const char = createMockCharacter();
const targetMother = {
  id: char.parents.mother.id,
  name: `${char.parents.mother.firstName} ${char.parents.mother.lastName}`,
  role: 'Mother',
  type: 'parent' as const,
  relationship: char.parents.mother.relationship,
  generosity: char.parents.mother.generosity,
  wealth: char.parents.wealth,
  isAlive: char.parents.mother.isAlive,
  age: char.parents.mother.age,
};

const initialMotherRel = char.parents.mother.relationship;
const { character: afterSpendTime, outcome: spendOutcome } = executeSocialAction(
  char,
  targetMother,
  'spend_time',
  undefined,
  'hangout_pizza'
);

assert(spendOutcome.success === true, 'Spend time succeeds');
assert(spendOutcome.headline === 'Pizza & Show Binge', 'Headline matches chosen activity');
assert(afterSpendTime.parents.mother.relationship > initialMotherRel, 'Mother relationship increased');
assert(afterSpendTime.timeline.length > 0, 'Journal timeline logged the hangout');
assert(
  hasPerformedActionThisYear(afterSpendTime, targetMother.id, 'spend_time') === true,
  'Spend time marked as performed this year'
);
console.log(`✅ Spend Time: Relationship increased (${initialMotherRel}% -> ${afterSpendTime.parents.mother.relationship}%) with chosen activity "${spendOutcome.headline}"`);

// Test 3: Social Action - Conversation with Specific Topic
const targetSibling: SiblingProfile = afterSpendTime.siblings![0];
const targetSibRef = {
  id: targetSibling.id,
  name: `${targetSibling.firstName} ${targetSibling.lastName}`,
  role: 'Sister',
  type: 'sibling' as const,
  relationship: targetSibling.relationship,
  isAlive: targetSibling.isAlive,
  age: targetSibling.age,
};

const { character: afterChat, outcome: chatOutcome } = executeSocialAction(
  afterSpendTime,
  targetSibRef,
  'conversation',
  undefined,
  'chat_nostalgia'
);

assert(chatOutcome.headline.length > 0, 'Conversation produced dialogue outcome');
assert(
  hasPerformedActionThisYear(afterChat, targetSibRef.id, 'conversation') === true,
  'Conversation recorded in yearly cooldowns'
);
console.log(`✅ Conversation: Produced outcome "${chatOutcome.headline}" (Delta: ${chatOutcome.relationshipDelta}%) for chosen topic`);

// Test 4: Social Action - Insult with Specific Roast
const initialKarma = afterChat.stats.karma;
const { character: afterInsult, outcome: insultOutcome } = executeSocialAction(
  afterChat,
  targetSibRef,
  'insult',
  undefined,
  'insult_haircut'
);

assert(insultOutcome.success === false, 'Insult flagged as conflict');
assert(insultOutcome.narrative.includes('haircut'), 'Insult narrative contains chosen roast');
assert(insultOutcome.relationshipDelta < 0, 'Insult reduced relationship significantly');
assert(afterInsult.stats.karma < initialKarma, 'Insult reduced character karma');
assert(
  hasPerformedActionThisYear(afterInsult, targetSibRef.id, 'insult') === false,
  'Insults are unblocked and not restricted by 1x annual cooldown'
);
console.log(`✅ Insult: Correctly punished relationship (${insultOutcome.relationshipDelta}%) with chosen roast`);

// Test 5: Social Action - Give Gift (Cost & Rel Boost)
const initialCash = afterInsult.cash;
const artisanGift = GIFT_CATALOG.find((g) => g.id === 'gift_artisan_chocolates')!;
const { character: afterGift, outcome: giftOutcome } = executeSocialAction(
  afterInsult,
  targetMother,
  'give_gift',
  artisanGift
);

assert(giftOutcome.success === true, 'Gift delivered successfully');
assert(afterGift.cash === initialCash - artisanGift.cost, 'Gift purchase deducted cash ($35)');
assert(giftOutcome.relationshipDelta >= 10, 'Thoughtful gift gave substantial relationship boost');
console.log(`✅ Give Gift: Delivered ${artisanGift.name} ($35), boosted relationship +${giftOutcome.relationshipDelta}%`);

// Test 6: Social Action - Ask for Money
const wealthyChar = createMockCharacter({
  cash: 10,
  parents: {
    ...char.parents,
    wealth: 'wealthy',
    father: {
      ...char.parents.father,
      generosity: 95,
      relationship: 95,
    },
  },
});

const targetFather = {
  id: wealthyChar.parents.father.id,
  name: `${wealthyChar.parents.father.firstName} ${wealthyChar.parents.father.lastName}`,
  role: 'Father',
  type: 'parent' as const,
  relationship: wealthyChar.parents.father.relationship,
  generosity: wealthyChar.parents.father.generosity,
  wealth: wealthyChar.parents.wealth,
  isAlive: wealthyChar.parents.father.isAlive,
  age: wealthyChar.parents.father.age,
};

const { character: afterAskMoney, outcome: moneyOutcome } = executeSocialAction(
  wealthyChar,
  targetFather,
  'ask_money'
);

assert(moneyOutcome.success === true, 'Generous wealthy father approved allowance');
assert(afterAskMoney.cash > 10, 'Player received cash from generous father');
console.log(`✅ Ask for Money: Generous father gave $${moneyOutcome.cashDelta?.toLocaleString()}`);

// Test 7: Meet New People / Friend Discovery
const { character: withNewFriend, friend: discoveredFriend } = findNewFriend(char);
assert(withNewFriend.relationships.length === char.relationships.length + 1, 'Friend added to relationships list');
assert(discoveredFriend.relationship >= 50, 'Discovered friend has healthy initial rapport');
console.log(`✅ Friend Discovery: Met ${discoveredFriend.firstName} ${discoveredFriend.lastName} (${discoveredFriend.role})`);

// Test 8: Aging Lifecycle Integration
const agedChar = ageUpCharacter(afterGift);
assert(agedChar.age === afterGift.age + 1, 'Character aged up +1 year');
assert(agedChar.siblings![0].age === afterGift.siblings![0].age + 1, 'Older sibling aged up +1 year');
assert(agedChar.siblings![1].age === afterGift.siblings![1].age + 1, 'Younger sibling aged up +1 year');
assert(
  hasPerformedActionThisYear(agedChar, targetMother.id, 'spend_time') === false,
  'Yearly social actions reset upon Age-Up'
);
console.log('✅ Annual Aging: Siblings aged up properly and social action cooldowns were reset');

// Test 9: Dynamic Early-Childhood Baby Sibling Birth
let babySiblingBorn = false;
for (let trial = 0; trial < 15 && !babySiblingBorn; trial++) {
  let childhoodSim = createMockCharacter({
    age: 1,
    birthYear: 2025,
    parents: {
      ...char.parents,
      mother: { ...char.parents.mother, age: 25, isAlive: true },
      father: { ...char.parents.father, age: 27, isAlive: true },
    },
    siblings: [],
  });

  for (let yr = 0; yr < 9; yr++) {
    childhoodSim = ageUpCharacter(childhoodSim);
    if (childhoodSim.siblings && childhoodSim.siblings.length > 0) {
      babySiblingBorn = true;
      break;
    }
  }
}

assert(babySiblingBorn === true, 'Dynamic baby sibling successfully born during early childhood across trials (Option A)');
console.log(`✅ Dynamic Sibling Birth: Successfully welcomed a baby sibling during childhood!`);

// Test 10: Partner Synchronization & Social Action Sync
const partnerProfile = {
  id: 'partner_test_1',
  firstName: 'Elena',
  lastName: 'Rostova',
  gender: 'female' as const,
  age: 17,
  role: 'Girlfriend',
  relationshipType: 'dating' as const,
  romanticStage: 'dating' as const,
  relationship: 75,
  romanceUnlocked: true,
  romanceMeter: 60,
  originStory: 'Met at homecoming dance.',
  stageMet: 'high_school' as const,
};

const charWithPartner = createMockCharacter({
  partner: partnerProfile,
  relationships: [partnerProfile],
});

const targetPartnerRef = {
  id: partnerProfile.id,
  name: 'Elena Rostova',
  role: 'Girlfriend',
  type: 'friend' as const,
  relationship: partnerProfile.relationship,
  isAlive: true,
  age: partnerProfile.age,
  romanceUnlocked: true,
  romanceMeter: 60,
  romanticStage: 'dating' as const,
};

const { character: afterPartnerHangout } = executeSocialAction(
  charWithPartner,
  targetPartnerRef,
  'spend_time',
  undefined,
  'hangout_pizza'
);

assert(afterPartnerHangout.partner !== null, 'Partner profile preserved');
assert(afterPartnerHangout.partner?.relationship! > 75, 'Partner relationship in character.partner updated by social action');
assert(
  afterPartnerHangout.relationships.find((r) => r.id === partnerProfile.id)?.relationship! > 75,
  'Partner relationship in character.relationships updated in sync'
);

// Test auto-recovery of partner upon aging if character.partner was missing but relationships has dating partner
const charWithOrphanPartner = createMockCharacter({
  partner: null,
  relationships: [partnerProfile],
});
const agedRecovered = ageUpCharacter(charWithOrphanPartner);
assert(agedRecovered.partner !== null, 'Auto-recovered partner upon Age-Up from relationships');
assert(agedRecovered.partner?.firstName === 'Elena', 'Recovered correct partner details');
console.log(`✅ Partner Synchronization: Partner social actions and auto-recovery verified!`);

// Test 11: Children in Family Relationships
const testChild: ChildProfile = {
  id: 'child_1',
  firstName: 'Oliver',
  lastName: 'Sterling',
  age: 4,
  gender: 'male',
  relationship: 85,
  smarts: 75,
  looks: 80,
  happiness: 90,
  health: 95,
  isAdopted: false,
  occupation: 'Preschooler',
  isAlive: true,
};

const charWithChildren = createMockCharacter({
  children: [testChild],
});
assert(charWithChildren.children !== undefined, 'Children array exists on character');
assert(charWithChildren.children!.length === 1, '1 Child in character household');
assert(charWithChildren.children![0].firstName === 'Oliver', 'Child name matches');

// Test aging up preserves child and increments age
const agedParent = ageUpCharacter(charWithChildren);
assert(agedParent.children !== undefined, 'Children preserved after age-up');
assert(agedParent.children![0].age === 5, 'Child aged from 4 to 5');
console.log(`✅ Children in Family: Oliver properly tracked, aged, and recognized in family relationships!`);

console.log('--- ALL MODULE 6 RELATIONSHIPS & SOCIAL HUB TESTS PASSED PERFECTLY! ---');
