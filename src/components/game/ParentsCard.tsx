import React from 'react'
import type { ParentProfile, ParentsInfo } from '../../types/game'
import { WEALTH_META } from '../../modules/character/services/familyService'
import { CartoonCard } from '../ui/CartoonCard'
import { Badge } from '../ui/Badge'

interface ParentsCardProps {
  parents: ParentsInfo;
}

const getRelationshipColor = (value: number): string => {
  if (value >= 70) return 'bg-gradient-to-r from-emerald-500 to-green-400';
  if (value >= 40) return 'bg-gradient-to-r from-amber-400 to-yellow-300';
  return 'bg-gradient-to-r from-rose-500 to-red-400';
};

const ParentRow: React.FC<{ parent: ParentProfile; icon: string }> = ({ parent, icon }) => {
  const rel = Math.min(100, Math.max(0, parent.relationship));

  return (
    <div className="bg-white rounded-xl border-2 border-slate-900 p-2.5 shadow-[1.5px_2px_0_#1e293b] flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border-2 border-slate-900 flex items-center justify-center text-base flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-900 truncate leading-tight">
              {parent.firstName} {parent.lastName}{' '}
              <span className="text-[10px] font-bold text-slate-500">
                ({parent.role === 'father' ? 'Father' : 'Mother'}, {parent.age})
              </span>
            </p>
            <p className="text-[11px] font-bold text-slate-500 truncate leading-tight">
              {parent.occupation}
            </p>
          </div>
        </div>

        <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300 text-[10px] flex-shrink-0">
          ❤️ {rel}%
        </span>
      </div>

      {/* Relationship Bar */}
      <div className="h-3 w-full bg-slate-200/90 rounded-full border-2 border-slate-800 p-0.5 overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden ${getRelationshipColor(rel)}`}
          style={{ width: `${rel}%` }}
        >
          <div className="absolute inset-0 gloss-overlay" />
        </div>
      </div>
    </div>
  );
};

export const ParentsCard: React.FC<ParentsCardProps> = ({ parents }) => {
  const wealthMeta = WEALTH_META[parents.wealth];

  return (
    <CartoonCard variant="amber" borderSize="sm" className="p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs font-black uppercase tracking-wider text-slate-600">
          Parents & Family
        </span>
        <Badge variant={wealthMeta.badgeVariant} size="xs" icon={<span>{wealthMeta.icon}</span>}>
          {wealthMeta.label} Family
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <ParentRow parent={parents.father} icon="👨" />
        <ParentRow parent={parents.mother} icon="👩" />
      </div>
    </CartoonCard>
  );
};

