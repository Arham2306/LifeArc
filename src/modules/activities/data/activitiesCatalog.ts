import type {
  DietId,
  DietTemplate,
  MartialArtBeltRank,
  MartialArtId,
  MartialArtTemplate,
  MindBodyActionId,
  MindBodyActionTemplate,
} from '../types';

export const ACTIVITIES_MIN_AGE = 8;
export const DIET_MIN_AGE = 12;
export const MINOR_FREE_CUTOFF_AGE = 16;
export const GYM_MEMBERSHIP_ANNUAL_FEE = 200;
export const MARTIAL_ARTS_LESSON_FEE = 120;
export const MAX_MARTIAL_ARTS_SESSIONS_PER_YEAR = 2;
export const GYM_SECOND_SESSION_STRAIN_CHANCE = 0.15;
export const GYM_SECOND_SESSION_STRAIN_HEALTH_PENALTY = -3;

export const BELT_RANKS: Record<
  MartialArtBeltRank,
  { rank: MartialArtBeltRank; label: string; colorClass: string }
> = {
  0: { rank: 0, label: 'Unranked', colorClass: 'bg-slate-200 text-slate-700 border-slate-400' },
  1: { rank: 1, label: 'White Belt', colorClass: 'bg-white text-slate-800 border-slate-400' },
  2: { rank: 2, label: 'Yellow Belt', colorClass: 'bg-yellow-300 text-yellow-950 border-yellow-600' },
  3: { rank: 3, label: 'Orange Belt', colorClass: 'bg-orange-400 text-orange-950 border-orange-700' },
  4: { rank: 4, label: 'Green Belt', colorClass: 'bg-emerald-400 text-emerald-950 border-emerald-700' },
  5: { rank: 5, label: 'Blue Belt', colorClass: 'bg-sky-400 text-sky-950 border-sky-700' },
  6: { rank: 6, label: 'Brown Belt', colorClass: 'bg-amber-700 text-amber-50 border-amber-950' },
  7: { rank: 7, label: 'Black Belt', colorClass: 'bg-slate-900 text-amber-300 border-amber-500' },
};

export const DIET_CATALOG: readonly DietTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Diet',
    description: 'Balanced everyday meals with no extra annual grocery expense.',
    annualCost: 0,
    healthDelta: 0,
    happinessDelta: 0,
    looksDelta: 0,
    karmaDelta: 0,
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean',
    description: 'Olive oil, fresh produce, and whole grains that steadily support longevity.',
    annualCost: 450,
    healthDelta: 4,
    happinessDelta: 1,
    looksDelta: 0,
    karmaDelta: 0,
  },
  {
    id: 'high_protein',
    name: 'High-Protein Athlete',
    description: 'Lean meats and macros built for athletic recovery and physique.',
    annualCost: 500,
    healthDelta: 3,
    happinessDelta: 0,
    looksDelta: 2,
    karmaDelta: 0,
  },
  {
    id: 'vegetarian',
    name: 'Vegetarian / Vegan',
    description: 'Plant-forward eating that keeps health steady and boosts karma.',
    annualCost: 300,
    healthDelta: 3,
    happinessDelta: 0,
    looksDelta: 0,
    karmaDelta: 2,
  },
  {
    id: 'fast_food',
    name: 'Fast Food',
    description: 'Cheap, comforting, and quick — great for mood, tough on arteries.',
    annualCost: 150,
    healthDelta: -4,
    happinessDelta: 4,
    looksDelta: 0,
    karmaDelta: 0,
  },
  {
    id: 'crash_diet',
    name: 'Extreme Crash Diet',
    description: 'Aggressive calorie restriction that sharpens looks at a steep physical cost.',
    annualCost: 200,
    healthDelta: -5,
    happinessDelta: -2,
    looksDelta: 3,
    karmaDelta: 0,
  },
] as const;

export const MARTIAL_ARTS_CATALOG: readonly MartialArtTemplate[] = [
  {
    id: 'karate',
    name: 'Karate',
    origin: 'Okinawa',
    description: 'Crisp striking fundamentals, discipline, and kata progression.',
  },
  {
    id: 'judo',
    name: 'Judo',
    origin: 'Japan',
    description: 'Leverage, throws, and balance control against stronger opponents.',
  },
  {
    id: 'jiu_jitsu',
    name: 'Jiu-Jitsu',
    origin: 'Brazil / Japan',
    description: 'Ground grappling, joint locks, and calm positional defense.',
  },
  {
    id: 'muay_thai',
    name: 'Muay Thai',
    origin: 'Thailand',
    description: 'High-conditioning clinch work and eight-limb striking.',
  },
  {
    id: 'taekwondo',
    name: 'Taekwondo',
    origin: 'Korea',
    description: 'Explosive footwork, agility, and dynamic high-kick control.',
  },
] as const;

export const MIND_BODY_ACTIONS: readonly MindBodyActionTemplate[] = [
  {
    id: 'walk_jog',
    name: 'Walk / Jog',
    description: 'Get fresh air with a brisk neighborhood run or morning walk.',
    category: 'Body',
    minAge: 8,
    baseCost: 0,
    annualLimit: 1,
    effects: { health: 4, happiness: 2 },
  },
  {
    id: 'meditate',
    name: 'Meditate',
    description: 'Quiet breathing practice to steady stress and clear your headspace.',
    category: 'Mind',
    minAge: 8,
    baseCost: 0,
    annualLimit: 1,
    effects: { happiness: 4, karma: 2 },
  },
  {
    id: 'public_library',
    name: 'Public Library',
    description: 'Spend an afternoon reading reference stacks and sharpening curiosity.',
    category: 'Mind',
    minAge: 8,
    baseCost: 0,
    annualLimit: 1,
    effects: { smarts: 3, happiness: 1 },
  },
  {
    id: 'gym_workout',
    name: 'Gym Workout',
    description: 'Heavy strength and cardio circuit. Pushing a 2nd session risks mild strain.',
    category: 'Body',
    minAge: 12,
    baseCost: 50,
    annualLimit: 2,
    effects: { health: 6, looks: 3, happiness: 2 },
  },
  {
    id: 'salon_haircut',
    name: 'Salon Haircut',
    description: 'Fresh trim and styling from a sharp local stylist.',
    category: 'Self-Care',
    minAge: 14,
    baseCost: 60,
    annualLimit: 1,
    effects: { looks: 4, happiness: 2 },
  },
  {
    id: 'spa_day',
    name: 'Spa Day',
    description: 'Sauna, massage, and skin treatment for a full reset.',
    category: 'Self-Care',
    minAge: 14,
    baseCost: 180,
    annualLimit: 1,
    effects: { happiness: 6, health: 3, looks: 2 },
  },
  {
    id: 'therapy_session',
    name: 'Therapy Session',
    description: 'Structured counseling to work through emotional weight and stress.',
    category: 'Mind',
    minAge: 14,
    baseCost: 200,
    annualLimit: 1,
    effects: { happiness: 12 },
  },
] as const;

export function getDietTemplate(dietId: DietId): DietTemplate {
  return DIET_CATALOG.find((item) => item.id === dietId) ?? DIET_CATALOG[0];
}

export function getMartialArtTemplate(discipline: MartialArtId): MartialArtTemplate | undefined {
  return MARTIAL_ARTS_CATALOG.find((item) => item.id === discipline);
}

export function getMindBodyActionTemplate(
  actionId: MindBodyActionId
): MindBodyActionTemplate | undefined {
  return MIND_BODY_ACTIONS.find((item) => item.id === actionId);
}

export function getBeltRankLabel(rank: MartialArtBeltRank): string {
  return BELT_RANKS[rank].label;
}
