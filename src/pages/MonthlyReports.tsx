import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mail, Clock, FileText, Download, Shield, Trash2, Calendar, Send, CheckCircle2, Search, ArrowDownUp } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { ReportSchedule } from '../types';
import DataStateGuard from '../components/ui/DataStateGuard';

export default function MonthlyReports() {
  const { 
    reportSettings, 
    updateReportSettings, 
    generatedReports, 
    deleteGeneratedReport,
    addGeneratedReport,
    transactions,
    customers,
    currentBalance,
    dataStatus,
    dataError,
    retryFetchData
  } = useStore();

  const [emailInput, setEmailInput] = useState(reportSettings?.emailAddress || '');
  const [emailStatus, setEmailStatus] = useState('');
  
  const [isTesting, setIsTesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedule, setSchedule] = useState<ReportSchedule>(reportSettings?.schedule || {
    frequency: 'monthly',
    time: '09:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const [includePdf, setIncludePdf] = useState(reportSettings?.includePdf ?? true);

  const handleSaveEmail = async () => {
    if (!emailInput || !/^\S+@\S+\.\S+$/.test(emailInput)) {
      setEmailStatus('❌ Invalid Email');
      setTimeout(() => setEmailStatus(''), 3000);
      return;
    }
    
    // Save as pending first
    updateReportSettings({ emailAddress: emailInput, verificationStatus: 'pending' });
    setEmailStatus('Sending verification...');
    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput })
      });
      if (res.ok) {
        updateReportSettings({ emailAddress: emailInput, verificationStatus: 'verified' });
        setEmailStatus('✅ Active');
      } else {
        updateReportSettings({ emailAddress: emailInput, verificationStatus: 'invalid' });
        setEmailStatus('❌ Invalid Email');
      }
    } catch (err) {
      updateReportSettings({ emailAddress: emailInput, verificationStatus: 'invalid' });
      setEmailStatus('❌ Invalid Email');
    }
    setTimeout(() => setEmailStatus(''), 4000);
  };

  const handleSaveSchedule = () => {
    updateReportSettings({ schedule, includePdf });
    setEmailStatus('✅ Schedule Saved');
    setTimeout(() => setEmailStatus(''), 3000);
  };

  const callGenerateReportAPI = async (type: 'monthly_report' | 'test_report') => {
    if (!reportSettings?.emailAddress || reportSettings.verificationStatus !== 'verified') {
      setEmailStatus('❌ Please verify email first');
      setTimeout(() => setEmailStatus(''), 3000);
      return;
    }

    type === 'test_report' ? setIsTesting(true) : setIsGenerating(true);
    setEmailStatus('Sending...');

    try {
      const now = new Date();
      const currentMonth = format(now, 'MMMM yyyy');
      
      const payload = {
        email: reportSettings.emailAddress,
        month: currentMonth,
        transactions: type === 'test_report' ? [{ date: now.toISOString(), type: 'received', personName: 'Demo Customer', amount: 5000, status: 'received' }] : transactions,
        customers: type === 'test_report' ? [] : customers,
        includePdf: includePdf,
        aiSummary: type === 'test_report' ? 'This is a demo AI Summary for testing purposes.\nBusiness Health: 95/100' : `During ${currentMonth}, your account maintained a current balance of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(currentBalance)}.`
      };

      const res = await fetch('/api/generate-business-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailStatus('✅ Report Delivered Successfully');
        addGeneratedReport({
          date: now.toISOString(),
          month: currentMonth,
          recipient: reportSettings.emailAddress,
          status: 'success',
          type,
          fileSizeXlsx: data.fileSizeXlsx,
          fileSizePdf: data.fileSizePdf,
        });
      } else {
        setEmailStatus(`❌ ${data.error || 'Failed to send'}`);
        addGeneratedReport({
          date: now.toISOString(),
          month: currentMonth,
          recipient: reportSettings.emailAddress,
          status: 'failed',
          type,
        });
      }
    } catch (e) {
      setEmailStatus('❌ Network error');
    } finally {
      setIsTesting(false);
      setIsGenerating(false);
      setTimeout(() => setEmailStatus(''), 4000);
    }
  };

  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
      loadingMessage="Loading monthly reports & schedules..."
      skeletonType="cards"
    >
      <div className="w-full max-w-4xl space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Monthly Reports
          </h1>
          <p className="text-slate-400 mt-2">Automatically generate professional business reports and email them to the Owner's configured email address.</p>
        </header>

        {/* Email Settings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400"><Mail size={20} /></div>
            <h2 className="text-xl font-bold">Monthly Report Email</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  Current Report Email
                  {reportSettings?.verificationStatus === 'verified' && <span className="text-emerald-400 text-xs">✓ Active</span>}
                  {reportSettings?.verificationStatus === 'invalid' && <span className="text-red-400 text-xs">✗ Invalid Email</span>}
                  {reportSettings?.verificationStatus === 'pending' && <span className="text-amber-400 text-xs">⏳ Pending</span>}
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="owner@business.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 min-h-[48px] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
                />
              </div>
              <button
                onClick={handleSaveEmail}
                className="min-h-[48px] px-6 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/5 w-full md:w-auto shrink-0"
              >
                Save Email
              </button>
            </div>
            
            {emailStatus && (
              <p className={cn("text-sm font-medium", emailStatus.includes('❌') ? "text-red-400" : "text-emerald-400")}>
                {emailStatus}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
              <button
                onClick={() => callGenerateReportAPI('test_report')}
                disabled={isTesting || isGenerating || !reportSettings?.emailAddress}
                className="flex-1 min-h-[48px] px-6 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-indigo-500/20 disabled:opacity-50"
              >
                {isTesting ? 'Sending...' : <><Shield size={18} /> Send Test Report</>}
              </button>
              <button
                onClick={() => callGenerateReportAPI('monthly_report')}
                disabled={isTesting || isGenerating || !reportSettings?.emailAddress}
                className="flex-1 min-h-[48px] px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : <><Send size={18} /> Generate Report Now</>}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Schedule Settings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400"><Clock size={20} /></div>
            <h2 className="text-xl font-bold">Report Schedule</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-400">Frequency</label>
              <select
                value={schedule.frequency}
                onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value as any })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 min-h-[48px] text-white focus:outline-none appearance-none"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
                <option value="custom">Custom Day of Month</option>
              </select>
            </div>
            
            {schedule.frequency === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Day of Month</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={schedule.customDay || 1}
                  onChange={(e) => setSchedule({ ...schedule, customDay: parseInt(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 min-h-[48px] text-white focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-400">Time (HH:MM)</label>
              <input
                type="time"
                value={schedule.time}
                onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 min-h-[48px] text-white focus:outline-none"
              />
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-between pt-6 border-t border-white/5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={includePdf} onChange={(e) => setIncludePdf(e.target.checked)} className="rounded border-white/20 bg-black/40 text-indigo-500 w-5 h-5" />
              <span className="text-sm font-medium text-slate-300">Include PDF Summary</span>
            </label>
            <button onClick={handleSaveSchedule} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors">
              Save Schedule
            </button>
          </div>
        </motion.div>

        {/* Report History */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-xl text-pink-400"><FileText size={20} /></div>
              <h2 className="text-xl font-bold">Report History</h2>
            </div>
          </div>
          
          {generatedReports && generatedReports.length > 0 ? (
            <div className="space-y-3">
              {generatedReports.map((report) => (
                <div key={report.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-black/20 rounded-xl border border-white/5">
                  <div>
                    <h3 className="font-semibold text-white">{report.month} {report.type === 'test_report' ? '(Test)' : ''}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1"><Calendar size={12}/> {format(parseISO(report.date), 'PP p')}</span>
                      <span>{report.recipient}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs font-semibold px-2 py-1 rounded", report.status === 'success' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                      {report.status.toUpperCase()}
                    </span>
                    <button onClick={() => deleteGeneratedReport(report.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 border border-dashed border-white/10 rounded-xl bg-black/20">
              <FileText size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No reports generated yet.</p>
            </div>
          )}
        </motion.div>
      </div>
    </DataStateGuard>
  );
}
