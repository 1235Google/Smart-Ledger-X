import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Plus, User, Calendar, FileText, CheckCircle2, Phone, MessageCircle, Trash, AlertTriangle, Loader2, ClipboardList, Coins, Wallet, Brain, MoreVertical, Edit2, Play, Pause, Copy, Share2, Download, Archive, Bell } from 'lucide-react';
import { formatCurrency, formatDate, formatName, getDaysDiff, calculateReminderDetails, formatReminderMessage, cn } from '../lib/utils';
import { PendingMoney } from '../types';
import LatePenaltyModal from '../components/LatePenaltyModal';
import ReminderMessageEditor, { generateSmartDefaultReminder } from "../components/ReminderMessageEditor";
import DataStateGuard from '../components/ui/DataStateGuard';

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const getProbability = (id: string, amount: number, dueDate: string) => {
  const daysDiff = getDaysDiff(dueDate);
  let baseProb = 85;
  if (daysDiff < 0) baseProb -= Math.min(Math.abs(daysDiff) * 2, 40);
  if (amount > 50000) baseProb -= 10;
  
  const charCode = id.charCodeAt(0) || 0;
  return Math.max(10, Math.min(99, baseProb + (charCode % 15)));
};

const getPenaltyAmount = (tx: PendingMoney, defaultDaysDiff: number) => {
  if (!tx.penaltyEnabled || !tx.penaltyValue || tx.status === 'completed') return 0;
  
  // Use effectiveDate if present, otherwise default due date
  const effectiveDate = tx.penaltyEffectiveDate || tx.dueDate;
  const daysDiff = getDaysDiff(effectiveDate);
  
  if (daysDiff >= 0) return 0; // Not overdue yet based on effective date
  
  const overdueDays = Math.abs(daysDiff);
  const gracePeriod = tx.gracePeriod || 0;
  
  if (overdueDays <= gracePeriod) return 0;
  
  const penaltyDays = overdueDays - gracePeriod;
  let penalty = 0;
  
  const value = tx.penaltyValue;
  const isPercent = tx.penaltyType === 'percentage' || tx.penaltyType?.startsWith('percent');
  const rate = isPercent ? (tx.amount * (value / 100)) : value;
  
  // Backwards compatibility and new logic
  const freq = tx.penaltyFrequency || 
    (tx.penaltyType === 'percent_day' ? 'daily' : 
     tx.penaltyType === 'percent_week' ? 'weekly' : 
     tx.penaltyType === 'percent_month' ? 'monthly' : 'one_time');

  switch (freq) {
    case 'one_time':
      penalty = rate;
      break;
    case 'daily':
      penalty = rate * penaltyDays;
      break;
    case 'weekly':
      penalty = rate * Math.ceil(penaltyDays / 7);
      break;
    case 'monthly':
      penalty = rate * Math.ceil(penaltyDays / 30);
      break;
    default:
      penalty = rate;
  }
  
  if (tx.penaltyMaxCap && tx.penaltyMaxCap > 0) {
    penalty = Math.min(penalty, tx.penaltyMaxCap);
  }
  
  return penalty;
};

