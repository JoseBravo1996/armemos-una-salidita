-- Eventos públicos explorables (mapa + descubrir) y zonas con bounding box.
-- Ejecutar en Supabase: SQL Editor > New query, o `supabase db push` con CLI.

create table if not exists public.public_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  event_date date not null,
  event_time text not null default '20:00',
  location_label text not null,
  latitude double precision not null,
  longitude double precision not null,
  image_url text,
  category text not null
    check (category in ('bar', 'restaurant', 'park', 'cafe', 'activity', 'other')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published boolean not null default true
);

create index if not exists public_events_published_date_idx
  on public.public_events (published, event_date);

create table if not exists public.explore_zones (
  id text primary key,
  name text not null,
  area_hint text not null default '',
  image_url text not null,
  sort_order int not null default 0,
  min_lng double precision not null,
  min_lat double precision not null,
  max_lng double precision not null,
  max_lat double precision not null
);

alter table public.public_events enable row level security;
alter table public.explore_zones enable row level security;

create policy "Anyone can read published public events"
  on public.public_events
  for select
  to anon, authenticated
  using (published = true);

create policy "Anyone can read explore zones"
  on public.explore_zones
  for select
  to anon, authenticated
  using (true);

-- Datos iniciales (ids fijos = idempotente con on conflict).
insert into public.public_events (
  id, title, description, event_date, event_time, location_label,
  latitude, longitude, image_url, category, published
) values
(
  'b1111111-1111-4111-8111-111111111101',
  'After Office en Palermo',
  'Juntada después del laburo para tomar algo y relajar',
  '2026-03-25', '21:00',
  'The Temple Bar, Palermo',
  -34.5875, -58.4200,
  'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&h=400&fit=crop',
  'bar', true
),
(
  'b1111111-1111-4111-8111-111111111102',
  'Picnic en los Bosques',
  'Día de parque con mates, música y buena onda',
  '2026-03-29', '16:00',
  'Bosques de Palermo',
  -34.5639, -58.4172,
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
  'park', true
),
(
  'b1111111-1111-4111-8111-111111111103',
  'Cena en San Telmo',
  'Probemos ese restaurante nuevo que recomendó Sofi',
  '2026-04-02', '20:30',
  'La Brigada, San Telmo',
  -34.6211, -58.3731,
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
  'restaurant', true
),
(
  'b1111111-1111-4111-8111-111111111104',
  'Café y trabajo',
  'Sesión de estudio/trabajo en café tranqui',
  '2026-03-27', '10:00',
  'Lattente, Recoleta',
  -34.5875, -58.3942,
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=400&fit=crop',
  'cafe', true
),
(
  'b1111111-1111-4111-8111-111111111105',
  'Fútbol 5',
  'Partido de fútbol - necesitamos 2 personas más!',
  '2026-03-26', '19:00',
  'Cancha Premium, Villa Crespo',
  -34.5989, -58.4394,
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=400&fit=crop',
  'activity', true
),
(
  'b1111111-1111-4111-8111-111111111106',
  'Yoga en el Rosedal',
  'Clase de yoga al aire libre, todos los niveles',
  '2026-03-28', '08:00',
  'Rosedal de Palermo',
  -34.5656, -58.4156,
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=400&fit=crop',
  'activity', true
),
(
  'b1111111-1111-4111-8111-111111111107',
  'Noche de juegos de mesa',
  'Juegos de mesa, cerveza artesanal y pizza',
  '2026-03-30', '20:00',
  'Gameon Café, Villa Urquiza',
  -34.5717, -58.4828,
  'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&h=400&fit=crop',
  'cafe', true
),
(
  'b1111111-1111-4111-8111-111111111108',
  'Tour gastronómico Chinatown',
  'Recorrido probando comidas de diferentes lugares',
  '2026-04-05', '19:00',
  'Barrio Chino, Belgrano',
  -34.5653, -58.4536,
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=400&fit=crop',
  'restaurant', true
)
on conflict (id) do nothing;

insert into public.explore_zones (
  id, name, area_hint, image_url, sort_order,
  min_lng, min_lat, max_lng, max_lat
) values
(
  'palermo', 'Palermo', 'Soho, Hollywood, Rosedal',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop',
  1,
  -58.44, -34.60, -58.39, -34.55
),
(
  'san-telmo', 'San Telmo', 'Sur, feria',
  'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400&h=300&fit=crop',
  2,
  -58.38, -34.63, -58.36, -34.61
),
(
  'recoleta', 'Recoleta', 'Centro norte',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
  3,
  -58.40, -34.59, -58.38, -34.58
),
(
  'belgrano', 'Belgrano', 'Chino, Barrancas',
  'https://images.unsplash.com/photo-1578678809804-8c5012c01ca7?w=400&h=300&fit=crop',
  4,
  -58.47, -34.57, -58.45, -34.54
),
(
  'villa-urquiza', 'Villa Urquiza', 'Noroeste',
  'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=400&h=300&fit=crop',
  5,
  -58.50, -34.58, -58.46, -34.56
),
(
  'puerto-madero', 'Puerto Madero', 'Dock, reserva',
  'https://images.unsplash.com/photo-1544986589-41d8d4d6dcac?w=400&h=300&fit=crop',
  6,
  -58.37, -34.62, -58.35, -34.60
)
on conflict (id) do nothing;
