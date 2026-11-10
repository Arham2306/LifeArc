import React from 'react'
import { Dices, Menu, Calendar, User, Briefcase, Landmark, PieChart } from 'lucide-react'
import type { CharacterProfile } from '../../types/game'
import { calculatePlayerNetWorth } from '../../modules/assets/services/assetService'

export type LifeStage = 'childhood' | 'teens' | 'adulthood' | 'middle_age' | 'old_age';

interface ProfileDashboardProps {
  character: CharacterProfile;
  selectedStage?: LifeStage;
  onSelectStage?: (stage: LifeStage) => void;
  onOpenMenu?: () => void;
  countryFlag?: string;
}

interface StageInfo {
  id: LifeStage;
  label: string;
  icon: string;
  minAge: number;
  maxAge: number;
}

export const LIFE_STAGES: StageInfo[] = [
  { id: 'childhood', label: 'Childhood', icon: '🧸', minAge: 0, maxAge: 12 },
  { id: 'teens', label: 'Teens', icon: '🎒', minAge: 13, maxAge: 17 },
  { id: 'adulthood', label: 'Adulthood', icon: '💼', minAge: 18, maxAge: 39 },
  { id: 'middle_age', label: 'Middle Age', icon: '👥', minAge: 40, maxAge: 64 },
  { id: 'old_age', label: 'Old Age', icon: '🪑', minAge: 65, maxAge: 120 },
];

export function getLifeStageForAge(age: number): LifeStage {
  if (age <= 12) return 'childhood';
  if (age <= 17) return 'teens';
  if (age <= 39) return 'adulthood';
  if (age <= 64) return 'middle_age';
  return 'old_age';
}

export function getAvatarEmoji(gender: string, age: number): string {
  if (age <= 3) return '👶';
  if (age <= 12) return gender === 'male' ? '👦' : gender === 'female' ? '👧' : '🧑';
  if (age <= 64) return gender === 'male' ? '👨' : gender === 'female' ? '👩' : '🧑';
  return gender === 'male' ? '👴' : gender === 'female' ? '👵' : '🧓';
}

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
  character,
  selectedStage,
  onSelectStage,
  onOpenMenu,
  countryFlag = '🌐',
}) => {
  const currentStage = getLifeStageForAge(character.age);
  const activeStage = selectedStage || currentStage;
  const currentYear = (character.birthYear || 2026) + character.age;
  const avatar = getAvatarEmoji(character.gender, character.age);

  // Dynamic occupation resolver if not explicitly set
  const occupation = character.occupation || (
    character.age <= 2 ? 'Infant' :
    character.age <= 4 ? 'Toddler' :
    character.age <= 10 ? 'Elementary Student' :
    character.age <= 13 ? 'Middle School Student' :
    character.age <= 17 ? 'High School Student' :
    'Unemployed'
  );

  return (
    <header className="flex flex-col w-full border-b-[3px] border-slate-900 bg-white">
      {/* 1. TOP APP BAR */}
      <div className="bg-[#1864ab] text-white px-4 py-2.5 flex items-center justify-between border-b-[2.5px] border-slate-900">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white border-2 border-slate-900 flex items-center justify-center text-slate-950 shadow-[1.5px_1.5px_0_#0f172a]">
            <Dices className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-black text-base tracking-wide font-display text-white">
            LifeArc
          </span>
        </div>

        {/* Location Badge */}
        <div className="flex items-center gap-1.5 bg-blue-900/40 border border-blue-300/40 px-3 py-1 rounded-full text-xs font-bold text-blue-50 shadow-inner">
          <span className="text-sm leading-none">{countryFlag}</span>
          <span className="truncate max-w-[130px] font-black">{character.city}</span>
        </div>

        {/* Menu / Settings */}
        <button
          onClick={onOpenMenu}
          title="Game Menu"
          className="w-8 h-8 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] hover:bg-slate-100 active:translate-y-0.5 transition-all cursor-pointer"
        >
          <Menu className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

      {/* 2. MAIN CHARACTER PROFILE CARD */}
      <div className="bg-[#f1f6fb] p-4 flex items-center justify-between gap-3">
        {/* Left: Avatar */}
        <div className="flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-white border-[2.5px] border-slate-900 flex items-center justify-center text-3xl shadow-[2.5px_3px_0_#1e293b]">
            {avatar}
          </div>
        </div>

        {/* Center: Details */}
        <div className="flex-1 flex flex-col justify-center min-w-0 pr-1">
          {/* Age & Year */}
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 leading-none">
            <Calendar className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
            <span>Age {character.age}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-mono">Year {currentYear}</span>
          </div>

          {/* Full Name */}
          <div className="flex items-center gap-1.5 my-1">
            <User className="w-3.5 h-3.5 text-amber-600 stroke-[2.5] flex-shrink-0" />
            <h2 className="text-sm font-black text-slate-900 leading-tight truncate">
              {character.firstName} {character.lastName}
            </h2>
          </div>

          {/* Occupation */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 leading-none">
            <Briefcase className="w-3.5 h-3.5 text-purple-600 stroke-[2.5] flex-shrink-0" />
            <span className="truncate">{occupation}</span>
          </div>
        </div>

        {/* Right: Finances with icons */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pl-1">
          {/* Cash / Bank */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-emerald-700 font-mono tracking-tight leading-none">
              ${character.cash.toLocaleString()}
            </span>
            <div className="w-6 h-6 rounded-full bg-emerald-100 border-[1.5px] border-emerald-800 flex items-center justify-center text-emerald-800 shadow-[1px_1px_0_#064e3b]">
              <Landmark className="w-3 h-3 stroke-[2.5]" />
            </div>
          </div>

          {/* Net Worth */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-emerald-800 font-mono tracking-tight leading-none">
              ${calculatePlayerNetWorth(character).toLocaleString()}
            </span>
            <div className="w-6 h-6 rounded-full bg-sky-100 border-[1.5px] border-blue-800 flex items-center justify-center text-blue-800 shadow-[1px_1px_0_#0369a1]">
              <PieChart className="w-3 h-3 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. LIFE STAGES SELECTOR BAR */}
      <div className="bg-[#1864ab] p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t-[2.5px] border-slate-900">
        {LIFE_STAGES.map((stage) => {
          const isCurrentAgeInStage = character.age >= stage.minAge && character.age <= stage.maxAge;
          const isSelected = activeStage === stage.id;

          return (
            <button
              key={stage.id}
              onClick={() => onSelectStage?.(stage.id)}
              className={`
                flex-1 min-w-[70px] py-1 px-1.5 rounded-xl text-center flex items-center justify-center gap-1 text-[11px] transition-all cursor-pointer select-none
                ${isSelected
                  ? 'bg-white text-blue-900 border-2 border-slate-900 shadow-[1.5px_2px_0_#0f172a] font-black scale-[1.02]'
                  : isCurrentAgeInStage
                  ? 'bg-blue-500/80 text-white font-extrabold border border-blue-300/40 hover:bg-blue-500'
                  : 'text-blue-200/80 font-bold hover:bg-blue-700/50 hover:text-white'
                }
              `}
            >
              <span className="text-xs">{stage.icon}</span>
              <span className="truncate">{stage.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

