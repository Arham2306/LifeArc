import React from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'

interface Option {
  value: string;
  label: string;
}

interface CartoonSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: React.ReactNode;
  options: Option[];
  placeholder?: string;
  helperText?: string;
  isLoading?: boolean;
}

export const CartoonSelect: React.FC<CartoonSelectProps> = ({
  label,
  icon,
  options,
  placeholder = 'Select an option...',
  helperText,
  disabled,
  isLoading = false,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 px-1">
        {icon && <span className="text-slate-500">{icon}</span>}
        <span>{label}</span>
      </label>

      <div className="relative flex items-center">
        <select
          disabled={disabled || isLoading}
          className={`
            w-full py-2.5 pl-3.5 pr-9 text-sm font-bold text-slate-900 bg-white
            rounded-2xl border-[2.5px] border-slate-900 shadow-[2px_2.5px_0_#1e293b]
            focus:outline-none focus:border-amber-500 focus:shadow-[3px_4px_0_#1e293b]
            disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-400 disabled:shadow-none
            appearance-none cursor-pointer transition-all duration-100
            ${className}
          `}
          {...props}
        >
          <option value="" disabled>
            {isLoading ? 'Loading...' : placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {isLoading ? (
          <Loader2 className="w-4 h-4 stroke-[2.5] absolute right-3 pointer-events-none text-slate-400 animate-spin" />
        ) : (
          <ChevronDown 
            className={`
              w-4 h-4 stroke-[3] absolute right-3 pointer-events-none transition-colors
              ${disabled ? 'text-slate-400' : 'text-slate-800'}
            `} 
          />
        )}
      </div>

      {helperText && (
        <p className="text-[11px] font-bold text-slate-400 px-1">{helperText}</p>
      )}
    </div>
  );
};
