import React from 'react';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useM3Theme } from './M3ThemeContext';

export type M3ChipVariant = 'filter' | 'assist' | 'input' | 'suggestion';

export interface M3ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  variant?: M3ChipVariant;
  count?: number;
  className?: string;
  disabled?: boolean;
}

export const M3Chip: React.FC<M3ChipProps> = ({
  label,
  selected = false,
  onClick,
  onDelete,
  icon: Icon,
  variant = 'filter',
  count,
  className,
  disabled = false,
}) => {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const isClickable = Boolean(onClick);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-8 px-3 rounded-lg sm:rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#0b57d0] dark:focus-visible:ring-[#a8c7fa] border shrink-0',
        selected
          ? isDark
            ? 'bg-[#004a77] text-[#c2e7ff] border-[#004a77] shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
            : 'bg-[#c2e7ff] text-[#001d35] border-[#c2e7ff] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
          : isDark
          ? 'bg-[#1e1f20] text-[#c4c7c5] border-[#444746] hover:bg-[#282a2d] hover:text-[#e3e3e3]'
          : 'bg-[#f0f4f9] text-[#444746] border-[#747775]/40 hover:bg-[#e8edf4] hover:text-[#1f1f1f]',
        disabled && 'opacity-40 pointer-events-none',
        !isClickable && 'cursor-default',
        className
      )}
    >
      {selected && variant === 'filter' && (
        <Check size={14} className="shrink-0 text-current" />
      )}
      {!selected && Icon && (
        <Icon size={14} className="shrink-0 text-current" />
      )}

      <span>{label}</span>

      {count !== undefined && (
        <span
          className={cn(
            'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
            selected
              ? isDark
                ? 'bg-[#a8c7fa] text-[#04214c]'
                : 'bg-[#0b57d0] text-white'
              : isDark
              ? 'bg-[#282a2d] text-[#8e918f]'
              : 'bg-[#e1e3e1] text-[#444746]'
          )}
        >
          {count}
        </span>
      )}

      {onDelete && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
        >
          <X size={12} />
        </span>
      )}
    </button>
  );
};
