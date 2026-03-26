-- Metadatos para ingestión de catálogos externos (OSM / Overpass).
-- Permite upsert idempotente por (source, source_ref).

alter table public.places
  add column if not exists source text;

alter table public.places
  add column if not exists source_ref text;

alter table public.places
  add column if not exists source_payload jsonb;

alter table public.places
  add column if not exists last_synced_at timestamptz;

drop index if exists places_source_ref_unique;

create unique index if not exists places_source_ref_unique
  on public.places (source, source_ref);
