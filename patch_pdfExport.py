import sys

file_path = 'src/lib/pdfExport.ts'
with open(file_path, 'r') as f:
    code = f.read()

# Add drawSummaryGrid to import
code = code.replace("applyPremiumFooter, premiumTableStyles }", "applyPremiumFooter, premiumTableStyles, drawSummaryGrid }")

# Replace first summary
old_summary1 = """  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('SUMMARY', 14, 48);
  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  doc.text(`Total Vault Savings: Rs. ${total.toLocaleString('en-IN')}`, 14, 56);
  
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('TRANSACTION HISTORY', 14, 70);"""

new_summary1 = """  const nextY1 = drawSummaryGrid(doc, 44, [
    { label: 'Total Vault Savings', value: `Rs. ${total.toLocaleString('en-IN')}`, highlight: true, valueColor: [16, 185, 129] }
  ]);
  
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('TRANSACTION HISTORY', 14, nextY1 + 10);"""

code = code.replace(old_summary1, new_summary1)
code = code.replace("startY: 76,", "startY: nextY1 + 16,")


# Replace second summary
old_summary2 = """  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('PROGRESS OVERVIEW', 14, 48);
  
  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  doc.text(`Current Rank / Level: ${currentLevel.title}`, 14, 56);
  doc.text(`Total XP Earned: ${totalXp.toLocaleString()}`, 14, 62);
  doc.text(`Collection Progress: ${compPercent}% Complete`, 14, 68);
  
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('ACHIEVEMENTS DIRECTORY', 14, 82);"""

new_summary2 = """  const nextY2 = drawSummaryGrid(doc, 44, [
    { label: 'Current Rank', value: currentLevel.title, highlight: true },
    { label: 'Total XP Earned', value: totalXp.toLocaleString() },
    { label: 'Completion', value: `${compPercent}% Complete`, valueColor: [16, 185, 129] }
  ]);
  
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('ACHIEVEMENTS DIRECTORY', 14, nextY2 + 10);"""

code = code.replace(old_summary2, new_summary2)
code = code.replace("startY: 88,", "startY: nextY2 + 16,")

with open(file_path, 'w') as f:
    f.write(code)

print("pdfExport patched")
