import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Loader2, FileSpreadsheet, FileText, Send, BrainCircuit, Activity } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  status: 'idle' | 'generating' | 'success' | 'error';
  errorMessage?: string;
  isTestReport?: boolean;
}

const steps = [
  { id: 'transactions', label: 'Reading Transactions', icon: Activity },
  { id: 'analytics', label: 'Calculating Analytics', icon: Activity },
  { id: 'excel', label: 'Creating Excel', icon: FileSpreadsheet },
  { id: 'pdf', label: 'Generating PDF', icon: FileText },
  { id: 'ai', label: 'Generating AI Summary', icon: BrainCircuit },
  { id: 'email', label: 'Sending Email', icon: Send },
];

export default function ReportGenerationModal({ isOpen, onClose, status, errorMessage, isTestReport }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (status === 'generating') {
      setCurrentStepIndex(0);
      const interval = setInterval(() => {
        setCurrentStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 1000); // Simulate progress steps every 1s
      return () => clearInterval(interval);
    } else if (status === 'success') {
      setCurrentStepIndex(steps.length);
    }
  }, [status]);

  if (!isOpen) return null;

  const progress = status === 'success' ? 100 : Math.min(95, Math.floor(((currentStepIndex + 0.5) / steps.length) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 relative">
             {status === 'generating' ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className="absolute inset-0 border-2 border-dashed border-indigo-500/30 rounded-2xl" />
             ) : null}
             <FileText className={`w-8 h-8 ${status === 'error' ? 'text-red-400' : 'text-indigo-400'}`} />
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">
            {status === 'generating' ? (isTestReport ? 'Sending Test Report...' : 'Generating Monthly Report...') :
             status === 'success' ? 'Report Ready' : 'Generation Failed'}
          </h2>
          
          {status === 'error' ? (
             <p className="text-sm text-red-300">{errorMessage || 'We couldn\'t generate your report right now. Please try again.'}</p>
          ) : status === 'success' ? (
             <p className="text-sm text-emerald-400">Successfully completed all tasks.</p>
          ) : (
             <p className="text-sm text-slate-400">Please wait while we prepare your professional report.</p>
          )}
        </div>

        {(status === 'generating' || status === 'success') && (
          <div className="px-6 pb-6">
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-6">
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => {
                const isCompleted = status === 'success' || idx < currentStepIndex;
                const isCurrent = status === 'generating' && idx === currentStepIndex;
                const isPending = status === 'generating' && idx > currentStepIndex;
                
                // Hide email step if not applicable (handled in parent usually, but we'll just show it for now as part of workflow)
                
                return (
                  <div key={step.id} className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                    <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : isCurrent ? (
                        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      )}
                    </div>
                    <span className={isCompleted ? 'text-slate-300' : isCurrent ? 'text-white font-medium' : 'text-slate-500'}>
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-xs text-indigo-400 font-medium animate-pulse">Working...</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {status !== 'generating' && (
          <div className="p-4 bg-white/5 border-t border-white/10 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
