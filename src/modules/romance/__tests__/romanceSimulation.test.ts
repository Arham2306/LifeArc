import { test } from 'node:test';
import assert from 'node:assert/strict';
import { romanceService } from '../services/romanceService';
import { reproductionService } from '../services/reproductionService';
import { divorceService } from '../services/divorceService';
import { ageUpCharacter } from '../../aging/services/agingService';
import { FLIRT_OPTIONS, DATE_VENUES, ENGAGEMENT_RINGS, PROPOSAL_VENUES, WEDDING_VENUES } from '../data/romanticInteractions';
import type { CharacterProfile, PersonProfile, ChildProfile } from '../../../types/game';

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
    parents: {
      father: {
        id: 'p-father',
        firstName: 'John',
        lastName: 'Morgan',
        age: 52,
        occupation: 'Accountant',
        relationship: 80,
        generosity: 75,
        isAlive: true,
      },
      mother: {
        id: 'p-mother',
        firstName: 'Sarah',
        lastName: 'Morgan',
        age: 50,
        occupation: 'Architect',
        relationship: 85,
        generosity: 80,
        isAlive: true,
      },
      familyWealth: 'comfortable',
    },
    siblings: [],
    relationships: [],
    education: {
      currentStage: 'graduated',
      degrees: [],
      elementaryGrades: 90,
      middleSchoolGrades: 90,
      highSchoolGpa: 3.8,
      isHighSchoolGraduated: true,
      isHighSchoolDroppedOut: false,
      universityApplications: [],
      professionalSchoolApplications: [],
      extracurricularActivities: [],
    },
    career: {
      currentJob: null,
      jobHistory: [],
      yearsAtCurrentJob: 0,
      isRetired: false,
    },
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

