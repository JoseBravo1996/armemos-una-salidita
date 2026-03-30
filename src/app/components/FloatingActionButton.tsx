'use client';

import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-24 right-6 z-40 flex h-16 w-16 touch-manipulation items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 shadow-2xl transition-transform duration-150 active:scale-95 motion-reduce:active:scale-100"
      style={{
        boxShadow: '0 10px 40px rgba(139, 92, 246, 0.5)',
      }}
      aria-label="Crear evento"
    >
      <Plus className="h-8 w-8 text-white" />
    </button>
  );
}
