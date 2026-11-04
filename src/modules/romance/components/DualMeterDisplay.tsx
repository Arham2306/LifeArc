import React from 'react';
import { Heart, Users } from 'lucide-react';
import { ProgressBar } from '../../../components/ui/ProgressBar';

interface DualMeterDisplayProps {
  relationship: number;
  romanceMeter?: number;
  romanceUnlocked?: boolean;
}

export const DualMeterDisplay: React.FC<DualMeterDisplayProps> = ({
  relationship,
  romanceMeter = 0,
  romanceUnlocked = false,
}) => {
  return (
    <div className="flex flex-col gap-2 bg-slate-50 border-2 border-slate-900 rounded-xl p-3 shadow-[1.5px_1.5px_0_#0f172a]">
      {/* Relationship Meter */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs font-black text-slate-800">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            <span>Relationship</span>
          </div>
          <span className="font-mono text-emerald-700">{Math.round(relationship)}%</span>
        </div>
        <ProgressBar value={relationship} color="emerald" size="sm" />
      </div>

      {/* Romance / Love Meter */}
      {romanceUnlocked && (
        <div className="flex flex-col gap-1 pt-1 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs font-black text-slate-800">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 stroke-[2]" />
              <span>Love & Romance</span>
            </div>
            <span className="font-mono text-rose-600">{Math.round(romanceMeter)}%</span>
          </div>
          <ProgressBar value={romanceMeter} color="rose" size="sm" />
        </div>
      )}
    </div>
  );
};

