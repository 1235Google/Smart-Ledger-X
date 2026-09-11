import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadPremiumFonts, applyPremiumHeader, applyPremiumFooter, premiumTableStyles, drawSummaryGrid } from './pdfTheme';

import { format, parseISO } from 'date-fns';
import { GullakEntry, UnlockedAchievement } from '../types';
import { ACHIEVEMENTS, calculateProgress, getCurrentLevel } from './achievements';
import { calculateGullakBalance, getGullakEntryDirection, getGullakAbsoluteAmount } from './gullakAccounting';

export const exportGullakPDF = async (entries: GullakEntry[], unlockedAchievements: UnlockedAchievement[], settings: any) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await loadPremiumFonts(doc);
  
  applyPremiumHeader(doc, 'Gullak Savings Overview', 'Comprehensive Vault Report');
  
  const total = calculateGullakBalance(entries);
  const nextY1 = drawSummaryGrid(doc, 44, [
    { label: 'Total Vault Savings', value: `Rs. ${total.toLocaleString('en-IN')}`, highlight: true, valueColor: [16, 185, 129] }
  ]);
  
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('TRANSACTION HISTORY', 14, nextY1 + 10);
  
  const tableColumn = ["Date", "Time", "Person Name", "Category", "Payment Method", "Amount", "Notes"];
  const tableRows: any[][] = [];
  entries.forEach(entry => {
    const isCredit = getGullakEntryDirection(entry) === 'credit';
    const absAmt = getGullakAbsoluteAmount(entry);
    const entryData = [
      entry.date,
      entry.time,
      entry.personName,
      entry.category,
      entry.paymentMethod,
      `${isCredit ? '+' : '-'} Rs. ${absAmt.toLocaleString('en-IN')}`,
      entry.note || '-'
    ];
    tableRows.push(entryData);
  });
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: nextY1 + 16,
    ...premiumTableStyles,
  } as any);
  
  // Achievements section
  doc.addPage();
  applyPremiumHeader(doc, 'Achievements & Progress', 'Gamification Report');
  
  const totalXp = unlockedAchievements.reduce((s, u) => s + u.xpEarned, 0);
  const currentLevel = getCurrentLevel(totalXp);
  const compPercent = Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100);
  
  const nextY2 = drawSummaryGrid(doc, 44, [
    { label: 'Current Rank', value: currentLevel.title, highlight: true },
    { label: 'Total XP Earned', value: totalXp.toLocaleString() },
    { label: 'Completion', value: `${compPercent}% Complete`, valueColor: [16, 185, 129] }
  ]);
  
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.text('ACHIEVEMENTS DIRECTORY', 14, nextY2 + 10);
  
  const achColumn = ["Badge Name", "Category", "Status", "Unlock Date", "XP Earned", "Progress"];
  const achRows: any[][] = [];
  
  const currentProgress = calculateProgress(entries, settings);
  ACHIEVEMENTS.forEach(ach => {
    const unlocked = unlockedAchievements.find(u => u.id === ach.id);
    const progressVal = Math.min(ach.target, currentProgress[ach.id] || 0);
    const percentage = Math.round((progressVal / ach.target) * 100);
    
    achRows.push([
      ach.name,
      ach.category,
      unlocked ? 'Unlocked' : 'Locked',
      unlocked ? format(parseISO(unlocked.unlockedAt), 'dd MMM yyyy') : '-',
      unlocked ? unlocked.xpEarned : '-',
      unlocked ? '100%' : `${percentage}%`
    ]);
  });
  
  autoTable(doc, {
    head: [achColumn],
    body: achRows,
    startY: nextY2 + 16,
    ...premiumTableStyles,
  } as any);
  
  applyPremiumFooter(doc, 'Gullak Savings Overview');
  doc.save(`SmartLedger_Gullak_Savings_${format(new Date(), 'yyyy_MM_dd')}.pdf`);
};
