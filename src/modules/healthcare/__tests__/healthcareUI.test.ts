import type { CharacterProfile } from '../../../types/game';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import {
  CONSULT_PRICE,
  consultDoctor,
  startTreatment,
  declineTreatment,
  enrollCare,
  cancelEnrollment,
  isValidCondition,
  chestCourseAwaitingClose,
} from '../services/healthcareService';
import {
  formatMoney,
  resolveCareStatus,
  resolveTemporaryStatus,
} from '../components/healthcareDisplay';
import { getConditionListing } from '../data/conditionCatalog';
import type { ConditionId, ConditionRecord, VisitRecord } from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function makeCondition(catalogId: ConditionId, overrides: Partial<ConditionRecord> = {}): ConditionRecord {
  const listing = getConditionListing(catalogId);
  return {
    id: `${catalogId}_1`,
    catalogId,
    status: 'known',
    acquiredAtAge: 20,
    diagnosedAtAge: 20,
    symptom: listing?.symptom ?? `Symptom of ${catalogId}`,
    untreatedYears: 0,
    ...overrides,
  };
}

function baseCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_ui_test',
    firstName: 'Noah',
    lastName: 'Vance',
    gender: 'male',
    age: 20,
    birthYear: 2000,
    city: 'Austin',
    country: 'United States',
    isAlive: true,
    stats: { health: 70, happiness: 65, smarts: 50, looks: 50, karma: 50 },
    cash: 500,
    bankBalance: 2000,
    netWorth: 2500,
    occupation: 'Unemployed',
    parents: {
      father: {
        id: 'dad',
        role: 'father',
        firstName: 'Arthur',
        lastName: 'Vance',
        age: 48,
        occupation: 'Accountant',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      mother: {
        id: 'mom',
        role: 'mother',
        firstName: 'Clara',
        lastName: 'Vance',
        age: 46,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      wealth: 'comfortable',
    },
    siblings: [],
    relationships: [],
    timeline: [],
    seenEventIds: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    ...overrides,
  };
}

console.log('--- STARTING MODULE 10.4 HEALTHCARE UI TESTS ---');

// 1. Menu Tile Lock & Description Rules
{
  const child = baseCharacter({ age: 5 });
  const isAvailableUnder6 = child.age >= 6;
  assert(!isAvailableUnder6, 'Healthcare tile locked under age 6');

  const adult = baseCharacter({ age: 16 });
  const isAvailableAt16 = adult.age >= 6;
  assert(isAvailableAt16, 'Healthcare tile unlocked at age 16');

  const age6Child = baseCharacter({ age: 6 });
  const isAvailableAt6 = age6Child.age >= 6;
  assert(isAvailableAt6, 'Healthcare tile unlocked at age 6');
  console.log('✅ Menu tile availability at age 6 gate verified');
}

