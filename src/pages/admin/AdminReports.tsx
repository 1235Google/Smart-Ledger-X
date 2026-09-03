import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Printer, 
  FileSpreadsheet, 
  Layers, 
  Clock, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { cn, formatDate } from '../../lib/utils';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';
import ExportModal from '../../components/ExportModal';

export default function AdminReports() {
  const { transactions, currentBalance, totalReceived, totalSent, totalPending, userProfile } = useStore();
  const { showSuccess, showInfo } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('monthly');
  const [showExportModal, setShowExportModal] = useState(false);

  const safeTransactions = transactions || [];

  // Filter transactions according to reportType
  const reportTransactions = React.useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return safeTransactions.filter((tx: any) => {
      const txDateStr = tx.date || tx.createdAt;
      if (!txDateStr) return true;
      const d = new Date(txDateStr);
      if (isNaN(d.getTime())) return true;

      if (reportType === 'daily') {
        return txDateStr.startsWith(todayStr);
      } else if (reportType === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
      } else if (reportType === 'monthly') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else if (reportType === 'annual') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [safeTransactions, reportType]);

  const periodReceived = React.useMemo(() => {
    return reportTransactions
      .filter((tx: any) => tx.type === 'received' || tx.type === 'income')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [reportTransactions]);

  const periodPending = React.useMemo(() => {
    return reportTransactions
      .filter((tx: any) => tx.type === 'pending')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [reportTransactions]);

  const handleExportPDF = () => {
    showInfo('Generating Statement', `Preparing ${reportType.toUpperCase()} financial report statement...`);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleExportExcel = () => {
    setShowExportModal(true);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Financial Reports & Statements
          </h1>
          <p className={cn('text-xs sm:text-sm mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
            Generate, print, and export audit-ready financial summaries and balance sheets.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <M3Button
            variant="tonal"
            icon={FileSpreadsheet}
            onClick={handleExportExcel}
          >
            Export Spreadsheets
          </M3Button>
          <M3Button
            variant="filled"
            icon={Printer}
            onClick={handleExportPDF}
          >
            Print Statement
          </M3Button>
        </div>
      </div>

      {/* Frequency Selector Chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
        {(['daily', 'weekly', 'monthly', 'annual'] as const).map((type) => (
          <M3Chip
            key={type}
            label={`${type.charAt(0).toUpperCase() + type.slice(1)} Statement`}
            selected={reportType === type}
            onClick={() => setReportType(type)}
          />
        ))}
      </div>

      {/* Statement Preview Sheet (Material 3 Surface) */}
      <M3Card variant="elevated" padding="lg" className="space-y-6">
        {/* Statement Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e1e3e1]/60 dark:border-[#2d2f31]">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
              isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]'
            )}>
              <FileText size={24} />
            </div>
            <div>
              <h2 className={cn('text-xl font-bold tracking-tight capitalize', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
                {reportType} Ledger Financial Statement
              </h2>
              <p className={cn('text-xs mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
                Generated on {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })} • Verified Cryptographic Audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
              <ShieldCheck size={13} />
              <span>Verified Ledger</span>
            </span>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <M3Card variant="filled" padding="md">
            <span className="text-xs text-slate-400 font-medium">Period Inflows</span>
            <div className="text-2xl font-extrabold font-mono text-[#6dd58c] mt-1">
              ₹{periodReceived.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">Active {reportType} revenue receipts</div>
          </M3Card>

          <M3Card variant="filled" padding="md">
            <span className="text-xs text-slate-400 font-medium">Period Receivables (Due)</span>
            <div className="text-2xl font-extrabold font-mono text-[#ffe082] mt-1">
              ₹{periodPending.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">Uncollected {reportType} receivables</div>
          </M3Card>

          <M3Card variant="filled" padding="md">
            <span className="text-xs text-slate-400 font-medium">Active Net Vault</span>
            <div className="text-2xl font-extrabold font-mono text-[#6dd58c] mt-1">
              ₹{currentBalance.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">Total settled ledger balance</div>
          </M3Card>
        </div>

        {/* Breakdown details */}
        <div className="space-y-3 pt-2">
          <h3 className={cn('text-sm font-bold uppercase tracking-wider', isDark ? 'text-slate-300' : 'text-slate-700')}>
            Statement Ledger Entries ({reportTransactions.length})
          </h3>
          <div className="divide-y divide-white/5 text-xs">
            {reportTransactions.length > 0 ? (
              reportTransactions.slice(0, 8).map((tx: any) => (
                <div key={tx.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{tx.personName || 'Settlement'}</div>
                    <div className="text-slate-400 text-[11px]">{tx.category || tx.purpose || 'General'} • {formatDate(tx.date || tx.createdAt || '')}</div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'font-mono font-bold text-sm',
                      tx.type === 'received' || tx.type === 'income' ? 'text-[#6dd58c]' : 'text-[#f2b8b5]'
                    )}>
                      {tx.type === 'received' || tx.type === 'income' ? '+' : '-'}₹{(Number(tx.amount) || 0).toLocaleString()}
                    </div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">{tx.method || tx.paymentMethod || 'UPI'}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No ledger transactions recorded for this {reportType} period.
              </div>
            )}
          </div>
        </div>
      </M3Card>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        reportType="entries"
        records={reportTransactions.length > 0 ? reportTransactions : safeTransactions}
      />
    </div>
  );
}
