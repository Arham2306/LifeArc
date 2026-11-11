import type { CharacterProfile } from '../../../types/game';
import { calculatePlayerNetWorth } from '../../assets/services/assetService';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import {
  acquireForYear,
  CLOSED_HISTORY_CAP,
  CONSULT_PRICE,
  consultDoctor,
  isValidCondition,
  openConditions,
  OPEN_CONDITION_CAP,
  VISIT_HISTORY_CAP,
} from '../services/healthcareService';
import type { ConditionRecord } from '../types';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function character(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_health',
    firstName: 'Mina',
    lastName: 'Cole',
    gender: 'female',
    age: 16,
    birthYear: 2000,
    city: 'Austin',
    country: 'United States',
    isAlive: true,
    stats: { health: 80, happiness: 70, smarts: 40, looks: 60, karma: 55 },
    cash: 500,
    bankBalance: 4000,
    netWorth: 4500,
    occupation: 'Unemployed',
    parents: {
      father: {
        id: 'dad',
        role: 'father',
        firstName: 'Owen',
        lastName: 'Cole',
        age: 45,
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
        age: 43,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      wealth: 'comfortable',
    },
    relationships: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function concern(
  catalogId: ConditionRecord['catalogId'],
  status: ConditionRecord['status'] = 'undiagnosed',
  id: string = catalogId,
): ConditionRecord {
  return {
    id,
    catalogId,
    status,
    acquiredAtAge: 20,
    symptom: `Symptom for ${catalogId}.`,
    untreatedYears: 0,
    ...(status === 'closed' ? { closedAtAge: 21, closure: 'resolved' as const } : {}),
  };
}

function testAbsentFieldCreatesAVisit() {
  const child = character({ age: 10, cash: 40, bankBalance: 900 });
  assert(child.healthcare === undefined, 'healthcare starts absent');
  const result = consultDoctor(child);
  assert(result.ok, 'a clear visit at 10 is allowed');
  assert(result.character.healthcare !== undefined, 'the visit creates the record');
  assert(result.character.healthcare?.lastConsultAge === 10, 'the free visit records the age');
  assert(result.character.healthcare?.conditions.length === 0, 'a checkup does not invent a concern');
  assert(result.character.healthcare?.visits.length === 1, 'one visit is stored');
  const visit = result.character.healthcare?.visits[0];
  assert(isPlain(visit) && visit.pricePaid === 0 && visit.complimentary === true, 'the visit is complimentary');
  assert(result.character.cash === 40, 'cash stays put');
  assert(result.character.bankBalance === 900, 'the bank stays put');
  assert(result.character.stats.health === 80, 'health stays put');
  assert(result.character.timeline[0]?.message.includes('nothing on your record'), 'a clear visit says so');
}

function testMalformedRowsStayAndAreIgnored() {
  const junk = { nope: true };
  const cold = concern('cold');
  const profile = character({
    age: 14,
    healthcare: { conditions: [junk, cold], visits: ['old-note'] },
  });
  const result = consultDoctor(profile);
  assert(result.ok, 'a readable record can still be diagnosed');
  const conditions = result.character.healthcare?.conditions ?? [];
  assert(conditions[0] === junk, 'the malformed row keeps its reference');
  assert(isValidCondition(conditions[1]) && conditions[1].status === 'known', 'the cold is named');
  assert(conditions[1] && isValidCondition(conditions[1]) && conditions[1].diagnosedAtAge === 14, 'diagnosis uses the current age');
  assert(result.character.healthcare?.visits[0] === 'old-note', 'a malformed visit is kept');
  assert(openConditions(result.character).length === 1, 'the junk row is not an open concern');
  assert(!isValidCondition(junk), 'the junk row fails validation');
}

function testOpenCapRefusesAThirdTemporary() {
  const full = [concern('cold'), concern('ankle', 'known', 'ankle-1')];
  const next = acquireForYear(full, 50, 30);
  assert(next === full, 'a chest does not raise the open cap');
  assert(openConditions(character({ healthcare: { conditions: next, visits: [] } })).length === OPEN_CONDITION_CAP, 'two concerns stay open');
}

function testHeartDisplacesTheCold() {
  const cold = concern('cold');
  const ankle = concern('ankle', 'known', 'ankle-1');
  const junk = 'keep-me';
  const full = [junk, cold, ankle];
  const next = acquireForYear(full, 20, 40);
  assert(next !== full, 'displacement writes a new list');
  assert(next[0] === junk, 'the malformed row stays');
  assert(next[1] === cold || (isValidCondition(next[1]) && next[1].id === cold.id), 'the cold row is the one that closes');
  const closed = next[1];
  assert(isValidCondition(closed) && closed.status === 'closed' && closed.closure === 'displaced', 'the cold is displaced');
  assert(isValidCondition(closed) && closed.closedAtAge === 40, 'displacement is dated to the new age');
  assert(next[2] === ankle, 'the ankle keeps its reference');
  const heart = next[3];
  assert(isValidCondition(heart) && heart.catalogId === 'heart' && heart.status === 'undiagnosed', 'the heart is undiagnosed');
  assert(isValidCondition(heart) && heart.acquiredAtAge === 40 && heart.untreatedYears === 0, 'the heart starts with no untreated years');
  const profile = character({ healthcare: { conditions: next, visits: [] } });
  assert(openConditions(profile).length === OPEN_CONDITION_CAP, 'the open count stays at two');
  const joints = concern('joints', 'known', 'joints-1');
  const held = [joints, ankle];
  const spared = acquireForYear(held, 20, 60);
  assert(spared[0] === joints, 'worn joints are not displaced');
  assert(isValidCondition(spared[1]) && spared[1].catalogId === 'ankle' && spared[1].status === 'closed', 'the ankle gives up the slot');
  assert(isValidCondition(spared[2]) && spared[2].catalogId === 'heart', 'the heart takes the freed slot');
}

function testClearAndNamedVisits() {
  const clear = consultDoctor(character({ age: 12 }));
  assert(clear.ok && clear.character.stats.health === 80, 'a clear visit does not heal');
  const cold = concern('cold', 'undiagnosed', 'cold-1');
  const named = consultDoctor(character({
    age: 12,
    cash: 15,
    healthcare: { conditions: [cold], visits: [] },
  }));
  assert(named.ok, 'a named concern is a successful visit');
  assert(named.character.cash === 15, 'naming a concern is free before 16');
  assert(named.character.stats.health === 80, 'diagnosis does not change health');
  const found = named.character.healthcare?.conditions[0];
  assert(isValidCondition(found) && found.status === 'known' && found.symptom === cold.symptom, 'the symptom stays and the status changes');
  assert(named.character.timeline[0]?.message.includes('a lingering cold'), 'the visit names the cold');
  assert(named.character.healthcare?.lastConsultAge === 12, 'the free visit consumes the year');

  const both = consultDoctor(character({
    age: 15,
    healthcare: {
      conditions: [concern('cold', 'undiagnosed', 'cold-a'), concern('ankle', 'undiagnosed', 'ankle-a')],
      visits: [],
    },
  }));
  const message = both.character.timeline[0]?.message ?? '';
  assert(both.ok && message.includes('a lingering cold') && message.includes('a twisted ankle'), 'one visit names every open concern');
  assert(both.character.cash === 500, 'ages 6 through 15 are still complimentary');
}

function testShortCashAndThePaidVisit() {
  const broke = character({ age: 20, cash: 59, bankBalance: 8000 });
  const refused = consultDoctor(broke);
  assert(!refused.ok && refused.character === broke, 'short cash returns the same character');
  assert(refused.reason?.includes('$60') && refused.reason.includes('$59') && refused.reason.includes('bank'), 'the reason names the price, the cash, and the bank');
  assert(broke.healthcare === undefined && broke.cash === 59, 'nothing is recorded as paid');

  const paid = consultDoctor(character({ age: 16, cash: CONSULT_PRICE, bankBalance: 250 }));
  assert(paid.ok, 'exact cash pays for the visit');
  assert(paid.character.cash === 0, 'the visit spends the cash');
  assert(paid.character.bankBalance === 250, 'the bank is not the wallet');
  assert(paid.character.stats.health === 80, 'a paid checkup heals nothing');
  assert(paid.character.netWorth === calculatePlayerNetWorth(paid.character), 'net worth follows the cash');
  assert(paid.character.healthcare?.lastConsultAge === 16, 'the paid visit consumes the year');
  assert(paid.character.healthcare?.visits[0] && isPlain(paid.character.healthcare.visits[0]) && paid.character.healthcare.visits[0].complimentary !== true, 'a paid visit is not complimentary');
}

function testSecondVisitSameYear() {
  const first = consultDoctor(character({ age: 8, cash: 0, bankBalance: 100 }));
  assert(first.ok && first.character.healthcare?.lastConsultAge === 8, 'the free visit is the year\'s consultation');
  const second = consultDoctor(first.character);
  assert(!second.ok && second.character === first.character, 'a second visit returns the same character');
  assert(second.reason === 'You already saw the doctor this year.', 'the year is already used');
  assert(second.character.healthcare?.visits.length === 1, 'the refused visit is not stored');
}

function testHistoryCaps() {
  const visits = Array.from({ length: VISIT_HISTORY_CAP }, (_, index) => ({
    id: `visit-${index}`,
    age: index + 1,
    kind: 'checkup' as const,
    pricePaid: 0,
    complimentary: true,
  }));
  const junk = { leftover: true };
  const profile = character({
    age: 30,
    cash: 200,
    healthcare: { conditions: [], visits: [junk, ...visits], lastConsultAge: 29 },
  });
  const result = consultDoctor(profile);
  assert(result.ok, 'a ninth visit is stored by dropping an older one');
  const stored = result.character.healthcare?.visits ?? [];
  assert(stored[0] === junk, 'the malformed visit is not the one dropped');
  assert(stored.length === VISIT_HISTORY_CAP + 1, 'eight valid visits remain beside the malformed row');
  assert(!stored.some((entry) => isPlain(entry) && entry.id === 'visit-0'), 'the oldest valid visit is dropped');

  const closed = Array.from({ length: CLOSED_HISTORY_CAP }, (_, index) => concern('cold', 'closed', `closed-${index}`));
  closed.forEach((row, index) => {
    row.closedAtAge = index + 1;
  });
  const openCold = concern('cold', 'undiagnosed', 'open-cold');
  const openAnkle = concern('ankle', 'known', 'open-ankle');
  const displaced = acquireForYear([...closed, openCold, openAnkle], 10, 44);
  const stillOpen = displaced.filter((entry) => isValidCondition(entry) && entry.status !== 'closed');
  const stillClosed = displaced.filter(
    (entry): entry is ConditionRecord => isValidCondition(entry) && entry.status === 'closed',
  );
  assert(stillOpen.length === 2, 'open records stay through the closed cap');
  assert(stillClosed.length === CLOSED_HISTORY_CAP, 'the oldest closed record makes room');
  assert(!stillClosed.some((entry) => entry.id === 'closed-0'), 'the oldest closure is the one removed');
}

function testProjectedZeroHealthAcquiresNothing() {
  const empty: unknown[] = [];
  assert(acquireForYear(empty, 0, 40) === empty, 'health 0 acquires nothing where a heart would otherwise qualify');
  assert(acquireForYear(empty, 0, 80) === empty, 'health 0 acquires nothing where age alone would qualify a heart');
  assert(acquireForYear(empty, -3, 40) === empty, 'a negative projection is treated as zero');
  const acquired = acquireForYear(empty, 1, 40);
  assert(
    acquired.length === 1 && isValidCondition(acquired[0]) && acquired[0].catalogId === 'heart',
    'health 1 can still add a heart',
  );
  const full = [concern('cold'), concern('ankle', 'known', 'ankle-zero')];
  assert(acquireForYear(full, 0, 40) === full, 'health 0 does not displace a cold');
}

function testTooYoungIsRefused() {
  const child = character({ age: 5 });
  const result = consultDoctor(child);
  assert(!result.ok && result.character === child, 'under 6 returns the same character');
  assert(child.healthcare === undefined, 'no record is created before 6');
  assert(acquireForYear([], 10, 5).length === 0, 'no concern is acquired before 6');
}

function isPlain(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

testAbsentFieldCreatesAVisit();
testMalformedRowsStayAndAreIgnored();
testOpenCapRefusesAThirdTemporary();
testHeartDisplacesTheCold();
testProjectedZeroHealthAcquiresNothing();
testClearAndNamedVisits();
testShortCashAndThePaidVisit();
testSecondVisitSameYear();
testHistoryCaps();
testTooYoungIsRefused();
