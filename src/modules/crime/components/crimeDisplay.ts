import type { CharacterProfile, StatEffects } from '../../../types/game';
import { CRIME_CATALOG } from '../data/crimeCatalog';
import { DEFENSE_STRATEGIES, getAttorneyFeeForCase } from '../data/legalCatalog';
import {
  computeDetectionProbability,
  computeExecutionProbability,
  computeInjuryProbability,
} from '../services/crimeRiskService';
import {
  getActiveAdultConvictions,
  getArrestCount,
  getAttemptsUsedThisYear,
  getExpungementEligibleRecords,
  getJurisdictionForAge,
  getJuvenileAdjudications,
  getJuvenileWarningCount,
  getRemainingAttemptsThisYear,
  getSanitizedCrimeState,
  getUnpaidFines,
  hasPendingCourtCase,
  isCrimeEligibleForCharacter,
  isCurrentlyIncarcerated,
  isOnProbation,
  MAX_CRIME_ATTEMPTS_PER_YEAR,
} from '../services/crimeSelectors';
import { MAX_PRISON_ACTIONS_PER_YEAR, PRISON_WORK_PAY } from '../services/prisonService';
import type {
  CourtResolutionResult,
  CrimeAttemptResult,
  CrimeEligibilityResult,
  CrimeOutcomeStatus,
  CrimeRecordEntry,
  CrimeTemplate,
  DefenseStrategyTemplate,
  LegalJurisdiction,
  PendingCourtCase,
  PrisonActionId,
  PrisonState,
} from '../types';

export const CRIME_MENU_MIN_AGE = 10;

export type CrimeEligibilityCategory =
  | 'available'
  | 'age_restricted'
  | 'incarcerated'
  | 'pending_case'
  | 'annual_limit'
  | 'deceased';

export interface CrimePreviewItem {
  template: CrimeTemplate;
  jurisdiction: LegalJurisdiction;
  offenseClassLabel: string;
  executionPct: number;
  detectionPct: number;
  injuryPct: number;
  payoutRangeLabel: string;
  eligibility: CrimeEligibilityResult;
  eligibilityCategory: CrimeEligibilityCategory;
}

export interface CrimeAttemptView {
  title: string;
  subtitle: string;
  message: string;
  badgeLabel: string;
  badgeVariant: 'emerald' | 'amber' | 'rose' | 'slate';
  statEffects: StatEffects;
  requiresCourt: boolean;
  heldProceeds: number;
  immediatePayout: number;
  injured: boolean;
  injuryHealthLoss: number;
}

export interface DefenseStrategyView {
  strategy: DefenseStrategyTemplate;
  fee: number;
  canAfford: boolean;
  feeLabel: string;
}

export interface CourtVerdictView {
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeVariant: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
  outcome: CrimeOutcomeStatus;
  jurisdictionLabel: string;
  message: string;
  releasedPayout: number;
  attorneyFeePaid: number;
  fineImposed: number;
  finePaid: number;
  unpaidFineAdded: number;
  probationYears: number;
  sentenceYears: number;
  employmentTerminated: boolean;
}

export interface PrisonActionView {
  actionId: PrisonActionId;
  label: string;
  icon: string;
  description: string;
  effectSummary: string;
  available: boolean;
  blockedReason?: string;
}

export interface ClassifiedCrimeRecord {
  entry: CrimeRecordEntry;
  badgeLabel: string;
  badgeVariant: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate' | 'purple';
  jurisdictionLabel: string;
  isFormalArrest: boolean;
  isActiveConviction: boolean;
  isCleared: boolean;
  isClearedJuvenile: boolean;
  isClearedAdult: boolean;
  canPetitionExpungement: boolean;
}

export function formatCrimeMoney(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `$${safe.toLocaleString()}`;
}

export function formatOffenseClassLabel(offenseClass: CrimeTemplate['adultOffenseClass']): string {
  return offenseClass === 'felony' ? 'Felony' : 'Misdemeanor';
}

