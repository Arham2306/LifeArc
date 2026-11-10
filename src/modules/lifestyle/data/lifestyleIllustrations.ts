import bookPlate from '../illustrations/book_plate.webp';
import computerHome from '../illustrations/computer_home.webp';
import computerRig from '../illustrations/computer_rig.webp';
import keyboard from '../illustrations/instrument_keyboard.webp';
import piano from '../illustrations/instrument_piano.webp';
import { lifestyleIllustrationId, type LifestyleIllustrationId } from './illustrationIds';

const ILLUSTRATIONS: Record<LifestyleIllustrationId, string> = {
  book_plate: bookPlate,
  computer_home: computerHome,
  computer_rig: computerRig,
  instrument_keyboard: keyboard,
  instrument_piano: piano,
};

export function lifestyleIllustration(catalogId: string): string | null {
  const id = lifestyleIllustrationId(catalogId);
  if (!id) return null;
  return ILLUSTRATIONS[id] ?? null;
}
