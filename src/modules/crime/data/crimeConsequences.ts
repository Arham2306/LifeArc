import type { CharacterProfile } from '../../../types/game';
import { hashSeed, SeededPRNG } from '../../autonomy/services/seededPrngService';
import type { ActiveBusinessProfile } from '../../business/types';
import type { CareerField } from '../../career/types';
import { CRIME_SIM_VERSION } from '../services/crimeRiskService';
import { SENSITIVE_CAREER_FIELDS } from '../services/crimeSelectors';
import type {
  CrimeExposureLevel,
  CrimeId,
  CrimeOutcomeStatus,
  CrimeRollEvaluation,
  CrimeTemplate,
  LegalJurisdiction,
  PendingCourtCase,
} from '../types';
import { JUVENILE_WARNING_RESTITUTION_MAX } from './legalCatalog';

export type CrimeConsequenceCategory =
  | 'petty_theft'
  | 'property_damage'
  | 'financial_fraud'
  | 'burglary_property'
  | 'auto_theft'
  | 'violent_robbery';

export type BusinessManagementCapabilityLike =
  | 'owner_operated'
  | 'delegated_management'
  | 'management_unavailable'
  | 'legacy_unassigned';

export type BusinessWithManagementMeta = ActiveBusinessProfile & {
  managementCapability?: BusinessManagementCapabilityLike;
};

export interface CrimeConsequenceProfile {
  crimeId: CrimeId;
  category: CrimeConsequenceCategory;
  isViolent: boolean;
  isDishonestyOffense: boolean;
  isBusinessFacilitatedRisk: boolean;
  /** Baseline probability that a police-detected arrest is publicly reported. */
  publicReportingBaseChance: number;
  /** Unrecovered property/repair/victim loss range independent of state forfeiture. */
  victimLossMin: number;
  victimLossMax: number;
  /** Non-custodial brand & morale scandal impact when publicly known or business-relevant. */
  businessScandalBrandDelta: number;
  businessScandalMoraleDelta: number;
  /** Undetected / aborted psychological deltas (never physical health unless injured). */
  undetectedStressDelta: number;
  abortedHappinessDelta: number;
  /** Relevant career fields beyond SENSITIVE_CAREER_FIELDS (e.g. transport for auto theft). */
  extraSensitiveCareerFields: readonly CareerField[];
}

export const CRIME_CONSEQUENCE_PROFILES: Record<CrimeId, CrimeConsequenceProfile> = {
  shoplifting: {
    crimeId: 'shoplifting',
    category: 'petty_theft',
    isViolent: false,
    isDishonestyOffense: false,
    isBusinessFacilitatedRisk: false,
    publicReportingBaseChance: 0.08,
    victimLossMin: 35,
    victimLossMax: 180,
    businessScandalBrandDelta: -4,
    businessScandalMoraleDelta: -2,
    undetectedStressDelta: 0,
    abortedHappinessDelta: -2,
    extraSensitiveCareerFields: [],
  },
  vandalism: {
    crimeId: 'vandalism',
    category: 'property_damage',
    isViolent: false,
    isDishonestyOffense: false,
    isBusinessFacilitatedRisk: false,
    publicReportingBaseChance: 0.14,
    victimLossMin: 150,
    victimLossMax: 600,
    businessScandalBrandDelta: -5,
    businessScandalMoraleDelta: -2,
    undetectedStressDelta: 0,
    abortedHappinessDelta: -3,
    extraSensitiveCareerFields: [],
  },
  pickpocketing: {
    crimeId: 'pickpocketing',
    category: 'petty_theft',
    isViolent: false,
    isDishonestyOffense: false,
    isBusinessFacilitatedRisk: false,
    publicReportingBaseChance: 0.1,
    victimLossMin: 60,
    victimLossMax: 320,
    businessScandalBrandDelta: -4,
    businessScandalMoraleDelta: -2,
    undetectedStressDelta: 0,
    abortedHappinessDelta: -3,
    extraSensitiveCareerFields: [],
  },
  fraud_scam: {
    crimeId: 'fraud_scam',
    category: 'financial_fraud',
    isViolent: false,
    isDishonestyOffense: true,
    isBusinessFacilitatedRisk: true,
    publicReportingBaseChance: 0.42,
    victimLossMin: 1200,
    victimLossMax: 6500,
    businessScandalBrandDelta: -22,
    businessScandalMoraleDelta: -14,
    undetectedStressDelta: -2,
    abortedHappinessDelta: -4,
    extraSensitiveCareerFields: [],
  },
  burglary: {
    crimeId: 'burglary',
    category: 'burglary_property',
    isViolent: false,
    isDishonestyOffense: false,
    isBusinessFacilitatedRisk: false,
    publicReportingBaseChance: 0.36,
    victimLossMin: 750,
    victimLossMax: 3200,
    businessScandalBrandDelta: -10,
    businessScandalMoraleDelta: -6,
    undetectedStressDelta: -2,
    abortedHappinessDelta: -5,
    extraSensitiveCareerFields: [],
  },
  vehicle_theft: {
    crimeId: 'vehicle_theft',
    category: 'auto_theft',
    isViolent: false,
    isDishonestyOffense: false,
    isBusinessFacilitatedRisk: false,
    publicReportingBaseChance: 0.44,
    victimLossMin: 1400,
    victimLossMax: 5200,
    businessScandalBrandDelta: -10,
    businessScandalMoraleDelta: -6,
    undetectedStressDelta: -2,
    abortedHappinessDelta: -5,
    extraSensitiveCareerFields: ['aviation_transport'],
  },
  robbery: {
    crimeId: 'robbery',
    category: 'violent_robbery',
    isViolent: true,
    isDishonestyOffense: false,
    isBusinessFacilitatedRisk: false,
    publicReportingBaseChance: 0.78,
    victimLossMin: 2000,
    victimLossMax: 8500,
    businessScandalBrandDelta: -25,
    businessScandalMoraleDelta: -18,
    undetectedStressDelta: -3,
    abortedHappinessDelta: -8,
    extraSensitiveCareerFields: [],
  },
  bank_heist: {
    crimeId: 'bank_heist',
    category: 'violent_robbery',
    isViolent: true,
    isDishonestyOffense: false,
    isBusinessFacilitatedRisk: false,
    publicReportingBaseChance: 0.85,
    victimLossMin: 8000,
    victimLossMax: 28000,
    businessScandalBrandDelta: -30,
    businessScandalMoraleDelta: -20,
    undetectedStressDelta: -4,
    abortedHappinessDelta: -10,
    extraSensitiveCareerFields: [],
  },
};

