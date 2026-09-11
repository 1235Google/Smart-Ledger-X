import sys
import re

file_path = 'src/lib/reportsExportEngine.ts'
with open(file_path, 'r') as f:
    code = f.read()

import_line = "import { loadPremiumFonts, applyPremiumHeader, applyPremiumFooter, premiumTableStyles } from './pdfTheme';\n"
if "pdfTheme" not in code:
    code = code.replace("import autoTable from 'jspdf-autotable';", "import autoTable from 'jspdf-autotable';\n" + import_line)

# --- PATCH generateEntriesReport ---
entries_pattern = re.compile(r'const doc = new jsPDF.*?doc\.save\(`SmartLedger_Entries_Report_\$\{format\(new Date\(\), \'yyyy-MM-dd\'\)\}\.pdf`\);', re.DOTALL)

def replace_entries(match):
    return """const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, options.title || 'Entries Report', 'Financial Ledger');

    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.text('SUMMARY', 14, 48);

    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    const amountX = 85;
    doc.text('Total Entries:', 14, 56);
    doc.text(`${totalEntries} Records`, amountX, 56, { align: 'right' });
    doc.text('Total Received:', 14, 62);
    doc.text(`Rs. ${totalReceived.toLocaleString('en-IN')}`, amountX, 62, { align: 'right' });
    doc.text('Total Pending:', 14, 68);
    doc.text(`Rs. ${totalPending.toLocaleString('en-IN')}`, amountX, 68, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.text('TRANSACTION RECORD', 14, 82);

    const tableHead = [["No.", "Name", "Type", "Amount", "Status", "Date"]];
    const tableBody = filteredData.map((item, idx) => {
      const isPending = item.type === 'pending';
      const typeStr = (item.type || 'N/A').toUpperCase();
      return [
        (idx + 1).toString(),
        item.personName || item.customerName || 'N/A',
        typeStr,
        `Rs. ${Number(item.amount || 0).toLocaleString('en-IN')}`,
        (item.status || 'Completed').toUpperCase(),
        format(parseRecordDate(isPending ? item.dueDate : item.date) || new Date(), 'dd MMM yyyy')
      ];
    });

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 88,
      ...premiumTableStyles,
    } as any);

    applyPremiumFooter(doc, options.title || 'Entries Report');
    doc.save(`SmartLedger_Entries_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);"""

# We need to make sure we only match inside generateEntriesReport. 
# It's better to manually replace the chunk or use a robust pattern.
# Actually I'll just write a script to replace each chunk.

code = code.replace("""    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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
      Number(item.amount || 0).toLocaleString('en-IN'),
      (item.status || (item.type === 'pending' ? 'Pending' : 'Completed')).toUpperCase(),
      item.purpose || item.category || 'General',
      item.method || item.paymentMethod || 'UPI',
      format(parseRecordDate(item.type === 'pending' ? item.dueDate : item.date) || new Date(), 'dd MMM yyyy'),
      item.notes || item.note || item.reason || ''
    ]);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [5, 150, 105], textColor: 255 }, // emerald-600
      didDrawPage: function (data) {
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `SmartLedger • Page ${data.pageNumber}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });

    doc.save(`SmartLedger_Entries_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);""", """    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, options.title || 'Entries Report', 'Financial Ledger');

    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.text('SUMMARY', 14, 48);

    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    const amountX = 85;
    doc.text('Total Entries:', 14, 56);
    doc.text(`${totalEntries} Records`, amountX, 56, { align: 'right' });
    doc.text('Total Received:', 14, 62);
    doc.text(`Rs. ${totalReceived.toLocaleString('en-IN')}`, amountX, 62, { align: 'right' });
    doc.text('Total Pending:', 14, 68);
    doc.text(`Rs. ${totalPending.toLocaleString('en-IN')}`, amountX, 68, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.text('TRANSACTION RECORD', 14, 82);

    const tableHead = [["No.", "Customer Name", "Phone", "Amount", "Status", "Date", "Notes"]];
    const tableBody = filteredData.map((item, idx) => {
      const isPending = item.type === 'pending';
      return [
        (idx + 1).toString(),
        item.personName || item.customerName || 'N/A',
        item.phoneNumber || item.phone || 'N/A',
        `Rs. ${Number(item.amount || 0).toLocaleString('en-IN')}`,
        (item.status || (isPending ? 'Pending' : 'Completed')).toUpperCase(),
        format(parseRecordDate(isPending ? item.dueDate : item.date) || new Date(), 'dd MMM yyyy'),
        item.notes || item.note || item.reason || ''
      ];
    });

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 88,
      ...premiumTableStyles,
    } as any);

    applyPremiumFooter(doc, options.title || 'Entries Report');
    doc.save(`SmartLedger_Entries_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);""")

