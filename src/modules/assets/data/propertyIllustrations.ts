import austin from '../illustrations/studio_austin_loft.webp';
import chicago from '../illustrations/studio_chicago_walkup.webp';
import houston from '../illustrations/condo_houston_bay.webp';
import seattle from '../illustrations/condo_seattle_ridge.webp';
import miamiGrove from '../illustrations/house_miami_grove.webp';
import boston from '../illustrations/house_boston_triple.webp';
import bungalow from '../illustrations/house_los_angeles_bungalow.webp';
import sanFrancisco from '../illustrations/luxury_san_francisco_view.webp';
import penthouse from '../illustrations/luxury_new_york_penthouse.webp';
import estate from '../illustrations/luxury_miami_estate.webp';
import { PROPERTY_ILLUSTRATION_IDS, propertyIllustrationId } from './illustrationIds';

const ILLUSTRATIONS: Record<(typeof PROPERTY_ILLUSTRATION_IDS)[number], string> = {
  studio_austin_loft: austin,
  studio_chicago_walkup: chicago,
  condo_houston_bay: houston,
  condo_seattle_ridge: seattle,
  house_miami_grove: miamiGrove,
  house_boston_triple: boston,
  house_los_angeles_bungalow: bungalow,
  luxury_san_francisco_view: sanFrancisco,
  luxury_new_york_penthouse: penthouse,
  luxury_miami_estate: estate,
};

/** Catalog art, or null when the id is unknown or the file is unavailable. */
export function propertyIllustration(catalogId: string): string | null {
  const id = propertyIllustrationId(catalogId);
  if (!id) return null;
  return ILLUSTRATIONS[id] ?? null;
}
