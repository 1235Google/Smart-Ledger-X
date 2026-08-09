import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { PendingMoney } from "../types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatName(name: string | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string | undefined, timezone: string = 'Asia/Kolkata') {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  }).format(date);
}

export function formatDateTime(dateString: string | undefined, timezone: string = 'Asia/Kolkata') {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    timeZone: timezone,
  }).format(date);
}

export function getTodayString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getDaysDiff(dateStr: string) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(dateStr);
  target.setHours(0,0,0,0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export interface ReminderDetails {
  remindersSent: number;
  totalReminders: number;
  nextReminderDate: string | null;
  nextReminderDisplay: string;
  lastSentDisplay?: string;
  isStopped: boolean;
}

export function calculateReminderDetails(tx: PendingMoney, timezone: string = 'Asia/Kolkata'): ReminderDetails {
  const todayStr = getTodayString();
  const today = new Date(todayStr);
  today.setHours(0, 0, 0, 0);

  const dueDateStr = tx.dueDate || todayStr;
  const frequency = tx.reminderFrequency || 'once';
  const status = tx.status || 'pending';
  const reminderStatus = tx.reminderStatus || 'active';

  const isStopped = 
    status === 'completed' || 
    status === 'cancelled' || 
    status === 'closed' || 
    reminderStatus === 'paused';

  const totalReminders = frequency === 'once' ? 1 : 5;

  if (isStopped) {
    let sent = 0;
    let curr = new Date(dueDateStr);
    curr.setHours(0, 0, 0, 0);
    for (let i = 0; i < totalReminders; i++) {
      if (curr <= today) {
        sent++;
      }
      curr = addInterval(curr, frequency);
    }
    const sentCount = Math.min(sent, totalReminders);
    return {
      remindersSent: sentCount,
      totalReminders,
      nextReminderDate: null,
      nextReminderDisplay: '',
      lastSentDisplay: sentCount > 0 ? 'Sent' : 'None',
      isStopped: true,
    };
  }

  let scheduledDates: string[] = [];
  let curr = new Date(dueDateStr);
  curr.setHours(0, 0, 0, 0);

  for (let i = 0; i < totalReminders; i++) {
    scheduledDates.push(curr.toISOString().split('T')[0]);
    curr = addInterval(curr, frequency);
  }

  let remindersSent = 0;
  let nextReminderDate: string | null = null;

  for (let i = 0; i < scheduledDates.length; i++) {
    const dStr = scheduledDates[i];
    const dDate = new Date(dStr);
    dDate.setHours(0, 0, 0, 0);

    if (dDate <= today) {
      remindersSent++;
    } else {
      if (!nextReminderDate) {
        nextReminderDate = dStr;
      }
    }
  }

  if (frequency === 'once') {
    const dueTime = new Date(dueDateStr).setHours(0,0,0,0);
    if (dueTime <= today.getTime()) {
      remindersSent = 1;
      nextReminderDate = null;
    } else {
      remindersSent = 0;
      nextReminderDate = dueDateStr;
    }
  } else {
    if (remindersSent >= totalReminders) {
      remindersSent = totalReminders;
      nextReminderDate = null;
    } else if (!nextReminderDate) {
      const futureDate = scheduledDates.find(d => new Date(d).setHours(0,0,0,0) > today.getTime());
      nextReminderDate = futureDate || null;
    }
  }

  let nextReminderDisplay = 'N/A';
  if (nextReminderDate) {
    const nextDiff = getDaysDiff(nextReminderDate);
    if (nextDiff === 0 || nextReminderDate === todayStr) {
      nextReminderDisplay = 'Today';
    } else {
      nextReminderDisplay = formatDate(nextReminderDate, timezone);
    }
  }

  return {
    remindersSent,
    totalReminders,
    nextReminderDate,
    nextReminderDisplay,
    lastSentDisplay: remindersSent > 0 ? 'Sent' : 'None',
    isStopped: false,
  };
}

function addInterval(date: Date, frequency: string): Date {
  const d = new Date(date);
  if (frequency === '3days') {
    d.setDate(d.getDate() + 3);
  } else if (frequency === '7days') {
    d.setDate(d.getDate() + 7);
  } else if (frequency === '15days') {
    d.setDate(d.getDate() + 15);
  } else if (frequency === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export const DEFAULT_CARD_REMINDER_TEMPLATE = `Hi {{customerName}},
Just a friendly reminder that ₹{{amount}} is pending.
Please complete the payment at your earliest convenience.
Thank you!`;

export const DEFAULT_REMINDER_TEMPLATE = `🔔 PAYMENT REMINDER

Hello {CustomerName},

This is a friendly reminder that your pending balance is:

💰 Amount Due: ₹{AmountDue}
📅 Due Date: {DueDate}
⏰ Overdue: {OverdueDays} Days

Please complete the payment at your earliest convenience.

If you have already made the payment, kindly ignore this message.

Thank you.

— SmartLedger`;

export function formatReminderMessage(
  template: string,
  tx: PendingMoney,
  timezone: string = 'Asia/Kolkata',
  totalDueOverride?: number
): string {
  const daysDiff = getDaysDiff(tx.dueDate);
  const isOverdue = daysDiff < 0;
  const overdueDays = isOverdue ? Math.abs(daysDiff) : 0;
  const totalAmount = totalDueOverride !== undefined ? totalDueOverride : tx.amount;

  const formattedCustomerName = formatName(tx.personName);

  return template
    .replace(/\{\{customerName\}\}/gi, formattedCustomerName)
    .replace(/\{CustomerName\}/gi, formattedCustomerName)
    .replace(/\{\{amount\}\}/gi, totalAmount.toLocaleString('en-IN'))
    .replace(/\{AmountDue\}/gi, totalAmount.toLocaleString('en-IN'))
    .replace(/\{Amount\}/gi, totalAmount.toLocaleString('en-IN'))
    .replace(/\{\{dueDate\}\}/gi, formatDate(tx.dueDate, timezone))
    .replace(/\{DueDate\}/gi, formatDate(tx.dueDate, timezone))
    .replace(/\{\{overdueDays\}\}/gi, overdueDays.toString())
    .replace(/\{OverdueDays\}/gi, overdueDays.toString());
}