export function formatJurisdictionLabel(jurisdiction: LegalJurisdiction): string {
  return jurisdiction === 'juvenile' ? 'Juvenile' : 'Adult';
}

export function getCrimeEligibilityCategory(
  character: Pick<CharacterProfile, 'isAlive' | 'age' | 'crime'>,
  template: CrimeTemplate,
): CrimeEligibilityCategory {
  if (!character.isAlive) return 'deceased';
  if (isCurrentlyIncarcerated(character)) return 'incarcerated';
  if (hasPendingCourtCase(character)) return 'pending_case';
  if (character.age < template.minAge) return 'age_restricted';
  if (getRemainingAttemptsThisYear(character) <= 0) return 'annual_limit';
  return 'available';
}

export function getCrimeCatalogPreviews(character: CharacterProfile): CrimePreviewItem[] {
  const jurisdiction = getJurisdictionForAge(character.age);

  return CRIME_CATALOG.map((template) => {
    const executionPct = Math.round(computeExecutionProbability(character, template) * 100);
    const detectionPct = Math.round(computeDetectionProbability(character, template) * 100);
    const injuryPct = Math.round(computeInjuryProbability(character, template) * 100);
    const eligibility = isCrimeEligibleForCharacter(character, template);
    const eligibilityCategory = getCrimeEligibilityCategory(character, template);
    const payoutRangeLabel =
      template.payoutMax > 0
        ? `${formatCrimeMoney(template.payoutMin)} – ${formatCrimeMoney(template.payoutMax)}`
        : '$0 (Property damage only)';

    return {
      template,
      jurisdiction,
      offenseClassLabel: formatOffenseClassLabel(template.adultOffenseClass),
      executionPct,
      detectionPct,
      injuryPct,
      payoutRangeLabel,
      eligibility,
      eligibilityCategory,
    };
  });
}

export function buildAttemptResultView(result: CrimeAttemptResult): CrimeAttemptView {
  const roll = result.roll;
  const heldProceeds = result.pendingCase?.attemptedPayout ?? 0;
  const immediatePayout = roll && roll.executionSucceeded && !roll.detected ? roll.attemptedPayout : 0;
  const injured = Boolean(roll?.injured);
  const injuryHealthLoss = roll?.injuryHealthLoss ?? 0;

  let badgeLabel = 'Blocked';
  let badgeVariant: CrimeAttemptView['badgeVariant'] = 'slate';
  let title = 'Attempt Unavailable';
  let subtitle = 'Crime & High Stakes';

  if (roll) {
    if (roll.executionSucceeded && !roll.detected) {
      badgeLabel = 'Clean Score';
      badgeVariant = 'emerald';
      title = 'Score Succeeded!';
      subtitle = 'Undetected • Immediate Payout';
    } else if (roll.executionSucceeded && roll.detected) {
      badgeLabel = 'Arrested';
      badgeVariant = 'rose';
      title = 'Arrested at the Scene';
      subtitle = 'Executed • Proceeds Held Pending Court';
    } else if (!roll.executionSucceeded && !roll.detected) {
      badgeLabel = 'Slipped Away';
      badgeVariant = 'amber';
      title = 'Attempt Failed cleanly';
      subtitle = 'Failed • Escaped Undetected';
    } else {
      badgeLabel = 'Busted';
      badgeVariant = 'rose';
      title = 'Failed & Arrested';
      subtitle = 'Failed Attempt • Court Hearing Required';
    }
  }

  return {
    title,
    subtitle,
    message: result.message,
    badgeLabel,
    badgeVariant,
    statEffects: {
      ...(immediatePayout > 0 ? { cash: immediatePayout } : {}),
      ...(injured && injuryHealthLoss > 0 ? { health: -injuryHealthLoss } : {}),
    },
    requiresCourt: Boolean(result.pendingCase),
    heldProceeds,
    immediatePayout,
    injured,
    injuryHealthLoss,
  };
}

