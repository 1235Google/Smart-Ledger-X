import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useToast, ToastItem } from '../../context/ToastContext';
import { cn } from '../../lib/utils';

const ToastSingle: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const duration = toast.duration || 4500;

  useEffect(() => {
    if (isPaused) return;

    const interval = 30; // update every 30ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss(toast.id);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration, isPaused, onDismiss, toast.id]);

  const iconMap = {
    success: <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />,
    error: <AlertCircle className="text-rose-400 shrink-0" size={20} />,
    warning: <AlertTriangle className="text-amber-400 shrink-0" size={20} />,
    info: <Info className="text-blue-400 shrink-0" size={20} />,
  };

  const borderMap = {
    success: 'border-emerald-500/30 bg-emerald-950/20',
    error: 'border-rose-500/30 bg-rose-950/20',
    warning: 'border-amber-500/30 bg-amber-950/20',
    info: 'border-blue-500/30 bg-blue-950/20',
  };

  const progressBgMap = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  };

  return (
    <motion.div
      layout
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn(
        'relative overflow-hidden w-80 sm:w-96 p-4 rounded-2xl border backdrop-blur-xl bg-neutral-900/90 text-white shadow-2xl flex items-start gap-3 pointer-events-auto select-none',
        borderMap[toast.type]
      )}
    >
      <div className="pt-0.5">{iconMap[toast.type]}</div>

      <div className="flex-1 min-w-0 pr-4">
        <h4 className="text-sm font-bold tracking-tight text-white leading-snug">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>

      {/* Progress Bar indicating dismissal timing */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className={cn('h-full transition-all duration-75', progressBgMap[toast.type])}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-2.5rem)]">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastSingle key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