export function getCrimeConsequenceProfile(crimeId: CrimeId): CrimeConsequenceProfile {
  return CRIME_CONSEQUENCE_PROFILES[crimeId];
}

export interface ExposureEvaluationOptions {
  explicitWitnessSignal?: boolean;
  institutionalReportFiled?: boolean;
  seedKey?: string;
}

/**
 * Evaluates public/third-party exposure orthogonally from police detection and legal status.
 *
 * - Undetected street attempts (`!roll.detected`) stay `'private'` unless explicit witness or
 *   institutional-report evidence is provided; proximity to school/work or player injury alone
 *   never establishes that an NPC witnessed or identified the player.
 * - Detected arrests roll probabilistic public press coverage (never forced 100%) and otherwise
 *   assign `'witness_known'` only when concrete institutional/victim-notification evidence exists.
 */
export function evaluateEvidenceBasedExposure(
  character: Pick<CharacterProfile, 'id' | 'birthYear' | 'age' | 'career' | 'business' | 'education' | 'crime'>,
  template: Pick<CrimeTemplate, 'id' | 'tier' | 'adultOffenseClass'>,
  roll: Pick<CrimeRollEvaluation, 'detected' | 'jurisdiction' | 'executionSucceeded'>,
  options: ExposureEvaluationOptions = {},
): CrimeExposureLevel {
  const hasExplicitEvidence = Boolean(
    options.explicitWitnessSignal || options.institutionalReportFiled,
  );

  if (!roll.detected) {
    return hasExplicitEvidence ? 'witness_known' : 'private';
  }

  const profile = getCrimeConsequenceProfile(template.id);
  const heat = character.crime?.policeHeat ?? 0;
  const notoriety = character.crime?.notoriety ?? 0;
  const heatBonus = Math.max(0, (heat - 40) * 0.0025);
  const notorietyBonus = Math.max(0, (notoriety - 35) * 0.003);
  const publicChance = Math.max(
    0.02,
    Math.min(0.88, profile.publicReportingBaseChance + heatBonus + notorietyBonus),
  );

  const prng = new SeededPRNG(
    hashSeed(
      character.id,
      character.birthYear,
      character.age,
      template.id,
      options.seedKey ?? character.crime?.attemptCountLifetime ?? 0,
      CRIME_SIM_VERSION,
      'exposure',
    ),
  );

  if (prng.chance(publicChance)) {
    return 'publicly_reported';
  }

  if (hasExplicitEvidence) {
    return 'witness_known';
  }

  // Concrete institutional / notification nexus without fabricating named NPC witnesses.
  if (roll.jurisdiction === 'juvenile') {
    return 'witness_known';
  }

  const currentJobField = character.career?.currentJob?.field;
  const hasSensitiveRole =
    currentJobField !== undefined && SENSITIVE_CAREER_FIELDS.includes(currentJobField);
  if (profile.isDishonestyOffense && (hasSensitiveRole || character.business !== null)) {
    return 'witness_known';
  }

  const eduStage = character.education?.currentStage;
  const isEnrolled =
    eduStage === 'middle_school' ||
    eduStage === 'high_school' ||
    eduStage === 'university' ||
    eduStage === 'professional_school';
  if (
    isEnrolled &&
    (template.id === 'vandalism' ||
      template.id === 'fraud_scam' ||
      template.id === 'robbery' ||
      template.id === 'bank_heist')
  ) {
    return 'witness_known';
  }

  return 'private';
}

