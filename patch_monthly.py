import sys
import re

file_path = 'src/lib/monthlyReportPdfGenerator.ts'
with open(file_path, 'r') as f:
    code = f.read()

# Add import
import_line = "import { loadPremiumFonts, applyPremiumHeader, applyPremiumFooter, premiumTableStyles, arrayBufferToBase64 } from './pdfTheme';\n"
if "pdfTheme" not in code:
    code = code.replace("import autoTable from 'jspdf-autotable';", "import autoTable from 'jspdf-autotable';\n" + import_line)

# Remove old arrayBufferToBase64 if it exists
array_buffer_func = """function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}"""
code = code.replace(array_buffer_func, '')

# --- PATCH generateMonthlyPdf ---
generate_monthly_pattern = re.compile(r'export async function generateMonthlyPdf.*?doc\.save\(`SmartLedger_Report_\$\{sanitizedMonth\}\.pdf`\);', re.DOTALL)

def replace_generate_monthly(match):
    return """export async function generateMonthlyPdf(data: MonthlyReportData): Promise<void> {
  const { month, recipientEmail, transactions } = data;
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  await loadPremiumFonts(doc);
  applyPremiumHeader(doc, 'Monthly Financial Report', month);
  
  const generatedDateStr = format(new Date(), 'dd MMMM yyyy, hh:mm a');
  
  doc.setFontSize(10);
  doc.text(`Account: ${recipientEmail || 'Primary Account'}`, 14, 48);
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 54, pageWidth - 14, 54);
  
  // --- SUMMARY ---
  let totalReceived = 0;
  let totalSent = 0;
  let totalPending = 0;
  
  transactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'received') totalReceived += amt;
    else if (t.type === 'sent') totalSent += amt;
    else if (t.type === 'pending' && (t.status === 'pending' || t.status === 'overdue' || (t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'closed'))) totalPending += amt;
  });
  
  const netCashflow = totalReceived - totalSent;

  doc.setFontSize(12);
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
  doc.text('TRANSACTION RECORD', 14, 112);
  
  const tableHead = [['No.', 'Date', 'Description', 'Type', 'Amount', 'Status']];
  const tableBody = transactions.map((t, index) => {
    const amt = Number(t.amount) || 0;
    const formattedAmt = `Rs. ${amt.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    let dateStr = (t as any).date || (t as any).dueDate || t.createdAt || 'N/A';
    try {
      if (dateStr.includes('T')) {
        dateStr = format(parseISO(dateStr), 'dd MMM yyyy');
      }
    } catch (e) {}
    const typeStr = (t.type || 'N/A').toUpperCase();
    const nameStr = t.personName || t.customerName || 'N/A';
    const statusStr = (t.status || 'Completed').toUpperCase();
    
    return [
      (index + 1).toString(),
      dateStr,
      nameStr,
      typeStr,
      formattedAmt,
      statusStr
    ];
  });
  
  if (tableBody.length === 0) {
    tableBody.push(['-', '-', 'No transactions recorded.', '-', '-', '-']);
  }
  
  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 118,
    ...premiumTableStyles,
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 26 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 24 },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 24 }
    }
  } as any);
  
  applyPremiumFooter(doc, 'Monthly Financial Report');
  
  const sanitizedMonth = month.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`SmartLedger_Report_${sanitizedMonth}.pdf`);"""

code = generate_monthly_pattern.sub(replace_generate_monthly, code)

# --- PATCH generateGullakReportPdf ---
generate_gullak_pattern = re.compile(r'export async function generateGullakReportPdf.*?doc\.save\(`SmartLedger_\$\{type === \'deposit\' \? \'Deposits\' : \'Withdrawals\'\}_\$\{sanitizedMonth\}\.pdf`\);', re.DOTALL)

def replace_generate_gullak(match):
    return """export async function generateGullakReportPdf(data: GullakReportData): Promise<void> {
  const { month, accountName, entries, type } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  await loadPremiumFonts(doc);
  const title = type === 'deposit' ? 'Gullak Deposits Report' : 'Gullak Withdrawals Report';
  applyPremiumHeader(doc, title, month);
  
  doc.setFontSize(10);
  doc.text(`Account: ${accountName || 'Primary Account'}`, 14, 48);
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 54, pageWidth - 14, 54);
  
  // --- SUMMARY ---
  let totalAmount = 0;
  entries.forEach(e => totalAmount += (Number(e.amount) || 0));

  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('SUMMARY', 14, 64);
  
  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  
  doc.text(`Total ${type === 'deposit' ? 'Received' : 'Withdrawn'}:`, 14, 74);
  doc.text(`Rs. ${totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 85, 74, { align: 'right' });
  doc.text('Total Transactions:', 14, 80);
  doc.text(`${entries.length}`, 85, 80, { align: 'right' });
  
  doc.line(14, 88, pageWidth - 14, 88);
  
  // --- TRANSACTIONS ---
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('TRANSACTION RECORD', 14, 98);
  
  const tableHead = [['No.', 'Date', 'Name', 'Category / Purpose', 'Method', 'Amount']];
  const tableBody = entries.map((t, index) => {
    const amt = Number(t.amount) || 0;
    const formattedAmt = `Rs. ${amt.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    let dateStr = t.date || t.createdAt || 'N/A';
    try {
      if (dateStr.includes('T')) {
        dateStr = format(parseISO(dateStr), 'dd MMM yyyy');
      }
    } catch (e) {}
    
    const nameStr = t.personName || 'N/A';
    const categoryStr = t.category || t.note || 'N/A';
    const methodStr = (t.paymentMethod || 'N/A').toUpperCase();
    
    return [
      (index + 1).toString(),
      dateStr,
      nameStr,
      categoryStr,
      methodStr,
      formattedAmt
    ];
  });
  
  if (tableBody.length === 0) {
    tableBody.push(['-', '-', 'No transactions recorded.', '-', '-', '-']);
  }
  
  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 104,
    ...premiumTableStyles,
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 26 },
      2: { cellWidth: 40 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 24 },
      5: { cellWidth: 28, halign: 'right' }
    }
  } as any);
  
  applyPremiumFooter(doc, title);
  
  const sanitizedMonth = month.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`SmartLedger_${type === 'deposit' ? 'Deposits' : 'Withdrawals'}_${sanitizedMonth}.pdf`);"""

code = generate_gullak_pattern.sub(replace_generate_gullak, code)

# Make sure doc.save didn't get missed due to regex matching limits
with open(file_path, 'w') as f:
    f.write(code + '\n}\n')

print("Patched monthly generator")
