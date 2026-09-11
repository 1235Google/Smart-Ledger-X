const fs = require('fs');
const file = 'src/pages/MonthlyReports.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add "All Time" to monthOptions
code = code.replace(
`  const monthOptions = useMemo(() => {
    const now = new Date();
    return [
      format(now, 'MMMM yyyy'),
      format(subMonths(now, 1), 'MMMM yyyy'),
      format(subMonths(now, 2), 'MMMM yyyy'),
      format(subMonths(now, 3), 'MMMM yyyy'),
    ];
  }, []);`,
`  const monthOptions = useMemo(() => {
    const now = new Date();
    return [
      'All Time',
      format(now, 'MMMM yyyy'),
      format(subMonths(now, 1), 'MMMM yyyy'),
      format(subMonths(now, 2), 'MMMM yyyy'),
      format(subMonths(now, 3), 'MMMM yyyy'),
    ];
  }, []);`
);

// 2. Modify filteredTransactions logic to respect 'All Time'
code = code.replace(
`    const matched = (transactions || []).filter(tx => {
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
    const listToCalculate = matched.length > 0 ? matched : (transactions || []);`,
`    const matched = (transactions || []).filter(tx => {
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

    // If no transactions in this specific month (and not 'All Time'), we used to fallback to all. Let's just use matched.
    // Except if it's really 0, we can show 0.
    const listToCalculate = matched;`
);

// 3. Update return of filteredTransactions useMemo
code = code.replace(
`    return {
      filteredTransactions: matched.length > 0 ? matched : transactions || [],
      monthInflow: inflow,`,
`    return {
      filteredTransactions: matched,
      monthInflow: inflow,`
);

// 4. Update filteredGullakEntries
code = code.replace(
`  const filteredGullakEntries = useMemo(() => {
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
  }, [gullakEntries, selectedMonth]);`,
`  const filteredGullakEntries = useMemo(() => {
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
  }, [gullakEntries, selectedMonth]);`
);

// 5. Remove Gullak Withdrawals section entirely
const uiToRemoveStart = '<div className="flex gap-2 p-1.5 bg-black/20 rounded-xl border border-white/5">';
const uiToRemoveEnd = '</div>';
const pattern = /<div className="flex gap-2 p-1\.5 bg-black\/20 rounded-xl border border-white\/5">\s*<span className="text-xs font-semibold text-slate-400 self-center px-2">Withdrawals:<\/span>[\s\S]*?<\/div>/;

code = code.replace(pattern, '');

fs.writeFileSync(file, code);
