'use client';

import { motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarPlus, ExternalLink, MapPin, Navigation, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomNav } from '../components/BottomNav';
import {
  MapboxEventMap,
  type MapboxEventMapHandle,
  type MapboxMapMarker,
} from '../components/map/MapboxEventMap';
import { EXPLORE_CATEGORY_CHIPS, type ExploreCategoryChipId } from '../data/exploreCategories';
import { usePublicExploreData } from '@/hooks/usePublicExploreData';
import { fetchPlacesForMap, type PlaceMapRow } from '@/lib/events/publicExplore';
import {
  openGoogleMapsDirections,
  openWazeNavigate,
} from '@/lib/maps/openDirections';
import { lngLatBoundsFromPoints } from '@/lib/mapbox/boundsFromPoints';

export function MapView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { events: catalogEvents, zones, loading: catalogLoading, error: catalogError } =
    usePublicExploreData();
  const mapRef = useRef<MapboxEventMapHandle>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceMapRow | null>(null);
  const [catalogPlaces, setCatalogPlaces] = useState<PlaceMapRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<ExploreCategoryChipId>('all');
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [headerDirectionsOpen, setHeaderDirectionsOpen] = useState(false);
  const [sheetDirectionsOpen, setSheetDirectionsOpen] = useState(false);

  const zoneSlug = searchParams.get('zone');
  const zoneFromUrl = zoneSlug ? zones.find((z) => z.id === zoneSlug) : undefined;

  /** Incluye el evento seleccionado aunque el chip lo filtre (deep link / notificación). */
  const mapMarkers = useMemo((): MapboxMapMarker[] => {
    const filtered = catalogEvents.filter(
      (e) => activeFilter === 'all' || e.category === activeFilter
    );
    const ids = new Set(filtered.map((e) => e.id));
    const forced =
      selectedEvent && !ids.has(selectedEvent)
        ? catalogEvents.filter((e) => e.id === selectedEvent)
        : [];
    const mergedEvents = [...filtered, ...forced];
    const eventMarkers: MapboxMapMarker[] = mergedEvents.map((e) => ({
      id: `evt:${e.id}`,
      latitude: e.latitude,
      longitude: e.longitude,
      kind: 'event',
      category: e.category,
    }));
    const placeMarkers: MapboxMapMarker[] = catalogPlaces
      .filter((p) => activeFilter === 'all' || p.pinCategory === activeFilter)
      .map((p) => ({
        id: `plc:${p.id}`,
        latitude: p.latitude,
        longitude: p.longitude,
        kind: 'place' as const,
        category: p.pinCategory,
      }));
    return [...eventMarkers, ...placeMarkers];
  }, [activeFilter, selectedEvent, catalogEvents, catalogPlaces]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const event = selectedEvent ? catalogEvents.find((e) => e.id === selectedEvent) : null;

  /**
   * Encuadre del mapa: si hay `?zone=` y categoría "Todos" → bbox de la zona;
   * si cambiás el filtro (o no hay zona) → encuadre de todos los eventos visibles (pins del filtro).
   */
  const fitBoundsForMap = useMemo(() => {
    if (selectedEvent || selectedPlace) return null;
    const useZoneOnly =
      Boolean(zoneFromUrl) && activeFilter === 'all' && !catalogLoading;
    if (useZoneOnly) {
      return {
        minLng: zoneFromUrl!.min_lng,
        minLat: zoneFromUrl!.min_lat,
        maxLng: zoneFromUrl!.max_lng,
        maxLat: zoneFromUrl!.max_lat,
      };
    }
    return lngLatBoundsFromPoints(
      mapMarkers.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
      0.024
    );
  }, [selectedEvent, selectedPlace, zoneFromUrl, activeFilter, catalogLoading, mapMarkers]);

  const cameraTarget = event
    ? { latitude: event.latitude, longitude: event.longitude, zoom: 14 as const }
    : null;

  const eventParam = searchParams.get('event');
  const placeParam = searchParams.get('place');

  useEffect(() => {
    if (!eventParam || catalogEvents.length === 0) return;
    const found = catalogEvents.find((e) => e.id === eventParam);
    if (found) {
      setSelectedEvent(found.id);
      setSelectedPlace(null);
    }
  }, [eventParam, catalogEvents]);

  useEffect(() => {
    if (!placeParam || catalogPlaces.length === 0) return;
    const found = catalogPlaces.find((p) => p.id === placeParam);
    if (found) {
      setSelectedPlace(found);
      setSelectedEvent(null);
    }
  }, [placeParam, catalogPlaces]);

  /** Si el chip excluye el lugar seleccionado, cerrar ficha y quitar `?place=` de la URL. */
  useEffect(() => {
    if (!selectedPlace) return;
    if (activeFilter === 'all' || selectedPlace.pinCategory === activeFilter) return;
    setSelectedPlace(null);
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('place')) return;
    params.delete('place');
    const q = params.toString();
    router.replace(q ? `/map?${q}` : '/map');
  }, [activeFilter, selectedPlace, searchParams, router]);

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

  useEffect(() => {
    if (!event) {
      setHeaderDirectionsOpen(false);
      setSheetDirectionsOpen(false);
    }
  }, [event]);

  const handleHeaderNavigation = useCallback(async () => {
    setGeoHint(null);
    if (event) {
      setSheetDirectionsOpen(false);
      setHeaderDirectionsOpen((o) => !o);
      return;
    }
    try {
      await mapRef.current?.recenterOnUser();
    } catch (e) {
      setGeoHint(e instanceof Error ? e.message : 'No se pudo centrar en tu ubicación');
    }
  }, [event]);

  const headerNavLabel = event
    ? 'Elegir app para ir al evento'
    : 'Centrar mapa en mi ubicación';

  const directionsMenuOpen = headerDirectionsOpen || sheetDirectionsOpen;

  const closeDirectionsMenus = useCallback(() => {
    setHeaderDirectionsOpen(false);
    setSheetDirectionsOpen(false);
  }, []);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-[#0a0a0f]/90 to-transparent backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between gap-2">
          <h1 className="text-xl">Mapa de eventos</h1>
          <button
            type="button"
            onClick={handleHeaderNavigation}
            title={headerNavLabel}
            aria-label={headerNavLabel}
            aria-expanded={event ? headerDirectionsOpen : undefined}
            className="relative shrink-0 w-10 h-10 rounded-full bg-[#16161d] flex items-center justify-center border border-[#2a2a3a] hover:border-purple-500/50 transition-colors"
          >
            <Navigation className="w-5 h-5 text-purple-400" />
            {event && headerDirectionsOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-52 overflow-hidden rounded-2xl border border-[#2a2a3a] bg-[#16161d] py-1 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-200 hover:bg-[#2a2a3a]/80"
                  onClick={() => {
                    openGoogleMapsDirections(event.latitude, event.longitude);
                    closeDirectionsMenus();
                  }}
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-blue-400" />
                  Google Maps
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-200 hover:bg-[#2a2a3a]/80"
                  onClick={() => {
                    openWazeNavigate(event.latitude, event.longitude);
                    closeDirectionsMenus();
                  }}
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-cyan-400" />
                  Waze
                </button>
              </div>
            )}
          </button>
        </div>

        {geoHint && !event && (
          <div className="max-w-lg mx-auto px-6 pb-2">
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200">
              {geoHint}
            </p>
          </div>
        )}

        {catalogError && (
          <div className="max-w-lg mx-auto px-6 pb-2">
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">
              {catalogError}
            </p>
          </div>
        )}

        {/* Filter chips */}
        <div className="max-w-lg mx-auto px-6 pb-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              {(() => {
                const filteredEv = catalogEvents.filter(
                  (e) => activeFilter === 'all' || e.category === activeFilter
                );
                const nEv = filteredEv.length;
                const nPl = catalogPlaces.filter(
                  (p) => activeFilter === 'all' || p.pinCategory === activeFilter
                ).length;
                return (
                  <>
                    {nEv} {nEv === 1 ? 'evento' : 'eventos'} · {nPl}{' '}
                    {nPl === 1 ? 'lugar' : 'lugares'} en el mapa
                    {activeFilter !== 'all' && ` · filtro activo`}
                  </>
                );
              })()}
            </span>
            {zoneFromUrl && activeFilter === 'all' && (
              <span className="truncate text-purple-300/90" title={zoneFromUrl.name}>
                Zona: {zoneFromUrl.name}
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {EXPLORE_CATEGORY_CHIPS.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveFilter(category.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                  activeFilter === category.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-[#16161d]/80 backdrop-blur-sm border border-[#2a2a3a] text-gray-300'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {event && directionsMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-20 bg-transparent cursor-default"
          onClick={closeDirectionsMenus}
        />
      )}

      <div className="relative h-[100svh] min-h-0 w-full shrink-0 md:h-[100dvh]">
        {catalogLoading && (
          <div className="absolute inset-0 z-[15] flex items-center justify-center bg-[#0a0a0f]/70 text-sm text-gray-400">
            Cargando eventos…
          </div>
        )}
        <MapboxEventMap
          ref={mapRef}
          accessToken={mapboxToken}
          markers={mapMarkers}
          cameraTarget={cameraTarget}
          fitBounds={fitBoundsForMap}
          highlightedMarkerId={
            selectedEvent
              ? `evt:${selectedEvent}`
              : selectedPlace
                ? `plc:${selectedPlace.id}`
                : null
          }
          onMarkerClick={(id) => {
            if (id.startsWith('plc:')) {
              setSelectedEvent(null);
              closeDirectionsMenus();
              const pid = id.slice(4);
              setSelectedPlace(catalogPlaces.find((p) => p.id === pid) ?? null);
              return;
            }
            if (id.startsWith('evt:')) {
              setSelectedPlace(null);
              setSelectedEvent(id.slice(4));
            }
          }}
        />
      </div>

      {event && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="fixed bottom-20 left-0 right-0 z-40"
        >
          <div className="max-w-lg mx-auto px-6">
            <div className="bg-[#16161d] rounded-3xl border border-[#2a2a3a] shadow-2xl overflow-hidden">
              <div className="relative">
                {event.image && (
                  <div className="h-32">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#16161d] to-transparent" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEvent(null);
                    setSelectedPlace(null);
                    closeDirectionsMenus();
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('event');
                    const q = params.toString();
                    router.replace(q ? `/map?${q}` : '/map');
                  }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#0a0a0f]/80 backdrop-blur-sm flex items-center justify-center"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="p-5">
                <h3 className="text-lg mb-2">{event.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{event.location}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/event/${event.id}`)}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    >
                      Ver detalles
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        title="Cómo llegar"
                        aria-label="Elegir Google Maps o Waze"
                        aria-expanded={sheetDirectionsOpen}
                        onClick={() => {
                          setHeaderDirectionsOpen(false);
                          setSheetDirectionsOpen((o) => !o);
                        }}
                        className="px-4 py-3 rounded-xl bg-[#2a2a3a] text-gray-300 hover:bg-[#353548] transition-colors"
                      >
                        <Navigation className="w-5 h-5" />
                      </button>
                      {sheetDirectionsOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 bottom-[calc(100%+0.5rem)] z-[60] w-52 overflow-hidden rounded-2xl border border-[#2a2a3a] bg-[#16161d] py-1 shadow-xl"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-200 hover:bg-[#2a2a3a]/80"
                            onClick={() => {
                              openGoogleMapsDirections(event.latitude, event.longitude);
                              closeDirectionsMenus();
                            }}
                          >
                            <ExternalLink className="h-4 w-4 text-blue-400" />
                            Google Maps
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-200 hover:bg-[#2a2a3a]/80"
                            onClick={() => {
                              openWazeNavigate(event.latitude, event.longitude);
                              closeDirectionsMenus();
                            }}
                          >
                            <ExternalLink className="h-4 w-4 text-cyan-400" />
                            Waze
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-gray-500">
                    Se abre en una pestaña nueva para navegar hasta las coordenadas del evento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {selectedPlace && !event && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="fixed bottom-20 left-0 right-0 z-40"
        >
          <div className="max-w-lg mx-auto px-6">
            <div className="bg-[#16161d] rounded-3xl border border-[#2a2a3a] shadow-2xl overflow-hidden">
              <div className="relative p-5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlace(null);
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('place');
                    const q = params.toString();
                    router.replace(q ? `/map?${q}` : '/map');
                  }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#0a0a0f]/80 backdrop-blur-sm flex items-center justify-center"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <p className="text-[11px] font-medium uppercase tracking-wide text-teal-400 mb-2">
                  Lugar (catálogo)
                </p>
                <h3 className="text-lg mb-2 pr-8">{selectedPlace.name}</h3>
                <div className="flex items-start gap-2 text-sm text-gray-400 mb-4">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{selectedPlace.address}</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  {selectedPlace.event_count === 0
                    ? 'Todavía no hay eventos vinculados a este venue en la app.'
                    : `${selectedPlace.event_count} evento${selectedPlace.event_count === 1 ? '' : 's'} publicado${selectedPlace.event_count === 1 ? '' : 's'} aquí.`}
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/create-event?place=${encodeURIComponent(selectedPlace.id)}`
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium"
                  >
                    <CalendarPlus className="h-4 w-4 shrink-0" />
                    Crear evento aquí
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        openGoogleMapsDirections(selectedPlace.latitude, selectedPlace.longitude)
                      }
                      className="flex-1 py-3 rounded-xl bg-[#2a2a3a] text-gray-200 text-sm"
                    >
                      Google Maps
                    </button>
                    <button
                      type="button"
                      onClick={() => openWazeNavigate(selectedPlace.latitude, selectedPlace.longitude)}
                      className="flex-1 py-3 rounded-xl bg-[#2a2a3a] text-gray-200 text-sm"
                    >
                      Waze
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/discover')}
                    className="w-full py-3 rounded-xl border border-teal-500/40 bg-teal-600/15 text-teal-100 text-sm"
                  >
                    Ver eventos en descubrir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
}
