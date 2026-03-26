'use client';

import { CalendarDays, MapPin, Users } from 'lucide-react';
import { Event } from '../data/mockData';
import { AvatarGroup } from './AvatarGroup';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventCardProps {
  event: Event;
  onClick?: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const formattedDate = format(new Date(event.date), "d 'de' MMMM", { locale: es });
  
  const categoryColors = {
    bar: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    restaurant: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
    park: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    cafe: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30',
    activity: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    other: 'from-gray-500/20 to-slate-500/20 border-gray-500/30'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div className={`bg-gradient-to-br ${categoryColors[event.category]} border rounded-3xl overflow-hidden backdrop-blur-sm shadow-lg hover:shadow-2xl transition-shadow duration-300`}>
        {event.image && (
          <div className="relative h-40 overflow-hidden">
            <motion.img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
          </div>
        )}
        
        <div className="p-5">
          <h3 className="text-lg mb-2 text-white">{event.title}</h3>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <CalendarDays className="w-4 h-4 text-purple-400" />
              <span>{formattedDate} • {event.time}hs</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <AvatarGroup users={event.participants} max={3} size="sm" />
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              <span>{event.participants.length}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}