'use client';

import { motion } from 'motion/react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <motion.div
        className="relative w-16 h-16"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute inset-0 rounded-full border-4 border-purple-600/30" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 border-r-pink-600" />
      </motion.div>
    </div>
  );
}