export interface VictimLossAndRestitutionResult {
  stateForfeitedProceeds: number;
  recoveredPropertyReturnedToVictim: number;
  remainingVictimLoss: number;
  restitutionImposed: number;
}

/**
 * Separates state-confiscated proceeds, confirmed victim property returns, remaining victim loss,
 * and court-ordered restitution. Escrowed illicit proceeds withheld on conviction NEVER count
 * automatically as property returned to the victim.
 */
export function evaluateVictimLossAndRestitution(
  pendingCase: Pick<PendingCourtCase, 'crimeId' | 'jurisdiction' | 'executionSucceeded' | 'attemptedPayout'>,
  outcome: CrimeOutcomeStatus,
  prng: SeededPRNG,
  options: { victimReturnConfirmed?: boolean; recoveredValueReturned?: number } = {},
): VictimLossAndRestitutionResult {
  if (outcome === 'dismissed' || outcome === 'acquitted' || outcome === 'undetected' || outcome === 'aborted') {
    return {
      stateForfeitedProceeds: 0,
      recoveredPropertyReturnedToVictim: 0,
      remainingVictimLoss: 0,
      restitutionImposed: 0,
    };
  }

  const profile = getCrimeConsequenceProfile(pendingCase.crimeId);
  const escrowedProceeds = pendingCase.executionSucceeded
    ? Math.max(0, Math.round(pendingCase.attemptedPayout))
    : 0;

  const grossVictimLoss =
    profile.victimLossMax > profile.victimLossMin
      ? prng.nextInt(profile.victimLossMin, profile.victimLossMax)
      : profile.victimLossMin;

  // Victim loss reduces ONLY when an explicit return to the victim is confirmed.
  const confirmedReturn =
    options.victimReturnConfirmed &&
    typeof options.recoveredValueReturned === 'number' &&
    Number.isFinite(options.recoveredValueReturned) &&
    options.recoveredValueReturned > 0
      ? Math.min(grossVictimLoss, Math.round(options.recoveredValueReturned))
      : 0;

  const remainingVictimLoss = Math.max(0, grossVictimLoss - confirmedReturn);
  const stateForfeitedProceeds = escrowedProceeds;

  if (outcome === 'warned') {
    return {
      stateForfeitedProceeds,
      recoveredPropertyReturnedToVictim: confirmedReturn,
      remainingVictimLoss,
      restitutionImposed: Math.min(JUVENILE_WARNING_RESTITUTION_MAX, remainingVictimLoss),
    };
  }

  const juvenileScale = pendingCase.jurisdiction === 'juvenile' ? 0.35 : 1;
  const scaledRestitution = Math.round(remainingVictimLoss * juvenileScale);

  return {
    stateForfeitedProceeds,
    recoveredPropertyReturnedToVictim: confirmedReturn,
    remainingVictimLoss,
    restitutionImposed: Math.max(0, scaledRestitution),
  };
}

export interface EmploymentConsequenceDecision {
  action: 'none' | 'suspend_pending_trial' | 'reinstate' | 'preserve' | 'terminate';
  payMultiplier: 0 | 0.5 | 1;
  performanceDelta: number;
  reason?: string;
}

/**
 * Evaluates pre-trial suspension, acquittal reinstatement, unrelated fine preservation
 * (including Accountant + Burglary fined), relevant dishonesty/violent termination
 * (including Accountant + Fraud Scam), and imprisonment firing.
 */
