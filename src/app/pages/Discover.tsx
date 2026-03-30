'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Filter } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { EventCard } from '../components/EventCard';
import { MapboxEventMap } from '../components/map/MapboxEventMap';
import {
  EXPLORE_CATEGORY_CHIPS,
  type ExploreCategoryChipId,
  type ExploreTimeFilterId,
} from '../data/exploreCategories';
import { TimeSegmentControl } from '../components/TimeSegmentControl';
import { filterExploreEvents } from '@/lib/explore/filterExploreEvents';
import { isEventInPast } from '@/lib/events/eventSchedule';
import { countEventsInZoneBounds } from '@/lib/events/publicExplore';
import { usePublicExploreData } from '@/hooks/usePublicExploreData';
import { lngLatBoundsFromPoints } from '@/lib/mapbox/boundsFromPoints';
import { fetchPlacesForMap, type PlaceMapRow } from '@/lib/events/publicExplore';
import type { MapboxMapMarker } from '../components/map/MapboxEventMap';
import { startTransition, useEffect, useMemo, useState } from 'react';

function formatResultLabel(count: number, total: number, hasFilters: boolean): string {
  if (total === 0) return 'Sin eventos';
  if (!hasFilters) return `${count} ${count === 1 ? 'evento' : 'eventos'}`;
  if (count === total) return `${count} ${count === 1 ? 'evento' : 'eventos'}`;
  return `${count} de ${total} eventos`;
}

