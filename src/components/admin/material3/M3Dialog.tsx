import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useM3Theme } from './M3ThemeContext';
import { M3Button } from './M3Button';

export interface M3DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconTone?: 'primary' | 'emerald' | 'rose' | 'amber';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const M3Dialog: React.FC<M3DialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconTone = 'primary',
  maxWidth = 'md',
  actions,
  children,
}) => {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-md';
      case 'lg':
        return 'max-w-lg';
      case 'xl':
        return 'max-w-xl';
      case '2xl':
        return 'max-w-2xl';
      case '3xl':
        return 'max-w-3xl';
    }
  };

  const getIconToneStyles = () => {
    switch (iconTone) {
      case 'primary':
        return isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]';
      case 'emerald':
        return isDark ? 'bg-[#0f5223] text-[#b4f3b8]' : 'bg-[#c4eed0] text-[#073814]';
      case 'rose':
        return isDark ? 'bg-[#601410] text-[#f9dedc]' : 'bg-[#f9dedc] text-[#410e0b]';
      case 'amber':
        return isDark ? 'bg-[#5c3e00] text-[#ffe082]' : 'bg-[#ffe082] text-[#3e2700]';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Dialog Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.22, ease: [0.05, 0.7, 0.1, 1.0] }}
            className={cn(
              'relative w-full rounded-[28px] shadow-[0_12px_36px_rgba(0,0,0,0.4)] z-10 overflow-hidden flex flex-col my-auto border',
              isDark
                ? 'bg-[#1e1f20] text-[#e3e3e3] border-[#3c4043]'
                : 'bg-[#ffffff] text-[#1f1f1f] border-[#e1e3e1]',
              getMaxWidthClass()
            )}
          >
            {/* Header */}
            {(title || Icon) && (
              <div className="p-6 sm:p-7 pb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {Icon && (
                    <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0', getIconToneStyles())}>
                      <Icon size={20} />
                    </div>
                  )}
                  <div>
                    {title && (
                      <h3 className={cn('text-xl font-bold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
                        {title}
                      </h3>
                    )}
                    {subtitle && (
                      <p className={cn('text-xs mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="p-6 sm:p-7 pt-2 flex-1 overflow-y-auto max-h-[75vh]">
              {children}
            </div>

            {/* Actions Bar */}
            {actions && (
              <div className={cn(
                'p-4 sm:p-6 pt-3 flex items-center justify-end gap-2.5 border-t',
                isDark ? 'border-[#2d2f31] bg-[#1e1f20]' : 'border-[#e1e3e1]/60 bg-[#f8fafd]'
              )}>
                {actions}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
