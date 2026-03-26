import type { Event } from '@/app/data/mockData';
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

export async function fetchPlacesForMap(): Promise<PlaceMapRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('places')
    .select('id, name, address, latitude, longitude, event_count')
    .order('event_count', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PlaceMapRow[];
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

export async function fetchPublicEventById(id: string): Promise<Event | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('public_events')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapPublicEventRowToEvent(data as PublicEventRow);
}
