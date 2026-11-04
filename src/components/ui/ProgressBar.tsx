import React from 'react';

interface ProgressBarProps {
  value: number; // 0 - 100
  color?: 'emerald' | 'amber' | 'sky' | 'rose' | 'purple';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  sky: 'bg-sky-400',
  rose: 'bg-rose-400',
  purple: 'bg-purple-400',
};

const HEIGHT_MAP: Record<string, string> = {
  xs: 'h-2.5',
  sm: 'h-3.5',
  md: 'h-5',
  lg: 'h-6',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'emerald',
  size = 'md',
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  const heightClass = HEIGHT_MAP[size] || HEIGHT_MAP.md;
  const colorClass = COLOR_MAP[color] || COLOR_MAP.emerald;

  return (
    <div
      className={`w-full bg-slate-200/90 rounded-full border-2 border-slate-900 p-0.5 overflow-hidden shadow-inner relative ${heightClass} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden ${colorClass}`}
        style={{ width: `${clamped}%` }}
      >
        <div className="absolute inset-0 gloss-overlay" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.7) 6px, rgba(255,255,255,0.7) 12px)',
          }}
        />
      </div>
    </div>
  );
};

