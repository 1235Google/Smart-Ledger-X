import sys

file_path = 'src/pages/MonthlyReports.tsx'
with open(file_path, 'r') as f:
    code = f.read()

handlers_to_add = """
  const [isDownloadingGullakPdf, setIsDownloadingGullakPdf] = useState(false);
  const [isDownloadingGullakCsv, setIsDownloadingGullakCsv] = useState(false);

  const filteredGullakEntries = useMemo(() => {
    return (gullakEntries || []).filter(e => {
      const dateStr = e.date || e.createdAt;
      if (!dateStr) return false;
      try {
        const monthStr = format(parseISO(dateStr), 'MMMM yyyy');
        return monthStr === selectedMonth;
      } catch (err) {
        return false;
      }
    });
  }, [gullakEntries, selectedMonth]);

  const handleDownloadGullakReportPdf = async (type: 'deposit' | 'withdrawal') => {
    setIsDownloadingGullakPdf(true);
    try {
      const direction = type === 'deposit' ? 'credit' : 'debit';
      const entries = filteredGullakEntries.filter(e => {
        const eDir = e.direction || (e.operation === 'withdrawal' || e.type === 'withdrawal' ? 'debit' : 'credit');
        return eDir === direction;
      });
      await generateGullakReportPdf({
        month: selectedMonth,
        accountName: userProfile?.name || 'Primary Account',
        entries,
        type
      });
      setEmailStatus({ type: 'success', text: `✓ Gullak ${type} PDF downloaded!` });
    } catch (error) {
      console.error(error);
      setEmailStatus({ type: 'error', text: 'Could not generate PDF. Please try again.' });
    } finally {
      setIsDownloadingGullakPdf(false);
      setTimeout(() => setEmailStatus(null), 4000);
    }
  };

  const handleDownloadGullakReportCsv = (type: 'deposit' | 'withdrawal') => {
    setIsDownloadingGullakCsv(true);
    try {
      const direction = type === 'deposit' ? 'credit' : 'debit';
      const entries = filteredGullakEntries.filter(e => {
        const eDir = e.direction || (e.operation === 'withdrawal' || e.type === 'withdrawal' ? 'debit' : 'credit');
        return eDir === direction;
      });
      generateGullakReportCsv({
        month: selectedMonth,
        accountName: userProfile?.name || 'Primary Account',
        entries,
        type
      });
      setEmailStatus({ type: 'success', text: `✓ Gullak ${type} CSV downloaded!` });
    } catch (error) {
      console.error(error);
      setEmailStatus({ type: 'error', text: 'Could not export CSV. Please try again.' });
    } finally {
      setIsDownloadingGullakCsv(false);
      setTimeout(() => setEmailStatus(null), 4000);
    }
  };
"""

code = code.replace('// API Call to Generate and Email Report', handlers_to_add + '\n  // API Call to Generate and Email Report')


ui_to_add = """
            {/* Gullak Reports */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Shield size={16} className="text-amber-400" />
                Gullak (Savings) Reports
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2 p-1.5 bg-black/20 rounded-xl border border-white/5">
                  <span className="text-xs font-semibold text-slate-400 self-center px-2">Deposits:</span>
                  <button
                    onClick={() => handleDownloadGullakReportPdf('deposit')}
                    disabled={isDownloadingGullakPdf}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button
                    onClick={() => handleDownloadGullakReportCsv('deposit')}
                    disabled={isDownloadingGullakCsv}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <FileSpreadsheet size={14} /> CSV
                  </button>
                </div>
                
                <div className="flex gap-2 p-1.5 bg-black/20 rounded-xl border border-white/5">
                  <span className="text-xs font-semibold text-slate-400 self-center px-2">Withdrawals:</span>
                  <button
                    onClick={() => handleDownloadGullakReportPdf('withdrawal')}
                    disabled={isDownloadingGullakPdf}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button
                    onClick={() => handleDownloadGullakReportCsv('withdrawal')}
                    disabled={isDownloadingGullakCsv}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <FileSpreadsheet size={14} /> CSV
                  </button>
                </div>
              </div>
            </div>
"""

# Find the exact place to inject the UI
# Looking for the closing tag of the instant report studio section
parts = code.split('</motion.div>')

if len(parts) > 1:
    code = '</motion.div>'.join([parts[0] + ui_to_add, *parts[1:]])
    with open(file_path, 'w') as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Could not find insertion point")
