import type {
  CharacterProfile,
  LifeEvent,
  PersonProfile,
  StatEffects,
} from '../../../types/game';
import { deterministicUUID, hashSeed, SeededPRNG } from '../../autonomy/services/seededPrngService';
import type { CareerHistoryEntry } from '../../career/types';
import { applyEffects } from '../../character/services/statService';
import { getCrimeTemplate, isValidCrimeId } from '../data/crimeCatalog';
import {
  getAttorneyFeeForCase,
  getDefenseStrategy,
  JUVENILE_WARNING_RESTITUTION_MAX,
  selectPrisonFacility,
} from '../data/legalCatalog';
import type {
  CrimeAttemptResult,
  CrimeId,
  CrimeOutcomeStatus,
  CrimeRecordEntry,
  CourtResolutionResult,
  DefenseStrategyId,
  ExpungementResult,
  FinePaymentResult,
  LegalJurisdiction,
  PendingCourtCase,
  PrisonState,
  ProbationState,
} from '../types';
import { CRIME_SIM_VERSION, evaluateCrimeAttempt } from './crimeRiskService';
import {
  getActiveAdultConvictions,
  getExpungementEligibleRecords,
  getJurisdictionForAge,
  getSanitizedCrimeState,
  isCrimeEligibleForCharacter,
} from './crimeSelectors';

function clamp0to100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function createLegalPrng(
  character: Pick<CharacterProfile, 'id' | 'birthYear' | 'age'>,
  caseIdOrSeed: string,
  salt: string,
): SeededPRNG {
  return new SeededPRNG(
    hashSeed(
      character.id,
      character.birthYear,
      character.age,
      caseIdOrSeed,
      CRIME_SIM_VERSION,
      salt,
    ),
  );
}

interface RelationshipDeltaSpec {
  parents: number;
  partner: number;
  siblings: number;
}

function applyCrimeRelationshipConsequences(
  character: CharacterProfile,
  spec: RelationshipDeltaSpec,
): { character: CharacterProfile; statEffects: Partial<StatEffects> } {
  const parentEffects: Partial<StatEffects> = {};
  if (spec.parents !== 0) {
    if (character.parents.father.isAlive) {
      parentEffects.fatherRelationship = spec.parents;
    }
    if (character.parents.mother.isAlive) {
      parentEffects.motherRelationship = spec.parents;
    }
  }

  let updatedPartner = character.partner;
  let updatedRelationships = character.relationships;

  if (spec.partner !== 0 && character.partner && character.partner.romanticStage !== 'widowed') {
    const partnerId = character.partner.id;
    const nextPartnerRel = clamp0to100(character.partner.relationship + spec.partner);
    updatedPartner = {
      ...character.partner,
      relationship: nextPartnerRel,
    };

    if (Array.isArray(character.relationships)) {
      const idx = character.relationships.findIndex((r) => r.id === partnerId);
      if (idx !== -1 && character.relationships[idx].romanticStage !== 'widowed') {
        updatedRelationships = character.relationships.map((r: PersonProfile, i: number) =>
          i === idx ? { ...r, relationship: nextPartnerRel } : r,
        );
      }
    }
  }

  let updatedSiblings = character.siblings;
  if (spec.siblings !== 0 && Array.isArray(character.siblings) && character.siblings.length > 0) {
    updatedSiblings = character.siblings.map((sib) =>
      sib.isAlive ? { ...sib, relationship: clamp0to100(sib.relationship + spec.siblings) } : sib,
    );
  }

  return {
    character: {
      ...character,
      partner: updatedPartner,
      relationships: updatedRelationships,
      siblings: updatedSiblings,
    },
    statEffects: parentEffects,
  };
}

function terminateCivilianCareerForPrison(character: CharacterProfile): {
  character: CharacterProfile;
  terminated: boolean;
  terminatedJobTitle?: string;
} {
  const currentJob = character.career?.currentJob;
  if (!currentJob) {
    return {
      character: {
        ...character,
        occupation: 'Incarcerated',
      },
      terminated: false,
    };
  }

  const firedEntry: CareerHistoryEntry = {
    id: deterministicUUID(
      'crime_fired',
      character.id,
      character.age,
      currentJob.jobId,
      character.career.history.length,
    ),
    jobId: currentJob.jobId,
    title: currentJob.title,
    companyName: currentJob.companyName,
    type: currentJob.type,
    startAge: currentJob.hiredAge,
    endAge: character.age,
    finalSalary: currentJob.salary,
    reasonForLeaving: 'fired',
  };

  return {
    character: {
      ...character,
      occupation: 'Incarcerated',
      career: {
        ...character.career,
        currentJob: null,
        history: [...character.career.history, firedEntry],
      },
    },
    terminated: true,
    terminatedJobTitle: `${currentJob.title} at ${currentJob.companyName}`,
  };
}

