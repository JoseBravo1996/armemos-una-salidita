-- RSVP (event_participants), perfiles públicos mínimos, bucket de imágenes de eventos.
-- Auto-RSVP del creador y sincronización de perfil al registrarse (auth.users).

-- Perfiles (lectura pública para armar listas de participantes en la app).
-- Si `profiles` ya existía (p. ej. plantilla Supabase), CREATE TABLE no añade columnas nuevas:
-- usamos ADD COLUMN IF NOT EXISTS para compatibilizar.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text;

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists updated_at timestamptz;

-- default para filas antiguas si `updated_at` era null
alter table public.profiles
  alter column updated_at set default now();

update public.profiles
set updated_at = coalesce(updated_at, now())
where updated_at is null;

-- Plantillas suelen usar `full_name`; la app lee `display_name`.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'full_name'
  ) then
    update public.profiles p
    set display_name = p.full_name
    where p.display_name is null
      and p.full_name is not null;
  end if;
end $$;

create index if not exists profiles_display_name_idx on public.profiles (display_name);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;

create policy "Profiles are readable by everyone"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Participación / RSVP
create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.public_events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'going'
    constraint event_participants_status_check
      check (status in ('going', 'maybe', 'declined')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists event_participants_user_id_idx
  on public.event_participants (user_id);

create index if not exists event_participants_event_id_idx
  on public.event_participants (event_id);

alter table public.event_participants enable row level security;

drop policy if exists "Read participants of published events" on public.event_participants;
drop policy if exists "Users can join published events" on public.event_participants;
drop policy if exists "Users can leave events" on public.event_participants;

create policy "Read participants of published events"
  on public.event_participants
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.public_events pe
      where pe.id = event_participants.event_id
        and pe.published = true
    )
  );

create policy "Users can join published events"
  on public.event_participants
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.public_events pe
      where pe.id = event_id
        and pe.published = true
    )
  );

create policy "Users can leave events"
  on public.event_participants
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Cualquier usuario autenticado puede listar sus propias filas RSVP (OR con la política anterior).
drop policy if exists "Users read own participation rows" on public.event_participants;

create policy "Users read own participation rows"
  on public.event_participants
  for select
  to authenticated
  using (auth.uid() = user_id);

-- El organizador queda como "going" al crear (SECURITY DEFINER = ignora RLS).
create or replace function public.after_public_event_insert_creator_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null and new.published = true then
    insert into public.event_participants (event_id, user_id, status)
    values (new.id, new.created_by, 'going')
    on conflict (event_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_public_events_after_insert_creator_rsvp on public.public_events;

create trigger trg_public_events_after_insert_creator_rsvp
  after insert on public.public_events
  for each row
  execute function public.after_public_event_insert_creator_rsvp();

-- Imágenes de eventos (URL pública); objetos bajo carpeta = user id
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read event images" on storage.objects;
drop policy if exists "Users upload event images in own folder" on storage.objects;
drop policy if exists "Users update own event images" on storage.objects;
drop policy if exists "Users delete own event images" on storage.objects;

create policy "Public read event images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'event-images');

create policy "Users upload event images in own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own event images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own event images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