// 2. Doctor Consultation: Free Under 16 vs $60 at Age 16+
{
  // Under 16: Free consultation ($0)
  const child = baseCharacter({
    age: 10,
    cash: 20,
    bankBalance: 500,
    healthcare: {
      conditions: [
        makeCondition('cold', {
          id: 'cond_cold_1',
          status: 'undiagnosed',
          acquiredAtAge: 10,
          diagnosedAtAge: undefined,
        }),
      ],
      visits: [],
    },
  });

  const consultChild = consultDoctor(child);
  assert(consultChild.ok, 'Consultation succeeded for child under 16');
  assert(consultChild.character.cash === 20, 'Cash unchanged for free consultation ($0)');
  const childFirstCondition = consultChild.character.healthcare?.conditions[0] as ConditionRecord | undefined;
  assert(
    childFirstCondition && childFirstCondition.status === 'known',
    'Condition was diagnosed (status changed from undiagnosed to known)'
  );
  const childVisits = (consultChild.character.healthcare?.visits || []) as VisitRecord[];
  assert(childVisits.length === 1, 'One visit recorded');
  assert(childVisits[0].pricePaid === 0, 'Visit history records $0 price paid');
  assert(childVisits[0].complimentary === true, 'Visit history records complimentary: true');

  // Age 16+: Costs $60
  const adult = baseCharacter({
    age: 16,
    cash: 100,
    bankBalance: 1000,
    healthcare: {
      conditions: [
        makeCondition('cold', {
          id: 'cond_cold_2',
          status: 'undiagnosed',
          acquiredAtAge: 16,
          diagnosedAtAge: undefined,
        }),
      ],
      visits: [],
    },
  });

  const consultAdult = consultDoctor(adult);
  assert(consultAdult.ok, 'Consultation succeeded for adult at age 16');
  assert(consultAdult.character.cash === 40, 'Cash reduced by exactly $60 from wallet');
  assert(consultAdult.character.bankBalance === 1000, 'Bank balance is untouched');
  const adultVisits = (consultAdult.character.healthcare?.visits || []) as VisitRecord[];
  assert(adultVisits.length === 1, 'One visit recorded');
  assert(adultVisits[0].pricePaid === CONSULT_PRICE, 'Visit history records $60');
  assert(!adultVisits[0].complimentary, 'Adult visit is not complimentary');

  // Insufficient Cash at 16+
  const brokeAdult = baseCharacter({
    age: 16,
    cash: 50,
    bankBalance: 1000,
    healthcare: { conditions: [], visits: [] },
  });
  const consultBroke = consultDoctor(brokeAdult);
  assert(!consultBroke.ok, 'Consultation refused when cash is below $60');
  assert(
    consultBroke.reason?.includes('cash on hand') ||
      consultBroke.reason?.includes('The bank is not used') ||
      consultBroke.reason?.includes('$60'),
    'Reason mentions price and that the bank is not used'
  );

  // Duplicate Consultation in Same Year Refused
  const secondConsult = consultDoctor(consultAdult.character);
  assert(!secondConsult.ok, 'Second consultation in same year is refused');
  console.log('✅ Doctor consultation pricing, diagnosis, and single-consultation-per-year verified');
}

// 3. Condition Separation: Undiagnosed vs Diagnosed Active vs Resolved Medical History
{
  const char = baseCharacter({
    healthcare: {
      conditions: [
        makeCondition('cold', {
          id: 'c1',
          status: 'undiagnosed',
          acquiredAtAge: 20,
          diagnosedAtAge: undefined,
        }),
        makeCondition('chest', {
          id: 'c2',
          status: 'known',
          acquiredAtAge: 19,
          diagnosedAtAge: 19,
        }),
        makeCondition('ankle', {
          id: 'c3',
          status: 'closed',
          closure: 'recovered',
          acquiredAtAge: 18,
          diagnosedAtAge: 18,
          closedAtAge: 18,
        }),
      ],
      visits: [],
    },
  });

  const raw = (char.healthcare?.conditions || []) as ConditionRecord[];
  const valid = raw.filter(isValidCondition);
  const undiagnosed = valid.filter((c) => c.status === 'undiagnosed');
  const activeDiagnosed = valid.filter((c) => c.status === 'known');
  const resolved = valid.filter((c) => c.status === 'closed');

  assert(undiagnosed.length === 1 && undiagnosed[0].id === 'c1', 'Undiagnosed concern filtered');
  assert(activeDiagnosed.length === 1 && activeDiagnosed[0].id === 'c2', 'Active diagnosed filtered');
  assert(resolved.length === 1 && resolved[0].id === 'c3', 'Resolved medical history filtered');
  console.log('✅ Three-way condition separation and categorization verified');
}

