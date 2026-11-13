import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  DollarSign,
  Gavel,
  Lock,
  Scale,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { ActionOutcomeModal, type CustomStatDelta } from '../../../components/ui/ActionOutcomeModal';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Modal } from '../../../components/ui/Modal';
import type { CharacterProfile, StatEffects } from '../../../types/game';
import {
  attemptCrime,
  expungeAdultRecord,
  payUnpaidFines,
} from '../services/crimeService';
import { getSanitizedCrimeState } from '../services/crimeSelectors';
import { MAX_PRISON_ACTIONS_PER_YEAR, performPrisonAction } from '../services/prisonService';
import type { CrimeRecordEntry, PrisonActionId } from '../types';
import {
  buildAttemptResultView,
  buildCrimeDashboardSummary,
  classifyCrimeRecord,
  formatCrimeMoney,
  getCrimeCatalogPreviews,
  getPrisonActionViews,
  type CrimePreviewItem,
} from './crimeDisplay';

interface CrimeScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (updated: CharacterProfile) => void;
  onBackToMenu: () => void;
  onArrestSummaryVisibilityChange?: (isVisible: boolean) => void;
}

type HistoryFilter = 'all' | 'active_adult' | 'juvenile' | 'cleared';

interface OutcomeState {
  title: string;
  subtitle?: string;
  message: string;
  statEffects?: StatEffects;
  customDeltas?: CustomStatDelta[];
  alertCallout?: {
    title: string;
    message: string;
    variant?: 'amber' | 'rose' | 'emerald';
  };
  continueLabel?: string;
  continueVariant?: 'emerald' | 'amber' | 'rose' | 'slate';
  isArrestHandoff?: boolean;
}

