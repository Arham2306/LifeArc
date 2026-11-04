import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  actions,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-[28px] bg-white border-[3px] border-slate-900 shadow-[6px_8px_0_#0f172a] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-amber-400 border-b-[3px] border-slate-900 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h3 className="font-black text-slate-950 text-base">{title}</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] active:translate-y-0.5"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 text-sm font-bold text-slate-700 space-y-3">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="bg-slate-50 border-t-[2.5px] border-slate-900 p-4 flex flex-col gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