export function evaluateEmploymentConsequence(
  character: Pick<CharacterProfile, 'career'>,
  pendingCase: Pick<PendingCourtCase, 'crimeId' | 'offenseClass' | 'jurisdiction' | 'title'>,
  stage: 'arrest' | CrimeOutcomeStatus,
  exposure: CrimeExposureLevel,
): EmploymentConsequenceDecision {
  const job = character.career?.currentJob;
  if (!job) {
    return { action: 'none', payMultiplier: 1, performanceDelta: 0 };
  }

  const profile = getCrimeConsequenceProfile(pendingCase.crimeId);
  const isSensitiveField = SENSITIVE_CAREER_FIELDS.includes(job.field);
  const isExtraRelevantField = profile.extraSensitiveCareerFields.includes(job.field);
  const isFelony = pendingCase.offenseClass === 'felony';

  if (stage === 'arrest') {
    const employerAware = exposure !== 'private' || (isSensitiveField && isFelony);
    if (!employerAware) {
      return { action: 'none', payMultiplier: 1, performanceDelta: 0 };
    }
    if (isSensitiveField) {
      const paidLeave = job.type === 'full_time' && !profile.isViolent;
      return {
        action: 'suspend_pending_trial',
        payMultiplier: paidLeave ? 0.5 : 0,
        performanceDelta: 0,
        reason: paidLeave
          ? `Placed on 50% paid administrative leave pending court resolution for ${pendingCase.title}.`
          : `Placed on unpaid leave pending court resolution for ${pendingCase.title}.`,
      };
    }
    if (exposure === 'publicly_reported' && (isFelony || profile.isViolent)) {
      return {
        action: 'suspend_pending_trial',
        payMultiplier: 0,
        performanceDelta: 0,
        reason: `Placed on unpaid leave following public felony arrest for ${pendingCase.title}.`,
      };
    }
    return { action: 'none', payMultiplier: 1, performanceDelta: 0 };
  }

  if (stage === 'dismissed' || stage === 'acquitted') {
    return {
      action: 'reinstate',
      payMultiplier: 1,
      performanceDelta: 0,
      reason: `Cleared of ${pendingCase.title}; active employment restored.`,
    };
  }

  if (stage === 'warned' || pendingCase.jurisdiction === 'juvenile') {
    return { action: 'preserve', payMultiplier: 1, performanceDelta: 0 };
  }

  if (stage === 'imprisoned') {
    return {
      action: 'terminate',
      payMultiplier: 0,
      performanceDelta: 0,
      reason: `Employment terminated due to custodial prison sentence for ${pendingCase.title}.`,
    };
  }

  if (stage === 'fined') {
    if (profile.isDishonestyOffense && isSensitiveField) {
      return {
        action: 'terminate',
        payMultiplier: 0,
        performanceDelta: 0,
        reason: `Terminated from ${job.title} due to financial dishonesty conviction (${pendingCase.title}).`,
      };
    }
    if (profile.isViolent && (isSensitiveField || exposure === 'publicly_reported')) {
      return {
        action: 'terminate',
        payMultiplier: 0,
        performanceDelta: 0,
        reason: `Terminated from ${job.title} following violent felony conviction (${pendingCase.title}).`,
      };
    }
    return {
      action: 'preserve',
      payMultiplier: 1,
      performanceDelta: exposure === 'publicly_reported' ? -5 : 0,
      reason: `Employment retained following non-custodial fine for ${pendingCase.title}.`,
    };
  }

  if (stage === 'probation') {
    if (
      (profile.isDishonestyOffense && isSensitiveField) ||
      profile.isViolent ||
      (isFelony && (isSensitiveField || isExtraRelevantField))
    ) {
      return {
        action: 'terminate',
        payMultiplier: 0,
        performanceDelta: 0,
        reason: `Terminated from ${job.title} due to ${pendingCase.title} probation conviction.`,
      };
    }
    return {
      action: 'preserve',
      payMultiplier: 1,
      performanceDelta: exposure === 'publicly_reported' ? -6 : -2,
      reason: `Employment retained under non-sensitive probation terms for ${pendingCase.title}.`,
    };
  }

  return { action: 'none', payMultiplier: 1, performanceDelta: 0 };
}

export interface BusinessConsequenceDecision {
  action: 'none' | 'scandal' | 'continue_delegated' | 'pause_incarceration' | 'liquidate';
  resolvedCapability: BusinessManagementCapabilityLike;
  brandDelta: number;
  moraleDelta: number;
  reason?: string;
}

export function resolveBusinessManagementCapability(
  business: BusinessWithManagementMeta,
): BusinessManagementCapabilityLike {
  if (
    business.managementCapability === 'owner_operated' ||
    business.managementCapability === 'delegated_management' ||
    business.managementCapability === 'management_unavailable' ||
    business.managementCapability === 'legacy_unassigned'
  ) {
    return business.managementCapability;
  }
  // Never silently infer owner_operated or delegated_management for pre-update legacy saves.
  return 'legacy_unassigned';
}

/**
 * Evaluates business continuity, caretaker pause, scandal, or forced liquidation strictly
 * from explicit managementCapability and solvency/fraud rules (never by sentence length alone).
 */
