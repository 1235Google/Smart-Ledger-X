import React from 'react';
import { cn } from '../../../lib/utils';
import { useM3Theme } from './M3ThemeContext';

export interface M3LinearProgressProps {
  value?: number; // 0 to 100
  indeterminate?: boolean;
  className?: string;
}

export const M3LinearProgress: React.FC<M3LinearProgressProps> = ({
  value = 0,
  indeterminate = false,
  className,
}) => {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className={cn(
        'w-full h-1 sm:h-1.5 rounded-full overflow-hidden relative',
        isDark ? 'bg-[#282a2d]' : 'bg-[#e1e3e1]',
        className
      )}
    >
      {indeterminate ? (
        <div
          className={cn(
            'h-full w-1/3 rounded-full animate-[shimmer_1.5s_infinite_ease-in-out]',
            isDark ? 'bg-[#a8c7fa]' : 'bg-[#0b57d0]'
          )}
          style={{
            animation: 'shimmer 1.4s ease-in-out infinite',
          }}
        />
      ) : (
        <div
          className={cn('h-full rounded-full transition-all duration-300', isDark ? 'bg-[#a8c7fa]' : 'bg-[#0b57d0]')}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      )}
    </div>
  );
};

export interface M3CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  value?: number;
  indeterminate?: boolean;
  className?: string;
}

export const M3CircularProgress: React.FC<M3CircularProgressProps> = ({
  size = 36,
  strokeWidth = 3.5,
  value = 0,
  indeterminate = true,
  className,
}) => {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className={cn(indeterminate && 'animate-spin')}
        style={{ animationDuration: '1.2s' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDark ? '#282a2d' : '#e1e3e1'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDark ? '#a8c7fa' : '#0b57d0'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
    </div>
  );
};
