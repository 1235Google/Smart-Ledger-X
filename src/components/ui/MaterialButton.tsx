import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

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
  let baseStyles = 'inline-flex items-center justify-center font-bold text-sm transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] cursor-pointer m3-state-layer active:scale-[0.98]';

  let variantStyles = '';
  if (variant === 'filled') {
    variantStyles = 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:shadow-sm rounded-full px-5 py-2.5 shadow-xs';
  } else if (variant === 'tonal') {
    variantStyles = 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-surface-container-high)] rounded-full px-5 py-2.5';
  } else if (variant === 'outlined') {
    variantStyles = 'border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] rounded-full px-5 py-2.5';
  } else if (variant === 'fab') {
    variantStyles = 'fixed bottom-6 right-6 z-50 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] shadow-lg rounded-2xl p-4 flex items-center justify-center border border-[var(--md-sys-color-outline-variant)]/30';
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variantStyles, className)}
      {...(props as any)}
    >
      {icon && <span className="mr-2 inline-flex items-center">{icon}</span>}
      {children}
    </motion.button>
  );
};

export default MaterialButton;
