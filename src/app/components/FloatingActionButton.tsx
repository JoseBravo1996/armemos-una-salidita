'use client';

import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-24 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 shadow-2xl flex items-center justify-center z-40"
      style={{
        boxShadow: '0 10px 40px rgba(139, 92, 246, 0.5)'
      }}
    >
      <Plus className="w-8 h-8 text-white" />
    </motion.button>
  );
}
