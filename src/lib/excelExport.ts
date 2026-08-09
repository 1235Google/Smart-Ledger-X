import { saveAs } from 'file-saver';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Transaction, ReceivedMoney, SentMoney, PendingMoney, GullakEntry, UnlockedAchievement } from '../types';
import { ACHIEVEMENTS, calculateProgress, getCurrentLevel } from './achievements';

export const exportGullakExcel = async (
  entries: GullakEntry[], 
  unlockedAchievements: UnlockedAchievement[], 
  settings: any
) => {
  exportGullakCSV(entries, unlockedAchievements, settings);
};

export const exportGullakCSV = (entries: GullakEntry[], unlockedAchievements: UnlockedAchievement[], settings: any) => {
  const header = ['ID', 'Person Name', 'Amount', 'Date', 'Time', 'Payment Method', 'Category', 'Notes'];
  const rows = entries.map(e => [
    e.id, 
    `"${e.personName}"`, 
    e.amount, 
    e.date, 
    e.time, 
    e.paymentMethod, 
    e.category, 
    `"${(e.note || '').replace(/"/g, '""')}"`
  ]);
  
  let csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  csvContent += '\n\n--- ACHIEVEMENTS ---\n';
  const achHeader = ['Badge Name', 'Category', 'Description', 'Status', 'Unlock Date', 'XP Earned', 'Progress'];
  
  const currentProgress = calculateProgress(entries, settings);
  const achRows = ACHIEVEMENTS.map(ach => {
    const unlocked = unlockedAchievements.find(u => u.id === ach.id);
    const progressVal = Math.min(ach.target, currentProgress[ach.id] || 0);
    const percentage = Math.round((progressVal / ach.target) * 100);
    return [
      `"${ach.name}"`,
      `"${ach.category}"`,
      `"${ach.description}"`,
      unlocked ? 'Unlocked' : 'Locked',
      unlocked ? format(parseISO(unlocked.unlockedAt), 'yyyy-MM-dd') : '-',
      unlocked ? unlocked.xpEarned : 0,
      unlocked ? '100%' : `"${percentage}% (${progressVal}/${ach.target})"`
    ];
  });
  
  csvContent += [achHeader.join(','), ...achRows.map(r => r.join(','))].join('\n');
  
  const totalXp = unlockedAchievements.reduce((s, u) => s + u.xpEarned, 0);
  const currentLevel = getCurrentLevel(totalXp);
  const compPercent = Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100);

  csvContent += `\n\nSUMMARY\n`;
  csvContent += `Current Level,${currentLevel.title}\n`;
  csvContent += `Total XP Earned,${totalXp}\n`;
  csvContent += `Completion %,${compPercent}%\n`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `Gullak_Savings_With_Achievements_${format(new Date(), 'yyyy-MM-dd')}.csv`);
};

export const generateAdvancedExcel = async (
  transactions: Transaction[],
  summary: {
    currentBalance: number;
    totalReceived: number;
    totalSent: number;
    totalPending: number;
  }
) => {
  let csvContent = 'Metric,Value\n';
  csvContent += `Current Balance,${summary.currentBalance}\n`;
  csvContent += `Total Money Received,${summary.totalReceived}\n`;
  csvContent += `Total Money Sent,${summary.totalSent}\n`;
  csvContent += `Pending Receivables,${summary.totalPending}\n\n`;
  
  csvContent += 'ID,Type,Date,Name,Amount,Description\n';
  
  const rows = transactions.map(t => {
    const isPending = t.type === 'pending';
    const rawDate = isPending ? (t as PendingMoney).dueDate : (t as any).date;
    const desc = isPending ? (t as PendingMoney).reason : (t as any).purpose;
    return `${t.id},${t.type},${rawDate},"${t.personName}",${t.amount},"${desc}"`;
  });
  
  csvContent += rows.join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `SmartLedger_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
};
