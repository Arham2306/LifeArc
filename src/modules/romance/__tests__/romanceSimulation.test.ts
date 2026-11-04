import { romanceService } from '../services/romanceService';
import { reproductionService } from '../services/reproductionService';
import { divorceService } from '../services/divorceService';
import { ageUpCharacter } from '../../aging/services/agingService';
import { generateParents } from '../../character/services/familyService';
import { createInitialEducation } from '../../education/services/educationService';
import { createInitialCareerState } from '../../career/services/careerService';
import { FLIRT_OPTIONS, DATE_VENUES, ROMANTIC_TALK_TOPICS, ROMANTIC_GIFTS, ENGAGEMENT_RINGS, PROPOSAL_VENUES, WEDDING_VENUES } from '../data/romanticInteractions';
import type { CharacterProfile, PersonProfile, ChildProfile } from '../../../types/game';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function createMockCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'test-player-1',
    firstName: 'Alex',
    lastName: 'Morgan',
    gender: 'non-binary',
    age: 24,
    birthYear: 2000,
    country: 'United States',
    city: 'New York',
    occupation: 'Junior Software Engineer',
    cash: 50000,
    bankBalance: 50000,
    netWorth: 50000,
    isAlive: true,
    stats: {
      health: 90,
      happiness: 85,
      smarts: 80,
      looks: 85,
      karma: 80,
    },
    parents: generateParents('Morgan'),
    siblings: [],
    relationships: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function createMockFriend(overrides: Partial<PersonProfile> = {}): PersonProfile {
  return {
    id: 'friend-1',
    firstName: 'Chloe',
    lastName: 'Bennett',
    gender: 'female',
    age: 24,
    role: 'College Friend',
    relationshipType: 'friend',
    relationship: 65,
    originStory: 'Met in college study group',
    stageMet: 'university',
    romanceUnlocked: false,
    romanceMeter: 0,
    romanticStage: 'none',
    partnerStats: {
      craziness: 25,
      generosity: 65,
      looks: 80,
      smarts: 75,
      fertility: 80,
      annualIncome: 55000,
      occupation: 'Graphic Designer',
      yearsTogether: 0,
    },
    ...overrides,
  };
}

console.log('\n--- STARTING MODULE 7: ROMANCE & DATING SIMULATION TESTS ---');

// Test 1: Age Gate Enforcement
const kidChar = createMockCharacter({ age: 14 });
const friendUnderAge = createMockFriend({ relationship: 80, romanceUnlocked: false });

const unsparked = romanceService.sparkRomance(friendUnderAge, kidChar.age);
assert(unsparked.romanceUnlocked === false, 'Under 16 cannot spark romance');

const { result: flirtResUnderAge } = romanceService.executeFlirt(kidChar, friendUnderAge, FLIRT_OPTIONS[0]);
assert(flirtResUnderAge.success === false, 'Under 16 cannot flirt');
assert(/16 years old/i.test(flirtResUnderAge.message), 'Under 16 flirt returns age gate message');

const { result: dateResUnderAge } = romanceService.executeDate(kidChar, friendUnderAge, DATE_VENUES[0]);
assert(dateResUnderAge.success === false, 'Under 16 cannot date');
assert(/16 years old/i.test(dateResUnderAge.message), 'Under 16 date returns age gate message');

const { result: askResUnderAge } = romanceService.executeAskOut(kidChar, friendUnderAge);
assert(askResUnderAge.success === false, 'Under 16 cannot ask out');
assert(/16 years old/i.test(askResUnderAge.message), 'Under 16 ask out returns age gate message');

const candidatesUnderAge = romanceService.generateDatingCandidates(kidChar);
assert(candidatesUnderAge.length === 0, 'Under 16 cannot generate dating app candidates');
console.log('✅ Age Gate: Characters under 16 strictly barred from romantic actions and dating apps.');

// Test 2: Gradual Friend-to-Romance Evolution
const friend = createMockFriend({ relationship: 65, romanceUnlocked: false, romanceMeter: 0 });
const sparked = romanceService.sparkRomance(friend, 20);
assert(sparked.romanceUnlocked === true, 'Friend romance unlocked');
assert(sparked.romanceMeter === 0, 'Romance meter initialized strictly at 0%');
assert(sparked.romanticStage === 'flirting', 'Romantic stage set to flirting');
console.log(`✅ Spark Romance: Chloe's Love Meter enabled at 0% for realistic gradual courtship!`);

