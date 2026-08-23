import React from 'react';
import { cn } from '../../../lib/utils';
import { useM3Theme } from './M3ThemeContext';

export interface M3SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export const M3Skeleton: React.FC<M3SkeletonProps> = ({
  className,
  variant = 'rounded',
  width,
  height,
}) => {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      style={{ width, height }}
      className={cn(
        'animate-pulse relative overflow-hidden',
        isDark ? 'bg-[#282a2d]' : 'bg-[#e1e3e1]',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'rounded-md h-4',
        variant === 'rounded' && 'rounded-2xl',
        className
      )}
    />
  );
};
