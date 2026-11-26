import React from 'react';
import {
  Users,
  Heart,
  Home,
  ShoppingBag,
  PawPrint,
  Stethoscope,
  ShieldAlert,
  Award,
  ChevronRight,
  Sparkles,
  HeartPulse,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { CharacterProfile } from '../../types/game';
import { ACTIVITIES_MIN_AGE } from '../../modules/activities/data/activitiesCatalog';
import { CRIME_MENU_MIN_AGE } from '../../modules/crime/components/crimeDisplay';
import {
  hasPendingCourtCase,
  isCurrentlyIncarcerated,
  isOnProbation,
} from '../../modules/crime/services/crimeSelectors';
import { getHousingSummary } from '../../modules/assets/services/housingService';
import { hasActiveRomanticPartner } from '../../modules/romance/services/romanceService';

interface MenuScreenProps {
  character: CharacterProfile;
  onOpenRelationships: () => void;
  onOpenRomance?: () => void;
  onOpenAssets?: () => void;
  onOpenLifestyle?: () => void;
  onOpenPets?: () => void;
  onOpenHealthcare?: () => void;
  onOpenActivities?: () => void;
  onOpenCrime?: () => void;
  onOpenIdentity?: () => void;
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
  onOpenLifestyle,
  onOpenPets,
  onOpenHealthcare,
  onOpenActivities,
  onOpenCrime,
  onOpenIdentity,
}) => {
  const isRomanceUnlocked = character.age >= 16;
  const isAssetsUnlocked = character.age >= 18;
  const isLifestyleUnlocked = character.age >= 16;
  const isPetsUnlocked = character.age >= 16;
  const isHealthcareUnlocked = character.age >= 6;
  const isCrimeUnlocked = character.age >= CRIME_MENU_MIN_AGE;
  const isCrimeIncarcerated = isCurrentlyIncarcerated(character);
  const isActivitiesUnlocked = character.age >= ACTIVITIES_MIN_AGE;
  const isActivitiesAccessible = isActivitiesUnlocked && !isCrimeIncarcerated;
  const isCrimePendingCourt = hasPendingCourtCase(character);
  const isCrimeOnProbation = isOnProbation(character);
  const hasPartner = hasActiveRomanticPartner(character);
  const isRomanceLockedByPrison = isCrimeIncarcerated && !hasPartner;
  const isRomanceAccessible = isRomanceUnlocked && !isRomanceLockedByPrison;
  const housingSummary = getHousingSummary(character);

  const assetsBadgeLabel = !isAssetsUnlocked
    ? 'Age 18'
    : housingSummary.status === 'unhoused'
      ? 'Unhoused!'
      : housingSummary.status === 'with_parents'
        ? housingSummary.yearsUntilDeadline <= 1
          ? '1 Year Left'
          : `Move by ${housingSummary.moveOutDeadlineAge}`
        : 'Housed';

  const assetsBadgeVariant: MenuTile['badgeVariant'] = !isAssetsUnlocked
    ? 'slate'
    : housingSummary.status === 'unhoused'
      ? 'rose'
      : housingSummary.status === 'with_parents'
        ? 'amber'
        : 'emerald';

  const crimeBadgeLabel = !isCrimeUnlocked
    ? `Age ${CRIME_MENU_MIN_AGE}`
    : isCrimePendingCourt
      ? 'Court Pending'
      : isCrimeIncarcerated
        ? 'In Prison'
        : isCrimeOnProbation
          ? 'Probation'
          : 'Unlocked';

  const crimeBadgeVariant: MenuTile['badgeVariant'] = !isCrimeUnlocked
    ? 'slate'
    : isCrimePendingCourt || isCrimeIncarcerated
      ? 'rose'
      : isCrimeOnProbation
        ? 'amber'
        : 'emerald';

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
      subtitle: !isRomanceUnlocked
        ? 'Unlocks at age 16 (Dating, partners & romance)'
        : isRomanceLockedByPrison
          ? 'Unavailable while serving a prison sentence'
          : isCrimeIncarcerated
            ? 'In custody — phone calls, letters, or breakup/divorce only'
            : 'Dating apps, partners, proposals, marriage, and kids',
      icon: <Heart className="w-5 h-5 stroke-[2.5] text-rose-950" />,
      iconBg: isRomanceAccessible ? 'bg-rose-400' : 'bg-rose-300',
      badgeLabel: !isRomanceUnlocked
        ? 'Age 16'
        : isRomanceLockedByPrison
          ? 'In Prison'
          : isCrimeIncarcerated
            ? 'Calls Only'
            : undefined,
      badgeVariant: !isRomanceUnlocked
        ? 'slate'
        : isRomanceLockedByPrison
          ? 'rose'
          : isCrimeIncarcerated
            ? 'amber'
            : undefined,
      isAvailable: isRomanceAccessible,
      onClick: isRomanceAccessible ? onOpenRomance : undefined,
    },
    {
      id: 'assets',
      title: 'Assets & Real Estate',
      subtitle: isAssetsUnlocked
        ? housingSummary.status === 'unhoused'
          ? 'Unhoused — purchase a home to end yearly Health & Happiness loss'
          : housingSummary.status === 'with_parents'
            ? `Living with parents — buy a home before age ${housingSummary.moveOutDeadlineAge}`
            : 'Owned homes, market appreciation, and property management'
        : 'Unlocks at age 18 (Buy homes & real estate)',
      icon: <Home className="w-5 h-5 stroke-[2.5] text-sky-950" />,
      iconBg: isAssetsUnlocked ? 'bg-sky-400' : 'bg-sky-300',
      badgeLabel: assetsBadgeLabel,
      badgeVariant: assetsBadgeVariant,
      isAvailable: isAssetsUnlocked,
      onClick: isAssetsUnlocked ? onOpenAssets : undefined,
    },
    {
      id: 'shopping',
      title: 'Shopping & Lifestyle',
      subtitle: 'Books, games, and music',
      icon: <ShoppingBag className="w-5 h-5 stroke-[2.5] text-amber-950" />,
      iconBg: isLifestyleUnlocked ? 'bg-amber-400' : 'bg-amber-300',
      badgeLabel: isLifestyleUnlocked ? undefined : 'Age 16',
      badgeVariant: isLifestyleUnlocked ? undefined : 'slate',
      isAvailable: isLifestyleUnlocked,
      onClick: isLifestyleUnlocked ? onOpenLifestyle : undefined,
    },
    {
      id: 'pets',
      title: 'Pets',
      subtitle: 'A companion who stays.',
      icon: <PawPrint className="w-5 h-5 stroke-[2.5] text-orange-950" />,
      iconBg: isPetsUnlocked ? 'bg-orange-400' : 'bg-orange-300',
      badgeLabel: isPetsUnlocked ? undefined : 'Age 16',
      badgeVariant: isPetsUnlocked ? undefined : 'slate',
      isAvailable: isPetsUnlocked,
      onClick: isPetsUnlocked ? onOpenPets : undefined,
    },
    {
      id: 'health',
      title: 'Doctor & Healthcare',
      subtitle: isHealthcareUnlocked
        ? 'Routine checkups, condition diagnoses, and medical treatments'
        : 'Unlocks at age 6 (Checkups, diagnoses, and medical treatments)',
      icon: <Stethoscope className="w-5 h-5 stroke-[2.5] text-emerald-950" />,
      iconBg: isHealthcareUnlocked ? 'bg-emerald-400' : 'bg-emerald-300',
      badgeLabel: isHealthcareUnlocked ? undefined : 'Age 6',
      badgeVariant: isHealthcareUnlocked ? undefined : 'slate',
      isAvailable: isHealthcareUnlocked,
      onClick: isHealthcareUnlocked ? onOpenHealthcare : undefined,
    },
    {
      id: 'activities',
      title: 'Everyday Activities',
      subtitle: !isActivitiesUnlocked
        ? `Unlocks at age ${ACTIVITIES_MIN_AGE} (Fitness, meditation, martial arts, and diet)`
        : isCrimeIncarcerated
          ? 'Unavailable while serving a prison sentence'
          : 'Mind & body, surgery, licenses, travel, nightlife & legal',
      icon: <HeartPulse className="w-5 h-5 stroke-[2.5] text-teal-950" />,
      iconBg: isActivitiesAccessible ? 'bg-teal-400' : 'bg-teal-300',
      badgeLabel: !isActivitiesUnlocked
        ? `Age ${ACTIVITIES_MIN_AGE}`
        : isCrimeIncarcerated
          ? 'In Prison'
          : undefined,
      badgeVariant: !isActivitiesUnlocked
        ? 'slate'
        : isCrimeIncarcerated
          ? 'rose'
          : undefined,
      isAvailable: isActivitiesAccessible,
      onClick: isActivitiesAccessible ? onOpenActivities : undefined,
    },
    {
      id: 'crime',
      title: 'Crime & High Stakes',
      subtitle: isCrimeUnlocked
        ? isCrimeIncarcerated
          ? 'Manage your sentence, prison actions, appeal, and legal status'
          : 'Pickpocketing, bank heists, illicit deals, and legal defense'
        : `Unlocks at age ${CRIME_MENU_MIN_AGE} (Juvenile & adult crime and legal system)`,
      icon: <ShieldAlert className="w-5 h-5 stroke-[2.5] text-violet-950" />,
      iconBg: 'bg-violet-400',
      badgeLabel: crimeBadgeLabel,
      badgeVariant: crimeBadgeVariant,
      isAvailable: isCrimeUnlocked,
      onClick: isCrimeUnlocked ? onOpenCrime : undefined,
    },
    {
      id: 'identity',
      title: 'Identity & Heritage',
      subtitle: 'Biography, records, family tree, and recorded estates',
      icon: <Award className="w-5 h-5 stroke-[2.5] text-indigo-950" />,
      iconBg: 'bg-indigo-400',
      isAvailable: true,
      onClick: onOpenIdentity,
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

