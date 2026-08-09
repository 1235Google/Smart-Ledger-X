import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, isSameDay, isSameWeek, isSameMonth, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export type ExportFormat = 'excel' | 'pdf';
export type ExportFilterType = 'all' | 'today' | 'week' | 'month' | 'custom' | 'selected';

export interface ExportOptions {
  format: ExportFormat;
  filterType: ExportFilterType;
  startDate?: string;
  endDate?: string;
  selectedIds?: string[];
  records: any[];
  title?: string;
  reportType: 'entries' | 'pending' | 'gullak';
}

// Helper to clean & parse date strings reliably
function parseRecordDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  try {
    const parsedISO = parseISO(dateStr);
    if (!isNaN(parsedISO.getTime())) return parsedISO;

    const nativeDate = new Date(dateStr);
    if (!isNaN(nativeDate.getTime())) return nativeDate;

    // Handle "YYYY-MM-DD HH:mm AM/PM" or "YYYY-MM-DD"
    const firstPart = String(dateStr).split(' ')[0];
    const fallbackDate = new Date(firstPart);
    if (!isNaN(fallbackDate.getTime())) return fallbackDate;
  } catch (e) {
    // Ignore
  }
  return null;
}

// Filter records based on selected filter option
export function filterRecordsForExport(records: any[], options: Partial<ExportOptions>): any[] {
  if (!records || records.length === 0) return [];
  const { filterType = 'all', startDate, endDate, selectedIds } = options;

  const now = new Date();

  return records.filter(item => {
    // Check selected IDs first if filter is 'selected'
    if (filterType === 'selected') {
      if (!selectedIds || selectedIds.length === 0) return true;
      return selectedIds.includes(item.id);
    }

    if (filterType === 'all') return true;

    const recordDate = parseRecordDate(item.date || item.dueDate || item.createdAt);
    if (!recordDate) return true; // If date missing, default include

    if (filterType === 'today') {
      return isSameDay(recordDate, now);
    }

    if (filterType === 'week') {
      return isSameWeek(recordDate, now, { weekStartsOn: 1 });
    }

    if (filterType === 'month') {
      return isSameMonth(recordDate, now);
    }

    if (filterType === 'custom') {
      if (startDate) {
        const start = startOfDay(parseISO(startDate));
        if (isBefore(recordDate, start)) return false;
      }
      if (endDate) {
        const end = endOfDay(parseISO(endDate));
        if (isAfter(recordDate, end)) return false;
      }
      return true;
    }

    return true;
  });
}

/**
 * EXPORT ENTRIES REPORT (EXCEL & PDF)
 */
