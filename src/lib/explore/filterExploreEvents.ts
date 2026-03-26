import type { Event } from '@/app/data/mockData';
import type { ExploreCategoryFilterId } from '@/app/data/exploreCategories';
import { CATEGORY_SEARCH_SYNONYMS } from '@/app/data/exploreCategories';

/** Texto comparable en búsquedas: minúsculas, sin tildes, espacios colapsados. */
export function foldSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function buildSearchHaystack(event: Event): string {
  const syn = CATEGORY_SEARCH_SYNONYMS[event.category];
  return foldSearchText(
    [event.title, event.description, event.location, event.date, event.time, syn].join(' ')
  );
}

/**
 * Cada palabra del query debe aparecer en el evento (AND).
 * Comportamiento cercano a búsqueda tipo listado real / futura API.
 */
export function eventMatchesExploreSearch(event: Event, rawQuery: string): boolean {
  const folded = foldSearchText(rawQuery);
  if (!folded) return true;
  const words = folded.split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = buildSearchHaystack(event);
  return words.every((w) => haystack.includes(w));
}

export function filterExploreEvents(
  list: Event[],
  opts: { categoryId: ExploreCategoryFilterId; searchQuery: string }
): Event[] {
  return list.filter((e) => {
    if (opts.categoryId !== 'all' && e.category !== opts.categoryId) return false;
    return eventMatchesExploreSearch(e, opts.searchQuery);
  });
}
