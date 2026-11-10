export type HobbyId = 'gaming' | 'music';

export type PossessionKind = 'durable' | 'consumable';

export type PossessionStatus = 'owned' | 'read';

export type CatalogGroup = 'reading' | 'electronics' | 'music';

export type EquipmentTier = 'starter' | 'upgrade';

export interface PossessionListing {
  id: string;
  name: string;
  kind: PossessionKind;
  group: CatalogGroup;
  price: number;
  hobby: HobbyId | null;
  tier: EquipmentTier | null;
  replaces: string | null;
  purpose: string;
  description: string;
}

export interface OwnedPossession {
  id: string;
  catalogId: string;
  kind: PossessionKind;
  purchasePrice: number;
  purchaseAge: number;
  status: PossessionStatus;
}

export interface HobbyRecord {
  id: HobbyId;
  level: number;
  lastActionAge: number | null;
}

/** Possessions and hobbies stay off the property portfolio and out of net worth. */
export interface PlayerLifestyle {
  possessions: unknown[];
  hobbies: unknown[];
  readingGainAge?: number | null;
}
