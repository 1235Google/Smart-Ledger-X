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
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay, duration: 0.4 }}
      className="rounded-[20px] bg-neutral-900/40 border border-white/[0.03] p-1"
    >
      <div className="px-5 pt-5 pb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-1 pb-1">
        {children}
      </div>
    </motion.div>
  );
}
