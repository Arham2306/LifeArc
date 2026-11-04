import React from 'react';
import { Heart, ShieldCheck } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import type { PersonProfile } from '../../../types/game';

interface IntimacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PersonProfile;
  onSelectProtection: (protection: 'unprotected' | 'pill' | 'condom') => void;
}

export const IntimacyModal: React.FC<IntimacyModalProps> = ({
  isOpen,
  onClose,
  target,
  onSelectProtection,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Make Love with ${target.firstName}`}
      icon="💋"
    >
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-semibold text-slate-500">
          Choose your protection and intimacy preference:
        </span>

        {/* Intimacy Options */}
        <button
          type="button"
          onClick={() => onSelectProtection('unprotected')}
          className="text-left p-3.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-rose-50 transition-all shadow-[1.5px_1.5px_0_#0f172a] hover:translate-x-0.5 hover:-translate-y-0.5 cursor-pointer flex flex-col gap-1 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-950 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              Unprotected / Passionate Intimacy
            </span>
            <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
              Conception Risk
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-600">
            Completely natural, raw passion. If biologically fertile, there is a natural probability of pregnancy!
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelectProtection('pill')}
          className="text-left p-3.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-emerald-50 transition-all shadow-[1.5px_1.5px_0_#0f172a] hover:translate-x-0.5 hover:-translate-y-0.5 cursor-pointer flex flex-col gap-1 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-950 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              Birth Control Pill
            </span>
            <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              99% Protected
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-600">
            Enjoy full intimacy with dependable hormonal birth control protection.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelectProtection('condom')}
          className="text-left p-3.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-sky-50 transition-all shadow-[1.5px_1.5px_0_#0f172a] hover:translate-x-0.5 hover:-translate-y-0.5 cursor-pointer flex flex-col gap-1 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-950 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" />
              Safe Protection (Barrier)
            </span>
            <span className="text-[10px] font-black text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-300">
              98% Protected
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-600">
            Safe physical barrier contraception with virtually zero pregnancy risk.
          </p>
        </button>

        <div className="pt-2 flex justify-end">
          <CartoonButton variant="slate" size="sm" onClick={onClose}>
            Cancel
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};
