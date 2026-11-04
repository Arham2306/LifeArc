import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { DATE_VENUES } from '../data/romanticInteractions';
import type { DateVenue } from '../types';
import type { PersonProfile } from '../../../types/game';

interface DatePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PersonProfile;
  playerCash: number;
  onSelectVenue: (venue: DateVenue) => void;
}

export const DatePlannerModal: React.FC<DatePlannerModalProps> = ({
  isOpen,
  onClose,
  target,
  playerCash,
  onSelectVenue,
}) => {
  const currentRomance = target.romanceMeter ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Plan a Date with ${target.firstName}`}
      icon="🥂"
    >
      <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
        <span className="text-[11px] font-semibold text-slate-500">
          Select a date venue matching your chemistry and budget:
        </span>
        {DATE_VENUES.map((venue) => {
          const canAfford = playerCash >= venue.cost;
          const meetsRomance = currentRomance >= venue.minRomance;
          const isAvailable = canAfford && meetsRomance;

          return (
            <button
              key={venue.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => onSelectVenue(venue)}
              className={`text-left p-3 rounded-xl border-2 border-slate-900 transition-all shadow-[1.5px_1.5px_0_#0f172a] flex flex-col gap-1.5 ${
                isAvailable
                  ? 'bg-white hover:bg-rose-50 cursor-pointer hover:translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0'
                  : 'bg-slate-100 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{venue.emoji}</span>
                  <div>
                    <span className="text-xs font-black text-slate-900">
                      {venue.name}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 block">
                      {venue.vibe}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black font-mono text-emerald-700">
                    ${venue.cost.toLocaleString()}
                  </span>
                  {!meetsRomance && (
                    <span className="text-[9px] font-black text-rose-500 block">
                      Needs {venue.minRomance}% Romance
                    </span>
                  )}
                  {!canAfford && meetsRomance && (
                    <span className="text-[9px] font-black text-amber-600 block">
                      Can't afford
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] font-medium text-slate-600">
                {venue.description}
              </p>

              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700 pt-1 border-t border-slate-200">
                <span className="text-emerald-700">+{venue.relationshipBonus}% Rel</span>
                <span>•</span>
                <span className="text-rose-600">+{venue.romanceBonus}% Romance</span>
                <span>•</span>
                <span className="text-amber-700">+{venue.happinessBonus}% Happy</span>
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
