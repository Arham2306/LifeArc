import React from 'react';

const HIGHLIGHT_PILLARS = [
  { icon: '🎓', label: 'School & Degrees' },
  { icon: '💼', label: 'Careers & Business' },
  { icon: '❤️', label: 'Romance & Family' },
  { icon: '🏛️', label: 'Identity & Heritage' },
] as const;

/**
 * Branded Coming Soon cover screen shown on production builds when VITE_COMING_SOON=true.
 */
export const ComingSoonScreen: React.FC = () => {
  return (
    <div className="min-h-screen w-full px-4 py-8 flex items-center justify-center">
      <main className="w-full max-w-[540px] flex flex-col items-center text-center gap-5 select-none">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-300 border-[2.5px] border-slate-900 shadow-[3px_3.5px_0_#0f172a] -rotate-2 font-display text-xs sm:text-sm font-bold tracking-wide text-slate-950 uppercase">
          <span>🚧</span>
          <span>Launching Soon</span>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white border-[3px] border-slate-900 shadow-[4px_5px_0_#0f172a] flex items-center justify-center p-2.5 overflow-hidden">
            <img
              src="/lifearc-favicon.png"
              alt="LifeArc logo"
              className="w-full h-full object-contain"
            />
          </div>

          <h1
            className="font-cartoon text-5xl sm:text-7xl leading-none tracking-wide text-amber-400"
            style={{
              WebkitTextStroke: '3px #0f172a',
              textShadow: '5px 6px 0 #0f172a',
            }}
          >
            Life<span className="text-sky-400">Arc</span>
          </h1>

          <p className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-slate-700">
            ✨ One Life. Infinite Choices. ✨
          </p>
        </div>

        {/* Overview Card */}
        <section className="w-full cartoon-card rounded-[28px] p-5 sm:p-7 bg-white/95 space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-100 border-2 border-emerald-800 text-emerald-900 font-display text-xs font-bold">
            <span>🛠️</span>
            <span>Final Polish in Progress</span>
          </div>

          <p className="font-display text-sm sm:text-base leading-relaxed font-semibold text-slate-700">
            Step into a playful, turn-by-turn life simulator where every year shapes your story.
            Grow from childhood through school, careers, businesses, romance, family lineage, and
            unpredictable twists—one <span className="text-emerald-600 font-bold">Age Up</span> at
            a time.
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {HIGHLIGHT_PILLARS.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border-2 border-slate-900 bg-sky-50/80 px-3 py-2.5 shadow-[2px_2px_0_#0f172a] flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900"
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border-2 border-dashed border-slate-400 bg-amber-50/80 px-4 py-3 text-center">
            <p className="font-display text-xs sm:text-sm font-bold text-slate-800">
              We&apos;re putting the finishing touches on LifeArc before opening the doors. Check
              back soon!
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
