import React from 'react';
import { Heart, Sparkles, Smile, DollarSign, Baby, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';

export interface RomanceReactionDeltas {
  romanceDelta?: number;
  relationshipDelta?: number;
  happinessDelta?: number;
  cashDelta?: number;
  isConception?: boolean;
  customBadge?: string;
}

export interface RomanceReactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  partnerName?: string;
  avatarEmoji?: string;
  message: string;
  deltas?: RomanceReactionDeltas;
}

export const RomanceReactionModal: React.FC<RomanceReactionModalProps> = ({
  isOpen,
  onClose,
  title,
  icon = '💖',
  partnerName,
  avatarEmoji,
  message,
  deltas,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
    >
      <div className="flex flex-col gap-4 text-center items-center py-1">
        {/* Centerpiece Icon / Avatar */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border-[3px] border-slate-900 flex items-center justify-center text-3xl shadow-[3px_3px_0_#0f172a] transform -rotate-1 hover:rotate-0 transition-transform">
            {avatarEmoji || icon}
          </div>
          {deltas?.isConception && (
            <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white rounded-full p-1 border-2 border-slate-900 text-xs shadow-[1.5px_1.5px_0_#0f172a] animate-bounce">
              🍼
            </div>
          )}
        </div>

        {/* Partner Name if provided */}
        {partnerName && (
          <span className="text-xs font-black tracking-wide uppercase text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
            {partnerName}
          </span>
        )}

        {/* Narrative / Reaction Speech Bubble */}
        <div className="w-full bg-slate-50 border-2 border-slate-900 rounded-2xl p-4 text-left shadow-[2px_2px_0_#0f172a] relative">
          <p className="text-sm font-bold text-slate-900 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Stat / Outcome Deltas */}
        {deltas && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 w-full">
            {deltas.romanceDelta !== undefined && deltas.romanceDelta !== 0 && (
              <span
                className={`text-[11px] font-black px-2.5 py-1 rounded-xl border-2 border-slate-900 shadow-[1px_1px_0_#0f172a] flex items-center gap-1 ${
                  deltas.romanceDelta > 0
                    ? 'bg-rose-100 text-rose-950'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                <Heart className="w-3 h-3 text-rose-600 fill-rose-600" />
                {deltas.romanceDelta > 0 ? `+${deltas.romanceDelta}%` : `${deltas.romanceDelta}%`} Love
              </span>
            )}

            {deltas.relationshipDelta !== undefined && deltas.relationshipDelta !== 0 && (
              <span
                className={`text-[11px] font-black px-2.5 py-1 rounded-xl border-2 border-slate-900 shadow-[1px_1px_0_#0f172a] flex items-center gap-1 ${
                  deltas.relationshipDelta > 0
                    ? 'bg-emerald-100 text-emerald-950'
                    : 'bg-rose-100 text-rose-950'
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                {deltas.relationshipDelta > 0
                  ? `+${deltas.relationshipDelta}%`
                  : `${deltas.relationshipDelta}%`} Rel
              </span>
            )}

            {deltas.happinessDelta !== undefined && deltas.happinessDelta !== 0 && (
              <span
                className={`text-[11px] font-black px-2.5 py-1 rounded-xl border-2 border-slate-900 shadow-[1px_1px_0_#0f172a] flex items-center gap-1 ${
                  deltas.happinessDelta > 0
                    ? 'bg-amber-100 text-amber-950'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                <Smile className="w-3 h-3 text-amber-600" />
                {deltas.happinessDelta > 0
                  ? `+${deltas.happinessDelta}`
                  : `${deltas.happinessDelta}`} Happy
              </span>
            )}

            {deltas.cashDelta !== undefined && deltas.cashDelta !== 0 && (
              <span
                className={`text-[11px] font-black px-2.5 py-1 rounded-xl border-2 border-slate-900 shadow-[1px_1px_0_#0f172a] flex items-center gap-1 ${
                  deltas.cashDelta > 0
                    ? 'bg-emerald-100 text-emerald-950'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                <DollarSign className="w-3 h-3 text-emerald-600" />
                {deltas.cashDelta > 0
                  ? `+$${deltas.cashDelta.toLocaleString()}`
                  : `-$${Math.abs(deltas.cashDelta).toLocaleString()}`}
              </span>
            )}

            {deltas.isConception && (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-xl border-2 border-slate-900 bg-pink-100 text-pink-950 shadow-[1px_1px_0_#0f172a] flex items-center gap-1 animate-pulse">
                <Baby className="w-3 h-3 text-pink-600" />
                Expecting a Baby!
              </span>
            )}

            {deltas.customBadge && (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-xl border-2 border-slate-900 bg-sky-100 text-sky-950 shadow-[1px_1px_0_#0f172a] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-sky-600" />
                {deltas.customBadge}
              </span>
            )}
          </div>
        )}

        {/* Primary Action Button */}
        <div className="w-full pt-2">
          <CartoonButton
            variant="rose"
            size="md"
            className="w-full justify-center"
            onClick={onClose}
          >
            Continue
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};