export function evaluateBusinessConsequence(
  business: BusinessWithManagementMeta | null | undefined,
  pendingCase: Pick<PendingCourtCase, 'crimeId' | 'offenseClass' | 'title'>,
  outcome: CrimeOutcomeStatus,
  exposure: CrimeExposureLevel,
): BusinessConsequenceDecision {
  if (!business) {
    return {
      action: 'none',
      resolvedCapability: 'legacy_unassigned',
      brandDelta: 0,
      moraleDelta: 0,
    };
  }

  const capability = resolveBusinessManagementCapability(business);
  const profile = getCrimeConsequenceProfile(pendingCase.crimeId);

  if (
    outcome === 'dismissed' ||
    outcome === 'acquitted' ||
    outcome === 'warned' ||
    outcome === 'undetected' ||
    outcome === 'aborted'
  ) {
    return {
      action: 'none',
      resolvedCapability: capability,
      brandDelta: 0,
      moraleDelta: 0,
    };
  }

  const isBusinessFraudClosure =
    profile.isBusinessFacilitatedRisk && pendingCase.offenseClass === 'felony';
  const isDeeplyInsolvent = business.treasury < -business.valuation * 0.5;

  if (outcome === 'imprisoned') {
    if (isBusinessFraudClosure) {
      return {
        action: 'liquidate',
        resolvedCapability: capability,
        brandDelta: profile.businessScandalBrandDelta,
        moraleDelta: profile.businessScandalMoraleDelta,
        reason: `${business.name} was forced into liquidation due to felony financial fraud conviction.`,
      };
    }
    if (isDeeplyInsolvent) {
      return {
        action: 'liquidate',
        resolvedCapability: capability,
        brandDelta: 0,
        moraleDelta: 0,
        reason: `${business.name} was liquidated due to severe corporate insolvency upon imprisonment.`,
      };
    }
    if (capability === 'owner_operated' || capability === 'management_unavailable') {
      return {
        action: 'liquidate',
        resolvedCapability: capability,
        brandDelta: 0,
        moraleDelta: 0,
        reason: `${business.name} could not operate without active management during imprisonment and was liquidated.`,
      };
    }
    if (capability === 'legacy_unassigned') {
      return {
        action: 'pause_incarceration',
        resolvedCapability: capability,
        brandDelta: exposure === 'publicly_reported' ? Math.round(profile.businessScandalBrandDelta * 0.4) : 0,
        moraleDelta: 0,
        reason: `${business.name} entered caretaker pause during incarceration while existing loan contracts remain active.`,
      };
    }
    return {
      action: 'continue_delegated',
      resolvedCapability: 'delegated_management',
      brandDelta: exposure === 'publicly_reported' ? Math.round(profile.businessScandalBrandDelta * 0.5) : 0,
      moraleDelta: exposure === 'publicly_reported' ? Math.round(profile.businessScandalMoraleDelta * 0.5) : -4,
      reason: `${business.name} continues operating under delegated management while owner controls are locked during imprisonment.`,
    };
  }

  // Non-custodial convictions ('fined' / 'probation') never force liquidation.
  if (exposure === 'private' && !profile.isBusinessFacilitatedRisk) {
    return {
      action: 'none',
      resolvedCapability: capability,
      brandDelta: 0,
      moraleDelta: 0,
    };
  }

  const exposureMultiplier =
    exposure === 'publicly_reported' ? 1 : profile.isBusinessFacilitatedRisk ? 0.85 : 0.4;
  const brandDelta = Math.round(profile.businessScandalBrandDelta * exposureMultiplier);
  const moraleDelta = Math.round(profile.businessScandalMoraleDelta * exposureMultiplier);

  if (brandDelta === 0 && moraleDelta === 0) {
    return {
      action: 'none',
      resolvedCapability: capability,
      brandDelta: 0,
      moraleDelta: 0,
    };
  }

  return {
    action: 'scandal',
    resolvedCapability: capability,
    brandDelta,
    moraleDelta,
    reason: `Public fallout from ${pendingCase.title} damaged ${business.name}'s brand reputation and staff morale.`,
  };
}

export interface EducationConsequenceDecision {
  scope: 'none' | 'k12' | 'higher_ed';
  action: 'none' | 'detention' | 'k12_suspension' | 'warning' | 'probation' | 'suspended' | 'expelled';
  popularityDelta: number;
  missedClassPenalty: number;
  dropActivities: boolean;
  suspensionYears: number;
  reason?: string;
}

const DISHONESTY_RELEVANT_MAJOR_KEYWORDS = ['business', 'finance', 'accounting', 'law', 'medicine', 'nursing', 'pre-med'];

function isDishonestyRelevantHigherEd(character: Pick<CharacterProfile, 'education'>): boolean {
  const edu = character.education;
  if (!edu) return false;
  if (edu.currentStage === 'professional_school') {
    const school = edu.professionalSchool?.schoolName?.toLowerCase() ?? '';
    const schoolId = edu.professionalSchool?.schoolId?.toLowerCase() ?? '';
    return (
      school.includes('law') ||
      school.includes('medical') ||
      school.includes('business') ||
      schoolId.includes('law') ||
      schoolId.includes('med') ||
      schoolId.includes('mba')
    );
  }
  const major = `${edu.university?.majorName ?? ''} ${edu.university?.degreeTitle ?? ''}`.toLowerCase();
  return DISHONESTY_RELEVANT_MAJOR_KEYWORDS.some((kw) => major.includes(kw));
}

/**
 * Evaluates education discipline using severity, institutional relevance, violent/financial/repeat
 * status, and court outcome. Minor unrelated misdemeanors never trigger automatic university expulsion;
 * K-12 never breaks compulsory school advancement or subtracts grades directly.
 */
