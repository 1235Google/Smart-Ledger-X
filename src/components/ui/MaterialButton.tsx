import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from './ThemeProvider';

interface MaterialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'outlined' | 'fab';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const MaterialButton: React.FC<MaterialButtonProps> = ({
  variant = 'filled',
  children,
  icon,
  className = '',
  ...props
}) => {
  const { theme } = useTheme();

  let baseStyles = 'inline-flex items-center justify-center font-medium text-sm transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';

  let variantStyles = '';
  if (variant === 'filled') {
    variantStyles = 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 rounded-xl px-5 py-2.5';
  } else if (variant === 'tonal') {
    variantStyles = theme === 'dark'
      ? 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 rounded-xl px-5 py-2.5 border border-indigo-500/20'
      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl px-5 py-2.5 border border-indigo-200';
  } else if (variant === 'outlined') {
    variantStyles = theme === 'dark'
      ? 'border border-white/15 text-slate-200 hover:bg-white/5 rounded-xl px-5 py-2.5'
      : 'border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl px-5 py-2.5';
  } else if (variant === 'fab') {
    variantStyles = 'fixed bottom-6 right-6 z-50 bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xl shadow-indigo-600/40 rounded-2xl p-4 flex items-center justify-center';
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...(props as any)}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </motion.button>
  );
};
