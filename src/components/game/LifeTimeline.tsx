import React, { useEffect, useRef } from 'react'
import type { LifeEvent } from '../../types/game'
import { Badge } from '../ui/Badge'

interface LifeTimelineProps {
  events: LifeEvent[];
  stageLabel?: string;
}

export const LifeTimeline: React.FC<LifeTimelineProps> = ({ events, stageLabel }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll only the journal container (prevents the whole page from jumping)
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [events.length]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto cartoon-scrollbar bg-slate-50/90 rounded-2xl border-[2.5px] border-slate-900 p-3 shadow-inner flex flex-col gap-2"
    >
      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-2 text-slate-400">
          <span className="text-3xl">⏳</span>
          <p className="text-xs font-bold text-slate-500">
            {stageLabel ? `You haven't reached ${stageLabel} yet!` : 'No events logged for this stage.'}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">
            Keep aging up to experience new milestones.
          </p>
        </div>
      ) : (
        events.map((evt) => (
          <div
            key={evt.id}
            className="bg-white rounded-xl border-2 border-slate-900 p-2.5 shadow-[1.5px_2px_0_#1e293b] flex items-start gap-2.5 transition-all animate-in fade-in slide-in-from-bottom-1 duration-150"
          >
            <div className="flex-shrink-0 pt-0.5">
              <Badge variant="amber" size="xs">
                Age {evt.age}
              </Badge>
            </div>
            <div className="flex-1 text-xs font-bold text-slate-800 leading-snug">
              {evt.title ? (
                <p className="font-black text-slate-950 mb-0.5">
                  {evt.icon && <span className="mr-1.5 text-sm">{evt.icon}</span>}
                  {evt.title}
                </p>
              ) : (
                evt.icon && <span className="mr-1.5 text-sm">{evt.icon}</span>
              )}
              {evt.message}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
