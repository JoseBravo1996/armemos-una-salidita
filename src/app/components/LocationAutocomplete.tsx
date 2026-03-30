'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { MapboxGeocodeFeatureDTO } from '@/types/mapboxGeocode';
import {
  buildMapboxGeocodeSearchUrl,
  looksLikeMapboxCoordinatePairQuery,
  mapGeocodeJsonToFeatures,
} from '@/lib/mapbox/geocode';

type Props = {
  valueLabel: string;
  onLabelChange: (label: string) => void;
  onSelect: (feature: MapboxGeocodeFeatureDTO) => void;
  onClearSelection: () => void;
  hasResolvedCoordinates: boolean;
  disabled?: boolean;
};

export function LocationAutocomplete({
  valueLabel,
  onLabelChange,
  onSelect,
  onClearSelection,
  hasResolvedCoordinates,
  disabled,
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MapboxGeocodeFeatureDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2 || looksLikeMapboxCoordinatePairQuery(q)) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      /** Desde el navegador: respeta las URL permitidas del token (mismo origen que el mapa). */
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
      if (!token) {
        setError('Falta NEXT_PUBLIC_MAPBOX_TOKEN en .env.local');
        setSuggestions([]);
        return;
      }
      const url = buildMapboxGeocodeSearchUrl(q, token);
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        const msg =
          (data as { message?: string })?.message?.trim() ||
          (res.status === 403
            ? 'Mapbox bloqueó la búsqueda. En mapbox.com → token → permití tu URL (ej. http://localhost:3000).'
            : 'No se pudo completar la búsqueda');
        setError(msg);
        setSuggestions([]);
        return;
      }
      setSuggestions(mapGeocodeJsonToFeatures(data));
    } catch {
      setError('Error de red al buscar en Mapbox');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const v = valueLabel.trim();
    if (v.length < 2 || looksLikeMapboxCoordinatePairQuery(v)) {
      setSuggestions([]);
      if (looksLikeMapboxCoordinatePairQuery(v)) setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(valueLabel.trim());
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [valueLabel, fetchSuggestions]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-sm text-gray-400 mb-2">
        <MapPin className="w-4 h-4 inline mr-1" />
        Ubicación (Mapbox)
      </label>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={valueLabel}
        disabled={disabled}
        onChange={(e) => {
          onLabelChange(e.target.value);
          onClearSelection();
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscá un bar, dirección o barrio…"
        className="w-full px-4 py-4 rounded-2xl bg-[#16161d] border border-[#2a2a3a] text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-all disabled:opacity-50"
        autoComplete="off"
      />
      {hasResolvedCoordinates && (
        <p className="mt-1.5 text-xs text-emerald-400">Ubicación confirmada con coordenadas</p>
      )}
      {error && <p className="mt-1.5 text-xs text-amber-400">{error}</p>}
      {open &&
        valueLabel.trim().length >= 2 &&
        !looksLikeMapboxCoordinatePairQuery(valueLabel.trim()) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-[#2a2a3a] bg-[#16161d] py-1 shadow-xl"
        >
          {loading && (
            <li className="px-4 py-3 text-sm text-gray-500">Buscando…</li>
          )}
          {!loading && suggestions.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">Sin resultados</li>
          )}
          {!loading &&
            suggestions.map((f) => (
              <li key={f.mapboxId} role="option">
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-[#2a2a3a]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(f);
                    onLabelChange(f.label);
                    setOpen(false);
                  }}
                >
                  {f.label}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