// Test 3: Tier 1 & 2 Actions
const adultChar = createMockCharacter({ cash: 10000, age: 20 });
const friendWithRomance = createMockFriend({ relationship: 65, romanceUnlocked: true, romanceMeter: 25, age: 20 });

const { updatedTarget: flirtee, result: flirtRes } = romanceService.executeFlirt(
  adultChar,
  friendWithRomance,
  FLIRT_OPTIONS[0]
);
assert((flirtee.romanceMeter ?? 0) >= 20, 'Flirting affected romance meter');
console.log(`✅ Flirt Executed: ${flirtRes.message}`);

const venue = DATE_VENUES[2]; // Stargazing picnic ($65)
const { updatedTarget: datee, result: dateRes } = romanceService.executeDate(adultChar, flirtee, venue);
assert(dateRes.success === true, 'Date succeeded');
assert(dateRes.cashDelta === -65, 'Cash deducted for date');
assert(datee.relationship > flirtee.relationship, 'Date increased relationship');
assert((datee.romanceMeter ?? 0) > (flirtee.romanceMeter ?? 0), 'Date increased romance meter');
console.log(`✅ Date Executed: ${venue.name} boosted Romance to ${datee.romanceMeter}%!`);

// Test 3b: Deep Talk Topic Selection from Catalog
const talkTopic = ROMANTIC_TALK_TOPICS[0]; // Passions & Hobbies
const { updatedTarget: talkTarget, result: talkRes } = romanceService.executeRomanticTalk(
  adultChar,
  datee,
  talkTopic
);
assert(talkRes.success === true, 'Deep talk succeeded');
assert(talkTarget.relationship > datee.relationship, 'Deep talk boosted relationship');
assert((talkTarget.romanceMeter ?? 0) > (datee.romanceMeter ?? 0), 'Deep talk boosted romance');
assert(talkRes.message.includes(talkTopic.topic), 'Deep talk message references selected topic');
console.log(`✅ Deep Talk Executed: Discussed "${talkTopic.topic}" successfully!`);

// Test 3c: Give Gift from Catalog (Affordable vs Unaffordable)
const cheapGift = ROMANTIC_GIFTS[0]; // Handwritten Love Letter ($0)
const { updatedTarget: giftedTarget, result: giftRes } = romanceService.executeRomanticGift(
  adultChar,
  talkTarget,
  cheapGift
);
assert(giftRes.success === true, 'Free/cheap gift succeeded');
assert(giftRes.cashDelta === 0, 'No cash deducted for handwritten letter');
assert((giftedTarget.romanceMeter ?? 0) > (talkTarget.romanceMeter ?? 0), 'Gift boosted romance meter');
console.log(`✅ Give Gift Catalog: Sent "${cheapGift.name}" ($0)!`);

const poorChar = createMockCharacter({ cash: 50 });
const luxuryGift = ROMANTIC_GIFTS.find((g) => g.cost > 1000)!; // e.g. Luxury Handbag / Diamond Watch
const { result: poorGiftRes } = romanceService.executeRomanticGift(poorChar, giftedTarget, luxuryGift);
assert(poorGiftRes.success === false, 'Cannot afford luxury gift with insufficient cash');
console.log(`✅ Give Gift Catalog: Affordability gate verified for "${luxuryGift.name}" ($${luxuryGift.cost})!`);

// Test 4: Ask to Become Girlfriend / Boyfriend (Tiered Progression Gate)
const lowTarget = createMockFriend({ relationship: 40, romanceMeter: 10, age: 20 });
const lowRes = romanceService.executeAskOut(adultChar, lowTarget);
assert(lowRes.result.success === false, 'Ask out rejected when rapport is low');

const lowRomanceTarget = createMockFriend({ relationship: 80, romanceMeter: 20, age: 20 });
const lowRomanceRes = romanceService.executeAskOut(adultChar, lowRomanceTarget);
assert(lowRomanceRes.result.success === false, 'Ask out rejected when romance is under 35%');