/**
 * Merges an incoming probation sentence into the player's single probation slot.
 * Never stacks durations, never shortens an existing sentence, and gives adult
 * jurisdiction precedence over juvenile jurisdiction on overlap.
 */
export function mergeProbationState(
  existing: ProbationState | null,
  incomingChargeTitle: string,
  incomingJurisdiction: LegalJurisdiction,
  incomingYears: number,
  currentAge: number,
): ProbationState {
  const normalizedYears = Math.max(1, Math.round(incomingYears));
  if (!existing || existing.yearsRemaining <= 0) {
    return {
      chargeTitle: incomingChargeTitle,
      jurisdiction: incomingJurisdiction,
      yearsRemaining: normalizedYears,
      startedAtAge: currentAge,
      lastProgressedAge: null,
    };
  }

  return {
    chargeTitle: incomingChargeTitle,
    jurisdiction:
      existing.jurisdiction === 'adult' || incomingJurisdiction === 'adult'
        ? 'adult'
        : 'juvenile',
    yearsRemaining: Math.max(existing.yearsRemaining, normalizedYears),
    startedAtAge: existing.startedAtAge,
    lastProgressedAge: existing.lastProgressedAge,
  };
}

/**
 * Attempts a crime from the v1 catalog using the deterministic 3-stream risk engine.
 * Credited proceeds occur immediately ONLY on undetected success; detected proceeds are
 * held inside PendingCourtCase until immediate legal resolution.
 */
