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
      className="space-y-2"
    >
      <div className="px-3">
        <h3 className="text-xs font-bold text-[#86868b] uppercase tracking-wider">{title}</h3>
        {description && <p className="text-xs text-[#86868b] mt-0.5">{description}</p>}
      </div>
      <div className="rounded-[24px] bg-[#12131a]/85 border border-white/[0.08] p-1.5 shadow-xl backdrop-blur-2xl divide-y divide-white/[0.04]">
        {children}
      </div>
    </motion.div>
  );
}

