import React from 'react'
import type { CharacterStats, StatKey } from '../../types/game'
import { VISIBLE_STATS } from '../../constants/stats'

interface VitalityCardProps {
  stats: CharacterStats;
}

interface StatInfo {
  label: string;
  icon: string;
}

const STAT_INFO: Record<StatKey, StatInfo> = {
  health: { label: 'Health', icon: '❤️' },
  happiness: { label: 'Happiness', icon: '😄' },
  smarts: { label: 'Smarts', icon: '💡' },
  looks: { label: 'Looks', icon: '✨' },
  karma: { label: 'Karma', icon: '😇' },
};

/**
 * Returns dynamic stroke colors matching classic life simulation circular meters:
 * - >= 70%: Vibrant Green (Good)
 * - 40% - 69%: Golden Amber (Moderate)
 * - < 40%: Warning Orange/Red (Low)
 */
function getStatColor(value: number): { stroke: string; track: string } {
  if (value >= 70) {
    return {
      stroke: '#15803d', // Green
      track: '#e2e8f0',  // Slate 200
    };
  }
  if (value >= 40) {
    return {
      stroke: '#ca8a04', // Golden Amber
      track: '#e2e8f0',
    };
  }
  return {
    stroke: '#ea580c', // Orange/Red
    track: '#e2e8f0',
  };
}

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~113.097

export const VitalityCard: React.FC<VitalityCardProps> = ({ stats }) => {
  return (
    <div className="w-full py-1 px-0.5 select-none">
      <div className="grid grid-cols-4 gap-1 items-center justify-items-center">
        {VISIBLE_STATS.map((key) => {
          const info = STAT_INFO[key];
          const rawValue = stats[key] ?? 0;
          const clampedValue = Math.min(100, Math.max(0, Math.round(rawValue)));
          const strokeOffset = CIRCUMFERENCE - (CIRCUMFERENCE * clampedValue) / 100;
          const colors = getStatColor(clampedValue);

          return (
            <div
              key={key}
              className="flex flex-col items-center justify-center text-center group transition-transform hover:-translate-y-0.5 cursor-default"
              title={`${info.label}: ${clampedValue}%`}
            >
              {/* Circular Radial Meter */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                  {/* Background Track Circle */}
                  <circle
                    cx="24"
                    cy="24"
                    r={RADIUS}
                    stroke={colors.track}
                    strokeWidth="4.5"
                    fill="white"
                  />
                  {/* Active Progress Arc */}
                  <circle
                    cx="24"
                    cy="24"
                    r={RADIUS}
                    stroke={colors.stroke}
                    strokeWidth="4.5"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>

                {/* Center Numeric Stat Value */}
                <span className="absolute font-black text-sm font-display text-slate-950 leading-none">
                  {clampedValue}
                </span>
              </div>

              {/* Stat Label */}
              <span className="text-[10px] font-black uppercase tracking-tight text-slate-800 mt-1 flex items-center justify-center gap-0.5 truncate max-w-[85px]">
                <span className="text-xs shrink-0 leading-none">{info.icon}</span>
                <span className="truncate">{info.label}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
