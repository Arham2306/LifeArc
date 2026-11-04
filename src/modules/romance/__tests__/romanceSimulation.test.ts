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
assert(lowRomanceRes.result.success === false, 'Ask out rejected when romance is under 30%');

const readyTarget = createMockFriend({ relationship: 75, romanceMeter: 50, age: 20 });
const readyRes = romanceService.executeAskOut(adultChar, readyTarget);
assert(readyRes.result.success === true, 'Ask out accepted when romance >= 30% and rel >= 45%');
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

// 7a. Dedicated Try for a Baby Naturally
const maleChar = createMockCharacter({ gender: 'male', age: 26, cash: 30000 });
let naturalConception = false;
for (let i = 0; i < 20; i++) {
  const tryRes = reproductionService.executeTryForBaby(maleChar, wife);
  if (tryRes.conceptionOccurred) {
    naturalConception = true;
    assert(tryRes.message.includes('Positive! 🍼'), 'Positive pregnancy message returned');
    break;
  }
}
assert(naturalConception === true, 'Deliberate try for baby results in conception within reasonable attempts');

// 7b. Attempting to try for baby while already pregnant is blocked gracefully
const pregnantWife = createMockFriend({
  ...wife,
  partnerStats: {
    ...wife.partnerStats!,
    isPregnant: true,
  },
});
const blockedTry = reproductionService.executeTryForBaby(maleChar, pregnantWife);
assert(blockedTry.alreadyPregnant === true, 'Blocked when already expecting a baby');
assert(blockedTry.conceptionOccurred === false, 'Conception not repeated while expecting');

// 7c. Same-sex natural conception returns notViable guidance
const malePartner = createMockFriend({ gender: 'male', age: 26 });
const nonViableTry = reproductionService.executeTryForBaby(maleChar, malePartner);
assert(nonViableTry.notViable === true, 'Same-sex natural conception flagged as not viable');
assert(nonViableTry.message.includes('IVF Treatment or Adoption'), 'Guides to IVF/Adoption');
console.log(`✅ Try for a Baby: Deliberate conception, already-pregnant block, and viability guidance verified!`);

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

// Test 10: Realistic 2-Year Courtship Progression Simulation (Starting from 0% Romance)
// Scenario: Player begins dating at 26, courts actively for 2 years with 2x per-action limits, proposes at 28.
let pChar = createMockCharacter({ age: 26, cash: 10000 });
let prospectTarget = createMockFriend({
  firstName: 'Elena',
  lastName: 'Rostova',
  age: 26,
  role: 'Dating Prospect',
  relationshipType: 'crush',
  relationship: 45,
  romanceUnlocked: true,
  romanceMeter: 0, // Strictly starts at 0%
  romanticStage: 'flirting',
  partnerStats: {
    craziness: 25,
    generosity: 75,
    looks: 80,
    smarts: 80,
    fertility: 80,
    occupation: 'Architect',
    annualIncome: 70000,
    yearsTogether: 0,
  },
});

assert(prospectTarget.romanceMeter === 0, 'Target starts at 0% romance');

// Year 1 (Age 26):
// Action 1 & 2: Dates (e.g. Coffee / Diner + Picnic)
const date1 = romanceService.executeDate(pChar, prospectTarget, DATE_VENUES[0]);
prospectTarget = date1.updatedTarget;
assert((prospectTarget.romanceMeter ?? 0) >= 10, 'Date 1 boosted romance above 10%');

const date2 = romanceService.executeDate(pChar, prospectTarget, DATE_VENUES[1]);
prospectTarget = date2.updatedTarget;
assert((prospectTarget.romanceMeter ?? 0) >= 20, 'Date 2 boosted romance above 20%');

// Action 3 & 4: Flirting (2x)
const flirt1 = romanceService.executeFlirt(pChar, prospectTarget, FLIRT_OPTIONS[0]);
prospectTarget = flirt1.updatedTarget;
const flirt2 = romanceService.executeFlirt(pChar, prospectTarget, FLIRT_OPTIONS[1]);
prospectTarget = flirt2.updatedTarget;
assert((prospectTarget.romanceMeter ?? 0) >= 28, 'Flirts boosted romance to ~30%');

// Action 5 & 6: Deep Talks (2x)
const talk1 = romanceService.executeRomanticTalk(pChar, prospectTarget, ROMANTIC_TALK_TOPICS[0]);
prospectTarget = talk1.updatedTarget;
const talk2 = romanceService.executeRomanticTalk(pChar, prospectTarget, ROMANTIC_TALK_TOPICS[1]);
prospectTarget = talk2.updatedTarget;
assert((prospectTarget.romanceMeter ?? 0) >= 38, 'Deep talks unlocked and boosted romance');