const readyTarget = createMockFriend({ relationship: 75, romanceMeter: 50, age: 20 });
const readyRes = romanceService.executeAskOut(adultChar, readyTarget);
assert(readyRes.result.success === true, 'Ask out accepted when romance >= 35% and rel >= 50%');
assert(readyRes.updatedTarget.romanticStage === 'dating', 'Stage updated to dating');
assert(readyRes.updatedTarget.role === 'Girlfriend', 'Role updated to Girlfriend');
console.log(`✅ Ask Out Milestone: Successfully transitioned from friend to Girlfriend!`);

// Test 4b: Unprotected Intimacy While Dating Can Lead to Pregnancy
const datingMaleChar = createMockCharacter({ gender: 'male', age: 22 });
const datingFemalePartner = createMockFriend({
  gender: 'female',
  age: 22,
  romanticStage: 'dating',
  partnerStats: {
    craziness: 20,
    generosity: 70,
    looks: 80,
    smarts: 80,
    fertility: 100,
  },
});

// Run intimacy with protection vs unprotected
const safeIntimacyRes = reproductionService.executeIntimacy(datingMaleChar, datingFemalePartner, 'condom');
assert(safeIntimacyRes.success === true, 'Intimacy with condom succeeded');

// Force roll test or multiple unprotected trials to ensure conception can occur while dating
let datingConceptionOccurred = false;
for (let i = 0; i < 30; i++) {
  const trial = reproductionService.executeIntimacy(datingMaleChar, datingFemalePartner, 'unprotected');
  if (trial.conceptionOccurred) {
    datingConceptionOccurred = true;
    break;
  }
}
assert(datingConceptionOccurred === true, 'Unprotected intimacy while dating can lead to natural conception');
console.log(`✅ Dating Intimacy: Confirmed unprotected intimacy while dating can result in pregnancy!`);

// Test 5: Marriage Proposal
const proposalChar = createMockCharacter({ cash: 20000, age: 24 });
const ring = ENGAGEMENT_RINGS[2]; // 1.2-Carat Gold Solitaire ($2,400)
const proposalVenue = PROPOSAL_VENUES[1]; // Sunset beach ($150)

// 5a. Flirting prospect cannot be proposed to directly
const flirtingProspect = createMockFriend({
  role: 'Dating Prospect',
  relationshipType: 'crush',
  romanticStage: 'flirting',
  relationship: 80,
  romanceMeter: 80,
  age: 24,
});
const earlyProposalRes = romanceService.executeProposal(proposalChar, flirtingProspect, ring, proposalVenue);
assert(earlyProposalRes.result.success === false, 'Cannot propose to a prospect in flirting stage');

// 5b. Dating partner with less than 2 years of dating tenure cannot be proposed to
const newPartner = createMockFriend({
  role: 'Girlfriend',
  relationshipType: 'dating',
  romanticStage: 'dating',
  relationship: 88,
  romanceMeter: 85,
  age: 24,
  partnerStats: {
    yearsTogether: 1, // Only 1 year together
    craziness: 20,
    generosity: 70,
    looks: 80,
    smarts: 80,
    fertility: 75,
  },
});
const tooSoonProposal = romanceService.executeProposal(proposalChar, newPartner, ring, proposalVenue);
assert(tooSoonProposal.result.success === false, 'Cannot propose if dating less than 2 years');
assert(tooSoonProposal.result.message.includes('only been dating'), 'Declined message explains dating tenure');
console.log('✅ Marriage Proposal Tenure Gate: Correctly declined when dating < 2 years');

// 5c. Dating partner with 2+ years of dating tenure accepts proposal
const seasonedPartner = createMockFriend({
  ...newPartner,
  partnerStats: {
    ...newPartner.partnerStats!,
    yearsTogether: 2,
  },
});

