'use client';

import type { Event } from '@/app/data/mockData';
import {
  type ExploreZoneRow,
  fetchExploreZones,
  fetchPublicEvents,
} from '@/lib/events/publicExplore';
import { useCallback, useEffect, useState } from 'react';

export function usePublicExploreData() {
  const [events, setEvents] = useState<Event[]>([]);
  const [zones, setZones] = useState<ExploreZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ev, z] = await Promise.all([fetchPublicEvents(), fetchExploreZones()]);
      setEvents(ev);
      setZones(z);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudieron cargar eventos. ¿Ejecutaste la migración en Supabase?'
      );
      setEvents([]);
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { events, zones, loading, error, refetch };
}