export function attemptCrime(character: CharacterProfile, crimeId: CrimeId): CrimeAttemptResult {
  if (!isValidCrimeId(crimeId)) {
    return {
      ok: false,
      character,
      reason: 'Selected criminal activity does not exist.',
      message: 'Selected criminal activity does not exist.',
    };
  }

  const template = getCrimeTemplate(crimeId);
  const eligibility = isCrimeEligibleForCharacter(character, template);
  if (!eligibility.eligible) {
    const reason = eligibility.reason || 'Not eligible to attempt this crime.';
    return {
      ok: false,
      character,
      reason,
      message: reason,
    };
  }

  const sanitized = getSanitizedCrimeState(character);
  const attemptIndex = sanitized.attemptCountLifetime;
  const nextLifetimeCount = attemptIndex + 1;
  const nextAttemptsThisYear =
    (sanitized.lastAttemptAge === character.age ? sanitized.attemptsThisYear : 0) + 1;

  const roll = evaluateCrimeAttempt(character, template, attemptIndex);
  const year = character.birthYear + character.age;

  const nextHeat = clamp0to100(
    sanitized.policeHeat + (roll.detected ? template.heatGain : Math.ceil(template.heatGain * 0.6)),
  );
  const nextNotoriety = clamp0to100(
    sanitized.notoriety +
      (roll.executionSucceeded ? template.notorietyGain : Math.floor(template.notorietyGain * 0.25)),
  );

  const statEffects: StatEffects = {
    karma: -template.karmaPenalty,
  };
  if (roll.injured && roll.injuryHealthLoss > 0) {
    statEffects.health = -roll.injuryHealthLoss;
    statEffects.happiness = -6;
  } else if (roll.executionSucceeded && !roll.detected) {
    statEffects.happiness = 4;
  }

  if (roll.executionSucceeded && !roll.detected && roll.attemptedPayout > 0) {
    statEffects.cash = roll.attemptedPayout;
  }

  const baseEventId = deterministicUUID(
    'crime_attempt',
    character.id,
    character.birthYear,
    character.age,
    nextLifetimeCount,
    template.id,
  );

  if (roll.detected) {
    const legalBasePrng = createLegalPrng(character, baseEventId, 'legal_base');
    const baseFine =
      template.baseFineMax > template.baseFineMin
        ? legalBasePrng.nextInt(template.baseFineMin, template.baseFineMax)
        : template.baseFineMin;
    const rawBaseSentence =
      template.baseSentenceYearsMax > template.baseSentenceYearsMin
        ? legalBasePrng.nextInt(template.baseSentenceYearsMin, template.baseSentenceYearsMax)
        : template.baseSentenceYearsMin;
    const baseSentenceYears = roll.jurisdiction === 'juvenile' ? 0 : rawBaseSentence;

    const pendingCase: PendingCourtCase = {
      id: baseEventId,
      crimeId: template.id,
      title: template.title,
      tier: template.tier,
      offenseClass: template.adultOffenseClass,
      jurisdiction: roll.jurisdiction,
      arrestedAtAge: character.age,
      arrestedAtYear: year,
      executionSucceeded: roll.executionSucceeded,
      injured: roll.injured,
      attemptedPayout: roll.attemptedPayout,
      baseFine,
      baseSentenceYears,
    };

    const injuryText = roll.injured
      ? ` You suffered an injury (-${roll.injuryHealthLoss} Health) during the incident.`
      : '';
    const message = roll.executionSucceeded
      ? `Police intercepted you right after attempting ${template.title}. $${roll.attemptedPayout.toLocaleString()} in suspected proceeds was seized pending court.${injuryText}`
      : `Your ${template.title.toLowerCase()} attempt failed and authorities apprehended you at the scene.${injuryText}`;

    const arrestEvent: LifeEvent = {
      id: `${baseEventId}-evt`,
      age: character.age,
      year,
      title:
        roll.jurisdiction === 'juvenile'
          ? `Juvenile Apprehension: ${template.title}`
          : `Arrested for ${template.title}`,
      message,
      category: 'misfortune',
      icon: '🚓',
    };

    const { character: relUpdated, statEffects: parentEffects } = applyCrimeRelationshipConsequences(
      character,
      {
        parents: roll.jurisdiction === 'juvenile' ? -5 : -4,
        partner: -3,
        siblings: 0,
      },
    );

    const { character: affected } = applyEffects(
      {
        ...relUpdated,
        crime: {
          ...sanitized,
          policeHeat: nextHeat,
          notoriety: nextNotoriety,
          attemptsThisYear: nextAttemptsThisYear,
          attemptCountLifetime: nextLifetimeCount,
          lastAttemptAge: character.age,
          pendingCase,
        },
        timeline: [...relUpdated.timeline, arrestEvent],
      },
      { ...statEffects, ...parentEffects },
    );

    return {
      ok: true,
      character: affected,
      roll,
      pendingCase,
      message,
    };
  }

  // Undetected branch: either clean profit ('undetected') or slipped away empty-handed ('aborted').
  const outcome: CrimeOutcomeStatus = roll.executionSucceeded ? 'undetected' : 'aborted';
  const payout = roll.executionSucceeded ? roll.attemptedPayout : 0;

  const record: CrimeRecordEntry = {
    id: baseEventId,
    crimeId: template.id,
    title: template.title,
    tier: template.tier,
    offenseClass: template.adultOffenseClass,
    jurisdiction: getJurisdictionForAge(character.age),
    age: character.age,
    year,
    executionSucceeded: roll.executionSucceeded,
    detected: false,
    injured: roll.injured,
    outcome,
    attemptedPayout: roll.attemptedPayout,
    payout,
    fineImposed: 0,
    finePaid: 0,
    attorneyFeePaid: 0,
    sentenceYears: 0,
    sealed: false,
    expunged: false,
  };

  const injuryText = roll.injured
    ? ` You took a minor injury (-${roll.injuryHealthLoss} Health) making your getaway.`
    : '';
  const message = roll.executionSucceeded
    ? payout > 0
      ? `You pulled off ${template.title} undetected and pocketed $${payout.toLocaleString()}.${injuryText}`
      : `You completed ${template.title} and slipped away without detection.${injuryText}`
    : `Your ${template.title.toLowerCase()} attempt fell apart, but you escaped before police arrived.${injuryText}`;

  const crimeEvent: LifeEvent = {
    id: `${baseEventId}-evt`,
    age: character.age,
    year,
    title: roll.executionSucceeded ? `${template.title} Unnoticed` : `${template.title} Aborted`,
    message,
    category: roll.executionSucceeded ? 'money' : 'misfortune',
    icon: template.icon,
  };

  const { character: affected } = applyEffects(
    {
      ...character,
      crime: {
        ...sanitized,
        policeHeat: nextHeat,
        notoriety: nextNotoriety,
        attemptsThisYear: nextAttemptsThisYear,
        attemptCountLifetime: nextLifetimeCount,
        lastAttemptAge: character.age,
        records: [...sanitized.records, record],
      },
      timeline: [...character.timeline, crimeEvent],
    },
    statEffects,
  );

  return {
    ok: true,
    character: affected,
    roll,
    record,
    message,
  };
}

