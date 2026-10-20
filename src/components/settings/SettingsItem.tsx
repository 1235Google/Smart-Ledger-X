import React from 'react';
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
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-150 min-h-[48px] m3-state-layer",
        onClick && "cursor-pointer hover:bg-[var(--md-sys-color-surface-container-high)] active:scale-[0.995]"
      )}
    >
      <div className="flex items-center gap-3.5 text-left min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors shrink-0 shadow-xs",
          variant === 'danger' 
            ? "bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] border-[var(--md-sys-color-error)]/30" 
            : "bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] border-[var(--md-sys-color-outline-variant)]/40"
        )}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <h4 className={cn("text-sm font-semibold truncate", variant === 'danger' ? "text-[var(--md-sys-color-error)]" : "text-[var(--md-sys-color-on-surface)]")}>
            {title}
          </h4>
          {description && <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5 leading-relaxed truncate">{description}</p>}
        </div>
      </div>
      <div className="ml-4 shrink-0 flex items-center gap-2">
        {action}
        {onClick && !action && <ChevronRight size={16} className="text-[var(--md-sys-color-outline)]" />}
      </div>
    </div>
  );
}
