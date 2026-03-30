'use client';

import { useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EventCard } from '../components/EventCard';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { BottomNav } from '../components/BottomNav';
import { currentUser } from '../data/mockData';
import { usePublicExploreData } from '@/hooks/usePublicExploreData';
import { useMyPlanEvents } from '@/hooks/useMyPlanEvents';
import { filterExploreEvents } from '@/lib/explore/filterExploreEvents';
import { isEventInPast } from '@/lib/events/eventSchedule';
import { type ExploreTimeFilterId } from '../data/exploreCategories';
import { TimeSegmentControl } from '../components/TimeSegmentControl';
import { MapPin, Sparkles } from 'lucide-react';
import { useAuthUser } from '@/lib/auth/auth-context';
import { useMemo, useState } from 'react';

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
  const [planTimeSegment, setPlanTimeSegment] = useState<ExploreTimeFilterId>('upcoming');
  const [discoverTimeSegment, setDiscoverTimeSegment] = useState<ExploreTimeFilterId>('upcoming');

  const upcomingPlans = useMemo(
    () => myPlanEvents.filter((e) => !isEventInPast(e)),
    [myPlanEvents]
  );
  const pastPlans = useMemo(
    () => myPlanEvents.filter((e) => isEventInPast(e)),
    [myPlanEvents]
  );
  const displayedPlans =
    planTimeSegment === 'upcoming' ? upcomingPlans : pastPlans;

  const homeDiscoverEvents = useMemo(
    () =>
      filterExploreEvents(exploreEvents, {
        categoryId: 'all',
        searchQuery: '',
        timeFilter: discoverTimeSegment,
      }),
    [exploreEvents, discoverTimeSegment]
  );

  const homeMapPreviewEvents = useMemo(
    () =>
      filterExploreEvents(exploreEvents, {
        categoryId: 'all',
        searchQuery: '',
        timeFilter: 'upcoming',
      }),
    [exploreEvents]
  );

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
    startTransition(() => {
      router.push('/create-event');
    });
  };

  const handleEventClick = (eventId: string) => {
    startTransition(() => {
      router.push(`/event/${eventId}`);
    });
  };

  const handleTabClick = (tabId: typeof activeTab) => {
    if (tabId === 'mapa') {
      startTransition(() => {
        router.push('/map');
      });
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-30 border-b border-[#2a2a3a] bg-[#0a0a0f]/80 backdrop-blur-lg">
        <div className="mx-auto max-w-lg px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-2xl text-transparent">
                Hola, {greetingName}! 👋
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                {activeTab === 'planes' &&
                  (planTimeSegment === 'upcoming' ? 'Tus próximos planes' : 'Planes pasados')}
                {activeTab === 'descubrir' &&
                  (discoverTimeSegment === 'upcoming'
                    ? 'Próximos eventos'
                    : 'Eventos pasados')}
                {activeTab === 'mapa' && 'Explora el mapa'}
              </p>
            </div>
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-purple-500">
              <img
                src={
                  (authUser?.user_metadata?.avatar_url as string | undefined) ??
                  (authUser?.user_metadata?.picture as string | undefined) ??
                  currentUser.avatar
                }
                alt={greetingName}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className="relative touch-manipulation whitespace-nowrap rounded-xl px-4 py-2 transition-colors duration-150"
                >
                  {isTabActive && (
                    <span
                      className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600"
                      aria-hidden
                    />
                  )}
                  <span
                    className={`relative z-10 flex items-center gap-2 ${
                      isTabActive ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-6 py-6">
        {activeTab === 'planes' && (
          <div className="space-y-4">
            {authUser && (
              <TimeSegmentControl
                value={planTimeSegment}
                onChange={setPlanTimeSegment}
                aria-label="Filtrar tus planes por momento"
              />
            )}
            {!authUser && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <button
                  type="button"
                  className="touch-manipulation font-medium text-amber-100 underline"
                  onClick={() =>
                    startTransition(() => {
                      router.push('/login');
                    })
                  }
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
              <p className="py-8 text-center text-sm text-gray-500">Cargando tus planes…</p>
            )}
            {authUser && !myPlansLoading && myPlanEvents.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                Todavía no estás en ningún evento. Explorá la app o creá uno.
              </p>
            )}
            {authUser &&
              !myPlansLoading &&
              myPlanEvents.length > 0 &&
              displayedPlans.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">
                  {planTimeSegment === 'upcoming'
                    ? 'No tenés planes próximos. Pasá a “Pasados” o unite a un evento en Descubrir.'
                    : 'No tenés planes pasados con RSVP.'}
                </p>
              )}
            {authUser &&
              !myPlansLoading &&
              displayedPlans.map((event) => (
                <div key={event.id}>
                  <EventCard event={event} onClick={() => handleEventClick(event.id)} />
                </div>
              ))}
          </div>
        )}

        {activeTab === 'descubrir' && (
          <div className="space-y-4">
            <TimeSegmentControl
              value={discoverTimeSegment}
              onChange={setDiscoverTimeSegment}
              aria-label="Filtrar eventos del home por momento"
              className="mb-4"
            />

            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  router.push('/discover');
                })
              }
              className="mb-4 w-full touch-manipulation rounded-2xl border border-purple-500/40 bg-purple-500/10 py-3 text-sm text-purple-200 transition-colors duration-150 hover:bg-purple-500/15"
            >
              Abrir Descubrir completo (búsqueda y categorías)
            </button>

            {exploreLoading && (
              <p className="py-8 text-center text-sm text-gray-500">Cargando eventos…</p>
            )}
            {!exploreLoading &&
              homeDiscoverEvents.map((event) => (
                <div key={event.id}>
                  <EventCard event={event} onClick={() => handleEventClick(event.id)} />
                </div>
              ))}
            {!exploreLoading && homeDiscoverEvents.length === 0 && exploreEvents.length > 0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                {discoverTimeSegment === 'past'
                  ? 'No hay eventos pasados en el catálogo. Probá “Próximos”.'
                  : 'No hay próximos eventos. Pasá a “Pasados” o abrí Descubrir.'}
              </p>
            )}
            {!exploreLoading && exploreEvents.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                No hay eventos publicados.
              </p>
            )}
          </div>
        )}

        {activeTab === 'mapa' && (
          <div className="space-y-4">
            <div className="flex h-[500px] items-center justify-center overflow-hidden rounded-3xl border border-[#2a2a3a] bg-[#16161d]">
              <div className="text-center">
                <MapPin className="mx-auto mb-4 h-16 w-16 text-purple-400" />
                <p className="mb-2 text-gray-400">Vista del mapa</p>
                <p className="text-sm text-gray-500">
                  Aquí se mostraría un mapa interactivo
                  <br />
                  con marcadores de eventos
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg text-white">Próximos eventos</h3>
              {(exploreLoading ? [] : homeMapPreviewEvents).slice(0, 3).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleEventClick(event.id)}
                  className="flex w-full touch-manipulation items-center gap-3 rounded-2xl border border-[#2a2a3a] bg-[#16161d] p-4 text-left transition-colors duration-150 hover:border-purple-500 active:bg-[#1a1a24]"
                >
                  {event.image && (
                    <img
                      src={event.image}
                      alt={event.title}
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white">{event.title}</h4>
                    <p className="truncate text-sm text-gray-400">{event.location}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <FloatingActionButton onClick={handleCreateEvent} />
      <BottomNav />
    </div>
  );
}
