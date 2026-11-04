import React from 'react'

interface StatBarProps {
  label: string;
  value: number; // 0 - 100
  icon: React.ReactNode;
  colorClass: string; // bar color
  borderClass?: string;
  bgGlowClass?: string;
}

export const StatBar: React.FC<StatBarProps> = ({
  label,
  value,
  icon,
  colorClass,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-0.5">
        <span className="flex items-center gap-1.5 tracking-wide">
          <span className="text-base leading-none">{icon}</span>
          <span className="font-extrabold">{label}</span>
        </span>
        <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300 text-[11px]">
          {clampedValue}%
        </span>
      </div>

      {/* Chunky Cartoon Bar Outer */}
      <div className="h-5 w-full bg-slate-200/90 rounded-full border-[2.5px] border-slate-800 p-0.5 overflow-hidden shadow-inner relative">
        {/* Animated Filled Bar */}
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden ${colorClass}`}
          style={{ width: `${clampedValue}%` }}
        >
          {/* Gloss overlay */}
          <div className="absolute inset-0 gloss-overlay" />
          
          {/* Subtle striped pattern for cartoon flair */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.7) 6px, rgba(255,255,255,0.7) 12px)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

