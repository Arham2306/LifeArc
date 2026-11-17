export type PropertyType = 'studio' | 'condo' | 'house' | 'luxury_house';

export interface PropertyMortgage {
  originalPrincipal: number;
  principal: number;
  annualInterestRate: number;
  annualPrincipalPayment: number;
}

export interface OwnedProperty {
  id: string;
  catalogId: string;
  type: PropertyType;
  name: string;
  city: string;
  purchasePrice: number;
  purchaseAge: number;
  marketValue: number;
  mortgage: PropertyMortgage | null;
}

/**
 * `properties` keeps every saved entry. Valid homes are read from it.
 * Malformed entries stay in place so a later purchase or sale does not delete them.
 */
export interface PlayerAssetPortfolio {
  properties: unknown[];
}

export interface PropertyListing {
  id: string;
  name: string;
  type: PropertyType;
  city: string;
  purchasePrice: number;
  annualMaintenance: number;
}

/**
 * Canonical living arrangement / shelter source.
 * Kept separate from property ownership so renting or campus housing can satisfy
 * independent living later without requiring an owned deed in `assets.properties`.
 */
export type HousingArrangement =
  | 'with_parents'
  | 'owned_property'
  | 'rented_accommodation'
  | 'university_accommodation'
  | 'unhoused';

/** Coarse housing compliance state derived from HousingArrangement. */
export type HousingStatus = 'with_parents' | 'housed' | 'unhoused';

export type HousingNoticeKind =
  | 'age18_independence'
  | 'age20_final_warning'
  | 'age21_moved_out';

export interface PlayerHousingState {
  /** Sole canonical persisted living arrangement. */
  arrangement: HousingArrangement;
  /** Age at which parents require independent housing (default 21). */
  moveOutDeadlineAge: number;
  /** Last player age already evaluated by evaluateHousingForYear (idempotency guard). */
  lastProgressedAge?: number;
  /** Consecutive unhoused years accrued since move-out (resets to 0 when housed). */
  yearsUnhoused: number;
  /** Age when the player first moved out or lost housing without an independent arrangement. */
  movedOutAtAge?: number;
  /** Persisted one-time notification delivery flags. */
  age18PromptShown: boolean;
  age19ReminderLogged: boolean;
  age20WarningShown: boolean;
  movedOutPromptShown: boolean;
  /** Queued housing notice modal until acknowledged by UI. */
  pendingNotice?: HousingNoticeKind | null;
}
