import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Edit2, Save, Copy, Eye, RotateCcw, Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { PendingMoney } from '../types';
import { formatReminderMessage, cn } from '../lib/utils';
import { useStore } from '../context/StoreContext';

interface Props {
  tx: PendingMoney;
  totalDue: number;
}

export function generateSmartDefaultReminder(tx: PendingMoney, timezone: string, totalDue: number): string {
  const penaltyAmount = totalDue - tx.amount;
  
  if (penaltyAmount > 0) {
    return `Payment Reminder

Dear {{customerName}},

This is a reminder that your payment is overdue.

Original Amount: ₹{{originalAmount}}
Late Penalty: ₹{{penaltyAmount}}
Total Amount Due: ₹{{amount}}
Due Date: {{dueDate}}

Please arrange payment at the earliest.`;
  }
  
  const reasonText = (tx.reason && tx.reason.trim()) ? ` for {{reason}}` : '';
  return `Payment Reminder

Dear {{customerName}},

This is a friendly reminder that ₹{{amount}} is pending${reasonText}.

Due Date: {{dueDate}}

Please complete the payment at your earliest convenience.`;
}

export default function ReminderMessageEditor({ tx, totalDue }: Props) {
  const { generalSettings, updateTransaction } = useStore();
  const timezone = generalSettings?.timezone || 'Asia/Kolkata';
  
  const defaultTemplate = generateSmartDefaultReminder(tx, timezone, totalDue);
  const currentMessage = tx.customReminderMessage || defaultTemplate;

  const [isEditing, setIsEditing] = useState(false);
  const [draftMessage, setDraftMessage] = useState(currentMessage);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasUnsavedChanges = draftMessage !== currentMessage;

  useEffect(() => {
    if (isEditing && !hasUnsavedChanges) {
        setDraftMessage(currentMessage);
    }
  }, [currentMessage, isEditing, hasUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    if (!draftMessage.trim()) return; // prevent empty
    setIsSaving(true);
    // simulate tiny delay for UX
    await new Promise(r => setTimeout(r, 400));
    updateTransaction(tx.id, { customReminderMessage: draftMessage });
    setIsSaving(false);
    setIsEditing(false);
    setIsPreview(false);
  };

  const handleCancel = () => {
    setDraftMessage(currentMessage);
    setIsEditing(false);
    setIsPreview(false);
  };

  const handleReset = () => {
    if (draftMessage !== defaultTemplate) {
      if (isEditing) {
        setDraftMessage(defaultTemplate);
      } else if (tx.customReminderMessage && tx.customReminderMessage !== defaultTemplate) {
        setShowConfirmReset(true);
      }
    }
  };

  const confirmReset = () => {
    updateTransaction(tx.id, { customReminderMessage: '' });
    setDraftMessage(defaultTemplate);
    setShowConfirmReset(false);
  };

  const handleCopy = async () => {
    try {
      const msg = formatReminderMessage(currentMessage, tx, timezone, totalDue);
      await navigator.clipboard.writeText(msg);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const insertVariable = (variable: string) => {
    setDraftMessage(prev => prev + variable);
  };

  return (
    <div className="vision-glass-subtle rounded-2xl p-4 md:p-5 relative group/cardmsg border border-white/10 mt-2 shadow-lg">
      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-amber-400" />
          <h4 className="text-sm font-bold text-white tracking-wide">Reminder Message</h4>
        </div>
        
        <div className="flex items-center gap-1.5">
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy Message"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                {copySuccess ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                title="Edit Reminder Message"
                className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors border border-transparent hover:border-amber-400/20"
              >
                <Edit2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {hasUnsavedChanges && (
              <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider block mt-1">
                Unsaved Changes
              </span>
            )}
            
            <div className="relative">
              <textarea
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                rows={5}
                placeholder="Type your reminder message..."
                className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none font-sans"
              />
              <div className="absolute bottom-2 right-2 text-xs text-slate-500 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-md border border-white/5">
                {draftMessage.length} chars
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Insert Variable:</span>
              {['{{customerName}}', '{{amount}}', '{{originalAmount}}', '{{penaltyAmount}}', '{{dueDate}}', '{{reason}}'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-white font-mono transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreview(!isPreview)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${isPreview ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'}`}
                >
                  <Eye size={14} />
                  {isPreview ? 'Hide Preview' : 'Preview'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-white/10"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg transition-colors flex-1 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!draftMessage.trim() || !hasUnsavedChanges}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-amber-500/20"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 bg-[#075e54]/15 border border-[#25d366]/30 p-4 rounded-xl relative overflow-hidden"
                >
                  <span className="absolute top-2 right-3 text-[10px] font-bold text-[#25d366] uppercase tracking-wider">WhatsApp Preview</span>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans mt-2">
                    {formatReminderMessage(draftMessage, tx, timezone, totalDue)}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="viewing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {showConfirmReset ? (
               <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-sm text-red-200 mb-3">Are you sure you want to reset your custom message to the default?</p>
                  <div className="flex items-center gap-2">
                     <button onClick={confirmReset} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors">Yes, Reset</button>
                     <button onClick={() => setShowConfirmReset(false)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors">Cancel</button>
                  </div>
               </div>
            ) : (() => {
                const formatted = formatReminderMessage(currentMessage, tx, timezone, totalDue);
                const isLong = formatted.length > 160 || formatted.split('\n').length > 4;

                return (
                  <div>
                    <div className="bg-black/25 border border-white/5 p-4 rounded-xl relative group">
                      <div className={cn(
                        "transition-all duration-300 relative",
                        isLong && !isExpanded && "max-h-28 overflow-hidden"
                      )}>
                        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                          {formatted}
                        </p>
                        {isLong && !isExpanded && (
                          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0d0e17] via-[#0d0e17]/80 to-transparent pointer-events-none" />
                        )}
                      </div>

                      {tx.customReminderMessage && tx.customReminderMessage !== defaultTemplate && (
                        <button 
                          onClick={handleReset}
                          title="Reset to default message"
                          className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>

                    {isLong && (
                      <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mt-2 text-xs font-semibold text-[#0a84ff] hover:text-[#0071e3] flex items-center gap-1 transition-colors select-none py-1 px-1"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={14} />
                            <span>Show less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} />
                            <span>Show full message</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
