import React from 'react'

interface CartoonCardProps {
  children: React.ReactNode;
  variant?: 'white' | 'slate' | 'amber' | 'sky' | 'emerald' | 'rose' | 'purple';
  borderSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantBg = {
  white: 'bg-white',
  slate: 'bg-slate-50',
  amber: 'bg-amber-50/70',
  sky: 'bg-sky-50/70',
  emerald: 'bg-emerald-50/70',
  rose: 'bg-rose-50/70',
  purple: 'bg-purple-50/70',
};

const borderStyles = {
  sm: 'border-[2px] shadow-[2px_2px_0_#1e293b]',
  md: 'border-[2.5px] shadow-[3px_4px_0_#1e293b]',
  lg: 'border-[3px] shadow-[4px_5px_0_#1e293b]',
};

export const CartoonCard: React.FC<CartoonCardProps> = ({
  children,
  variant = 'white',
  borderSize = 'md',
  className = '',
}) => {
  return (
    <div
      className={`
        rounded-2xl border-slate-900 transition-all
        ${variantBg[variant]}
        ${borderStyles[borderSize]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

