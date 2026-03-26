-- Lugares persistidos (Mapbox → coords + mapbox_id) y enlace opcional desde eventos.
-- Políticas para que usuarios autenticados puedan crear eventos y lugares.

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  mapbox_id text,
  mapbox_feature_types text[] not null default '{}',
  rating_avg numeric(3, 2) not null default 0
    check (rating_avg >= 0 and rating_avg <= 5),
  popularity_score integer not null default 0,
  event_count integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists places_mapbox_id_unique
  on public.places (mapbox_id)
  where mapbox_id is not null;

create index if not exists places_location_idx on public.places (latitude, longitude);

alter table public.public_events
  add column if not exists place_id uuid references public.places (id) on delete set null;

create index if not exists public_events_place_id_idx on public.public_events (place_id);

alter table public.places enable row level security;

drop policy if exists "Anyone can read places" on public.places;
drop policy if exists "Authenticated users can insert places" on public.places;
drop policy if exists "Users can update own places" on public.places;

create policy "Anyone can read places"
  on public.places
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can insert places"
  on public.places
  for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Users can update own places"
  on public.places
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Escritura de eventos públicos (además de la lectura ya definida en migración anterior).
drop policy if exists "Authenticated users can insert own public events" on public.public_events;
drop policy if exists "Users can update own public events" on public.public_events;

create policy "Authenticated users can insert own public events"
  on public.public_events
  for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Users can update own public events"
  on public.public_events
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Al publicar un evento con venue, incrementar contador (definer = ignora RLS en places).
create or replace function public.increment_place_event_count(p_place_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_place_id is null then
    return;
  end if;
  update public.places
  set event_count = event_count + 1, updated_at = now()
  where id = p_place_id;
end;
$$;

create or replace function public.after_public_event_insert_place_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.increment_place_event_count(new.place_id);
  return new;
end;
$$;

drop trigger if exists trg_public_events_after_insert_place_count on public.public_events;

create trigger trg_public_events_after_insert_place_count
  after insert on public.public_events
  for each row
  execute function public.after_public_event_insert_place_count();
