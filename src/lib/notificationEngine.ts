import { Transaction, Bill, AppNotification, NotificationSettings } from '../types';
import { 
  createNotification, 
  getNotificationSettings, 
  dismissDuePaymentNotification,
  dismissBillNotification 
} from './notificationRepository';

/**
 * Format currency helper
 */
function formatCurrency(num: number): string {
  return '₹' + (Number(num) || 0).toLocaleString('en-IN');
}

/**
 * Get normalized date string YYYY-MM-DD
 */
function getTodayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Evaluates and dispatches Due Payment Reminders for real pending transactions.
 */
export async function evaluateDuePayments(
  userId: string,
  transactions: Transaction[],
  settings?: NotificationSettings
): Promise<void> {
  if (!userId || !transactions || transactions.length === 0) return;
  if (settings && !settings.duePayments) return;

  const todayStr = getTodayString();
  const todayMillis = new Date(todayStr).getTime();

  for (const t of transactions) {
    if (t.type === 'pending') {
      const isUnpaid = t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'closed';
      if (!isUnpaid) {
        // If marked paid, ensure any stale due payment notification is dismissed
        dismissDuePaymentNotification(userId, t.id).catch(() => {});
        continue;
      }

      if (t.dueDate) {
        const dueMillis = new Date(t.dueDate).getTime();
        if (todayMillis >= dueMillis) {
          const isToday = t.dueDate === todayStr;
          const diffDays = Math.floor((todayMillis - dueMillis) / (1000 * 60 * 60 * 24));
          const diffText = isToday ? 'Due Today' : `Overdue by ${diffDays} day${diffDays === 1 ? '' : 's'}`;

          const eventKey = `due_payment_${t.id}_${todayStr}`;
          await createNotification({
            userId,
            type: 'due_payment',
            category: 'finance',
            priority: 'high',
            title: `Payment Due Reminder: ${t.personName}`,
            message: `Payment of ${formatCurrency(t.amount)} from ${t.personName} is ${diffText} (${t.dueDate}).`,
            actionUrl: '/pending',
            actionLabel: 'View Payment',
            referenceId: t.id,
            eventKey,
            metadata: {
              transactionId: t.id,
              personName: t.personName,
              amount: t.amount,
              dueDate: t.dueDate,
              diffDays,
            },
          });
        }
      }
    }
  }
}

/**
 * Evaluates and dispatches Upcoming Bill Reminders.
 * Generates notifications at 7 days, 3 days, 1 day before, and Due Today.
 */
export async function evaluateUpcomingBills(
  userId: string,
  bills: Bill[],
  settings?: NotificationSettings
): Promise<void> {
  if (!userId || !bills || bills.length === 0) return;
  if (settings && !settings.upcomingBills) return;

  const todayStr = getTodayString();
  const todayMillis = new Date(todayStr).getTime();

  for (const bill of bills) {
    if (bill.isPaid) {
      // Dismiss any open notification for this bill
      dismissBillNotification(userId, bill.id).catch(() => {});
      continue;
    }

    if (!bill.dueDate) continue;

    const dueMillis = new Date(bill.dueDate).getTime();
    const daysDiff = Math.round((dueMillis - todayMillis) / (1000 * 60 * 60 * 24));

    let reminderTag: string | null = null;
    let title = '';
    let message = '';
    let priority: 'high' | 'medium' = 'medium';

    if (daysDiff === 7) {
      reminderTag = '7d';
      title = `Upcoming Bill: ${bill.name} in 7 Days`;
      message = `Your ${bill.category} bill of ${formatCurrency(bill.amount)} is due on ${bill.dueDate}.`;
    } else if (daysDiff === 3) {
      reminderTag = '3d';
      title = `Upcoming Bill: ${bill.name} in 3 Days`;
      message = `Reminder: ${bill.name} bill of ${formatCurrency(bill.amount)} is due in 3 days (${bill.dueDate}).`;
    } else if (daysDiff === 1) {
      reminderTag = '1d';
      priority = 'high';
      title = `Bill Due Tomorrow: ${bill.name}`;
      message = `Final reminder: ${bill.name} bill of ${formatCurrency(bill.amount)} is due tomorrow!`;
    } else if (daysDiff === 0) {
      reminderTag = 'due_today';
      priority = 'high';
      title = `Bill Due Today: ${bill.name}`;
      message = `Action required: ${bill.name} bill of ${formatCurrency(bill.amount)} is due today (${bill.dueDate}).`;
    } else if (daysDiff < 0) {
      // Overdue
      const daysOverdue = Math.abs(daysDiff);
      reminderTag = `overdue_${todayStr}`;
      priority = 'high';
      title = `Overdue Bill: ${bill.name}`;
      message = `${bill.name} bill of ${formatCurrency(bill.amount)} is overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}.`;
    }

    if (reminderTag) {
      const eventKey = `bill_rem_${bill.id}_${reminderTag}_${bill.dueDate}`;
      await createNotification({
        userId,
        type: 'bill_reminder',
        category: 'bills',
        priority,
        title,
        message,
        actionUrl: '/notifications?tab=bills',
        actionLabel: 'Pay / Manage Bill',
        referenceId: bill.id,
        eventKey,
        metadata: {
          billId: bill.id,
          name: bill.name,
          amount: bill.amount,
          dueDate: bill.dueDate,
          category: bill.category,
          daysDiff,
        },
      });
    }
  }
}

