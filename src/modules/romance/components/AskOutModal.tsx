import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { DualMeterDisplay } from './DualMeterDisplay';
import type { PersonProfile } from '../../../types/game';

interface AskOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PersonProfile;
  onConfirmAskOut: () => void;
}

export const AskOutModal: React.FC<AskOutModalProps> = ({
  isOpen,
  onClose,
  target,
  onConfirmAskOut,
}) => {
  const rel = target.relationship;
  const romance = target.romanceMeter ?? 0;
  const isEligible = rel >= 50 && romance >= 35;

  let roleLabel = 'Partner';
  if (target.gender === 'female') roleLabel = 'Girlfriend';
  if (target.gender === 'male') roleLabel = 'Boyfriend';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ask Out ${target.firstName}`}
      icon="❤️"
    >
      <div className="flex flex-col gap-3">
        <div className="p-3.5 bg-rose-50 border-2 border-slate-900 rounded-xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-rose-400 border-2 border-slate-900 flex items-center justify-center text-2xl shadow-[1.5px_1.5px_0_#0f172a]">
            ❤️
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-950">
              Ready to confess your feelings?
            </h4>
            <p className="text-[11px] font-semibold text-slate-600">
              Asking {target.firstName} to be your official {roleLabel.toLowerCase()} requires solid trust and romantic chemistry.
            </p>
          </div>
        </div>

        {/* Dual Meter Status */}
        <DualMeterDisplay
          relationship={rel}
          romanceMeter={romance}
          romanceUnlocked={true}
        />

        <div className="text-[11px] font-bold text-slate-600 bg-white border border-slate-300 p-2.5 rounded-lg flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span>Required Relationship:</span>
            <span className={rel >= 50 ? 'text-emerald-700' : 'text-rose-600'}>
              {Math.round(rel)}% / 50% min
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Required Romance:</span>
            <span className={romance >= 35 ? 'text-emerald-700' : 'text-rose-600'}>
              {romance}% / 35% min
            </span>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <CartoonButton variant="slate" size="sm" onClick={onClose}>
            Maybe Later
          </CartoonButton>
          <CartoonButton
            variant="rose"
            size="sm"
            disabled={!isEligible}
            onClick={onConfirmAskOut}
          >
            Ask Out Now! ❤️
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};
