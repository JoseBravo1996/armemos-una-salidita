'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { EventCard } from '../components/EventCard';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { BottomNav } from '../components/BottomNav';
import { currentUser } from '../data/mockData';
import { usePublicExploreData } from '@/hooks/usePublicExploreData';
import { useMyPlanEvents } from '@/hooks/useMyPlanEvents';
import { MapPin, Sparkles } from 'lucide-react';
import { useAuthUser } from '@/lib/auth/auth-context';

export function Home() {
  const {
    events: exploreEvents,
    loading: exploreLoading,
    refetch: refetchExplore,
  } = usePublicExploreData();
  const {
    events: myPlanEvents,
    loading: myPlansLoading,
    error: myPlansError,
    refetch: refetchMyPlans,
  } = useMyPlanEvents();
  const authUser = useAuthUser();
  const greetingName =
    authUser?.user_metadata?.full_name ??
    authUser?.user_metadata?.name ??
    authUser?.email?.split('@')[0] ??
    currentUser.name;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'planes' | 'descubrir' | 'mapa'>('planes');

  useEffect(() => {
    if (activeTab === 'descubrir') void refetchExplore();
    if (activeTab === 'planes') void refetchMyPlans();
  }, [activeTab, refetchExplore, refetchMyPlans]);

  const tabs = [
    { id: 'planes' as const, label: 'Mis planes', icon: Sparkles },
    { id: 'descubrir' as const, label: 'Descubrir', icon: Sparkles },
    { id: 'mapa' as const, label: 'Mapa', icon: MapPin },
  ];

  const handleCreateEvent = () => {
    router.push('/create-event');
  };

  const handleEventClick = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  const handleTabClick = (tabId: typeof activeTab) => {
    if (tabId === 'mapa') {
      router.push('/map');
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0f]/80 backdrop-blur-lg border-b border-[#2a2a3a]">
        <div className="max-w-lg mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Hola, {greetingName}! 👋
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {activeTab === 'planes' && 'Tus próximos planes'}
                {activeTab === 'descubrir' && 'Eventos cerca tuyo'}
                {activeTab === 'mapa' && 'Explora el mapa'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500">
              <img
                src={
                  (authUser?.user_metadata?.avatar_url as string | undefined) ??
                  (authUser?.user_metadata?.picture as string | undefined) ??
                  currentUser.avatar
                }
                alt={greetingName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className="relative px-4 py-2 rounded-xl whitespace-nowrap transition-all"
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-2 ${
                    activeTab === tab.id ? 'text-white' : 'text-gray-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 py-6">
        {activeTab === 'planes' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {!authUser && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <button
                  type="button"
                  className="font-medium text-amber-100 underline"
                  onClick={() => router.push('/login')}
                >
                  Iniciá sesión
                </button>{' '}
                para ver los eventos a los que te sumaste (RSVP).
              </p>
            )}
            {authUser && myPlansError && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {myPlansError}
              </p>
            )}
            {authUser && myPlansLoading && (
              <p className="text-center text-sm text-gray-500 py-8">Cargando tus planes…</p>
            )}
            {authUser && !myPlansLoading && myPlanEvents.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-8">
                Todavía no estás en ningún evento. Explorá la app o creá uno.
              </p>
            )}
            {authUser &&
              !myPlansLoading &&
              myPlanEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <EventCard event={event} onClick={() => handleEventClick(event.id)} />
                </motion.div>
              ))}
          </motion.div>
        )}

        {activeTab === 'descubrir' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
              {['Todos', 'Bares', 'Restaurantes', 'Parques', 'Actividades'].map((filter) => (
                <button
                  key={filter}
                  className="px-4 py-2 rounded-full bg-[#16161d] border border-[#2a2a3a] text-sm text-gray-300 hover:border-purple-500 transition-all whitespace-nowrap"
                >
                  {filter}
                </button>
              ))}
            </div>

            {exploreLoading && (
              <p className="text-center text-sm text-gray-500 py-8">Cargando eventos…</p>
            )}
            {!exploreLoading &&
              exploreEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <EventCard event={event} onClick={() => handleEventClick(event.id)} />
              </motion.div>
            ))}
            {!exploreLoading && exploreEvents.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-8">
                No hay eventos publicados. Ejecutá la migración SQL en Supabase y recargá.
              </p>
            )}
          </motion.div>
        )}

        {activeTab === 'mapa' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="h-[500px] rounded-3xl overflow-hidden bg-[#16161d] border border-[#2a2a3a] flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">Vista del mapa</p>
                <p className="text-sm text-gray-500">
                  Aquí se mostraría un mapa interactivo<br />
                  con marcadores de eventos
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg text-white">Eventos cercanos</h3>
              {(exploreLoading ? [] : exploreEvents).slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event.id)}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-[#16161d] border border-[#2a2a3a] cursor-pointer hover:border-purple-500 transition-all"
                >
                  {event.image && (
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="text-white">{event.title}</h4>
                    <p className="text-sm text-gray-400">{event.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <FloatingActionButton onClick={handleCreateEvent} />
      <BottomNav />
    </div>
  );
}