import React from 'react'
import type { StatEffects, StatKey } from '../../types/game'
import { EFFECT_ORDER, EXTRA_EFFECT_META, STAT_META } from '../../constants/stats'

interface StatDeltaChipsProps {
  effects: StatEffects;
}

function isStatKey(key: string): key is StatKey {
  return key in STAT_META;
}

/** Shows stat changes as colored chips, e.g. "❤️ Health +4", "👨‍👩‍👧 Parents +6". */
export const StatDeltaChips: React.FC<StatDeltaChipsProps> = ({ effects }) => {
  const changes = EFFECT_ORDER.filter((key) => effects[key]);

  if (changes.length === 0) {
    return <p className="text-xs font-bold text-slate-400">Nothing really changed.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {changes.map((key) => {
        const value = effects[key] as number;
        const isPositive = value > 0;
        const meta = isStatKey(key) ? STAT_META[key] : EXTRA_EFFECT_META[key];
        const valueText =
          key === 'cash' || key === 'businessTreasury'
            ? `${isPositive ? '+' : '-'}$${Math.abs(value).toLocaleString()}`
            : key === 'grades' ||
              key === 'popularity' ||
              key === 'jobPerformance' ||
              key === 'businessBrand' ||
              key === 'businessMorale' ||
              key === 'businessQuality'
            ? `${isPositive ? '+' : ''}${value}%`
            : `${isPositive ? '+' : ''}${value}`;

        return (
          <span
            key={key}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-xl border-2 border-slate-900
              text-[11px] font-black shadow-[1px_1.5px_0_#0f172a]
              ${isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}
            `}
          >
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
            <span className="font-mono">{valueText}</span>
          </span>
        );
      })}
    </div>
  );
};
