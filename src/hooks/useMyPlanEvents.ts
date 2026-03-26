'use client';

import type { Event } from '@/app/data/mockData';
import { fetchMyPlanEvents } from '@/lib/events/eventParticipants';
import { useAuthUser } from '@/lib/auth/auth-context';
import { useCallback, useEffect, useState } from 'react';

function formatSupabaseLoadError(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as {
      message?: unknown;
      code?: unknown;
      hint?: unknown;
    };
    if (typeof o.message === 'string' && o.message.length > 0) {
      let s = o.message;
      if (typeof o.code === 'string' && o.code.length) s += ` [${o.code}]`;
      if (typeof o.hint === 'string' && o.hint.length) s += ` — ${o.hint}`;
      return s;
    }
  }
  if (e instanceof Error) return e.message;
  return typeof e === 'string' ? e : 'No se pudieron cargar tus planes.';
}

export function useMyPlanEvents() {
  const authUser = useAuthUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!authUser?.id) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ev = await fetchMyPlanEvents(authUser.id);
      setEvents(ev);
    } catch (e) {
      setEvents([]);
      setError(formatSupabaseLoadError(e));
    } finally {
      setLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { events, loading, error, refetch };
}
