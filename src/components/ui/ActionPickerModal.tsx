import React from 'react';
import { Modal } from './Modal';
import { CartoonButton } from './CartoonButton';

export interface ActionPickerItem<T = any> {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  emoji?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: 'emerald' | 'rose' | 'amber' | 'sky' | 'slate' | 'purple';
  cost?: number;
  statDeltas?: Array<{
    label: string;
    delta: string | number;
    color?: string;
    icon?: React.ReactNode;
  }>;
  disabled?: boolean;
  disabledReason?: string;
  data: T;
}

export interface ActionPickerModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  target?: {
    firstName: string;
    lastName?: string;
    avatarEmoji?: string;
    relationship?: number;
    romanceMeter?: number;
    romanceUnlocked?: boolean;
    role?: string;
  };
  items: ActionPickerItem<T>[];
  onSelect: (item: T) => void;
  cancelLabel?: string;
  maxWidth?: 'sm' | 'md';
}

const badgeColorStyles: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  rose: 'bg-rose-100 text-rose-800 border-rose-300',
  amber: 'bg-amber-100 text-amber-800 border-amber-300',
  sky: 'bg-sky-100 text-sky-800 border-sky-300',
  slate: 'bg-slate-200 text-slate-800 border-slate-300',
  purple: 'bg-purple-100 text-purple-800 border-purple-300',
};

export function ActionPickerModal<T = any>({
  isOpen,
  onClose,
  title,
  icon,
  subtitle,
  target,
  items,
  onSelect,
  cancelLabel = 'Cancel',
  maxWidth = 'sm',
}: ActionPickerModalProps<T>) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      maxWidth={maxWidth}
    >
      <div className="flex flex-col gap-2.5">
        {/* Optional Target Person Summary Header */}
        {target && (
          <div className="p-2.5 bg-slate-50 rounded-xl border-2 border-slate-900 flex items-center justify-between shadow-[1px_1.5px_0_#0f172a]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-200 border border-slate-900 flex items-center justify-center text-lg shadow-[1px_1px_0_#0f172a]">
                {target.avatarEmoji || '👤'}
              </div>
              <div>
                <span className="text-xs font-black text-slate-950 block leading-tight">
                  {target.firstName} {target.lastName || ''}
                </span>
                {target.role && (
                  <span className="text-[10px] font-bold text-slate-500 block">
                    {target.role}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-black font-mono">
              {target.relationship !== undefined && (
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  {Math.round(target.relationship)}% Rel
                </span>
              )}
              {target.romanceUnlocked && target.romanceMeter !== undefined && (
                <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300">
                  {Math.round(target.romanceMeter)}% Love
                </span>
              )}
            </div>
          </div>
        )}

        {/* Subtitle / Instructions */}
        {subtitle && (
          <span className="text-[11px] font-semibold text-slate-500">
            {subtitle}
          </span>
        )}

        {/* Scrollable Items List */}
        <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
          {items.map((item) => {
            const isClickable = !item.disabled;
            const badgeClass =
              badgeColorStyles[item.badgeColor || 'slate'] || badgeColorStyles.slate;

            return (
              <button
                key={item.id}
                type="button"
                disabled={!isClickable}
                onClick={() => {
                  if (isClickable) onSelect(item.data);
                }}
                className={`text-left p-3 rounded-xl border-2 border-slate-900 transition-all flex flex-col gap-1.5 ${
                  isClickable
                    ? 'bg-white hover:bg-slate-50 cursor-pointer shadow-[1.5px_1.5px_0_#0f172a] hover:translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 group'
                    : 'bg-slate-100 opacity-60 cursor-not-allowed shadow-none'
                }`}
              >
                {/* Header Row: Emoji/Icon + Title + Price/Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.emoji && (
                      <span className="text-lg shrink-0">{item.emoji}</span>
                    )}
                    {item.icon && (
                      <span className="shrink-0 text-slate-700">{item.icon}</span>
                    )}
                    <span className="text-xs font-black text-slate-950 truncate group-hover:text-slate-900">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.cost !== undefined && (
                      <span className="text-xs font-black font-mono text-emerald-700">
                        {item.cost === 0 ? 'FREE' : `$${item.cost.toLocaleString()}`}
                      </span>
                    )}
                    {item.badge && (
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeClass}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtitle / Dialogue / Context */}
                {item.subtitle && (
                  <span className="text-[10px] font-bold text-slate-500 italic block leading-snug">
                    {item.subtitle}
                  </span>
                )}

                {/* Description */}
                {item.description && (
                  <p className="text-[11px] font-medium text-slate-600 leading-snug">
                    {item.description}
                  </p>
                )}

                {/* Disabled Reason Alert */}
                {item.disabled && item.disabledReason && (
                  <div className="pt-0.5">
                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      ⚠️ {item.disabledReason}
                    </span>
                  </div>
                )}

                {/* Stat Deltas Strip */}
                {item.statDeltas && item.statDeltas.length > 0 && (
                  <div className="flex items-center gap-2 text-[10px] font-bold pt-1 border-t border-slate-200 text-slate-600">
                    {item.statDeltas.map((stat, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span className="text-slate-300">•</span>}
                        <span className={`flex items-center gap-1 ${stat.color || 'text-slate-700'}`}>
                          {stat.icon}
                          {stat.delta} {stat.label}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-1 flex justify-end">
          <CartoonButton variant="slate" size="sm" onClick={onClose}>
            {cancelLabel}
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
}

