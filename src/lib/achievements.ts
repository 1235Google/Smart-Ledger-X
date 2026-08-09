import { GullakEntry, GullakSettings } from '../types';
import { format, differenceInDays, parseISO, startOfMonth, isSameMonth } from 'date-fns';

export interface AchievementDef {
  id: string;
  category: string;
  name: string;
  description: string;
  xpReward: number;
  icon: string; // lucide icon name
  target: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Savings Milestones
  { id: 'first_deposit', category: 'Savings', name: 'First Deposit', description: 'Make your very first deposit', xpReward: 50, icon: 'medal', target: 1 },
  { id: 'saved_500', category: 'Savings', name: '₹500 Saved', description: 'Reach ₹500 in total savings', xpReward: 50, icon: 'coins', target: 500 },
  { id: 'saved_1000', category: 'Savings', name: '₹1,000 Saved', description: 'Reach ₹1,000 in total savings', xpReward: 100, icon: 'banknote', target: 1000 },
  { id: 'saved_5000', category: 'Savings', name: '₹5,000 Saved', description: 'Reach ₹5,000 in total savings', xpReward: 250, icon: 'gem', target: 5000 },
  { id: 'saved_10000', category: 'Savings', name: '₹10,000 Saved', description: 'Reach ₹10,000 in total savings', xpReward: 500, icon: 'crown', target: 10000 },
  { id: 'saved_25000', category: 'Savings', name: '₹25,000 Saved', description: 'Reach ₹25,000 in total savings', xpReward: 1000, icon: 'building', target: 25000 },
  { id: 'saved_50000', category: 'Savings', name: '₹50,000 Saved', description: 'Reach ₹50,000 in total savings', xpReward: 2000, icon: 'diamond', target: 50000 },

  // Saving Streak
  { id: 'streak_3', category: 'Streak', name: '3 Day Streak', description: 'Save for 3 consecutive days', xpReward: 100, icon: 'flame', target: 3 },
  { id: 'streak_7', category: 'Streak', name: '7 Day Streak', description: 'Save for 7 consecutive days', xpReward: 200, icon: 'flame', target: 7 },
  { id: 'streak_15', category: 'Streak', name: '15 Day Streak', description: 'Save for 15 consecutive days', xpReward: 500, icon: 'flame', target: 15 },
  { id: 'streak_30', category: 'Streak', name: '30 Day Streak', description: 'Save for 30 consecutive days', xpReward: 1000, icon: 'flame', target: 30 },
  { id: 'streak_100', category: 'Streak', name: '100 Day Streak', description: 'Save for 100 consecutive days', xpReward: 3000, icon: 'flame', target: 100 },

  // Entry Milestones
  { id: 'entry_1', category: 'Entries', name: 'First Entry', description: 'Create your first savings entry', xpReward: 50, icon: 'file-text', target: 1 },
  { id: 'entry_10', category: 'Entries', name: '10 Entries', description: 'Create 10 savings entries', xpReward: 100, icon: 'files', target: 10 },
  { id: 'entry_25', category: 'Entries', name: '25 Entries', description: 'Create 25 savings entries', xpReward: 250, icon: 'copy', target: 25 },
  { id: 'entry_50', category: 'Entries', name: '50 Entries', description: 'Create 50 savings entries', xpReward: 500, icon: 'layers', target: 50 },
  { id: 'entry_100', category: 'Entries', name: '100 Entries', description: 'Create 100 savings entries', xpReward: 1000, icon: 'book-open', target: 100 },
  { id: 'entry_500', category: 'Entries', name: '500 Entries', description: 'Create 500 savings entries', xpReward: 5000, icon: 'archive', target: 500 },

  // Contributors
  { id: 'contributor_1', category: 'Contributors', name: 'First Contributor', description: 'Add your first contributor', xpReward: 50, icon: 'user', target: 1 },
  { id: 'contributor_5', category: 'Contributors', name: '5 Contributors', description: 'Receive money from 5 different people', xpReward: 200, icon: 'users', target: 5 },
  { id: 'contributor_10', category: 'Contributors', name: '10 Contributors', description: 'Receive money from 10 different people', xpReward: 500, icon: 'users', target: 10 },
  { id: 'highest_contributor', category: 'Contributors', name: 'Highest Contributor', description: 'Have one contributor save more than ₹5,000', xpReward: 500, icon: 'star', target: 5000 },

  // Goals
  { id: 'goal_1', category: 'Goals', name: 'First Goal', description: 'Meet your monthly goal once', xpReward: 200, icon: 'target', target: 1 },
  { id: 'goal_5', category: 'Goals', name: '5 Goals', description: 'Meet your monthly goal 5 times', xpReward: 1000, icon: 'target', target: 5 },
  { id: 'goal_10', category: 'Goals', name: '10 Goals', description: 'Meet your monthly goal 10 times', xpReward: 2500, icon: 'target', target: 10 },

