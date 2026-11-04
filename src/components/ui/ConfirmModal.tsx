import React from 'react';
import { Modal } from './Modal';
import { CartoonButton, type ButtonVariant } from './CartoonButton';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmModalWarning {
  title?: string;
  message?: string;
  bulletPoints?: string[];
  variant?: 'rose' | 'amber' | 'slate';
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  icon?: React.ReactNode;
  message?: string;
  warningCallout?: ConfirmModalWarning;
  children?: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  confirmIcon?: React.ReactNode;
  cancelLabel?: string;
  disabled?: boolean;
}

const warningVariantStyles = {
  rose: 'bg-rose-50 border-rose-800 text-rose-950',
  amber: 'bg-amber-50 border-amber-800 text-amber-950',
  slate: 'bg-slate-100 border-slate-900 text-slate-950',
};

const warningIconColorStyles = {
  rose: 'text-rose-700',
  amber: 'text-amber-700',
  slate: 'text-slate-700',
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  icon = '⚠️',
  message,
  warningCallout,
  children,
  confirmLabel = 'Confirm',
  confirmVariant = 'rose',
  confirmIcon,
  cancelLabel = 'Cancel',
  disabled = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      actions={
        <>
          <CartoonButton
            variant={confirmVariant}
            size="md"
            fullWidth
            disabled={disabled}
            onClick={onConfirm}
            icon={confirmIcon}
          >
            {confirmLabel}
          </CartoonButton>
          <CartoonButton
            variant="white"
            size="md"
            fullWidth
            onClick={onClose}
          >
            {cancelLabel}
          </CartoonButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {/* Main Prompt / Description */}
        {message && (
          <p className="text-xs font-bold text-slate-800 leading-relaxed">
            {message}
          </p>
        )}

        {/* Warning Callout Box */}
        {warningCallout && (
          <div
            className={`rounded-2xl border-2 p-3 flex flex-col gap-1.5 shadow-[1.5px_2px_0_#0f172a] ${
              warningVariantStyles[warningCallout.variant || 'rose']
            }`}
          >
            {warningCallout.title && (
              <div className="flex items-center gap-1.5 font-black uppercase text-[11px]">
                <AlertTriangle
                  className={`w-3.5 h-3.5 stroke-[2.5] ${
                    warningIconColorStyles[warningCallout.variant || 'rose']
                  }`}
                />
                <span>{warningCallout.title}</span>
              </div>
            )}

            {warningCallout.message && (
              <p className="text-[11px] font-bold leading-snug">
                {warningCallout.message}
              </p>
            )}

            {warningCallout.bulletPoints && warningCallout.bulletPoints.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-[11px] font-bold">
                {warningCallout.bulletPoints.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Custom Content (e.g. Requirement comparisons, dual meters) */}
        {children}
      </div>
    </Modal>
  );
};

