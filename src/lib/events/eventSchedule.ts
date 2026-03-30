import type { Event } from '@/app/data/mockData';

/** Fecha local en formato `YYYY-MM-DD` (para `min` de `<input type="date">`). */
export function getTodayLocalDateYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeTimeForParse(raw: string): { hh: string; mm: string } {
  const s = raw.trim().replace(/\s*hs\.?$/i, '');
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { hh: '00', mm: '00' };
  return { hh: m[1].padStart(2, '0'), mm: m[2] };
}

/**
 * `true` si el horario de inicio del evento (fecha local + hora) ya pasó.
 */
export function isEventInPast(event: Pick<Event, 'date' | 'time'>): boolean {
  const dateStr = event.date.trim().slice(0, 10);
  const { hh, mm } = normalizeTimeForParse(event.time);
  const local = new Date(`${dateStr}T${hh}:${mm}:00`);
  if (Number.isNaN(local.getTime())) return false;
  return Date.now() > local.getTime();
}
