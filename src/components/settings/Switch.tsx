import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function Switch({ checked, onChange }: SwitchProps) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "w-13 h-7 rounded-full p-1 transition-colors duration-200 flex items-center relative outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa]",
        checked 
          ? "bg-[#a8c7fa] border border-[#a8c7fa]" 
          : "bg-[#282a34] border border-[#8e918f]/40"
      )}
    >
      <motion.div
        animate={{ 
          x: checked ? 24 : 2,
          scale: checked ? 1.05 : 0.85
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center shadow-sm transition-colors",
          checked ? "bg-[#042e6f] text-[#a8c7fa]" : "bg-[#8e918f] text-transparent"
        )}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </motion.div>
    </motion.button>
  );
}
