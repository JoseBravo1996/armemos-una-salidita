'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Home, Frown } from 'lucide-react';

export function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center mx-auto mb-6">
          <Frown className="w-12 h-12 text-purple-400" />
        </div>
        
        <h1 className="text-6xl mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          404
        </h1>
        
        <h2 className="text-2xl mb-2">Página no encontrada</h2>
        
        <p className="text-gray-400 mb-8">
          Parece que esta página no existe o fue movida
        </p>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/home')}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2"
        >
          <Home className="w-5 h-5" />
          Volver al inicio
        </motion.button>
      </motion.div>
    </div>
  );
}
