import React from 'react';
import { MessageCircle, Heart } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { ROMANTIC_TALK_TOPICS } from '../data/romanticInteractions';
import type { RomanticTalkOption } from '../types';
import type { PersonProfile } from '../../../types/game';

interface RomanticTalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PersonProfile;
  onSelectTopic: (topic: RomanticTalkOption) => void;
}

export const RomanticTalkModal: React.FC<RomanticTalkModalProps> = ({
  isOpen,
  onClose,
  target,
  onSelectTopic,
}) => {
  const currentRomance = target.romanceMeter ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Deep Talk with ${target.firstName}`}
      icon="💬"
    >
      <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
        <span className="text-[11px] font-semibold text-slate-500">
          Pick a meaningful conversation topic to deepen your emotional intimacy:
        </span>

        {ROMANTIC_TALK_TOPICS.map((topic) => {
          const isAvailable = currentRomance >= topic.minRomance;

          return (
            <button
              key={topic.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => onSelectTopic(topic)}
              className={`text-left p-3 rounded-xl border-2 border-slate-900 transition-all shadow-[1.5px_1.5px_0_#0f172a] flex flex-col gap-1.5 ${
                isAvailable
                  ? 'bg-white hover:bg-sky-50 cursor-pointer hover:translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0'
                  : 'bg-slate-100 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  {topic.topic}
                </span>

                {!isAvailable && (
                  <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-300">
                    Needs {topic.minRomance}% Love
                  </span>
                )}
              </div>

              <p className="text-[11px] font-medium text-slate-600 leading-snug">
                {topic.dialogue}
              </p>

              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 pt-1 border-t border-slate-200">
                <span className="text-emerald-700 flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                  Deepens Emotional Bond & Romance
                </span>
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

