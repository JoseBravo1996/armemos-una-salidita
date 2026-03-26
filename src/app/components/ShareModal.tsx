'use client';

import { motion } from 'motion/react';
import { X, Copy, Share2, MessageCircle } from 'lucide-react';
import { useState } from 'react';

interface ShareModalProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

export function ShareModal({ eventId, eventTitle, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://salidita.app/event/${eventId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { icon: MessageCircle, label: 'WhatsApp', color: 'from-green-600 to-green-500' },
    { icon: Share2, label: 'Instagram', color: 'from-purple-600 to-pink-500' },
    { icon: Share2, label: 'Twitter', color: 'from-blue-500 to-blue-400' },
    { icon: Share2, label: 'Facebook', color: 'from-blue-600 to-blue-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-6"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#16161d] rounded-3xl border border-[#2a2a3a] w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#2a2a3a] flex items-center justify-between">
          <h3 className="text-xl">Compartir evento</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#2a2a3a] flex items-center justify-center hover:bg-[#3a3a4a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-400 mb-4">"{eventTitle}"</p>

          {/* Share link */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-4 py-3 rounded-xl bg-[#2a2a3a] text-gray-300 text-sm"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className={`px-4 py-3 rounded-xl transition-all ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <Copy className="w-5 h-5" />
            </motion.button>
          </div>

          {copied && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-400 text-sm mb-4 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Link copiado!
            </motion.div>
          )}

          {/* Share options */}
          <div className="grid grid-cols-4 gap-4">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              return (
                <motion.button
                  key={option.label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${option.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-400">{option.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
