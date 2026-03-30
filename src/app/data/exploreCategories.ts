import type { Event } from './mockData';

/** Mismo criterio que chips de Descubrir y MapView (`all` = sin filtro por tipo). */
export type ExploreCategoryFilterId = 'all' | Event['category'];

export const EXPLORE_CATEGORY_CHIPS = [
  { id: 'all', label: 'Todos', emoji: '✨' },
  { id: 'bar', label: 'Bares', emoji: '🍺' },
  { id: 'restaurant', label: 'Restaurantes', emoji: '🍽️' },
  { id: 'park', label: 'Parques', emoji: '🌳' },
  { id: 'cafe', label: 'Cafés', emoji: '☕' },
  { id: 'activity', label: 'Actividades', emoji: '🎯' },
] as const;

export type ExploreCategoryChipId = (typeof EXPLORE_CATEGORY_CHIPS)[number]['id'];

/** Próximos vs pasados en listados (Descubrir / Home). */
export type ExploreTimeFilterId = 'upcoming' | 'past';

export const EXPLORE_TIME_TABS = [
  { id: 'upcoming' as const, label: 'Próximos' },
  { id: 'past' as const, label: 'Pasados' },
] as const;

/** Términos extra para buscar por tipo (texto libre alineado al mock / futura API). */
export const CATEGORY_SEARCH_SYNONYMS: Record<Event['category'], string> = {
  bar: 'bar bares birra cerveza after barra',
  restaurant: 'restaurante restorán comida cena almuerzo gastronomía tour',
  park: 'parque plaza verde picnic aire libre',
  cafe: 'café cafe cafeteria coffee laptop trabajo',
  activity: 'actividad deporte encuentro clase yoga juegos',
  other: 'evento otro',
};
