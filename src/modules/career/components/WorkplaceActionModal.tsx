import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { StatDeltaChips } from '../../../components/ui/StatDeltaChips';
import type { WorkplaceActionOutcome } from '../types';
import { GraduationCap } from 'lucide-react';

interface WorkplaceActionModalProps {
  outcome: WorkplaceActionOutcome | null;
  onClose: () => void;
  onOpenSchoolTab?: () => void;
}

export const WorkplaceActionModal: React.FC<WorkplaceActionModalProps> = ({
  outcome,
  onClose,
  onOpenSchoolTab,
}) => {
  if (!outcome) return null;

  return (
    <Modal
      isOpen={Boolean(outcome)}
      onClose={onClose}
      title={outcome.title}
      icon={outcome.icon}
      actions={
        <>
          {outcome.missingDegreeRequirement && onOpenSchoolTab && (
            <CartoonButton
              variant="purple"
              size="md"
              fullWidth
              onClick={() => {
                onClose();
                onOpenSchoolTab();
              }}
              icon={<GraduationCap className="w-4 h-4 stroke-[2.5]" />}
            >
              Enroll in Higher Education
            </CartoonButton>
          )}
          <CartoonButton
            variant={outcome.isSuccess ? 'emerald' : 'slate'}
            size="md"
            fullWidth
            onClick={onClose}
          >
            Continue
          </CartoonButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {/* Subtitle Banner */}
        <div className="rounded-xl bg-slate-100 border border-slate-300 px-3 py-1.5 flex items-center justify-between text-xs font-black text-slate-700">
          <span>{outcome.subtitle}</span>
          {outcome.newSalary && (
            <span className="font-mono text-emerald-700">
              ${outcome.newSalary.toLocaleString()} / year
            </span>
          )}
        </div>

        {/* Narrative Message */}
        <p className="text-xs font-extrabold text-slate-800 leading-relaxed">
          {outcome.message}
        </p>

        {/* Missing Degree Alert Callout */}
        {outcome.missingDegreeRequirement && (
          <div className="rounded-2xl border-2 border-amber-800/40 bg-amber-50 p-3 flex flex-col gap-1.5 shadow-[1.5px_2px_0_#0f172a]">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
              <GraduationCap className="w-4 h-4 text-amber-800 stroke-[2.5]" />
              <span>Degree Gate Locked</span>
            </div>
            <p className="text-[11px] font-bold text-amber-900 leading-snug">
              To unlock this promotion, complete a{' '}
              <strong>{outcome.missingDegreeRequirement}</strong> at
              University or Professional School.
            </p>
          </div>
        )}

        {/* Applied Stat Deltas */}
        {Object.keys(outcome.appliedEffects).length > 0 && (
          <div className="pt-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-0.5">
              Workplace Stat Changes:
            </span>
            <StatDeltaChips effects={outcome.appliedEffects} />
          </div>
        )}
      </div>
    </Modal>
  );
};

