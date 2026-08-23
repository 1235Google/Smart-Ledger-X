import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../../../lib/utils';
import { useM3Theme } from './M3ThemeContext';

export type M3CardVariant = 'elevated' | 'filled' | 'outlined' | 'subtle';

export interface M3CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: M3CardVariant;
  hoverable?: boolean;
  clickable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}

export const M3Card: React.FC<M3CardProps> = ({
  variant = 'filled',
  hoverable = false,
  clickable = false,
  padding = 'lg',
  className,
  children,
  ...props
}) => {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return isDark
          ? 'bg-[#1e1f20] text-[#e3e3e3] border border-[#2d2f31]'
          : 'bg-[#f0f4f9] text-[#1f1f1f] border border-[#e1e3e1]/60';
      case 'elevated':
        return isDark
          ? 'bg-[#282a2d] text-[#e3e3e3] shadow-[0_4px_16px_rgba(0,0,0,0.5)] border border-[#3c4043]/50'
          : 'bg-[#ffffff] text-[#1f1f1f] shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.08)] border border-[#e7eaee]';
      case 'outlined':
        return isDark
          ? 'bg-transparent text-[#e3e3e3] border border-[#444746]'
          : 'bg-transparent text-[#1f1f1f] border border-[#c4c7c5]';
      case 'subtle':
        return isDark
          ? 'bg-[#131314]/80 text-[#e3e3e3] border border-[#1f2022]'
          : 'bg-[#f8fafd] text-[#1f1f1f] border border-[#edf2f7]';
    }
  };

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return 'p-0';
      case 'sm':
        return 'p-3 sm:p-4';
      case 'md':
        return 'p-4 sm:p-6';
      case 'lg':
        return 'p-6 sm:p-7';
      case 'xl':
        return 'p-7 sm:p-9';
    }
  };

  const Component = (hoverable || clickable ? motion.div : 'div') as any;
  const motionProps = (hoverable || clickable)
    ? {
        whileHover: { y: -2, transition: { duration: 0.18, ease: [0.2, 0, 0, 1] } },
        whileTap: clickable ? { scale: 0.99 } : undefined,
      }
    : {};

  return (
    <Component
      className={cn(
        'rounded-[24px] sm:rounded-[28px] transition-all duration-200 relative overflow-hidden',
        getVariantStyles(),
        getPaddingStyles(),
        clickable && 'cursor-pointer select-none',
        className
      )}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
};