code = code.replace("""    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

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
        const due = parseRecordDate(item.dueDate);
        const now = new Date();
        if (due) {
          const diffTime = due.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            daysRemainingStr = `OVERDUE (${Math.abs(diffDays)}d)`;
          } else if (diffDays === 0) {
            daysRemainingStr = 'DUE TODAY';
          } else {
            daysRemainingStr = `In ${diffDays}d`;
          }
        }
      }

      return [
        idx + 1,
        item.customerName || item.personName || 'N/A',
        item.phone || item.phoneNumber || 'N/A',
        Number(item.amount || 0).toLocaleString('en-IN'),
        format(parseRecordDate(item.dueDate) || new Date(), 'dd MMM yyyy'),
        daysRemainingStr,
        item.reason || item.notes || ''
      ];
    });

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [217, 119, 6], textColor: 255 }, // amber-600
      didDrawPage: function (data) {
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `SmartLedger • Page ${data.pageNumber}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });

    doc.save(`SmartLedger_Pending_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);""", """    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, 'Pending Payments Report', 'Receivables Ledger');

    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.text('SUMMARY', 14, 48);

    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    const amountX = 85;
    doc.text('Total Customers:', 14, 56);
    doc.text(`${totalPendingEntries}`, amountX, 56, { align: 'right' });
    doc.text('Total Amount Due:', 14, 62);
    doc.text(`Rs. ${totalPendingAmount.toLocaleString('en-IN')}`, amountX, 62, { align: 'right' });
    doc.text('Overdue Records:', 14, 68);
    doc.text(`${overdueCount}`, amountX, 68, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.text('PENDING RECORD', 14, 82);

    const tableHead = [["No.", "Name", "Pending Amount", "Due Date", "Status", "Notes"]];
    const tableBody = filteredData.map((item, idx) => {
      let daysRemainingStr = (item.status || 'Pending').toUpperCase();
      if (item.dueDate) {
        const due = parseRecordDate(item.dueDate);
        const now = new Date();
        if (due) {
          const diffTime = due.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            daysRemainingStr = `OVERDUE (${Math.abs(diffDays)}d)`;
          } else if (diffDays === 0) {
            daysRemainingStr = 'DUE TODAY';
          } else {
            daysRemainingStr = `In ${diffDays}d`;
          }
        }
      }

      return [
        (idx + 1).toString(),
        item.customerName || item.personName || 'N/A',
        `Rs. ${Number(item.amount || 0).toLocaleString('en-IN')}`,
        format(parseRecordDate(item.dueDate) || new Date(), 'dd MMM yyyy'),
        daysRemainingStr,
        item.reason || item.notes || ''
      ];
    });

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 88,
      ...premiumTableStyles,
    } as any);

    applyPremiumFooter(doc, 'Pending Payments Report');
    doc.save(`SmartLedger_Pending_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);""")

code = code.replace("""    const doc = new jsPDF();
    doc.text('Gullak Entries Report', 14, 14);
    autoTable(doc, {
      head: [['Date', 'Type', 'Direction', 'Amount', 'Notes']],
      body: filteredData.map(item => {
        const isCredit = getGullakEntryDirection(item) === 'credit';
        const absAmt = getGullakAbsoluteAmount(item);
        return [
          item.date, 
          item.category, 
          isCredit ? 'Credit' : 'Debit',
          `${isCredit ? '+' : '-'}Rs ${absAmt.toLocaleString('en-IN')}`, 
          item.note || '-'
        ];
      }),
      startY: 20
    });
    doc.save(`Gullak_Entries_${format(new Date(), 'yyyy-MM-dd')}.pdf`);""", """    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, 'Gullak Vault Activity', 'Savings Ledger');

    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.text('TRANSACTION RECORD', 14, 48);

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
      startY: 54,
      ...premiumTableStyles,
    } as any);

    applyPremiumFooter(doc, 'Gullak Entries Report');
    doc.save(`Gullak_Entries_${format(new Date(), 'yyyy-MM-dd')}.pdf`);""")

with open(file_path, 'w') as f:
    f.write(code)
print("Patched reportsExportEngine")
