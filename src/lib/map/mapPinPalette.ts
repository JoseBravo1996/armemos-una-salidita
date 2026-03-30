import type { ExpressionSpecification } from 'mapbox-gl';
import type { MapPinCategory } from './inferPlacePinCategory';

/** Colores de relleno del pin (puntos no agrupados), alineados con EventCard. */
export const MAP_PIN_FILL: Record<MapPinCategory, string> = {
  bar: '#a855f7',
  restaurant: '#f97316',
  park: '#22c55e',
  cafe: '#f59e0b',
  activity: '#3b82f6',
  other: '#64748b',
};

export function categoryCircleColorExpr(): ExpressionSpecification {
  return [
    'match',
    ['get', 'category'],
    'bar',
    MAP_PIN_FILL.bar,
    'restaurant',
    MAP_PIN_FILL.restaurant,
    'park',
    MAP_PIN_FILL.park,
    'cafe',
    MAP_PIN_FILL.cafe,
    'activity',
    MAP_PIN_FILL.activity,
    MAP_PIN_FILL.other,
  ];
}
