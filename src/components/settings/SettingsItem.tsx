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
      whileHover={onClick ? { backgroundColor: "rgba(255, 255, 255, 0.05)" } : {}}
      whileTap={onClick ? { scale: 0.99 } : {}}
      className={cn(
        "w-full flex items-center justify-between p-3.5 rounded-[20px] transition-all duration-200",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-4 text-left">
        <div className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center border border-white/[0.08] transition-colors shrink-0",
          variant === 'danger' 
            ? "bg-[#601410]/50 text-[#f2b8b5] border-[#f2b8b5]/20" 
            : "bg-[#282a34] text-[#a8c7fa]"
        )}>
          <Icon size={19} />
        </div>
        <div>
          <h4 className={cn("text-sm font-semibold", variant === 'danger' ? "text-[#f2b8b5]" : "text-[#e2e2e9]")}>{title}</h4>
          {description && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </motion.div>
  );
}