/**
 * Evaluates and generates Daily Financial Summary.
 * Generates ONLY IF transactions occurred today.
 */
export async function evaluateDailySummary(
  userId: string,
  transactions: Transaction[],
  settings?: NotificationSettings
): Promise<void> {
  if (!userId || !transactions) return;
  if (settings && !settings.dailySummary) return;

  const todayStr = getTodayString();
  const cacheKey = `smart_ledger_daily_summary_${userId}_${todayStr}`;
  if (localStorage.getItem(cacheKey)) {
    return; // Already generated for today
  }

  // Filter transactions that occurred today
  const todayTransactions = transactions.filter((t) => {
    if (t.type === 'received' || t.type === 'sent') {
      return (t.date || '').startsWith(todayStr);
    }
    return false;
  });

  // DO NOT generate if no transactions occurred today
  if (todayTransactions.length === 0) {
    return;
  }

  let todayIncome = 0;
  let todayExpense = 0;

  todayTransactions.forEach((t) => {
    if (t.type === 'received') todayIncome += Number(t.amount) || 0;
    if (t.type === 'sent') todayExpense += Number(t.amount) || 0;
  });

  const netBalanceChange = todayIncome - todayExpense;

  // Pending totals
  let pendingCollections = 0;
  transactions.forEach((t) => {
    if (t.type === 'pending' && t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'closed') {
      pendingCollections += Number(t.amount) || 0;
    }
  });

  const eventKey = `daily_summary_${userId}_${todayStr}`;
  const netSign = netBalanceChange >= 0 ? '+' : '';

  const summaryMsg = `Today's Activity: +${formatCurrency(todayIncome)} Income, -${formatCurrency(todayExpense)} Expense. Net change: ${netSign}${formatCurrency(netBalanceChange)}. Pending collections: ${formatCurrency(pendingCollections)}.`;

  await createNotification({
    userId,
    type: 'daily_summary',
    category: 'finance',
    priority: 'medium',
    title: `Daily Financial Summary • ${todayStr}`,
    message: summaryMsg,
    actionUrl: '/analytics',
    actionLabel: 'View Analytics',
    eventKey,
    metadata: {
      date: todayStr,
      todayIncome,
      todayExpense,
      netBalanceChange,
      pendingCollections,
      txCount: todayTransactions.length,
    },
  });

  localStorage.setItem(cacheKey, 'true');
}

/**
 * Evaluates and generates Weekly Financial Report.
 * Generates once every 7 days.
 */
