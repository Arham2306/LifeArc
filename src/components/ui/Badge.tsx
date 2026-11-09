import React from 'react'

export type BadgeVariant = 'amber' | 'emerald' | 'sky' | 'rose' | 'slate' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  size?: 'xs' | 'sm';
  className?: string;
  wrap?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  amber: 'bg-amber-100 text-amber-900 border-amber-900/30',
  emerald: 'bg-emerald-100 text-emerald-900 border-emerald-900/30',
  sky: 'bg-sky-100 text-sky-900 border-sky-900/30',
  rose: 'bg-rose-100 text-rose-900 border-rose-900/30',
  slate: 'bg-slate-900 text-amber-300 border-slate-900',
  purple: 'bg-purple-100 text-purple-900 border-purple-900/30',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'amber',
  icon,
  size = 'sm',
  className = '',
  wrap = false,
}) => {
  const sizeClasses = size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const shouldWrap = wrap || className.includes('whitespace-normal');

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-black rounded-full border max-w-full
        ${shouldWrap ? 'whitespace-normal break-words leading-tight' : 'whitespace-nowrap shrink-0'}
        ${variantStyles[variant]}
        ${sizeClasses}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className={shouldWrap ? 'break-words' : 'truncate'}>{children}</span>
    </span>
  );
};

