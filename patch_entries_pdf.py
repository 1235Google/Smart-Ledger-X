import sys

file_path = 'src/lib/reportsExportEngine.ts'
with open(file_path, 'r') as f:
    code = f.read()

old_entries_pdf = """    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, 'Pending Payments Report');

    const nextY = drawSummaryGrid(doc, 44, [
      { label: 'Total Pending', value: `${totalPendingEntries} Customers` },
      { label: 'Amount Due', value: `Rs. ${totalPendingAmount.toLocaleString('en-IN')}`, valueColor: [217, 119, 6] },
      { label: 'Overdue', value: `${overdueCount} Records`, valueColor: [220, 38, 38] }
    ]);"""

new_entries_pdf = """    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, 'Transactions Report');

    const nextY = drawSummaryGrid(doc, 44, [
      { label: 'Total Entries', value: `${totalEntries} Records` },
      { label: 'Total Received', value: `Rs. ${totalReceived.toLocaleString('en-IN')}`, valueColor: [16, 185, 129] },
      { label: 'Total Pending', value: `Rs. ${totalPending.toLocaleString('en-IN')}`, valueColor: [217, 119, 6] }
    ]);"""

code = code.replace(old_entries_pdf, new_entries_pdf, 1)

with open(file_path, 'w') as f:
    f.write(code)
print("done")
