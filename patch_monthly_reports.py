import sys
import re

file_path = 'src/pages/MonthlyReports.tsx'
with open(file_path, 'r') as f:
    code = f.read()

# 1. Imports
if "generatePendingReport" not in code:
    code = code.replace(
        "import { generateMonthlyPdf, generateMonthlyCsv, generateGullakReportPdf, generateGullakReportCsv } from '../lib/monthlyReportPdfGenerator';",
        "import { generateMonthlyPdf, generateMonthlyCsv, generateGullakReportPdf, generateGullakReportCsv } from '../lib/monthlyReportPdfGenerator';\nimport { generatePendingReport } from '../lib/reportsExportEngine';"
    )

# 2. Add state for pending downloads
state_insert = """  const [isDownloadingGullakCsv, setIsDownloadingGullakCsv] = useState(false);

  const [isDownloadingPendingPdf, setIsDownloadingPendingPdf] = useState(false);
  const [isDownloadingPendingCsv, setIsDownloadingPendingCsv] = useState(false);"""
code = code.replace("  const [isDownloadingGullakCsv, setIsDownloadingGullakCsv] = useState(false);", state_insert)

# 3. Add handlers
handlers_insert = """  const handleDownloadPendingReportPdf = async () => {
    setIsDownloadingPendingPdf(true);
    try {
      await generatePendingReport({
        format: 'pdf',
        filterType: 'selected',
        title: `Pending Reports - ${selectedMonth}`,
        records: filteredTransactions.filter(t => t.type === 'pending'),
        reportType: 'pending'
      });
      setEmailStatus({ type: 'success', text: `✓ Pending Report PDF downloaded!` });
    } catch (error) {
      console.error(error);
      setEmailStatus({ type: 'error', text: 'Could not generate PDF. Please try again.' });
    } finally {
      setIsDownloadingPendingPdf(false);
      setTimeout(() => setEmailStatus(null), 4000);
    }
  };

  const handleDownloadPendingReportCsv = async () => {
    setIsDownloadingPendingCsv(true);
    try {
      await generatePendingReport({
        format: 'excel',
        filterType: 'selected',
        title: `Pending Reports - ${selectedMonth}`,
        records: filteredTransactions.filter(t => t.type === 'pending'),
        reportType: 'pending'
      });
      setEmailStatus({ type: 'success', text: `✓ Pending Report CSV downloaded!` });
    } catch (error) {
      console.error(error);
      setEmailStatus({ type: 'error', text: 'Could not generate CSV. Please try again.' });
    } finally {
      setIsDownloadingPendingCsv(false);
      setTimeout(() => setEmailStatus(null), 4000);
    }
  };"""

if "handleDownloadPendingReportPdf" not in code:
    code = code.replace("  const handleDownloadGullakReportPdf", handlers_insert + "\n\n  const handleDownloadGullakReportPdf")

# 4. Add UI
ui_insert = """            {/* Pending Reports */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Pending Reports
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2 p-1.5 bg-black/20 rounded-xl border border-white/5">
                  <span className="text-xs font-semibold text-slate-400 self-center px-2">Dues:</span>
                  <button
                    onClick={handleDownloadPendingReportPdf}
                    disabled={isDownloadingPendingPdf}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button
                    onClick={handleDownloadPendingReportCsv}
                    disabled={isDownloadingPendingCsv}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <FileSpreadsheet size={14} /> CSV
                  </button>
                </div>
              </div>
            </div>"""

if "Pending Reports" not in code:
    code = code.replace("            {/* Gullak Reports */}", ui_insert + "\n\n            {/* Gullak Reports */}")

# 5. Update payload for /api/generate-business-report
payload_old = """        customers: type === 'test_report' ? [] : customers,
        includePdf: includePdf,
        aiSummary: type === 'test_report'
          ? 'SmartLedger Email Pipeline Verification. Your automated dispatch delivery system is operational.'
          : executiveSummary"""
payload_new = """        customers: type === 'test_report' ? [] : customers,
        includePdf: includePdf,
        gullakEntries: type === 'test_report' ? [] : filteredGullakEntries,
        aiSummary: type === 'test_report'
          ? 'SmartLedger Email Pipeline Verification. Your automated dispatch delivery system is operational.'
          : executiveSummary"""
code = code.replace(payload_old, payload_new)

with open(file_path, 'w') as f:
    f.write(code)
print("Monthly reports patched")
