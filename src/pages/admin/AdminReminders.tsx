import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCircle2, Clock, Calendar, Send, ShieldCheck, Sparkles, Smartphone } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { cn, formatDate, formatReminderMessage, DEFAULT_REMINDER_TEMPLATE } from '../../lib/utils';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { M3TextField } from '../../components/admin/material3/M3TextField';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';

export default function AdminReminders() {
  const { 
    transactions, 
    addReminderHistoryLog, 
    advanceReminderDate, 
    generalSettings, 
    customReminderTemplate 
  } = useStore();
  const { showSuccess, showInfo, showError } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [phonePromptTx, setPhonePromptTx] = useState<any | null>(null);
  const [phoneInput, setPhoneInput] = useState('');

  const pendingTransactions = transactions
    ? transactions.filter((t: any) => t.type === 'pending' || t.status === 'pending' || t.isPending === true || t.status === 'overdue')
    : [];

  const sendWhatsAppReminder = (tx: any, phone: string) => {
    const template = customReminderTemplate || DEFAULT_REMINDER_TEMPLATE;
    const message = formatReminderMessage(
      template,
      {
        ...tx,
        personName: tx.personName || 'Customer',
        amount: Number(tx.amount) || 0,
        dueDate: tx.dueDate || new Date().toISOString().split('T')[0],
      } as any,
      generalSettings?.timezone,
      Number(tx.amount) || 0
    );

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    addReminderHistoryLog({
      transactionId: tx.id,
      customerName: tx.personName || 'Customer',
      amount: Number(tx.amount) || 0,
      dateTime: new Date().toISOString(),
      sentVia: 'WhatsApp',
      reminderCount: 1,
      nextReminderDate: tx.dueDate || '',
    });

    advanceReminderDate(tx.id);

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      showSuccess('WhatsApp Queued', `Reminder dispatched to ${tx.personName}.`);
    } else {
      navigator.clipboard?.writeText(message);
      showInfo('Copied to Clipboard', `Reminder text copied. No phone number provided for ${tx.personName}.`);
    }
  };

  const handleSendSingle = (tx: any) => {
    const phone = tx.phoneNumber || tx.phone || '';
    if (!phone.trim()) {
      setPhonePromptTx(tx);
      setPhoneInput('');
      return;
    }
    sendWhatsAppReminder(tx, phone);
  };

  const handleSendAll = () => {
    if (pendingTransactions.length === 0) return;
    let count = 0;
    pendingTransactions.forEach((tx: any) => {
      const phone = tx.phoneNumber || tx.phone || '';
      addReminderHistoryLog({
        transactionId: tx.id,
        customerName: tx.personName || 'Customer',
        amount: Number(tx.amount) || 0,
        dateTime: new Date().toISOString(),
        sentVia: 'WhatsApp',
        reminderCount: 1,
        nextReminderDate: tx.dueDate || '',
      });
      advanceReminderDate(tx.id);
      count++;
    });
    showSuccess('Batch Reminders Logged', `Logged and scheduled ${count} pending payment reminders.`);
  };

  const handlePhonePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phonePromptTx) return;
    if (!phoneInput.trim()) {
      showError('Number Required', 'Please enter a valid phone number.');
      return;
    }
    sendWhatsAppReminder(phonePromptTx, phoneInput.trim());
    setPhonePromptTx(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Automated Payment Reminders
          </h1>
          <p className={cn('text-xs sm:text-sm mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
            Configure automated overdue notifications and trigger batch WhatsApp/SMS payment reminders.
          </p>
        </div>

        {pendingTransactions.length > 0 && (
          <M3Button
            variant="filled"
            icon={Send}
            onClick={handleSendAll}
          >
            Dispatch All Reminders ({pendingTransactions.length})
          </M3Button>
        )}
      </div>

      {/* Reminder Cards */}
      <M3Card variant="elevated" padding="lg" className="space-y-4">
        <h2 className={cn('text-lg font-bold tracking-tight mb-2', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
          Active Scheduled Reminders ({pendingTransactions.length})
        </h2>

        {pendingTransactions.length > 0 ? (
          <div className="space-y-3">
            {pendingTransactions.map((tx: any, idx: number) => (
              <div
                key={tx.id || idx}
                className={cn(
                  'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors',
                  isDark ? 'bg-[#1e1f20] border-[#2d2f31]' : 'bg-[#f0f4f9] border-[#e1e3e1]'
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div className={cn(
                    'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
                    isDark ? 'bg-[#5c3e00] text-[#ffe082]' : 'bg-[#ffe082] text-[#3e2700]'
                  )}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{tx.personName || 'Pending Customer'}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Due: {formatDate(tx.dueDate || tx.date || '')}</span>
                      <span>•</span>
                      <span>Cadence: {tx.reminderFrequency || '7days'}</span>
                      {tx.phoneNumber && (
                        <>
                          <span>•</span>
                          <span>{tx.phoneNumber}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-base text-[#ffe082]">
                      ₹{(Number(tx.amount) || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Scheduled</span>
                  </div>

                  <M3Button
                    variant="tonal"
                    size="sm"
                    icon={Send}
                    onClick={() => handleSendSingle(tx)}
                  >
                    Dispatch
                  </M3Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <div className="w-12 h-12 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <div className={cn('text-base font-bold', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
              All dues collected
            </div>
            <div className="text-xs mt-0.5">No outstanding scheduled reminders required at this time.</div>
          </div>
        )}
      </M3Card>

      {/* Phone Prompt Modal */}
      <M3Dialog
        isOpen={Boolean(phonePromptTx)}
        onClose={() => setPhonePromptTx(null)}
        title="Enter Customer Contact"
        subtitle={`Dispatch reminder to ${phonePromptTx?.personName}`}
        icon={Smartphone}
        iconTone="amber"
        actions={
          <>
            <M3Button variant="text" onClick={() => setPhonePromptTx(null)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" onClick={handlePhonePromptSubmit}>
              Send WhatsApp
            </M3Button>
          </>
        }
      >
        <form onSubmit={handlePhonePromptSubmit} className="space-y-4">
          <p className="text-xs text-slate-300">
            Please enter a 10-digit mobile number for <strong className="text-white">{phonePromptTx?.personName}</strong>:
          </p>
          <M3TextField
            label="Mobile Number / WhatsApp"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="e.g. 9876543210"
            required
            autoFocus
          />
        </form>
      </M3Dialog>
    </div>
  );
}
