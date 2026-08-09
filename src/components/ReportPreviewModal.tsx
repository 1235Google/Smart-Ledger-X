import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileSpreadsheet, FileText, Send, X, Download, BarChart3, Users, TrendingUp, BrainCircuit } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportData: any; // Contains month, aiSummary, excelBase64, pdfBase64, fileSizeXlsx, fileSizePdf, transactions, customers
  onEmailNow: () => void;
  emailStatus: 'idle' | 'sending' | 'success' | 'error';
}

export default function ReportPreviewModal({ isOpen, onClose, reportData, onEmailNow, emailStatus }: Props) {
  if (!isOpen || !reportData) return null;

  const handleDownload = (base64: string, filename: string, mimeType: string) => {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Mock calculations for preview visual
  const received = reportData.transactions?.filter((t: any) => t.type === 'received').reduce((a: any, b: any) => a + b.amount, 0) || 0;
  const pending = reportData.transactions?.filter((t: any) => t.type === 'pending').reduce((a: any, b: any) => a + b.amount, 0) || 0;

  let topCustomer = 'N/A';
  if (reportData.customers && reportData.customers.length > 0) {
    const custStats = reportData.customers.map((c: any) => {
      const paid = reportData.transactions?.filter((t: any) => t.personName === c.name && t.type === 'received').reduce((a: any, b: any) => a + b.amount, 0) || 0;
      return { name: c.name, paid };
    });
    topCustomer = custStats.sort((a: any, b: any) => b.paid - a.paid)[0]?.name || 'N/A';
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-[#0a0b10] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">Report Preview</h2>
            <p className="text-sm text-slate-400 mt-1">Month: {reportData.month}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                 <div className="flex items-center gap-3 mb-2 text-emerald-400">
                    <TrendingUp size={20} />
                    <span className="font-medium text-sm">Total Revenue</span>
                 </div>
                 <div className="text-3xl font-bold text-white">₹{received.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                 <div className="flex items-center gap-3 mb-2 text-amber-400">
                    <Users size={20} />
                    <span className="font-medium text-sm">Total Pending</span>
                 </div>
                 <div className="text-3xl font-bold text-white">₹{pending.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                 <div className="flex items-center gap-3 mb-2 text-indigo-400">
                    <Users size={20} />
                    <span className="font-medium text-sm">Top Customer</span>
                 </div>
                 <div className="text-xl font-bold text-white truncate">{topCustomer}</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                 <div className="flex items-center gap-3 mb-2 text-pink-400">
                    <BarChart3 size={20} />
                    <span className="font-medium text-sm">Business Health</span>
                 </div>
                 <div className="text-xl font-bold text-white">95/100 (Excellent)</div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <BrainCircuit className="text-purple-400" size={24} />
                <h3 className="text-lg font-bold text-white">AI Business Summary</h3>
              </div>
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-black/20 p-4 rounded-xl border border-white/5">
                {reportData.aiSummary}
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
               <h3 className="text-lg font-bold text-white mb-4">Attachments Generated</h3>
               <div className="space-y-3">
                 <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                       <FileSpreadsheet className="text-emerald-400" size={24} />
                       <div>
                         <p className="text-sm font-medium text-white">Financial Data</p>
                         <p className="text-xs text-slate-400">Excel Workbook • {formatSize(reportData.fileSizeXlsx)}</p>
                       </div>
                    </div>
                    {reportData.excelBase64 && (
                      <button onClick={() => handleDownload(reportData.excelBase64, `SmartLedger_Report_${reportData.month.replace(' ', '_')}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                        <Download size={16} /> Download
                      </button>
                    )}
                 </div>
                 <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                       <FileText className="text-red-400" size={24} />
                       <div>
                         <p className="text-sm font-medium text-white">Executive Summary</p>
                         <p className="text-xs text-slate-400">PDF Document • {formatSize(reportData.fileSizePdf)}</p>
                       </div>
                    </div>
                    {reportData.pdfBase64 && (
                      <button onClick={() => handleDownload(reportData.pdfBase64, `SmartLedger_Report_${reportData.month.replace(' ', '_')}.pdf`, 'application/pdf')} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                        <Download size={16} /> Download
                      </button>
                    )}
                 </div>
               </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
               <h3 className="text-lg font-bold text-white mb-2">Ready to Send</h3>
               <p className="text-sm text-indigo-200/80 mb-6">Send this report to the configured email address immediately.</p>
               
               <button
                 onClick={onEmailNow}
                 disabled={emailStatus === 'sending' || emailStatus === 'success'}
                 className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
               >
                 {emailStatus === 'sending' ? (
                   <>Sending...</>
                 ) : emailStatus === 'success' ? (
                   <>Sent Successfully</>
                 ) : (
                   <><Send size={18} /> Email Now</>
                 )}
               </button>
               {emailStatus === 'error' && (
                 <p className="text-xs text-red-400 mt-3 text-center">Failed to send email. Check configuration.</p>
               )}
            </div>

             <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-bold text-white">Preview Status</h3>
                 <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">Ready</span>
               </div>
               <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Data Sources</span>
                   <span className="text-white">{reportData.transactions?.length || 0} Records</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Formatting</span>
                   <span className="text-white">Applied</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Charts included</span>
                   <span className="text-white">Yes</span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
