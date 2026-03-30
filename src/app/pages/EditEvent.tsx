'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { X, Calendar, Clock, Image as ImageIcon } from 'lucide-react';
import type { Event } from '../data/mockData';
import { EXPLORE_CATEGORY_CHIPS } from '../data/exploreCategories';
import { LocationAutocomplete } from '../components/LocationAutocomplete';
import { useAuthUser } from '@/lib/auth/auth-context';
import {
  ensurePlaceFromMapbox,
  updatePublicEventRow,
} from '@/lib/events/createPublicEvent';
import type { MapboxGeocodeFeatureDTO } from '@/types/mapboxGeocode';
import { uploadPublicEventImage } from '@/lib/supabase/eventImageUpload';
import { fetchPublicEventRowById } from '@/lib/events/publicExplore';
import { isEventInPast } from '@/lib/events/eventSchedule';

const CATEGORY_OPTIONS = EXPLORE_CATEGORY_CHIPS.filter((c) => c.id !== 'all');

export function EditEvent() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const authUser = useAuthUser();

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingRow, setLoadingRow] = useState(true);
  /** Fila ok pero todavía no hay sesión (esperando a `onAuthStateChange`). */
  const [needsAuth, setNeedsAuth] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [placePick, setPlacePick] = useState<MapboxGeocodeFeatureDTO | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Event['category']>('bar');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const initialScheduleRef = useRef({ date: '', time: '' });

  useEffect(() => {
    return () => {
      if (coverPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  useEffect(() => {
    if (!eventId) {
      setLoadError('Falta el identificador del evento.');
      setLoadingRow(false);
      return;
    }
    let cancelled = false;
    setLoadingRow(true);
    setLoadError(null);
    setNeedsAuth(false);
    void (async () => {
      try {
        const row = await fetchPublicEventRowById(eventId);
        if (cancelled) return;
        if (!row) {
          setLoadError('No encontramos este evento.');
          setLoadingRow(false);
          return;
        }
        if (!authUser?.id) {
          setNeedsAuth(true);
          setLoadingRow(false);
          return;
        }
        if (row.created_by !== authUser.id) {
          setLoadError('Solo quien creó el evento puede editarlo.');
          setLoadingRow(false);
          return;
        }
        setNeedsAuth(false);
        setTitle(row.title);
        setDescription(row.description ?? '');
        setDate(row.event_date);
        const t =
          typeof row.event_time === 'string' && row.event_time.length >= 5
            ? row.event_time.slice(0, 5)
            : '20:00';
        setTime(t);
        initialScheduleRef.current = { date: row.event_date, time: t };
        setLocationLabel(row.location_label);
        setCategory(row.category as Event['category']);
        setExistingImageUrl(row.image_url);
        const keepKey = row.place_id ?? 'none';
        setPlacePick({
          mapboxId: `keep:${keepKey}`,
          label: row.location_label,
          latitude: row.latitude,
          longitude: row.longitude,
          placeTypes: [],
        });
        setLoadingRow(false);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Error al cargar el evento.');
          setLoadingRow(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, authUser?.id]);

  const onPickCover = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setCoverFile(null);
      setCoverPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('La imagen debe pesar menos de 5 MB.');
      return;
    }
    setFormError(null);
    setCoverFile(file);
    setCoverPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!authUser?.id) {
      router.push('/login');
      return;
    }
    if (!placePick) {
      setFormError('Elegí un lugar de la lista (Mapbox) para obtener coordenadas.');
      return;
    }

    const eventTime = time.length >= 5 ? time.slice(0, 5) : time;
    if (!date?.trim()) {
      setFormError('Elegí una fecha para el evento.');
      return;
    }

    const init = initialScheduleRef.current;
    const unchangedSchedule = date === init.date && eventTime === init.time;
    if (isEventInPast({ date, time: eventTime }) && !unchangedSchedule) {
      setFormError('La fecha y hora del evento deben ser futuras si las modificás.');
      return;
    }

    setSubmitting(true);
    try {
      let imageArg: string | null | undefined = undefined;
      if (coverFile) {
        imageArg = await uploadPublicEventImage(authUser.id, coverFile);
      }
      const placeId = await ensurePlaceFromMapbox(placePick, authUser.id);

      const locationLabelOut = placePick.label;
      const latOut = placePick.latitude;
      const lngOut = placePick.longitude;

      await updatePublicEventRow({
        eventId,
        title: title.trim(),
        description: description.trim(),
        eventDate: date,
        eventTime,
        locationLabel: locationLabelOut,
        latitude: latOut,
        longitude: lngOut,
        category,
        placeId,
        imageUrl: imageArg,
      });
      router.push(`/event/${eventId}`);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'No se pudo guardar. Revisá Supabase y RLS.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRow) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        Cargando…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-gray-300">{loadError}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm text-white"
        >
          Volver
        </button>
      </div>
    );
  }

  if (needsAuth || !authUser) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <button
            type="button"
            className="font-medium text-amber-100 underline"
            onClick={() => router.push('/login')}
          >
            Iniciá sesión
          </button>{' '}
          para editar el evento.
        </p>
      </div>
    );
  }

  const coverDisplay = coverPreviewUrl ?? existingImageUrl;

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-30 bg-[#0a0a0f]/80 backdrop-blur-lg border-b border-[#2a2a3a]">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#16161d] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="text-xl">Editar evento</h2>
          <div className="w-10" />
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="max-w-lg mx-auto px-6 py-6 space-y-6"
      >
        {formError && (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {formError}
          </p>
        )}

        <label className="relative block h-48 rounded-3xl overflow-hidden border-2 border-dashed border-purple-500/30 bg-gradient-to-br from-purple-600/20 to-pink-600/20 cursor-pointer hover:border-purple-500 transition-all">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={submitting}
            onChange={(e) => onPickCover(e.target.files)}
          />
          {coverDisplay ? (
            <>
              <img src={coverDisplay} alt="" className="h-full w-full object-cover opacity-90" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-sm text-white">Tocá para cambiar portada</span>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <ImageIcon className="w-12 h-12 text-purple-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Tap para subir portada (opcional)</p>
            </div>
          )}
        </label>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: After office en Palermo"
            className="w-full px-4 py-4 rounded-2xl bg-[#16161d] border border-[#2a2a3a] text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-all"
            required
            disabled={submitting}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Categoría</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-full px-3 py-2 text-sm transition-all ${
                  category === c.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'border border-[#2a2a3a] bg-[#16161d] text-gray-300'
                }`}
                disabled={submitting}
              >
                <span className="mr-1">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl bg-[#16161d] border border-[#2a2a3a] text-white focus:border-purple-500 focus:outline-none transition-all"
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Hora
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl bg-[#16161d] border border-[#2a2a3a] text-white focus:border-purple-500 focus:outline-none transition-all"
              required
              disabled={submitting}
            />
          </div>
        </div>

        <LocationAutocomplete
          valueLabel={locationLabel}
          onLabelChange={setLocationLabel}
          onSelect={(f) => setPlacePick(f)}
          onClearSelection={() => setPlacePick(null)}
          hasResolvedCoordinates={placePick != null}
          disabled={submitting}
        />

        <div>
          <label className="block text-sm text-gray-400 mb-2">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contales de qué se trata…"
            rows={4}
            className="w-full px-4 py-4 rounded-2xl bg-[#16161d] border border-[#2a2a3a] text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-all resize-none"
            disabled={submitting}
          />
        </div>

        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ scale: submitting ? 1 : 1.02 }}
          whileTap={{ scale: submitting ? 1 : 0.98 }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </motion.button>
      </motion.form>
    </div>
  );
}
