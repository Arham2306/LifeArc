export const LIFESTYLE_ILLUSTRATION_IDS = [
  'book_plate',
  'computer_home',
  'computer_rig',
  'instrument_keyboard',
  'instrument_piano',
] as const;

export type LifestyleIllustrationId = (typeof LIFESTYLE_ILLUSTRATION_IDS)[number];

const ILLUSTRATION_BY_CATALOG: Record<string, LifestyleIllustrationId> = {
  book_short_stories: 'book_plate',
  book_programming: 'book_plate',
  book_music_life: 'book_plate',
  computer_home: 'computer_home',
  computer_rig: 'computer_rig',
  instrument_keyboard: 'instrument_keyboard',
  instrument_piano: 'instrument_piano',
};

export function lifestyleIllustrationId(catalogId: string): LifestyleIllustrationId | null {
  return ILLUSTRATION_BY_CATALOG[catalogId] ?? null;
}
