import type { Event } from '@/app/data/mockData';
import { createClient } from '@/lib/supabase/client';
import type { MapboxGeocodeFeatureDTO } from '@/types/mapboxGeocode';

export type PlaceSelection = MapboxGeocodeFeatureDTO;

/** Reutiliza lugar por mapbox_id o crea uno nuevo. `keep:none` = evento sin `place_id`. */
export async function ensurePlaceFromMapbox(
  selection: PlaceSelection,
  userId: string
): Promise<string | null> {
  const supabase = createClient();

  /** Edición: conservar fila `places` existente vinculada al evento. */
  if (selection.mapboxId.startsWith('keep:')) {
    const rest = selection.mapboxId.slice('keep:'.length);
    if (rest === 'none' || rest === '') return null;
    return rest;
  }

  const { data: existing, error: findErr } = await supabase
    .from('places')
    .select('id')
    .eq('mapbox_id', selection.mapboxId)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing?.id) return existing.id;

  const shortName = selection.label.split(',')[0]?.trim() || selection.label;

  const { data: inserted, error: insErr } = await supabase
    .from('places')
    .insert({
      name: shortName,
      address: selection.label,
      latitude: selection.latitude,
      longitude: selection.longitude,
      mapbox_id: selection.mapboxId,
      mapbox_feature_types: selection.placeTypes,
      created_by: userId,
    })
    .select('id')
    .single();

  if (insErr) {
    if (insErr.code === '23505') {
      const { data: again } = await supabase
        .from('places')
        .select('id')
        .eq('mapbox_id', selection.mapboxId)
        .maybeSingle();
      if (again?.id) return again.id as string;
    }
    throw insErr;
  }
  return inserted.id as string;
}

export async function createPublicEventRow(params: {
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  category: Event['category'];
  placeId: string | null;
  imageUrl?: string | null;
  userId: string;
}): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('public_events')
    .insert({
      title: params.title,
      description: params.description,
      event_date: params.eventDate,
      event_time: params.eventTime,
      location_label: params.locationLabel,
      latitude: params.latitude,
      longitude: params.longitude,
      category: params.category,
      place_id: params.placeId,
      image_url: params.imageUrl ?? null,
      created_by: params.userId,
      published: true,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function updatePublicEventRow(params: {
  eventId: string;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  category: Event['category'];
  placeId: string | null;
  imageUrl?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {
    title: params.title,
    description: params.description,
    event_date: params.eventDate,
    event_time: params.eventTime,
    location_label: params.locationLabel,
    latitude: params.latitude,
    longitude: params.longitude,
    category: params.category,
    place_id: params.placeId,
    updated_at: new Date().toISOString(),
  };
  if (params.imageUrl !== undefined) {
    patch.image_url = params.imageUrl;
  }
  const { error } = await supabase
    .from('public_events')
    .update(patch)
    .eq('id', params.eventId);
  if (error) throw error;
}
