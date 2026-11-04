import type { StatEffects, StatKey } from '../types/game'

interface StatMeta {
  label: string;
  icon: string;
  barClass: string;
}

/** Single source of truth for how each stat is labelled and displayed. */
export const STAT_META: Record<StatKey, StatMeta> = {
  health: {
    label: 'Health',
    icon: '❤️',
    barClass: 'bg-gradient-to-r from-rose-500 to-red-400',
  },
  happiness: {
    label: 'Happiness',
    icon: '😄',
    barClass: 'bg-gradient-to-r from-amber-400 to-yellow-300',
  },
  smarts: {
    label: 'Smarts',
    icon: '💡',
    barClass: 'bg-gradient-to-r from-cyan-400 to-blue-500',
  },
  looks: {
    label: 'Looks',
    icon: '✨',
    barClass: 'bg-gradient-to-r from-pink-400 to-fuchsia-500',
  },
  karma: {
    label: 'Karma',
    icon: '😇',
    barClass: 'bg-gradient-to-r from-violet-400 to-purple-500',
  },
};

/** Stats shown as bars on the main screen. Karma stays hidden, like in classic life sims. */
export const VISIBLE_STATS: StatKey[] = ['health', 'happiness', 'smarts', 'looks'];

export type EffectKey = keyof StatEffects;

/** Labels and icons for non-core effect chips (cash, parent relationships, school stats). */
export const EXTRA_EFFECT_META: Record<Exclude<EffectKey, StatKey>, { label: string; icon: string }> = {
  cash: { label: 'Cash', icon: '💵' },
  parents: { label: 'Parents', icon: '👨‍👩‍👧' },
  fatherRelationship: { label: 'Dad', icon: '👨' },
  motherRelationship: { label: 'Mom', icon: '👩' },
  grades: { label: 'Grades', icon: '📚' },
  popularity: { label: 'Popularity', icon: '⭐' },
  jobPerformance: { label: 'Performance', icon: '📈' },
  businessBrand: { label: 'Brand', icon: '⭐' },
  businessMorale: { label: 'Morale', icon: '👥' },
  businessQuality: { label: 'Quality', icon: '⚙️' },
  businessTreasury: { label: 'Treasury', icon: '🏢' },
};

/** Order in which stat changes are listed (e.g. in event results). */
export const EFFECT_ORDER: EffectKey[] = [
  'businessBrand',
  'businessTreasury',
  'businessQuality',
  'businessMorale',
  'jobPerformance',
  'grades',
  'popularity',
  'health',
  'happiness',
  'smarts',
  'looks',
  'karma',
  'parents',
  'fatherRelationship',
  'motherRelationship',
  'cash',
];
