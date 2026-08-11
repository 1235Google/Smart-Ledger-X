import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}) => {
  const variantClasses = {
    text: 'h-4 rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-2xl',
    card: 'rounded-[2rem] h-32',
  }[variant];

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white/5 border border-white/5',
        variantClasses,
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    >
      {/* Moving Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.8s_infinite]" />
    </div>
  );
};

export default Skeleton;
