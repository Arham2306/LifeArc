import type { CharacterProfile } from '../../../types/game';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import {
  DOCTOR_CATALOG,
  getDoctorTierListing,
  isValidDoctorTier,
} from '../data/doctorCatalog';
import { getConditionListing } from '../data/conditionCatalog';
import {
  generateDoctorNames,
  generateDoctorSession,
  DOCTOR_FIRST_NAMES,
  DOCTOR_LAST_NAMES,
} from '../services/doctorNameService';
import {
  consultDoctor,
  isValidVisit,
} from '../services/healthcareService';
import type { ConditionId, ConditionRecord, VisitRecord } from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function makeCondition(catalogId: ConditionId, overrides: Partial<ConditionRecord> = {}): ConditionRecord {
  const listing = getConditionListing(catalogId);
  return {
    id: `${catalogId}_1`,
    catalogId,
    status: 'undiagnosed',
    acquiredAtAge: 20,
    symptom: listing?.symptom ?? `Symptom of ${catalogId}`,
    untreatedYears: 0,
    ...overrides,
  };
}

function baseCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_doc_test',
    firstName: 'Marcus',
    lastName: 'Holloway',
    gender: 'male',
    age: 20,
    birthYear: 2000,
    city: 'San Francisco',
    country: 'United States',
    isAlive: true,
    stats: { health: 75, happiness: 70, smarts: 60, looks: 50, karma: 50 },
    cash: 500,
    bankBalance: 2000,
    netWorth: 2500,
    occupation: 'Unemployed',
    parents: {
      father: {
        id: 'dad',
        role: 'father',
        firstName: 'Eli',
        lastName: 'Holloway',
        age: 50,
        occupation: 'Engineer',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      mother: {
        id: 'mom',
        role: 'mother',
        firstName: 'Diana',
        lastName: 'Holloway',
        age: 48,
        occupation: 'Architect',
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

console.log('--- STARTING FINAL MODULE 10: DOCTOR SELECTION & REPUTATION TESTS ---');

// 1. DOCTOR CATALOG TESTS
{
  assert(DOCTOR_CATALOG.length === 3, 'Exactly three doctor reputation tiers configured');

  const average = getDoctorTierListing('average');
  assert(average !== null, 'Average tier exists');
  assert(average.reputation === 'average', 'Average reputation string matches');
  assert(average.consultPrice === 40, 'Average price is $40');
  assert(average.diagnosticTier === 'basic', 'Average diagnostic tier is basic');
  assert(
    average.diagnosableConditions.length === 2 &&
      average.diagnosableConditions.includes('cold') &&
      average.diagnosableConditions.includes('ankle'),
    'Average diagnoses only cold and ankle'
  );

  const good = getDoctorTierListing('good');
  assert(good !== null, 'Good tier exists');
  assert(good.reputation === 'good', 'Good reputation string matches');
  assert(good.consultPrice === 60, 'Good price is $60');
  assert(good.diagnosticTier === 'advanced', 'Good diagnostic tier is advanced');
  assert(
    good.diagnosableConditions.length === 4 &&
      good.diagnosableConditions.includes('cold') &&
      good.diagnosableConditions.includes('ankle') &&
      good.diagnosableConditions.includes('chest') &&
      good.diagnosableConditions.includes('joints') &&
      !good.diagnosableConditions.includes('heart'),
    'Good diagnoses cold, ankle, chest, and joints, but NOT heart'
  );

  const excellent = getDoctorTierListing('excellent');
  assert(excellent !== null, 'Excellent tier exists');
  assert(excellent.reputation === 'excellent', 'Excellent reputation string matches');
  assert(excellent.consultPrice === 120, 'Excellent price is $120');
  assert(excellent.diagnosticTier === 'expert', 'Excellent diagnostic tier is expert');
  assert(
    excellent.diagnosableConditions.length === 5 &&
      excellent.diagnosableConditions.includes('cold') &&
      excellent.diagnosableConditions.includes('ankle') &&
      excellent.diagnosableConditions.includes('chest') &&
      excellent.diagnosableConditions.includes('joints') &&
      excellent.diagnosableConditions.includes('heart'),
    'Excellent diagnoses all five conditions'
  );

  assert(isValidDoctorTier('average'), 'isValidDoctorTier recognizes average');
  assert(isValidDoctorTier('good'), 'isValidDoctorTier recognizes good');
  assert(isValidDoctorTier('excellent'), 'isValidDoctorTier recognizes excellent');
  assert(!isValidDoctorTier('quack'), 'isValidDoctorTier rejects unknown tier');
  assert(!isValidDoctorTier(123), 'isValidDoctorTier rejects non-string');
  assert(getDoctorTierListing('quack') === null, 'getDoctorTierListing returns null for unknown');

  console.log('✅ Doctor catalog tiers, pricing, and capabilities verified');
}

// 2. DYNAMIC NAME GENERATION TESTS
{
  // Test deterministic injected RNG
  let seed = 0.1;
  const deterministicRng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const names1 = generateDoctorNames(3, deterministicRng);
  assert(names1.length === 3, 'Generates exactly 3 names');
  assert(names1[0].startsWith('Dr. '), 'Name 1 has Dr. prefix');
  assert(names1[1].startsWith('Dr. '), 'Name 2 has Dr. prefix');
  assert(names1[2].startsWith('Dr. '), 'Name 3 has Dr. prefix');
  assert(names1[0] !== names1[1] && names1[1] !== names1[2] && names1[0] !== names1[2], 'All 3 names are unique');

  // Verify pool integrity
  assert(DOCTOR_FIRST_NAMES.length >= 25, 'At least 25 first names in pool');
  assert(DOCTOR_LAST_NAMES.length >= 25, 'At least 25 last names in pool');

  // Generate complete session
  const session1 = generateDoctorSession(deterministicRng);
  assert(session1.length === 3, 'Session contains 3 doctors');
  assert(session1[0].id === 'average' && session1[0].consultPrice === 40, 'Doctor 1 is Average ($40)');
  assert(session1[1].id === 'good' && session1[1].consultPrice === 60, 'Doctor 2 is Good ($60)');
  assert(session1[2].id === 'excellent' && session1[2].consultPrice === 120, 'Doctor 3 is Excellent ($120)');

  // Verify distinct names across doctors in session
  const sessionNames = session1.map((d) => d.doctorName);
  assert(new Set(sessionNames).size === 3, 'All doctor names in session are unique');

  // Verify a subsequent session produces different names
  const session2 = generateDoctorSession(deterministicRng);
  const session2Names = session2.map((d) => d.doctorName);
  assert(sessionNames.join('|') !== session2Names.join('|'), 'Subsequent session produces fresh names');

  // Tiers and properties remain attached to the slot regardless of generated names
  assert(session2[0].reputation === 'average' && session2[0].consultPrice === 40, 'Session 2 doctor 1 stays Average $40');
  assert(session2[1].reputation === 'good' && session2[1].consultPrice === 60, 'Session 2 doctor 2 stays Good $60');
  assert(session2[2].reputation === 'excellent' && session2[2].consultPrice === 120, 'Session 2 doctor 3 stays Excellent $120');

  console.log('✅ Dynamic name generation, uniqueness, and slot stability verified');
}

// 3. DIAGNOSTIC CAPABILITY & REPUTATION TESTS
{
  // Setup character with all 5 undiagnosed conditions
  const makePatientWithAll5 = (age = 20, cash = 1000) => {
    return baseCharacter({
      age,
      cash,
      healthcare: {
        conditions: [
          makeCondition('cold', { id: 'c_cold' }),
          makeCondition('ankle', { id: 'c_ankle' }),
          makeCondition('chest', { id: 'c_chest' }),
          makeCondition('joints', { id: 'c_joints' }),
          makeCondition('heart', { id: 'c_heart' }),
        ],
        visits: [],
      },
    });
  };

  // A. Average Doctor: Identifies Cold and Ankle ONLY
  const patientA = makePatientWithAll5();
  const resAvg = consultDoctor(patientA, {
    tierId: 'average',
    doctorName: 'Dr. James Wilson',
  });
  assert(resAvg.ok, 'Average consultation succeeded');
  assert(resAvg.character.cash === 1000 - 40, 'Average consultation costs $40');
  const condsAvg = (resAvg.character.healthcare?.conditions || []) as ConditionRecord[];
  const diagnosedAvg = condsAvg.filter((c) => c.status === 'known');
  const undiagnosedAvg = condsAvg.filter((c) => c.status === 'undiagnosed');
  assert(diagnosedAvg.length === 2, 'Average doctor diagnoses exactly 2 conditions');
  assert(
    diagnosedAvg.some((c) => c.catalogId === 'cold') && diagnosedAvg.some((c) => c.catalogId === 'ankle'),
    'Average doctor diagnosed cold and ankle'
  );
  assert(undiagnosedAvg.length === 3, '3 conditions remain undiagnosed');
  assert(
    undiagnosedAvg.some((c) => c.catalogId === 'chest') &&
      undiagnosedAvg.some((c) => c.catalogId === 'joints') &&
      undiagnosedAvg.some((c) => c.catalogId === 'heart'),
    'Chest, joints, and heart remain undiagnosed'
  );
  // Verify timeline message mentions Dr. James Wilson and unexplained symptoms
  const eventAvg = resAvg.character.timeline[resAvg.character.timeline.length - 1];
  assert(eventAvg.message.includes('Dr. James Wilson'), 'Timeline mentions Dr. James Wilson');
  assert(eventAvg.message.includes('a lingering cold'), 'Timeline mentions lingering cold');
  assert(eventAvg.message.includes('a twisted ankle'), 'Timeline mentions twisted ankle');
  assert(eventAvg.message.includes('Some symptoms remain unexplained'), 'Mentions unexplained symptoms');

  // B. Good Doctor: Identifies Cold, Ankle, Chest, and Joints, but NOT Heart
  const patientB = makePatientWithAll5();
  const resGood = consultDoctor(patientB, {
    tierId: 'good',
    doctorName: 'Dr. Sarah Mitchell',
  });
  assert(resGood.ok, 'Good consultation succeeded');
  assert(resGood.character.cash === 1000 - 60, 'Good consultation costs $60');
  const condsGood = (resGood.character.healthcare?.conditions || []) as ConditionRecord[];
  const diagnosedGood = condsGood.filter((c) => c.status === 'known');
  const undiagnosedGood = condsGood.filter((c) => c.status === 'undiagnosed');
  assert(diagnosedGood.length === 4, 'Good doctor diagnoses exactly 4 conditions');
  assert(
    diagnosedGood.some((c) => c.catalogId === 'chest') && diagnosedGood.some((c) => c.catalogId === 'joints'),
    'Good doctor diagnosed chest infection and worn joints'
  );
  assert(undiagnosedGood.length === 1 && undiagnosedGood[0].catalogId === 'heart', 'Heart remains undiagnosed');
  const eventGood = resGood.character.timeline[resGood.character.timeline.length - 1];
  assert(eventGood.message.includes('Dr. Sarah Mitchell'), 'Timeline mentions Dr. Sarah Mitchell');
  assert(eventGood.message.includes('Some symptoms remain unexplained'), 'Mentions heart as unexplained symptom');

  // C. Excellent Doctor: Identifies ALL 5 conditions
  const patientC = makePatientWithAll5();
  const resExc = consultDoctor(patientC, {
    tierId: 'excellent',
    doctorName: 'Dr. Robert Anderson',
  });
  assert(resExc.ok, 'Excellent consultation succeeded');
  assert(resExc.character.cash === 1000 - 120, 'Excellent consultation costs $120');
  const condsExc = (resExc.character.healthcare?.conditions || []) as ConditionRecord[];
  const diagnosedExc = condsExc.filter((c) => c.status === 'known');
  const undiagnosedExc = condsExc.filter((c) => c.status === 'undiagnosed');
  assert(diagnosedExc.length === 5, 'Excellent doctor diagnoses all 5 conditions');
  assert(undiagnosedExc.length === 0, 'No conditions left undiagnosed');
  assert(diagnosedExc.some((c) => c.catalogId === 'heart'), 'Heart condition diagnosed by excellent doctor');
  const eventExc = resExc.character.timeline[resExc.character.timeline.length - 1];
  assert(eventExc.message.includes('Dr. Robert Anderson'), 'Timeline mentions Dr. Robert Anderson');
  assert(!eventExc.message.includes('Some symptoms remain unexplained'), 'No symptoms remain unexplained');

  console.log('✅ Deterministic diagnostic capabilities across Average, Good, and Excellent verified');
}

// 4. CHILDHOOD CHECKUPS (AGES 6-15) ARE FREE FOR ALL 3 DOCTORS
{
  const child = baseCharacter({
    age: 10,
    cash: 15,
    bankBalance: 500,
    healthcare: {
      conditions: [
        makeCondition('cold', { id: 'c_cold' }),
        makeCondition('chest', { id: 'c_chest' }),
      ],
      visits: [],
    },
  });

  // A. Child selects Excellent Doctor ($120 tier)
  const resChildExc = consultDoctor(child, {
    tierId: 'excellent',
    doctorName: 'Dr. Emily Carter',
  });
  assert(resChildExc.ok, 'Childhood checkup with Excellent doctor succeeded');
  assert(resChildExc.character.cash === 15, 'Child cash is NOT charged ($0)');
  assert(resChildExc.character.bankBalance === 500, 'Bank balance untouched');
  const childVisits = (resChildExc.character.healthcare?.visits || []) as VisitRecord[];
  assert(childVisits.length === 1, 'Visit recorded');
  assert(childVisits[0].pricePaid === 0, 'Price paid is $0');
  assert(childVisits[0].complimentary === true, 'Visit is complimentary: true');
  assert(childVisits[0].doctorTier === 'excellent', 'Doctor tier recorded as excellent');
  assert(childVisits[0].doctorReputation === 'excellent', 'Doctor reputation recorded as excellent');
  assert(childVisits[0].doctorName === 'Dr. Emily Carter', 'Doctor name recorded');

  // Both cold and chest diagnosed because doctor is Excellent
  const childConds = (resChildExc.character.healthcare?.conditions || []) as ConditionRecord[];
  assert(childConds.every((c) => c.status === 'known'), 'Both conditions diagnosed for child by Excellent doctor');

  // B. Child selects Average Doctor ($40 tier) with Chest infection
  const child2 = baseCharacter({
    age: 8,
    cash: 0,
    healthcare: {
      conditions: [makeCondition('chest', { id: 'c_chest_2' })],
      visits: [],
    },
  });
  const resChildAvg = consultDoctor(child2, {
    tierId: 'average',
    doctorName: 'Dr. Daniel Brooks',
  });
  assert(resChildAvg.ok, 'Childhood checkup with Average doctor succeeded with $0 cash');
  assert(resChildAvg.character.cash === 0, 'No cash charged');
  const child2Conds = (resChildAvg.character.healthcare?.conditions || []) as ConditionRecord[];
  assert(child2Conds[0].status === 'undiagnosed', 'Average doctor cannot diagnose chest infection for child');

  console.log('✅ Childhood checkups free ($0) across all 3 tiers with capabilities enforced verified');
}

// 5. ADULT CONSULTATION PRICING, CASH CHECKS & EXACT AFFORDABILITY
{
  // Adult at age 16 with $50 cash:
  // Can afford Average ($40)
  // Cannot afford Good ($60) or Excellent ($120)
  const adult50 = baseCharacter({
    age: 16,
    cash: 50,
    bankBalance: 5000,
    healthcare: { conditions: [], visits: [] },
  });

  const resAvgOk = consultDoctor(adult50, { tierId: 'average', doctorName: 'Dr. James Wilson' });
  assert(resAvgOk.ok, 'Adult with $50 cash can afford Average doctor ($40)');
  assert(resAvgOk.character.cash === 10, 'Leaves $10 cash');
  assert(resAvgOk.character.bankBalance === 5000, 'Bank balance untouched');

  const resGoodFail = consultDoctor(adult50, { tierId: 'good', doctorName: 'Dr. Sarah Mitchell' });
  assert(!resGoodFail.ok, 'Adult with $50 cash CANNOT afford Good doctor ($60)');
  assert(resGoodFail.character === adult50, 'Failed consultation returns original character reference');
  assert(
    resGoodFail.reason?.includes('$60') && resGoodFail.reason.includes('$50') && resGoodFail.reason.includes('bank'),
    'Reason names $60 price, $50 cash on hand, and bank not used'
  );

  const resExcFail = consultDoctor(adult50, { tierId: 'excellent', doctorName: 'Dr. Robert Anderson' });
  assert(!resExcFail.ok, 'Adult with $50 cash CANNOT afford Excellent doctor ($120)');
  assert(resExcFail.character === adult50, 'Original character reference preserved');

  // Exact cash checks:
  const adult40 = baseCharacter({ age: 16, cash: 40, bankBalance: 0 });
  const resExact40 = consultDoctor(adult40, { tierId: 'average', doctorName: 'Dr. Average' });
  assert(resExact40.ok && resExact40.character.cash === 0, 'Exact $40 succeeds and leaves $0 cash');

  const adult120 = baseCharacter({ age: 16, cash: 120, bankBalance: 0 });
  const resExact120 = consultDoctor(adult120, { tierId: 'excellent', doctorName: 'Dr. Excellent' });
  assert(resExact120.ok && resExact120.character.cash === 0, 'Exact $120 succeeds and leaves $0 cash');

  console.log('✅ Consultation pricing, exact cash checks, and bank balance shielding verified');
}

// 6. ANNUAL CONSULTATION RESTRICTIONS & TRANSACTION SAFETY
{
  const adult = baseCharacter({
    age: 25,
    cash: 500,
    healthcare: { conditions: [], visits: [] },
  });

  // First consultation succeeds
  const visit1 = consultDoctor(adult, { tierId: 'average', doctorName: 'Dr. Wilson' });
  assert(visit1.ok, 'First consultation of the year succeeds');
  assert(visit1.character.healthcare?.lastConsultAge === 25, 'lastConsultAge updated to 25');

  // Second consultation in the same year with a different doctor must fail
  const visit2 = consultDoctor(visit1.character, { tierId: 'excellent', doctorName: 'Dr. Anderson' });
  assert(!visit2.ok, 'Second consultation in same year with different doctor is refused');
  assert(visit2.character === visit1.character, 'Refused consultation returns same character');
  assert(visit2.reason?.includes('already saw the doctor this year'), 'Reason explains annual restriction');

  // Invalid tier ID rejected safely
  const invalidTier = consultDoctor(adult, { tierId: 'wizard' as any, doctorName: 'Dr. Strange' });
  assert(!invalidTier.ok, 'Invalid doctor tier refused');
  assert(invalidTier.character === adult, 'Invalid tier returns identical character reference');

  // Invalid doctor name rejected safely
  const invalidName = consultDoctor(adult, { tierId: 'average', doctorName: '   ' });
  assert(!invalidName.ok, 'Empty/blank doctor name refused');
  assert(invalidName.character === adult, 'Invalid name returns identical character reference');

  console.log('✅ Single-consultation-per-year, doctor switching guard, and transaction safety verified');
}

// 7. BACKWARD COMPATIBILITY
{
  // Calling consultDoctor with no options (legacy style)
  const legacyChar = baseCharacter({
    age: 18,
    cash: 100,
    healthcare: {
      conditions: [makeCondition('cold', { id: 'c_cold_leg' })],
      visits: [],
    },
  });
  const resLegacy = consultDoctor(legacyChar);
  assert(resLegacy.ok, 'Legacy call without options defaults to Good doctor ($60)');
  assert(resLegacy.character.cash === 40, 'Charged $60 default');
  const legacyVisit = resLegacy.character.healthcare?.visits[0] as VisitRecord;
  assert(legacyVisit.doctorTier === 'good', 'Default doctorTier is good');
  assert(legacyVisit.doctorReputation === 'good', 'Default doctorReputation is good');

  // Historical visit records without doctorName/doctorTier remain valid
  const oldVisitRecord: unknown = {
    id: 'old_visit_1',
    age: 12,
    kind: 'checkup',
    pricePaid: 0,
    complimentary: true,
  };
  assert(isValidVisit(oldVisitRecord), 'Historical visit without doctor fields is valid');

  const oldTreatmentRecord: unknown = {
    id: 'old_visit_2',
    age: 14,
    kind: 'treatment',
    pricePaid: 25,
    catalogId: 'cold',
  };
  assert(isValidVisit(oldTreatmentRecord), 'Historical treatment visit is valid');

  console.log('✅ Backward compatibility with legacy calls and older records verified');
}

console.log('--- ALL FINAL MODULE 10 DOCTOR SELECTION TESTS PASSED PERFECTLY! ---');
