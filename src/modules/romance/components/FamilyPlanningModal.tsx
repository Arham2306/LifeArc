import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import type { PersonProfile } from '../../../types/game';

interface FamilyPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PersonProfile;
  playerCash: number;
  onTryNatural: () => void;
  onTryIVF: () => void;
  onAdopt: (ageGroup: 'infant' | 'toddler' | 'child') => void;
}

export const FamilyPlanningModal: React.FC<FamilyPlanningModalProps> = ({
  isOpen,
  onClose,
  target,
  playerCash,
  onTryNatural,
  onTryIVF,
  onAdopt,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Family Planning & Children"
      icon="👶"
    >
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-semibold text-slate-500">
          Explore paths to starting or growing your family with {target.firstName}:
        </span>

        {/* Natural Conception */}
        <button
          type="button"
          onClick={onTryNatural}
          className="text-left p-3.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-rose-50 transition-all shadow-[1.5px_1.5px_0_#0f172a] hover:translate-x-0.5 hover:-translate-y-0.5 cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-400 border-2 border-slate-900 flex items-center justify-center text-xl shadow-[1px_1px_0_#0f172a]">
              👶
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 group-hover:text-rose-950 block">
                Try for a Baby Naturally
              </span>
              <span className="text-[11px] font-semibold text-slate-600 block">
                Unprotected intimacy with your partner. Subject to natural fertility age curve.
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-emerald-700 font-mono">Free</span>
        </button>

        {/* Fertility Clinic (IVF) */}
        <button
          type="button"
          disabled={playerCash < 15000}
          onClick={onTryIVF}
          className={`text-left p-3.5 rounded-xl border-2 border-slate-900 transition-all shadow-[1.5px_1.5px_0_#0f172a] flex items-center justify-between ${
            playerCash >= 15000
              ? 'bg-white hover:bg-sky-50 cursor-pointer hover:translate-x-0.5 hover:-translate-y-0.5'
              : 'bg-slate-100 opacity-60 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-400 border-2 border-slate-900 flex items-center justify-center text-xl shadow-[1px_1px_0_#0f172a]">
              🔬
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 block">
                Fertility Clinic (IVF Treatment)
              </span>
              <span className="text-[11px] font-semibold text-slate-600 block">
                Medical reproductive technology with a 65% successful implantation rate.
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-emerald-700 font-mono">$15,000</span>
        </button>

        {/* Adoption Agency */}
        <div className="p-3.5 rounded-xl border-2 border-slate-900 bg-white shadow-[1.5px_1.5px_0_#0f172a] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏠</span>
              <div>
                <span className="text-xs font-black text-slate-900 block">
                  Licensed Adoption Agency
                </span>
                <span className="text-[11px] font-semibold text-slate-600 block">
                  Provide a loving home to a child in need ($6,000 agency fee).
                </span>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-700 font-mono">$6,000</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <CartoonButton
              variant="white"
              size="sm"
              disabled={playerCash < 6000}
              onClick={() => onAdopt('infant')}
            >
              Adopt Infant
            </CartoonButton>
            <CartoonButton
              variant="white"
              size="sm"
              disabled={playerCash < 6000}
              onClick={() => onAdopt('toddler')}
            >
              Adopt Toddler
            </CartoonButton>
            <CartoonButton
              variant="white"
              size="sm"
              disabled={playerCash < 6000}
              onClick={() => onAdopt('child')}
            >
              Adopt Child
            </CartoonButton>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <CartoonButton variant="slate" size="sm" onClick={onClose}>
            Close
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};