  // Special
  { id: 'highest_deposit', category: 'Special', name: 'Mega Deposit', description: 'Make a single deposit of ₹10,000 or more', xpReward: 500, icon: 'zap', target: 10000 },
  { id: 'monthly_champ', category: 'Special', name: 'Monthly Champion', description: 'Save more than ₹20,000 in a single month', xpReward: 1000, icon: 'award', target: 20000 },
  { id: 'monthly_highest', category: 'Special', name: 'Savings Legend', description: 'Save more than ₹50,000 in a single month', xpReward: 2500, icon: 'trophy', target: 50000 },
];

export const LEVELS = [
  { level: 1, title: 'Beginner Saver', minXp: 0 },
  { level: 2, title: 'Smart Saver', minXp: 500 },
  { level: 3, title: 'Savings Expert', minXp: 1500 },
  { level: 4, title: 'Money Master', minXp: 4000 },
  { level: 5, title: 'Finance Legend', minXp: 10000 },
];

export function calculateProgress(entries: GullakEntry[], settings: GullakSettings): Record<string, number> {
  const progress: Record<string, number> = {};
  
  if (entries.length === 0) {
    ACHIEVEMENTS.forEach(a => progress[a.id] = 0);
    return progress;
  }

  // Savings
  const totalSavings = entries.reduce((sum, e) => sum + e.amount, 0);
  progress['first_deposit'] = totalSavings > 0 ? 1 : 0;
  progress['saved_500'] = totalSavings;
  progress['saved_1000'] = totalSavings;
  progress['saved_5000'] = totalSavings;
  progress['saved_10000'] = totalSavings;
  progress['saved_25000'] = totalSavings;
  progress['saved_50000'] = totalSavings;

  // Entries
  progress['entry_1'] = entries.length;
  progress['entry_10'] = entries.length;
  progress['entry_25'] = entries.length;
  progress['entry_50'] = entries.length;
  progress['entry_100'] = entries.length;
  progress['entry_500'] = entries.length;

  // Contributors
  const contributors = new Map<string, number>();
  entries.forEach(e => {
    const name = e.personName.trim().toLowerCase();
    contributors.set(name, (contributors.get(name) || 0) + e.amount);
  });
  const uniqueContributors = contributors.size;
  progress['contributor_1'] = uniqueContributors;
  progress['contributor_5'] = uniqueContributors;
  progress['contributor_10'] = uniqueContributors;
  
  let maxContributorAmount = 0;
  for (const amt of contributors.values()) {
    if (amt > maxContributorAmount) maxContributorAmount = amt;
  }
  progress['highest_contributor'] = maxContributorAmount;

  // Streak calculation
  const sortedDates = [...new Set(entries.map(e => e.date))].sort();
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  sortedDates.forEach(dateStr => {
    const d = parseISO(dateStr);
    if (!lastDate) {
      currentStreak = 1;
    } else {
      const diff = differenceInDays(d, lastDate);
      if (diff === 1) {
        currentStreak++;
      } else if (diff > 1) {
        currentStreak = 1;
      }
    }
    if (currentStreak > maxStreak) maxStreak = currentStreak;
    lastDate = d;
  });

  progress['streak_3'] = maxStreak;
  progress['streak_7'] = maxStreak;
  progress['streak_15'] = maxStreak;
  progress['streak_30'] = maxStreak;
  progress['streak_100'] = maxStreak;

  // Goals
  const monthlyTotals = new Map<string, number>();
  entries.forEach(e => {
    const monthKey = format(parseISO(e.date), 'yyyy-MM');
    monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + e.amount);
  });
  
  let goalsMet = 0;
  let maxMonthly = 0;
  for (const total of monthlyTotals.values()) {
    if (total >= settings.monthlyGoal) goalsMet++;
    if (total > maxMonthly) maxMonthly = total;
  }

  progress['goal_1'] = goalsMet;
  progress['goal_5'] = goalsMet;
  progress['goal_10'] = goalsMet;

  // Special
  let maxDeposit = 0;
  entries.forEach(e => {
    if (e.amount > maxDeposit) maxDeposit = e.amount;
  });
  
  progress['highest_deposit'] = maxDeposit;
  progress['monthly_champ'] = maxMonthly;
  progress['monthly_highest'] = maxMonthly;

  return progress;
}

export function getCurrentLevel(xp: number) {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXp) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

export function getNextLevel(xp: number) {
  const current = getCurrentLevel(xp);
  const next = LEVELS.find(l => l.level === current.level + 1);
  return next || current;
}
