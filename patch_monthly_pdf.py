import sys

file_path = 'src/lib/monthlyReportPdfGenerator.ts'
with open(file_path, 'r') as f:
    code = f.read()

old_summary = """  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('FINANCIAL SUMMARY', 14, 64);

  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');

  const amountX = 85;
  doc.text('Total Money In:', 14, 74);
  doc.text(`Rs. ${totalReceived.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, amountX, 74, { align: 'right' });
  
  doc.text('Total Money Out:', 14, 80);
  doc.text(`Rs. ${totalSent.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, amountX, 80, { align: 'right' });
  
  doc.text('Amount Due (Pending):', 14, 86);
  doc.text(`Rs. ${totalPending.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, amountX, 86, { align: 'right' });
  
  doc.setFont('Roboto', 'bold');
  doc.text('Net Cash Flow:', 14, 94);
  doc.text(`Rs. ${netCashflow.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, amountX, 94, { align: 'right' });
  
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 102, pageWidth - 14, 102);

  // --- TRANSACTIONS ---
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('TRANSACTION RECORD', 14, 112);"""

new_summary = """  const nextY = drawSummaryGrid(doc, 60, [
    { label: 'Total Money In', value: `Rs. ${totalReceived.toLocaleString('en-IN')}`, valueColor: [16, 185, 129] },
    { label: 'Total Money Out', value: `Rs. ${totalSent.toLocaleString('en-IN')}` },
    { label: 'Amount Due (Pending)', value: `Rs. ${totalPending.toLocaleString('en-IN')}`, valueColor: [217, 119, 6] },
    { label: 'Net Cash Flow', value: `Rs. ${netCashflow.toLocaleString('en-IN')}`, highlight: true }
  ]);

  // --- TRANSACTIONS ---
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('TRANSACTION RECORD', 14, nextY + 8);"""

code = code.replace(old_summary, new_summary)
code = code.replace("startY: 120", "startY: nextY + 14")


old_gullak_summary = """  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('REPORT SUMMARY', 14, 48);

  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  
  const valX = 65;
  doc.text('Total Records:', 14, 58);
  doc.text(`${entries.length}`, valX, 58, { align: 'right' });
  
  doc.setFont('Roboto', 'bold');
  doc.text('Total Value:', 14, 66);
  doc.text(`Rs. ${totalValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, valX, 66, { align: 'right' });
  
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 74, pageWidth - 14, 74);"""

new_gullak_summary = """  const nextY = drawSummaryGrid(doc, 48, [
    { label: 'Total Records', value: `${entries.length}` },
    { label: 'Total Value', value: `Rs. ${totalValue.toLocaleString('en-IN')}`, highlight: true, valueColor: type === 'deposit' ? [16, 185, 129] : [220, 38, 38] }
  ]);"""

code = code.replace(old_gullak_summary, new_gullak_summary)
code = code.replace("startY: 84,", "startY: nextY + 8,")

with open(file_path, 'w') as f:
    f.write(code)

print("monthlyReportPdfGenerator patched successfully")
