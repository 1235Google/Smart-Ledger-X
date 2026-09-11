import sys
import re

file_path = 'src/lib/reportsExportEngine.ts'
with open(file_path, 'r') as f:
    code = f.read()

# Fix generatePendingReport
old_pending = r"    // --- PDF EXPORT ---.*?const tableHead = "
new_pending = """    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, 'Pending Payments Report');

    const nextY = drawSummaryGrid(doc, 44, [
      { label: 'Total Pending', value: `${totalPendingEntries} Customers` },
      { label: 'Amount Due', value: `Rs. ${totalPendingAmount.toLocaleString('en-IN')}`, valueColor: [217, 119, 6] },
      { label: 'Overdue', value: `${overdueCount} Records`, valueColor: [220, 38, 38] }
    ]);
    const tableHead = """
code = re.sub(old_pending, new_pending, code, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(code)
print("done")
