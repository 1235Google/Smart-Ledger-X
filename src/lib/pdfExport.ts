import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { GullakEntry, UnlockedAchievement } from '../types';
import { ACHIEVEMENTS, calculateProgress, getCurrentLevel } from './achievements';

export const exportGullakPDF = (entries: GullakEntry[], unlockedAchievements: UnlockedAchievement[], settings: any) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('SmartLedger - Gullak Savings', 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 14, 30);
  
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  doc.text(`Total Savings: Rs ${total.toLocaleString('en-IN')}`, 14, 36);

  const tableColumn = ["Date", "Time", "Person Name", "Category", "Payment Method", "Amount", "Notes"];
  const tableRows: any[][] = [];

  entries.forEach(entry => {
    const entryData = [
      entry.date,
      entry.time,
      entry.personName,
      entry.category,
      entry.paymentMethod,
      entry.amount.toLocaleString('en-IN'),
      entry.note || '-'
    ];
    tableRows.push(entryData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [244, 63, 94] } // rose-500
  });

  // Achievements section
  doc.addPage();
  doc.setFontSize(20);
  doc.text('Achievements Summary', 14, 22);
  
  const totalXp = unlockedAchievements.reduce((s, u) => s + u.xpEarned, 0);
  const currentLevel = getCurrentLevel(totalXp);
  const compPercent = Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100);

  doc.setFontSize(11);
  doc.text(`Current Level: ${currentLevel.title}`, 14, 32);
  doc.text(`Total XP Earned: ${totalXp.toLocaleString()}`, 14, 38);
  doc.text(`Completion %: ${compPercent}%`, 14, 44);

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
    startY: 50,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [217, 119, 6] } // amber-600
  });

  doc.save(`Gullak_Savings_With_Achievements_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
