import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const DEFAULT_AMENITIES = ['bar', 'pub', 'restaurant', 'cafe', 'fast_food', 'nightclub'];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const v = argv[i + 1];
    if (!v || v.startsWith('--')) out[key] = 'true';
    else {
      out[key] = v;
      i += 1;
    }
  }
  return out;
}

function loadEnvLocal() {
  const p = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, 'utf8');
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx <= 0) continue;
    const key = t.slice(0, idx).trim();
    const val = t.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

function buildOverpassQuery({ lat, lng, radius, amenities, timeoutSec }) {
  const blocks = amenities
    .map((a) => {
      return `
        node["amenity"="${a}"](around:${radius},${lat},${lng});
        way["amenity"="${a}"](around:${radius},${lat},${lng});
        relation["amenity"="${a}"](around:${radius},${lat},${lng});
      `;
    })
    .join('\n');
  return `[out:json][timeout:${timeoutSec}];
(
${blocks}
);
out center tags;`;
}

const PRESETS = {
  'caba-gba': [
    // CABA
    { name: 'caba-centro', lat: -34.6037, lng: -58.3816, radius: 2600 },
    { name: 'palermo', lat: -34.5875, lng: -58.4200, radius: 2600 },
    { name: 'belgrano', lat: -34.5628, lng: -58.4584, radius: 2300 },
    { name: 'recoleta', lat: -34.5870, lng: -58.3974, radius: 2200 },
    { name: 'caballito', lat: -34.6189, lng: -58.4456, radius: 2300 },
    { name: 'flores', lat: -34.6280, lng: -58.4600, radius: 2200 },
    { name: 'villa-urquiza', lat: -34.5720, lng: -58.4850, radius: 2200 },
    { name: 'mataderos-liniers', lat: -34.6487, lng: -58.5100, radius: 2400 },
    { name: 'lugano-vsoldati', lat: -34.6717, lng: -58.4740, radius: 2600 },
    { name: 'boedo-parque-patricios', lat: -34.6350, lng: -58.4120, radius: 2300 },
    // GBA Norte
    { name: 'vicente-lopez', lat: -34.5310, lng: -58.4800, radius: 2600 },
    { name: 'olivos-munro', lat: -34.5210, lng: -58.4970, radius: 2500 },
    { name: 'san-isidro', lat: -34.4708, lng: -58.5133, radius: 2800 },
    { name: 'martinez-acassuso', lat: -34.4920, lng: -58.4980, radius: 2400 },
    { name: 'tigre', lat: -34.4250, lng: -58.5790, radius: 3000 },
    { name: 'san-fernando', lat: -34.4450, lng: -58.5600, radius: 2500 },
    // GBA Oeste
    { name: 'moron', lat: -34.6512, lng: -58.6217, radius: 2800 },
    { name: 'ramos-mejia', lat: -34.6392, lng: -58.5674, radius: 2400 },
    { name: 'castelar-ituzaingo', lat: -34.6510, lng: -58.6640, radius: 2800 },
    { name: 'haedo', lat: -34.6400, lng: -58.5920, radius: 2200 },
    // GBA Sur
    { name: 'avellaneda', lat: -34.6634, lng: -58.3659, radius: 2500 },
    { name: 'lanus', lat: -34.7026, lng: -58.3980, radius: 2800 },
    { name: 'lomas-de-zamora', lat: -34.7608, lng: -58.4040, radius: 3000 },
    { name: 'banfield-temperley', lat: -34.7480, lng: -58.3930, radius: 2500 },
    { name: 'quilmes-bernal', lat: -34.7206, lng: -58.2546, radius: 3200 },
    { name: 'adrogue-burzaco', lat: -34.7960, lng: -58.3890, radius: 2800 },
  ],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOverpassQuery({
  query,
  maxRetries,
  retryBaseMs,
  zoneName,
  label,
}) {
  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: query,
        });
        if (!response.ok) {
          const t = await response.text();
          throw new Error(
            `Overpass ${response.status} (${endpoint}) zona=${zoneName} bloque=${label}: ${t.slice(0, 160)}`
          );
        }
        return await response.json();
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await sleep(retryBaseMs * attempt);
        }
      }
    }
  }
  throw lastError ?? new Error('Error desconocido consultando Overpass');
}

