'use client';

import { Check } from 'lucide-react';
import { VotingOption, users } from '../data/mockData';
import { motion } from 'motion/react';
import { useState } from 'react';

interface VotingCardProps {
  option: VotingOption;
  totalVotes: number;
  hasVoted: boolean;
  onVote: () => void;
}

export function VotingCard({ option, totalVotes, hasVoted, onVote }: VotingCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;

  const handleVote = () => {
    setIsAnimating(true);
    onVote();
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleVote}
      className={`relative overflow-hidden rounded-2xl cursor-pointer border-2 ${
        hasVoted
          ? 'border-purple-500 shadow-lg shadow-purple-500/20'
          : 'border-[#2a2a3a]'
      }`}
    >
      {/* Background Image */}
      <div className="relative h-32">
        <img
          src={option.image}
          alt={option.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent" />
        
        {/* Check mark when voted */}
        {hasVoted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: isAnimating ? [0, 1.2, 1] : 1 }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center"
          >
            <Check className="w-5 h-5 text-white" />
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 bg-[#16161d]">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="text-white">{option.name}</h4>
            <p className="text-sm text-gray-400">{option.location}</p>
          </div>
          <div className="text-right">
            <div className="text-lg text-purple-400">{option.votes.length}</div>
            <div className="text-xs text-gray-500">votos</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-[#2a2a3a] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
          />
        </div>
        <div className="text-xs text-gray-500 mt-1 text-right">
          {percentage.toFixed(0)}%
        </div>
      </div>
    </motion.div>
  );
}
