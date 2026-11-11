import type { CharacterProfile } from '../../../types/game';
import { calculatePlayerNetWorth } from '../../assets/services/assetService';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { getConditionListing } from '../data/conditionCatalog';
import {
  cancelEnrollment,
  chestCourseAwaitingClose,
  declineTreatment,
  enrollCare,
  isValidCondition,
  isValidVisit,
  startTreatment,
} from '../services/healthcareService';
import type { ConditionId, ConditionRecord } from '../types';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function character(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_treat',
    firstName: 'Mina',
    lastName: 'Cole',
    gender: 'female',
    age: 30,
    birthYear: 2000,
    city: 'Austin',
    country: 'United States',
    isAlive: true,
    stats: { health: 80, happiness: 70, smarts: 40, looks: 60, karma: 55 },
    cash: 1000,
    bankBalance: 8000,
    netWorth: 9000,
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
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function concern(catalogId: ConditionId, id = catalogId): ConditionRecord {
  return {
    id,
    catalogId,
    status: 'known',
    acquiredAtAge: 20,
    diagnosedAtAge: 20,
    symptom: `Symptom for ${catalogId}.`,
    untreatedYears: 0,
  };
}

function withConcern(catalogId: ConditionId, overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const row = concern(catalogId);
  return character({
    healthcare: { conditions: [row], visits: [], lastConsultAge: 12 },
    ...overrides,
  });
}

function onlyCondition(profile: CharacterProfile): ConditionRecord {
  const row = profile.healthcare?.conditions.find(isValidCondition);
  if (!row) throw new Error('expected a condition');
  return row;
}

function priceOf(catalogId: ConditionId, field: 'remedyPrice' | 'procedurePrice' | 'enrollPrice'): number {
  const listing = getConditionListing(catalogId);
  const price = listing?.[field];
  if (price === null || price === undefined) throw new Error(`missing ${field} for ${catalogId}`);
  return price;
}

function testColdAndAnkleDeltas() {
  const coldPrice = priceOf('cold', 'remedyPrice');
  const cold = withConcern('cold', { age: 10, cash: coldPrice, bankBalance: 400 });
  const treated = startTreatment(cold, 'cold');
  assert(treated.ok, 'a named cold can be treated');
  assert(treated.character.cash === 0, 'the remedy spends cash');
  assert(treated.character.bankBalance === 400, 'the bank is not the wallet');
  assert(treated.character.stats.health === 80 + (getConditionListing('cold')?.remedyHealth ?? 0), 'the cold remedy applies its health delta once');
  assert(treated.character.stats.happiness === 70, 'the remedy does not apply the untreated happiness change');
  assert(treated.character.healthcare?.lastConsultAge === 12, 'treatment does not consume the consultation');
  const closed = onlyCondition(treated.character);
  assert(closed.status === 'closed' && closed.closure === 'recovered' && closed.treatedAtAge === 10, 'the cold closes on purchase');
  assert(treated.character.netWorth === calculatePlayerNetWorth(treated.character), 'net worth follows the cash');
  const again = startTreatment(treated.character, 'cold');
  assert(!again.ok && again.character === treated.character, 'a second remedy returns the same character');

  const anklePrice = priceOf('ankle', 'remedyPrice');
  const ankle = withConcern('ankle', { cash: anklePrice, bankBalance: 50 });
  const wrapped = startTreatment(ankle, 'ankle');
  assert(wrapped.ok, 'a named ankle can be treated');
  assert(wrapped.character.stats.health === 80 + (getConditionListing('ankle')?.remedyHealth ?? 0), 'the wrap applies its health delta');
  assert(wrapped.character.stats.happiness === 70, 'the wrap does not change happiness');
  assert(onlyCondition(wrapped.character).status === 'closed', 'the ankle closes on purchase');
}

function testChestCourseStaysOpen() {
  const price = priceOf('chest', 'remedyPrice');
  const bought = startTreatment(withConcern('chest', { cash: price }), 'chest');
  assert(bought.ok, 'the chest course can be bought');
  assert(bought.character.stats.health === 80 + (getConditionListing('chest')?.remedyHealth ?? 0), 'the course applies its health delta now');
  const row = onlyCondition(bought.character);
  assert(row.status === 'known' && row.treatedAtAge === 30 && row.closure === undefined, 'the chest stays known');
  assert(chestCourseAwaitingClose(row), 'the year function can see that the course is waiting to close');
  const repeat = startTreatment(bought.character, 'chest');
  assert(!repeat.ok && repeat.character === bought.character, 'a second course returns the same character');
  assert(repeat.character.stats.health === bought.character.stats.health, 'the second course does not heal again');
}

function testHeartProcedureAndSeparateFollowUp() {
  const procedure = priceOf('heart', 'procedurePrice');
  const followUp = priceOf('heart', 'enrollPrice');
  const profile = withConcern('heart', { age: 72, cash: procedure + followUp, bankBalance: 900, stats: {
    health: 40, happiness: 70, smarts: 40, looks: 60, karma: 55,
  } });
  const early = enrollCare(profile, 'heart');
  assert(!early.ok && early.character === profile, 'follow-up before the procedure returns the same character');
  assert(early.reason === 'The procedure has to come first.', 'follow-up is refused until the procedure is done');

  const done = startTreatment(profile, 'heart');
  assert(done.ok, 'the procedure can be bought');
  assert(done.character.cash === followUp, 'the procedure costs only its own price');
  assert(done.character.bankBalance === 900, 'the procedure does not use the bank');
  assert(done.character.stats.health === 40, 'the procedure does not restore health');
  const afterProcedure = onlyCondition(done.character);
  assert(afterProcedure.procedureCompleted === true && afterProcedure.treatedAtAge === 72, 'the procedure is recorded');
  assert(afterProcedure.enrolled !== true, 'the procedure does not enroll follow-up');
  const repeat = startTreatment(done.character, 'heart');
  assert(!repeat.ok && repeat.character === done.character, 'a second procedure returns the same character');

  const enrolled = enrollCare(done.character, 'heart');
  assert(enrolled.ok, 'follow-up is its own payment');
  assert(enrolled.character.cash === 0, 'follow-up spends its own price');
  assert(enrolled.character.stats.health === 40, 'follow-up does not change health');
  const covered = onlyCondition(enrolled.character);
  assert(covered.enrolled === true && covered.coverageThroughAge === 72, 'follow-up covers the current age');
  const visit = enrolled.character.healthcare?.visits.at(-1);
  assert(isValidVisit(visit) && visit.pricePaid === followUp && visit.catalogId === 'heart', 'the follow-up visit records its own price');
}

function testDeclineThenTreat() {
  const profile = withConcern('cold', { age: 14, cash: priceOf('cold', 'remedyPrice'), bankBalance: 20 });
  const declined = declineTreatment(profile, 'cold');
  assert(declined.ok, 'declining is allowed');
  assert(declined.character.cash === profile.cash && declined.character.stats.health === 80, 'declining is free and does not heal');
  const waiting = onlyCondition(declined.character);
  assert(waiting.status === 'known' && waiting.declinedAtAge === 14, 'the concern stays open and records the decline');
  const second = declineTreatment(declined.character, 'cold');
  assert(!second.ok && second.character === declined.character, 'a second decline this year returns the same character');
  const treated = startTreatment(declined.character, 'cold');
  assert(treated.ok && onlyCondition(treated.character).status === 'closed', 'a declined concern can still be treated later');
}

function testShortCashLeavesTheBank() {
  const profile = withConcern('ankle', { cash: 10, bankBalance: 5000 });
  const refused = startTreatment(profile, 'ankle');
  assert(!refused.ok && refused.character === profile, 'short cash returns the same character');
  assert(refused.reason?.includes('$40') && refused.reason.includes('$10') && refused.reason.includes('bank'), 'the reason names the price, the cash, and the bank');
  assert(profile.cash === 10 && profile.bankBalance === 5000 && profile.stats.health === 80, 'nothing is recorded as paid');
}

function testSameCoverageIsNotChargedTwice(catalogId: 'joints' | 'heart', age: number) {
  const enrollPrice = priceOf(catalogId, 'enrollPrice');
  const procedure = catalogId === 'heart' ? priceOf('heart', 'procedurePrice') : 0;
  let profile = withConcern(catalogId, {
    age,
    cash: procedure + enrollPrice,
    bankBalance: 1000,
  });
  if (catalogId === 'heart') {
    const procedureResult = startTreatment(profile, catalogId);
    assert(procedureResult.ok && procedureResult.character.stats.health === 80, 'the heart procedure still does not heal');
    profile = procedureResult.character;
  }
  const cashAfterSetup = profile.cash;
  const enrolled = enrollCare(profile, catalogId);
  assert(enrolled.ok, `${catalogId} care can be enrolled`);
  assert(enrolled.character.cash === cashAfterSetup - enrollPrice, `${catalogId} care charges once`);
  assert(enrolled.character.stats.health === 80, `${catalogId} enrollment does not change health`);
  assert(onlyCondition(enrolled.character).coverageThroughAge === age, `${catalogId} coverage is the current age`);

  const duplicate = enrollCare(enrolled.character, catalogId);
  assert(!duplicate.ok && duplicate.character === enrolled.character, `a second ${catalogId} enrollment returns the same character`);

  const canceled = cancelEnrollment(enrolled.character, catalogId);
  assert(canceled.ok, `${catalogId} care can be canceled`);
  assert(canceled.character.cash === enrolled.character.cash, 'canceling does not refund');
  assert(canceled.character.bankBalance === 1000, 'canceling does not touch the bank');
  const paused = onlyCondition(canceled.character);
  assert(paused.enrolled === false && paused.coverageThroughAge === age, 'the paid year stays on the record');

  const resumed = enrollCare(canceled.character, catalogId);
  assert(resumed.ok, `${catalogId} care can resume in the same year`);
  assert(resumed.character.cash === canceled.character.cash, `${catalogId} care is not charged twice for the same year`);
  assert(resumed.character.stats.health === 80, 'resuming does not change health');
  const resumedRow = onlyCondition(resumed.character);
  assert(resumedRow.enrolled === true && resumedRow.coverageThroughAge === age, 'coverage stays on the year already paid');
  const resumeVisit = resumed.character.healthcare?.visits.at(-1);
  assert(isValidVisit(resumeVisit) && resumeVisit.pricePaid === 0, 'the resumed visit records no charge');

  const later = enrollCare(
    character({
      ...canceled.character,
      age: age + 1,
      cash: enrollPrice,
    }),
    catalogId,
  );
  assert(later.ok && later.character.cash === 0, `a later year of ${catalogId} care is a new charge`);
  assert(onlyCondition(later.character).coverageThroughAge === age + 1, 'the new payment covers the new age');
}

function testUndiagnosedTreatmentIsRefused() {
  const row = concern('cold');
  row.status = 'undiagnosed';
  const profile = character({ healthcare: { conditions: [row], visits: [] }, cash: 100 });
  const refused = startTreatment(profile, 'cold');
  assert(!refused.ok && refused.character === profile, 'an unnamed concern returns the same character');
}

function testJointsAreNotAOneTimeRemedy() {
  const profile = withConcern('joints', { age: 60, cash: 500 });
  const refused = startTreatment(profile, 'joints');
  assert(!refused.ok && refused.character === profile, 'joints are not bought as a one-time remedy');
  assert(refused.reason === 'That care is a yearly enrollment.', 'joints point to enrollment');
}

testColdAndAnkleDeltas();
testChestCourseStaysOpen();
testHeartProcedureAndSeparateFollowUp();
testDeclineThenTreat();
testShortCashLeavesTheBank();
testSameCoverageIsNotChargedTwice('joints', 60);
testSameCoverageIsNotChargedTwice('heart', 72);
testUndiagnosedTreatmentIsRefused();
testJointsAreNotAOneTimeRemedy();
