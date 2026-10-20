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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "w-13 h-7 rounded-full p-1 transition-colors duration-150 flex items-center relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] cursor-pointer select-none",
        checked 
          ? "bg-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-primary)]" 
          : "bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline)]/40"
      )}
    >
      <motion.div
        animate={{ 
          x: checked ? 24 : 2,
          scale: checked ? 1.05 : 0.85
        }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center shadow-xs transition-colors",
          checked 
            ? "bg-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-primary)]" 
            : "bg-[var(--md-sys-color-outline)] text-transparent"
        )}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </motion.div>
    </button>
  );
}