function normalizeAddress(tags, lat, lng) {
  const parts = [
    tags['addr:street'],
    tags['addr:housenumber'],
    tags['addr:suburb'],
    tags['addr:city'],
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return `${(lat ?? 0).toFixed(5)}, ${(lng ?? 0).toFixed(5)}`;
}

function toPlaceRow(el) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const tags = el.tags ?? {};
  const amenity = tags.amenity ?? 'other';
  const sourceRef = `${el.type}/${el.id}`;
  const name = tags.name?.trim() || `${amenity} ${el.id}`;
  const address = normalizeAddress(tags, lat, lng);
  return {
    name,
    address,
    latitude: lat,
    longitude: lng,
    source: 'osm',
    source_ref: sourceRef,
    source_payload: tags,
    mapbox_feature_types: ['osm', `amenity:${amenity}`],
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  const lat = Number(args.lat ?? '-34.6037');
  const lng = Number(args.lng ?? '-58.3816');
  const radius = Number(args.radius ?? '2500');
  const limit = Number(args.limit ?? '300');
  const dryRun = args['dry-run'] === 'true';
  const preset = args.preset ?? null;
  const pauseMs = Number(args['pause-ms'] ?? '1200');
  const retry = Number(args.retry ?? '3');
  const retryBaseMs = Number(args['retry-base-ms'] ?? '1500');
  const timeoutSec = Number(args.timeout ?? '25');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error(
      'Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local'
    );
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const zones = preset
    ? PRESETS[preset] ?? (() => { throw new Error(`Preset desconocido: ${preset}`); })()
    : [{ name: 'single', lat, lng, radius }];

  let grandElements = 0;
  let grandRows = 0;
  let grandUpsert = 0;

  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i];
    let elements = [];

    try {
      const query = buildOverpassQuery({
        ...zone,
        amenities: DEFAULT_AMENITIES,
        timeoutSec,
      });
      const body = await runOverpassQuery({
        query,
        maxRetries: retry,
        retryBaseMs,
        zoneName: zone.name,
        label: 'all',
      });
      elements = Array.isArray(body.elements) ? body.elements : [];
    } catch (errAll) {
      console.warn(
        `[${i + 1}/${zones.length}] ${zone.name}: fallo bloque completo, probando por amenity…`
      );
      const collected = [];
      for (const amenity of DEFAULT_AMENITIES) {
        try {
          const body = await runOverpassQuery({
            query: buildOverpassQuery({
              ...zone,
              amenities: [amenity],
              timeoutSec: Math.max(20, timeoutSec - 5),
            }),
            maxRetries: retry,
            retryBaseMs,
            zoneName: zone.name,
            label: amenity,
          });
          const part = Array.isArray(body.elements) ? body.elements : [];
          collected.push(...part);
          await sleep(300);
        } catch (errAmenity) {
          console.warn(
            `[${i + 1}/${zones.length}] ${zone.name}: amenity=${amenity} omitido (${errAmenity?.message ?? errAmenity})`
          );
        }
      }
      elements = collected;
    }

    // dedupe por type/id (cuando se consulta por amenity separado se repite)
    const byRef = new Map();
    for (const el of elements) {
      const ref = `${el?.type ?? 'x'}/${el?.id ?? 'x'}`;
      if (!byRef.has(ref)) byRef.set(ref, el);
    }
    const uniqueElements = [...byRef.values()];
    const rows = uniqueElements.map(toPlaceRow).filter(Boolean).slice(0, limit);

    grandElements += uniqueElements.length;
    grandRows += rows.length;

    console.log(
      `[${i + 1}/${zones.length}] ${zone.name}: elementos=${uniqueElements.length}, normalizados=${rows.length}`
    );

    if (!dryRun && rows.length > 0) {
      const { error } = await supabase
        .from('places')
        .upsert(rows, { onConflict: 'source,source_ref' });
      if (error) {
        const msg = String(error.message ?? error);
        if (msg.includes('no unique or exclusion constraint matching the ON CONFLICT specification')) {
          throw new Error(
            'Falta (o esta mal) el indice unico para ON CONFLICT(source,source_ref). Ejecuta 20260324180000_places_osm_source.sql (drop/create index) y reintenta.'
          );
        }
        throw error;
      }
      grandUpsert += rows.length;
    }

    if (i < zones.length - 1 && pauseMs > 0) {
      await sleep(pauseMs);
    }
  }

  console.log(
    dryRun
      ? `Dry-run OK. Total elementos=${grandElements}, normalizados=${grandRows}`
      : `Import OK. Total elementos=${grandElements}, normalizados=${grandRows}, upsert=${grandUpsert}`
  );
}

main().catch((err) => {
  console.error('[import-osm-places]', err?.message ?? err);
  process.exit(1);
});