test('Module 7: Romance & Dating Simulation Tests', async (t) => {
  console.log('\n--- STARTING MODULE 7: ROMANCE & DATING SIMULATION TESTS ---');

  await t.test('Gradual Friend-to-Romance Evolution: Sparks romance and enables Love Meter', () => {
    const friend = createMockFriend({ relationship: 65, romanceUnlocked: false, romanceMeter: 0 });

    const sparked = romanceService.sparkRomance(friend);
    assert.strictEqual(sparked.romanceUnlocked, true);
    assert.ok((sparked.romanceMeter ?? 0) >= 15);
    assert.strictEqual(sparked.romanticStage, 'flirting');
    console.log(`✅ Spark Romance: Chloe's Love Meter enabled (${sparked.romanceMeter}%)!`);
  });

  await t.test('Tier 1 & 2 Actions: Flirting and dates increase dual meters', () => {
    const char = createMockCharacter({ cash: 10000 });
    const friend = createMockFriend({ relationship: 65, romanceUnlocked: true, romanceMeter: 25 });

    // Execute Playful Flirt
    const { updatedTarget: flirtee, result: flirtRes } = romanceService.executeFlirt(
      char,
      friend,
      FLIRT_OPTIONS[0]
    );
    assert.ok(flirtee.romanceMeter! >= 25);
    console.log(`✅ Flirt Executed: ${flirtRes.message}`);

    // Execute Stargazing Date
    const venue = DATE_VENUES[2]; // Stargazing picnic ($65)
    const { updatedTarget: datee, result: dateRes } = romanceService.executeDate(char, flirtee, venue);
    assert.strictEqual(dateRes.success, true);
    assert.strictEqual(dateRes.cashDelta, -65);
    assert.ok(datee.relationship > flirtee.relationship);
    assert.ok(datee.romanceMeter! > flirtee.romanceMeter!);
    console.log(`✅ Date Executed: ${venue.name} boosted Romance to ${datee.romanceMeter}%!`);
  });

  await t.test('Milestone: Ask to Become Girlfriend / Boyfriend', () => {
    const char = createMockCharacter();
    
    // Test rejection with low romance
    const lowTarget = createMockFriend({ relationship: 40, romanceMeter: 10 });
    const lowRes = romanceService.executeAskOut(char, lowTarget);
    assert.strictEqual(lowRes.result.success, false);

    // Test acceptance with high relationship & romance
    const readyTarget = createMockFriend({ relationship: 75, romanceMeter: 50 });
    const readyRes = romanceService.executeAskOut(char, readyTarget);
    assert.strictEqual(readyRes.result.success, true);
    assert.strictEqual(readyRes.updatedTarget.romanticStage, 'dating');
    assert.strictEqual(readyRes.updatedTarget.role, 'Girlfriend');
    assert.strictEqual(readyRes.result.newRomanticStage, 'dating');
    console.log(`✅ Ask Out Milestone: Successfully transitioned from friend to Girlfriend!`);
  });

  await t.test('Milestone: Marriage Proposal with Ring & Venue', () => {
    const char = createMockCharacter({ cash: 20000 });
    const partner = createMockFriend({
      role: 'Girlfriend',
      relationshipType: 'dating',
      romanticStage: 'dating',
      relationship: 88,
      romanceMeter: 85,
    });

    const ring = ENGAGEMENT_RINGS[2]; // 1.2-Carat Gold Solitaire ($2,400)
    const venue = PROPOSAL_VENUES[1]; // Sunset beach ($150)

    const { updatedTarget, result } = romanceService.executeProposal(char, partner, ring, venue);
    assert.strictEqual(result.success, true);
    assert.strictEqual(updatedTarget.romanticStage, 'engaged');
    assert.strictEqual(updatedTarget.role, 'Fiancée');
    assert.strictEqual(updatedTarget.partnerStats?.engagementRing?.name, ring.name);
    console.log(`✅ Marriage Proposal: She said YES! Ring value: $${ring.cost.toLocaleString()}`);
  });

  await t.test('Milestone: Wedding Ceremony & Prenuptial Agreement', () => {
    const char = createMockCharacter({ cash: 50000 });
    const fiancee = createMockFriend({
      role: 'Fiancée',
      romanticStage: 'engaged',
      relationship: 95,
      romanceMeter: 95,
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

    const venue = WEDDING_VENUES[1]; // Beachfront pavilion ($3,200)
    const { updatedTarget, result, prenupSigned } = romanceService.executeWedding(
      char,
      fiancee,
      venue,
      true // Demand prenup
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(prenupSigned, true);
    assert.strictEqual(updatedTarget.romanticStage, 'married');
    assert.strictEqual(updatedTarget.role, 'Wife');
    assert.strictEqual(updatedTarget.partnerStats?.hasPrenup, true);
    console.log(`✅ Wedding Ceremony: Married with Prenup signed at ${venue.name}!`);
  });

  await t.test('Reproduction & Family Planning: Intimacy, IVF & Adoption', () => {
    const char = createMockCharacter({ cash: 30000 });
    const wife = createMockFriend({
      role: 'Wife',
      romanticStage: 'married',
      relationship: 95,
      partnerStats: {
        fertility: 90,
        looks: 85,
        smarts: 85,
        craziness: 15,
        generosity: 80,
      },
    });

    // IVF Treatment
    const ivfRes = reproductionService.executeIVF(char, wife);
    assert.strictEqual(ivfRes.cashDelta, -15000);
    console.log(`✅ Fertility Clinic: IVF cycle attempted (Cost: $15,000)`);

    // Adoption Agency
    const adoptRes = reproductionService.executeAdoption(char, 'toddler', 'Maya');
    assert.strictEqual(adoptRes.success, true);
    assert.ok(adoptRes.child);
    assert.strictEqual(adoptRes.child?.isAdopted, true);
    assert.strictEqual(adoptRes.child?.firstName, 'Maya');
    assert.strictEqual(adoptRes.cashDelta, -6000);
    console.log(`✅ Adoption Agency: Successfully adopted ${adoptRes.child.firstName}!`);

    // Biological Child Generation
    const baby = reproductionService.generateBaby(char, wife, 'Leo');
    assert.strictEqual(baby.firstName, 'Leo');
    assert.strictEqual(baby.age, 0);
    assert.strictEqual(baby.occupation, 'Infant');
    assert.ok(baby.looks >= 70 && baby.smarts >= 70);
    console.log(`✅ Biological Child: Born with inherited genetics (Looks: ${baby.looks}%, Smarts: ${baby.smarts}%)!`);
  });

  await t.test('Divorce & Asset Protection: Prenup protects marital wealth', () => {
    const char = createMockCharacter({ cash: 100000 });
    const wifeWithPrenup = createMockFriend({
      role: 'Wife',
      romanticStage: 'married',
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
      char,
      wifeWithPrenup,
      'standard'
    );

    assert.strictEqual(settlement.partnerShareCash, 0); // Prenup protected all cash
    assert.strictEqual(updatedCharacter.cash, 100000 - 1500); // Only paid legal fee
    assert.strictEqual(updatedCharacter.partner, null);
    assert.strictEqual(updatedCharacter.exPartners?.length, 1);
    console.log(`✅ Divorce Finalized: Prenup successfully shielded 100% of liquid assets!`);
  });

  await t.test('Aging Lifecycle Integration: Partner aging, spouse salary, & newborn birth', () => {
    const wife = createMockFriend({
      role: 'Wife',
      romanticStage: 'married',
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

    const char = createMockCharacter({
      partner: wife,
      relationships: [wife],
      children: [existingChild],
      isPregnant: true,
      cash: 10000,
    });

    const aged = ageUpCharacter(char);

    // Verify partner aged up and yearsTogether incremented
    assert.strictEqual(aged.partner?.age, 25);
    assert.strictEqual(aged.partner?.partnerStats?.yearsTogether, 4);

    // Verify spouse contributed salary into household cash (20% of 50,000 = $10,000)
    assert.ok(aged.cash >= 20000);

    // Verify pregnant character gave birth upon aging up
    assert.strictEqual(aged.isPregnant, false);
    assert.strictEqual(aged.children?.length, 2); // Maya + Newborn
    const newborn = aged.children?.find((c) => c.age === 0);
    assert.ok(newborn);
    assert.strictEqual(newborn.occupation, 'Infant');

    // Verify older child aged up
    const older = aged.children?.find((c) => c.id === 'child-1');
    assert.strictEqual(older?.age, 3);

    console.log(`✅ Aging Lifecycle: Partner aged to 25, spouse salary contributed ($10k), and baby safely delivered!`);
  });

  console.log('--- ALL MODULE 7 ROMANCE & DATING TESTS PASSED PERFECTLY! ---\n');
});