export function determineCourtOutcome(
  character: Pick<CharacterProfile, 'id' | 'birthYear' | 'age' | 'stats' | 'crime'>,
  pendingCase: PendingCourtCase,
  strategyId: DefenseStrategyId,
): CrimeOutcomeStatus {
  const strategy = getDefenseStrategy(strategyId);
  const sanitized = getSanitizedCrimeState(character);
  const prng = createLegalPrng(character, pendingCase.id, `court_resolution::${strategyId}`);
  const smartsBonus = (character.stats.smarts - 50) * 0.001;
  const failedAttemptBonus = pendingCase.executionSucceeded ? 0 : 0.07;

  if (pendingCase.jurisdiction === 'juvenile') {
    const priorJuvenileFindings = sanitized.records.filter(
      (r) =>
        r.jurisdiction === 'juvenile' &&
        (r.outcome === 'fined' || r.outcome === 'probation' || r.outcome === 'warned'),
    ).length;

    const candidates: Array<{ outcome: CrimeOutcomeStatus; weight: number }> = [
      {
        outcome: 'dismissed',
        weight: Math.max(0.04, 0.14 + strategy.dismissalBonus + failedAttemptBonus + smartsBonus),
      },
      {
        outcome: 'acquitted',
        weight: Math.max(0.04, 0.14 + strategy.acquittalBonus + failedAttemptBonus),
      },
      {
        outcome: 'warned',
        weight: Math.max(
          0.05,
          (priorJuvenileFindings === 0 ? 0.34 : 0.14) -
            (pendingCase.offenseClass === 'felony' ? 0.08 : 0),
        ),
      },
      {
        outcome: 'fined',
        weight: 0.24,
      },
      {
        outcome: 'probation',
        weight: Math.max(
          0.08,
          (priorJuvenileFindings > 0 ? 0.28 : 0.14) +
            (pendingCase.offenseClass === 'felony' ? 0.1 : 0) -
            strategy.acquittalBonus * 0.3,
        ),
      },
    ];

    const picked = prng.pickWeighted(candidates);
    return picked ? picked.outcome : 'warned';
  }

  const priorAdultCount = getActiveAdultConvictions(character).length;
  const isFelony = pendingCase.offenseClass === 'felony';

  const adultCandidates: Array<{ outcome: CrimeOutcomeStatus; weight: number }> = [
    {
      outcome: 'dismissed',
      weight: Math.max(0.03, 0.1 + strategy.dismissalBonus + failedAttemptBonus + smartsBonus),
    },
    {
      outcome: 'acquitted',
      weight: Math.max(0.04, 0.12 + strategy.acquittalBonus + failedAttemptBonus),
    },
    {
      outcome: 'fined',
      weight: Math.max(0.08, isFelony ? 0.18 : 0.42),
    },
    {
      outcome: 'probation',
      weight: Math.max(0.1, (isFelony ? 0.28 : 0.22) + strategy.shiftsPrisonToProbationBonus * 0.7),
    },
    {
      outcome: 'imprisoned',
      weight: Math.max(
        0.02,
        (pendingCase.baseSentenceYears > 0
          ? (isFelony ? 0.34 : 0.08) + Math.min(0.18, priorAdultCount * 0.06)
          : 0.02) -
          strategy.shiftsPrisonToProbationBonus -
          strategy.acquittalBonus * 0.4,
      ),
    },
  ];

  const picked = prng.pickWeighted(adultCandidates);
  return picked ? picked.outcome : 'fined';
}

