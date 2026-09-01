import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, ChevronRight } from 'lucide-react';
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
      whileTap={onClick ? { scale: 0.995 } : {}}
      className={cn(
        "w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-3.5 text-left min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors shrink-0 shadow-sm",
          variant === 'danger' 
            ? "bg-[#ff453a]/15 text-[#ff453a] border-[#ff453a]/25" 
            : "bg-white/[0.06] text-white border-white/[0.08]"
        )}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <h4 className={cn("text-sm font-semibold truncate", variant === 'danger' ? "text-[#ff453a]" : "text-white")}>{title}</h4>
          {description && <p className="text-xs text-[#86868b] mt-0.5 leading-relaxed truncate">{description}</p>}
        </div>
      </div>
      <div className="ml-4 shrink-0 flex items-center gap-2">
        {action}
        {onClick && !action && <ChevronRight size={16} className="text-[#86868b]" />}
      </div>
    </motion.div>
  );
}

