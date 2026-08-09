import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function Switch({ checked, onChange }: SwitchProps) {
  return (
    <motion.button
      onClick={() => onChange(!checked)}
      className={cn(
        "w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center",
        checked ? "bg-indigo-600" : "bg-slate-700"
      )}
    >
      <motion.div
        animate={{ x: checked ? 24 : 0 }}
        className="w-4 h-4 rounded-full bg-white shadow-md"
      />
    </motion.button>
  );
}
