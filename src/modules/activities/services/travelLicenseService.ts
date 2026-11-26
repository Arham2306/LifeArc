import type { CharacterProfile, StatEffects } from '../../../types/game';
import { applyEffects } from '../../character/services/statService';
import {
  getTotalLegalDebt,
  hasActiveAdultConviction,
  hasActiveFelony,
  hasPendingCourtCase,
  isCurrentlyIncarcerated,
  isOnProbation,
} from '../../crime/services/crimeSelectors';
import {
  DRIVERS_QUIZ_POOL,
  EMIGRATION_MIN_AGE,
  EMIGRATION_VISA_DENIAL_FEE,
  VACATION_MIN_AGE,
  getEmigrationDestination,
  getLicenseTemplate,
  getVacationCabinClass,
  getVacationDestination,
} from '../data/travelLicenseCatalog';
import type {
  ActivityActionResult,
  DriversQuizQuestion,
  EmigrationDestinationTemplate,
  PlayerActivitiesState,
  VacationCabinClassId,
  VacationCompanionMode,
  VacationDestinationId,
} from '../types';
import {
  getActiveVacationCompanions,
  getSanitizedActivitiesState,
  hasLicense,
} from './activitiesSelectors';
import {
  blockedActivityResult,
  checkActivityEligibility,
  makeActivityEvent,
} from './activitiesService';

const clampStat = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