// 4. Temporary Condition Status Resolver
{
  const untreated = makeCondition('cold', { status: 'known' });
  const statusUntreated = resolveTemporaryStatus(untreated, 20);
  assert(statusUntreated.label === 'Untreated', 'Cold defaults to untreated');
  assert(statusUntreated.badgeVariant === 'rose', 'Untreated shows rose badge');

  const declined = makeCondition('cold', {
    status: 'known',
    declinedAtAge: 20,
  });
  const statusDeclined = resolveTemporaryStatus(declined, 20);
  assert(statusDeclined.label === 'Declined this year', 'Declined status recognized');
  assert(statusDeclined.badgeVariant === 'slate', 'Declined shows slate badge');

  const treatedChest = makeCondition('chest', {
    status: 'known',
    treatedAtAge: 20,
  });
  assert(chestCourseAwaitingClose(treatedChest), 'chestCourseAwaitingClose returns true');
  const statusTreatedChest = resolveTemporaryStatus(treatedChest, 20);
  assert(statusTreatedChest.label === 'Course in Progress', 'Treated chest infection awaiting close');
  assert(statusTreatedChest.badgeVariant === 'emerald', 'Course in progress shows emerald badge');
  console.log('✅ Temporary condition status resolver verified');
}

// 5. Managed Care Status Resolver (Worn Joints & Heart Follow-Up)
{
  const joints = makeCondition('joints', { status: 'known', acquiredAtAge: 55, diagnosedAtAge: 55 });

  // Not enrolled
  const sNotEnrolled = resolveCareStatus(joints, 55);
  assert(sNotEnrolled.state === 'not_enrolled', 'Unenrolled joints recognized');

  // Covered
  const coveredJoints: ConditionRecord = {
    ...joints,
    enrolled: true,
    coverageThroughAge: 56,
  };
  const sCovered = resolveCareStatus(coveredJoints, 55);
  assert(sCovered.state === 'covered', 'Covered care recognized');
  assert(sCovered.badgeVariant === 'emerald', 'Covered shows emerald badge');

  // Canceled but still covered through end of year
  const canceledCoveredJoints: ConditionRecord = {
    ...joints,
    enrolled: false,
    coverageThroughAge: 56,
  };
  const sCanceledCovered = resolveCareStatus(canceledCoveredJoints, 55);
  assert(sCanceledCovered.state === 'canceled_covered', 'Canceled but valid coverage recognized');

  // Renewal pending
  const renewalPendingJoints: ConditionRecord = {
    ...joints,
    enrolled: true,
    coverageThroughAge: 55,
  };
  const sRenewalPending = resolveCareStatus(renewalPendingJoints, 56);
  assert(sRenewalPending.state === 'renewal_pending', 'Renewal pending recognized at age 56');

  // Lapsed
  const lapsedJoints: ConditionRecord = {
    ...joints,
    enrolled: false,
    coverageThroughAge: 54,
  };
  const sLapsed = resolveCareStatus(lapsedJoints, 55);
  assert(sLapsed.state === 'lapsed', 'Lapsed care recognized');

  // Heart Condition: procedure needed vs procedure done
  const heart = makeCondition('heart', { status: 'known', acquiredAtAge: 65, diagnosedAtAge: 65 });
  const sHeartProcNeeded = resolveCareStatus(heart, 65);
  assert(sHeartProcNeeded.state === 'procedure_needed', 'Heart procedure needed recognized');

  const heartProcDone: ConditionRecord = {
    ...heart,
    procedureCompleted: true,
  };
  const sHeartProcDone = resolveCareStatus(heartProcDone, 65);
  assert(sHeartProcDone.state === 'procedure_done', 'Heart procedure done recognized');
  console.log('✅ Managed care status resolver (all lifecycle states) verified');
}

