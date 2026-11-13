import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Scale, ShieldAlert } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Modal } from '../../../components/ui/Modal';
import type { CharacterProfile } from '../../../types/game';
import { resolveCourtCase } from '../services/crimeService';
import type { DefenseStrategyId, PendingCourtCase } from '../types';
import {
  buildCourtVerdictView,
  formatCrimeMoney,
  formatJurisdictionLabel,
  formatOffenseClassLabel,
  getDefenseStrategyOptions,
  type CourtVerdictView,
} from './crimeDisplay';

interface CourtDefenseModalProps {
  character: CharacterProfile;
  pendingCase: PendingCourtCase | null;
  onUpdateCharacter: (updated: CharacterProfile) => void;
  holdOpenForArrestSummary?: boolean;
}

interface VerdictDisplayState {
  verdict: CourtVerdictView;
  chargeTitle: string;
}

export const CourtDefenseModal: React.FC<CourtDefenseModalProps> = ({
  character,
  pendingCase,
  onUpdateCharacter,
  holdOpenForArrestSummary = false,
}) => {
  const [verdictState, setVerdictState] = useState<VerdictDisplayState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    submitLock.current = false;
  }, [pendingCase?.id, verdictState]);

  const shouldShowModal = Boolean(
    character.isAlive && ((pendingCase && !holdOpenForArrestSummary) || verdictState),
  );

  if (!shouldShowModal) {
    return null;
  }

  const handleSelectStrategy = (strategyId: DefenseStrategyId) => {
    if (!pendingCase || submitLock.current || isSubmitting) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const resolution = resolveCourtCase(character, strategyId);
      if (!resolution.ok) {
        setErrorMessage(resolution.reason || resolution.message);
        submitLock.current = false;
        return;
      }

      const verdictView = buildCourtVerdictView(resolution, pendingCase.jurisdiction);
      onUpdateCharacter(resolution.character);
      setVerdictState({
        verdict: verdictView,
        chargeTitle: pendingCase.title,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueAfterVerdict = () => {
    setVerdictState(null);
    setErrorMessage(null);
    setIsSubmitting(false);
    submitLock.current = false;
  };

  // Phase 2: Verdict presentation after court resolution
  if (verdictState) {
    const { verdict, chargeTitle } = verdictState;
    return (
      <Modal
        isOpen={true}
        title={verdict.title}
        icon={<Scale className="w-5 h-5 text-slate-950" />}
        maxWidth="md"
        actions={
          <CartoonButton
            variant={verdict.outcome === 'imprisoned' ? 'rose' : 'emerald'}
            size="md"
            fullWidth
            onClick={handleContinueAfterVerdict}
          >
            Continue
          </CartoonButton>
        }
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant={verdict.badgeVariant} size="sm">
            {verdict.badgeLabel}
          </Badge>
          <Badge variant="slate" size="xs">
            {verdict.jurisdictionLabel}
          </Badge>
        </div>

        <div className="rounded-2xl border-2 border-slate-900 bg-slate-900 text-white p-3.5 shadow-[2px_2px_0_#0f172a]">
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-300">
            Charge: {chargeTitle}
          </p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-slate-100">
            {verdict.message}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {verdict.releasedPayout > 0 && (
            <div className="rounded-xl border-2 border-emerald-700/40 bg-emerald-50 p-2.5 text-emerald-950">
              <div className="text-[10px] font-black uppercase text-emerald-700">Proceeds Released</div>
              <div className="font-black text-sm">+{formatCrimeMoney(verdict.releasedPayout)}</div>
            </div>
          )}
          {verdict.attorneyFeePaid > 0 && (
            <div className="rounded-xl border-2 border-slate-300 bg-slate-50 p-2.5 text-slate-900">
              <div className="text-[10px] font-black uppercase text-slate-500">Attorney Fee</div>
              <div className="font-black text-sm">-{formatCrimeMoney(verdict.attorneyFeePaid)}</div>
            </div>
          )}
          {verdict.fineImposed > 0 && (
            <div className="rounded-xl border-2 border-amber-700/40 bg-amber-50 p-2.5 text-amber-950">
              <div className="text-[10px] font-black uppercase text-amber-800">Fine Assessed</div>
              <div className="font-black text-sm">
                {formatCrimeMoney(verdict.fineImposed)} (Paid {formatCrimeMoney(verdict.finePaid)})
              </div>
            </div>
          )}
          {verdict.unpaidFineAdded > 0 && (
            <div className="rounded-xl border-2 border-rose-700/40 bg-rose-50 p-2.5 text-rose-950">
              <div className="text-[10px] font-black uppercase text-rose-800">Unpaid Fine Debt</div>
              <div className="font-black text-sm">+{formatCrimeMoney(verdict.unpaidFineAdded)}</div>
            </div>
          )}
          {verdict.probationYears > 0 && (
            <div className="rounded-xl border-2 border-purple-700/40 bg-purple-50 p-2.5 text-purple-950">
              <div className="text-[10px] font-black uppercase text-purple-800">Probation Term</div>
              <div className="font-black text-sm">{verdict.probationYears} year(s)</div>
            </div>
          )}
          {verdict.sentenceYears > 0 && (
            <div className="rounded-xl border-2 border-rose-700/40 bg-rose-50 p-2.5 text-rose-950">
              <div className="text-[10px] font-black uppercase text-rose-800">Prison Sentence</div>
              <div className="font-black text-sm">{verdict.sentenceYears} year(s)</div>
            </div>
          )}
        </div>

        {verdict.employmentTerminated && (
          <div className="rounded-xl border-2 border-rose-700/40 bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-900">
            Civilian employment was terminated upon incarceration.
          </div>
        )}
      </Modal>
    );
  }

  if (!pendingCase) return null;

  const strategyOptions = getDefenseStrategyOptions(pendingCase, character.cash);
  const jurisdictionLabel =
    pendingCase.jurisdiction === 'juvenile' ? 'Juvenile Court' : 'Adult Criminal Court';

  // Phase 1: Non-dismissible Pending Court Case & Defense Strategy selection
  return (
    <Modal
      isOpen={true}
      title="Court Appearance Required"
      icon={<ShieldAlert className="w-5 h-5 text-rose-700" />}
      maxWidth="md"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant={pendingCase.jurisdiction === 'juvenile' ? 'sky' : 'rose'} size="sm">
          {jurisdictionLabel}
        </Badge>
        <Badge variant="amber" size="xs">
          {formatOffenseClassLabel(pendingCase.offenseClass)} • {formatJurisdictionLabel(pendingCase.jurisdiction)}
        </Badge>
      </div>

      {/* Case Docket Card */}
      <div className="rounded-2xl border-2 border-slate-900 bg-slate-900 text-white p-3.5 shadow-[2px_2px_0_#0f172a] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-300">
              Active Criminal Docket
            </p>
            <h4 className="text-base font-black text-white leading-tight">
              {pendingCase.title}
            </h4>
          </div>
          <span className="text-[11px] font-bold text-slate-300 shrink-0">
            Age {pendingCase.arrestedAtAge} ({pendingCase.arrestedAtYear})
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[11px] font-black">
          <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-slate-100">
            Execution: {pendingCase.executionSucceeded ? 'Succeeded' : 'Failed'}
          </span>
          {pendingCase.injured && (
            <span className="rounded-full bg-rose-900/80 border border-rose-500/60 px-2.5 py-0.5 text-rose-100">
              Injured During Incident
            </span>
          )}
          <span className="rounded-full bg-amber-950/90 border border-amber-500/50 px-2.5 py-0.5 text-amber-200">
            Held Proceeds: {formatCrimeMoney(pendingCase.attemptedPayout)}
          </span>
        </div>

        <p className="text-[11px] font-bold text-slate-300 leading-snug">
          {pendingCase.attemptedPayout > 0
            ? 'Detected proceeds are held in court custody. Acquittal or dismissal releases them; conviction forfeits them.'
            : 'Choose a legal defense strategy to resolve this case before continuing.'}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border-2 border-rose-600 bg-rose-50 px-3 py-2 text-xs font-black text-rose-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Defense Strategies */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-600">
          <span>Select Defense Strategy</span>
          <span>Cash: {formatCrimeMoney(character.cash)}</span>
        </div>

        {strategyOptions.map(({ strategy, fee, canAfford, feeLabel }) => (
          <button
            key={strategy.id}
            type="button"
            disabled={!canAfford || isSubmitting}
            onClick={() => handleSelectStrategy(strategy.id)}
            className={`w-full text-left rounded-2xl border-2 p-3 transition-all flex flex-col gap-1 ${
              canAfford && !isSubmitting
                ? 'border-slate-900 bg-white hover:bg-amber-50 shadow-[2px_2px_0_#0f172a] cursor-pointer active:translate-y-0.5'
                : 'border-slate-300 bg-slate-100 opacity-65 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{strategy.icon}</span>
                <span className="text-xs font-black text-slate-950 truncate">
                  {strategy.title}
                </span>
              </div>
              <Badge
                variant={fee === 0 ? 'emerald' : canAfford ? 'amber' : 'rose'}
                size="xs"
              >
                {feeLabel}
              </Badge>
            </div>
            <p className="text-[11px] font-bold text-slate-600 leading-snug">
              {strategy.description}
            </p>
            <div className="flex items-center justify-between text-[10px] font-black text-slate-500 pt-0.5">
              <span>
                {strategy.id === 'public_defender'
                  ? 'Baseline statutory representation'
                  : strategy.id === 'plea_deal'
                    ? 'Lower sentence/fine • Reduces dismissal odds'
                    : 'Stronger dismissal/acquittal defense • Cash fee'}
              </span>
              {canAfford ? (
                <span className="text-emerald-700 inline-flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Select
                </span>
              ) : (
                <span className="text-rose-700">Insufficient Cash</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
};

