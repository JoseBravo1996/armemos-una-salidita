import type { MapboxGeocodeFeatureDTO } from '@/types/mapboxGeocode';

export function buildMapboxGeocodeSearchUrl(query: string, accessToken: string): string {
  const path = encodeURIComponent(query.trim());
  const token = encodeURIComponent(accessToken.trim());
  return (
    'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
    path +
    '.json?access_token=' +
    token +
    '&limit=8&language=es' +
    '&types=poi,address,place,locality,neighborhood' +
    '&proximity=-58.3816,-34.6037' +
    '&country=AR'
  );
}

type MapboxRawFeature = {
  id: string;
  place_name?: string;
  text?: string;
  center?: [number, number];
  geometry?: { type: string; coordinates: [number, number] };
  place_type?: string[];
};

export function mapGeocodeJsonToFeatures(data: unknown): MapboxGeocodeFeatureDTO[] {
  const features = (data as { features?: MapboxRawFeature[] })?.features ?? [];
  return features
    .map((f) => {
      const lng = f.center?.[0] ?? f.geometry?.coordinates?.[0];
      const lat = f.center?.[1] ?? f.geometry?.coordinates?.[1];
      if (lng == null || lat == null) return null;
      return {
        mapboxId: f.id,
        label: f.place_name ?? f.text ?? '',
        latitude: lat,
        longitude: lng,
        placeTypes: f.place_type ?? [],
      };
    })
    .filter((x): x is MapboxGeocodeFeatureDTO => x != null && x.label.length > 0);
}
