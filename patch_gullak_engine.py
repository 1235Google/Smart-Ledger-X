import sys

file_path = 'src/lib/reportsExportEngine.ts'
with open(file_path, 'r') as f:
    code = f.read()

old_gullak_pdf = """    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, 'Gullak Vault Activity', 'Savings Ledger');

    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.text('TRANSACTION RECORD', 14, 48);"""

new_gullak_pdf = """    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, 'Gullak Vault Activity', 'Savings Ledger');

    let totalSavings = 0;
    filteredData.forEach(item => {
      const isCredit = getGullakEntryDirection(item) === 'credit';
      const amt = getGullakAbsoluteAmount(item);
      if (isCredit) totalSavings += amt;
      else totalSavings -= amt;
    });

    const nextY = drawSummaryGrid(doc, 44, [
      { label: 'Total Records', value: `${filteredData.length}` },
      { label: 'Net Savings', value: `Rs. ${totalSavings.toLocaleString('en-IN')}`, highlight: true }
    ]);"""

code = code.replace(old_gullak_pdf, new_gullak_pdf)
code = code.replace("startY: 54,", "startY: nextY + 4,")

with open(file_path, 'w') as f:
    f.write(code)

print("Gullak report engine patched")
