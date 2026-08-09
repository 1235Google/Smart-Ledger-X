import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SettingsItemProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  onClick?: (e?: any) => void;
  variant?: 'default' | 'danger';
}

export default function SettingsItem({ icon: Icon, title, description, action, onClick, variant = 'default' }: SettingsItemProps) {
  return (
    <motion.div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      whileHover={onClick ? { backgroundColor: "rgba(255, 255, 255, 0.03)" } : {}}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-[16px] transition-all duration-300",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-4 text-left">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center border border-white/[0.03] bg-neutral-800",
          variant === 'danger' ? "text-red-400" : "text-slate-300"
        )}>
          <Icon size={18} />
        </div>
        <div>
          <h4 className={cn("text-sm font-medium", variant === 'danger' ? "text-red-400" : "text-slate-100")}>{title}</h4>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="ml-4">{action}</div>}
    </motion.div>
  );
}