/**
 * Resolves the character's pending court case with the selected defense strategy.
 * Handles held proceeds release/forfeiture, juvenile cash-capped fines vs. adult unpaidFines,
 * probation merging, custodial job firing, and targeted family/partner relationship reactions.
 */
export function resolveCourtCase(
  character: CharacterProfile,
  strategyId: DefenseStrategyId,
): CourtResolutionResult {
  const sanitized = getSanitizedCrimeState(character);
  const pendingCase = sanitized.pendingCase;
  if (!pendingCase) {
    return {
      ok: false,
      character,
      reason: 'No pending court case to resolve.',
      releasedPayout: 0,
      fineImposed: 0,
      finePaid: 0,
      unpaidFineAdded: 0,
      attorneyFeePaid: 0,
      sentenceYears: 0,
      probationYears: 0,
      employmentTerminated: false,
      message: 'No pending court case to resolve.',
    };
  }

  const strategy = getDefenseStrategy(strategyId);
  const attorneyFee = getAttorneyFeeForCase(strategyId, pendingCase.tier);
  if (attorneyFee > 0 && character.cash < attorneyFee) {
    return {
      ok: false,
      character,
      reason: `You need $${attorneyFee.toLocaleString()} in cash to retain ${strategy.title}.`,
      releasedPayout: 0,
      fineImposed: 0,
      finePaid: 0,
      unpaidFineAdded: 0,
      attorneyFeePaid: 0,
      sentenceYears: 0,
      probationYears: 0,
      employmentTerminated: false,
      message: `Insufficient cash for ${strategy.title}.`,
    };
  }

  const outcome = determineCourtOutcome(character, pendingCase, strategyId);
  return applyCourtOutcome(character, pendingCase, strategyId, outcome);
}

/**
 * Applies a resolved legal outcome for a pending case (used directly by resolveCourtCase).
 */