export function getDefenseStrategyOptions(
  pendingCase: PendingCourtCase,
  availableCash: number,
): DefenseStrategyView[] {
  const safeCash = Number.isFinite(availableCash) ? Math.max(0, availableCash) : 0;
  return DEFENSE_STRATEGIES.map((strategy) => {
    const fee = getAttorneyFeeForCase(strategy.id, pendingCase.tier);
    return {
      strategy,
      fee,
      canAfford: fee === 0 || safeCash >= fee,
      feeLabel: fee > 0 ? formatCrimeMoney(fee) : 'Free ($0)',
    };
  });
}

export function buildCourtVerdictView(
  result: CourtResolutionResult,
  jurisdiction: LegalJurisdiction,
): CourtVerdictView {
  const outcome = result.outcome ?? 'dismissed';
  const jurisdictionLabel =
    jurisdiction === 'juvenile' ? 'Juvenile Court' : 'Adult Criminal Court';

  const map: Record<
    CrimeOutcomeStatus,
    { label: string; variant: CourtVerdictView['badgeVariant']; title: string }
  > = {
    dismissed: { label: 'Charges Dismissed', variant: 'emerald', title: 'Case Dismissed' },
    acquitted: { label: 'Not Guilty', variant: 'emerald', title: 'Acquitted by Court' },
    warned: { label: 'Juvenile Warning', variant: 'amber', title: 'Juvenile Warning Issued' },
    fined: { label: 'Fined', variant: 'amber', title: 'Guilty • Court Fine' },
    probation: { label: 'Probation', variant: 'amber', title: 'Guilty • Probation Ordered' },
    imprisoned: { label: 'Imprisoned', variant: 'rose', title: 'Sentenced to Prison' },
    undetected: { label: 'Undetected', variant: 'slate', title: 'Case Closed' },
    aborted: { label: 'Aborted', variant: 'slate', title: 'Case Closed' },
  };

  const meta = map[outcome];

  return {
    title: meta.title,
    subtitle: jurisdictionLabel,
    badgeLabel: meta.label,
    badgeVariant: meta.variant,
    outcome,
    jurisdictionLabel,
    message: result.message,
    releasedPayout: result.releasedPayout,
    attorneyFeePaid: result.attorneyFeePaid,
    fineImposed: result.fineImposed,
    finePaid: result.finePaid,
    unpaidFineAdded: result.unpaidFineAdded,
    probationYears: result.probationYears,
    sentenceYears: result.sentenceYears,
    employmentTerminated: result.employmentTerminated,
  };
}

export function getPrisonActionViews(
  character: Pick<CharacterProfile, 'age' | 'isAlive'>,
  prison: PrisonState,
): PrisonActionView[] {
  const actionsUsed =
    prison.lastActionAge === character.age ? prison.actionsTakenThisYear : 0;
  const annualLimitReached = actionsUsed >= MAX_PRISON_ACTIONS_PER_YEAR;
  const paroleLocked = prison.yearsServed < prison.paroleEligibleAtServed;

  const cooldownReason = `Annual prison action limit reached for age ${character.age}. Age Up to act again.`;

  const baseActions: Omit<PrisonActionView, 'available' | 'blockedReason'>[] = [
    {
      actionId: 'work',
      label: 'Prison Work Detail',
      icon: '🛠️',
      description: `Take an institutional work shift for ${formatCrimeMoney(PRISON_WORK_PAY)} commissary pay.`,
      effectSummary: `+${formatCrimeMoney(PRISON_WORK_PAY)} Cash • +3 Behavior • +2 Happiness • -1 Health`,
    },
    {
      actionId: 'study',
      label: 'Library Study',
      icon: '📚',
      description: 'Read legal and vocational texts in the prison library.',
      effectSummary: '+2 Smarts • +3 Behavior • +1 Happiness',
    },
    {
      actionId: 'workout',
      label: 'Yard Workout',
      icon: '🏋️',
      description: 'Complete physical conditioning out in the prison yard.',
      effectSummary: '+3 Health • +1 Behavior • +2 Happiness',
    },
    {
      actionId: 'good_behavior',
      label: 'Rehabilitation Program',
      icon: '🕊️',
      description: 'Attend counseling and maintain exemplary institutional conduct.',
      effectSummary: '+8 Behavior • +2 Karma • +2 Happiness',
    },
    {
      actionId: 'appeal',
      label: 'File Appeal',
      icon: '⚖️',
      description: 'Petition the appellate court for a 1-year sentence reduction.',
      effectSummary: 'Chance to shave 1 year or commute final year',
    },
    {
      actionId: 'parole',
      label: 'Parole Hearing',
      icon: '🔓',
      description: 'Appear before the parole board for early supervised release.',
      effectSummary: `Unlocks at ${prison.paroleEligibleAtServed} yr served • Converts remaining time to adult probation`,
    },
  ];

  return baseActions.map((item) => {
    if (!character.isAlive) {
      return {
        ...item,
        available: false,
        blockedReason: 'Deceased characters cannot take prison actions.',
      };
    }
    if (annualLimitReached) {
      return {
        ...item,
        available: false,
        blockedReason: cooldownReason,
      };
    }
    if (item.actionId === 'parole' && paroleLocked) {
      return {
        ...item,
        available: false,
        blockedReason: `Requires serving ${prison.paroleEligibleAtServed} year(s) (${prison.yearsServed}/${prison.paroleEligibleAtServed} served).`,
      };
    }
    return {
      ...item,
      available: true,
    };
  });
}

