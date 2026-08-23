import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useM3Theme } from './M3ThemeContext';
import { M3Card } from './M3Card';

export interface M3StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  isCurrency?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'emerald' | 'rose' | 'amber';
  onClick?: () => void;
}

export const M3StatCard: React.FC<M3StatCardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  isCurrency = false,
  trend,
  subtitle,
  icon: Icon,
  tone = 'primary',
  onClick,
}) => {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  // Smooth count up animation
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const duration = 650; // ms

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Easing: easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.round(ease * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  const formattedValue = isCurrency
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(displayValue)
    : `${prefix}${displayValue.toLocaleString('en-IN')}${suffix}`;

  const getToneStyles = () => {
    switch (tone) {
      case 'primary':
        return {
          iconBg: isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]',
          borderHover: isDark ? 'hover:border-[#a8c7fa]/50' : 'hover:border-[#0b57d0]/40',
        };
      case 'emerald':
        return {
          iconBg: isDark ? 'bg-[#0f5223] text-[#b4f3b8]' : 'bg-[#c4eed0] text-[#073814]',
          borderHover: isDark ? 'hover:border-[#6dd58c]/50' : 'hover:border-[#1e8e3e]/40',
        };
      case 'rose':
        return {
          iconBg: isDark ? 'bg-[#601410] text-[#f9dedc]' : 'bg-[#f9dedc] text-[#410e0b]',
          borderHover: isDark ? 'hover:border-[#f2b8b5]/50' : 'hover:border-[#ba1a1a]/40',
        };
      case 'amber':
        return {
          iconBg: isDark ? 'bg-[#5c3e00] text-[#ffe082]' : 'bg-[#ffe082] text-[#3e2700]',
          borderHover: isDark ? 'hover:border-[#f9ab00]/50' : 'hover:border-[#e37400]/40',
        };
      case 'tertiary':
        return {
          iconBg: isDark ? 'bg-[#492532] text-[#ffd8e4]' : 'bg-[#ffd8e4] text-[#31111d]',
          borderHover: isDark ? 'hover:border-[#ffaed0]/50' : 'hover:border-[#835368]/40',
        };
      default:
        return {
          iconBg: isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]',
          borderHover: isDark ? 'hover:border-[#a8c7fa]/50' : 'hover:border-[#0b57d0]/40',
        };
    }
  };

  const styles = getToneStyles();

  return (
    <M3Card
      variant="elevated"
      hoverable
      clickable={Boolean(onClick)}
      onClick={onClick}
      padding="lg"
      className={cn(
        'group transition-all duration-300 flex flex-col justify-between min-h-[148px]',
        styles.borderHover
      )}
    >
      {/* Top row: Title and Icon */}
      <div className="flex items-center justify-between gap-3">
        <span className={cn('text-xs font-semibold tracking-wide uppercase', isDark ? 'text-[#c4c7c5]' : 'text-[#444746]')}>
          {title}
        </span>
        <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105', styles.iconBg)}>
          <Icon size={20} />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="mt-2.5">
        <div className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight font-sans', isDark ? 'text-[#ffffff]' : 'text-[#1f1f1f]')}>
          {formattedValue}
        </div>

        {/* Trend and Subtitle row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full',
                trend.isPositive
                  ? isDark
                    ? 'bg-[#0f5223]/60 text-[#85e197] border border-[#6dd58c]/20'
                    : 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                  : isDark
                  ? 'bg-[#601410]/60 text-[#f2b8b5] border border-[#f2b8b5]/20'
                  : 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]'
              )}
            >
              {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}</span>
            </span>
          )}

          {subtitle && (
            <span className={cn('text-xs font-normal truncate', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </M3Card>
  );
};
