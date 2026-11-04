import React from 'react';
import { Gift } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { ROMANTIC_GIFTS } from '../data/romanticInteractions';
import type { RomanticGift } from '../types';
import type { PersonProfile } from '../../../types/game';

interface RomanticGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PersonProfile;
  playerCash: number;
  onSelectGift: (gift: RomanticGift) => void;
}

export const RomanticGiftModal: React.FC<RomanticGiftModalProps> = ({
  isOpen,
  onClose,
  target,
  playerCash,
  onSelectGift,
}) => {
  const currentRomance = target.romanceMeter ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Give Gift to ${target.firstName}`}
      icon="🎁"
    >
      <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
        <span className="text-[11px] font-semibold text-slate-500">
          Choose a romantic present from thoughtful gestures to luxury surprises:
        </span>

        {ROMANTIC_GIFTS.map((gift) => {
          const canAfford = playerCash >= gift.cost;
          const meetsRomance = currentRomance >= gift.minRomance;
          const isAvailable = canAfford && meetsRomance;

          return (
            <button
              key={gift.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => onSelectGift(gift)}
              className={`text-left p-3 rounded-xl border-2 border-slate-900 transition-all shadow-[1.5px_1.5px_0_#0f172a] flex flex-col gap-1.5 ${
                isAvailable
                  ? 'bg-white hover:bg-emerald-50/70 cursor-pointer hover:translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0'
                  : 'bg-slate-100 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-slate-900 flex items-center justify-center text-xl shrink-0 shadow-[1px_1px_0_#0f172a]">
                    {gift.emoji}
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-950 block">
                      {gift.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 block line-clamp-1 italic">
                      "{gift.reaction}"
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black font-mono text-emerald-700 block">
                    {gift.cost === 0 ? 'FREE' : `$${gift.cost.toLocaleString()}`}
                  </span>
                  {!meetsRomance && (
                    <span className="text-[9px] font-black text-rose-500 block">
                      Needs {gift.minRomance}% Love
                    </span>
                  )}
                  {!canAfford && meetsRomance && (
                    <span className="text-[9px] font-black text-amber-600 block">
                      Can't afford
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700 pt-1 border-t border-slate-200">
                <span className="text-emerald-700 flex items-center gap-1">
                  <Gift className="w-3 h-3 text-emerald-600" />
                  +{gift.relationshipDelta}% Rel
                </span>
                <span>•</span>
                <span className="text-rose-600">+{gift.romanceDelta}% Love</span>
              </div>
            </button>
          );
        })}

        <div className="pt-2 flex justify-end">
          <CartoonButton variant="slate" size="sm" onClick={onClose}>
            Cancel
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};

