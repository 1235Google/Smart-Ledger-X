import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const AITrigger: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2 bg-[#111113] border border-white/10 rounded-full shadow-2xl cursor-pointer hover:border-white/20 transition-all"
  >
    <Sparkles size={16} className="text-[#635BFF]" />
    <span className="text-sm text-[#FAFAFA]/70">Ask Gemini...</span>
    <span className="text-[10px] text-[#8B8FA3] border border-white/10 px-1.5 py-0.5 rounded">⌘G</span>
  </motion.button>
);
