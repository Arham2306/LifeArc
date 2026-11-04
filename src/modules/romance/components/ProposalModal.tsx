import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { ENGAGEMENT_RINGS, PROPOSAL_VENUES } from '../data/romanticInteractions';
import type { EngagementRing, ProposalVenue } from '../types';
import type { PersonProfile } from '../../../types/game';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PersonProfile;
  playerCash: number;
  onConfirmProposal: (ring: EngagementRing, venue: ProposalVenue) => void;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({
  isOpen,
  onClose,
  target,
  playerCash,
  onConfirmProposal,
}) => {
  const [selectedRing, setSelectedRing] = useState<EngagementRing>(ENGAGEMENT_RINGS[2]); // Default gold solitaire
  const [selectedVenue, setSelectedVenue] = useState<ProposalVenue>(PROPOSAL_VENUES[1]); // Default sunset beach

  const totalCost = selectedRing.cost + selectedVenue.cost;
  const canAfford = playerCash >= totalCost;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Propose Marriage to ${target.firstName}`}
      icon="💍"
    >
      <div className="flex flex-col gap-3.5 max-h-[65vh] overflow-y-auto pr-1">
        {/* Ring Selection */}
        <div>
          <label className="text-xs font-black text-slate-900 mb-1.5 block">
            1. Select Engagement Ring
          </label>
          <div className="flex flex-col gap-2">
            {ENGAGEMENT_RINGS.map((ring) => {
              const isSelected = selectedRing.id === ring.id;

              return (
                <button
                  key={ring.id}
                  type="button"
                  onClick={() => setSelectedRing(ring)}
                  className={`text-left p-2.5 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/80 shadow-[2px_2px_0_#e11d48]'
                      : 'border-slate-800 bg-white hover:bg-slate-50 shadow-[1px_1px_0_#0f172a]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{ring.emoji}</span>
                    <div>
                      <span className="text-xs font-black text-slate-900 block">
                        {ring.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {ring.material} {ring.carat ? `• ${ring.carat}` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black font-mono text-emerald-700">
                    ${ring.cost.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Venue Selection */}
        <div>
          <label className="text-xs font-black text-slate-900 mb-1.5 block">
            2. Select Proposal Setting
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROPOSAL_VENUES.map((venue) => {
              const isSelected = selectedVenue.id === venue.id;

              return (
                <button
                  key={venue.id}
                  type="button"
                  onClick={() => setSelectedVenue(venue)}
                  className={`text-left p-2.5 rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50 shadow-[1.5px_1.5px_0_#e11d48]'
                      : 'border-slate-800 bg-white hover:bg-slate-50 shadow-[1px_1px_0_#0f172a]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{venue.emoji}</span>
                    <span className="text-[11px] font-black text-slate-900 line-clamp-1">
                      {venue.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-black font-mono text-emerald-700">
                    ${venue.cost.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Total Cost Calculation */}
        <div className="p-3 bg-amber-50 border-2 border-slate-900 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-600 block">Total Investment</span>
            <span className="text-sm font-black font-mono text-emerald-800">
              ${totalCost.toLocaleString()}
            </span>
          </div>
          {!canAfford && (
            <span className="text-xs font-black text-rose-600">Insufficient Funds</span>
          )}
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <CartoonButton variant="slate" size="sm" onClick={onClose}>
            Cancel
          </CartoonButton>
          <CartoonButton
            variant="rose"
            size="sm"
            disabled={!canAfford}
            onClick={() => onConfirmProposal(selectedRing, selectedVenue)}
          >
            Drop to One Knee! 💍
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};