export const CrimeScreen: React.FC<CrimeScreenProps> = ({
  character,
  onUpdateCharacter,
  onBackToMenu,
  onArrestSummaryVisibilityChange,
}) => {
  const [selectedCrime, setSelectedCrime] = useState<CrimePreviewItem | null>(null);
  const [outcomeModal, setOutcomeModal] = useState<OutcomeState | null>(null);
  const [fineInput, setFineInput] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [screenError, setScreenError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const actionLock = useRef(false);

  useEffect(() => {
    actionLock.current = false;
  }, [character]);

  useEffect(() => {
    return () => {
      onArrestSummaryVisibilityChange?.(false);
    };
  }, [onArrestSummaryVisibilityChange]);

  const crimeState = getSanitizedCrimeState(character);
  const summary = buildCrimeDashboardSummary(character);
  const catalogPreviews = getCrimeCatalogPreviews(character);
  const walletCash = Math.max(0, Math.floor(Number.isFinite(character.cash) ? character.cash : 0));

  const parsedCustomFine = Number.parseInt(fineInput, 10);
  const plannedFinePayment =
    summary.unpaidFines <= 0 || walletCash <= 0
      ? 0
      : Number.isFinite(parsedCustomFine) && parsedCustomFine > 0
        ? Math.min(summary.unpaidFines, walletCash, parsedCustomFine)
        : Math.min(summary.unpaidFines, walletCash);
  const remainingFineAfterPay = Math.max(0, summary.unpaidFines - plannedFinePayment);

  const handleConfirmCrimeAttempt = () => {
    if (!selectedCrime || actionLock.current || isProcessing) return;
    actionLock.current = true;
    setIsProcessing(true);
    setScreenError(null);

    const result = attemptCrime(character, selectedCrime.template.id);
    setSelectedCrime(null);

    if (!result.ok) {
      setScreenError(result.reason || result.message);
      actionLock.current = false;
      setIsProcessing(false);
      return;
    }

    const view = buildAttemptResultView(result);
    if (view.requiresCourt) {
      onArrestSummaryVisibilityChange?.(true);
    }
    onUpdateCharacter(result.character);

    const customDeltas: CustomStatDelta[] = [
      {
        label: 'Outcome',
        delta: view.badgeLabel,
        color: view.badgeVariant === 'emerald' ? 'emerald' : view.badgeVariant === 'amber' ? 'amber' : 'rose',
      },
    ];
    if (view.requiresCourt && view.heldProceeds > 0) {
      customDeltas.push({
        label: 'Held Proceeds',
        delta: `${formatCrimeMoney(view.heldProceeds)} (Held)`,
        color: 'amber',
      });
    }

    setOutcomeModal({
      title: view.title,
      subtitle: view.subtitle,
      message: view.message,
      statEffects: view.statEffects,
      customDeltas,
      alertCallout: view.requiresCourt
        ? {
            title: 'Court Hearing Pending',
            message:
              'You must face the court and select a defense strategy before continuing.',
            variant: 'rose',
          }
        : undefined,
      continueLabel: view.requiresCourt ? 'Proceed to Court' : 'Continue',
      continueVariant: view.requiresCourt ? 'rose' : 'emerald',
      isArrestHandoff: view.requiresCourt,
    });
    setIsProcessing(false);
  };

  const handlePrisonAction = (actionId: PrisonActionId) => {
    if (actionLock.current || isProcessing) return;
    actionLock.current = true;
    setIsProcessing(true);
    setScreenError(null);

    const result = performPrisonAction(character, actionId);
    if (!result.ok) {
      setScreenError(result.reason || result.message);
      actionLock.current = false;
      setIsProcessing(false);
      return;
    }

    onUpdateCharacter(result.character);

    const customDeltas: CustomStatDelta[] = [];
    if (result.cashEarned > 0) {
      customDeltas.push({
        label: 'Commissary Pay',
        delta: `+${formatCrimeMoney(result.cashEarned)}`,
        color: 'emerald',
      });
    }
    if (result.behaviorDelta !== 0) {
      customDeltas.push({
        label: 'Behavior',
        delta: `${result.behaviorDelta > 0 ? '+' : ''}${result.behaviorDelta}`,
        color: result.behaviorDelta > 0 ? 'emerald' : 'rose',
      });
    }
    if (result.sentenceReductionYears > 0) {
      customDeltas.push({
        label: 'Sentence',
        delta: `-${result.sentenceReductionYears} yr`,
        color: 'sky',
      });
    }
    if (result.released) {
      customDeltas.push({
        label: 'Status',
        delta: `Released (${result.character.occupation})`,
        color: 'emerald',
      });
    }

    setOutcomeModal({
      title: result.released ? 'Released From Prison!' : 'Prison Action Complete',
      subtitle: result.released
        ? `Occupation Restored: ${result.character.occupation}`
        : crimeState.prison?.facilityName,
      message: result.message,
      customDeltas,
      continueVariant: result.released ? 'emerald' : 'slate',
    });
    setIsProcessing(false);
  };

  const handlePayFines = () => {
    if (actionLock.current || isProcessing) return;
    actionLock.current = true;
    setIsProcessing(true);
    setScreenError(null);

    const amountArg =
      Number.isFinite(parsedCustomFine) && parsedCustomFine > 0 ? parsedCustomFine : undefined;
    const result = payUnpaidFines(character, amountArg);

    if (!result.ok) {
      setScreenError(result.reason || result.message);
      actionLock.current = false;
      setIsProcessing(false);
      return;
    }

    setFineInput('');
    onUpdateCharacter(result.character);
    setOutcomeModal({
      title: 'Court Fine Payment',
      message: result.message,
      customDeltas: [
        {
          label: 'Paid (Cash)',
          delta: `-${formatCrimeMoney(result.paidAmount)}`,
          color: 'emerald',
        },
        {
          label: 'Remaining Debt',
          delta: formatCrimeMoney(result.remainingUnpaidFines),
          color: result.remainingUnpaidFines === 0 ? 'emerald' : 'amber',
        },
      ],
      continueVariant: 'emerald',
    });
    setIsProcessing(false);
  };

  const handlePetitionExpungement = (entry: CrimeRecordEntry) => {
    if (actionLock.current || isProcessing) return;
    actionLock.current = true;
    setIsProcessing(true);
    setScreenError(null);

    const result = expungeAdultRecord(character, entry.id);
    if (!result.ok) {
      setScreenError(result.reason || result.message);
      actionLock.current = false;
      setIsProcessing(false);
      return;
    }

    onUpdateCharacter(result.character);
    setOutcomeModal({
      title: 'Adult Record Expunged',
      message: result.message,
      statEffects: { happiness: 5 },
      customDeltas: [
        { label: 'Record', delta: `${entry.title} • Expunged`, color: 'emerald' },
      ],
      continueVariant: 'emerald',
    });
    setIsProcessing(false);
  };

  const handleCloseOutcomeModal = () => {
    const handoff = Boolean(outcomeModal?.isArrestHandoff);
    setOutcomeModal(null);
    if (handoff) {
      onArrestSummaryVisibilityChange?.(false);
    }
  };

  const classifiedRecords = [...crimeState.records]
    .reverse()
    .map((entry) => classifyCrimeRecord(entry, summary.expungementEligibleIds));

  const visibleRecords = classifiedRecords.filter((item) => {
    if (historyFilter === 'active_adult') return item.isActiveConviction;
    if (historyFilter === 'juvenile') return item.entry.jurisdiction === 'juvenile';
    if (historyFilter === 'cleared') {
      return (
        item.isCleared ||
        item.entry.outcome === 'dismissed' ||
        item.entry.outcome === 'acquitted'
      );
    }
    return true;
  });

  const prison = crimeState.prison;
  const prisonActionsUsed = prison && prison.lastActionAge === character.age ? prison.actionsTakenThisYear : 0;
  const prisonActions = prison ? getPrisonActionViews(character, prison) : [];

  return (
    <div className="p-3.5 flex flex-col gap-3.5 bg-white">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToMenu}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-white px-2.5 py-1.5 text-xs font-black text-slate-900 shadow-[1.5px_1.5px_0_#0f172a] hover:bg-slate-50 active:translate-y-0.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
          <span>Menu</span>
        </button>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Badge variant="emerald" size="xs">
            Cash {formatCrimeMoney(walletCash)}
          </Badge>
          <Badge
            variant={summary.attemptsRemainingThisYear > 0 ? 'amber' : 'slate'}
            size="xs"
          >
            {summary.attemptsRemainingThisYear}/{summary.maxAttemptsPerYear} Left
          </Badge>
        </div>
      </div>

      {/* Crime Dashboard */}
      <section className="rounded-2xl border-[2.5px] border-slate-950 bg-slate-900 text-white p-3.5 shadow-[2.5px_3px_0_#0f172a] space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-500 border-2 border-slate-950 flex items-center justify-center shadow-[1.5px_1.5px_0_#020617] shrink-0">
              <ShieldAlert className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white leading-tight truncate">
                Crime & High Stakes
              </h2>
              <p className="text-[11px] font-bold text-slate-300">
                {character.age < 18 ? 'Juvenile Jurisdiction (<18)' : 'Adult Jurisdiction (18+)'}
              </p>
            </div>
          </div>
          <Badge variant={summary.statusVariant} size="xs">
            {summary.statusLabel}
          </Badge>
        </div>

        {/* Heat & Notoriety Meters */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-slate-800/90 border border-slate-700 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-300">
              <span>Police Heat</span>
              <span className="text-rose-300">{summary.policeHeat}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all"
                style={{ width: `${summary.policeHeat}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/90 border border-slate-700 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-300">
              <span>Notoriety</span>
              <span className="text-amber-300">{summary.notoriety}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${summary.notoriety}%` }}
              />
            </div>
          </div>
        </div>

        {/* Record Metrics (Formal Arrests & Juvenile Warnings strictly separate) */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-800/70 border border-slate-700 px-2 py-1.5">
            <div className="text-[10px] font-black uppercase text-slate-400">Formal Arrests</div>
            <div className="text-sm font-black text-white">{summary.formalArrests}</div>
          </div>
          <div className="rounded-xl bg-slate-800/70 border border-slate-700 px-2 py-1.5">
            <div className="text-[10px] font-black uppercase text-slate-400">Juv. Warnings</div>
            <div className="text-sm font-black text-amber-300">{summary.juvenileWarnings}</div>
          </div>
          <div className="rounded-xl bg-slate-800/70 border border-slate-700 px-2 py-1.5">
            <div className="text-[10px] font-black uppercase text-slate-400">Unpaid Fines</div>
            <div className="text-sm font-black text-rose-300">
              {formatCrimeMoney(summary.unpaidFines)}
            </div>
          </div>
        </div>
      </section>

      {screenError && (
        <div className="rounded-xl border-2 border-rose-700 bg-rose-50 px-3 py-2 text-xs font-black text-rose-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{screenError}</span>
        </div>
      )}

      {/* Pending Court Case Banner */}
      {summary.hasPendingCase && crimeState.pendingCase && (
        <section className="rounded-2xl border-2 border-rose-700 bg-rose-50 p-3 shadow-[2px_2px_0_#881337] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-black text-rose-950 flex items-center gap-1.5">
              <Gavel className="w-4 h-4 shrink-0 text-rose-700" />
              <span className="truncate">Pending Case: {crimeState.pendingCase.title}</span>
            </div>
            <p className="text-[11px] font-bold text-rose-800">
              Held Proceeds: {formatCrimeMoney(crimeState.pendingCase.attemptedPayout)} • Resolve court hearing to continue.
            </p>
          </div>
          <CartoonButton
            variant="rose"
            size="sm"
            onClick={() => onArrestSummaryVisibilityChange?.(false)}
          >
            Enter Court
          </CartoonButton>
        </section>
      )}

      {/* Dedicated Prison Interface when incarcerated */}
      {summary.isIncarcerated && prison && (
        <section className="rounded-2xl border-[2.5px] border-slate-950 bg-slate-100 p-3.5 shadow-[2px_2.5px_0_#0f172a] space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">
                Incarcerated • Institutional Custody
              </span>
              <h3 className="text-sm font-black text-slate-950 leading-tight">
                {prison.facilityName}
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                Conviction: {prison.chargeTitle}
              </p>
            </div>
            <Badge variant="rose" size="xs">
              {prison.securityLevel.toUpperCase()} SECURITY
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border-2 border-slate-900 bg-white p-2">
              <div className="text-[10px] font-black uppercase text-slate-500">Served</div>
              <div className="font-black text-slate-950">
                {prison.yearsServed} / {prison.yearsTotal}y
              </div>
            </div>
            <div className="rounded-xl border-2 border-slate-900 bg-white p-2">
              <div className="text-[10px] font-black uppercase text-slate-500">Remaining</div>
              <div className="font-black text-rose-700">{prison.yearsRemaining}y</div>
            </div>
            <div className="rounded-xl border-2 border-slate-900 bg-white p-2">
              <div className="text-[10px] font-black uppercase text-slate-500">Behavior</div>
              <div className="font-black text-emerald-700">{prison.behaviorScore}/100</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-black text-slate-700 px-0.5">
            <span>
              Parole Eligibility:{' '}
              {prison.yearsServed >= prison.paroleEligibleAtServed
                ? 'Eligible Now'
                : `Unlocks at ${prison.paroleEligibleAtServed} yr served`}
            </span>
            <span>
              Annual Action: {prisonActionsUsed}/{MAX_PRISON_ACTIONS_PER_YEAR} used
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prisonActions.map((act) => (
              <button
                key={act.actionId}
                type="button"
                disabled={!act.available || isProcessing}
                onClick={() => handlePrisonAction(act.actionId)}
                className={`text-left rounded-xl border-2 p-2.5 transition-all flex flex-col gap-1 ${
                  act.available && !isProcessing
                    ? 'border-slate-900 bg-white hover:bg-amber-50 shadow-[1.5px_2px_0_#0f172a] cursor-pointer active:translate-y-0.5'
                    : 'border-slate-300 bg-slate-200/70 opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-black text-slate-950 inline-flex items-center gap-1.5">
                    <span>{act.icon}</span>
                    <span>{act.label}</span>
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-600 leading-snug">
                  {act.description}
                </p>
                <p className="text-[10px] font-black text-slate-800">
                  {act.available ? act.effectSummary : act.blockedReason}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Probation & Adult Unpaid Fine Management */}
      {(summary.isOnProbation || summary.unpaidFines > 0) && (
        <section className="space-y-2.5">
          {summary.isOnProbation && crimeState.probation && (
            <div className="rounded-2xl border-2 border-slate-900 bg-amber-50 p-3 shadow-[2px_2px_0_#0f172a] space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-950 inline-flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-700" />
                  Active Probation: {crimeState.probation.chargeTitle}
                </span>
                <Badge
                  variant={crimeState.probation.jurisdiction === 'juvenile' ? 'sky' : 'amber'}
                  size="xs"
                >
                  {crimeState.probation.jurisdiction === 'juvenile'
                    ? 'Juvenile Probation'
                    : 'Adult Probation'}
                </Badge>
              </div>
              <p className="text-[11px] font-bold text-amber-950">
                {crimeState.probation.yearsRemaining} year(s) remaining • Active supervision (decrements each Age Up).
              </p>
            </div>
          )}

          {summary.unpaidFines > 0 && (
            <div className="rounded-2xl border-2 border-slate-900 bg-rose-50/70 p-3 shadow-[2px_2px_0_#0f172a] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-950 inline-flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-rose-700" />
                  Adult Unpaid Court Fines
                </span>
                <Badge variant="rose" size="xs">
                  Owed: {formatCrimeMoney(summary.unpaidFines)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-700">
                <div className="rounded-xl bg-white border border-slate-300 px-2 py-1.5">
                  <div className="text-[9px] font-black uppercase text-slate-500">Wallet Cash</div>
                  <div className="font-black text-slate-950">{formatCrimeMoney(walletCash)}</div>
                </div>
                <div className="rounded-xl bg-white border border-slate-300 px-2 py-1.5">
                  <div className="text-[9px] font-black uppercase text-slate-500">Pay Now</div>
                  <div className="font-black text-emerald-700">
                    {formatCrimeMoney(plannedFinePayment)}
                  </div>
                </div>
                <div className="rounded-xl bg-white border border-slate-300 px-2 py-1.5">
                  <div className="text-[9px] font-black uppercase text-slate-500">Remaining</div>
                  <div className="font-black text-rose-700">
                    {formatCrimeMoney(remainingFineAfterPay)}
                  </div>
                </div>
              </div>

              <p className="text-[10px] font-bold text-slate-600">
                Cash-only payment (bank balance stays untouched). Remaining unpaid fines are also garnished up to 25% of incoming annual income on Age Up.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={Math.min(walletCash, summary.unpaidFines)}
                  value={fineInput}
                  onChange={(e) => setFineInput(e.target.value)}
                  placeholder={`Amount (up to ${formatCrimeMoney(Math.min(walletCash, summary.unpaidFines))})`}
                  className="flex-1 min-w-0 rounded-xl border-2 border-slate-900 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                />
                <CartoonButton
                  variant="emerald"
                  size="sm"
                  disabled={plannedFinePayment <= 0 || isProcessing}
                  onClick={handlePayFines}
                >
                  Pay Fines
                </CartoonButton>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Available Crimes Catalog (all 8 crimes) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Criminal Opportunities ({catalogPreviews.length})
          </h3>
          <span className="text-[11px] font-bold text-slate-500">
            {summary.attemptsRemainingThisYear} attempts left this year
          </span>
        </div>

        <div className="space-y-2">
          {catalogPreviews.map((item) => {
            const { template, eligibility, eligibilityCategory } = item;
            const lockedBadge =
              eligibilityCategory === 'age_restricted'
                ? `Age ${template.minAge}+`
                : eligibilityCategory === 'incarcerated'
                  ? 'In Prison'
                  : eligibilityCategory === 'pending_case'
                    ? 'Court Pending'
                    : eligibilityCategory === 'annual_limit'
                      ? 'Limit Reached'
                      : null;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setScreenError(null);
                  setSelectedCrime(item);
                }}
                className={`w-full text-left rounded-2xl border-2 p-3 transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                  eligibility.eligible
                    ? 'border-slate-900 bg-white hover:bg-amber-50/70 shadow-[2px_2px_0_#0f172a] active:translate-y-0.5'
                    : 'border-slate-300 bg-slate-50 opacity-85 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-slate-100 flex items-center justify-center text-xl shrink-0">
                    {template.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-slate-950 truncate">
                        {template.title}
                      </span>
                      <Badge
                        variant={template.adultOffenseClass === 'felony' ? 'rose' : 'amber'}
                        size="xs"
                      >
                        {item.offenseClassLabel}
                      </Badge>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 truncate">
                      {item.payoutRangeLabel} • Success {item.executionPct}% • Detect {item.detectionPct}%
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {lockedBadge ? (
                    <Badge variant="slate" size="xs" icon={<Lock className="w-3 h-3" />}>
                      {lockedBadge}
                    </Badge>
                  ) : (
                    <Badge variant="emerald" size="xs">
                      Available
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Criminal History & Adult Expungement */}
      <section className="space-y-2 pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap px-0.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Criminal Record History ({classifiedRecords.length})
          </h3>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              ['all', 'All'],
              ['active_adult', 'Active Adult'],
              ['juvenile', 'Juvenile'],
              ['cleared', 'Cleared'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setHistoryFilter(id)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-black border-2 cursor-pointer transition-colors ${
                historyFilter === id
                  ? 'border-slate-900 bg-slate-900 text-amber-300'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {visibleRecords.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs font-bold text-slate-500">
            No matching criminal records.
          </div>
        ) : (
          <div className="space-y-2">
            {visibleRecords.map((item) => {
              const { entry } = item;
              return (
                <div
                  key={entry.id}
                  className="rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-[1.5px_2px_0_#0f172a] space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-950 truncate">
                        {entry.title}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        Age {entry.age} ({entry.year}) • {item.jurisdictionLabel}{' '}
                        {entry.offenseClass === 'felony' ? 'Felony' : 'Misdemeanor'}
                      </div>
                    </div>
                    <Badge variant={item.badgeVariant} size="xs">
                      {item.badgeLabel}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-600 flex-wrap">
                    <span>
                      {entry.outcome === 'warned'
                        ? 'Informal juvenile warning (does not count as formal arrest)'
                        : item.isClearedJuvenile
                          ? 'Sealed juvenile record (hidden from adult background checks)'
                          : item.isClearedAdult
                            ? 'Expunged adult record (cleared from active convictions)'
                            : `Retained payout: ${formatCrimeMoney(entry.payout)} • Fine: ${formatCrimeMoney(entry.fineImposed)}`}
                    </span>

                    {item.canPetitionExpungement && (
                      <CartoonButton
                        variant="emerald"
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handlePetitionExpungement(entry)}
                        icon={<ShieldCheck className="w-3.5 h-3.5" />}
                      >
                        Expunge Record
                      </CartoonButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Crime Detail & Confirmation Modal */}
      {selectedCrime && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCrime(null)}
          title={selectedCrime.template.title}
          icon={<span className="text-xl">{selectedCrime.template.icon}</span>}
          maxWidth="md"
          actions={
            <>
              <CartoonButton
                variant="rose"
                size="md"
                fullWidth
                disabled={!selectedCrime.eligibility.eligible || isProcessing}
                onClick={handleConfirmCrimeAttempt}
              >
                {selectedCrime.eligibility.eligible ? 'Confirm Crime Attempt' : 'Attempt Unavailable'}
              </CartoonButton>
              <CartoonButton
                variant="white"
                size="sm"
                fullWidth
                onClick={() => setSelectedCrime(null)}
              >
                Cancel
              </CartoonButton>
            </>
          }
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge
              variant={selectedCrime.template.adultOffenseClass === 'felony' ? 'rose' : 'amber'}
              size="xs"
            >
              {selectedCrime.offenseClassLabel}
            </Badge>
            <Badge variant={selectedCrime.jurisdiction === 'juvenile' ? 'sky' : 'slate'} size="xs">
              {selectedCrime.jurisdiction === 'juvenile' ? 'Juvenile Court' : 'Adult Court'} • Min Age{' '}
              {selectedCrime.template.minAge}
            </Badge>
          </div>

          <p className="text-xs font-bold text-slate-700 leading-relaxed">
            {selectedCrime.template.description}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border-2 border-slate-900 bg-emerald-50 p-2.5">
              <div className="text-[10px] font-black uppercase text-emerald-800">Potential Payout</div>
              <div className="font-black text-emerald-950">{selectedCrime.payoutRangeLabel}</div>
            </div>
            <div className="rounded-xl border-2 border-slate-900 bg-sky-50 p-2.5">
              <div className="text-[10px] font-black uppercase text-sky-800">Execution Odds</div>
              <div className="font-black text-sky-950">{selectedCrime.executionPct}%</div>
            </div>
            <div className="rounded-xl border-2 border-slate-900 bg-amber-50 p-2.5">
              <div className="text-[10px] font-black uppercase text-amber-800">Detection Risk</div>
              <div className="font-black text-amber-950">{selectedCrime.detectionPct}%</div>
            </div>
            <div className="rounded-xl border-2 border-slate-900 bg-rose-50 p-2.5">
              <div className="text-[10px] font-black uppercase text-rose-800">Injury Risk</div>
              <div className="font-black text-rose-950">
                {selectedCrime.injuryPct > 0
                  ? `${selectedCrime.injuryPct}% (-${selectedCrime.template.injuryHealthLossMin}–${selectedCrime.template.injuryHealthLossMax} HP)`
                  : '0% (Non-Physical)'}
              </div>
            </div>
          </div>

          {!selectedCrime.eligibility.eligible && (
            <div className="rounded-xl border-2 border-rose-600 bg-rose-50 px-3 py-2 text-xs font-black text-rose-900 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{selectedCrime.eligibility.reason}</span>
            </div>
          )}
        </Modal>
      )}

      {/* Action Outcome Modal */}
      {outcomeModal && (
        <ActionOutcomeModal
          isOpen={true}
          onClose={handleCloseOutcomeModal}
          title={outcomeModal.title}
          subtitle={outcomeModal.subtitle}
          message={outcomeModal.message}
          statEffects={outcomeModal.statEffects}
          customDeltas={outcomeModal.customDeltas}
          alertCallout={outcomeModal.alertCallout}
          continueLabel={outcomeModal.continueLabel}
          continueVariant={outcomeModal.continueVariant}
        />
      )}
    </div>
  );
};
