import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';

export interface MonthlyReportData {
  month: string;
  recipientEmail?: string;
  transactions: any[];
  customers: any[];
  currentBalance: number;
  aiSummary?: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generates and downloads a clean, structured PDF report
 */
export async function generateMonthlyPdf(data: MonthlyReportData): Promise<void> {
  const { month, recipientEmail, transactions } = data;
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Fetch fonts for proper Unicode rendering (especially ₹)
  try {
    const [regRes, boldRes] = await Promise.all([
      fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf'),
      fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf')
    ]);
    
    const regBuf = await regRes.arrayBuffer();
    const boldBuf = await boldRes.arrayBuffer();
    
    doc.addFileToVFS('Roboto-Regular.ttf', arrayBufferToBase64(regBuf));
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    
    doc.addFileToVFS('Roboto-Medium.ttf', arrayBufferToBase64(boldBuf));
    doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');
    
    doc.setFont('Roboto', 'normal');
  } catch (err) {
    console.warn("Failed to load Roboto font, falling back to default.", err);
  }

  // Formatting variables
  const generatedDateStr = format(new Date(), 'dd MMMM yyyy, hh:mm a');
  const accountName = recipientEmail || 'Primary Account';

  // Calculate totals
  let totalReceived = 0;
  let totalSent = 0;
  let totalPending = 0;
  
  transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'received') {
      totalReceived += amt;
    } else if (tx.type === 'sent') {
      totalSent += amt;
    } else if (tx.type === 'pending' && (tx.status === 'pending' || tx.status === 'overdue' || (tx.status !== 'completed' && tx.status !== 'cancelled' && tx.status !== 'closed'))) {
      totalPending += amt;
    }
  });
  
  const netCashflow = totalReceived - totalSent;

  // --- HEADER ---
  doc.setFontSize(16);
  doc.setFont('Roboto', 'bold');
  doc.text('SMARTLEDGER', 14, 20);
  
  doc.setFontSize(14);
  doc.setFont('Roboto', 'normal');
  doc.text('Financial Report', 14, 28);
  
  doc.setFontSize(10);
  doc.text(`Report Period: ${month}`, 14, 40);
  doc.text(`Generated On: ${generatedDateStr}`, 14, 46);
  doc.text(`Account: ${accountName}`, 14, 52);
  
  doc.setLineWidth(0.5);
  doc.line(14, 58, pageWidth - 14, 58);
  
  // --- SUMMARY ---
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('SUMMARY', 14, 68);
  
  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  doc.text(`Total Money In: ₹${totalReceived.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 14, 76);
  doc.text(`Total Money Out: ₹${totalSent.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 14, 82);
  doc.text(`Net Cash Flow: ₹${netCashflow.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 14, 88);
  doc.text(`Amount Due: ₹${totalPending.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 14, 94);
  
  doc.line(14, 100, pageWidth - 14, 100);
  
  // --- TRANSACTIONS ---
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('TRANSACTIONS', 14, 110);
  
  const tableHead = [['No.', 'Date', 'Description', 'Type', 'Amount', 'Status']];
  const tableBody = transactions.map((t, index) => {
    const amt = Number(t.amount) || 0;
    const formattedAmt = `₹${amt.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    let dateStr = t.date || t.createdAt || 'N/A';
    try {
      if (dateStr.includes('T')) {
        dateStr = format(parseISO(dateStr), 'dd MMM yyyy');
      }
    } catch (e) {}
    
    let typeDisplay = (t.type || 'N/A').toUpperCase();
    if (t.type === 'received') typeDisplay = 'Money In';
    if (t.type === 'sent') typeDisplay = 'Money Out';
    
    const description = t.purpose || t.category || t.note || t.personName || t.customerName || 'Ledger Entry';
    const status = (t.status || 'COMPLETED');
    
    return [
      (index + 1).toString(),
      dateStr,
      description,
      typeDisplay,
      formattedAmt,
      status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    ];
  });
  
  if (tableBody.length === 0) {
    tableBody.push(['-', '-', 'No transactions were recorded for this report period.', '-', '-', '-']);
  }
  
  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 116,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontSize: 9,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 26 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 24 },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 22 }
    }
  });

  // --- WATERMARK & FOOTER (Every Page) ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Draw Watermark
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(60);
    doc.setTextColor(200, 200, 200);
    
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({opacity: 0.1}));
    doc.text('SmartLedger', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45
    });
    doc.restoreGraphicsState();
    
    // Footer
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`SmartLedger Financial Report • Page ${i} of ${pageCount}`, 14, pageHeight - 10);
  }

  const sanitizedMonth = month.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`SmartLedger_Report_${sanitizedMonth}.pdf`);
}

/**
 * Generates and downloads a clean, structured CSV spreadsheet report
 */
export function generateMonthlyCsv(data: MonthlyReportData): void {
  const { month, transactions, customers, currentBalance } = data;

  let totalReceived = 0;
  let totalSent = 0;
  let totalPending = 0;
  
  transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'received') totalReceived += amt;
    else if (tx.type === 'sent') totalSent += amt;
    else if (tx.type === 'pending' && (tx.status === 'pending' || tx.status === 'overdue' || (tx.status !== 'completed' && tx.status !== 'cancelled' && tx.status !== 'closed'))) totalPending += amt;
  });
  const netCashflow = totalReceived - totalSent;

  let csv = 'SmartLedger Monthly Business Report\n';
  csv += `Reporting Month,"${month}"\n`;
  csv += `Generated Date,"${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}"\n`;
  csv += `Current Ledger Balance,${currentBalance}\n`;
  csv += `Total Received (Inflows),${totalReceived}\n`;
  csv += `Total Sent (Outflows),${totalSent}\n`;
  csv += `Net Cashflow,${netCashflow}\n`;
  csv += `Total Open Receivables,${totalPending}\n`;
  csv += `Total Transactions,${transactions.length}\n`;
  csv += `Active Customers,${customers.length}\n\n`;

  csv += 'TRANSACTIONS REGISTER\n';
  csv += 'S.No,Date,Type,Person / Customer Name,Phone Number,Category / Purpose,Payment Method,Amount (INR),Status,Notes\n';

  transactions.forEach((t, idx) => {
    const dateStr = t.date || t.createdAt || 'N/A';
    const typeStr = (t.type || 'N/A').toUpperCase();
    const nameStr = (t.personName || t.customerName || 'N/A').replace(/"/g, '""');
    const phoneStr = (t.phoneNumber || t.phone || 'N/A').replace(/"/g, '""');
    const categoryStr = (t.purpose || t.category || 'General').replace(/"/g, '""');
    const methodStr = (t.method || t.paymentMethod || 'UPI').toUpperCase();
    const amt = Number(t.amount) || 0;
    const statusStr = (t.status || 'Completed').toUpperCase();
    const noteStr = (t.note || t.notes || t.reason || '').replace(/"/g, '""');

    csv += `${idx + 1},"${dateStr}","${typeStr}","${nameStr}","${phoneStr}","${categoryStr}","${methodStr}",${amt},"${statusStr}","${noteStr}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const sanitizedMonth = month.replace(/[^a-zA-Z0-9_-]/g, '_');
  saveAs(blob, `SmartLedger_Report_${sanitizedMonth}.csv`);
}
