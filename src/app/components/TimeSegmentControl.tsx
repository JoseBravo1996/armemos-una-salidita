'use client';

import { CalendarDays, History } from 'lucide-react';
import {
  EXPLORE_TIME_TABS,
  type ExploreTimeFilterId,
} from '../data/exploreCategories';

const TAB_ICONS = {
  upcoming: CalendarDays,
  past: History,
} as const;

type Props = {
  value: ExploreTimeFilterId;
  onChange: (id: ExploreTimeFilterId) => void;
  className?: string;
  'aria-label'?: string;
};

export function TimeSegmentControl({
  value,
  onChange,
  className = '',
  'aria-label': ariaLabel = 'Filtrar por momento del evento',
}: Props) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex w-full rounded-2xl border border-[#2a2a3a] bg-[#12121a] p-1 shadow-inner shadow-black/20 ${className}`}
    >
      {EXPLORE_TIME_TABS.map((tab) => {
        const Icon = TAB_ICONS[tab.id];
        const isActive = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative flex min-h-[48px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-[color,box-shadow,transform] duration-200 motion-safe:active:scale-[0.98] motion-reduce:active:scale-100 ${
              isActive
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-900/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
