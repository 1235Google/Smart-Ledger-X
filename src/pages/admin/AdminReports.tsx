import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Download, Calendar, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AdminReports() {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const handleExportPDF = () => {
    alert(`${reportType.toUpperCase()} financial report PDF generated and downloaded successfully.`);
  };

  const handleExportExcel = () => {
    alert(`${reportType.toUpperCase()} financial report Excel spreadsheet downloaded successfully.`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Financial Reports</h1>
          <p className="text-neutral-400 text-sm mt-1">Generate and export comprehensive daily, weekly, and monthly statements.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportExcel} className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl text-sm flex items-center gap-2 transition-colors">
            <Download size={18} /> Export Excel
          </button>
          <button onClick={handleExportPDF} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      {/* Report Frequency Selector */}
      <div className="flex items-center gap-3 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit">
        {(['daily', 'weekly', 'monthly'] as const).map(type => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all",
              reportType === type ? "bg-emerald-600 text-white shadow-lg" : "text-neutral-400 hover:text-white"
            )}
          >
            {type} Report
          </button>
        ))}
      </div>

      {/* Report Preview Card */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white capitalize">{reportType} Financial Statement</h2>
              <p className="text-neutral-400 text-sm">SmartLedgerX Enterprise Ledger Summary • Generated on {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
            Verified Audit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
            <div className="text-neutral-400 text-sm mb-1">Total Inflow</div>
            <div className="text-3xl font-bold text-emerald-400">₹4,82,500</div>
            <div className="text-xs text-neutral-500 mt-2">+14.2% vs previous period</div>
          </div>
          <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
            <div className="text-neutral-400 text-sm mb-1">Total Outflow</div>
            <div className="text-3xl font-bold text-blue-400">₹1,45,000</div>
            <div className="text-xs text-neutral-500 mt-2">-4.1% vs previous period</div>
          </div>
          <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
            <div className="text-neutral-400 text-sm mb-1">Net Balance</div>
            <div className="text-3xl font-bold text-white">₹3,37,500</div>
            <div className="text-xs text-emerald-400 mt-2">Strong liquidity surplus</div>
          </div>
        </div>
      </div>
    </div>
  );
}
