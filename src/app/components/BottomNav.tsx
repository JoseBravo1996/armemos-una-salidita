'use client';

import { Home, Compass, Bell, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Inicio', path: '/home' },
    { icon: Compass, label: 'Descubrir', path: '/discover' },
    { icon: Bell, label: 'Notificaciones', path: '/notifications' },
    { icon: User, label: 'Perfil', path: '/profile' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#2a2a3a] bg-[#16161d]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[#16161d]/85"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto max-w-lg px-2">
        <div className="flex items-stretch justify-around py-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                prefetch
                scroll={false}
                className="relative flex min-h-[52px] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 px-2 py-2 text-center outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#16161d]"
              >
                {isActive && (
                  <span
                    className="absolute inset-x-1 inset-y-1 rounded-2xl bg-gradient-to-br from-purple-600/25 to-pink-600/25 transition-opacity duration-150"
                    aria-hidden
                  />
                )}
                <Icon
                  className={`relative z-[1] h-6 w-6 shrink-0 ${
                    isActive ? 'text-purple-400' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`relative z-[1] text-[11px] leading-tight ${
                    isActive ? 'text-purple-400' : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