export function applyCourtOutcome(
  character: CharacterProfile,
  pendingCase: PendingCourtCase,
  strategyId: DefenseStrategyId,
  rawOutcome: CrimeOutcomeStatus,
): CourtResolutionResult {
  const sanitized = getSanitizedCrimeState(character);
  const strategy = getDefenseStrategy(strategyId);
  const attorneyFee = getAttorneyFeeForCase(strategyId, pendingCase.tier);
  const isJuvenile = pendingCase.jurisdiction === 'juvenile';

  // Enforce strict jurisdiction boundary on outcome status.
  let outcome = rawOutcome;
  if (isJuvenile && outcome === 'imprisoned') {
    outcome = 'probation';
  }
  if (!isJuvenile && outcome === 'warned') {
    outcome = 'fined';
  }

  // Deduct cash-only attorney fee upfront (leaving bankBalance untouched).
  let workingChar = character;
  if (attorneyFee > 0) {
    workingChar = applyEffects(workingChar, { cash: -attorneyFee }).character;
  }

  const prng = createLegalPrng(workingChar, pendingCase.id, `disposition::${strategyId}`);
  const availableCash = Math.max(0, workingChar.cash);
  const isFelony = pendingCase.offenseClass === 'felony';

  let releasedPayout = 0;
  let fineImposed = 0;
  let finePaid = 0;
  let unpaidFineAdded = 0;
  let sentenceYears = 0;
  let probationYears = 0;
  let employmentTerminated = false;
  let nextPrison: PrisonState | null = sanitized.prison;
  let nextProbation: ProbationState | null = sanitized.probation;
  let relSpec: RelationshipDeltaSpec = { parents: 0, partner: 0, siblings: 0 };
  const extraStatEffects: StatEffects = {};
  let heatDelta = 0;

  const baseRawFine = Math.max(
    isJuvenile ? 25 : 75,
    Math.round(pendingCase.baseFine * (isJuvenile ? 0.4 : 1) * strategy.fineMultiplier),
  );

  switch (outcome) {
    case 'dismissed':
    case 'acquitted': {
      releasedPayout = pendingCase.executionSucceeded ? pendingCase.attemptedPayout : 0;
      if (releasedPayout > 0) {
        extraStatEffects.cash = releasedPayout;
      }
      extraStatEffects.happiness = 8;
      relSpec = { parents: 2, partner: 2, siblings: 0 };
      heatDelta = -6;
      break;
    }

    case 'warned': {
      // Juvenile informal warning: held loot returned/forfeited, cash-capped modest restitution, $0 unpaidFines.
      const suggestedRestitution = prng.nextInt(0, JUVENILE_WARNING_RESTITUTION_MAX);
      fineImposed = Math.min(availableCash, suggestedRestitution);
      finePaid = fineImposed;
      if (finePaid > 0) {
        extraStatEffects.cash = -finePaid;
      }
      extraStatEffects.happiness = -3;
      relSpec = { parents: -4, partner: -2, siblings: 0 };
      heatDelta = -4;
      break;
    }

    case 'fined': {
      if (isJuvenile) {
        fineImposed = Math.min(availableCash, baseRawFine);
        finePaid = fineImposed;
      } else {
        fineImposed = baseRawFine;
        finePaid = Math.min(availableCash, fineImposed);
        unpaidFineAdded = fineImposed - finePaid;
      }
      if (finePaid > 0) {
        extraStatEffects.cash = -finePaid;
      }
      extraStatEffects.happiness = -6;
      relSpec = {
        parents: isFelony ? -12 : -6,
        partner: isFelony ? -10 : -6,
        siblings: -4,
      };
      heatDelta = -5;
      break;
    }

    case 'probation': {
      probationYears = isJuvenile
        ? prng.nextInt(1, 2)
        : isFelony
          ? prng.nextInt(2, 4)
          : prng.nextInt(1, 2);

      nextProbation = mergeProbationState(
        sanitized.probation,
        pendingCase.title,
        pendingCase.jurisdiction,
        probationYears,
        workingChar.age,
      );

      const probationFineRaw = Math.round(baseRawFine * 0.5);
      if (isJuvenile) {
        fineImposed = Math.min(availableCash, probationFineRaw);
        finePaid = fineImposed;
      } else {
        fineImposed = probationFineRaw;
        finePaid = Math.min(availableCash, fineImposed);
        unpaidFineAdded = fineImposed - finePaid;
      }
      if (finePaid > 0) {
        extraStatEffects.cash = -finePaid;
      }
      extraStatEffects.happiness = -10;
      relSpec = {
        parents: isFelony ? -14 : -8,
        partner: isFelony ? -12 : -8,
        siblings: -4,
      };
      heatDelta = -8;
      break;
    }

    case 'imprisoned': {
      sentenceYears = Math.max(
        1,
        Math.round(Math.max(1, pendingCase.baseSentenceYears) * strategy.sentenceMultiplier),
      );
      const prisonFineRaw = Math.round(baseRawFine * 0.6);
      fineImposed = prisonFineRaw;
      finePaid = Math.min(availableCash, fineImposed);
      unpaidFineAdded = fineImposed - finePaid;
      if (finePaid > 0) {
        extraStatEffects.cash = -finePaid;
      }

      const priorAdultPrisonCount = sanitized.records.filter(
        (r) => r.jurisdiction === 'adult' && r.outcome === 'imprisoned',
      ).length;
      const facility = selectPrisonFacility(
        pendingCase.tier,
        pendingCase.offenseClass,
        sentenceYears,
        priorAdultPrisonCount,
      );

      const priorRetirementOccupation =
        sanitized.prison?.priorRetirementOccupation !== undefined
          ? sanitized.prison.priorRetirementOccupation
          : workingChar.occupation === 'Retired' ||
              workingChar.occupation === 'Retired Entrepreneur'
            ? workingChar.occupation
            : null;

      nextPrison = {
        facilityName: facility.facilityName,
        securityLevel: facility.securityLevel,
        chargeTitle: pendingCase.title,
        yearsTotal: sentenceYears,
        yearsServed: 0,
        yearsRemaining: sentenceYears,
        behaviorScore: 55,
        paroleEligibleAtServed: Math.max(1, Math.ceil(sentenceYears * 0.5)),
        actionsTakenThisYear: 0,
        lastActionAge: null,
        lastProgressedAge: null,
        priorRetirementOccupation,
      };

      const careerResult = terminateCivilianCareerForPrison(workingChar);
      workingChar = careerResult.character;
      employmentTerminated = careerResult.terminated;

      extraStatEffects.happiness = -18;
      relSpec = { parents: -12, partner: -20, siblings: -8 };
      heatDelta = -12;
      break;
    }

    default:
      break;
  }

  const record: CrimeRecordEntry = {
    id: pendingCase.id,
    crimeId: pendingCase.crimeId,
    title: pendingCase.title,
    tier: pendingCase.tier,
    offenseClass: pendingCase.offenseClass,
    jurisdiction: pendingCase.jurisdiction,
    age: workingChar.age,
    year: workingChar.birthYear + workingChar.age,
    executionSucceeded: pendingCase.executionSucceeded,
    detected: true,
    injured: pendingCase.injured,
    outcome,
    attemptedPayout: pendingCase.attemptedPayout,
    payout: releasedPayout,
    fineImposed,
    finePaid,
    attorneyFeePaid: attorneyFee,
    sentenceYears,
    sealed: false,
    expunged: false,
  };

  let message = '';
  let eventCategory: LifeEvent['category'] = 'misfortune';
  let eventIcon = '⚖️';

  if (outcome === 'dismissed') {
    eventCategory = 'milestone';
    message = `Charges for ${pendingCase.title} were dismissed.${
      releasedPayout > 0 ? ` Held proceeds of $${releasedPayout.toLocaleString()} were returned.` : ''
    }`;
  } else if (outcome === 'acquitted') {
    eventCategory = 'milestone';
    message = `Found Not Guilty of ${pendingCase.title}.${
      releasedPayout > 0 ? ` Held proceeds of $${releasedPayout.toLocaleString()} were released.` : ''
    }`;
  } else if (outcome === 'warned') {
    eventIcon = '⚠️';
    message = `Juvenile intake issued an official warning for ${pendingCase.title} and notified your parents.${
      finePaid > 0 ? ` Paid $${finePaid.toLocaleString()} in restitution.` : ''
    }`;
  } else if (outcome === 'fined') {
    message = `${
      isJuvenile ? 'Juvenile court' : 'Criminal court'
    } ordered a $${fineImposed.toLocaleString()} fine for ${pendingCase.title}. Paid $${finePaid.toLocaleString()}${
      unpaidFineAdded > 0 ? ` ($${unpaidFineAdded.toLocaleString()} added to unpaid fines)` : ''
    }.`;
  } else if (outcome === 'probation') {
    message = `Sentenced to ${probationYears} year(s) of ${
      isJuvenile ? 'juvenile' : 'adult'
    } probation for ${pendingCase.title}.${
      fineImposed > 0 ? ` Fine: $${fineImposed.toLocaleString()} (paid $${finePaid.toLocaleString()}).` : ''
    }`;
  } else {
    eventIcon = '⛓️';
    message = `Sentenced to ${sentenceYears} year(s) at ${nextPrison?.facilityName || 'state prison'} for ${pendingCase.title}.${
      employmentTerminated ? ' Your civilian job was terminated.' : ''
    }`;
  }

  const courtEvent: LifeEvent = {
    id: `${pendingCase.id}-court`,
    age: workingChar.age,
    year: workingChar.birthYear + workingChar.age,
    title: `Court Verdict: ${pendingCase.title}`,
    message,
    category: eventCategory,
    icon: eventIcon,
  };

  const { character: relChar, statEffects: parentEffects } = applyCrimeRelationshipConsequences(
    workingChar,
    relSpec,
  );

  const { character: finalChar } = applyEffects(
    {
      ...relChar,
      crime: {
        ...sanitized,
        policeHeat: clamp0to100(sanitized.policeHeat + heatDelta),
        unpaidFines: sanitized.unpaidFines + unpaidFineAdded,
        pendingCase: null,
        prison: nextPrison,
        probation: nextProbation,
        records: [...sanitized.records, record],
      },
      timeline: [...relChar.timeline, courtEvent],
    },
    { ...extraStatEffects, ...parentEffects },
  );

  return {
    ok: true,
    character: finalChar,
    outcome,
    record,
    releasedPayout,
    fineImposed,
    finePaid,
    unpaidFineAdded,
    attorneyFeePaid: attorneyFee,
    sentenceYears,
    probationYears,
    employmentTerminated,
    message,
  };
}

