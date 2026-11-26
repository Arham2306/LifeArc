import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MenuScreen } from '../../../components/layout/MenuScreen';
import type { CharacterProfile } from '../../../types/game';
import { ageUpCharacter } from '../../aging/services/agingService';
import { createInitialCareerState } from '../../career/services/careerService';
import { createEmptyCrimeState } from '../../crime/services/crimeSelectors';
import { createInitialEducation } from '../../education/services/educationService';
import { ActivitiesScreen } from '../components/ActivitiesScreen';
import {
  getActiveAddictions,
  getClubbingSessionsRemaining,
  getOpenLawsuitClaims,
} from '../services/activitiesSelectors';
import { progressActivitiesForYear } from '../services/activitiesService';
import { attendRehab } from '../services/addictionService';
import { fileCivilLawsuit } from '../services/lawsuitService';
import { goClubbing, resolveViceTemptation } from '../services/nightlifeService';
import { undergoPlasticSurgery } from '../services/surgeryService';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const age = overrides.age ?? 25;
  return {
    id: 'char-activities-1c-test',
    firstName: 'Morgan',
    lastName: 'Hayes',
    gender: 'male',
    age,
    birthYear: 2026 - age,
    country: 'United States',
    flag: '🇺🇸',
    city: 'Austin',
    occupation: age < 18 ? 'Student' : 'Marketing Manager',
    parents: {
      father: {
        id: 'father-1c',
        role: 'father',
        firstName: 'Paul',
        lastName: 'Hayes',
        age: age + 28,
        occupation: 'Analyst',
        isAlive: true,
        relationship: 75,
        generosity: 60,
      },
      mother: {
        id: 'mother-1c',
        role: 'mother',
        firstName: 'Clara',
        lastName: 'Hayes',
        age: age + 26,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 80,
        generosity: 65,
      },
      wealth: 'comfortable',
    },
    cash: 15000,
    bankBalance: 50000,
    netWorth: 65000,
    isAlive: true,
    stats: {
      health: 70,
      happiness: 65,
      smarts: 70,
      looks: 65,
      karma: 60,
    },
    relationships: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function makePrisoner(age = 25): CharacterProfile {
  return makeCharacter({
    age,
    occupation: 'Incarcerated',
    crime: {
      ...createEmptyCrimeState(),
      prison: {
        facilityName: 'Oakridge State Prison',
        securityLevel: 'medium',
        chargeTitle: 'Burglary',
        yearsTotal: 3,
        yearsServed: 0,
        yearsRemaining: 3,
        behaviorScore: 60,
        paroleEligibleAtServed: 1,
        actionsTakenThisYear: 0,
        lastActionAge: age,
        lastProgressedAge: null,
      },
    },
  });
}

// 1. Nightlife / Clubbing outcomes, Martial Arts defense, and Temptation choices
{
  assert(
    !goClubbing(makeCharacter({ age: 17 })).succeeded,
    'Clubbing is locked before Age 18'
  );
  assert(
    !goClubbing(makeCharacter({ cash: 50, bankBalance: 100000 })).succeeded,
    'Clubbing requires $80 wallet cash regardless of bankBalance'
  );

  // Outcome 1: Electric Night Out (< 0.30)
  const adult = makeCharacter({ cash: 1000, bankBalance: 10000 });
  const electric = goClubbing(adult, () => 0.1);
  assert(
    electric.succeeded &&
      electric.costPaid === 80 &&
      electric.character.cash === 920 &&
      electric.character.bankBalance === 10000 &&
      electric.character.stats.happiness === 73 &&
      electric.character.stats.looks === 67 &&
      getClubbingSessionsRemaining(electric.character) === 1,
    'Electric Night Out charges $80 cash, boosts +8 Happiness / +2 Looks, and decrements annual limit'
  );

  // Outcome 2: Social Connection (< 0.55)
  const social = goClubbing(electric.character, () => 0.4);
  assert(
    social.succeeded &&
      social.character.relationships.length === 1 &&
      social.character.relationships[0].stageMet === 'adulthood' &&
      social.character.relationships[0].role === 'Nightlife Friend' &&
      getClubbingSessionsRemaining(social.character) === 0,
    'Social Connection adds an adult Nightlife Friend and reaches 2x/yr clubbing cap'
  );
  assert(
    !goClubbing(social.character, () => 0.1).succeeded,
    '3rd clubbing visit in same year is blocked'
  );

  // Outcome 3: Bar Scuffle — untrained injury + nightlife_assault claim vs Black Belt defense
  const scuffleInjured = goClubbing(adult, () => 0.65);
  assert(
    scuffleInjured.succeeded &&
      scuffleInjured.character.stats.health === 60 &&
      scuffleInjured.character.stats.happiness === 60 &&
      getOpenLawsuitClaims(scuffleInjured.character).length === 1 &&
      getOpenLawsuitClaims(scuffleInjured.character)[0].source === 'nightlife_assault',
    'Untrained bar scuffle drops -10 Health and creates nightlife_assault PendingLawsuitClaim'
  );

  const blackBeltFighter = makeCharacter({
    cash: 1000,
    activities: {
      diet: 'standard',
      dietLastProgressedAge: null,
      gymMembershipActive: false,
      gymMembershipAge: null,
      martialArts: {
        karate: { discipline: 'karate', beltRank: 7, lastTrainedAge: 24 },
      },
      annualActionCounts: {},
      lastActionAge: null,
      licenses: {},
      lastDriversTestAge: null,
      lastVacationAge: null,
      lastEmigrationAge: null,
      plasticSurgeryCount: 0,
      addictions: [],
      lastRehabAge: null,
      pendingClaims: [],
    },
  });
  const scuffleDefended = goClubbing(blackBeltFighter, () => 0.65);
  assert(
    scuffleDefended.succeeded &&
      scuffleDefended.character.stats.health === 70 &&
      scuffleDefended.character.stats.happiness === 70 &&
      getOpenLawsuitClaims(scuffleDefended.character).length === 0,
    'Black Belt martial artist handles Bar Scuffle with 0 injury and +5 Happiness'
  );

  const fatalScuffle = goClubbing(
    makeCharacter({
      cash: 1000,
      stats: { health: 8, happiness: 65, smarts: 70, looks: 65, karma: 60 },
    }),
    () => 0.65
  );
  assert(
    fatalScuffle.succeeded &&
      !fatalScuffle.character.isAlive &&
      fatalScuffle.character.stats.health === 0 &&
      fatalScuffle.character.causeOfDeath === 'Nightlife assault injuries' &&
      fatalScuffle.character.timeline.some((e) => e.title === 'Rest in Peace'),
    'Fatal bar scuffle drops health to 0, sets Nightlife assault injuries cause, and records death'
  );

  // Outcome 4: Vice Temptation Offer
  const tempt = goClubbing(adult, () => 0.85);
  assert(
    tempt.succeeded &&
      tempt.temptation !== undefined &&
      tempt.character.cash === 920 &&
      getClubbingSessionsRemaining(tempt.character) === 1,
    'Vice Temptation returns temptation prompt while charging $80 entry and consuming 1 visit'
  );

  const declined = resolveViceTemptation(tempt.character, tempt.temptation!.addictionId, false);
  assert(
    declined.succeeded &&
      declined.character.stats.karma === 62 &&
      getActiveAddictions(declined.character).length === 0,
    'Declining temptation rewards +2 Karma with no addiction'
  );

  const hooked = resolveViceTemptation(
    tempt.character,
    tempt.temptation!.addictionId,
    true,
    () => 0.05
  );
  assert(
    hooked.succeeded &&
      hooked.character.stats.happiness === 75 &&
      getActiveAddictions(hooked.character).length === 1 &&
      getActiveAddictions(hooked.character)[0].severity === 35,
    'Accepting temptation with low RNG triggers ActiveAddiction (severity 35) and +10 Happiness'
  );

  const escalated = resolveViceTemptation(
    hooked.character,
    tempt.temptation!.addictionId,
    true,
    () => 0.05
  );
  assert(
    escalated.succeeded &&
      getActiveAddictions(escalated.character).length === 1 &&
      getActiveAddictions(escalated.character)[0].severity === 50,
    'Accepting the same vice while addicted increases severity by +15 without duplicating entries'
  );

  assert(
    !resolveViceTemptation(makeCharacter({ age: 17 }), 'alcohol', true).succeeded,
    'resolveViceTemptation enforces Age 18 gate'
  );
}

// 2. Addictions aging drain, prison pause, and Rehab tiers
{
  const addicted = resolveViceTemptation(makeCharacter({ cash: 1000, bankBalance: 20000 }), 'alcohol', true, () => 0.05).character;
  const drainedYear = progressActivitiesForYear(
    addicted,
    26,
    1000,
    { isIncarceratedForYear: false }
  );
  assert(
    drainedYear.healthDelta === -4 &&
      drainedYear.happinessDelta === -4 &&
      drainedYear.cashSpent >= 250 &&
      drainedYear.cashSpent <= 600 &&
      drainedYear.activities?.addictions[0].severity === 40,
    'Active addiction applies -4 Health, -4 Happiness, and $250-$600 wallet drain on yearly progression'
  );

  const lowCashDrained = progressActivitiesForYear(addicted, 26, 50, {
    isIncarceratedForYear: false,
  });
  assert(
    lowCashDrained.cashSpent === 50,
    'Addiction cash drain clamps to spendable wallet cash without going negative'
  );

  const agedAddicted = ageUpCharacter(addicted);
  assert(
    agedAddicted.bankBalance === 20000,
    'ageUpCharacter integrates addiction drain without touching bankBalance'
  );

  const prisonYear = progressActivitiesForYear(addicted, 26, 1000, {
    isIncarceratedForYear: true,
  });
  assert(
    prisonYear.cashSpent === 0 &&
      prisonYear.healthDelta === 0 &&
      prisonYear.happinessDelta === 0 &&
      prisonYear.activities?.addictions.length === 1,
    'Incarceration suspends addiction cash and stat drain while preserving addiction state'
  );

  // Rehab tiers & 1x/yr cap
  const noCashStandard = attendRehab(makeCharacter({ cash: 500, bankBalance: 50000, activities: addicted.activities }), 'alcohol', 'standard');
  assert(!noCashStandard.succeeded, 'Standard rehab ($2,500) enforces wallet cash check');

  const failedRehab = attendRehab(addicted, 'alcohol', 'community', () => 0.99);
  assert(
    failedRehab.succeeded &&
      failedRehab.character.stats.karma === 62 &&
      getActiveAddictions(failedRehab.character)[0].severity === 20 &&
      !attendRehab(failedRehab.character, 'alcohol', 'luxury', () => 0.1).succeeded,
    'Community rehab grants +2 Karma, eases severity on relapse, and enforces 1x/yr limit'
  );

  const nextAgeRehab = { ...failedRehab.character, age: failedRehab.character.age + 1, cash: 15000 };
  const luxuryRecover = attendRehab(nextAgeRehab, 'alcohol', 'luxury', () => 0.1);
  assert(
    luxuryRecover.succeeded &&
      luxuryRecover.costPaid === 12000 &&
      luxuryRecover.character.cash === 3000 &&
      getActiveAddictions(luxuryRecover.character).length === 0,
    'Luxury rehab clears addiction on recovery and deducts $12,000 fee'
  );
}

// 3. Civil Lawsuits (botched surgery & assault claims, fee isolation, win/loss, idempotency, 2-year expiry)
{
  const botched = undergoPlasticSurgery(
    makeCharacter({ cash: 10000, bankBalance: 30000 }),
    'rhinoplasty',
    'budget',
    () => 0.01
  ).character;
  const openSurgeryClaims = getOpenLawsuitClaims(botched);
  assert(
    openSurgeryClaims.length === 1 && openSurgeryClaims[0].source === 'botched_surgery',
    'Botched cosmetic surgery exposes open botched_surgery claim to lawsuit service'
  );

  const claim = openSurgeryClaims[0];
  assert(
    !fileCivilLawsuit({ ...botched, cash: 100, bankBalance: 100000 }, claim.id, 'public').succeeded,
    'Lawsuit rejects filing when wallet cash < attorney fee despite bankBalance'
  );

  const winRes = fileCivilLawsuit(botched, claim.id, 'private', () => 0.1);
  const expectedNetDelta = claim.claimedDamages - 2500;
  assert(
    winRes.succeeded &&
      winRes.costPaid === 2500 &&
      winRes.character.cash === botched.cash + expectedNetDelta &&
      winRes.character.stats.happiness === botched.stats.happiness + 10 &&
      getOpenLawsuitClaims(winRes.character).length === 0,
    'Winning civil lawsuit pays claimedDamages minus attorney fee, boosts +10 Happiness, and marks claim resolved'
  );
  assert(
    !fileCivilLawsuit(winRes.character, claim.id, 'public').succeeded,
    'Resolved lawsuit claim cannot be re-filed (idempotent)'
  );

  // Losing bar assault lawsuit
  const barVictim = goClubbing(makeCharacter({ cash: 5000 }), () => 0.65).character;
  const barClaim = getOpenLawsuitClaims(barVictim)[0];
  const lossRes = fileCivilLawsuit(barVictim, barClaim.id, 'public', () => 0.99);
  assert(
    lossRes.succeeded &&
      lossRes.costPaid === 300 &&
      lossRes.character.cash === barVictim.cash - 300 &&
      lossRes.character.stats.happiness === barVictim.stats.happiness - 6 &&
      getOpenLawsuitClaims(lossRes.character).length === 0,
    'Losing civil lawsuit forfeits $300 filing fee, subtracts -6 Happiness, and marks claim resolved'
  );

  const prunedResolvedYear = progressActivitiesForYear(lossRes.character, lossRes.character.age + 1, 1000, {
    isIncarceratedForYear: false,
  });
  assert(
    prunedResolvedYear.activities?.pendingClaims.length === 0,
    'Resolved claims are pruned on annual progression instead of accumulating forever'
  );

  // 2-year expiry on Age Up / progressActivitiesForYear
  const stillValidYear = progressActivitiesForYear(barVictim, barVictim.age + 2, 1000, {
    isIncarceratedForYear: false,
  });
  assert(
    stillValidYear.activities?.pendingClaims.length === 1,
    'Claim remains valid through expiresAtAge (age + 2)'
  );
  const expiredYear = progressActivitiesForYear(
    { ...barVictim, activities: stillValidYear.activities },
    barVictim.age + 3,
    1000,
    { isIncarceratedForYear: true }
  );
  assert(
    expiredYear.activities?.pendingClaims.length === 0 &&
      expiredYear.events.some((e) => e.title === 'Lawsuit Claim Expired'),
    'Unresolved claim auto-expires after 2-year window even during prison year'
  );
}

// 4. Incarceration lockouts + SSR UI verification
{
  const barVictim = goClubbing(makeCharacter({ cash: 5000 }), () => 0.65).character;
  const hookedPrisoner = makePrisoner(25);
  hookedPrisoner.activities = {
    ...barVictim.activities!,
    addictions: [
      { id: 'alcohol', severity: 40, acquiredAtAge: 24, lastProgressedAge: null },
    ],
  };
  const openClaimId = hookedPrisoner.activities.pendingClaims[0].id;

  assert(
    !goClubbing(hookedPrisoner).succeeded &&
      !resolveViceTemptation(hookedPrisoner, 'alcohol', false).succeeded &&
      !attendRehab(hookedPrisoner, 'alcohol', 'community').succeeded &&
      !fileCivilLawsuit(hookedPrisoner, openClaimId, 'public').succeeded,
    'All nightlife, addiction rehab, and civil lawsuit actions lock while incarcerated'
  );

  const nightlifeHtml = renderToStaticMarkup(
    React.createElement(ActivitiesScreen, {
      character: {
        ...makeCharacter({ cash: 5000 }),
        activities: hookedPrisoner.activities,
      },
      onUpdateCharacter: () => {},
      onBackToMenu: () => {},
      initialTab: 'nightlife',
    })
  );
  assert(
    nightlifeHtml.includes('Nightlife &amp; Clubbing') &&
      nightlifeHtml.includes('Addictions &amp; Rehab Center') &&
      nightlifeHtml.includes('Alcohol Dependence') &&
      nightlifeHtml.includes('Civil Lawsuits &amp; Open Claims') &&
      nightlifeHtml.includes('Velvet Lounge Security'),
    'ActivitiesScreen Nightlife & Legal tab renders clubbing, addictions/rehab, and open civil claims'
  );

  const menuHtml = renderToStaticMarkup(
    React.createElement(MenuScreen, {
      character: makeCharacter(),
      onOpenRelationships: () => {},
    })
  );
  assert(menuHtml.includes('nightlife &amp; legal'), 'MenuScreen renders updated Mind & Body subtitle');
}

console.log('nightlifeAndLawsuits.test.ts: All assertions passed.');