export function evaluateEducationConsequence(
  character: Pick<CharacterProfile, 'education'>,
  pendingCase: Pick<PendingCourtCase, 'crimeId' | 'offenseClass' | 'jurisdiction' | 'title'>,
  outcome: CrimeOutcomeStatus,
  exposure: CrimeExposureLevel,
): EducationConsequenceDecision {
  const stage = character.education?.currentStage;
  if (
    !stage ||
    stage === 'none' ||
    stage === 'graduated' ||
    outcome === 'dismissed' ||
    outcome === 'acquitted' ||
    outcome === 'undetected' ||
    outcome === 'aborted'
  ) {
    return {
      scope: 'none',
      action: 'none',
      popularityDelta: 0,
      missedClassPenalty: 0,
      dropActivities: false,
      suspensionYears: 0,
    };
  }

  const profile = getCrimeConsequenceProfile(pendingCase.crimeId);
  const isK12 = stage === 'elementary' || stage === 'middle_school' || stage === 'high_school';

  if (isK12) {
    if (outcome === 'warned') {
      return {
        scope: 'k12',
        action: 'detention',
        popularityDelta: -4,
        missedClassPenalty: 0,
        dropActivities: false,
        suspensionYears: 0,
        reason: `School administration issued detention following ${pendingCase.title}.`,
      };
    }
    if (outcome === 'fined') {
      return {
        scope: 'k12',
        action: 'k12_suspension',
        popularityDelta: -6,
        missedClassPenalty: 4,
        dropActivities: false,
        suspensionYears: 0,
        reason: `Short-term school suspension after ${pendingCase.title} caused missed classwork.`,
      };
    }
    return {
      scope: 'k12',
      action: 'k12_suspension',
      popularityDelta: -10,
      missedClassPenalty: 8,
      dropActivities: true,
      suspensionYears: 0,
      reason: `Extended school suspension after ${pendingCase.title} paused extracurricular activities and caused missed classes.`,
    };
  }

  // Higher Education ('university' | 'professional_school')
  const existingDisciplinary = (
    character.education as CharacterProfile['education'] & {
      disciplinaryStatus?: 'none' | 'warning' | 'probation' | 'suspended';
    }
  ).disciplinaryStatus;
  const alreadyUnderDiscipline =
    existingDisciplinary === 'probation' || existingDisciplinary === 'suspended';
  const isFelony = pendingCase.offenseClass === 'felony';
  const relevantFraud = profile.isDishonestyOffense && isDishonestyRelevantHigherEd(character);

  if (outcome === 'imprisoned') {
    return {
      scope: 'higher_ed',
      action: 'expelled',
      popularityDelta: -25,
      missedClassPenalty: 0,
      dropActivities: true,
      suspensionYears: 0,
      reason: `Expelled due to prison sentence for ${pendingCase.title}.`,
    };
  }

  if (profile.isViolent || (relevantFraud && (outcome === 'probation' || outcome === 'fined'))) {
    return {
      scope: 'higher_ed',
      action: 'expelled',
      popularityDelta: -25,
      missedClassPenalty: 0,
      dropActivities: true,
      suspensionYears: 0,
      reason: `Expelled due to severe ${profile.isViolent ? 'violent' : 'academic/financial dishonesty'} conviction (${pendingCase.title}).`,
    };
  }

  if (alreadyUnderDiscipline && (isFelony || outcome === 'probation')) {
    return {
      scope: 'higher_ed',
      action: 'expelled',
      popularityDelta: -22,
      missedClassPenalty: 0,
      dropActivities: true,
      suspensionYears: 0,
      reason: `Expelled after committing a repeat offense (${pendingCase.title}) while under disciplinary sanction.`,
    };
  }

  if (isFelony && outcome === 'probation') {
    return {
      scope: 'higher_ed',
      action: 'expelled',
      popularityDelta: -25,
      missedClassPenalty: 0,
      dropActivities: true,
      suspensionYears: 0,
      reason: `Expelled following adult felony probation sentence for ${pendingCase.title}.`,
    };
  }

  if (isFelony && outcome === 'fined') {
    return {
      scope: 'higher_ed',
      action: 'suspended',
      popularityDelta: -14,
      missedClassPenalty: 0,
      dropActivities: true,
      suspensionYears: 1,
      reason: `Placed on 1-year academic suspension following felony conviction for ${pendingCase.title}.`,
    };
  }

  // Minor non-violent misdemeanors ('shoplifting', 'vandalism', 'pickpocketing'):
  // Never automatically expel a university student.
  if (outcome === 'probation') {
    const campusRelated = pendingCase.crimeId === 'vandalism' && exposure !== 'private';
    return {
      scope: 'higher_ed',
      action: campusRelated ? 'suspended' : 'probation',
      popularityDelta: campusRelated ? -12 : -8,
      missedClassPenalty: 0,
      dropActivities: campusRelated,
      suspensionYears: campusRelated ? 1 : 0,
      reason: campusRelated
        ? `Placed on 1-year academic suspension for campus-relevant ${pendingCase.title}.`
        : `Placed on disciplinary probation following misdemeanor ${pendingCase.title}.`,
    };
  }

  return {
    scope: 'higher_ed',
    action: exposure === 'private' ? 'none' : 'warning',
    popularityDelta: exposure === 'private' ? 0 : -5,
    missedClassPenalty: 0,
    dropActivities: false,
    suspensionYears: 0,
    reason:
      exposure === 'private'
        ? undefined
        : `Received a formal conduct warning following misdemeanor fine for ${pendingCase.title}.`,
  };
}

