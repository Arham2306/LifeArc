export const PROPERTY_ILLUSTRATION_IDS = [
  'studio_austin_loft',
  'studio_chicago_walkup',
  'condo_houston_bay',
  'condo_seattle_ridge',
  'house_miami_grove',
  'house_boston_triple',
  'house_los_angeles_bungalow',
  'luxury_san_francisco_view',
  'luxury_new_york_penthouse',
  'luxury_miami_estate',
] as const;

export function propertyIllustrationId(
  catalogId: string
): (typeof PROPERTY_ILLUSTRATION_IDS)[number] | null {
  return (PROPERTY_ILLUSTRATION_IDS as readonly string[]).includes(catalogId)
    ? (catalogId as (typeof PROPERTY_ILLUSTRATION_IDS)[number])
    : null;
}
