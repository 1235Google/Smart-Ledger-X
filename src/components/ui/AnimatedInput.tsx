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
            isFocused ? 'text-[#0a84ff]' : 'text-[#86868b]'
          )}
        >
          {label}
        </label>
      )}

      <motion.div
        animate={
          error && !shouldReduceMotion
            ? { x: [0, -6, 6, -4, 4, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.3 }}
        className="relative flex items-center"
      >
        {icon && (
          <div className="absolute left-3.5 text-[#86868b] pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}

        <input
          id={inputId}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'w-full bg-[#171717] border rounded-2xl py-3.5 px-4 text-sm text-white placeholder-[#737373] transition-all duration-200 outline-none',
            icon ? 'pl-10' : '',
            (error || isSuccess) ? 'pr-10' : '',
            error
              ? 'border-[#ff453a] focus:border-[#ff453a] focus:ring-2 focus:ring-[#ff453a]/25'
              : isSuccess
              ? 'border-[#30d158] focus:border-[#30d158] focus:ring-2 focus:ring-[#30d158]/25'
              : 'border-white/[0.08] hover:border-white/[0.14] focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25',
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
              transition={{ duration: 0.2 }}
              className="absolute right-3.5 text-[#ff453a] pointer-events-none"
            >
              <AlertCircle size={18} />
            </motion.div>
          )}

          {isSuccess && !error && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-3.5 text-[#30d158] pointer-events-none bg-[#30d158]/15 p-1 rounded-full border border-[#30d158]/30"
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
          className="text-xs text-[#ff453a] font-medium pl-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export default AnimatedInput;