export async function evaluateWeeklyReport(
  userId: string,
  transactions: Transaction[],
  settings?: NotificationSettings
): Promise<void> {
  if (!userId || !transactions || transactions.length === 0) return;
  if (settings && !settings.weeklyReport) return;

  const now = Date.now();
  const lastWeeklyRun = localStorage.getItem(`smart_ledger_last_weekly_report_${userId}`);
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  if (lastWeeklyRun && now - Number(lastWeeklyRun) < SEVEN_DAYS_MS) {
    return; // Generated less than 7 days ago
  }

  const sevenDaysAgoDate = new Date(now - SEVEN_DAYS_MS);
  const recentTransactions = transactions.filter((t) => {
    const txDate = new Date((t as any).date || (t as any).dueDate || 0);
    return txDate >= sevenDaysAgoDate;
  });

  if (recentTransactions.length === 0) return;

  let totalIncome = 0;
  let totalExpense = 0;
  let highestTxAmount = 0;
  let highestTxName = '';
  const categoryMap: Record<string, number> = {};

  recentTransactions.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'received') {
      totalIncome += amt;
    } else if (t.type === 'sent') {
      totalExpense += amt;
      const cat = (t as any).purpose || 'General';
      categoryMap[cat] = (categoryMap[cat] || 0) + amt;
    }

    if (amt > highestTxAmount) {
      highestTxAmount = amt;
      highestTxName = t.personName || (t as any).purpose || 'Transaction';
    }
  });

  let topCategory = 'None';
  let topCategoryAmt = 0;
  Object.entries(categoryMap).forEach(([cat, amt]) => {
    if (amt > topCategoryAmt) {
      topCategory = cat;
      topCategoryAmt = amt;
    }
  });

  const netSavings = totalIncome - totalExpense;
  const todayStr = getTodayString();
  const eventKey = `weekly_report_${userId}_${todayStr}`;

  const message = `7-Day Summary: Total Income ${formatCurrency(totalIncome)}, Expenses ${formatCurrency(totalExpense)}, Net Savings ${formatCurrency(netSavings)}. Top Spending: ${topCategory} (${formatCurrency(topCategoryAmt)}). Highest: ${formatCurrency(highestTxAmount)} (${highestTxName}).`;

  await createNotification({
    userId,
    type: 'weekly_report',
    category: 'finance',
    priority: 'medium',
    title: `Weekly Financial Report • Past 7 Days`,
    message,
    actionUrl: '/reports',
    actionLabel: 'View Full Reports',
    eventKey,
    metadata: {
      totalIncome,
      totalExpense,
      netSavings,
      topCategory,
      topCategoryAmt,
      highestTxAmount,
      highestTxName,
    },
  });

  localStorage.setItem(`smart_ledger_last_weekly_report_${userId}`, now.toString());
}

/**
 * Dispatcher for Security Events.
 */
export async function notifySecurityEvent(params: {
  userId: string;
  type: 
    | 'security_new_device'
    | 'security_pin_changed'
    | 'security_password_changed'
    | 'security_backup_restored'
    | 'security_sync_disabled'
    | 'security_failed_login'
    | 'security_session_expired';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const settings = await getNotificationSettings(params.userId);
  if (!settings.securityAlerts) return;

  await createNotification({
    userId: params.userId,
    type: params.type,
    category: 'security',
    priority: 'high',
    title: params.title,
    message: params.message,
    actionUrl: '/security',
    actionLabel: 'Security Center',
    metadata: params.metadata,
  });
}

/**
 * Dispatches Backup Notifications (Success or Failure).
 */
export async function notifyBackupEvent(params: {
  userId: string;
  success: boolean;
  sizeBytes?: number;
  version?: string;
  backupId?: string;
  errorMessage?: string;
}): Promise<void> {
  const settings = await getNotificationSettings(params.userId);
  if (!settings.backupAlerts) return;

  if (params.success) {
    const formattedSize = params.sizeBytes 
      ? params.sizeBytes < 1024 * 1024 
        ? `${(params.sizeBytes / 1024).toFixed(1)} KB` 
        : `${(params.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : 'Verified';

    await createNotification({
      userId: params.userId,
      type: 'backup_success',
      category: 'backup',
      priority: 'medium',
      title: 'Backup Completed Successfully',
      message: `Cloud snapshot verified and encrypted (${formattedSize}, ${params.version || 'v2.4.0'}) at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      actionUrl: '/backup',
      actionLabel: 'View Vault',
      referenceId: params.backupId,
      metadata: {
        backupId: params.backupId,
        sizeBytes: params.sizeBytes,
        version: params.version,
      },
    });
  } else {
    await createNotification({
      userId: params.userId,
      type: 'backup_failed',
      category: 'backup',
      priority: 'high',
      title: 'Cloud Backup Failed',
      message: params.errorMessage || 'Unable to store encrypted snapshot in Cloud Storage. Please check connection and retry.',
      actionUrl: '/backup',
      actionLabel: 'Retry Backup',
      metadata: {
        error: params.errorMessage,
      },
    });
  }
}