/**
 * Voluntary cash-only payment toward outstanding adult unpaidFines.
 */
export function payUnpaidFines(character: CharacterProfile, amount?: number): FinePaymentResult {
  const sanitized = getSanitizedCrimeState(character);
  if (!character.isAlive) {
    return {
      ok: false,
      character,
      reason: 'Deceased characters cannot pay fines.',
      paidAmount: 0,
      remainingUnpaidFines: sanitized.unpaidFines,
      message: 'Deceased characters cannot pay fines.',
    };
  }
  if (sanitized.unpaidFines <= 0) {
    return {
      ok: false,
      character,
      reason: 'You have no outstanding court fines.',
      paidAmount: 0,
      remainingUnpaidFines: 0,
      message: 'No outstanding court fines.',
    };
  }

  const availableCash = Math.max(0, Math.floor(character.cash));
  if (availableCash <= 0) {
    return {
      ok: false,
      character,
      reason: 'You have no available cash to put toward court fines.',
      paidAmount: 0,
      remainingUnpaidFines: sanitized.unpaidFines,
      message: 'Insufficient cash to pay court fines.',
    };
  }

  const requested =
    amount !== undefined && Number.isFinite(amount) && amount > 0
      ? Math.floor(amount)
      : sanitized.unpaidFines;
  const paidAmount = Math.min(availableCash, sanitized.unpaidFines, requested);
  if (paidAmount <= 0) {
    return {
      ok: false,
      character,
      reason: 'Invalid fine payment amount.',
      paidAmount: 0,
      remainingUnpaidFines: sanitized.unpaidFines,
      message: 'Invalid fine payment amount.',
    };
  }

  const remainingUnpaidFines = sanitized.unpaidFines - paidAmount;
  const paymentEvent: LifeEvent = {
    id: deterministicUUID(
      'crime_fine_pay',
      character.id,
      character.age,
      sanitized.unpaidFines,
      paidAmount,
    ),
    age: character.age,
    year: character.birthYear + character.age,
    title: 'Court Fine Payment',
    message: `Paid $${paidAmount.toLocaleString()} toward outstanding court fines. Remaining balance: $${remainingUnpaidFines.toLocaleString()}.`,
    category: 'money',
    icon: '💵',
  };

  const { character: finalChar } = applyEffects(
    {
      ...character,
      crime: {
        ...sanitized,
        unpaidFines: remainingUnpaidFines,
      },
      timeline: [...character.timeline, paymentEvent],
    },
    { cash: -paidAmount },
  );

  return {
    ok: true,
    character: finalChar,
    paidAmount,
    remainingUnpaidFines,
    message: paymentEvent.message,
  };
}

