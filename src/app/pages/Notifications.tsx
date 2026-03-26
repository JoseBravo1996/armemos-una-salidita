'use client';

import type { MouseEvent } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Bell, UserPlus, Vote, Calendar, Pencil, MapPin } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { notifications } from '../data/mockData';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function Notifications() {
  const router = useRouter();

  const getIcon = (type: string) => {
    switch (type) {
      case 'join':
        return <UserPlus className="w-5 h-5 text-purple-400" />;
      case 'vote':
        return <Vote className="w-5 h-5 text-blue-400" />;
      case 'reminder':
        return <Calendar className="w-5 h-5 text-pink-400" />;
      case 'update':
        return <Pencil className="w-5 h-5 text-cyan-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleNotificationClick = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  const openEventOnMap = (e: MouseEvent<HTMLButtonElement>, eventId: string) => {
    e.stopPropagation();
    router.push(`/map?event=${encodeURIComponent(eventId)}`);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0f]/80 backdrop-blur-lg border-b border-[#2a2a3a]">
        <div className="max-w-lg mx-auto px-6 py-4">
          <h1 className="text-2xl">Notificaciones</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-6">
        {/* Unread notifications */}
        <div className="mb-8">
          <h2 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">Nuevas</h2>
          <div className="space-y-2">
            {notifications
              .filter(n => !n.read)
              .map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleNotificationClick(notification.eventId)}
                  className="flex gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/20 cursor-pointer hover:border-purple-500/40 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-[#16161d] flex items-center justify-center flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-200">{notification.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.timestamp), {
                        addSuffix: true,
                        locale: es
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => openEventOnMap(e, notification.eventId)}
                      className="rounded-xl border border-[#2a2a3a] bg-[#0a0a0f]/80 p-2 text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/10 transition-colors"
                      title="Ver en mapa"
                      aria-label="Ver evento en el mapa"
                    >
                      <MapPin className="h-4 w-4" />
                    </button>
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  </div>
                </motion.div>
              ))}
          </div>
        </div>

        {/* Read notifications */}
        <div>
          <h2 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">Anteriores</h2>
          <div className="space-y-2">
            {notifications
              .filter(n => n.read)
              .map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (notifications.filter(n => !n.read).length + index) * 0.1 }}
                  onClick={() => handleNotificationClick(notification.eventId)}
                  className="flex gap-3 p-4 rounded-2xl bg-[#16161d] border border-[#2a2a3a] cursor-pointer hover:border-purple-500/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-[#2a2a3a] flex items-center justify-center flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400">{notification.message}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDistanceToNow(new Date(notification.timestamp), {
                        addSuffix: true,
                        locale: es
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => openEventOnMap(e, notification.eventId)}
                    className="rounded-xl border border-[#2a2a3a] bg-[#0a0a0f]/50 p-2 text-gray-500 hover:border-purple-500/40 hover:text-purple-400 transition-colors shrink-0 self-start"
                    title="Ver en mapa"
                    aria-label="Ver evento en el mapa"
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
          </div>
        </div>

        {/* Empty state if no notifications */}
        {notifications.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 rounded-full bg-[#16161d] flex items-center justify-center mx-auto mb-4">
              <Bell className="w-12 h-12 text-gray-600" />
            </div>
            <h3 className="text-xl mb-2">No tenés notificaciones</h3>
            <p className="text-gray-400">
              Te avisaremos cuando haya novedades en tus eventos
            </p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
