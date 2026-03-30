'use client';

import { CalendarDays, MapPin, Users } from 'lucide-react';
import { Event } from '../data/mockData';
import { AvatarGroup } from './AvatarGroup';
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
    other: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className="group cursor-pointer touch-manipulation rounded-3xl active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <div
        className={`overflow-hidden rounded-3xl border bg-gradient-to-br ${categoryColors[event.category]} backdrop-blur-sm shadow-lg transition-shadow duration-150 group-hover:shadow-xl`}
      >
        {event.image && (
          <div className="relative h-40 overflow-hidden">
            <img
              src={event.image}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
          </div>
        )}

        <div className="p-5">
          <h3 className="mb-2 text-lg text-white">{event.title}</h3>

          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <CalendarDays className="h-4 w-4 shrink-0 text-purple-400" />
              <span>
                {formattedDate} • {event.time}hs
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MapPin className="h-4 w-4 shrink-0 text-blue-400" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <AvatarGroup users={event.participants} max={3} size="sm" />
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Users className="h-4 w-4" />
              <span>{event.participants.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