/**
 * Petitions to formally expunge an eligible adult conviction record after clean waiting years.
 * Never sets `sealed` on adult records and never alters juvenile records.
 */
export function expungeAdultRecord(
  character: CharacterProfile,
  recordId: string,
): ExpungementResult {
  const sanitized = getSanitizedCrimeState(character);
  if (!character.isAlive) {
    return {
      ok: false,
      character,
      reason: 'Deceased characters cannot file for expungement.',
      message: 'Deceased characters cannot file for expungement.',
    };
  }

  const eligibleRecords = getExpungementEligibleRecords(character);
  const targetRecord = eligibleRecords.find((r) => r.id === recordId);
  if (!targetRecord) {
    return {
      ok: false,
      character,
      reason: 'This record is not eligible for adult expungement.',
      message: 'Record does not meet clean waiting period or adult eligibility requirements.',
    };
  }

  const expungedEntry: CrimeRecordEntry = {
    ...targetRecord,
    expunged: true,
  };

  const nextRecords = sanitized.records.map((entry) =>
    entry.id === targetRecord.id ? expungedEntry : entry,
  );

  const expungeEvent: LifeEvent = {
    id: `${targetRecord.id}-expunged`,
    age: character.age,
    year: character.birthYear + character.age,
    title: 'Record Expunged',
    message: `Your adult conviction for ${targetRecord.title} was formally expunged after completing the clean waiting period.`,
    category: 'milestone',
    icon: '📜',
  };

  const { character: finalChar } = applyEffects(
    {
      ...character,
      crime: {
        ...sanitized,
        records: nextRecords,
      },
      timeline: [...character.timeline, expungeEvent],
    },
    { happiness: 5 },
  );

  return {
    ok: true,
    character: finalChar,
    expungedRecord: expungedEntry,
    message: expungeEvent.message,
  };
}

