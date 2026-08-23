import React, { useState } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useM3Theme } from './M3ThemeContext';

export type M3ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'elevated' | 'text' | 'danger';
export type M3ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface M3ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: M3ButtonVariant;
  size?: M3ButtonSize;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  trailingIcon?: React.ComponentType<{ size?: number; className?: string }>;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const M3Button: React.FC<M3ButtonProps> = ({
  variant = 'filled',
  size = 'md',
  icon: Icon,
  trailingIcon: TrailingIcon,
  loading = false,
  loadingText,
  fullWidth = false,
  disabled = false,
  className,
  children,
  onClick,
  ...props
}) => {
  const { resolvedTheme, palette } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const handlePointerDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { x, y, id: Date.now() };
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  // Color schemes based on variant and dark/light mode
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return isDark
          ? 'bg-[#a8c7fa] text-[#04214c] hover:bg-[#c2d7fc] hover:shadow-[0_2px_8px_rgba(168,199,250,0.35)] active:bg-[#8ab4f8]'
          : 'bg-[#0b57d0] text-white hover:bg-[#0842a0] hover:shadow-[0_2px_8px_rgba(11,87,208,0.25)] active:bg-[#06327a]';
      case 'tonal':
        return isDark
          ? 'bg-[#004a77] text-[#c2e7ff] hover:bg-[#005a91] hover:shadow-[0_1px_4px_rgba(0,0,0,0.3)] active:bg-[#00385c]'
          : 'bg-[#c2e7ff] text-[#001d35] hover:bg-[#b0deff] hover:shadow-[0_1px_4px_rgba(0,0,0,0.08)] active:bg-[#9dd5ff]';
      case 'elevated':
        return isDark
          ? 'bg-[#282a2d] text-[#e3e3e3] shadow-[0_2px_6px_rgba(0,0,0,0.4)] hover:bg-[#333539] hover:shadow-[0_4px_12px_rgba(0,0,0,0.6)] active:bg-[#3c4043]'
          : 'bg-[#ffffff] text-[#1f1f1f] shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)] hover:bg-[#f8f9fa] hover:shadow-[0_3px_8px_rgba(0,0,0,0.18)] active:bg-[#f1f3f4]';
      case 'outlined':
        return isDark
          ? 'bg-transparent text-[#a8c7fa] border border-[#8e918f]/40 hover:bg-[#a8c7fa]/10 hover:border-[#a8c7fa] active:bg-[#a8c7fa]/20'
          : 'bg-transparent text-[#0b57d0] border border-[#747775]/60 hover:bg-[#0b57d0]/8 hover:border-[#0b57d0] active:bg-[#0b57d0]/15';
      case 'text':
        return isDark
          ? 'bg-transparent text-[#a8c7fa] hover:bg-[#a8c7fa]/10 active:bg-[#a8c7fa]/20'
          : 'bg-transparent text-[#0b57d0] hover:bg-[#0b57d0]/8 active:bg-[#0b57d0]/15';
      case 'danger':
        return isDark
          ? 'bg-[#f2b8b5] text-[#601410] hover:bg-[#f9dedc] hover:shadow-[0_2px_8px_rgba(242,184,181,0.3)] active:bg-[#ec928e]'
          : 'bg-[#ba1a1a] text-white hover:bg-[#93000a] hover:shadow-[0_2px_8px_rgba(186,26,26,0.25)] active:bg-[#690005]';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-9 px-3.5 text-xs rounded-full gap-1.5 font-medium';
      case 'md':
        return 'h-10 px-5 text-sm rounded-full gap-2 font-medium';
      case 'lg':
        return 'h-12 px-6 text-base rounded-full gap-2.5 font-medium';
      case 'icon':
        return 'h-10 w-10 p-0 rounded-full flex items-center justify-center';
    }
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      onMouseDown={handlePointerDown}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'relative overflow-hidden inline-flex items-center justify-center transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0b57d0] dark:focus-visible:ring-[#a8c7fa] dark:focus-visible:ring-offset-[#131314]',
        getVariantStyles(),
        getSizeStyles(),
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-40 cursor-not-allowed pointer-events-none shadow-none',
        className
      )}
      {...(props as any)}
    >
      {/* Ripple Animation */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-current rounded-full pointer-events-none opacity-20 animate-ping"
          style={{
            left: ripple.x - 15,
            top: ripple.y - 15,
            width: 30,
            height: 30,
            transform: 'scale(4)',
            transition: 'transform 0.5s ease-out, opacity 0.5s ease-out',
          }}
        />
      ))}

      {loading ? (
        <span className="flex items-center gap-2">
          <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} className="animate-spin" />
          {loadingText ? <span>{loadingText}</span> : children ? <span>{children}</span> : null}
        </span>
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} className="shrink-0" />}
          {children && <span>{children}</span>}
          {TrailingIcon && <TrailingIcon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} className="shrink-0" />}
        </>
      )}
    </motion.button>
  );
};