export function Discover() {
  const router = useRouter();
  const { events: allEvents, zones, loading, error, refetch } = usePublicExploreData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExploreCategoryChipId>('all');
  const [timeSegment, setTimeSegment] = useState<ExploreTimeFilterId>('upcoming');
  const [catalogPlaces, setCatalogPlaces] = useState<PlaceMapRow[]>([]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    let cancelled = false;
    void fetchPlacesForMap()
      .then((rows) => {
        if (!cancelled) setCatalogPlaces(rows);
      })
      .catch(() => {
        if (!cancelled) setCatalogPlaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    searchQuery.trim().length > 0 ||
    timeSegment !== 'upcoming';

  const exploreBase = useMemo(
    () =>
      filterExploreEvents(allEvents, {
        categoryId: selectedCategory,
        searchQuery,
        timeFilter: 'all',
      }),
    [allEvents, selectedCategory, searchQuery]
  );

  const segmentTotal = useMemo(() => {
    if (timeSegment === 'past') {
      return exploreBase.filter((e) => isEventInPast(e)).length;
    }
    return exploreBase.filter((e) => !isEventInPast(e)).length;
  }, [exploreBase, timeSegment]);

  const filteredEvents = useMemo(
    () =>
      filterExploreEvents(allEvents, {
        categoryId: selectedCategory,
        searchQuery,
        timeFilter: timeSegment,
      }),
    [allEvents, selectedCategory, searchQuery, timeSegment]
  );

  const eventsForZoneCount = useMemo(
    () =>
      filterExploreEvents(allEvents, {
        categoryId: 'all',
        searchQuery: '',
        timeFilter: 'upcoming',
      }),
    [allEvents]
  );

  const discoverMapMarkers = useMemo((): MapboxMapMarker[] => {
    const eventMs: MapboxMapMarker[] = filteredEvents.map((e) => ({
      id: `evt:${e.id}`,
      latitude: e.latitude,
      longitude: e.longitude,
      kind: 'event',
      category: e.category,
    }));
    const placeMs: MapboxMapMarker[] = catalogPlaces
      .filter((p) => selectedCategory === 'all' || p.pinCategory === selectedCategory)
      .map((p) => ({
        id: `plc:${p.id}`,
        latitude: p.latitude,
        longitude: p.longitude,
        kind: 'place',
        category: p.pinCategory,
      }));
    return [...eventMs, ...placeMs];
  }, [filteredEvents, catalogPlaces, selectedCategory]);

  const discoverMapFitBounds = useMemo(
    () =>
      lngLatBoundsFromPoints(
        discoverMapMarkers.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
        0.04
      ),
    [discoverMapMarkers]
  );

  const discoverMapPinCountLabel = useMemo(() => {
    const nEv = filteredEvents.length;
    const nPl = catalogPlaces.filter(
      (p) => selectedCategory === 'all' || p.pinCategory === selectedCategory
    ).length;
    if (nEv === 0 && nPl === 0) return 'Sin pins con los filtros actuales.';
    const parts: string[] = [];
    if (nEv > 0) parts.push(`${nEv} ${nEv === 1 ? 'evento' : 'eventos'}`);
    if (nPl > 0) parts.push(`${nPl} ${nPl === 1 ? 'lugar' : 'lugares'}`);
    return `${parts.join(' · ')} en el mapa rápido.`;
  }, [filteredEvents, catalogPlaces, selectedCategory]);

  const popularZonesWithCounts = useMemo(
    () =>
      zones.map((zone) => ({
        zone,
        count: countEventsInZoneBounds(eventsForZoneCount, zone),
      })),
    [zones, eventsForZoneCount]
  );

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setTimeSegment('upcoming');
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0f]/80 backdrop-blur-lg border-b border-[#2a2a3a]">
        <div className="max-w-lg mx-auto px-6 py-4">
          <h1 className="text-2xl mb-4">Descubrir</h1>

          {error && (
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              <p className="mb-2">{error}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="text-red-100 underline underline-offset-2"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, barrio, tipo de plan…"
              autoComplete="off"
              className="w-full pl-12 pr-12 py-3 rounded-2xl bg-[#16161d] border border-[#2a2a3a] text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={clearFilters}
              title="Limpiar filtros"
              aria-label="Limpiar búsqueda y categoría"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 hover:text-purple-400 transition-colors disabled:opacity-30"
              disabled={!hasActiveFilters}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-6">
        <TimeSegmentControl
          value={timeSegment}
          onChange={setTimeSegment}
          className="mb-5"
        />

        {/* Categories — mismos ids que MapView y categoría en Supabase */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
          {EXPLORE_CATEGORY_CHIPS.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={`flex touch-manipulation items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 transition-colors duration-150 active:opacity-90 ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'border border-[#2a2a3a] bg-[#16161d] text-gray-300 hover:border-purple-500'
              }`}
            >
              <span aria-hidden>{category.emoji}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Featured Section */}
        <div className="mb-8">
          <div className="mb-2 flex items-end justify-between gap-2">
            <h2 className="text-xl">Destacados en el mapa</h2>
            {hasActiveFilters && (
              <p className="text-xs text-gray-500 shrink-0">Misma vista que la lista</p>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">{discoverMapPinCountLabel}</p>

          {/* Mapa rápido: misma lista filtrada que abajo */}
          <div className="relative mb-4 h-48 overflow-hidden rounded-3xl border border-purple-500/30 bg-[#0a0a0f]">
            {loading && (
              <div className="absolute inset-0 z-[5] flex items-center justify-center bg-[#0a0a0f]/80 text-xs text-gray-500">
                Cargando mapa…
              </div>
            )}
            <MapboxEventMap
              accessToken={mapboxToken}
              markers={discoverMapMarkers}
              embed
              fitBounds={discoverMapMarkers.length > 0 ? discoverMapFitBounds : null}
              onMarkerClick={(id) => {
                startTransition(() => {
                  if (id.startsWith('plc:')) {
                    router.push(`/map?place=${encodeURIComponent(id.slice(4))}`);
                    return;
                  }
                  const raw = id.startsWith('evt:') ? id.slice(4) : id;
                  router.push(`/map?event=${encodeURIComponent(raw)}`);
                });
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-3 pt-8">
              <Link
                href="/map"
                prefetch
                scroll={false}
                className="pointer-events-auto touch-manipulation rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-opacity duration-150 active:opacity-90"
              >
                Ver mapa completo
              </Link>
            </div>
          </div>
        </div>

        {/* Events list */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="text-xl shrink-0">Eventos disponibles</h2>
            <span className="text-sm text-gray-500 text-right">
              {formatResultLabel(filteredEvents.length, segmentTotal, hasActiveFilters)}
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-[#2a2a3a] bg-[#16161d]/50 px-6 py-10 text-center">
              <p className="text-gray-400 mb-2">No hay eventos que coincidan.</p>
              <p className="text-sm text-gray-500 mb-4">
                {timeSegment === 'past'
                  ? 'No hay eventos pasados con estos filtros. Probá “Próximos” o limpiá filtros.'
                  : 'Probá otras palabras, otra categoría, la pestaña “Pasados”, o limpiá filtros.'}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-purple-500/50 px-4 py-2 text-sm text-purple-300 hover:bg-purple-500/10 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div key={event.id}>
                  <EventCard
                    event={event}
                    onClick={() =>
                      startTransition(() => {
                        router.push(`/event/${event.id}`);
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lugares populares: bounds en Supabase; tap abre el mapa encuadrado en la zona */}
        <div className="mt-8">
          <h2 className="text-xl mb-1">Lugares populares</h2>
          <p className="text-sm text-gray-500 mb-4">
            Tap para abrir el mapa centrado en esa zona (según bounding box en base de datos).
          </p>
          <div className="grid grid-cols-2 gap-4">
            {popularZonesWithCounts.map(({ zone, count }) => (
              <Link
                key={zone.id}
                href={`/map?zone=${encodeURIComponent(zone.id)}`}
                prefetch
                scroll={false}
                className="relative h-36 overflow-hidden rounded-2xl text-left ring-0 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 active:opacity-90"
                aria-label={`Ver mapa en ${zone.name}`}
              >
                <img
                  src={zone.image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="mb-0.5 text-sm font-medium text-white">{zone.name}</h4>
                  <p className="line-clamp-1 text-xs text-gray-300">{zone.area_hint}</p>
                  <p className="mt-1 text-[11px] text-purple-300">
                    {count === 0
                      ? '0 eventos en esta zona'
                      : `${count} ${count === 1 ? 'evento' : 'eventos'}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
