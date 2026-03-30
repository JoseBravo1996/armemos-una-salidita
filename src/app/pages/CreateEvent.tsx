'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { X, Calendar, CalendarPlus, Clock, Users, Image as ImageIcon } from 'lucide-react';
import { users } from '../data/mockData';
import type { Event } from '../data/mockData';
import { EXPLORE_CATEGORY_CHIPS } from '../data/exploreCategories';
import { LocationAutocomplete } from '../components/LocationAutocomplete';
import { useAuthUser } from '@/lib/auth/auth-context';
import {
  createPublicEventRow,
  ensurePlaceFromMapbox,
} from '@/lib/events/createPublicEvent';
import type { MapboxGeocodeFeatureDTO } from '@/types/mapboxGeocode';
import { uploadPublicEventImage } from '@/lib/supabase/eventImageUpload';
import { joinEventAsGoing } from '@/lib/events/eventParticipants';
import { getTodayLocalDateYmd, isEventInPast } from '@/lib/events/eventSchedule';
import { fetchPlaceByIdForCreate } from '@/lib/events/publicExplore';
import { looksLikeMapboxCoordinatePairQuery } from '@/lib/mapbox/geocode';

const CATEGORY_OPTIONS = EXPLORE_CATEGORY_CHIPS.filter((c) => c.id !== 'all');

export function CreateEvent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authUser = useAuthUser();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [placePick, setPlacePick] = useState<MapboxGeocodeFeatureDTO | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Event['category']>('bar');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [venueFromMapHint, setVenueFromMapHint] = useState<string | null>(null);

  /** `/create-event?place=<uuid>` desde el mapa: vincula el venue sin buscar de nuevo. */
  useEffect(() => {
    const placeId = searchParams.get('place')?.trim();
    if (!placeId) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await fetchPlaceByIdForCreate(placeId);
        if (cancelled || !row) {
          if (!cancelled && !row) {
            setFormError('No encontramos ese lugar en el catálogo.');
          }
          return;
        }
        const name = row.name.trim();
        const addr = row.address?.trim() ?? '';
        const addressIsCoords = looksLikeMapboxCoordinatePairQuery(addr);
        const locationForInput =
          addressIsCoords || !addr ? (name || 'Lugar en el mapa') : addr;
        const labelForEvent =
          addressIsCoords || !addr
            ? name || 'Lugar en el mapa'
            : addr.includes(name)
              ? addr
              : `${name}, ${addr}`;

        setLocationLabel(locationForInput);
        setPlacePick({
          mapboxId: `keep:${row.id}`,
          label: labelForEvent,
          latitude: row.latitude,
          longitude: row.longitude,
          placeTypes: row.mapbox_feature_types,
        });
        setVenueFromMapHint(row.name);
        setFormError(null);
      } catch {
        if (!cancelled) setFormError('No se pudo cargar el lugar. Probá de nuevo.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!placePick || !placePick.mapboxId.startsWith('keep:')) {
      setVenueFromMapHint(null);
    }
  }, [placePick]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  const onPickCover = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setCoverFile(null);
      setCoverPreviewUrl(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('La imagen debe pesar menos de 5 MB.');
      return;
    }
    setFormError(null);
    setCoverFile(file);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!authUser?.id) {
      setFormError('Tenés que iniciar sesión para publicar un evento.');
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
    if (isEventInPast({ date, time: eventTime })) {
      setFormError('La fecha y hora del evento deben ser futuras.');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (coverFile) {
        imageUrl = await uploadPublicEventImage(authUser.id, coverFile);
      }
      const placeId = await ensurePlaceFromMapbox(placePick, authUser.id);
      const newId = await createPublicEventRow({
        title: title.trim(),
        description: description.trim(),
        eventDate: date,
        eventTime,
        locationLabel: placePick.label,
        latitude: placePick.latitude,
        longitude: placePick.longitude,
        category,
        placeId,
        imageUrl,
        userId: authUser.id,
      });
      /** Asegura RSVP del creador aunque el trigger de BD no esté aplicado (Mis planes). */
      await joinEventAsGoing(newId, authUser.id);
      router.push(`/event/${newId}`);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'No se pudo crear el evento. Revisá Supabase y RLS.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFriend = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

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
          <h2 className="text-xl">Crear evento</h2>
          <div className="w-10" />
        </div>
      </div>

      {!authUser && (
        <div className="max-w-lg mx-auto px-6 pt-4">
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <button
              type="button"
              className="font-medium text-amber-100 underline"
              onClick={() => router.push('/login')}
            >
              Iniciá sesión
            </button>{' '}
            para guardar el evento en Supabase y vincular el lugar de Mapbox.
          </p>
        </div>
      )}

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

        {venueFromMapHint && placePick && (
          <p className="flex items-start gap-2 rounded-xl border border-teal-500/35 bg-teal-500/10 px-4 py-3 text-sm text-teal-100">
            <CalendarPlus className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
            <span>
              Lugar desde el mapa: <strong className="text-white">{venueFromMapHint}</strong>. Podés
              cambiar la ubicación buscando otra dirección.
            </span>
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
          {coverPreviewUrl ? (
            <>
              <img src={coverPreviewUrl} alt="" className="h-full w-full object-cover opacity-90" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-sm text-white">Tocá para cambiar</span>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <ImageIcon className="w-12 h-12 text-purple-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Tap para subir portada (Supabase Storage)</p>
              <p className="text-gray-500 text-xs mt-1">JPEG, PNG, WebP o GIF · máx. 5 MB</p>
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
              min={getTodayLocalDateYmd()}
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

        <div>
          <label className="block text-sm text-gray-400 mb-3">
            <Users className="w-4 h-4 inline mr-1" />
            Invitar amigos (demo)
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {users.slice(1).map((user) => (
              <motion.button
                key={user.id}
                type="button"
                onClick={() => toggleFriend(user.id)}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  selectedFriends.includes(user.id)
                    ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500'
                    : 'bg-[#16161d] border-[#2a2a3a]'
                } border`}
                disabled={submitting}
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="flex-1 text-left text-white">{user.name}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={submitting || !authUser}
          whileHover={{ scale: submitting ? 1 : 1.02 }}
          whileTap={{ scale: submitting ? 1 : 0.98 }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? 'Publicando…' : 'Publicar evento'}
        </motion.button>
      </motion.form>
    </div>
  );
}
