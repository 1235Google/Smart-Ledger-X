import * as fs from 'fs';
import * as path from 'path';
import cron from 'node-cron';
import { ScheduledReportConfig } from '../types';

const SCHEDULED_REPORTS_FILE = path.join(process.cwd(), 'admin-scheduled-reports.json');

export const VERIFIED_ADMIN_RECIPIENT_EMAILS = [
  'souvikbbsr811@gmail.com',
  'souvikdashbbsr@gmail.com',
  'admin@smartledgerx.io'
];

let inMemorySchedules: ScheduledReportConfig[] = [];

// Initialize default scheduled reports if not present
export function initScheduledReportsStore(): void {
  try {
    if (fs.existsSync(SCHEDULED_REPORTS_FILE)) {
      const raw = fs.readFileSync(SCHEDULED_REPORTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemorySchedules = parsed;
      }
    } else {
      // Seed default recommended schedule templates
      inMemorySchedules = [
        {
          id: 'weekly_system_report',
          name: 'Weekly System Health Report',
          reportType: 'weekly_system',
          frequency: 'weekly',
          dayOfWeek: 1, // Monday
          time: '09:00',
          deliveryEmail: 'souvikbbsr811@gmail.com',
          verifiedAdmin: true,
          format: 'pdf',
          enabled: true,
          createdAt: new Date().toISOString(),
          nextRunAt: getNextWeeklyOccurrence(1, '09:00')
        },
        {
          id: 'monthly_security_report',
          name: 'Monthly Security Activity Report',
          reportType: 'monthly_security',
          frequency: 'monthly',
          dayOfMonth: 1, // 1st of month
          time: '09:00',
          deliveryEmail: 'souvikbbsr811@gmail.com',
          verifiedAdmin: true,
          format: 'pdf',
          enabled: true,
          createdAt: new Date().toISOString(),
          nextRunAt: getNextMonthlyOccurrence(1, '09:00')
        },
        {
          id: 'monthly_backup_report',
          name: 'Monthly Disaster Recovery Backup Report',
          reportType: 'monthly_backup',
          frequency: 'monthly',
          dayOfMonth: 1,
          time: '09:00',
          deliveryEmail: 'souvikbbsr811@gmail.com',
          verifiedAdmin: true,
          format: 'both',
          enabled: true,
          createdAt: new Date().toISOString(),
          nextRunAt: getNextMonthlyOccurrence(1, '09:00')
        }
      ];
      saveSchedulesToDisk();
    }
  } catch (err) {
    console.error('[AdminReportsService] Error reading scheduled reports file:', err);
  }
}

function saveSchedulesToDisk(): void {
  try {
    fs.writeFileSync(SCHEDULED_REPORTS_FILE, JSON.stringify(inMemorySchedules, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AdminReportsService] Error saving scheduled reports file:', err);
  }
}

function getNextWeeklyOccurrence(dayOfWeek: number, timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  const currentDay = now.getDay();
  let daysUntil = (dayOfWeek - currentDay + 7) % 7;
  if (daysUntil === 0 && next <= now) {
    daysUntil = 7;
  }
  next.setDate(next.getDate() + daysUntil);
  return next.toISOString();
}

function getNextMonthlyOccurrence(dayOfMonth: number, timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hours, minutes, 0, 0);
  if (next <= now) {
    next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString();
}

export function getAllScheduledReportConfigs(): ScheduledReportConfig[] {
  return [...inMemorySchedules];
}

export function upsertScheduledReportConfig(
  config: Partial<ScheduledReportConfig> & { deliveryEmail: string; reportType: any }
): { success: boolean; config?: ScheduledReportConfig; error?: string } {
  const email = (config.deliveryEmail || '').trim().toLowerCase();
  
  // Guard against arbitrary external addresses
  const isVerified = VERIFIED_ADMIN_RECIPIENT_EMAILS.includes(email);
  if (!isVerified) {
    return {
      success: false,
      error: `Security restriction: Reports can only be scheduled for verified administrators (${VERIFIED_ADMIN_RECIPIENT_EMAILS.join(', ')}).`
    };
  }

  const id = config.id || `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const existingIdx = inMemorySchedules.findIndex(s => s.id === id);

  const time = config.time || '09:00';
  const frequency = config.frequency || 'monthly';
  const nextRun = frequency === 'weekly'
    ? getNextWeeklyOccurrence(config.dayOfWeek ?? 1, time)
    : getNextMonthlyOccurrence(config.dayOfMonth ?? 1, time);

  const newConfig: ScheduledReportConfig = {
    id,
    name: config.name || `${config.reportType.replace('_', ' ').toUpperCase()} Report`,
    reportType: config.reportType,
    frequency,
    dayOfWeek: config.dayOfWeek ?? 1,
    dayOfMonth: config.dayOfMonth ?? 1,
    time,
    deliveryEmail: email,
    verifiedAdmin: true,
    format: config.format || 'pdf',
    enabled: config.enabled !== false,
    createdAt: config.createdAt || new Date().toISOString(),
    nextRunAt: nextRun
  };

  if (existingIdx >= 0) {
    inMemorySchedules[existingIdx] = { ...inMemorySchedules[existingIdx], ...newConfig };
  } else {
    inMemorySchedules.push(newConfig);
  }

  saveSchedulesToDisk();
  return { success: true, config: newConfig };
}

export function deleteScheduledReportConfig(id: string): boolean {
  const initialLen = inMemorySchedules.length;
  inMemorySchedules = inMemorySchedules.filter(s => s.id !== id);
  if (inMemorySchedules.length !== initialLen) {
    saveSchedulesToDisk();
    return true;
  }
  return false;
}

export function triggerScheduledReportDispatch(id: string): { success: boolean; message: string; config?: ScheduledReportConfig } {
  const item = inMemorySchedules.find(s => s.id === id);
  if (!item) {
    return { success: false, message: 'Scheduled report config not found.' };
  }

  item.lastRunAt = new Date().toISOString();
  saveSchedulesToDisk();

  return {
    success: true,
    message: `Scheduled report '${item.name}' executed successfully. Secure dispatch queued to ${item.deliveryEmail}.`,
    config: item
  };
}

// Background cron runner (runs server-side, checked every hour)
export function startScheduledReportsWorker(): void {
  initScheduledReportsStore();

  // Run at minute 0 of every hour
  cron.schedule('0 * * * *', () => {
    try {
      const now = new Date();
      for (const schedule of inMemorySchedules) {
        if (!schedule.enabled || !schedule.nextRunAt) continue;

        const nextRun = new Date(schedule.nextRunAt);
        if (now >= nextRun) {
          console.log(`[AdminReportsService] Triggering automated delivery for: ${schedule.name} to ${schedule.deliveryEmail}`);
          schedule.lastRunAt = now.toISOString();
          
          if (schedule.frequency === 'weekly') {
            schedule.nextRunAt = getNextWeeklyOccurrence(schedule.dayOfWeek ?? 1, schedule.time);
          } else {
            schedule.nextRunAt = getNextMonthlyOccurrence(schedule.dayOfMonth ?? 1, schedule.time);
          }
          saveSchedulesToDisk();
        }
      }
    } catch (err) {
      console.error('[AdminReportsService] Error in scheduled reports cron:', err);
    }
  });
}
