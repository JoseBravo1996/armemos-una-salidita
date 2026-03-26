'use client';

import type { Event } from '@/app/data/mockData';
import { fetchPublicEventById } from '@/lib/events/publicExplore';
import { useEffect, useState } from 'react';

export function usePublicEvent(eventId: string | undefined) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const data = await fetchPublicEventById(eventId);
        if (!cancelled) {
          setEvent(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setEvent(null);
          setError(e instanceof Error ? e.message : 'Error al cargar el evento');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return { event, loading, error };
}
