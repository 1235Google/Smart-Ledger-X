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
            'block text-xs font-semibold tracking-wider uppercase transition-colors duration-200',
            isFocused ? 'text-blue-400' : 'text-slate-400'
          )}
        >
          {label}
        </label>
      )}

      <motion.div
        animate={
          error && !shouldReduceMotion
            ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.4 }}
        className="relative flex items-center"
      >
        {icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}

        <input
          id={inputId}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'w-full bg-white/[0.05] border rounded-2xl py-3 px-4 text-sm text-white placeholder-slate-500 transition-all duration-300 outline-none backdrop-blur-md',
            icon ? 'pl-10' : '',
            (error || isSuccess) ? 'pr-10' : '',
            error
              ? 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
              : isSuccess
              ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'border-white/10 hover:border-white/20 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/40 focus:shadow-[0_0_18px_rgba(59,130,246,0.25)]',
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
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute right-3.5 text-rose-400 pointer-events-none"
            >
              <AlertCircle size={18} />
            </motion.div>
          )}

          {isSuccess && !error && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute right-3.5 text-emerald-400 pointer-events-none bg-emerald-500/20 p-1 rounded-full border border-emerald-500/30"
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
          className="text-xs text-rose-400 font-medium pl-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export default AnimatedInput;
