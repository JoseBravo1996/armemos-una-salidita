import type { MapboxEventMapFitBounds } from '@/app/components/map/MapboxEventMap';

export type LatLngPoint = { latitude: number; longitude: number };

/** Bounding box con margen en grados (~2–3 km en CABA con 0.02). */
export function lngLatBoundsFromPoints(
  points: LatLngPoint[],
  paddingDeg = 0.022
): MapboxEventMapFitBounds | null {
  if (points.length === 0) return null;

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const p of points) {
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
  }

  if (minLng === maxLng && minLat === maxLat) {
    const d = Math.max(paddingDeg, 0.015);
    return {
      minLng: minLng - d,
      maxLng: maxLng + d,
      minLat: minLat - d,
      maxLat: maxLat + d,
    };
  }

  return {
    minLng: minLng - paddingDeg,
    maxLng: maxLng + paddingDeg,
    minLat: minLat - paddingDeg,
    maxLat: maxLat + paddingDeg,
  };
}
