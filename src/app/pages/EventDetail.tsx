'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Pencil,
  Share2,
} from 'lucide-react';
import type { User } from '../data/mockData';
import { events as mockEvents, votingOptions, currentUser, users } from '../data/mockData';
import { AvatarGroup } from '../components/AvatarGroup';
import { VotingCard } from '../components/VotingCard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePublicEvent } from '@/hooks/usePublicEvent';
import { useAuthUser } from '@/lib/auth/auth-context';
import {
  fetchParticipantUsersForEvent,
  isUserParticipating,
  joinEventAsGoing,
  leaveEvent,
} from '@/lib/events/eventParticipants';
import { isEventInPast } from '@/lib/events/eventSchedule';

export function EventDetail() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();
  const authUser = useAuthUser();
  const { event: remoteEvent, loading: remoteLoading, error: remoteError } = usePublicEvent(eventId);
  const mockFallback = useMemo(
    () => mockEvents.find((e) => e.id === eventId),
    [eventId]
  );
  const event = remoteEvent ?? mockFallback;

  const showDemoVoting = Boolean(mockFallback && mockFallback.id === '1');

  const [participantUsers, setParticipantUsers] = useState<User[]>([]);
  const [dbJoined, setDbJoined] = useState(false);
  const [demoJoined, setDemoJoined] = useState(true);
  const [rsvpReady, setRsvpReady] = useState(true);
  const [rsvpActionError, setRsvpActionError] = useState<string | null>(null);

  const [votedOption, setVotedOption] = useState<string>('v1');
  const [messages, setMessages] = useState([
    { id: '1', userId: '2', text: 'Dale! Voy a estar ahí 🎉', timestamp: '14:30' },
    { id: '2', userId: '3', text: 'Alguien puede pasar a buscarme?', timestamp: '15:45' },
    { id: '3', userId: '1', text: 'Yo te paso María!', timestamp: '15:47' },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const refreshParticipants = useCallback(async () => {
    if (!eventId || !remoteEvent) return;
    try {
      const list = await fetchParticipantUsersForEvent(eventId);
      setParticipantUsers(list);
    } catch {
      setParticipantUsers([]);
    }
  }, [eventId, remoteEvent]);

  useEffect(() => {
    if (!eventId) return;
    if (remoteEvent) {
      let cancelled = false;
      void (async () => {
        try {
          const list = await fetchParticipantUsersForEvent(eventId);
          if (!cancelled) setParticipantUsers(list);
        } catch {
          if (!cancelled) setParticipantUsers([]);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (mockFallback) setParticipantUsers(mockFallback.participants);
    else setParticipantUsers([]);
    return undefined;
  }, [eventId, remoteEvent, mockFallback]);

  useEffect(() => {
    if (!remoteEvent || !authUser?.id || !eventId) {
      setRsvpReady(true);
      return;
    }
    let cancelled = false;
    setRsvpReady(false);
    void isUserParticipating(eventId, authUser.id).then((going) => {
      if (!cancelled) {
        setDbJoined(going);
        setRsvpReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [remoteEvent, authUser?.id, eventId]);

  if (remoteLoading && !mockFallback) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        Cargando evento…
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-gray-300">No encontramos este evento.</p>
        {remoteError && <p className="text-sm text-red-400">{remoteError}</p>}
        <button
          type="button"
          onClick={() => router.push('/discover')}
          className="mt-2 rounded-xl bg-purple-600 px-4 py-2 text-white text-sm"
        >
          Ir a descubrir
        </button>
      </div>
    );
  }

  const formattedDate = format(new Date(event.date), "EEEE d 'de' MMMM", { locale: es });
  const totalVotes = votingOptions.reduce((sum, opt) => sum + opt.votes.length, 0);

  const hasJoined = remoteEvent ? dbJoined : demoJoined;
  const eventHasPassed = isEventInPast(event);
  const cannotNewRsvp = eventHasPassed && !hasJoined;

  const handleToggleJoin = async () => {
    setRsvpActionError(null);
    if (!remoteEvent) {
      if (eventHasPassed && !demoJoined) return;
      setDemoJoined((j) => !j);
      return;
    }
    if (!authUser?.id) {
      router.push('/login');
      return;
    }
    if (!rsvpReady) return;
    if (!dbJoined && eventHasPassed) {
      setRsvpActionError('Este evento ya ocurrió; no podés confirmar asistencia.');
      return;
    }
    try {
      if (dbJoined) {
        await leaveEvent(eventId, authUser.id);
        setDbJoined(false);
      } else {
        await joinEventAsGoing(eventId, authUser.id);
        setDbJoined(true);
      }
      await refreshParticipants();
    } catch (e) {
      setRsvpActionError(
        e instanceof Error ? e.message : 'No se pudo actualizar tu asistencia.'
      );
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          userId: currentUser.id,
          text: newMessage,
          timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setNewMessage('');
    }
  };

  const handleVote = (optionId: string) => {
    setVotedOption(optionId);
  };

  const avatarUsers =
    participantUsers.length > 0 ? participantUsers : event.participants;

  return (
    <div className="min-h-screen pb-8">
      <div className="relative h-80">
        {event.image && (
          <>
            <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
          </>
        )}

        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-[#0a0a0f]/80 backdrop-blur-lg flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="absolute top-6 right-6 flex items-center gap-2">
          {remoteEvent && authUser?.id && event.createdBy === authUser.id && (
            <button
              type="button"
              onClick={() => router.push(`/event/${eventId}/edit`)}
              className="w-10 h-10 rounded-full bg-[#0a0a0f]/80 backdrop-blur-lg flex items-center justify-center"
              title="Editar evento"
              aria-label="Editar evento"
            >
              <Pencil className="w-5 h-5 text-white" />
            </button>
          )}
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-[#0a0a0f]/80 backdrop-blur-lg flex items-center justify-center"
            aria-label="Compartir"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#16161d] rounded-3xl p-6 border border-[#2a2a3a] shadow-2xl mb-6"
        >
          <h1 className="text-2xl mb-4">{event.title}</h1>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Fecha</div>
                <div>{formattedDate}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Hora</div>
                <div>{event.time}hs</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-10 h-10 rounded-full bg-pink-600/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Ubicación</div>
                <div>{event.location}</div>
              </div>
            </div>
          </div>

          {event.description && (
            <div className="mb-6">
              <h3 className="text-sm text-gray-400 mb-2">Descripción</h3>
              <p className="text-gray-300">{event.description}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#2a2a3a]">
            <div>
              <div className="text-sm text-gray-400 mb-2">Participantes</div>
              <AvatarGroup users={avatarUsers} max={5} />
            </div>
            <motion.button
              whileHover={cannotNewRsvp ? undefined : { scale: 1.05 }}
              whileTap={cannotNewRsvp ? undefined : { scale: 0.95 }}
              onClick={() => void handleToggleJoin()}
              disabled={Boolean((remoteEvent && !rsvpReady) || cannotNewRsvp)}
              className={`px-6 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                hasJoined ? 'bg-purple-600 text-white' : 'bg-[#2a2a3a] text-gray-300'
              }`}
            >
              {remoteEvent && !rsvpReady
                ? '…'
                : cannotNewRsvp
                  ? 'Evento finalizado'
                  : hasJoined
                    ? eventHasPassed
                      ? 'Asististe'
                      : 'Asistiendo'
                    : 'Unirse'}
            </motion.button>
          </div>

          {rsvpActionError && (
            <p className="mt-3 text-sm text-red-400">{rsvpActionError}</p>
          )}
        </motion.div>

        {showDemoVoting && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h2 className="text-xl mb-4">Votá el lugar</h2>
            <p className="text-xs text-gray-500 mb-3">
              Demo local: en eventos reales la votación se activará cuando exista modelo en base de
              datos.
            </p>
            <div className="space-y-3">
              {votingOptions.map((option) => (
                <VotingCard
                  key={option.id}
                  option={option}
                  totalVotes={totalVotes}
                  hasVoted={votedOption === option.id}
                  onVote={() => handleVote(option.id)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {showDemoVoting && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#16161d] rounded-3xl border border-[#2a2a3a] overflow-hidden"
          >
            <div className="p-4 border-b border-[#2a2a3a] flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg">Chat del evento (demo)</h3>
            </div>

            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {messages.map((message) => {
                const user = users.find((u) => u.id === message.userId);
                const isCurrentUser = message.userId === currentUser.id;

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                  >
                    <img
                      src={user?.avatar}
                      alt={user?.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className={`flex-1 ${isCurrentUser ? 'text-right' : ''}`}>
                      <div className="text-xs text-gray-500 mb-1">
                        {user?.name} • {message.timestamp}
                      </div>
                      <div
                        className={`inline-block px-4 py-2 rounded-2xl ${
                          isCurrentUser
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'bg-[#2a2a3a] text-gray-200'
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#2a2a3a]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribí un mensaje…"
                  className="flex-1 px-4 py-3 rounded-full bg-[#2a2a3a] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
