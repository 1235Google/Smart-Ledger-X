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
      transition={{ delay, duration: 0.3 }}
      className="rounded-[24px] bg-[#191b22] border border-white/[0.08] p-1.5 shadow-sm"
    >
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-xs font-bold text-[#a8c7fa] uppercase tracking-wider">{title}</h3>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-1 pb-1 space-y-1">
        {children}
      </div>
    </motion.div>
  );
}