export function classifyCrimeRecord(
  entry: CrimeRecordEntry,
  expungementEligibleIds: ReadonlySet<string>,
): ClassifiedCrimeRecord {
  const jurisdictionLabel = formatJurisdictionLabel(entry.jurisdiction);
  const isClearedJuvenile = entry.jurisdiction === 'juvenile' && entry.sealed;
  const isClearedAdult = entry.jurisdiction === 'adult' && entry.expunged;
  const canPetitionExpungement = expungementEligibleIds.has(entry.id);

  if (entry.outcome === 'warned') {
    return {
      entry,
      badgeLabel: 'Juvenile Warning',
      badgeVariant: 'amber',
      jurisdictionLabel,
      isFormalArrest: false,
      isActiveConviction: false,
      isCleared: false,
      isClearedJuvenile: false,
      isClearedAdult: false,
      canPetitionExpungement: false,
    };
  }

  if (isClearedJuvenile) {
    return {
      entry,
      badgeLabel: 'Sealed (Juvenile)',
      badgeVariant: 'sky',
      jurisdictionLabel,
      isFormalArrest: true,
      isActiveConviction: false,
      isCleared: true,
      isClearedJuvenile: true,
      isClearedAdult: false,
      canPetitionExpungement: false,
    };
  }

  if (isClearedAdult) {
    return {
      entry,
      badgeLabel: 'Expunged (Adult)',
      badgeVariant: 'emerald',
      jurisdictionLabel,
      isFormalArrest: true,
      isActiveConviction: false,
      isCleared: true,
      isClearedJuvenile: false,
      isClearedAdult: true,
      canPetitionExpungement: false,
    };
  }

  if (entry.outcome === 'dismissed' || entry.outcome === 'acquitted') {
    return {
      entry,
      badgeLabel: entry.outcome === 'dismissed' ? 'Dismissed' : 'Acquitted',
      badgeVariant: 'emerald',
      jurisdictionLabel,
      isFormalArrest: true,
      isActiveConviction: false,
      isCleared: false,
      isClearedJuvenile: false,
      isClearedAdult: false,
      canPetitionExpungement: false,
    };
  }

  if (entry.outcome === 'undetected' || entry.outcome === 'aborted') {
    return {
      entry,
      badgeLabel: entry.outcome === 'undetected' ? 'Undetected' : 'Aborted',
      badgeVariant: 'slate',
      jurisdictionLabel,
      isFormalArrest: false,
      isActiveConviction: false,
      isCleared: false,
      isClearedJuvenile: false,
      isClearedAdult: false,
      canPetitionExpungement: false,
    };
  }

  const outcomeLabel =
    entry.outcome === 'imprisoned'
      ? `Imprisoned (${entry.sentenceYears}y)`
      : entry.outcome === 'probation'
        ? 'Probation'
        : 'Fined';

  return {
    entry,
    badgeLabel:
      entry.jurisdiction === 'juvenile' ? `Juvenile • ${outcomeLabel}` : outcomeLabel,
    badgeVariant:
      entry.outcome === 'imprisoned'
        ? 'rose'
        : entry.jurisdiction === 'juvenile'
          ? 'purple'
          : 'amber',
    jurisdictionLabel,
    isFormalArrest: true,
    isActiveConviction: entry.jurisdiction === 'adult',
    isCleared: false,
    isClearedJuvenile: false,
    isClearedAdult: false,
    canPetitionExpungement,
  };
}

