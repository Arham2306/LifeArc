import React from 'react'
import { Modal } from '../../../components/ui/Modal'
import { CartoonButton } from '../../../components/ui/CartoonButton'
import { StatDeltaChips } from '../../../components/ui/StatDeltaChips'
import type { ActionOutcomeNotice } from '../types'

interface ActionOutcomeModalProps {
  outcome: ActionOutcomeNotice | null;
  onClose: () => void;
}

export const ActionOutcomeModal: React.FC<ActionOutcomeModalProps> = ({
  outcome,
  onClose,
}) => {
  if (!outcome) return null;

  return (
    <Modal
      isOpen={!!outcome}
      onClose={onClose}
      title={outcome.title}
      icon={outcome.icon}
      actions={
        <CartoonButton variant="emerald" size="md" fullWidth onClick={onClose}>
          Awesome, Continue
        </CartoonButton>
      }
    >
      {outcome.subtitle && (
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
          {outcome.subtitle}
        </p>
      )}

      <div className="rounded-2xl border-2 border-slate-900 bg-amber-50/70 p-3.5 shadow-[1.5px_2px_0_#0f172a]">
        <p className="text-xs font-bold text-slate-800 leading-relaxed">
          {outcome.message}
        </p>
      </div>

      <div className="pt-1 flex flex-col gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          Stat Changes
        </span>
        <StatDeltaChips effects={outcome.appliedEffects} />
      </div>
    </Modal>
  );
};

