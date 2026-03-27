/**
 * Fusiona lugares OSM duplicados (mismo nombre aprox. + distancia).
 * Reasigna public_events.place_id y borra filas redundantes.
 *
 * Requiere SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL en .env.local
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

function normalizeName(name) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function distMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(bLat - aLat);
  const dLng = toR(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function grid(lat, lng, step = 400) {
  const gy = Math.round(lat * step);
  const gx = Math.round(lng * step);
  return { gx, gy };
}

function* neighborKeys(gx, gy) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      yield `${gx + dx}:${gy + dy}`;
    }
  }
}

class UnionFind {
  constructor() {
    /** @type {Map<string, string>} */
    this.p = new Map();
  }
  find(x) {
    if (!this.p.has(x)) this.p.set(x, x);
    let r = this.p.get(x);
    if (r !== x) {
      r = this.find(r);
      this.p.set(x, r);
    }
    return r;
  }
  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return;
    if (ra < rb) this.p.set(rb, ra);
    else this.p.set(ra, rb);
  }
}

async function fetchAllOsmPlaces(supabase) {
  const page = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from('places')
      .select('id, name, latitude, longitude, event_count, popularity_score, created_at, source')
      .eq('source', 'osm')
      .range(from, from + page - 1)
      .order('id', { ascending: true });
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < page) break;
    from += page;
  }
  return all;
}

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args['dry-run'] === 'true';
  const radiusM = Number(args['radius-m'] ?? '45');
  const gridStep = Number(args['grid-step'] ?? '400');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error(
      'Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local'
    );
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const places = await fetchAllOsmPlaces(supabase);
  if (places.length === 0) {
    console.log('No hay lugares con source=osm.');
    return;
  }

  /** @type {Map<string, {id:string,latitude:number,longitude:number,name:string,nnorm:string,event_count:number,popularity_score:number,created_at:string}[]>} */
  const buckets = new Map();
  for (const pl of places) {
    const { gx, gy } = grid(pl.latitude, pl.longitude, gridStep);
    const key = `${gx}:${gy}`;
    const nn = normalizeName(pl.name);
    if (!nn || nn.length < 2) continue;
    const list = buckets.get(key) ?? [];
    list.push({
      id: pl.id,
      latitude: pl.latitude,
      longitude: pl.longitude,
      name: pl.name,
      nnorm: nn,
      event_count: pl.event_count ?? 0,
      popularity_score: pl.popularity_score ?? 0,
      created_at: pl.created_at ?? '',
    });
    buckets.set(key, list);
  }

  const uf = new UnionFind();
  for (const pl of places) {
    const nn = normalizeName(pl.name);
    if (!nn || nn.length < 2) continue;
    const { gx, gy } = grid(pl.latitude, pl.longitude, gridStep);
    const candidates = [];
    for (const nk of neighborKeys(gx, gy)) {
      const chunk = buckets.get(nk);
      if (chunk) candidates.push(...chunk);
    }
    for (const c of candidates) {
      if (c.id === pl.id) continue;
      if (c.nnorm !== nn) continue;
      const d = distMeters(pl.latitude, pl.longitude, c.latitude, c.longitude);
      if (d <= radiusM) uf.union(pl.id, c.id);
    }
  }

  /** @type {Map<string, string[]>} */
  const groups = new Map();
  for (const pl of places) {
    const r = uf.find(pl.id);
    const g = groups.get(r) ?? [];
    g.push(pl.id);
    groups.set(r, g);
  }

  /** @type {{winner:string, losers:string[]}[]} */
  const merges = [];
  const byId = new Map(places.map((p) => [p.id, p]));
  for (const [, ids] of groups) {
    if (ids.length < 2) continue;
    const rows = ids.map((id) => byId.get(id)).filter(Boolean);
    rows.sort((a, b) => {
      const ec = (b.event_count ?? 0) - (a.event_count ?? 0);
      if (ec !== 0) return ec;
      const pp = (b.popularity_score ?? 0) - (a.popularity_score ?? 0);
      if (pp !== 0) return pp;
      return String(a.id).localeCompare(String(b.id));
    });
    const winner = rows[0].id;
    const losers = rows.slice(1).map((r) => r.id);
    merges.push({ winner, losers });
  }

  console.log(
    `Grupos a fusionar: ${merges.length} | duplicados totales a eliminar: ${merges.reduce((s, m) => s + m.losers.length, 0)}`
  );

  if (dryRun) {
    merges.slice(0, 8).forEach((m, i) => {
      const w = byId.get(m.winner);
      console.log(
        `[dry-run ${i + 1}] keeper=${m.winner} ${w?.name} | merge=${m.losers.join(',')}`
      );
    });
    return;
  }

  for (const { winner, losers } of merges) {
    if (losers.length === 0) continue;
    const { error: uErr } = await supabase
      .from('public_events')
      .update({ place_id: winner, updated_at: new Date().toISOString() })
      .in('place_id', losers);
    if (uErr) throw uErr;
    const { error: dErr } = await supabase.from('places').delete().in('id', losers);
    if (dErr) throw dErr;
  }

  console.log('Dedupe OK.');
}

main().catch((err) => {
  console.error('[dedupe-osm-places]', err?.message ?? err);
  process.exit(1);
});
