import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadPremiumFonts, applyPremiumHeader, applyPremiumFooter, drawSummaryGrid, premiumTableStyles } from './pdfTheme';

import { format, parseISO, isSameDay, isSameWeek, isSameMonth, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { getGullakEntryDirection, getGullakAbsoluteAmount } from './gullakAccounting';

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
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, 'Transactions Report');

    const nextY = drawSummaryGrid(doc, 44, [
      { label: 'Total Entries', value: `${totalEntries} Records` },
      { label: 'Total Received', value: `Rs. ${totalReceived.toLocaleString('en-IN')}`, valueColor: [16, 185, 129] },
      { label: 'Total Pending', value: `Rs. ${totalPending.toLocaleString('en-IN')}`, valueColor: [217, 119, 6] }
    ]);
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
          } as any);

    applyPremiumFooter(doc, 'Entries Report');
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
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, 'Pending Payments Report');

    const nextY = drawSummaryGrid(doc, 44, [
      { label: 'Total Pending', value: `${totalPendingEntries} Customers` },
      { label: 'Amount Due', value: `Rs. ${totalPendingAmount.toLocaleString('en-IN')}`, valueColor: [217, 119, 6] },
      { label: 'Overdue', value: `${overdueCount} Records`, valueColor: [220, 38, 38] }
    ]);
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
      startY: nextY + 4,
      ...premiumTableStyles,
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40, fontStyle: 'bold' },
        2: { cellWidth: 28 },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 25 },
        5: { cellWidth: 28, halign: 'center' },
        6: { cellWidth: 'auto' },
      },
          } as any);

    applyPremiumFooter(doc, 'Pending Payments Report');
    doc.save(`SmartLedger_Pending_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }
}

export async function generateGullakReport(options: ExportOptions): Promise<void> {
  const filteredData = filterRecordsForExport(options.records, options);
  const dateStrPretty = format(new Date(), 'dd MMM yyyy, hh:mm a');

  if (options.format === 'excel') {
    let csvContent = 'Date,Type,Direction,Amount,Notes\n';
    filteredData.forEach(item => {
      const isCredit = getGullakEntryDirection(item) === 'credit';
      const absAmt = getGullakAbsoluteAmount(item);
      csvContent += `${item.date},"${item.category}","${isCredit ? 'Credit' : 'Debit'}",${isCredit ? '+' : '-'}${absAmt},"${(item.note || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Gullak_Entries_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  } else {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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
    ]);

    const tableHead = [['Date', 'Type', 'Direction', 'Amount', 'Notes']];
    const tableBody = filteredData.map(item => {
        const isCredit = getGullakEntryDirection(item) === 'credit';
        const absAmt = getGullakAbsoluteAmount(item);
        return [
          item.date || 'N/A', 
          item.category || 'N/A', 
          isCredit ? 'Credit' : 'Debit',
          `${isCredit ? '+' : '-'} Rs. ${absAmt.toLocaleString('en-IN')}`, 
          item.note || '-'
        ];
    });

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: nextY + 4,
      ...premiumTableStyles,
    } as any);

    applyPremiumFooter(doc, 'Gullak Entries Report');
    doc.save(`Gullak_Entries_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }
}
