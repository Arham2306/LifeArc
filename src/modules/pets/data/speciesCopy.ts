import type { PetSpeciesId, PetTemperament } from '../types';

export const SPECIES_BLURB: Record<PetSpeciesId, string> = {
  pet_dog: 'A companion who wants the walk and a place near your feet.',
  pet_cat: 'A companion who keeps their own hours on the floor.',
  pet_rabbit: 'A companion who settles once the grass is quiet.',
};

export const TEMPERAMENT_CHOICES: { id: PetTemperament; label: string; blurb: string }[] = [
  { id: 'playful', label: 'Playful', blurb: 'Warm, and quick to stay close.' },
  { id: 'shy', label: 'Shy', blurb: 'Affection comes more slowly.' },
  { id: 'steady', label: 'Steady', blurb: 'Even-tempered through a thin year.' },
];
