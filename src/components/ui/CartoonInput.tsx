import React from 'react'
import { Dices } from 'lucide-react'

interface CartoonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  onRandomize?: () => void;
  error?: string;
}

export const CartoonInput: React.FC<CartoonInputProps> = ({
  label,
  icon,
  onRandomize,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between text-xs font-black text-slate-700 px-1">
        <span className="flex items-center gap-1.5">
          {icon && <span className="text-slate-500">{icon}</span>}
          <span>{label}</span>
        </span>
        {onRandomize && (
          <button
            type="button"
            onClick={onRandomize}
            title="Randomize"
            className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Dices className="w-3 h-3 stroke-[2.5]" />
            Roll
          </button>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          className={`
            w-full py-2.5 px-3.5 text-sm font-bold text-slate-900 bg-white
            rounded-2xl border-[2.5px] border-slate-900 shadow-[2px_2.5px_0_#1e293b]
            placeholder:text-slate-400 placeholder:font-normal
            focus:outline-none focus:border-amber-500 focus:shadow-[3px_4px_0_#1e293b]
            transition-all duration-100
            ${error ? 'border-rose-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>

      {error && <p className="text-[11px] font-bold text-rose-600 px-1">{error}</p>}
    </div>
  );
};

