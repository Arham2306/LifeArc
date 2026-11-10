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
