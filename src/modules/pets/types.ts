export type PetSpeciesId = 'pet_dog' | 'pet_cat' | 'pet_rabbit';

export type PetTemperament = 'playful' | 'shy' | 'steady';

export type PetStatus = 'living' | 'rehomed' | 'memorial';

export type AttachmentBand = 'distant' | 'familiar' | 'close';

export type CareMoment = 'feed' | 'play' | 'vet' | 'neglect';

export interface PetListing {
  id: PetSpeciesId;
  name: string;
  adoptionPrice: number;
  foodPrice: number;
  lifespan: number;
  frailAge: number;
  playActivity: string;
  attachmentGain: number;
  missedYearHealthLoss: number;
}

export interface PetRecord {
  id: string;
  name: string;
  species: PetSpeciesId;
  temperament: PetTemperament;
  petAge: number;
  adoptedAtAge: number;
  health: number;
  attachment: number;
  lastFedAge: number | null;
  lastPlayedAge: number | null;
  lastVetAge: number | null;
  lastMoment: string;
  status: PetStatus;
  closingLine?: string;
  closedAtAge?: number;
}

/** Living, rehomed, and remembered pets. Absent until the first adoption. */
export interface PlayerPets {
  animals: unknown[];
}
