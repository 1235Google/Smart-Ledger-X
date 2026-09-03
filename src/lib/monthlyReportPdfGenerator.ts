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

/**
 * Generates an executive-grade VisionOS styled PDF report for SmartLedger
 */
export function generateMonthlyPdf(data: MonthlyReportData): void {
  const { month, recipientEmail, transactions, customers, currentBalance, aiSummary } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Financial calculations
  let totalReceived = 0;
  let totalSent = 0;
  let totalPending = 0;
  let receivedCount = 0;
  let sentCount = 0;
  let pendingCount = 0;

  transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'received') {
      totalReceived += amt;
      receivedCount++;
    } else if (tx.type === 'sent') {
      totalSent += amt;
      sentCount++;
    } else if (tx.type === 'pending' && (tx.status === 'pending' || tx.status === 'overdue' || (tx.status !== 'completed' && tx.status !== 'cancelled' && tx.status !== 'closed'))) {
      totalPending += amt;
      pendingCount++;
    }
  });

  const netCashflow = totalReceived - totalSent;
  const generatedDateStr = format(new Date(), 'dd MMMM yyyy, hh:mm a');

  // --- HEADER SECTION ---
  // Dark Slate Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Cyan / Blue Accent Stripe
  doc.setFillColor(59, 130, 246); // blue-500
  doc.rect(0, 42, pageWidth, 2, 'F');

  // Logo & Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('SmartLedger', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('VisionOS Financial Suite • Executive Report', 14, 25);

  // Month & Period Pill on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text(month.toUpperCase(), pageWidth - 14, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${generatedDateStr}`, pageWidth - 14, 25, { align: 'right' });
  if (recipientEmail) {
    doc.text(`Recipient: ${recipientEmail}`, pageWidth - 14, 32, { align: 'right' });
  }

  // --- EXECUTIVE SUMMARY METRICS CARDS (4-Column Layout) ---
  const cardY = 50;
  const cardH = 24;
  const gap = 4;
  const margin = 14;
  const totalAvailableWidth = pageWidth - (margin * 2);
  const cardW = (totalAvailableWidth - (gap * 3)) / 4;

  const metrics = [
    {
      title: 'TOTAL INFLOWS',
      value: `₹${totalReceived.toLocaleString('en-IN')}`,
      sub: `${receivedCount} Received`,
      fill: [240, 253, 244], // emerald-50
      border: [187, 247, 208], // emerald-200
      text: [22, 101, 52] // emerald-800
    },
    {
      title: 'TOTAL OUTFLOWS',
      value: `₹${totalSent.toLocaleString('en-IN')}`,
      sub: `${sentCount} Sent`,
      fill: [254, 242, 242], // red-50
      border: [254, 202, 202], // red-200
      text: [153, 27, 27] // red-800
    },
    {
      title: 'NET CASHFLOW',
      value: `₹${netCashflow.toLocaleString('en-IN')}`,
      sub: netCashflow >= 0 ? 'Surplus' : 'Deficit',
      fill: [239, 246, 255], // blue-50
      border: [191, 219, 254], // blue-200
      text: [30, 64, 175] // blue-800
    },
    {
      title: 'OPEN DUES',
      value: `₹${totalPending.toLocaleString('en-IN')}`,
      sub: `${pendingCount} Receivables`,
      fill: [254, 252, 232], // amber-50
      border: [254, 240, 138], // amber-200
      text: [133, 77, 14] // amber-800
    }
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * (cardW + gap);
    doc.setFillColor(m.fill[0], m.fill[1], m.fill[2]);
    doc.setDrawColor(m.border[0], m.border[1], m.border[2]);
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.title, x + 4, cardY + 6);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(m.text[0], m.text[1], m.text[2]);
    doc.text(m.value, x + 4, cardY + 14);

    // Sub
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.sub, x + 4, cardY + 20);
  });

  // --- AI EXECUTIVE SUMMARY CALLOUT BOX ---
  let startTableY = 82;
  if (aiSummary) {
    const boxY = 80;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.roundedRect(14, boxY, pageWidth - 28, 26, 2, 2, 'FD');

    // Left blue accent bar
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(14, boxY, 3, 26, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('EXECUTIVE FINANCIAL INTELLIGENCE', 21, boxY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitSummary = doc.splitTextToSize(aiSummary, pageWidth - 42);
    doc.text(splitSummary.slice(0, 3), 21, boxY + 12);

    startTableY = 112;
  }

  // --- TRANSACTIONS BREAKDOWN TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Monthly Transactions Ledger', 14, startTableY - 3);

  const tableHead = [['#', 'Date', 'Type', 'Counterparty / Customer', 'Purpose / Category', 'Method', 'Amount (INR)', 'Status']];
  
  const tableBody = transactions.map((t, index) => {
    const amt = Number(t.amount) || 0;
    const formattedAmt = `₹${amt.toLocaleString('en-IN')}`;
    let dateStr = t.date || t.createdAt || 'N/A';
    try {
      if (dateStr.includes('T')) {
        dateStr = format(parseISO(dateStr), 'dd MMM yyyy');
      }
    } catch (e) {}

    return [
      index + 1,
      dateStr,
      (t.type || 'N/A').toUpperCase(),
      t.personName || t.customerName || 'General Account',
      t.purpose || t.category || t.note || 'Ledger Entry',
      (t.method || t.paymentMethod || 'UPI').toUpperCase(),
      formattedAmt,
      (t.status || 'COMPLETED').toUpperCase()
    ];
  });

  if (tableBody.length === 0) {
    tableBody.push(['-', '-', 'NO DATA', 'No transactions recorded for this period', '-', '-', '₹0', '-']);
  }

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: startTableY,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 20, fontStyle: 'bold' },
      3: { cellWidth: 42 },
      4: { cellWidth: 38 },
      5: { cellWidth: 18 },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 20, halign: 'center' }
    },
    didDrawPage: (data) => {
      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `SmartLedger VisionOS Suite • Page ${data.pageNumber} • Confidential Business Report`,
        14,
        pageHeight - 8
      );
      doc.text(
        `Verified Current Balance: ₹${currentBalance.toLocaleString('en-IN')}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    }
  });

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
