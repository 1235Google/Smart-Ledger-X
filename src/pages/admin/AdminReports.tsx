import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Mail, 
  Server, 
  Users, 
  Wallet 
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';

export default function AdminReports() {
  const { 
    transactions = [], 
    currentBalance, 
    totalReceived, 
    customers = [], 
    adminUser 
  } = useStore();
  
  const { showSuccess, showError, showInfo } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [isLoading, setIsLoading] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('smartledgerx811@gmail.com');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Calculate current month's stats from live transactions
  const currentMonthName = useMemo(() => {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const stats = useMemo(() => {
    const safeTx = transactions || [];
    const incomeTx = safeTx.filter(t => t.type === 'received' || (t.type as string) === 'income');
    const incomeThisMonth = incomeTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const highestPayment = incomeTx.reduce((max, t) => Math.max(max, Number(t.amount) || 0), 0);
    
    return {
      incomeThisMonth,
      highestPayment,
      countThisMonth: incomeTx.length
    };
  }, [transactions]);

  const handleSendMonthlyReportNow = async () => {
    setIsLoading(true);
    setStatusMessage({ text: 'Generating Monthly Financial Report...', type: 'info' });

    try {
      const res = await fetch('/api/send-monthly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recipientEmail.trim().toLowerCase(),
          month: currentMonthName,
          currentBalance: currentBalance || 0,
          incomeThisMonth: stats.incomeThisMonth,
          highestPaymentReceived: stats.highestPayment,
          numberOfIncomeTransactions: stats.countThisMonth,
          aiSummary: "SmartLedger enterprise overview compiled automatically by verified admin dispatcher."
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch report via Resend API.');
      }

      setStatusMessage({
        text: `Success! Monthly financial report successfully dispatched to ${recipientEmail} via Resend.`,
        type: 'success'
      });
      showSuccess('Report Dispatched', `Monthly report successfully delivered to ${recipientEmail}`);
    } catch (err: any) {
      console.error('[SendReport] Error dispatching monthly report:', err);
      setStatusMessage({
        text: err.message || 'Verification Error. Ensure your recipient email matches the Resend registered signup address.',
        type: 'error'
      });
      showError('Dispatch Failed', err.message || 'Failed to send email report.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col gap-2">
        <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
          Reports Center
        </h1>
        <p className={cn('text-xs sm:text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Generate and trigger secure administrative and financial summaries to your Resend account email.
        </p>
      </div>

      {/* Report Summary Details Card */}
      <M3Card variant="elevated">
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#004a77] text-[#c2e7ff] flex items-center justify-center shrink-0">
              <FileText size={24} className="text-[#a8c7fa]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Monthly Ledger Summary • {currentMonthName}</h2>
              <p className="text-xs text-slate-400 mt-1">Real-time ledger snapshot compiled directly from live database.</p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Wallet size={13} /> Current Balance
            </div>
            <p className="text-xl font-mono font-extrabold text-white">₹{(currentBalance || 0).toLocaleString('en-IN')}</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" /> Income This Month
            </div>
            <p className="text-xl font-mono font-extrabold text-emerald-400">₹{stats.incomeThisMonth.toLocaleString('en-IN')}</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Users size={13} className="text-indigo-400" /> Transactions Count
            </div>
            <p className="text-xl font-mono font-extrabold text-indigo-400">{stats.countThisMonth}</p>
          </div>
        </div>
      </M3Card>

      {/* Manual Send Controls */}
      <M3Card variant="elevated" padding="lg" className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Mail size={16} className="text-indigo-400" />
            <span>Resend Sandbox Dispatch</span>
          </h3>
          <p className="text-xs text-slate-400">
            SmartLedger integrates directly with Resend's high-speed delivery service. Trigger a real monthly financial summary now.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-400" />
            <span>Resend Free Tier Limitation Notice</span>
          </div>
          <p className="leading-relaxed">
            In Resend's free tier sandbox mode, live email dispatches are strictly restricted to your registered account email: <strong className="text-white">smartledgerx811@gmail.com</strong>. Attempting to send to any other unverified domain will fail.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Recipient Email Address</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="smartledgerx811@gmail.com"
                className="flex-1 text-xs bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
              <button
                onClick={() => setRecipientEmail('smartledgerx811@gmail.com')}
                className="px-3.5 py-2 text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl transition-all"
              >
                Reset to Sandbox Default
              </button>
            </div>
          </div>

          <M3Button
            variant="filled"
            onClick={handleSendMonthlyReportNow}
            disabled={isLoading}
            icon={Send}
            className="w-full py-3 font-bold"
          >
            {isLoading ? 'Delivering Report...' : 'Send Monthly Report Now'}
          </M3Button>

          {statusMessage && (
            <div className={cn(
              'p-4 rounded-2xl border text-xs leading-relaxed font-medium transition-all animate-fade-in',
              statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
              statusMessage.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' :
              'bg-blue-500/10 border-blue-500/30 text-blue-300'
            )}>
              {statusMessage.text}
            </div>
          )}
        </div>
      </M3Card>
    </div>
  );
}
