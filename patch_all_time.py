import sys
import re

file_path = 'src/pages/MonthlyReports.tsx'
with open(file_path, 'r') as f:
    code = f.read()

# 1. Add "All Time" to monthOptions
old_month_options = """  const monthOptions = useMemo(() => {
    const now = new Date();
    return [
      format(now, 'MMMM yyyy'),
      format(subMonths(now, 1), 'MMMM yyyy'),
      format(subMonths(now, 2), 'MMMM yyyy'),
      format(subMonths(now, 3), 'MMMM yyyy'),
    ];
  }, []);"""

new_month_options = """  const monthOptions = useMemo(() => {
    const now = new Date();
    return [
      'All Time',
      format(now, 'MMMM yyyy'),
      format(subMonths(now, 1), 'MMMM yyyy'),
      format(subMonths(now, 2), 'MMMM yyyy'),
      format(subMonths(now, 3), 'MMMM yyyy'),
    ];
  }, []);"""

code = code.replace(old_month_options, new_month_options)

# 2. Modify filteredTransactions logic to respect 'All Time'
old_filtered_transactions = """    const matched = (transactions || []).filter(tx => {
      const rawDate = getTxDate(tx);
      if (!rawDate) return false;
      try {
        const txDate = new Date(rawDate);
        if (isNaN(txDate.getTime())) return false;
        const txMonthName = format(txDate, 'MMMM');
        const txYear = format(txDate, 'yyyy');
        return txMonthName === targetMonthName && txYear === targetYear;
      } catch {
        return false;
      }
    });

    // If no transactions in this specific month, calculate overall stats for display
    const listToCalculate = matched.length > 0 ? matched : (transactions || []);"""

new_filtered_transactions = """    const matched = (transactions || []).filter(tx => {
      if (selectedMonth === 'All Time') return true;
      const rawDate = getTxDate(tx);
      if (!rawDate) return false;
      try {
        const txDate = new Date(rawDate);
        if (isNaN(txDate.getTime())) return false;
        const txMonthName = format(txDate, 'MMMM');
        const txYear = format(txDate, 'yyyy');
        return txMonthName === targetMonthName && txYear === targetYear;
      } catch {
        return false;
      }
    });

    const listToCalculate = matched;"""
    
code = code.replace(old_filtered_transactions, new_filtered_transactions)

# 3. Update return of filteredTransactions useMemo
old_return = """    return {
      filteredTransactions: matched.length > 0 ? matched : transactions || [],
      monthInflow: inflow,"""
new_return = """    return {
      filteredTransactions: matched,
      monthInflow: inflow,"""
      
code = code.replace(old_return, new_return)

# 4. Update filteredGullakEntries
old_gullak = """  const filteredGullakEntries = useMemo(() => {
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
  }, [gullakEntries, selectedMonth]);"""
  
new_gullak = """  const filteredGullakEntries = useMemo(() => {
    if (selectedMonth === 'All Time') return gullakEntries || [];
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
  }, [gullakEntries, selectedMonth]);"""

code = code.replace(old_gullak, new_gullak)

# 5. Remove Gullak Withdrawals section entirely
# The pattern is multiline
pattern = re.compile(r'<div className="flex gap-2 p\.1\.5 bg-black/20 rounded-xl border border-white/5">\s*<span className="text-xs font-semibold text-slate-400 self-center px-2">Withdrawals:</span>.*?</div>', re.DOTALL)
# Actually the class is p-1.5, in python \. is literal dot if we use raw string, let's just do a normal replacement block

withdrawal_block = """                <div className="flex gap-2 p-1.5 bg-black/20 rounded-xl border border-white/5">
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
                </div>"""

code = code.replace(withdrawal_block, '')

with open(file_path, 'w') as f:
    f.write(code)

print("Patched successfully")
