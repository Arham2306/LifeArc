import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import type { PersonProfile } from '../../../types/game';

interface DivorceModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PersonProfile;
  playerCash: number;
  onConfirmDivorce: (attorneyTier: 'public' | 'standard' | 'high_powered') => void;
}

export const DivorceModal: React.FC<DivorceModalProps> = ({
  isOpen,
  onClose,
  target,
  playerCash,
  onConfirmDivorce,
}) => {
  const [attorneyTier, setAttorneyTier] = useState<'public' | 'standard' | 'high_powered'>('standard');
  const hasPrenup = target.partnerStats?.hasPrenup ?? false;

  const attorneyFee = attorneyTier === 'public' ? 300 : attorneyTier === 'standard' ? 1500 : 12000;
  const canAfford = playerCash >= attorneyFee;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`File for Divorce from ${target.firstName}`}
      icon="💔"
    >
      <div className="flex flex-col gap-3.5">
        {/* Prenup Alert */}
        {hasPrenup ? (
          <div className="p-3 bg-emerald-50 border-2 border-emerald-600 rounded-xl flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-[11px] font-bold text-emerald-950">
              <span className="font-black block">Active Prenuptial Agreement Found</span>
              Your liquid savings and individual property are protected under law.
            </div>
          </div>
        ) : (
          <div className="p-3 bg-rose-50 border-2 border-rose-600 rounded-xl flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-[11px] font-bold text-rose-950">
              <span className="font-black block">No Prenuptial Agreement</span>
              Marital property may be divided approximately 50/50 by the court.
            </div>
          </div>
        )}

        {/* Attorney Selection */}
        <div>
          <label className="text-xs font-black text-slate-900 mb-1.5 block">
            Select Legal Representation
          </label>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setAttorneyTier('public')}
              className={`text-left p-2.5 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                attorneyTier === 'public'
                  ? 'border-rose-500 bg-rose-50/80 shadow-[1.5px_1.5px_0_#e11d48]'
                  : 'border-slate-800 bg-white hover:bg-slate-50'
              }`}
            >
              <div>
                <span className="text-xs font-black text-slate-900 block">
                  Public Legal Aid Attorney
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Minimal cost, standard defense
                </span>
              </div>
              <span className="text-xs font-black font-mono text-emerald-700">$300</span>
            </button>

            <button
              type="button"
              onClick={() => setAttorneyTier('standard')}
              className={`text-left p-2.5 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                attorneyTier === 'standard'
                  ? 'border-rose-500 bg-rose-50/80 shadow-[1.5px_1.5px_0_#e11d48]'
                  : 'border-slate-800 bg-white hover:bg-slate-50'
              }`}
            >
              <div>
                <span className="text-xs font-black text-slate-900 block">
                  Private Family Law Firm
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Experienced negotiators for fair settlement
                </span>
              </div>
              <span className="text-xs font-black font-mono text-emerald-700">$1,500</span>
            </button>

            <button
              type="button"
              onClick={() => setAttorneyTier('high_powered')}
              className={`text-left p-2.5 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                attorneyTier === 'high_powered'
                  ? 'border-rose-500 bg-rose-50/80 shadow-[1.5px_1.5px_0_#e11d48]'
                  : 'border-slate-800 bg-white hover:bg-slate-50'
              }`}
            >
              <div>
                <span className="text-xs font-black text-slate-900 block">
                  Elite Celebrity Divorce Litigators
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Aggressive defense, maximum asset retention
                </span>
              </div>
              <span className="text-xs font-black font-mono text-emerald-700">$12,000</span>
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <CartoonButton variant="slate" size="sm" onClick={onClose}>
            Cancel
          </CartoonButton>
          <CartoonButton
            variant="rose"
            size="sm"
            disabled={!canAfford}
            onClick={() => onConfirmDivorce(attorneyTier)}
          >
            Finalize Divorce 💔
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};