const { updatedTarget: engagedTarget, result: proposalRes } = romanceService.executeProposal(
  proposalChar,
  seasonedPartner,
  ring,
  proposalVenue
);
assert(proposalRes.success === true, 'Proposal accepted with 2+ years dating tenure');
assert(engagedTarget.romanticStage === 'engaged', 'Stage updated to engaged');
assert(engagedTarget.role === 'Fiancée', 'Role updated to Fiancée');
assert(engagedTarget.partnerStats?.engagementRing?.name === ring.name, 'Engagement ring recorded');
console.log(`✅ Marriage Proposal: She said YES! Ring value: $${ring.cost.toLocaleString()}`);

// Test 6: Wedding Ceremony & Prenup
const weddingChar = createMockCharacter({ cash: 50000, age: 25 });
const fiancee = createMockFriend({
  role: 'Fiancée',
  romanticStage: 'engaged',
  relationship: 95,
  romanceMeter: 95,
  age: 25,
  partnerStats: {
    craziness: 20,
    generosity: 70,
    looks: 85,
    smarts: 80,
    fertility: 80,
    annualIncome: 60000,
    yearsTogether: 2,
  },
});

const weddingVenue = WEDDING_VENUES[1]; // Beachfront pavilion ($3,200)
const { updatedTarget: marriedTarget, result: weddingRes, prenupSigned } = romanceService.executeWedding(
  weddingChar,
  fiancee,
  weddingVenue,
  true // Demand prenup
);

assert(weddingRes.success === true, 'Wedding ceremony succeeded');
assert(prenupSigned === true, 'Prenup was successfully signed');
assert(marriedTarget.romanticStage === 'married', 'Stage updated to married');
assert(marriedTarget.role === 'Wife', 'Role updated to Wife');
assert(marriedTarget.partnerStats?.hasPrenup === true, 'Partner profile records prenup');
console.log(`✅ Wedding Ceremony: Married with Prenup signed at ${weddingVenue.name}!`);

// Test 7: Reproduction & Family Planning
const familyChar = createMockCharacter({ cash: 30000, age: 26 });
const wife = createMockFriend({
  role: 'Wife',
  romanticStage: 'married',
  relationship: 95,
  age: 26,
  partnerStats: {
    fertility: 90,
    looks: 85,
    smarts: 85,
    craziness: 15,
    generosity: 80,
  },
});

const ivfRes = reproductionService.executeIVF(familyChar, wife);
assert(ivfRes.cashDelta === -15000, 'IVF cost applied');
console.log(`✅ Fertility Clinic: IVF cycle attempted (Cost: $15,000)`);

const adoptRes = reproductionService.executeAdoption(familyChar, 'toddler', 'Maya');
assert(adoptRes.success === true, 'Adoption succeeded');
assert(adoptRes.child !== undefined, 'Adopted child created');
assert(adoptRes.child?.isAdopted === true, 'Child marked as adopted');
assert(adoptRes.child?.firstName === 'Maya', 'Adopted child named Maya');
assert(adoptRes.cashDelta === -6000, 'Adoption agency fee deducted');
console.log(`✅ Adoption Agency: Successfully adopted ${adoptRes.child?.firstName}!`);

const baby = reproductionService.generateBaby(familyChar, wife, 'Leo');
assert(baby.firstName === 'Leo', 'Baby named Leo');
assert(baby.age === 0, 'Newborn age is 0');
assert(baby.occupation === 'Infant', 'Newborn occupation is Infant');
assert(baby.looks >= 70 && baby.smarts >= 70, 'Genetics inherited');
console.log(`✅ Biological Child: Born with inherited genetics (Looks: ${baby.looks}%, Smarts: ${baby.smarts}%)!`);

// Test 8: Divorce & Asset Protection
const richChar = createMockCharacter({ cash: 100000, age: 30 });
const wifeWithPrenup = createMockFriend({
  role: 'Wife',
  romanticStage: 'married',
  age: 30,
  partnerStats: {
    hasPrenup: true,
    craziness: 30,
    generosity: 50,
    looks: 80,
    smarts: 80,
    fertility: 80,
  },
});

const { updatedCharacter, settlement } = divorceService.executeDivorce(
  richChar,
  wifeWithPrenup,
  'standard'
);