export interface CrimeDashboardSummary {
  policeHeat: number;
  notoriety: number;
  formalArrests: number;
  juvenileWarnings: number;
  attemptsUsedThisYear: number;
  attemptsRemainingThisYear: number;
  maxAttemptsPerYear: number;
  hasPendingCase: boolean;
  isOnProbation: boolean;
  isIncarcerated: boolean;
  unpaidFines: number;
  statusLabel: string;
  statusVariant: 'emerald' | 'amber' | 'rose' | 'sky';
  activeAdultConvictionCount: number;
  activeJuvenileAdjudicationCount: number;
  expungementEligibleIds: Set<string>;
}

export function buildCrimeDashboardSummary(character: CharacterProfile): CrimeDashboardSummary {
  const sanitized = getSanitizedCrimeState(character);
  const formalArrests = getArrestCount(character);
  const juvenileWarnings = getJuvenileWarningCount(character);
  const attemptsUsedThisYear = getAttemptsUsedThisYear(character);
  const attemptsRemainingThisYear = getRemainingAttemptsThisYear(character);
  const hasPending = hasPendingCourtCase(character);
  const onProbation = isOnProbation(character);
  const incarcerated = isCurrentlyIncarcerated(character);
  const unpaidFines = getUnpaidFines(character);
  const expungementEligibleIds = new Set(
    getExpungementEligibleRecords(character).map((r) => r.id),
  );
  const activeAdultConvictionCount = getActiveAdultConvictions(character).length;
  const activeJuvenileAdjudicationCount = getJuvenileAdjudications(character).length;

  let statusLabel = 'Clean Record';
  let statusVariant: CrimeDashboardSummary['statusVariant'] = 'emerald';

  if (incarcerated) {
    statusLabel = 'Incarcerated';
    statusVariant = 'rose';
  } else if (hasPending) {
    statusLabel = 'Court Case Pending';
    statusVariant = 'rose';
  } else if (onProbation) {
    statusLabel =
      sanitized.probation?.jurisdiction === 'juvenile'
        ? 'Juvenile Probation'
        : 'Adult Probation';
    statusVariant = 'amber';
  } else if (unpaidFines > 0) {
    statusLabel = 'Unpaid Court Fines';
    statusVariant = 'amber';
  } else if (activeAdultConvictionCount > 0) {
    statusLabel = 'Criminal Record';
    statusVariant = 'amber';
  } else if (sanitized.records.length > 0) {
    statusLabel = 'Record Clear';
    statusVariant = 'sky';
  }

  return {
    policeHeat: sanitized.policeHeat,
    notoriety: sanitized.notoriety,
    formalArrests,
    juvenileWarnings,
    attemptsUsedThisYear,
    attemptsRemainingThisYear,
    maxAttemptsPerYear: MAX_CRIME_ATTEMPTS_PER_YEAR,
    hasPendingCase: hasPending,
    isOnProbation: onProbation,
    isIncarcerated: incarcerated,
    unpaidFines,
    statusLabel,
    statusVariant,
    activeAdultConvictionCount,
    activeJuvenileAdjudicationCount,
    expungementEligibleIds,
  };
}