export async function generateEntriesReport(options: ExportOptions): Promise<void> {
  const filteredData = filterRecordsForExport(options.records, options);
  const nowStr = format(new Date(), 'yyyy-MM-dd_HHmm');
  const dateStrPretty = format(new Date(), 'dd MMM yyyy, hh:mm a');

  // Compute metrics
  const totalEntries = filteredData.length;
  let totalReceived = 0;
  let totalPending = 0;

  filteredData.forEach(item => {
    const amt = Number(item.amount) || 0;
    if (item.type === 'received' || item.type === 'income' || item.status === 'completed' || item.status === 'paid' || item.status === 'received') {
      totalReceived += amt;
    } else {
      totalPending += amt;
    }
  });

  if (options.format === 'excel') {
    let csvContent = 'S.No,Customer Name,Phone Number,Amount (Rs),Status,Category,Payment Method,Transaction Date,Due Date,Notes,Created Date,Updated Date\n';
    filteredData.forEach((item, idx) => {
      csvContent += `${idx + 1},"${item.personName || item.customerName || 'N/A'}","${item.phoneNumber || item.phone || 'N/A'}",${Number(item.amount) || 0},"${(item.status || item.type || 'Completed').toUpperCase()}","${item.category || item.purpose || 'General'}","${item.method || item.paymentMethod || 'UPI'}","${item.date || 'N/A'}","${item.dueDate || 'N/A'}","${item.note || item.notes || item.reason || 'N/A'}","${item.createdAt ? format(parseRecordDate(item.createdAt) || new Date(), 'yyyy-MM-dd') : (item.date || 'N/A')}","${item.updatedAt ? format(parseRecordDate(item.updatedAt) || new Date(), 'yyyy-MM-dd') : (item.date || 'N/A')}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `SmartLedger_Entries_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  } else {
    // --- PDF EXPORT ---
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Brand Header Box
    doc.setFillColor(5, 150, 105); // emerald-600
    doc.rect(0, 0, doc.internal.pageSize.width, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('SmartLedger Entries Report', 14, 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${dateStrPretty}`, doc.internal.pageSize.width - 14, 14, { align: 'right' });

    // Summary Cards Section
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, 26, 80, 16, 2, 2, 'F');
    doc.roundedRect(102, 26, 80, 16, 2, 2, 'F');
    doc.roundedRect(190, 26, 92, 16, 2, 2, 'F');

    doc.setTextColor(55, 65, 81);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL ENTRIES', 18, 32);
    doc.text('TOTAL RECEIVED', 106, 32);
    doc.text('TOTAL PENDING', 194, 32);

    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // emerald-600
    doc.text(`${totalEntries} Records`, 18, 38);
    doc.text(`Rs ${totalReceived.toLocaleString('en-IN')}`, 106, 38);

    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(`Rs ${totalPending.toLocaleString('en-IN')}`, 194, 38);

    // Table
    const tableHead = [["#", "Customer Name", "Phone", "Amount (Rs)", "Status", "Category", "Method", "Date", "Notes"]];
    const tableBody = filteredData.map((item, idx) => [
      idx + 1,
      item.personName || item.customerName || 'N/A',
      item.phoneNumber || item.phone || 'N/A',
      `Rs ${(Number(item.amount) || 0).toLocaleString('en-IN')}`,
      (item.status || item.type || 'Completed').toUpperCase(),
      item.category || item.purpose || 'General',
      item.method || item.paymentMethod || 'UPI',
      item.date || 'N/A',
      item.note || item.notes || item.reason || '-'
    ]);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 47,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 38, fontStyle: 'bold' },
        2: { cellWidth: 28 },
        3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
        7: { cellWidth: 28 },
        8: { cellWidth: 'auto' },
      },
      didDrawPage: function (data) {
        // Footer Page Numbering
        const totalPages = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Page ${currentPage} of ${totalPages}`,
          doc.internal.pageSize.width - 14,
          doc.internal.pageSize.height - 8,
          { align: 'right' }
        );
        doc.text(
          `SmartLedger Official Report • Confidential`,
          14,
          doc.internal.pageSize.height - 8
        );
      }
    });

    doc.save(`SmartLedger_Entries_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }
}

/**
 * EXPORT PENDING PAYMENTS REPORT (EXCEL & PDF)
 */
export async function generatePendingReport(options: ExportOptions): Promise<void> {
  const filteredData = filterRecordsForExport(options.records, options);
  const nowStr = format(new Date(), 'yyyy-MM-dd_HHmm');
  const dateStrPretty = format(new Date(), 'dd MMM yyyy, hh:mm a');

  const totalPendingEntries = filteredData.length;
  let totalPendingAmount = 0;
  let overdueCount = 0;

  const todayStr = new Date().toISOString().split('T')[0];

  filteredData.forEach(item => {
    const amt = Number(item.amount) || 0;
    totalPendingAmount += amt;
    if (item.status === 'overdue' || (item.dueDate && item.dueDate < todayStr && item.status !== 'paid' && item.status !== 'received')) {
      overdueCount++;
    }
  });

  if (options.format === 'excel') {
    let csvContent = 'S.No,Customer Name,Phone Number,Pending Amount (Rs),Due Date,Reminder Date,Days Remaining / Status,Notes / Reason\n';
    filteredData.forEach((item, idx) => {
      let daysRemainingStr = 'Pending';
      if (item.dueDate) {
        const dDate = parseRecordDate(item.dueDate);
        if (dDate) {
          const diffDays = Math.ceil((dDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
          if (diffDays < 0) {
            daysRemainingStr = `Overdue by ${Math.abs(diffDays)} days`;
          } else if (diffDays === 0) {
            daysRemainingStr = 'Due Today';
          } else {
            daysRemainingStr = `${diffDays} days remaining`;
          }
        }
      }
      csvContent += `${idx + 1},"${item.personName || item.customerName || 'N/A'}","${item.phoneNumber || item.phone || 'N/A'}",${Number(item.amount) || 0},"${item.dueDate || item.date || 'N/A'}","${item.reminderDate || 'N/A'}","${daysRemainingStr}","${item.notes || item.reason || item.note || 'N/A'}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `SmartLedger_Pending_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  } else {
    // --- PDF EXPORT ---
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Brand Header Box
    doc.setFillColor(217, 119, 6); // amber-600
    doc.rect(0, 0, doc.internal.pageSize.width, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('SmartLedger Pending Payments Report', 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${dateStrPretty}`, doc.internal.pageSize.width - 14, 14, { align: 'right' });

    // Stats Cards
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, 26, 56, 16, 2, 2, 'F');
    doc.roundedRect(74, 26, 62, 16, 2, 2, 'F');
    doc.roundedRect(140, 26, 56, 16, 2, 2, 'F');

    doc.setTextColor(55, 65, 81);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PENDING', 18, 32);
    doc.text('TOTAL AMOUNT DUE', 78, 32);
    doc.text('OVERDUE COUNT', 144, 32);

    doc.setFontSize(11);
    doc.setTextColor(217, 119, 6);
    doc.text(`${totalPendingEntries} Customers`, 18, 38);
    doc.text(`Rs ${totalPendingAmount.toLocaleString('en-IN')}`, 78, 38);

    doc.setTextColor(220, 38, 38); // red-600
    doc.text(`${overdueCount} Records`, 144, 38);

    // Table
    const tableHead = [["#", "Customer Name", "Phone", "Pending Amount", "Due Date", "Status", "Notes"]];
    const tableBody = filteredData.map((item, idx) => {
      let daysRemainingStr = (item.status || 'Pending').toUpperCase();
      if (item.dueDate) {
        const dDate = parseRecordDate(item.dueDate);
        if (dDate) {
          const diffDays = Math.ceil((dDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
          if (diffDays < 0) {
            daysRemainingStr = `OVERDUE (${Math.abs(diffDays)}d)`;
          } else if (diffDays === 0) {
            daysRemainingStr = 'DUE TODAY';
          } else {
            daysRemainingStr = `${diffDays}d REMAINING`;
          }
        }
      }

      return [
        idx + 1,
        item.personName || item.customerName || 'N/A',
        item.phoneNumber || item.phone || 'N/A',
        `Rs ${(Number(item.amount) || 0).toLocaleString('en-IN')}`,
        item.dueDate || item.date || 'N/A',
        daysRemainingStr,
        item.notes || item.reason || item.note || '-'
      ];
    });

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 47,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40, fontStyle: 'bold' },
        2: { cellWidth: 28 },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 25 },
        5: { cellWidth: 28, halign: 'center' },
        6: { cellWidth: 'auto' },
      },
      didDrawPage: function (data) {
        const totalPages = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Page ${currentPage} of ${totalPages}`,
          doc.internal.pageSize.width - 14,
          doc.internal.pageSize.height - 8,
          { align: 'right' }
        );
        doc.text(
          `SmartLedger Pending Payments Report • Confidential`,
          14,
          doc.internal.pageSize.height - 8
        );
      }
    });

    doc.save(`SmartLedger_Pending_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }
}

export async function generateGullakReport(options: ExportOptions): Promise<void> {
  const filteredData = filterRecordsForExport(options.records, options);
  const dateStrPretty = format(new Date(), 'dd MMM yyyy, hh:mm a');

  if (options.format === 'excel') {
    let csvContent = 'Date,Type,Amount,Notes\n';
    filteredData.forEach(item => {
      csvContent += `${item.date},"${item.category}",${item.amount},"${item.note}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Gullak_Entries_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  } else {
    const doc = new jsPDF();
    doc.text('Gullak Entries Report', 14, 14);
    autoTable(doc, {
      head: [['Date', 'Type', 'Amount', 'Notes']],
      body: filteredData.map(item => [item.date, item.category, item.amount, item.note]),
      startY: 20
    });
    doc.save(`Gullak_Entries_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }
}
