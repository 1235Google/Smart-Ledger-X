import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PendingMoney } from '../types';
import { X, Save, AlertTriangle, Trash2, Calendar, Hash, Percent, Zap } from 'lucide-react';
import { formatCurrency, getDaysDiff } from '../lib/utils';
import { useStore } from '../context/StoreContext';

interface LatePenaltyModalProps {
  tx: PendingMoney;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<PendingMoney>) => void;
}

export default function LatePenaltyModal({ tx, isOpen, onClose, onSave }: LatePenaltyModalProps) {
  const [enabled, setEnabled] = useState(tx.penaltyEnabled || false);
  const [type, setType] = useState<'fixed' | 'percentage'>(tx.penaltyType === 'percentage' || tx.penaltyType?.startsWith('percent') ? 'percentage' : 'fixed');
  const [value, setValue] = useState(tx.penaltyValue?.toString() || '');
  const [frequency, setFrequency] = useState<'one_time' | 'daily' | 'weekly' | 'monthly'>(
    tx.penaltyFrequency || 
    (tx.penaltyType === 'percent_day' ? 'daily' : 
     tx.penaltyType === 'percent_week' ? 'weekly' : 
     tx.penaltyType === 'percent_month' ? 'monthly' : 'one_time')
  );
  const [gracePeriod, setGracePeriod] = useState(tx.gracePeriod?.toString() || '0');
  const [maxCap, setMaxCap] = useState(tx.penaltyMaxCap?.toString() || '');
  const [effectiveDate, setEffectiveDate] = useState(tx.penaltyEffectiveDate || tx.dueDate);

  useEffect(() => {
    if (isOpen) {
      setEnabled(tx.penaltyEnabled || false);
      setType(tx.penaltyType === 'percentage' || tx.penaltyType?.startsWith('percent') ? 'percentage' : 'fixed');
      setValue(tx.penaltyValue?.toString() || '');
      setFrequency(tx.penaltyFrequency || 
        (tx.penaltyType === 'percent_day' ? 'daily' : 
         tx.penaltyType === 'percent_week' ? 'weekly' : 
         tx.penaltyType === 'percent_month' ? 'monthly' : 'one_time')
      );
      setGracePeriod(tx.gracePeriod?.toString() || '0');
      setMaxCap(tx.penaltyMaxCap?.toString() || '');
      setEffectiveDate(tx.penaltyEffectiveDate || tx.dueDate);
    }
  }, [tx, isOpen]);

  // Live calculation preview
  const previewCalculation = () => {
    if (!enabled || !value || isNaN(Number(value))) return { penalty: 0, days: 0 };
    
    const daysDiff = getDaysDiff(effectiveDate);
    if (daysDiff >= 0) return { penalty: 0, days: 0 }; // Not overdue yet
    
    const overdueDays = Math.abs(daysDiff);
    const gp = Number(gracePeriod) || 0;
    if (overdueDays <= gp) return { penalty: 0, days: overdueDays };
    
    const penaltyDays = overdueDays - gp;
    let penalty = 0;
    
    const valNum = Number(value);
    const rate = type === 'percentage' ? (tx.amount * (valNum / 100)) : valNum;
    
    switch (frequency) {
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
    
    const cap = Number(maxCap);
    if (cap > 0) {
      penalty = Math.min(penalty, cap);
    }
    
    return { penalty, days: overdueDays };
  };

  const preview = previewCalculation();

  const handleSave = () => {
    onSave(tx.id, {
      penaltyEnabled: enabled,
      penaltyType: type,
      penaltyFrequency: frequency,
      penaltyValue: Number(value) || 0,
      gracePeriod: Number(gracePeriod) || 0,
      penaltyMaxCap: Number(maxCap) || 0,
      penaltyEffectiveDate: effectiveDate
    });
    onClose();
  };

  const handleRemove = () => {
    onSave(tx.id, {
      penaltyEnabled: false,
      penaltyValue: 0
    });
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#12131a]/95 border border-white/[0.08] p-6 rounded-2xl shadow-2xl w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Zap className="text-orange-400" size={24} />
              Late Penalty Settings
            </h2>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div>
                <h3 className="font-semibold text-white">Enable Late Penalty</h3>
                <p className="text-xs text-slate-400 mt-0.5">Automatically apply charges for overdue payments</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            <AnimatePresence>
              {enabled && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-4">
                    {/* Penalty Type */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</label>
                      <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                        <button
                          className={`flex-1 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors ${type === 'fixed' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                          onClick={() => setType('fixed')}
                        >
                          <Hash size={14} /> Fixed
                        </button>
                        <button
                          className={`flex-1 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors ${type === 'percentage' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                          onClick={() => setType('percentage')}
                        >
                          <Percent size={14} /> Percent
                        </button>
                      </div>
                    </div>
                    
                    {/* Penalty Value */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Value {type === 'percentage' ? '(%)' : '(₹)'}
                      </label>
                      <input 
                        type="number"
                        min="0"
                        step={type === 'percentage' ? "0.1" : "1"}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg h-9 px-3 text-white focus:outline-none focus:border-orange-500/50 text-sm"
                        placeholder={type === 'percentage' ? "e.g. 2" : "e.g. 50"}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Frequency */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Frequency</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as any)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg h-9 px-3 text-white focus:outline-none focus:border-orange-500/50 text-sm appearance-none"
                      >
                        <option value="one_time" className="bg-slate-900">One Time</option>
                        <option value="daily" className="bg-slate-900">Per Day</option>
                        <option value="weekly" className="bg-slate-900">Per Week</option>
                        <option value="monthly" className="bg-slate-900">Per Month</option>
                      </select>
                    </div>

                    {/* Grace Period */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Grace Period (Days)</label>
                      <input 
                        type="number"
                        min="0"
                        value={gracePeriod}
                        onChange={(e) => setGracePeriod(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg h-9 px-3 text-white focus:outline-none focus:border-orange-500/50 text-sm"
                        placeholder="e.g. 3"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Effective Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar size={12} /> Effective Date
                      </label>
                      <input 
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg h-9 px-3 text-white focus:outline-none focus:border-orange-500/50 text-sm [color-scheme:dark]"
                      />
                    </div>

                    {/* Maximum Cap */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Max Cap (₹) (Optional)</label>
                      <input 
                        type="number"
                        min="0"
                        value={maxCap}
                        onChange={(e) => setMaxCap(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg h-9 px-3 text-white focus:outline-none focus:border-orange-500/50 text-sm"
                        placeholder="e.g. 2000"
                      />
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div className="mt-6 bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden">
                    <div className="bg-white/5 px-4 py-2 border-b border-white/5">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Preview</h4>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Original Amount:</span>
                        <span className="text-white font-medium">{formatCurrency(tx.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Late Penalty <span className="text-[10px] text-slate-500">({preview.days > 0 ? `${preview.days} days overdue` : 'Scheduled'})</span>:</span>
                        <span className="text-orange-400 font-bold">{preview.penalty > 0 ? '+' : ''}{formatCurrency(preview.penalty)}</span>
                      </div>
                      <div className="h-px w-full bg-white/10 my-2"></div>
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-300">Updated Total:</span>
                        <span className="text-white text-lg">{formatCurrency(tx.amount + preview.penalty)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-3 mt-8">
            <button 
              onClick={handleRemove}
              className="px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> Remove
            </button>
            <div className="flex-1 flex gap-3 justify-end">
              <button 
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={enabled && (!value || isNaN(Number(value)) || Number(value) < 0)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-sm font-semibold shadow-lg shadow-orange-500/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
