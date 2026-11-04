import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { WEDDING_VENUES } from '../data/romanticInteractions';
import type { WeddingVenue } from '../types';
import type { PersonProfile } from '../../../types/game';

interface WeddingPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PersonProfile;
  playerCash: number;
  onConfirmWedding: (venue: WeddingVenue, demandPrenup: boolean) => void;
}

export const WeddingPlannerModal: React.FC<WeddingPlannerModalProps> = ({
  isOpen,
  onClose,
  target,
  playerCash,
  onConfirmWedding,
}) => {
  const [selectedVenue, setSelectedVenue] = useState<WeddingVenue>(WEDDING_VENUES[1]); // Default Beachfront Pavilion
  const [demandPrenup, setDemandPrenup] = useState(false);

  const canAfford = playerCash >= selectedVenue.cost;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Plan Wedding with ${target.firstName}`}
      icon="💒"
    >
      <div className="flex flex-col gap-3.5 max-h-[65vh] overflow-y-auto pr-1">
        {/* Venue Selection */}
        <div>
          <label className="text-xs font-black text-slate-900 mb-1.5 block">
            1. Select Wedding Venue
          </label>
          <div className="flex flex-col gap-2">
            {WEDDING_VENUES.map((venue) => {
              const isSelected = selectedVenue.id === venue.id;

              return (
                <button
                  key={venue.id}
                  type="button"
                  onClick={() => setSelectedVenue(venue)}
                  className={`text-left p-3 rounded-xl border-2 transition-all flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/80 shadow-[2px_2px_0_#e11d48]'
                      : 'border-slate-800 bg-white hover:bg-slate-50 shadow-[1px_1px_0_#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{venue.emoji}</span>
                      <span className="text-xs font-black text-slate-900">
                        {venue.name}
                      </span>
                    </div>
                    <span className="text-xs font-black font-mono text-emerald-700">
                      ${venue.cost.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-600">
                    {venue.description}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 pt-1 border-t border-slate-200">
                    <span>{venue.guestCapacity}</span>
                    <span>•</span>
                    <span className="text-amber-700">+{venue.happinessDelta}% Happiness</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prenuptial Agreement Toggle */}
        <div className="p-3 bg-slate-50 border-2 border-slate-900 rounded-xl flex items-start gap-3">
          <input
            id="prenup-checkbox"
            type="checkbox"
            checked={demandPrenup}
            onChange={(e) => setDemandPrenup(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-2 border-slate-900 text-rose-600 focus:ring-rose-500 cursor-pointer"
          />
          <label htmlFor="prenup-checkbox" className="flex flex-col cursor-pointer">
            <span className="text-xs font-black text-slate-900">
              Demand a Prenuptial Agreement (Prenup)
            </span>
            <span className="text-[11px] font-semibold text-slate-600 leading-tight">
              Protects your private bank savings, business equity, and real estate in the event of divorce. Note: High-drama partners may be deeply offended.
            </span>
          </label>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <CartoonButton variant="slate" size="sm" onClick={onClose}>
            Cancel
          </CartoonButton>
          <CartoonButton
            variant="rose"
            size="sm"
            disabled={!canAfford}
            onClick={() => onConfirmWedding(selectedVenue, demandPrenup)}
          >
            Walk Down the Aisle! 💒
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};