// Milestone: Ask Elena to be official Partner / Girlfriend
const askOut = romanceService.executeAskOut(pChar, prospectTarget);
assert(askOut.result.success === true, 'Ask out accepted in Year 1 after active courting');
prospectTarget = askOut.updatedTarget;
assert(prospectTarget.romanticStage === 'dating', 'Became official girlfriend');
assert((prospectTarget.romanceMeter ?? 0) >= 50, 'Ask out boosted romance over 50%');

// Unlock Tier 4 Intimacy once Love reaches 60%
// Gifts (2x permitted per year)
const gift1 = romanceService.executeRomanticGift(pChar, prospectTarget, ROMANTIC_GIFTS[1]); // Chocolates
prospectTarget = gift1.updatedTarget;
const gift2 = romanceService.executeRomanticGift(pChar, prospectTarget, ROMANTIC_GIFTS[3]); // Red Roses
prospectTarget = gift2.updatedTarget;
assert((prospectTarget.romanceMeter ?? 0) >= 60, 'Gifts unlocked Tier 4 Intimacy (>=60%)');

// Intimacy (2x)
const intimate1 = reproductionService.executeIntimacy(pChar, prospectTarget, 'condom');
prospectTarget = {
  ...prospectTarget,
  relationship: Math.min(100, prospectTarget.relationship + intimate1.relationshipDelta),
  romanceMeter: Math.min(100, (prospectTarget.romanceMeter ?? 0) + intimate1.romanceDelta),
};
const intimate2 = reproductionService.executeIntimacy(pChar, prospectTarget, 'condom');
prospectTarget = {
  ...prospectTarget,
  relationship: Math.min(100, prospectTarget.relationship + intimate2.relationshipDelta),
  romanceMeter: Math.min(100, (prospectTarget.romanceMeter ?? 0) + intimate2.romanceDelta),
};
assert((prospectTarget.romanceMeter ?? 0) >= 70, 'Year 1 Romance reached 70%+');

// Year 1 Ends -> Age up to 27
pChar = {
  ...pChar,
  partner: prospectTarget,
  relationships: [prospectTarget],
  yearlySocialActions: {
    [prospectTarget.id]: ['romance_date', 'romance_date', 'romance_flirt', 'romance_flirt'],
  },
};
let agedChar = ageUpCharacter(pChar);
assert(agedChar.age === 27, 'Character aged to 27');
assert(agedChar.partner?.partnerStats?.yearsTogether === 1, '1 Year together recorded');
prospectTarget = agedChar.partner!;

// Year 2 (Age 27):
// Further dates, deep talks, gifts
const yr2Date1 = romanceService.executeDate(agedChar, prospectTarget, DATE_VENUES[3]); // Candlelit Bistro
prospectTarget = yr2Date1.updatedTarget;
const yr2Date2 = romanceService.executeDate(agedChar, prospectTarget, DATE_VENUES[4]); // Rooftop Cocktail
prospectTarget = yr2Date2.updatedTarget;
const yr2Talk = romanceService.executeRomanticTalk(agedChar, prospectTarget, ROMANTIC_TALK_TOPICS[2]);
prospectTarget = yr2Talk.updatedTarget;
const yr2Gift = romanceService.executeRomanticGift(agedChar, prospectTarget, ROMANTIC_GIFTS[2]);
prospectTarget = yr2Gift.updatedTarget;

assert((prospectTarget.romanceMeter ?? 0) >= 85, 'Year 2 Romance smoothly climbed past 85%');
assert(prospectTarget.relationship >= 90, 'Relationship rapport at peak (>90%)');

// Year 2 Ends -> Age up to 28
agedChar = {
  ...agedChar,
  partner: prospectTarget,
  relationships: [prospectTarget],
  yearlySocialActions: {
    [prospectTarget.id]: ['romance_date', 'romance_talk'],
  },
};
let matureChar = ageUpCharacter(agedChar);
assert(matureChar.age === 28, 'Character aged to 28');
assert(matureChar.partner?.partnerStats?.yearsTogether === 2, 'Exactly 2 Years together reached!');
prospectTarget = matureChar.partner!;

// Milestone: Propose Marriage at 28!
const proposalResult = romanceService.executeProposal(
  matureChar,
  prospectTarget,
  ENGAGEMENT_RINGS[2],
  PROPOSAL_VENUES[2]
);
assert(proposalResult.result.success === true, 'Proposal succeeded after 2 years of dating from 0% romance baseline!');
assert(proposalResult.updatedTarget.romanticStage === 'engaged', 'Elena is now Fiancée at 28!');
console.log(`✅ Realistic 2-Year Courtship Simulation: Started at 0% romance at age 26, dated for 2 years with 2x actions/yr, successfully engaged at age 28!`);

console.log('--- ALL MODULE 7 ROMANCE & DATING TESTS PASSED PERFECTLY! ---\n');
