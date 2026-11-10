import type { PropertyListing } from '../types';

export const PROPERTY_CATALOG: readonly PropertyListing[] = [
  {
    id: 'studio_austin_loft',
    name: 'Austin Loft Studio',
    type: 'studio',
    city: 'Austin',
    purchasePrice: 62000,
    annualMaintenance: 1200,
  },
  {
    id: 'studio_chicago_walkup',
    name: 'Chicago Walk-Up Studio',
    type: 'studio',
    city: 'Chicago',
    purchasePrice: 85000,
    annualMaintenance: 1500,
  },
  {
    id: 'condo_houston_bay',
    name: 'Houston Bay Condo',
    type: 'condo',
    city: 'Houston',
    purchasePrice: 145000,
    annualMaintenance: 2400,
  },
  {
    id: 'condo_seattle_ridge',
    name: 'Seattle Ridge Condo',
    type: 'condo',
    city: 'Seattle',
    purchasePrice: 210000,
    annualMaintenance: 3200,
  },
  {
    id: 'house_miami_grove',
    name: 'Miami Grove House',
    type: 'house',
    city: 'Miami',
    purchasePrice: 275000,
    annualMaintenance: 4000,
  },
  {
    id: 'house_boston_triple',
    name: 'Boston Triple-Decker',
    type: 'house',
    city: 'Boston',
    purchasePrice: 360000,
    annualMaintenance: 5200,
  },
  {
    id: 'house_los_angeles_bungalow',
    name: 'Los Angeles Bungalow',
    type: 'house',
    city: 'Los Angeles',
    purchasePrice: 480000,
    annualMaintenance: 6800,
  },
  {
    id: 'luxury_san_francisco_view',
    name: 'San Francisco View House',
    type: 'luxury_house',
    city: 'San Francisco',
    purchasePrice: 750000,
    annualMaintenance: 11000,
  },
  {
    id: 'luxury_new_york_penthouse',
    name: 'New York Penthouse',
    type: 'luxury_house',
    city: 'New York',
    purchasePrice: 1200000,
    annualMaintenance: 18000,
  },
  {
    id: 'luxury_miami_estate',
    name: 'Miami Waterfront Estate',
    type: 'luxury_house',
    city: 'Miami',
    purchasePrice: 1850000,
    annualMaintenance: 26000,
  },
];

const LISTINGS_BY_ID = new Map(PROPERTY_CATALOG.map((listing) => [listing.id, listing]));

export function getPropertyListing(catalogId: string): PropertyListing | undefined {
  return LISTINGS_BY_ID.get(catalogId);
}
