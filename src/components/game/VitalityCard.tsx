import React from 'react'
import type { CharacterStats } from '../../types/game'
import { STAT_META, VISIBLE_STATS } from '../../constants/stats'
import { CartoonCard } from '../ui/CartoonCard'
import { StatBar } from '../ui/StatBar'

interface VitalityCardProps {
  stats: CharacterStats;
}

export const VitalityCard: React.FC<VitalityCardProps> = ({ stats }) => {
  return (
    <CartoonCard variant="slate" borderSize="sm" className="p-3.5 flex flex-col gap-2">
      <span className="text-xs font-black uppercase tracking-wider text-slate-500 px-0.5">
        Life Vitality
      </span>

      <div className="space-y-2">
        {VISIBLE_STATS.map((key) => (
          <StatBar
            key={key}
            label={STAT_META[key].label}
            value={stats[key]}
            icon={STAT_META[key].icon}
            colorClass={STAT_META[key].barClass}
          />
        ))}
      </div>
    </CartoonCard>
  );
};

