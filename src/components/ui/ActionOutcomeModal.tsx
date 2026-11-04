import React from 'react';
import { Modal } from './Modal';
import { CartoonButton, type ButtonVariant } from './CartoonButton';
import { StatDeltaChips } from './StatDeltaChips';
import type { StatEffects } from '../../types/game';

export interface CustomStatDelta {
  label: string;
  delta: string | number;
  color?: 'emerald' | 'rose' | 'amber' | 'sky' | 'slate';
  icon?: React.ReactNode;
}

export interface ActionOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  partnerName?: string;
  avatarEmoji?: string;
  message: string;
  statEffects?: StatEffects;
  customDeltas?: CustomStatDelta[];
  alertCallout?: {
    title: string;
    message: string;
    icon?: React.ReactNode;
    variant?: 'amber' | 'rose' | 'emerald';
  };
  secondaryAction?: {
    label: string;
    icon?: React.ReactNode;
    variant?: ButtonVariant;
    onClick: () => void;
  };
  continueLabel?: string;
  continueVariant?: ButtonVariant;
}

const calloutVariantStyles = {
  amber: 'bg-amber-50 border-amber-800/40 text-amber-950',
  rose: 'bg-rose-50 border-rose-800/40 text-rose-950',
  emerald: 'bg-emerald-50 border-emerald-800/40 text-emerald-950',
};

const customDeltaColorStyles = {
  emerald: 'bg-emerald-100 text-emerald-950 border-slate-900',
  rose: 'bg-rose-100 text-rose-950 border-slate-900',
  amber: 'bg-amber-100 text-amber-950 border-slate-900',
  sky: 'bg-sky-100 text-sky-950 border-slate-900',
  slate: 'bg-slate-200 text-slate-900 border-slate-900',
};

export const ActionOutcomeModal: React.FC<ActionOutcomeModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  subtitle,
  partnerName,
  avatarEmoji,
  message,
  statEffects,
  customDeltas,
  alertCallout,
  secondaryAction,
  continueLabel = 'Continue',
  continueVariant = 'emerald',
}) => {
  const hasStatEffects =
    statEffects && Object.keys(statEffects).some((k) => statEffects[k as keyof StatEffects]);
  const hasCustomDeltas = customDeltas && customDeltas.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      actions={
        <>
          {secondaryAction && (
            <CartoonButton
              variant={secondaryAction.variant || 'purple'}
              size="md"
              fullWidth
              onClick={secondaryAction.onClick}
              icon={secondaryAction.icon}
            >
              {secondaryAction.label}
            </CartoonButton>
          )}
          <CartoonButton
            variant={continueVariant}
            size="md"
            fullWidth
            onClick={onClose}
          >
            {continueLabel}
          </CartoonButton>
        </>
      }
    >
      <div className="flex flex-col gap-3 py-1">
        {/* Optional Avatar / Mascot Showcase */}
        {avatarEmoji && (
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 border-[3px] border-slate-900 flex items-center justify-center text-3xl shadow-[3px_3px_0_#0f172a] transform -rotate-1 hover:rotate-0 transition-transform">
              {avatarEmoji}
            </div>
          </div>
        )}

        {/* Partner Name Badge */}
        {partnerName && (
          <div className="flex justify-center">
            <span className="text-[11px] font-black tracking-wide uppercase text-slate-600 bg-slate-100 px-3 py-0.5 rounded-full border border-slate-300">
              {partnerName}
            </span>
          </div>
        )}

        {/* Subtitle Banner if provided */}
        {subtitle && (
          <div className="rounded-xl bg-slate-100 border border-slate-300 px-3 py-1.5 flex items-center justify-between text-xs font-black text-slate-700">
            <span>{subtitle}</span>
          </div>
        )}

        {/* Narrative / Message Card */}
        <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-3.5 shadow-[2px_2px_0_#0f172a]">
          <p className="text-xs font-bold text-slate-800 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Alert Callout Box (Degree gate, Special condition, Pregnancy notice) */}
        {alertCallout && (
          <div
            className={`rounded-2xl border-2 p-3 flex flex-col gap-1.5 shadow-[1.5px_2px_0_#0f172a] ${
              calloutVariantStyles[alertCallout.variant || 'amber']
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-black">
              {alertCallout.icon && <span>{alertCallout.icon}</span>}
              <span>{alertCallout.title}</span>
            </div>
            <p className="text-[11px] font-bold leading-snug">
              {alertCallout.message}
            </p>
          </div>
        )}

        {/* Standard Stat Effects Chips */}
        {hasStatEffects && (
          <div className="pt-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-0.5">
              Stat Changes:
            </span>
            <StatDeltaChips effects={statEffects!} />
          </div>
        )}

        {/* Custom Stat Deltas (Love, Rel, Cash, Custom badges) */}
        {hasCustomDeltas && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {customDeltas!.map((delta, idx) => (
              <span
                key={idx}
                className={`text-[11px] font-black px-2.5 py-1 rounded-xl border-2 shadow-[1px_1px_0_#0f172a] flex items-center gap-1 ${
                  customDeltaColorStyles[delta.color || 'emerald']
                }`}
              >
                {delta.icon}
                <span>
                  {typeof delta.delta === 'number' && delta.delta > 0
                    ? `+${delta.delta}`
                    : delta.delta}{' '}
                  {delta.label}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

