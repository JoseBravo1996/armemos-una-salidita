import type { Event } from '@/app/data/mockData';
import { inferPlacePinCategory } from '@/lib/map/inferPlacePinCategory';
import type { MapPinCategory } from '@/lib/map/inferPlacePinCategory';
import { createClient } from '@/lib/supabase/client';

/** Fila de `public.public_events` (Supabase). */
export interface PublicEventRow {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location_label: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  category: Event['category'];
  place_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published: boolean;
}

/** Fila de `public.explore_zones`. */
/** Venue del catálogo `places` (para pins en el mapa). */
export interface PlaceMapRow {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  event_count: number;
  /** Categoría visual del pin (OSM amenity / leisure, etc.). */
  pinCategory: MapPinCategory;
}

export interface ExploreZoneRow {
  id: string;
  name: string;
  area_hint: string;
  image_url: string;
  sort_order: number;
  min_lng: number;
  min_lat: number;
  max_lng: number;
  max_lat: number;
}

export function mapPublicEventRowToEvent(row: PublicEventRow): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.event_date,
    time: row.event_time,
    location: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    image: row.image_url ?? undefined,
    participants: [],
    createdBy: row.created_by ?? '',
    category: row.category,
  };
}

export function countEventsInZoneBounds(
  events: Event[],
  zone: ExploreZoneRow
): number {
  return events.filter(
    (e) =>
      e.longitude >= zone.min_lng &&
      e.longitude <= zone.max_lng &&
      e.latitude >= zone.min_lat &&
      e.latitude <= zone.max_lat
  ).length;
}

export async function fetchPublicEvents(): Promise<Event[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('public_events')
    .select('*')
    .eq('published', true)
    .order('event_date', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as PublicEventRow[]).map(mapPublicEventRowToEvent);
}

type PlaceMapDbRow = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  event_count: number;
  mapbox_feature_types: string[] | null;
  source_payload: Record<string, unknown> | null;
};

/** Una fila `places` para precargar crear evento desde el mapa. */
export async function fetchPlaceByIdForCreate(
  placeId: string
): Promise<{
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mapbox_feature_types: string[];
} | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('places')
    .select('id, name, address, latitude, longitude, mapbox_feature_types')
    .eq('id', placeId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    mapbox_feature_types: string[] | null;
  };
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    mapbox_feature_types: row.mapbox_feature_types ?? [],
  };
}

export async function fetchPlacesForMap(): Promise<PlaceMapRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('places')
    .select(
      'id, name, address, latitude, longitude, event_count, mapbox_feature_types, source_payload'
    )
    .order('event_count', { ascending: false })
    .order('popularity_score', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as PlaceMapDbRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    event_count: row.event_count,
    pinCategory: inferPlacePinCategory(row.source_payload, row.mapbox_feature_types ?? []),
  }));
}

export async function fetchExploreZones(): Promise<ExploreZoneRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('explore_zones')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ExploreZoneRow[];
}

export async function fetchPublicEventRowById(
  id: string
): Promise<PublicEventRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('public_events')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();

  if (error) throw error;
  return data ? (data as PublicEventRow) : null;
}

export async function fetchPublicEventById(id: string): Promise<Event | null> {
  const row = await fetchPublicEventRowById(id);
  return row ? mapPublicEventRowToEvent(row) : null;
}
