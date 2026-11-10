import React from 'react';
import {
  Users,
  Heart,
  Home,
  ShoppingBag,
  Stethoscope,
  ShieldAlert,
  Award,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { CharacterProfile } from '../../types/game';

interface MenuScreenProps {
  character: CharacterProfile;
  onOpenRelationships: () => void;
  onOpenRomance?: () => void;
  onOpenAssets?: () => void;
}

interface MenuTile {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  badgeLabel?: string;
  badgeVariant?: 'emerald' | 'amber' | 'sky' | 'slate' | 'rose';
  isAvailable: boolean;
  onClick?: () => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({
  character,
  onOpenRelationships,
  onOpenRomance,
  onOpenAssets,
}) => {
  const isRomanceUnlocked = character.age >= 16;
  const isAssetsUnlocked = character.age >= 18;

  const menuTiles: MenuTile[] = [
    {
      id: 'relationships',
      title: 'Relationships',
      subtitle: 'Parents, siblings, and friends across your life',
      icon: <Users className="w-5 h-5 stroke-[2.5] text-amber-950" />,
      iconBg: 'bg-amber-400',
      isAvailable: true,
      onClick: onOpenRelationships,
    },
    {
      id: 'romance',
      title: 'Romance & Dating',
      subtitle: isRomanceUnlocked
        ? 'Dating apps, partners, proposals, marriage, and kids'
        : 'Unlocks at age 16 (Dating, partners & romance)',
      icon: <Heart className="w-5 h-5 stroke-[2.5] text-rose-950" />,
      iconBg: isRomanceUnlocked ? 'bg-rose-400' : 'bg-rose-300',
      badgeLabel: isRomanceUnlocked ? undefined : 'Age 16',
      badgeVariant: isRomanceUnlocked ? undefined : 'slate',
      isAvailable: isRomanceUnlocked,
      onClick: isRomanceUnlocked ? onOpenRomance : undefined,
    },
    {
      id: 'assets',
      title: 'Assets & Real Estate',
      subtitle: 'Houses, luxury cars, private jets, and investments',
      icon: <Home className="w-5 h-5 stroke-[2.5] text-sky-950" />,
      iconBg: isAssetsUnlocked ? 'bg-sky-400' : 'bg-sky-300',
      badgeLabel: isAssetsUnlocked ? undefined : 'Age 18',
      badgeVariant: isAssetsUnlocked ? undefined : 'slate',
      isAvailable: isAssetsUnlocked,
      onClick: isAssetsUnlocked ? onOpenAssets : undefined,
    },
    {
      id: 'shopping',
      title: 'Shopping & Lifestyle',
      subtitle: 'Designer fashion, electronics, pets, and vacations',
      icon: <ShoppingBag className="w-5 h-5 stroke-[2.5] text-amber-950" />,
      iconBg: 'bg-amber-300',
      badgeLabel: 'Module 9',
      badgeVariant: 'slate',
      isAvailable: false,
    },
    {
      id: 'health',
      title: 'Doctor & Healthcare',
      subtitle: 'Medical checkups, mental health therapy, and plastic surgery',
      icon: <Stethoscope className="w-5 h-5 stroke-[2.5] text-emerald-950" />,
      iconBg: 'bg-emerald-400',
      badgeLabel: 'Module 10',
      badgeVariant: 'slate',
      isAvailable: false,
    },
    {
      id: 'crime',
      title: 'Crime & High Stakes',
      subtitle: 'Pickpocketing, bank heists, illicit deals, and prison life',
      icon: <ShieldAlert className="w-5 h-5 stroke-[2.5] text-violet-950" />,
      iconBg: 'bg-violet-400',
      badgeLabel: 'Module 11',
      badgeVariant: 'slate',
      isAvailable: false,
    },
    {
      id: 'identity',
      title: 'Identity & Heritage',
      subtitle: 'Diploma credentials, career records, family tree, and wills',
      icon: <Award className="w-5 h-5 stroke-[2.5] text-indigo-950" />,
      iconBg: 'bg-indigo-400',
      badgeLabel: 'Module 12',
      badgeVariant: 'slate',
      isAvailable: false,
    },
  ];

  return (
    <div className="p-4 flex flex-col gap-3.5 bg-white min-h-[480px]">
      {/* Header Banner */}
      <div className="rounded-2xl bg-amber-50 border-2 border-slate-900 p-3.5 flex items-center justify-between shadow-[2px_2px_0_#0f172a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 border-2 border-slate-900 flex items-center justify-center text-lg shadow-[1.5px_1.5px_0_#0f172a]">
            📱
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-950 leading-tight">
              Activities & Menu
            </h2>
            <p className="text-[11px] font-bold text-slate-600">
              Select an activity or life domain to interact
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-black text-amber-800 bg-amber-200/70 px-2.5 py-1 rounded-full border border-amber-400">
          <Sparkles className="w-3 h-3 stroke-[2.5]" />
          <span>Hub</span>
        </div>
      </div>

      {/* Directory Tiles */}
      <div className="flex flex-col gap-2.5">
        {menuTiles.map((tile) => {
          if (tile.isAvailable) {
            return (
              <button
                key={tile.id}
                type="button"
                onClick={tile.onClick}
                className="w-full text-left p-3.5 rounded-2xl border-2 border-slate-900 bg-white hover:bg-amber-50/70 transition-all shadow-[2px_2.5px_0_#0f172a] hover:translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl border-2 border-slate-900 flex items-center justify-center shadow-[1.5px_1.5px_0_#0f172a] ${tile.iconBg}`}
                  >
                    {tile.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-950 group-hover:text-amber-950">
                      {tile.title}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 line-clamp-1">
                      {tile.subtitle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pl-2">
                  {tile.badgeLabel && (
                    <Badge variant={tile.badgeVariant || 'emerald'} size="xs">
                      {tile.badgeLabel}
                    </Badge>
                  )}
                  <ChevronRight className="w-4 h-4 stroke-[3] text-slate-900 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          }

          return (
            <div
              key={tile.id}
              className="w-full text-left p-3.5 rounded-2xl border-2 border-slate-300 bg-slate-50/80 flex items-center justify-between opacity-75"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl border-2 border-slate-400/80 flex items-center justify-center grayscale opacity-80 ${tile.iconBg}`}
                >
                  {tile.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-700">
                    {tile.title}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 line-clamp-1">
                    {tile.subtitle}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 pl-2">
                {tile.badgeLabel && (
                  <Badge variant={tile.badgeVariant || 'slate'} size="xs">
                    {tile.badgeLabel}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

