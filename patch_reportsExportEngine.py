import sys
import re

file_path = 'src/lib/reportsExportEngine.ts'
with open(file_path, 'r') as f:
    code = f.read()

# Make sure imports include what we need
if "applyPremiumHeader" not in code:
    import_statement = "import { applyPremiumHeader, applyPremiumFooter, drawSummaryGrid, premiumTableStyles, loadPremiumFonts } from './pdfTheme';"
    # Insert it near top
    code = re.sub(r'(import jsPDF from \'jspdf\';)', r'\1\n' + import_statement, code)

# 1. generateEntriesReport
# Re-write the PDF section
old_entries_pdf = """    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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

    // Table"""

new_entries_pdf = """    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, 'Transactions Report');

    const nextY = drawSummaryGrid(doc, 44, [
      { label: 'Total Entries', value: `${totalEntries} Records` },
      { label: 'Total Received', value: `Rs. ${totalReceived.toLocaleString('en-IN')}`, valueColor: [16, 185, 129] },
      { label: 'Total Pending', value: `Rs. ${totalPending.toLocaleString('en-IN')}`, valueColor: [217, 119, 6] }
    ]);

    // Table"""
code = code.replace(old_entries_pdf, new_entries_pdf)

old_entries_table_opts = """      startY: 47,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },"""
      
new_entries_table_opts = """      startY: nextY + 4,
      ...premiumTableStyles,"""
code = code.replace(old_entries_table_opts, new_entries_table_opts)

old_entries_footer = """      didDrawPage: function (data) {
        const totalPages = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Page ${currentPage} of ${totalPages}`,
          doc.internal.pageSize.width - 14,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
      }
    });

    doc.save(`SmartLedger_Entries_${format(new Date(), 'yyyy-MM-dd')}.pdf`);"""

new_entries_footer = """    } as any);

    applyPremiumFooter(doc, 'Entries Report');
    doc.save(`SmartLedger_Entries_${format(new Date(), 'yyyy-MM-dd')}.pdf`);"""

# Careful, the didDrawPage block has curly braces. Let's use regex for this block
code = re.sub(r'didDrawPage: function \(data\) \{.*?\}.*?\}\);.*?doc\.save\(`SmartLedger_Entries.*?\.pdf`\);', new_entries_footer, code, flags=re.DOTALL)


# 2. generatePendingReport
old_pending_pdf = """    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

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

    // Table"""

new_pending_pdf = """    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadPremiumFonts(doc);
    applyPremiumHeader(doc, 'Pending Payments Report');

    const nextY = drawSummaryGrid(doc, 44, [
      { label: 'Total Pending', value: `${totalPendingEntries} Customers` },
      { label: 'Amount Due', value: `Rs. ${totalPendingAmount.toLocaleString('en-IN')}`, valueColor: [217, 119, 6] },
      { label: 'Overdue', value: `${overdueCount} Records`, valueColor: [220, 38, 38] }
    ]);

    // Table"""
code = code.replace(old_pending_pdf, new_pending_pdf)

old_pending_table_opts = """      startY: 47,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },"""

new_pending_table_opts = """      startY: nextY + 4,
      ...premiumTableStyles,"""
code = code.replace(old_pending_table_opts, new_pending_table_opts)

new_pending_footer = """    } as any);

    applyPremiumFooter(doc, 'Pending Payments Report');
    doc.save(`SmartLedger_Pending_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);"""

code = re.sub(r'didDrawPage: function \(data\) \{.*?\}.*?\}\);.*?doc\.save\(`SmartLedger_Pending_Report_.*?\.pdf`\);', new_pending_footer, code, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(code)

print("reportsExportEngine patched")
