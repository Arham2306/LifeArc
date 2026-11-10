import cat from '../illustrations/pet_cat.webp';
import dog from '../illustrations/pet_dog.webp';
import rabbit from '../illustrations/pet_rabbit.webp';

const ILLUSTRATIONS: Record<string, string> = {
  pet_dog: dog,
  pet_cat: cat,
  pet_rabbit: rabbit,
};

export function petIllustration(species: string): string | null {
  return ILLUSTRATIONS[species] ?? null;
}