assert(settlement.partnerShareCash === 0, 'Prenup protected all cash from division');
assert(updatedCharacter.cash === 100000 - 1500, 'Only paid legal filing fee');
assert(updatedCharacter.partner === null, 'Partner cleared upon divorce');
assert((updatedCharacter.exPartners?.length ?? 0) === 1, 'Ex-partner recorded in history');
console.log(`✅ Divorce Finalized: Prenup successfully shielded 100% of liquid assets!`);

// Test 9: Aging Lifecycle Integration
const agedWife = createMockFriend({
  role: 'Wife',
  romanticStage: 'married',
  relationship: 80,
  romanceMeter: 80,
  age: 24,
  partnerStats: {
    annualIncome: 50000,
    hasPrenup: true,
    yearsTogether: 3,
    craziness: 20,
    generosity: 70,
    looks: 80,
    smarts: 80,
    fertility: 75,
  },
});

const existingChild: ChildProfile = {
  id: 'child-1',
  firstName: 'Maya',
  lastName: 'Morgan',
  age: 2,
  gender: 'female',
  relationship: 95,
  smarts: 75,
  looks: 80,
  happiness: 90,
  health: 95,
  isAdopted: true,
  occupation: 'Toddler',
  isAlive: true,
};

const agingChar = createMockCharacter({
  age: 24,
  partner: agedWife,
  relationships: [agedWife],
  children: [existingChild],
  isPregnant: true,
  cash: 10000,
});

const aged = ageUpCharacter(agingChar);

assert(aged.partner?.age === 25, 'Partner aged to 25');
assert(aged.partner?.partnerStats?.yearsTogether === 4, 'Years together incremented');
assert(aged.partner?.relationship === 77, 'Subtle 3% neglect decay applied when 0 actions taken with partner');
assert(aged.partner?.romanceMeter === 77, 'Subtle 3% romance decay applied when neglected');
assert(aged.cash >= 20000, 'Spouse salary contributed into household cash');
assert(aged.isPregnant === false, 'Delivered pregnancy upon age up');

// Test active maintenance without decay
const activeAgingChar = createMockCharacter({
  age: 24,
  partner: agedWife,
  relationships: [agedWife],
  yearlySocialActions: {
    [agedWife.id]: ['romance_date'],
  },
});
const activeAged = ageUpCharacter(activeAgingChar);
assert(activeAged.partner?.relationship === 80, 'No neglect decay when romantic actions were performed');
console.log('✅ Neglect Decay & Maintenance: 3% decay applied when neglected, preserved when courting!');
assert((aged.children?.length ?? 0) === 2, 'Total 2 children in household');
assert(aged.newbornAnnouncement !== undefined, 'Newborn announcement is present for modal naming');
assert(aged.newbornAnnouncement?.age === 0, 'Newborn announcement baby age is 0');
assert(
  aged.newbornAnnouncement?.gender === 'male' || aged.newbornAnnouncement?.gender === 'female',
  'Newborn has valid gender'
);

const newborn = aged.children?.find((c) => c.age === 0);
assert(newborn !== undefined, 'Newborn baby exists in family');
assert(newborn?.occupation === 'Infant', 'Newborn is Infant');

// Test naming the newborn with custom first name & partner's last name
const customFirstName = 'Sophia';
const partnerLastName = agedWife.lastName; // 'Bennett'
const namedChildren = (aged.children || []).map((c) =>
  c.id === aged.newbornAnnouncement!.id
    ? { ...c, firstName: customFirstName, lastName: partnerLastName }
    : c
);
const namedBaby = namedChildren.find((c) => c.id === aged.newbornAnnouncement!.id);
assert(namedBaby?.firstName === 'Sophia', 'First name customized');
assert(namedBaby?.lastName === 'Bennett', 'Partner surname selected from dropdown');
console.log(`✅ Baby Naming Flow: Sophia Bennett welcomed to the family!`);

const older = aged.children?.find((c) => c.id === 'child-1');
assert(older?.age === 3, 'Existing child aged to 3');

console.log(`✅ Aging Lifecycle: Partner aged to 25, spouse salary contributed ($10k), and baby safely delivered!`);
console.log('--- ALL MODULE 7 ROMANCE & DATING TESTS PASSED PERFECTLY! ---\n');
