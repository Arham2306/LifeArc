import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

const maxWidthStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  actions,
  maxWidth = 'sm',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full ${maxWidthStyles[maxWidth]} max-h-[90vh] rounded-[28px] bg-white border-[3px] border-slate-900 shadow-[6px_8px_0_#0f172a] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="bg-amber-400 border-b-[3px] border-slate-900 px-5 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h3 className="font-black text-slate-950 text-base">{title}</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] active:translate-y-0.5 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 text-sm font-bold text-slate-700 space-y-3 overflow-y-auto overflow-x-hidden cartoon-scrollbar flex-1 min-h-0">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="bg-slate-50 border-t-[2.5px] border-slate-900 p-4 flex flex-col gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
