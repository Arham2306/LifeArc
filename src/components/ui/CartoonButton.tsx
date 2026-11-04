import React from 'react'

export type ButtonVariant = 'emerald' | 'amber' | 'sky' | 'rose' | 'slate' | 'white' | 'purple';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CartoonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white border-[#064e3b] shadow-[0_4px_0_#064e3b] active:shadow-[0_1px_0_#064e3b]',
  amber: 'bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 border-[#78350f] shadow-[0_4px_0_#78350f] active:shadow-[0_1px_0_#78350f]',
  sky: 'bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-slate-950 border-[#0369a1] shadow-[0_4px_0_#0369a1] active:shadow-[0_1px_0_#0369a1]',
  rose: 'bg-rose-500 hover:bg-rose-400 active:bg-rose-600 text-white border-[#881337] shadow-[0_4px_0_#881337] active:shadow-[0_1px_0_#881337]',
  slate: 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white border-[#0f172a] shadow-[0_4px_0_#0f172a] active:shadow-[0_1px_0_#0f172a]',
  white: 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 border-[#0f172a] shadow-[0_4px_0_#0f172a] active:shadow-[0_1px_0_#0f172a]',
  purple: 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white border-[#3b0764] shadow-[0_4px_0_#3b0764] active:shadow-[0_1px_0_#3b0764]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'py-1.5 px-3 text-xs gap-1.5 rounded-xl border-2',
  md: 'py-2.5 px-4 text-sm gap-2 rounded-2xl border-[2.5px]',
  lg: 'py-3.5 px-6 text-base font-black gap-2.5 rounded-2xl border-[3px]',
};

export const CartoonButton: React.FC<CartoonButtonProps> = ({
  variant = 'emerald',
  size = 'md',
  icon,
  children,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-black tracking-wide
        transition-all duration-75 select-none
        active:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {icon && <span className="flex-shrink-0 text-current">{icon}</span>}
      {children}
    </button>
  );
};

