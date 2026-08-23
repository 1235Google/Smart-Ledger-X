import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useM3Theme } from './M3ThemeContext';

export interface M3TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string | null;
  leadingIcon?: React.ComponentType<{ size?: number; className?: string }>;
  trailingIcon?: React.ComponentType<{ size?: number; className?: string }>;
  clearable?: boolean;
  onClear?: () => void;
}

export const M3TextField = forwardRef<HTMLInputElement, M3TextFieldProps>(({
  label,
  helperText,
  error,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  clearable = false,
  onClear,
  value,
  defaultValue,
  type = 'text',
  disabled = false,
  className,
  onChange,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value || defaultValue || '');
  const [showPassword, setShowPassword] = useState(false);

  const actualValue = value !== undefined ? value : internalValue;
  const hasValue = actualValue !== '' && actualValue !== undefined && actualValue !== null;
  const isFloating = isFocused || hasValue;
  const isPassword = type === 'password';

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
    onChange?.(e);
  };

  const handleClear = () => {
    setInternalValue('');
    onClear?.();
  };

  const isError = Boolean(error);

  return (
    <div className={cn('relative w-full flex flex-col', className)}>
      {/* Input Container */}
      <div
        className={cn(
          'relative w-full flex items-center rounded-2xl sm:rounded-[20px] transition-all duration-200 border',
          isDark
            ? 'bg-[#1e1f20] hover:bg-[#282a2d]'
            : 'bg-[#f0f4f9] hover:bg-[#e8edf4]',
          isFocused
            ? isDark
              ? 'border-[#a8c7fa] ring-2 ring-[#a8c7fa]/20 bg-[#282a2d]'
              : 'border-[#0b57d0] ring-2 ring-[#0b57d0]/15 bg-[#ffffff]'
            : isDark
            ? 'border-[#3c4043]'
            : 'border-[#c4c7c5]',
          isError && (isDark ? 'border-[#f2b8b5] ring-2 ring-[#f2b8b5]/20' : 'border-[#ba1a1a] ring-2 ring-[#ba1a1a]/15'),
          disabled && 'opacity-40 pointer-events-none'
        )}
      >
        {/* Leading Icon */}
        {LeadingIcon && (
          <div className={cn(
            'pl-4 pr-1 text-slate-400 flex items-center justify-center transition-colors',
            isFocused && (isDark ? 'text-[#a8c7fa]' : 'text-[#0b57d0]'),
            isError && (isDark ? 'text-[#f2b8b5]' : 'text-[#ba1a1a]')
          )}>
            <LeadingIcon size={18} />
          </div>
        )}

        {/* Input & Floating Label */}
        <div className="relative flex-1 py-2 px-3.5 min-h-[56px] flex flex-col justify-center">
          <input
            ref={ref}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            value={actualValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            className={cn(
              'w-full bg-transparent outline-none text-sm transition-all pt-3.5 font-normal',
              isDark ? 'text-[#e3e3e3] placeholder-transparent' : 'text-[#1f1f1f] placeholder-transparent'
            )}
            placeholder={label}
            {...props}
          />

          <label
            className={cn(
              'absolute left-3.5 transition-all duration-200 pointer-events-none origin-top-left select-none font-medium',
              isFloating
                ? 'top-2 text-[11px]'
                : 'top-1/2 -translate-y-1/2 text-sm',
              isError
                ? isDark ? 'text-[#f2b8b5]' : 'text-[#ba1a1a]'
                : isFocused
                ? isDark ? 'text-[#a8c7fa]' : 'text-[#0b57d0]'
                : isDark ? 'text-[#8e918f]' : 'text-[#747775]'
            )}
          >
            {label}
          </label>
        </div>

        {/* Trailing Icon Actions */}
        <div className="pr-3 flex items-center gap-1.5 text-slate-400">
          {clearable && hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={15} />
            </button>
          )}

          {isPassword && !disabled && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}

          {TrailingIcon && !isPassword && (
            <div className={cn(
              'flex items-center justify-center transition-colors',
              isFocused && (isDark ? 'text-[#a8c7fa]' : 'text-[#0b57d0]'),
              isError && (isDark ? 'text-[#f2b8b5]' : 'text-[#ba1a1a]')
            )}>
              <TrailingIcon size={18} />
            </div>
          )}
        </div>
      </div>

      {/* Helper / Error Text */}
      <div className="min-h-[20px] px-3.5 pt-1 text-[11px]">
        <AnimatePresence mode="wait">
          {isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={cn(
                'flex items-center gap-1 font-medium',
                isDark ? 'text-[#f2b8b5]' : 'text-[#ba1a1a]'
              )}
            >
              <AlertCircle size={12} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          ) : helperText ? (
            <motion.div
              key="helper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                isDark ? 'text-[#8e918f]' : 'text-[#747775]'
              )}
            >
              {helperText}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
});

M3TextField.displayName = 'M3TextField';
