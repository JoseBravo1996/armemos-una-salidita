'use client';

import { motion } from 'motion/react';
import { BottomNav } from '../components/BottomNav';
import { currentUser, events } from '../data/mockData';
import { Settings, Calendar, Users, MapPin, LogOut } from 'lucide-react';
import { useAuthUser } from '@/lib/auth/auth-context';
import { signOut } from '@/lib/auth/actions';

export function Profile() {
  const authUser = useAuthUser();
  const displayName =
    authUser?.user_metadata?.full_name ??
    authUser?.user_metadata?.name ??
    authUser?.email?.split('@')[0] ??
    currentUser.name;
  const avatarUrl =
    (authUser?.user_metadata?.avatar_url as string | undefined) ??
    (authUser?.user_metadata?.picture as string | undefined) ??
    currentUser.avatar;
  const uid = authUser?.id ?? currentUser.id;
  const userEvents = events.filter((e) => e.participants.some((p) => p.id === uid));

  const stats = [
    { label: 'Eventos', value: userEvents.length, icon: Calendar, color: 'purple' },
    { label: 'Amigos', value: '24', icon: Users, color: 'blue' },
    { label: 'Lugares', value: '12', icon: MapPin, color: 'pink' },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="relative h-48 bg-gradient-to-br from-purple-600 to-pink-600 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <button className="absolute top-6 right-6 w-10 h-10 rounded-full bg-[#0a0a0f]/50 backdrop-blur-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-20 relative z-10">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#16161d] rounded-3xl p-6 border border-[#2a2a3a] shadow-2xl mb-6"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#16161d] mb-4 shadow-xl">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-2xl mb-2">{displayName}</h1>
            <p className="text-gray-400 mb-1">Organizador de salidas</p>
            <p className="text-sm text-gray-500">Buenos Aires, Argentina 🇦🇷</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#2a2a3a]">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const colorClasses = {
                purple: 'from-purple-600/20 to-purple-600/10 text-purple-400',
                blue: 'from-blue-600/20 to-blue-600/10 text-blue-400',
                pink: 'from-pink-600/20 to-pink-600/10 text-pink-400',
              };

              return (
                <div key={stat.label} className="text-center">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorClasses[stat.color as keyof typeof colorClasses]} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-xl mb-1">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Bio Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#16161d] rounded-3xl p-6 border border-[#2a2a3a] mb-6"
        >
          <h2 className="text-lg mb-3">Acerca de mí</h2>
          <p className="text-gray-400">
            Me encanta organizar salidas con amigos y conocer nuevos lugares. 
            Siempre estoy buscando la próxima aventura en la ciudad! 🌆✨
          </p>
        </motion.div>

        {/* Recent Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#16161d] rounded-3xl p-6 border border-[#2a2a3a] mb-6"
        >
          <h2 className="text-lg mb-4">Eventos recientes</h2>
          <div className="space-y-3">
            {userEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#2a2a3a]/50 hover:bg-[#2a2a3a] transition-all cursor-pointer"
              >
                {event.image && (
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                )}
                <div className="flex-1">
                  <h4 className="text-white text-sm">{event.title}</h4>
                  <p className="text-xs text-gray-500">{event.location}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Settings Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2 mb-6"
        >
          {[
            { label: 'Editar perfil', icon: Settings },
            { label: 'Configuración', icon: Settings },
          ].map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.label}
                type="button"
                className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all bg-[#16161d] border-[#2a2a3a] hover:border-purple-500/40"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{option.label}</span>
                </div>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
          <form action={signOut} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all bg-red-600/10 border-red-600/20 hover:border-red-600/40 text-red-400"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5" />
                <span>Cerrar sesión</span>
              </div>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
