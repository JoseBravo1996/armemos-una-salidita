import type { Event } from '@/app/data/mockData';

export type MapPinCategory = Event['category'];

/** Deduce categoría visual del pin a partir de OSM / Mapbox en `places`. */
export function inferPlacePinCategory(
  sourcePayload: Record<string, unknown> | null | undefined,
  mapboxFeatureTypes: string[] | null | undefined
): MapPinCategory {
  let amenity = '';
  if (sourcePayload && typeof sourcePayload === 'object') {
    const a = sourcePayload['amenity'];
    if (typeof a === 'string') amenity = a;
  }
  if (!amenity && mapboxFeatureTypes?.length) {
    const t = mapboxFeatureTypes.find((x) => x.startsWith('amenity:'));
    if (t) amenity = t.slice('amenity:'.length);
  }

  const leisure = sourcePayload?.['leisure'];
  if (typeof leisure === 'string') {
    if (leisure === 'park' || leisure === 'garden' || leisure === 'nature_reserve') return 'park';
    if (
      leisure === 'sports_centre' ||
      leisure === 'pitch' ||
      leisure === 'playground' ||
      leisure === 'stadium'
    ) {
      return 'activity';
    }
  }

  const tourism = sourcePayload?.['tourism'];
  if (tourism === 'zoo' || tourism === 'theme_park') return 'activity';

  const map: Record<string, MapPinCategory> = {
    bar: 'bar',
    pub: 'bar',
    nightclub: 'bar',
    biergarten: 'bar',
    restaurant: 'restaurant',
    fast_food: 'restaurant',
    cafe: 'cafe',
    coffee_shop: 'cafe',
    gym: 'activity',
    sports_centre: 'activity',
    fitness_centre: 'activity',
  };
  if (amenity in map) return map[amenity];
  return 'other';
}
