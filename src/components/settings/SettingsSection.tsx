import React from 'react';
import { motion } from 'motion/react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  delay?: number;
}

export default function SettingsSection({ title, description, children, delay = 0 }: SettingsSectionProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay, duration: 0.25 }}
      className="space-y-2.5"
    >
      <div className="px-3">
        <h3 className="text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider">{title}</h3>
        {description && <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">{description}</p>}
      </div>
      <div className="rounded-[24px] bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/40 p-1.5 shadow-xs divide-y divide-[var(--md-sys-color-outline-variant)]/20">
        {children}
      </div>
    </motion.div>
  );
}