export interface AttemptMoodEvaluation {
  happinessDelta: number;
  karmaDelta: number;
  healthDelta: number;
}

/**
 * Evaluates attempt-stage stat impacts (undetected, aborted, arrested) without flat bonuses
 * for high-stakes undetected crimes and without non-physical health drops.
 */
export function evaluateAttemptMoodAndKarma(
  template: Pick<CrimeTemplate, 'id' | 'tier' | 'karmaPenalty'>,
  roll: Pick<CrimeRollEvaluation, 'detected' | 'executionSucceeded' | 'injured' | 'injuryHealthLoss'>,
  currentKarma: number,
): AttemptMoodEvaluation {
  const profile = getCrimeConsequenceProfile(template.id);
  const healthDelta =
    roll.injured && roll.injuryHealthLoss > 0 ? -Math.abs(Math.round(roll.injuryHealthLoss)) : 0;

  if (roll.detected) {
    const arrestShock = template.tier === 'high_stakes' ? -6 : template.tier === 'mid' ? -5 : -4;
    return {
      happinessDelta: arrestShock,
      karmaDelta: -template.karmaPenalty,
      healthDelta,
    };
  }

  if (roll.executionSucceeded) {
    const happinessDelta =
      template.tier === 'petty' && currentKarma < 45 ? 1 : profile.undetectedStressDelta;
    return {
      happinessDelta,
      karmaDelta: -template.karmaPenalty,
      healthDelta,
    };
  }

  // Escaped undetected after failed execution ('aborted')
  return {
    happinessDelta: profile.abortedHappinessDelta,
    karmaDelta: -Math.max(1, Math.round(template.karmaPenalty * 0.5)),
    healthDelta,
  };
}

export interface VerdictPhysicalMoodEvaluation {
  happinessDelta: number;
  karmaDelta: number;
  healthDelta: number;
  /** Always 0: legal verdicts never apply arbitrary looks penalties. */
  looksDelta: 0;
}

function safeNonLethalHealthDelta(currentHealth: number, intendedLoss: number): number {
  if (intendedLoss <= 0) return 0;
  const maxSafeLoss = Math.max(0, Math.round(currentHealth) - 5);
  const actualLoss = Math.min(intendedLoss, maxSafeLoss);
  return actualLoss > 0 ? -actualLoss : 0;
}

/**
 * Computes verdict stat deltas with zero looks deductions, cause-driven physical health only
 * (violent offenses or prison custody), and arrest-delta de-duplication to prevent stacking.
 * Note: `pendingCase.arrestHealthApplied` tracks non-injury arrest physical stress only
 * (never `roll.injured` getaway trauma), so a getaway injury cannot suppress custodial stress.
 */
export function evaluatePhysicalAndMoodImpact(
  pendingCase: Pick<
    PendingCourtCase,
    'crimeId' | 'offenseClass' | 'arrestHappinessApplied' | 'arrestHealthApplied'
  >,
  outcome: CrimeOutcomeStatus,
  currentHealth: number,
): VerdictPhysicalMoodEvaluation {
  const profile = getCrimeConsequenceProfile(pendingCase.crimeId);
  const isFelony = pendingCase.offenseClass === 'felony';
  const priorArrestHap = Math.min(0, pendingCase.arrestHappinessApplied ?? 0);
  const priorArrestHealth = Math.min(0, pendingCase.arrestHealthApplied ?? 0);

  if (outcome === 'dismissed' || outcome === 'acquitted') {
    return { happinessDelta: 8, karmaDelta: 0, healthDelta: 0, looksDelta: 0 };
  }

  if (outcome === 'warned') {
    const remainingHap = Math.min(0, -3 - priorArrestHap);
    return { happinessDelta: remainingHap, karmaDelta: 0, healthDelta: 0, looksDelta: 0 };
  }

  let targetTotalHap = 0;
  let karmaDelta = 0;
  let targetTotalHealthLoss = 0;

  if (outcome === 'fined') {
    targetTotalHap = isFelony ? -12 : -7;
    karmaDelta = isFelony ? -14 : -7;
    targetTotalHealthLoss = profile.isViolent ? 3 : 0;
  } else if (outcome === 'probation') {
    targetTotalHap = isFelony ? -18 : -12;
    karmaDelta = isFelony ? -20 : -11;
    targetTotalHealthLoss = profile.isViolent ? 4 : 0;
  } else if (outcome === 'imprisoned') {
    // Preserve exact -18 total when arrest shock was not previously applied, or cap combined
    // arrest + custody mood shock at -20 to prevent double-stacking on the same incident.
    targetTotalHap = priorArrestHap < 0 ? -20 : -18;
    karmaDelta = isFelony ? -25 : -15;
    targetTotalHealthLoss = profile.isViolent ? 6 : 5;
  }

  const happinessDelta = Math.min(0, targetTotalHap - priorArrestHap);
  const remainingHealthLoss = Math.max(0, targetTotalHealthLoss + priorArrestHealth);
  const healthDelta = safeNonLethalHealthDelta(currentHealth, remainingHealthLoss);

  return {
    happinessDelta,
    karmaDelta,
    healthDelta,
    looksDelta: 0,
  };
}

