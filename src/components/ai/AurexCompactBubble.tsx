import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const AurexCompactBubble: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    onClick={onClick}
    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#111113] border border-white/[0.08] flex items-center justify-center shadow-2xl"
  >
    <Sparkles size={24} className="text-[#A78BFA]" />
  </motion.button>
);
