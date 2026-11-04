import React from 'react';
import { MessageCircleHeart } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { FLIRT_OPTIONS } from '../data/romanticInteractions';
import type { FlirtOption } from '../types';
import type { PersonProfile } from '../../../types/game';

interface FlirtModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PersonProfile;
  onSelectFlirt: (flirt: FlirtOption) => void;
}

export const FlirtModal: React.FC<FlirtModalProps> = ({
  isOpen,
  onClose,
  target,
  onSelectFlirt,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Flirt with ${target.firstName}`}
      icon="✨"
    >
      <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
        <span className="text-[11px] font-semibold text-slate-500">
          Choose your flirting style and test your chemistry:
        </span>
        {FLIRT_OPTIONS.map((flirt) => {
          return (
            <button
              key={flirt.id}
              type="button"
              onClick={() => onSelectFlirt(flirt)}
              className="text-left p-3 rounded-xl border-2 border-slate-900 bg-white hover:bg-rose-50 transition-all shadow-[1.5px_1.5px_0_#0f172a] hover:translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 cursor-pointer flex flex-col gap-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 group-hover:text-rose-950 flex items-center gap-1.5">
                  <MessageCircleHeart className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
                  {flirt.label}
                </span>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 capitalize">
                  {flirt.style}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-600 italic">
                {flirt.dialogue}
              </p>
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
