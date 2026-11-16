import React from 'react';

/**
 * Desktop left-gutter showcase displaying the LifeArc tagline, funky cartoon heading,
 * and brief game overview while keeping the center simulation frame balanced.
 */
export const GameIntroPanel: React.FC = () => {
  return (
    <aside
      aria-label="About LifeArc"
      className="hidden lg:flex flex-col items-start justify-center min-w-0 w-full max-w-[340px] xl:max-w-[420px] 2xl:max-w-[460px] ml-auto pr-2 gap-5 xl:gap-6 select-none"
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-300 border-[2.5px] border-slate-900 shadow-[3px_3.5px_0_#0f172a] -rotate-2 font-display text-xs xl:text-sm font-bold tracking-wide text-slate-950 uppercase">
        <span>✨</span>
        <span>One Life. Infinite Choices.</span>
      </div>

      <h1
        className="font-cartoon text-5xl xl:text-7xl 2xl:text-[5.25rem] leading-none tracking-wide text-amber-400"
        style={{
          WebkitTextStroke: '3px #0f172a',
          textShadow: '5px 6px 0 #0f172a',
        }}
      >
        Life<span className="text-sky-400">Arc</span>
      </h1>

      <div className="cartoon-card rounded-3xl p-5 xl:p-6 bg-white/95 -rotate-1">
        <p className="font-display text-sm xl:text-base 2xl:text-[17px] leading-relaxed font-semibold text-slate-700">
          Step into a playful, turn-by-turn life simulator where every year shapes your story.
          Grow from childhood through school, careers, businesses, romance, family lineage, and
          unpredictable twists—one <span className="text-emerald-600 font-bold">Age Up</span> at a
          time.
        </p>
      </div>
    </aside>
  );
};