export function drawDriversQuizQuestions(
  rng: () => number = Math.random
): DriversQuizQuestion[] {
  const pool = [...DRIVERS_QUIZ_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function submitDriversLicenseQuiz(
  character: CharacterProfile,
  questions: readonly DriversQuizQuestion[],
  selectedIndices: readonly number[]
): ActivityActionResult {
  const template = getLicenseTemplate('drivers')!;
  const guard = checkActivityEligibility(
    character,
    template.minAge,
    template.name,
    'DMV testing is unavailable while incarcerated.'
  );
  if (guard) return blockedActivityResult(character, template.name, guard);

  if (hasLicense(character, 'drivers')) {
    return blockedActivityResult(
      character,
      template.name,
      "You already hold a valid Driver's License."
    );
  }

  const activities = getSanitizedActivitiesState(character);
  if (activities.lastDriversTestAge === character.age) {
    return blockedActivityResult(
      character,
      template.name,
      "You already took the Driver's License quiz this year. Try again next year."
    );
  }

  if (character.cash < template.fee) {
    return blockedActivityResult(
      character,
      template.name,
      `You need $${template.fee.toLocaleString()} in wallet cash for the DMV exam fee.`
    );
  }

  if (questions.length !== 3 || selectedIndices.length !== 3) {
    return blockedActivityResult(character, template.name, 'Please answer all 3 quiz questions.');
  }

  let correct = 0;
  for (let i = 0; i < 3; i++) {
    if (selectedIndices[i] === questions[i].correctIndex) correct++;
  }

  const passed = correct >= 2;
  const nextActivities: PlayerActivitiesState = {
    ...activities,
    lastDriversTestAge: character.age,
    licenses: passed
      ? { ...activities.licenses, drivers: { acquiredAtAge: character.age } }
      : activities.licenses,
  };

  const summary = passed
    ? `Passed the road-rules quiz (${correct}/3)! Earned your Driver's License for $${template.fee}.`
    : `Scored ${correct}/3 on the DMV road-rules quiz (2/3 needed to pass). Paid $${template.fee} test fee.`;
  const effects: StatEffects = passed
    ? { happiness: 5, cash: -template.fee }
    : { happiness: -2, cash: -template.fee };

  const { character: nextChar, applied } = applyEffects(
    {
      ...character,
      activities: nextActivities,
      timeline: [
        ...character.timeline,
        makeActivityEvent(
          character,
          character.age,
          passed ? "Driver's License Earned" : "Driver's Quiz Failed",
          summary,
          passed ? 'milestone' : 'education'
        ),
      ],
    },
    effects
  );

  return {
    character: nextChar,
    succeeded: true,
    title: passed ? "Driver's License Earned!" : 'DMV Quiz Failed',
    summary,
    costPaid: template.fee,
    appliedEffects: applied,
  };
}

export function getAnnualLicenseAttemptsUsed(
  character: Pick<CharacterProfile, 'age' | 'activities'>,
  licenseId: 'boating' | 'pilot'
): number {
  const activities = getSanitizedActivitiesState(character);
  return activities.lastActionAge === character.age
    ? (activities.annualActionCounts[`license_${licenseId}`] ?? 0)
    : 0;
}

export function takeLicenseExam(
  character: CharacterProfile,
  licenseId: 'boating' | 'pilot',
  rng: () => number = Math.random
): ActivityActionResult {
  const template = getLicenseTemplate(licenseId);
  if (!template) return blockedActivityResult(character, 'License Exam', 'License not found.');

  const guard = checkActivityEligibility(
    character,
    template.minAge,
    template.name,
    'Licensing exams are unavailable while incarcerated.'
  );
  if (guard) return blockedActivityResult(character, template.name, guard);

  if (hasLicense(character, licenseId)) {
    return blockedActivityResult(character, template.name, `You already hold a ${template.name}.`);
  }

  if (character.stats.smarts < template.minSmarts) {
    return blockedActivityResult(
      character,
      template.name,
      `${template.name} requires at least ${template.minSmarts} Smarts.`
    );
  }

  if (getAnnualLicenseAttemptsUsed(character, licenseId) >= 1) {
    return blockedActivityResult(
      character,
      template.name,
      `You already attempted the ${template.name} checkride this year.`
    );
  }

  if (character.cash < template.fee) {
    return blockedActivityResult(
      character,
      template.name,
      `You need $${template.fee.toLocaleString()} in wallet cash for ${template.name} certification.`
    );
  }

  const rawPassChance =
    licenseId === 'boating'
      ? 0.55 + (character.stats.smarts - 40) * 0.005
      : 0.45 + (character.stats.smarts - 60) * 0.008;
  const passChance = Math.max(0.4, Math.min(0.92, rawPassChance));
  const passed = rng() < passChance;

  const activities = getSanitizedActivitiesState(character);
  const annualCounts =
    activities.lastActionAge === character.age ? { ...activities.annualActionCounts } : {};
  annualCounts[`license_${licenseId}`] = 1;

  const nextActivities: PlayerActivitiesState = {
    ...activities,
    annualActionCounts: annualCounts,
    lastActionAge: character.age,
    licenses: passed
      ? { ...activities.licenses, [licenseId]: { acquiredAtAge: character.age } }
      : activities.licenses,
  };

  const summary = passed
    ? `Passed the ${template.name} exam! Paid $${template.fee.toLocaleString()}.`
    : `Did not pass the ${template.name} practical check this year. Paid $${template.fee.toLocaleString()}.`;

  const effects: StatEffects = passed
    ? { happiness: licenseId === 'pilot' ? 8 : 5, smarts: 2, cash: -template.fee }
    : { happiness: -3, smarts: 1, cash: -template.fee };

  const { character: nextChar, applied } = applyEffects(
    {
      ...character,
      activities: nextActivities,
      timeline: [
        ...character.timeline,
        makeActivityEvent(
          character,
          character.age,
          passed ? `${template.name} Earned` : `${template.name} Failed`,
          summary,
          passed ? 'milestone' : 'education'
        ),
      ],
    },
    effects
  );

  return {
    character: nextChar,
    succeeded: true,
    title: passed ? `${template.name} Earned!` : `${template.name} Not Passed`,
    summary,
    costPaid: template.fee,
    appliedEffects: applied,
  };
}

export function calculateVacationCost(
  character: Pick<CharacterProfile, 'partner' | 'relationships' | 'children'>,
  destinationId: VacationDestinationId,
  cabinClassId: VacationCabinClassId,
  companionMode: VacationCompanionMode
): number {
  const dest = getVacationDestination(destinationId);
  if (!dest) return 0;
  const cabin = getVacationCabinClass(cabinClassId);
  const companions = getActiveVacationCompanions(character);

  let companionMultiplier = 1.0;
  if (companionMode === 'partner' && companions.partner) {
    companionMultiplier = 1.6;
  } else if (companionMode === 'family' && companions.children.length > 0) {
    companionMultiplier = 1.0 + 0.45 * companions.totalCount;
  }

  return Math.round(dest.baseCost * cabin.priceMultiplier * companionMultiplier);
}

export function takeVacation(
  character: CharacterProfile,
  destinationId: VacationDestinationId,
  cabinClassId: VacationCabinClassId,
  companionMode: VacationCompanionMode
): ActivityActionResult {
  const dest = getVacationDestination(destinationId);
  if (!dest) return blockedActivityResult(character, 'Vacation', 'Destination not found.');
  const cabin = getVacationCabinClass(cabinClassId);

  const guard = checkActivityEligibility(
    character,
    VACATION_MIN_AGE,
    'Vacations',
    'Vacations are unavailable while serving a prison sentence.'
  );
  if (guard) return blockedActivityResult(character, dest.name, guard);

  const activities = getSanitizedActivitiesState(character);
  if (activities.lastVacationAge === character.age) {
    return blockedActivityResult(character, dest.name, 'You have already taken a vacation this year.');
  }

  const companions = getActiveVacationCompanions(character);
  if (companionMode === 'partner' && !companions.partner) {
    return blockedActivityResult(
      character,
      dest.name,
      'You do not currently have an active romantic partner.'
    );
  }
  if (companionMode === 'family' && companions.children.length === 0) {
    return blockedActivityResult(
      character,
      dest.name,
      'You need at least one living child for a family trip.'
    );
  }

  const cost = calculateVacationCost(character, destinationId, cabinClassId, companionMode);
  if (character.cash < cost) {
    return blockedActivityResult(
      character,
      dest.name,
      `You need $${cost.toLocaleString()} in wallet cash for this ${cabin.name} trip.`
    );
  }

  const includePartner =
    Boolean(companions.partner) &&
    (companionMode === 'partner' || companionMode === 'family');
  const includeChildren = companionMode === 'family' && companions.children.length > 0;

  let nextPartner = character.partner;
  let nextRelationships = character.relationships;
  if (includePartner && companions.partner) {
    const partnerId = companions.partner.id;
    const boostPerson = (p: typeof companions.partner) => ({
      ...p,
      relationship: clampStat((p.relationship ?? 0) + 8),
      romanceMeter: clampStat((p.romanceMeter ?? 0) + 8),
    });

    if (nextPartner && nextPartner.id === partnerId) {
      nextPartner = boostPerson(nextPartner);
    }
    nextRelationships = (character.relationships || []).map((rel) =>
      rel.id === partnerId ? boostPerson(rel) : rel
    );
  }

  const nextChildren = includeChildren
    ? (character.children || []).map((child) =>
        child.isAlive
          ? {
              ...child,
              relationship: clampStat(child.relationship + 8),
              happiness: clampStat(child.happiness + 6),
            }
          : child
      )
    : character.children;

  const companionText =
    companionMode === 'solo'
      ? 'solo'
      : companionMode === 'partner'
        ? `with ${companions.partner!.firstName}`
        : `with your family (${companions.totalCount} ${companions.totalCount === 1 ? 'companion' : 'companions'})`;

  const summary = `Enjoyed a ${cabin.name} ${dest.name} ${companionText} for $${cost.toLocaleString()}.`;

  const { character: nextChar, applied } = applyEffects(
    {
      ...character,
      partner: nextPartner,
      relationships: nextRelationships,
      ...(nextChildren !== undefined ? { children: nextChildren } : {}),
      activities: {
        ...activities,
        lastVacationAge: character.age,
      },
      timeline: [
        ...character.timeline,
        makeActivityEvent(character, character.age, `Vacation: ${dest.name}`, summary, 'social'),
      ],
    },
    {
      health: dest.healthGain,
      happiness: dest.happinessGain + cabin.bonusHappiness,
      looks: dest.looksGain,
      cash: -cost,
    }
  );

  return {
    character: nextChar,
    succeeded: true,
    title: `${dest.name} (${cabin.name})`,
    summary,
    costPaid: cost,
    appliedEffects: applied,
  };
}

export function evaluateEmigrationEligibility(
  character: CharacterProfile,
  destinationCountry: string
): {
  eligible: boolean;
  blockedReason: string | null;
  approvalChance: number;
  penalties: string[];
  destination: EmigrationDestinationTemplate | null;
} {
  const destination = getEmigrationDestination(destinationCountry) ?? null;
  if (!destination) {
    return {
      eligible: false,
      blockedReason: 'Destination country not found.',
      approvalChance: 0,
      penalties: [],
      destination: null,
    };
  }

  let blockedReason: string | null = null;
  if (!character.isAlive) {
    blockedReason = 'This life has already ended.';
  } else if (isCurrentlyIncarcerated(character)) {
    blockedReason = 'Cannot emigrate while serving a prison sentence.';
  } else if (isOnProbation(character)) {
    blockedReason = 'Travel restriction: cannot emigrate while on active probation.';
  } else if (hasPendingCourtCase(character)) {
    blockedReason = 'Cannot emigrate while awaiting a court trial.';
  } else if (character.age < EMIGRATION_MIN_AGE) {
    blockedReason = `Emigration unlocks at Age ${EMIGRATION_MIN_AGE}.`;
  } else if (destination.country === character.country) {
    blockedReason = `You already live in ${character.country}.`;
  } else if (getSanitizedActivitiesState(character).lastEmigrationAge === character.age) {
    blockedReason = 'You already submitted a visa application this year.';
  }

  let approval = destination.baseApproval;
  const penalties: string[] = [];

  if (hasActiveFelony(character)) {
    approval -= 0.55;
    penalties.push('Active felony (-55%)');
  } else if (hasActiveAdultConviction(character)) {
    approval -= 0.2;
    penalties.push('Adult misdemeanor (-20%)');
  }

  if (getTotalLegalDebt(character) > 0) {
    approval -= 0.25;
    penalties.push('Unpaid legal debt (-25%)');
  }

  const approvalChance = Math.max(0.05, Math.min(0.95, Number(approval.toFixed(2))));

  return {
    eligible: blockedReason === null,
    blockedReason,
    approvalChance,
    penalties,
    destination,
  };
}

export function attemptEmigration(
  character: CharacterProfile,
  destinationCountry: string,
  rng: () => number = Math.random
): ActivityActionResult {
  const evaluation = evaluateEmigrationEligibility(character, destinationCountry);
  if (!evaluation.destination) {
    return blockedActivityResult(
      character,
      'Emigration',
      evaluation.blockedReason ?? 'Invalid destination.'
    );
  }
  const dest = evaluation.destination;

  if (!evaluation.eligible) {
    return blockedActivityResult(character, `Emigrate to ${dest.country}`, evaluation.blockedReason!);
  }

  if (character.cash < dest.movingCost) {
    return blockedActivityResult(
      character,
      `Emigrate to ${dest.country}`,
      `You need $${dest.movingCost.toLocaleString()} in wallet cash to cover relocation expenses.`
    );
  }

  const activities = getSanitizedActivitiesState(character);
  const approved = rng() < evaluation.approvalChance;
  const nextActivities: PlayerActivitiesState = {
    ...activities,
    lastEmigrationAge: character.age,
  };

  if (approved) {
    // shortcut: emigration updates country/city/flag without altering job, housing, or DeathModal birthplace text, revisit when adding relocation rules
    const summary = `Visa approved! Packed your bags and relocated to ${dest.city}, ${dest.country} ${dest.flag} for $${dest.movingCost.toLocaleString()}.`;
    const { character: nextChar, applied } = applyEffects(
      {
        ...character,
        country: dest.country,
        city: dest.city,
        flag: dest.flag,
        activities: nextActivities,
        timeline: [
          ...character.timeline,
          makeActivityEvent(
            character,
            character.age,
            `Emigrated to ${dest.country}`,
            summary,
            'milestone'
          ),
        ],
      },
      { happiness: 6, cash: -dest.movingCost }
    );
    return {
      character: nextChar,
      succeeded: true,
      title: `Welcome to ${dest.country}! ${dest.flag}`,
      summary,
      costPaid: dest.movingCost,
      appliedEffects: applied,
    };
  }

  const denialSummary = `Your visa application to ${dest.country} was denied${evaluation.penalties.length > 0 ? ` (${evaluation.penalties.join(', ')})` : ''}. Paid $${EMIGRATION_VISA_DENIAL_FEE} non-refundable processing fee.`;
  const { character: nextChar, applied } = applyEffects(
    {
      ...character,
      activities: nextActivities,
      timeline: [
        ...character.timeline,
        makeActivityEvent(
          character,
          character.age,
          `Visa Denied (${dest.country})`,
          denialSummary,
          'money'
        ),
      ],
    },
    { happiness: -4, cash: -EMIGRATION_VISA_DENIAL_FEE }
  );

  return {
    character: nextChar,
    succeeded: true,
    title: 'Visa Application Denied',
    summary: denialSummary,
    costPaid: EMIGRATION_VISA_DENIAL_FEE,
    appliedEffects: applied,
  };
}
