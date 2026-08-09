import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileSpreadsheet, FileText, Download, Calendar, Filter, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { 
  ExportFormat, 
  ExportFilterType, 
  generateEntriesReport, 
  generatePendingReport,
  generateGullakReport,
  filterRecordsForExport 
} from '../lib/reportsExportEngine';
import { createNotification } from '../lib/notificationService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  reportType: 'entries' | 'pending' | 'gullak';
  records: any[];
  selectedIds?: string[];
}

export default function ExportModal({
  isOpen,
  onClose,
  title,
  reportType,
  records,
  selectedIds = []
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [filterType, setFilterType] = useState<ExportFilterType>('all');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Calculate matching records live preview
  const filteredRecords = useMemo(() => {
    return filterRecordsForExport(records, {
      filterType,
      startDate,
      endDate,
      selectedIds
    });
  }, [records, filterType, startDate, endDate, selectedIds]);

  const totalAmount = useMemo(() => {
    return filteredRecords.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredRecords]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (filteredRecords.length === 0) {
      setErrorMsg('No records match your selected filter. Please select a different range.');
      return;
    }

    setIsExporting(true);

    try {
      const options = {
        format,
        filterType,
        startDate,
        endDate,
        selectedIds,
        records,
        reportType
      };

      if (reportType === 'entries') {
        await generateEntriesReport(options);
      } else if (reportType === 'gullak') {
        await generateGullakReport(options);
      } else {
        await generatePendingReport(options);
      }

      const ext = format === 'excel' ? 'XLSX' : 'PDF';
      setSuccessMsg(`Successfully generated ${ext} report for ${filteredRecords.length} records!`);
      
      createNotification({
        title: 'Export Completed',
        message: `Successfully exported ${filteredRecords.length} records to ${ext} format`,
        type: 'report_export_completed'
      });
      
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMsg(err?.message || 'Failed to generate report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const modalTitle = title || (reportType === 'entries' ? 'Export Entries Report' : 'Export Pending Payments');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Download size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{modalTitle}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Generate professional Excel or PDF reports</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isExporting}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Success / Error Messages */}
          {successMsg && (
            <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400 text-sm font-medium">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-6 pt-5">
            {/* 1. Format Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2.5">
                1. Select Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('excel')}
                  disabled={isExporting}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 text-center transition-all ${
                    format === 'excel'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200'
                  }`}
                >
                  <FileSpreadsheet size={24} className={format === 'excel' ? 'text-emerald-400' : 'text-neutral-400'} />
                  <div>
                    <div className="text-sm font-bold">Excel (.xlsx)</div>
                    <div className="text-[11px] opacity-70">Formatted spreadsheet</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  disabled={isExporting}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 text-center transition-all ${
                    format === 'pdf'
                      ? 'bg-blue-500/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200'
                  }`}
                >
                  <FileText size={24} className={format === 'pdf' ? 'text-blue-400' : 'text-neutral-400'} />
                  <div>
                    <div className="text-sm font-bold">PDF Report</div>
                    <div className="text-[11px] opacity-70">Print-ready document</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Filter Options */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2.5">
                2. Choose Export Scope
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'All Records' },
                  { id: 'today', label: "Today's" },
                  { id: 'week', label: 'This Week' },
                  { id: 'month', label: 'This Month' },
                  { id: 'custom', label: 'Custom Range' },
                  ...(selectedIds.length > 0 ? [{ id: 'selected', label: `Selected (${selectedIds.length})` }] : [])
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilterType(item.id as ExportFilterType)}
                    disabled={isExporting}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      filterType === item.id
                        ? 'bg-white/15 border-emerald-500 text-white font-bold'
                        : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range Controls */}
            {filterType === 'custom' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-2 gap-3 p-3.5 bg-black/40 border border-white/10 rounded-2xl"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isExporting}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isExporting}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </motion.div>
            )}

            {/* Live Data Summary Preview */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <div className="text-neutral-400">Records Matching Filter</div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {filteredRecords.length} <span className="text-xs font-normal text-neutral-400">entries</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-neutral-400">Total Value</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isExporting}
                className="flex-1 min-h-[44px] py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-sm text-neutral-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || filteredRecords.length === 0}
                className="flex-1 min-h-[44px] py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-white" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Export {format.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
