import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Check, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isSuccess?: boolean;
  icon?: React.ReactNode;
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  label,
  error,
  isSuccess,
  icon,
  className = '',
  value,
  id,
  onFocus,
  onBlur,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'block text-xs font-bold tracking-wider uppercase transition-colors duration-150',
            isFocused ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]'
          )}
        >
          {label}
        </label>
      )}

      <motion.div
        animate={
          error && !shouldReduceMotion
            ? { x: [0, -4, 4, -2, 2, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.25 }}
        className="relative flex items-center"
      >
        {icon && (
          <div className="absolute left-3.5 text-[var(--md-sys-color-outline)] pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}

        <input
          id={inputId}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'w-full bg-[var(--md-sys-color-surface-container-high)] border rounded-2xl py-3 px-4 text-sm text-[var(--md-sys-color-on-surface)] placeholder-[var(--md-sys-color-outline)] transition-all duration-150 outline-none',
            icon ? 'pl-10' : '',
            (error || isSuccess) ? 'pr-10' : '',
            error
              ? 'border-[var(--md-sys-color-error)] focus:border-[var(--md-sys-color-error)] focus:ring-2 focus:ring-[var(--md-sys-color-error)]/20'
              : isSuccess
              ? 'border-[var(--md-sys-color-success)] focus:border-[var(--md-sys-color-success)] focus:ring-2 focus:ring-[var(--md-sys-color-success)]/20'
              : 'border-[var(--md-sys-color-outline-variant)]/60 hover:border-[var(--md-sys-color-outline)] focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/20',
            className
          )}
          {...props}
        />

        {/* Validation Error / Success Indicators */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute right-3.5 text-[var(--md-sys-color-error)] pointer-events-none"
            >
              <AlertCircle size={18} />
            </motion.div>
          )}

          {isSuccess && !error && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute right-3.5 text-[var(--md-sys-color-success)] pointer-events-none bg-[var(--md-sys-color-success-container)] p-1 rounded-full border border-[var(--md-sys-color-success)]/30"
            >
              <Check size={14} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-[var(--md-sys-color-error)] font-medium pl-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export default AnimatedInput;
