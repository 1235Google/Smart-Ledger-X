import React from 'react';
import { useTheme } from './ThemeProvider';
import { motion } from 'framer-motion';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  gradientBorder?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverEffect = true,
  gradientBorder = false,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <motion.div
      whileHover={hoverEffect ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={`rounded-2xl transition-all duration-300 relative overflow-hidden ${
        theme === 'dark' ? 'glass-card-dark text-slate-100' : 'glass-card-light text-slate-900'
      } ${gradientBorder ? 'border-indigo-500/30' : ''} ${className}`}
      {...(props as any)}
    >
      {gradientBorder && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
      )}
      {children}
    </motion.div>
  );
};