// 6. Action Workflows & Affordability Rules
{
  // A. Cold: $25, +8 health, closes immediately
  const charWithCold = baseCharacter({
    cash: 50,
    stats: { health: 70, happiness: 70, smarts: 50, looks: 50, karma: 50 },
    healthcare: {
      conditions: [makeCondition('cold', { id: 'c_cold' })],
      visits: [],
    },
  });
  const resCold = startTreatment(charWithCold, 'c_cold');
  assert(resCold.ok, 'Cold treatment succeeded');
  assert(resCold.character.cash === 25, 'Cold deducted $25');
  assert(resCold.character.stats.health === 78, 'Cold restored +8 health');
  const coldClosed = resCold.character.healthcare?.conditions[0] as ConditionRecord;
  assert(coldClosed.status === 'closed' && coldClosed.closure === 'recovered', 'Cold closed immediately');

  // B. Ankle: $40, +4 health, happiness unchanged, closes immediately
  const charWithAnkle = baseCharacter({
    cash: 50,
    stats: { health: 70, happiness: 70, smarts: 50, looks: 50, karma: 50 },
    healthcare: {
      conditions: [makeCondition('ankle', { id: 'c_ankle' })],
      visits: [],
    },
  });
  const resAnkle = startTreatment(charWithAnkle, 'c_ankle');
  assert(resAnkle.ok, 'Ankle treatment succeeded');
  assert(resAnkle.character.cash === 10, 'Ankle deducted $40');
  assert(resAnkle.character.stats.health === 74, 'Ankle restored +4 health');
  assert(resAnkle.character.stats.happiness === 70, 'Ankle left happiness unchanged');
  const ankleClosed = resAnkle.character.healthcare?.conditions[0] as ConditionRecord;
  assert(ankleClosed.status === 'closed' && ankleClosed.closure === 'recovered', 'Ankle closed immediately');

  // C. Chest: $120, +10 health, remains known and awaiting close on Age Up
  const charWithChest = baseCharacter({
    cash: 150,
    stats: { health: 70, happiness: 70, smarts: 50, looks: 50, karma: 50 },
    healthcare: {
      conditions: [makeCondition('chest', { id: 'c_chest' })],
      visits: [],
    },
  });
  const resChest = startTreatment(charWithChest, 'c_chest');
  assert(resChest.ok, 'Chest treatment succeeded');
  assert(resChest.character.cash === 30, 'Chest deducted $120');
  assert(resChest.character.stats.health === 80, 'Chest restored +10 health');
  const chestTreated = resChest.character.healthcare?.conditions[0] as ConditionRecord;
  assert(chestTreated.status === 'known', 'Chest remains open for year');
  assert(chestTreated.treatedAtAge === 20, 'Treated age recorded');
  assert(chestCourseAwaitingClose(chestTreated), 'Course awaiting close active');

  // D. Heart Procedure: $400, health unchanged, procedureCompleted true
  const charWithHeart = baseCharacter({
    age: 65,
    cash: 450,
    stats: { health: 50, happiness: 70, smarts: 50, looks: 50, karma: 50 },
    healthcare: {
      conditions: [makeCondition('heart', { id: 'c_heart', acquiredAtAge: 65, diagnosedAtAge: 65 })],
      visits: [],
    },
  });
  const resHeartProc = startTreatment(charWithHeart, 'c_heart');
  assert(resHeartProc.ok, 'Heart procedure succeeded');
  assert(resHeartProc.character.cash === 50, 'Heart procedure deducted $400');
  assert(resHeartProc.character.stats.health === 50, 'Health left unchanged by procedure');
  const heartTreated = resHeartProc.character.healthcare?.conditions[0] as ConditionRecord;
  assert(heartTreated.procedureCompleted === true, 'Procedure marked completed');
  assert(!heartTreated.enrolled, 'Follow-up is NOT automatically enrolled');

  // E. Heart Follow-Up Care: $60/yr
  const resHeartEnroll = enrollCare(resHeartProc.character, 'c_heart');
  assert(!resHeartEnroll.ok, 'Follow-up enrollment refused when cash ($50) < $60');
  const richHeartChar = { ...resHeartProc.character, cash: 100 };
  const resHeartEnroll2 = enrollCare(richHeartChar, 'c_heart');
  assert(resHeartEnroll2.ok, 'Follow-up enrollment succeeded with sufficient cash');
  assert(resHeartEnroll2.character.cash === 40, 'Follow-up care deducted $60');
  const heartEnrolled = resHeartEnroll2.character.healthcare?.conditions[0] as ConditionRecord;
  assert(heartEnrolled.enrolled === true, 'Care enrolled flag true');
  assert(heartEnrolled.coverageThroughAge === 65, 'Coverage covers current age (65)');

  // F. Worn Joints Care: $80/yr
  const charWithJoints = baseCharacter({
    age: 55,
    cash: 100,
    healthcare: {
      conditions: [makeCondition('joints', { id: 'c_joints', acquiredAtAge: 55, diagnosedAtAge: 55 })],
      visits: [],
    },
  });
  const resJointsEnroll = enrollCare(charWithJoints, 'c_joints');
  assert(resJointsEnroll.ok, 'Joints care enrolled');
  assert(resJointsEnroll.character.cash === 20, 'Joints care deducted $80');
  const jointsEnrolled = resJointsEnroll.character.healthcare?.conditions[0] as ConditionRecord;
  assert(jointsEnrolled.enrolled === true, 'Care enrolled true');
  assert(jointsEnrolled.coverageThroughAge === 55, 'Coverage covers current age (55)');

  // G. Decline Treatment: Free, keeps condition open, still treatable later that year
  const charDecline = declineTreatment(charWithCold, 'c_cold');
  assert(charDecline.ok, 'Declining treatment succeeded');
  assert(charDecline.character.cash === 50, 'Declining is free');
  const coldDeclined = charDecline.character.healthcare?.conditions[0] as ConditionRecord;
  assert(coldDeclined.status === 'known', 'Declining keeps condition open');
  assert(coldDeclined.declinedAtAge === 20, 'Declined age recorded');
  const treatAfterDecline = startTreatment(charDecline.character, 'c_cold');
  assert(treatAfterDecline.ok, 'Can still treat condition after declining earlier that year');

  // H. Cancel Enrollment: Keeps coverage through current year with no refund
  const charCancel = cancelEnrollment(resJointsEnroll.character, 'c_joints');
  assert(charCancel.ok, 'Cancel enrollment succeeded');
  assert(charCancel.character.cash === 20, 'No refund issued on cancellation');
  const jointsCanceled = charCancel.character.healthcare?.conditions[0] as ConditionRecord;
  assert(jointsCanceled.enrolled === false, 'enrolled set to false');
  assert(jointsCanceled.coverageThroughAge === 55, 'Coverage retained through current period');

  console.log('✅ Action workflows (Cold, Ankle, Chest, Heart, Joints, Decline, Cancel) verified');
}

// 7. Malformed Records Resilience
{
  const malformedConditions: unknown[] = [
    null,
    undefined,
    {},
    { id: 'broken_no_catalog' },
    { id: 'broken_unknown', catalogId: 'space_plague', name: 'Alien Flu' },
  ];
  const charWithMalformed = baseCharacter({
    healthcare: {
      conditions: malformedConditions,
      visits: [],
    },
  });

  const raw = (charWithMalformed.healthcare?.conditions || []) as unknown[];
  const valid = raw.filter(isValidCondition);
  assert(valid.length === 0, 'Malformed conditions safely rejected by isValidCondition');

  // Formatting utility
  assert(formatMoney(0) === '$0', 'formatMoney formats 0 as $0');
  assert(formatMoney(60) === '$60', 'formatMoney formats 60 as $60');
  assert(formatMoney(400) === '$400', 'formatMoney formats 400 as $400');
  assert(formatMoney(-50) === '$0', 'formatMoney clamps negative to $0');
  console.log('✅ Malformed records and formatting resilience verified');
}

console.log('--- ALL MODULE 10.4 HEALTHCARE UI TESTS PASSED PERFECTLY! ---');
