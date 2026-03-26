'use client';

import { Home, Compass, Bell, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Inicio', path: '/home' },
    { icon: Compass, label: 'Descubrir', path: '/discover' },
    { icon: Bell, label: 'Notificaciones', path: '/notifications' },
    { icon: User, label: 'Perfil', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#16161d] border-t border-[#2a2a3a] backdrop-blur-lg bg-opacity-90 z-50">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="flex flex-col items-center gap-1 px-4 py-2 relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-6 h-6 relative z-10 ${
                    isActive
                      ? 'text-purple-400'
                      : 'text-gray-400'
                  }`}
                />
                <span
                  className={`text-xs relative z-10 ${
                    isActive
                      ? 'text-purple-400'
                      : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