function AnimatedCounter({ value, isCurrency = false }: { value: number, isCurrency?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number;
    const duration = 1000;
    const startValue = displayValue;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(startValue + (value - startValue) * easeProgress);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{isCurrency ? formatCurrency(displayValue) : displayValue}</span>;
}

function PaymentCard({ 
  tx, 
  idx,
  onPauseResume, 
  onMarkReceived, 
  onDelete, 
  editingReminderId, 
  setEditingReminderId, 
  onUpdateFrequency,
  reminderConfirmId,
  setReminderConfirmId,
  onConfirmWhatsApp,
  onRemind,
  isGeneratingAiMessage,
  onEditPenalty
}: { 
  tx: PendingMoney, 
  idx: number,
  onPauseResume: (id: string) => void,
  onMarkReceived: (id: string) => void,
  onDelete: (id: string) => void,
  editingReminderId: string | null,
  setEditingReminderId: (id: string | null) => void,
  onUpdateFrequency: (id: string, freq: any) => void,
  reminderConfirmId: string | null,
  setReminderConfirmId: (id: string | null) => void,
  onConfirmWhatsApp: (tx: PendingMoney) => void,
  onRemind: (tx: PendingMoney) => void,
  isGeneratingAiMessage?: boolean,
  onEditPenalty: (tx: PendingMoney) => void
}) {
  const daysDiff = getDaysDiff(tx.dueDate);
  const isOverdue = daysDiff < 0;
  const isPaid = tx.status === 'completed';
  const { generalSettings } = useStore();
  const isPaused = tx.reminderStatus === 'paused';
  
  const penaltyAmount = getPenaltyAmount(tx, daysDiff);
  const totalDue = tx.amount + penaltyAmount;
  
  const probability = getProbability(tx.id, tx.amount, tx.dueDate);
  const reminderDetails = calculateReminderDetails(tx, generalSettings?.timezone);
  const remindersSent = reminderDetails.remindersSent;
  const totalReminders = reminderDetails.totalReminders;
  const progressPercent = Math.round((remindersSent / totalReminders) * 100);

  const [showMenu, setShowMenu] = useState(false);

  const formattedName = formatName(tx.personName);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: 0.03 * idx, ease: [0.16, 1, 0.3, 1] }}
      className="group vision-glass p-4 sm:p-6 rounded-[20px] sm:rounded-[22px] flex flex-col gap-4 sm:gap-5 relative overflow-hidden transition-all duration-200 ease-out shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-inner shrink-0">
            {getInitials(formattedName)}
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white leading-tight truncate">{formattedName}</h3>
            <div className="flex items-center gap-2 mt-1">
              {isPaid ? (
                <span className="px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">Paid</span>
              ) : isPaused ? (
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-wider border border-yellow-500/20">Paused</span>
              ) : isOverdue ? (
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">Overdue</span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">Active</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-left sm:text-right flex flex-wrap sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto gap-1 sm:gap-0">
          {tx.penaltyEnabled && penaltyAmount > 0 && !isPaid ? (
            <div className="flex flex-row sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0 mb-1">
              <span className="text-sm text-slate-400 line-through mr-1">{formatCurrency(tx.amount)}</span>
              <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">{formatCurrency(totalDue)}</span>
            </div>
          ) : (
            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">{formatCurrency(totalDue)}</span>
          )}
          {!isPaid && (
            <span className={`text-xs font-semibold mt-0.5 sm:mt-1 ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
              {isOverdue ? `Overdue by ${Math.abs(daysDiff)} Days` : (daysDiff === 0 ? 'Due Today' : `Due in ${daysDiff} Days`)}
            </span>
          )}
          
          {/* Late Penalty Button */}
          {!isPaid && (
            <button 
              onClick={() => onEditPenalty(tx)}
              className={`mt-2 sm:mt-2.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase border flex items-center gap-1.5 transition-all ${
                tx.penaltyEnabled && penaltyAmount > 0
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : tx.penaltyEnabled
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tx.penaltyEnabled && penaltyAmount > 0 ? (
                <>⚡ Penalty: {formatCurrency(penaltyAmount)} <Edit2 size={10} className="ml-0.5" /></>
              ) : tx.penaltyEnabled ? (
                <>⚡ Scheduled Penalty <Edit2 size={10} className="ml-0.5" /></>
              ) : (
                <><Plus size={12} /> Late Penalty</>
              )}
            </button>
          )}
        </div>
      </div>

      {!isPaid && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {/* Insight */}
          <div className="vision-glass-subtle rounded-2xl p-4 flex gap-3 relative overflow-hidden group/ai">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="text-purple-400 mt-0.5"><Brain size={18} /></div>
            <div>
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Insight</p>
              <p className="text-sm font-bold text-white">{probability}% Collection Chance</p>
              <p className="text-xs text-slate-400 mt-1">Expected payment within {probability > 80 ? '5' : '15'} days.</p>
            </div>
          </div>
          
          {/* Progress */}
          <div className="vision-glass-subtle rounded-2xl p-4 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reminder Progress</span>
              <span className="text-xs font-semibold text-white">{remindersSent} / {totalReminders} Sent</span>
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
              />
            </div>
            <div className="grid grid-cols-1 min-[340px]:grid-cols-3 gap-1.5 sm:gap-2 mt-2.5 pt-2.5 border-t border-white/[0.06] text-[11px] text-slate-400 font-medium">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-500 shrink-0">Last:</span>
                <span className="text-slate-300 truncate">{reminderDetails.lastSentDisplay || 'None'}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-500 shrink-0">Next:</span>
                <span className="text-slate-300 truncate">
                  {reminderDetails.isStopped 
                    ? 'Completed' 
                    : (reminderDetails.nextReminderDisplay === 'Today' 
                        ? 'Today' 
                        : (reminderDetails.nextReminderDate 
                            ? formatDate(reminderDetails.nextReminderDate, generalSettings?.timezone) 
                            : 'N/A'))}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0 min-[340px]:justify-end">
                <span className="text-slate-500 shrink-0">Status:</span>
                <span className={cn(
                  "font-semibold truncate px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider",
                  tx.phoneNumber 
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" 
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                )}>
                  {tx.phoneNumber ? 'Delivered' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Message Card */}
      {!isPaid && (
        <ReminderMessageEditor tx={tx} totalDue={totalDue} />
      )}

      {/* Notes */}
      <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
        <div className="flex items-start gap-3 text-sm">
          <span className="text-amber-500 mt-0.5">📝</span>
          <div>
            <span className="font-semibold text-amber-500/90 text-xs uppercase tracking-wider mb-1 block">Notes</span>
            <span className="text-slate-300 leading-relaxed">
              {tx.reason && tx.reason.trim() ? tx.reason : 'No notes added.'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-2 pt-4 border-t border-white/5 gap-3">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          {tx.phoneNumber && (
            <button 
              onClick={() => setReminderConfirmId(tx.id)} 
              aria-label="WhatsApp Reminder"
              className="col-span-2 sm:col-span-1 min-h-[48px] sm:w-auto px-4 flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl transition-all duration-200 ease-out active:scale-[0.98] border border-green-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 group/btn"
            >
              <MessageCircle size={18} className="group-hover/btn:scale-110 transition-transform duration-200" />
              <span className="text-xs font-bold">WhatsApp</span>
            </button>
          )}
          {!isPaid && (
            <>
              <button 
                onClick={() => onPauseResume(tx.id)} 
                aria-label={isPaused ? 'Resume Reminder' : 'Pause Reminder'}
                className="min-h-[48px] sm:w-auto px-4 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all duration-200 ease-out active:scale-[0.98] border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 group/btn"
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
                <span className="text-xs font-bold">{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
              <button 
                onClick={() => onMarkReceived(tx.id)} 
                aria-label="Mark Paid"
                className="min-h-[48px] sm:w-auto px-4 flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all duration-200 ease-out active:scale-[0.98] border border-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 group/btn"
              >
                <CheckCircle2 size={18} className="group-hover/btn:scale-110 transition-transform duration-200" />
                <span className="text-xs font-bold">Mark Paid</span>
              </button>
              <button 
                onClick={() => setEditingReminderId(tx.id)} 
                aria-label="Edit Reminder Frequency"
                className="min-h-[48px] sm:w-auto px-4 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all duration-200 ease-out active:scale-[0.98] border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 group/btn"
              >
                <Edit2 size={18} className="group-hover/btn:scale-110 transition-transform duration-200" />
                <span className="text-xs font-bold">Edit</span>
              </button>
            </>
          )}
          <button 
            type="button"
            onClick={() => onRemind(tx)} 
            aria-label="Send Reminder"
            className="min-h-[48px] sm:w-auto px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl transition-all duration-200 ease-out active:scale-[0.98] shadow-lg shadow-amber-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 group/btn"
          >
            <Bell size={18} className="group-hover/btn:scale-110 transition-transform duration-200" />
            <span className="text-xs font-bold">Send Reminder</span>
          </button>
          <button 
            onClick={() => onDelete(tx.id)} 
            aria-label="Delete Record"
            className="min-h-[48px] sm:w-auto px-4 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all duration-200 ease-out active:scale-[0.98] border border-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 group/btn"
          >
            <Trash size={18} className="group-hover/btn:scale-110 transition-transform duration-200" />
            <span className="text-xs font-bold">Delete</span>
          </button>
        </div>
        
        {/* More Menu */}
        <div className="relative w-full sm:w-auto mt-2 sm:mt-0">
          <button onClick={() => setShowMenu(!showMenu)} className="w-full sm:w-auto min-h-[48px] px-4 sm:px-0 sm:w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10">
            <span className="sm:hidden text-xs font-bold mr-2">More Options</span>
            <MoreVertical size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 bottom-12 w-48 bg-neutral-900 border border-white/10 rounded-2xl p-2 shadow-xl z-20"
              >
                <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg flex items-center gap-2"><Copy size={14}/> Duplicate</button>
                <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg flex items-center gap-2"><Phone size={14}/> Copy Number</button>
                <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg flex items-center gap-2"><Download size={14}/> Export PDF</button>
                <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg flex items-center gap-2"><Share2 size={14}/> Share</button>
                <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg flex items-center gap-2"><Archive size={14}/> Archive</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {reminderConfirmId === tx.id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <MessageCircle size={32} className="text-green-400 mb-3" />
            <h4 className="text-lg font-bold text-white mb-2">Send WhatsApp Reminder?</h4>
            <p className="text-sm text-slate-300 mb-6">This will generate a personalized message and open WhatsApp for {formattedName}.</p>
            <div className="flex gap-3">
              <button disabled={isGeneratingAiMessage} onClick={() => onConfirmWhatsApp(tx)} className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all flex items-center justify-center min-w-[120px] disabled:opacity-50">
                {isGeneratingAiMessage ? <Loader2 size={18} className="animate-spin" /> : 'Send Now'}
              </button>
              <button disabled={isGeneratingAiMessage} onClick={() => setReminderConfirmId(null)} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all disabled:opacity-50">Cancel</button>
            </div>
          </motion.div>
        )}
        {editingReminderId === tx.id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <Edit2 size={32} className="text-blue-400 mb-3" />
            <h4 className="text-lg font-bold text-white mb-4">Edit Reminder Frequency</h4>
            <div className="flex gap-3 items-center bg-black/40 p-2 rounded-xl border border-white/10">
              <select
                className="bg-transparent text-white font-semibold focus:outline-none appearance-none px-4 py-2"
                value={tx.reminderFrequency}
                onChange={(e) => {
                  onUpdateFrequency(tx.id, e.target.value);
                  setEditingReminderId(null);
                }}
              >
                <option value="once">Once</option>
                <option value="3days">Every 3 days</option>
                <option value="7days">Every 7 days</option>
                <option value="15days">Every 15 days</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <button onClick={() => setEditingReminderId(null)} className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all">Done</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PendingPayments() {
  const { 
    addPendingMoney,
    updateTransaction, 
    markAsReceived, 
    toggleReminderStatus, 
    advanceReminderDate, 
    updateReminderFrequency, 
    transactions, 
    deleteTransaction, 
    generalSettings, 
    customReminderTemplate, 
    addReminderHistoryLog,
    dataStatus,
    dataError,
    retryFetchData
  } = useStore();
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reason, setReason] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState<PendingMoney['reminderFrequency']>('once');
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penaltyType, setPenaltyType] = useState<PendingMoney['penaltyType']>('fixed');
  const [penaltyValue, setPenaltyValue] = useState('');
  const [gracePeriod, setGracePeriod] = useState('3');
  const [aiTone, setAiTone] = useState<PendingMoney['aiTone']>('friendly');
  const [reminderConfirmId, setReminderConfirmId] = useState<string | null>(null);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [noWhatsAppTx, setNoWhatsAppTx] = useState<PendingMoney | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pendingTransactions = transactions.filter((t): t is PendingMoney => t.type === 'pending');

  const { pendingRecordsCount, totalPendingAmount, overdueAmount, overdueCount, collectedThisMonthAmount, collectedThisMonthCount } = useMemo(() => {
    let pRecordsCount = 0;
    let tPendingAmount = 0;
    let oAmount = 0;
    let oCount = 0;
    let cThisMonthAmount = 0;
    let cThisMonthCount = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    transactions.forEach(tx => {
      const amt = Number(tx.amount || 0);
      if (
        tx.type === 'pending' && 
        (tx.status === 'pending' || tx.status === 'overdue' || (tx.status !== 'completed' && tx.status !== 'cancelled' && tx.status !== 'closed'))
      ) {
        pRecordsCount++;
        tPendingAmount += amt;
        
        const dueDate = new Date(tx.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today || tx.status === 'overdue') {
          oAmount += amt;
          oCount++;
        }
      } else if (tx.type === 'received' && (tx.purpose?.startsWith('Settled: ') || (tx as any).settledFromPending)) {
        const rxDate = new Date(tx.date);
        if (rxDate.getMonth() === currentMonth && rxDate.getFullYear() === currentYear) {
          cThisMonthAmount += amt;
          cThisMonthCount++;
        }
      }
    });

    return {
      pendingRecordsCount: pRecordsCount,
      totalPendingAmount: tPendingAmount,
      overdueAmount: oAmount,
      overdueCount: oCount,
      collectedThisMonthAmount: cThisMonthAmount,
      collectedThisMonthCount: cThisMonthCount
    };
  }, [transactions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !amount || !dueDate || !reason) return;

    addPendingMoney({
      personName: formatName(personName),
      phoneNumber,
      email,
      amount: Number(amount),
      dueDate,
      reason,
      reminderFrequency,
      penaltyEnabled,
      penaltyType: penaltyEnabled ? penaltyType : undefined,
      penaltyValue: penaltyEnabled ? Number(penaltyValue) : undefined,
      gracePeriod: Number(gracePeriod),
      aiTone,
    });

    setPersonName('');
    setAmount('');
    setDueDate('');
    setReason('');
    setPhoneNumber('');
    setEmail('');
    setReminderFrequency('once');
    setPenaltyEnabled(false);
    setPenaltyValue('');
    setGracePeriod('3');
    setAiTone('friendly');
  };

  const [isGeneratingAiMessage, setIsGeneratingAiMessage] = useState(false);
  const [editingPenaltyTx, setEditingPenaltyTx] = useState<PendingMoney | null>(null);

  const handleSavePenalty = (id: string, updates: Partial<PendingMoney>) => {
    updateTransaction(id, updates);
    setToastMessage("Late penalty settings updated successfully.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendReminder = async (tx: PendingMoney) => {
    setIsGeneratingAiMessage(true);
    
    const daysDiff = getDaysDiff(tx.dueDate);
    const penalty = getPenaltyAmount(tx, daysDiff);
    const totalDue = tx.amount + penalty;

    const timezone = generalSettings?.timezone || 'Asia/Kolkata';
    const template = tx.customReminderMessage || generateSmartDefaultReminder(tx, timezone, totalDue);
    const message = formatReminderMessage(template, tx, timezone, totalDue);
    
    setIsGeneratingAiMessage(false);
    
    const reminderDetails = calculateReminderDetails(tx, generalSettings?.timezone);

    addReminderHistoryLog({
      transactionId: tx.id,
      customerName: formatName(tx.personName),
      amount: totalDue,
      dateTime: new Date().toISOString(),
      sentVia: 'WhatsApp',
      reminderCount: reminderDetails.remindersSent + 1,
      nextReminderDate: reminderDetails.nextReminderDate
    });

    const encodedMessage = encodeURIComponent(message);
    let cleanPhone = (tx.phoneNumber || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    window.open(url, '_blank');
    setReminderConfirmId(null);
    advanceReminderDate(tx.id);
  };

  const handleRemind = (tx: PendingMoney) => {
    if (!tx.phoneNumber || !tx.phoneNumber.trim()) {
      setNoWhatsAppTx(tx);
      return;
    }

    const daysDiff = getDaysDiff(tx.dueDate);
    const penalty = getPenaltyAmount(tx, daysDiff);
    const totalDue = tx.amount + penalty;
    const reminderDetails = calculateReminderDetails(tx, generalSettings?.timezone);
    const timezone = generalSettings?.timezone || 'Asia/Kolkata';

    const template = tx.customReminderMessage || generateSmartDefaultReminder(tx, timezone, totalDue);
    const message = formatReminderMessage(template, tx, timezone, totalDue);

    let cleanPhone = tx.phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    addReminderHistoryLog({
      transactionId: tx.id,
      customerName: formatName(tx.personName),
      amount: totalDue,
      dateTime: new Date().toISOString(),
      sentVia: 'WhatsApp',
      reminderCount: reminderDetails.remindersSent + 1,
      nextReminderDate: reminderDetails.nextReminderDate
    });

    advanceReminderDate(tx.id);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      deleteTransaction(id);
      setToastMessage("Pending payment deleted successfully.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
      loadingMessage="Loading pending payments..."
      skeletonType="cards"
    >
      <motion.div 
        layoutId="shared-pending"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-8"
      >
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#ffd60a] uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[#ffd60a]" /> Due Money Ledger
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Due Money
          </h1>
          <p className="text-[#86868b] mt-1 text-sm font-medium">Track who owes you money, send friendly reminders, and record payments easily.</p>
        </header>

      {/* Apple Metrics 4-Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
        
        {/* Card 1: Pending Records */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#12131a]/85 border border-white/[0.08] rounded-2xl p-3.5 sm:p-5 backdrop-blur-2xl shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
            <div className="p-2 sm:p-2.5 bg-[#0a84ff]/15 rounded-xl shrink-0">
              <ClipboardList size={16} className="text-[#0a84ff]" />
            </div>
            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#86868b] truncate">Receivables</h3>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 sm:mt-2 font-tabular">
            <AnimatedCounter value={pendingRecordsCount} />
          </div>
        </motion.div>

        {/* Card 2: Total Pending */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#12131a]/85 border border-white/[0.08] rounded-2xl p-3.5 sm:p-5 backdrop-blur-2xl shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
            <div className="p-2 sm:p-2.5 bg-[#ffd60a]/15 rounded-xl shrink-0">
              <Coins size={16} className="text-[#ffd60a]" />
            </div>
            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#86868b] truncate">Outstanding</h3>
          </div>
          <div className="text-xl min-[380px]:text-2xl sm:text-3xl font-extrabold text-[#ffd60a] mt-1 sm:mt-2 font-tabular truncate">
            <AnimatedCounter value={totalPendingAmount} isCurrency />
          </div>
        </motion.div>

        {/* Card 3: Overdue */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#12131a]/85 border border-[#ff453a]/25 rounded-2xl p-3.5 sm:p-5 backdrop-blur-2xl shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="p-2 sm:p-2.5 bg-[#ff453a]/15 rounded-xl shrink-0">
                <AlertTriangle size={16} className="text-[#ff453a]" />
              </div>
              <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#ff453a] truncate">Overdue</h3>
            </div>
            <div className="text-xl min-[380px]:text-2xl sm:text-3xl font-extrabold text-[#ff453a] mt-1 sm:mt-2 font-tabular truncate">
              <AnimatedCounter value={overdueAmount} isCurrency />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-[#ff453a]/80 font-semibold truncate">
            {overdueCount} {overdueCount === 1 ? 'record' : 'records'} overdue
          </div>
        </motion.div>

        {/* Card 4: Collected This Month */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#12131a]/85 border border-[#30d158]/25 rounded-2xl p-3.5 sm:p-5 backdrop-blur-2xl shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="p-2 sm:p-2.5 bg-[#30d158]/15 rounded-xl shrink-0">
                <CheckCircle2 size={16} className="text-[#30d158]" />
              </div>
              <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#30d158] truncate">Settled</h3>
            </div>
            <div className="text-xl min-[380px]:text-2xl sm:text-3xl font-extrabold text-[#30d158] mt-1 sm:mt-2 font-tabular truncate">
              <AnimatedCounter value={collectedThisMonthAmount} isCurrency />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-[#30d158]/80 font-semibold truncate">
            {collectedThisMonthCount} collected
          </div>
        </motion.div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-[22px] sm:rounded-[2.5rem] p-4 sm:p-6 backdrop-blur-xl"
          >
            <h2 className="text-lg font-bold text-white mb-6">Add Pending Entry</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Person Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm"
                    placeholder="e.g. Amit Kumar"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">WhatsApp Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm"
                    placeholder="e.g. 919876543210"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Email (Optional)</label>
                <div className="relative">
                  <MessageCircle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm"
                    placeholder="e.g. user@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-8 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm font-mono"
                    placeholder="10000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Due Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Reason</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm"
                    placeholder="e.g. Borrowed Money"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Reminder Frequency</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <select
                    value={reminderFrequency}
                    onChange={(e) => setReminderFrequency(e.target.value as PendingMoney['reminderFrequency'])}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm appearance-none"
                  >
                    <option value="once" className="bg-neutral-900">Once</option>
                    <option value="3days" className="bg-neutral-900">Every 3 days</option>
                    <option value="7days" className="bg-neutral-900">Every 7 days</option>
                    <option value="15days" className="bg-neutral-900">Every 15 days</option>
                    <option value="monthly" className="bg-neutral-900">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 pb-2">
                 <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                     <input type="checkbox" className="sr-only" checked={penaltyEnabled} onChange={(e) => setPenaltyEnabled(e.target.checked)} />
                     <div className={`block w-10 h-6 rounded-full transition-colors ${penaltyEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                     <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${penaltyEnabled ? 'translate-x-4' : ''}`}></div>
                   </div>
                   <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Enable Late Penalty</span>
                 </label>
              </div>

              {penaltyEnabled && (
                 <div className="bg-black/30 p-4 rounded-2xl border border-indigo-500/20 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-400">Penalty Type</label>
                      <select
                        value={penaltyType}
                        onChange={(e) => setPenaltyType(e.target.value as PendingMoney['penaltyType'])}
                        className="w-full bg-black/40 border border-white/10 rounded-xl min-h-[40px] px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors text-sm appearance-none"
                      >
                        <option value="fixed" className="bg-neutral-900">Fixed Amount</option>
                        <option value="percent_day" className="bg-neutral-900">Percentage Per Day</option>
                        <option value="percent_week" className="bg-neutral-900">Percentage Per Week</option>
                        <option value="percent_month" className="bg-neutral-900">Percentage Per Month</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1.5">
                         <label className="text-sm font-semibold text-slate-400">Value</label>
                         <input
                           type="number"
                           value={penaltyValue}
                           onChange={(e) => setPenaltyValue(e.target.value)}
                           className="w-full bg-black/40 border border-white/10 rounded-xl min-h-[40px] px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors text-sm"
                           placeholder={penaltyType === 'fixed' ? 'Amount (₹)' : '%'}
                           required={penaltyEnabled}
                         />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-sm font-semibold text-slate-400">Grace Period (Days)</label>
                         <input
                           type="number"
                           value={gracePeriod}
                           onChange={(e) => setGracePeriod(e.target.value)}
                           className="w-full bg-black/40 border border-white/10 rounded-xl min-h-[40px] px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors text-sm"
                           required={penaltyEnabled}
                         />
                       </div>
                    </div>
                 </div>
              )}

              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-semibold text-slate-400">Message Tone</label>
                <div className="relative">
                  <Brain className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value as PendingMoney['aiTone'])}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm appearance-none"
                  >
                    <option value="friendly" className="bg-neutral-900">Friendly</option>
                    <option value="professional" className="bg-neutral-900">Professional</option>
                    <option value="strict" className="bg-neutral-900">Strict</option>
                    <option value="formal" className="bg-neutral-900">Formal</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold min-h-[48px] rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-600/30"
              >
                <Plus size={18} />
                Add Pending Payment
              </button>
            </form>
          </motion.div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-lg font-semibold text-white px-2">Records</h2>
          
          <div className="space-y-3">
            {pendingTransactions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl h-16 flex items-center justify-center text-slate-600 text-sm">
                <p>No pending payments found.</p>
              </div>
            ) : (
              <AnimatePresence>
                {pendingTransactions.map((tx, idx) => (
                  <PaymentCard 
                    key={tx.id} 
                    tx={tx} 
                    idx={idx}
                    onPauseResume={toggleReminderStatus}
                    onMarkReceived={markAsReceived}
                    onDelete={setDeleteConfirmId}
                    editingReminderId={editingReminderId}
                    setEditingReminderId={setEditingReminderId}
                    onUpdateFrequency={updateReminderFrequency}
                    reminderConfirmId={reminderConfirmId}
                    setReminderConfirmId={setReminderConfirmId}
                    onConfirmWhatsApp={handleSendReminder}
                    onRemind={handleRemind}
                    isGeneratingAiMessage={isGeneratingAiMessage && reminderConfirmId === tx.id}
                    onEditPenalty={setEditingPenaltyTx}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

    </motion.div>

    {/* All Modals moved out of motion.div to prevent fixed position clipping */}
    <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4 text-red-400">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-semibold text-white">Delete Pending Payment</h3>
              </div>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                Are you sure you want to permanently delete this pending payment record? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash size={16} />}
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {noWhatsAppTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-neutral-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">WhatsApp Number Required</h3>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                WhatsApp number not available for this customer.
              </p>
              <button
                type="button"
                onClick={() => setNoWhatsAppTx(null)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-500/90 text-white px-4 py-3 rounded-xl font-medium shadow-lg backdrop-blur-sm flex items-center gap-2 border border-green-400/20"
          >
            <CheckCircle2 size={18} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

    {editingPenaltyTx && (
      <LatePenaltyModal
        tx={editingPenaltyTx}
        isOpen={!!editingPenaltyTx}
        onClose={() => setEditingPenaltyTx(null)}
        onSave={(id, updates) => {
          handleSavePenalty(id, updates);
          setEditingPenaltyTx(null);
        }}
      />
    )}
    </DataStateGuard>
  );
}
