import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MenuScreen } from '../../../components/layout/MenuScreen';
import type { CharacterProfile, PersonProfile } from '../../../types/game';
import { createInitialCareerState } from '../../career/services/careerService';
import { createEmptyCrimeState } from '../../crime/services/crimeSelectors';
import { createInitialEducation } from '../../education/services/educationService';
import { ActivitiesScreen } from '../components/ActivitiesScreen';
import {
  getActiveVacationCompanions,
  hasBoatingLicense,
  hasDriversLicense,
  hasPilotLicense,
} from '../services/activitiesSelectors';
import { undergoPlasticSurgery } from '../services/surgeryService';
import {
  attemptEmigration,
  calculateVacationCost,
  drawDriversQuizQuestions,
  evaluateEmigrationEligibility,
  submitDriversLicenseQuiz,
  takeLicenseExam,
  takeVacation,
} from '../services/travelLicenseService';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const age = overrides.age ?? 25;
  return {
    id: 'char-activities-1b-test',
    firstName: 'Taylor',
    lastName: 'Brooks',
    gender: 'female',
    age,
    birthYear: 2026 - age,
    country: 'United States',
    flag: '🇺🇸',
    city: 'Seattle',
    occupation: age < 18 ? 'Student' : 'Architect',
    parents: {
      father: {
        id: 'father-1b',
        role: 'father',
        firstName: 'Mark',
        lastName: 'Brooks',
        age: age + 28,
        occupation: 'Accountant',
        isAlive: true,
        relationship: 75,
        generosity: 60,
      },
      mother: {
        id: 'mother-1b',
        role: 'mother',
        firstName: 'Nina',
        lastName: 'Brooks',
        age: age + 26,
        occupation: 'Designer',
        isAlive: true,
        relationship: 80,
        generosity: 65,
      },
      wealth: 'comfortable',
    },
    cash: 25000,
    bankBalance: 50000,
    netWorth: 75000,
    isAlive: true,
    stats: {
      health: 70,
      happiness: 70,
      smarts: 75,
      looks: 60,
      karma: 70,
    },
    relationships: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function makePartner(): PersonProfile {
  return {
    id: 'partner-1b',
    firstName: 'Sam',
    lastName: 'Rivera',
    role: 'Wife',
    age: 25,
    gender: 'female',
    relationship: 70,
    romanceMeter: 75,
    romanticStage: 'married',
    relationshipType: 'spouse',
    originStory: 'Met in university.',
    stageMet: 'university',
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

// 1. Plastic Surgery (3 tiers, success, botch + PendingLawsuitClaim, fatal botch, cash-only)
{
  const teen = makeCharacter({ age: 17 });
  assert(
    !undergoPlasticSurgery(teen, 'veneers', 'budget').succeeded,
    'Plastic surgery is locked under Age 18'
  );

  const broke = makeCharacter({ cash: 1000, bankBalance: 100000 });
  assert(
    !undergoPlasticSurgery(broke, 'veneers', 'budget').succeeded &&
      broke.bankBalance === 100000,
    'Plastic surgery rejects insufficient wallet cash without touching bankBalance'
  );

  const base = makeCharacter({ cash: 10000, bankBalance: 50000 });
  const successRes = undergoPlasticSurgery(base, 'veneers', 'budget', () => 0.9);
  assert(
    successRes.succeeded &&
      successRes.costPaid === 2275 &&
      successRes.character.cash === 7725 &&
      successRes.character.bankBalance === 50000 &&
      successRes.character.stats.looks === 68 &&
      successRes.character.stats.happiness === 75 &&
      successRes.character.activities?.plasticSurgeryCount === 1,
    'Successful budget veneers deducts $2,275 cash, boosts +8 Looks / +5 Happiness, and increments count'
  );

  const botchRes = undergoPlasticSurgery(base, 'rhinoplasty', 'budget', () => 0.01);
  assert(
    botchRes.succeeded &&
      botchRes.character.isAlive &&
      botchRes.character.stats.looks === 42 &&
      botchRes.character.stats.health === 60 &&
      botchRes.character.stats.happiness === 55 &&
      botchRes.character.activities?.pendingClaims.length === 1 &&
      botchRes.character.activities.pendingClaims[0].source === 'botched_surgery' &&
      botchRes.character.activities.pendingClaims[0].expiresAtAge === 27 &&
      !botchRes.character.activities.pendingClaims[0].resolved,
    'Botched rhinoplasty applies -18 Looks / -10 Health / -15 Happiness and creates 2-year PendingLawsuitClaim'
  );

  const fragile = makeCharacter({
    cash: 10000,
    stats: { health: 8, happiness: 50, smarts: 60, looks: 50, karma: 60 },
  });
  const fatalBotch = undergoPlasticSurgery(fragile, 'rhinoplasty', 'budget', () => 0.01);
  assert(
    fatalBotch.succeeded &&
      !fatalBotch.character.isAlive &&
      fatalBotch.character.stats.health === 0 &&
      fatalBotch.character.causeOfDeath === 'Surgical complications' &&
      fatalBotch.summary.includes('proved fatal') &&
      !fatalBotch.summary.includes('Recovery left lasting scarring') &&
      fatalBotch.character.timeline.some((e) => e.title === 'Rest in Peace'),
    'Fatal surgical complication sets Surgical complications causeOfDeath without scarring recovery wording'
  );
}

// 2. Licenses (Driver's Quiz, Boating, Pilot)
{
  const questions = drawDriversQuizQuestions(() => 0.4);
  assert(
    questions.length === 3 && new Set(questions.map((q) => q.id)).size === 3,
    'drawDriversQuizQuestions draws 3 distinct questions'
  );

  const age15 = makeCharacter({ age: 15 });
  assert(
    !submitDriversLicenseQuiz(
      age15,
      questions,
      questions.map((q) => q.correctIndex)
    ).succeeded,
    'Drivers quiz blocked under Age 16'
  );

  const driver16 = makeCharacter({ age: 16, cash: 500 });
  const failAnswers = questions.map((q, idx) =>
    idx === 0 ? q.correctIndex : ((q.correctIndex + 1) % 3)
  );
  const failedQuiz = submitDriversLicenseQuiz(driver16, questions, failAnswers);
  assert(
    failedQuiz.succeeded &&
      failedQuiz.costPaid === 75 &&
      failedQuiz.character.cash === 425 &&
      !hasDriversLicense(failedQuiz.character) &&
      failedQuiz.character.activities?.lastDriversTestAge === 16,
    'Failed DMV quiz (1/3) charges $75, records attempt age, and does not grant license'
  );
  assert(
    !submitDriversLicenseQuiz(
      failedQuiz.character,
      questions,
      questions.map((q) => q.correctIndex)
    ).succeeded,
    'DMV quiz blocks retry in same year'
  );

  const nextYearDriver = { ...failedQuiz.character, age: 17 };
  const passAnswers = questions.map((q, idx) =>
    idx < 2 ? q.correctIndex : ((q.correctIndex + 1) % 3)
  );
  const passedQuiz = submitDriversLicenseQuiz(nextYearDriver, questions, passAnswers);
  assert(
    passedQuiz.succeeded &&
      hasDriversLicense(passedQuiz.character) &&
      passedQuiz.character.activities?.licenses.drivers?.acquiredAtAge === 17,
    'Passing DMV quiz (2/3) next year grants Driver License'
  );

  // Boating & Pilot
  const lowSmartsAdult = makeCharacter({
    age: 22,
    stats: { health: 70, happiness: 70, smarts: 55, looks: 60, karma: 70 },
  });
  assert(
    !takeLicenseExam(lowSmartsAdult, 'pilot').succeeded,
    'Pilot License requires Smarts >= 60'
  );

  const smartAdult = makeCharacter({ age: 22, cash: 6000 });
  const boatingPass = takeLicenseExam(smartAdult, 'boating', () => 0.1);
  assert(
    boatingPass.succeeded &&
      boatingPass.costPaid === 350 &&
      hasBoatingLicense(boatingPass.character) &&
      !takeLicenseExam(boatingPass.character, 'boating').succeeded,
    'Boating License grants license on pass and cannot be re-taken once owned'
  );

  const pilotFail = takeLicenseExam(boatingPass.character, 'pilot', () => 0.99);
  assert(
    pilotFail.succeeded &&
      pilotFail.costPaid === 4500 &&
      !hasPilotLicense(pilotFail.character) &&
      !takeLicenseExam(pilotFail.character, 'pilot').succeeded,
    'Failed Pilot checkride blocks same-age retry'
  );

  const pilotPass = takeLicenseExam(
    { ...pilotFail.character, age: 23, cash: 5000 },
    'pilot',
    () => 0.1
  );
  assert(
    pilotPass.succeeded && hasPilotLicense(pilotPass.character),
    'Pilot License passes in next year whenSmart/cash conditions met'
  );
}

// 3. Vacations (Solo / Partner / Family pricing, relationship sync, 1x/yr)
{
  const partner = makePartner();
  const familyChar = makeCharacter({
    cash: 20000,
    partner,
    relationships: [partner],
    children: [
      {
        id: 'child-1b',
        firstName: 'Lily',
        lastName: 'Brooks',
        age: 6,
        gender: 'female',
        relationship: 70,
        smarts: 75,
        looks: 70,
        happiness: 70,
        health: 85,
        isAdopted: false,
        occupation: 'Elementary School Student',
        isAlive: true,
      },
    ],
  });

  assert(
    getActiveVacationCompanions(familyChar).totalCount === 2,
    'Detects living partner + living child as 2 vacation companions'
  );
  assert(
    calculateVacationCost(familyChar, 'tropical_resort', 'economy', 'solo') === 2200 &&
      calculateVacationCost(familyChar, 'tropical_resort', 'economy', 'partner') === 3520 &&
      calculateVacationCost(familyChar, 'tropical_resort', 'business', 'family') === 6270,
    'Vacation cost multipliers match Solo 1.0x, Partner 1.6x, Family 1 + 0.45*companions'
  );

  const famTrip = takeVacation(familyChar, 'tropical_resort', 'business', 'family');
  assert(
    famTrip.succeeded &&
      famTrip.costPaid === 6270 &&
      famTrip.character.cash === 13730 &&
      famTrip.character.stats.happiness === 86 &&
      famTrip.character.partner?.relationship === 78 &&
      famTrip.character.partner?.romanceMeter === 83 &&
      famTrip.character.relationships[0].relationship === 78 &&
      famTrip.character.children?.[0].relationship === 78 &&
      famTrip.character.children?.[0].happiness === 76,
    'Family vacation syncs partner +8 rel/romance across partner & relationships and boosts living children'
  );
  assert(
    !takeVacation(famTrip.character, 'coastal_road_trip', 'economy', 'solo').succeeded,
    'Vacations enforce 1x/year cap'
  );

  const childlessCouple = makeCharacter({
    cash: 20000,
    partner: makePartner(),
    relationships: [makePartner()],
    children: [],
  });
  assert(
    !takeVacation(childlessCouple, 'tropical_resort', 'economy', 'family').succeeded,
    'Childless couples must use With Partner rather than Family vacation mode'
  );
}

// 4. Emigration (Crime/Probation/Court blocks, Visa math, Relocation updates, Denial fee)
{
  const probationChar = makeCharacter({
    crime: {
      ...createEmptyCrimeState(),
      probation: {
        chargeTitle: 'Shoplifting',
        jurisdiction: 'adult',
        yearsRemaining: 1,
        startedAtAge: 24,
        lastProgressedAge: null,
        conditions: ['supervision_checkins'],
      },
    },
  });
  assert(
    !evaluateEmigrationEligibility(probationChar, 'Canada').eligible &&
      !attemptEmigration(probationChar, 'Canada').succeeded,
    'Emigration hard-blocks active probation'
  );

  const pendingTrialChar = makeCharacter({
    crime: {
      ...createEmptyCrimeState(),
      pendingCase: {
        id: 'pending-trial-1b',
        crimeId: 'burglary',
        title: 'Burglary',
        tier: 'high_stakes',
        offenseClass: 'felony',
        jurisdiction: 'adult',
        arrestedAtAge: 25,
        arrestedAtYear: 2026,
        executionSucceeded: true,
        injured: false,
        attemptedPayout: 1000,
        baseFine: 2000,
        baseSentenceYears: 2,
      },
    },
  });
  assert(
    !evaluateEmigrationEligibility(pendingTrialChar, 'Canada').eligible &&
      !attemptEmigration(pendingTrialChar, 'Canada').succeeded,
    'Emigration hard-blocks pending court trials'
  );

  const misdemeanorChar = makeCharacter({
    crime: {
      ...createEmptyCrimeState(),
      records: [
        {
          id: 'rec-misd',
          crimeId: 'shoplifting',
          title: 'Shoplifting',
          tier: 'petty',
          offenseClass: 'misdemeanor',
          jurisdiction: 'adult',
          age: 22,
          year: 2023,
          executionSucceeded: true,
          detected: true,
          injured: false,
          attemptedPayout: 150,
          payout: 0,
          fineImposed: 300,
          finePaid: 300,
          attorneyFeePaid: 0,
          sentenceYears: 0,
          outcome: 'fined',
          sentenceStatus: 'completed',
          sealed: false,
          expunged: false,
        },
      ],
    },
  });
  // Canada baseApproval 0.90 - 0.20 = 0.70
  assert(
    evaluateEmigrationEligibility(misdemeanorChar, 'Canada').approvalChance === 0.7,
    'Adult misdemeanor reduces Canada visa approval odds by 20% (0.90 -> 0.70)'
  );

  const felonyDebtChar = makeCharacter({
    crime: {
      ...createEmptyCrimeState(),
      unpaidRestitution: 2000,
      records: [
        {
          id: 'rec-felony',
          crimeId: 'burglary',
          title: 'Burglary',
          tier: 'high_stakes',
          offenseClass: 'felony',
          jurisdiction: 'adult',
          age: 21,
          year: 2022,
          executionSucceeded: true,
          detected: true,
          injured: false,
          attemptedPayout: 1800,
          payout: 0,
          fineImposed: 0,
          finePaid: 0,
          attorneyFeePaid: 0,
          sentenceYears: 2,
          outcome: 'imprisoned',
          sentenceStatus: 'completed',
          sealed: false,
          expunged: false,
        },
      ],
    },
  });
  const felonyEval = evaluateEmigrationEligibility(felonyDebtChar, 'Japan');
  // 0.80 - 0.55 - 0.25 = 0.00 -> clamped to 0.05
  assert(
    felonyEval.eligible && felonyEval.approvalChance === 0.05,
    'Felony (-55%) + unpaid legal debt (-25%) clamps Japan visa approval odds to 5%'
  );

  const denied = attemptEmigration(felonyDebtChar, 'Japan', () => 0.5);
  assert(
    denied.succeeded &&
      denied.costPaid === 150 &&
      denied.character.country === 'United States' &&
      denied.character.cash === 24850 &&
      !attemptEmigration(denied.character, 'Canada').succeeded,
    'Denied visa charges $150 processing fee, keeps origin country, and blocks retry same year'
  );

  const cleanChar = makeCharacter({ cash: 10000 });
  const moved = attemptEmigration(cleanChar, 'Canada', () => 0.1);
  assert(
    moved.succeeded &&
      moved.costPaid === 3000 &&
      moved.character.country === 'Canada' &&
      moved.character.city === 'Toronto' &&
      moved.character.flag === '🇨🇦' &&
      moved.character.cash === 7000,
    'Approved emigration deducts moving fee and updates country, city, and flag'
  );
}

// 5. Incarceration lockouts + SSR render check
{
  const prisoner = makePrisoner(25);
  const quizQuestions = drawDriversQuizQuestions(() => 0.1);
  assert(
    !undergoPlasticSurgery(prisoner, 'veneers', 'budget').succeeded &&
      !submitDriversLicenseQuiz(
        prisoner,
        quizQuestions,
        quizQuestions.map((q) => q.correctIndex)
      ).succeeded &&
      !takeLicenseExam(prisoner, 'boating').succeeded &&
      !takeVacation(prisoner, 'coastal_road_trip', 'economy', 'solo').succeeded &&
      !attemptEmigration(prisoner, 'Canada').succeeded,
    'All surgery, license, vacation, and emigration services lock cleanly while incarcerated'
  );

  const surgeryHtml = renderToStaticMarkup(
    React.createElement(ActivitiesScreen, {
      character: makeCharacter(),
      onUpdateCharacter: () => {},
      onBackToMenu: () => {},
      initialTab: 'surgery',
    })
  );
  assert(
    surgeryHtml.includes('Cosmetic &amp; Plastic Surgery') &&
      surgeryHtml.includes('Porcelain Veneers') &&
      surgeryHtml.includes('Board-Certified Surgeon'),
    'ActivitiesScreen Surgery tab renders procedures and clinic tiers'
  );

  const travelHtml = renderToStaticMarkup(
    React.createElement(ActivitiesScreen, {
      character: makeCharacter(),
      onUpdateCharacter: () => {},
      onBackToMenu: () => {},
      initialTab: 'travel',
    })
  );
  assert(
    travelHtml.includes('Licenses &amp; Certifications') &&
      travelHtml.includes('Boating License') &&
      travelHtml.includes('Tropical Beach Resort') &&
      travelHtml.includes('Canada (Toronto)'),
    'ActivitiesScreen Travel tab renders licenses, vacations, and emigration destinations'
  );

  const menuHtml = renderToStaticMarkup(
    React.createElement(MenuScreen, {
      character: makeCharacter(),
      onOpenRelationships: () => {},
    })
  );
  assert(menuHtml.includes('Mind &amp; Body'), 'MenuScreen renders Mind & Body tile');
}

console.log('surgeryAndTravel.test.ts: All assertions passed.');