export interface ProbationRevocationModifier {
  severity: 'minor' | 'serious' | 'violent_or_repeat';
  prisonWeightBoost: number;
  probationShiftReduction: number;
}

/**
 * Computes conviction-tier sentencing modifiers for offenses committed while on probation.
 * Applied strictly to conviction probabilities so acquittal and dismissal remain achievable.
 */
export function evaluateProbationRevocationModifier(
  pendingCase: Pick<PendingCourtCase, 'crimeId' | 'offenseClass'>,
  existingViolationCount = 0,
): ProbationRevocationModifier {
  const profile = getCrimeConsequenceProfile(pendingCase.crimeId);
  if (profile.isViolent || existingViolationCount >= 2) {
    return {
      severity: 'violent_or_repeat',
      prisonWeightBoost: 0.5,
      probationShiftReduction: 0.16,
    };
  }
  if (pendingCase.offenseClass === 'felony') {
    return {
      severity: 'serious',
      prisonWeightBoost: 0.3,
      probationShiftReduction: 0.1,
    };
  }
  return {
    severity: 'minor',
    prisonWeightBoost: 0.1,
    probationShiftReduction: 0.04,
  };
}

export interface AwarenessSocialMultiplier {
  householdScale: number;
  socialCircleScale: number;
  colleagueScale: number;
}

/**
 * Gates non-custodial social reactions by public exposure so private incidents do not
 * broadcast to distant acquaintances or coworkers.
 */
export function evaluateAwarenessSocialScale(
  outcome: CrimeOutcomeStatus,
  exposure: CrimeExposureLevel,
): AwarenessSocialMultiplier {
  if (outcome === 'undetected' || outcome === 'aborted') {
    return exposure === 'witness_known'
      ? { householdScale: 0.25, socialCircleScale: 0.2, colleagueScale: 0 }
      : { householdScale: 0, socialCircleScale: 0, colleagueScale: 0 };
  }
  if (outcome === 'imprisoned') {
    return { householdScale: 1, socialCircleScale: 1, colleagueScale: 1 };
  }
  if (exposure === 'publicly_reported') {
    return { householdScale: 1, socialCircleScale: 1, colleagueScale: 1 };
  }
  if (exposure === 'witness_known') {
    return { householdScale: 0.8, socialCircleScale: 0.5, colleagueScale: 0.5 };
  }
  // 'private' police intake/fine
  return { householdScale: 0.45, socialCircleScale: 0, colleagueScale: 0 };
}

export type ArrestWitnessGroup = 'family' | 'partner' | 'friends' | 'colleagues';

export type InstitutionalNotificationTarget = 'none' | 'employer' | 'school' | 'parents';

export interface ArrestAwarenessEvidenceInput {
  jurisdiction: LegalJurisdiction;
  exposure: CrimeExposureLevel;
  explicitWitnessGroups?: readonly ArrestWitnessGroup[];
  institutionalReportFiled?: boolean;
  institutionalTarget?: InstitutionalNotificationTarget;
  statutoryParentNotification?: boolean;
}

export interface ArrestSocialAwarenessDecision {
  parentsAware: boolean;
  partnerAware: boolean;
  friendsAware: boolean;
  colleaguesAware: boolean;
  /** Established arrest deltas (binary: full established delta or 0—never invented multipliers). */
  parentsDelta: number;
  partnerDelta: number;
  friendsDelta: number;
  colleaguesDelta: number;
}

/**
 * Evaluates pre-trial arrest social awareness strictly from explicit awareness recipients
 * and documented notification rules, keeping legal status, police detection, witness
 * awareness, institutional reporting, and public exposure independent.
 */
export function evaluateArrestSocialAwareness(
  input: ArrestAwarenessEvidenceInput,
): ArrestSocialAwarenessDecision {
  const witnessGroups = new Set<ArrestWitnessGroup>(input.explicitWitnessGroups ?? []);
  const isPublic = input.exposure === 'publicly_reported';
  const hasInstitutionalParentsNotice =
    Boolean(input.institutionalReportFiled) && input.institutionalTarget === 'parents';
  const hasStatutoryParentsNotice = Boolean(input.statutoryParentNotification);

  const parentsAware =
    hasStatutoryParentsNotice ||
    hasInstitutionalParentsNotice ||
    witnessGroups.has('family') ||
    isPublic;
  const partnerAware = witnessGroups.has('partner') || isPublic;
  const friendsAware = witnessGroups.has('friends') || isPublic;
  const colleaguesAware = witnessGroups.has('colleagues') || isPublic;

  return {
    parentsAware,
    partnerAware,
    friendsAware,
    colleaguesAware,
    parentsDelta: parentsAware ? (input.jurisdiction === 'juvenile' ? -5 : -4) : 0,
    partnerDelta: partnerAware ? -3 : 0,
    friendsDelta: 0,
    colleaguesDelta: 0,
  };
}
