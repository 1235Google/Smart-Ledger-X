import { 
  Transaction, 
  Customer, 
  GullakEntry, 
  BackupMetadata, 
  AdminSecurityLog, 
  ScheduledJob, 
  ScheduledJobRun, 
  ScheduledJobsSummary,
  AdminReportDatePreset,
  HealthSeverity,
  ScoreDeduction,
  SystemHealthReportData,
  BackupReportData,
  SecurityReportData,
  DataIntegrityReportData,
  ScheduledJobsReportData,
  AdminActivityReportData,
  DuplicateTransactionCandidate,
  MissingFieldItem,
  InvalidAmountItem,
  BrokenReferenceItem,
  MissingBackupDay
} from '../types';
import { calculateGullakBalance, getGullakSignedAmount } from './gullakAccounting';

// --- Date Range Calculation ---

export interface DateRangeResult {
  startDate: Date;
  endDate: Date;
  label: string;
  startIso: string;
  endIso: string;
  daysDiff: number;
}

export function computeDateRange(
  preset: AdminReportDatePreset, 
  customStart?: string, 
  customEnd?: string
): DateRangeResult {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let label = '';

  switch (preset) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      label = `Today (${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
      break;
    }
    case 'last_7_days': {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      label = 'Last 7 Days';
      break;
    }
    case 'last_30_days': {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      label = 'Last 30 Days';
      break;
    }
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = `This Month (${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
      break;
    }
    case 'prev_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = `Previous Month (${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
      break;
    }
    case 'this_year': {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      label = `This Year (${now.getFullYear()})`;
      break;
    }
    case 'custom': {
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
      }
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date();
      }
      label = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      break;
    }
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      label = 'This Month';
    }
  }

  const daysDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));

  return {
    startDate: start,
    endDate: end,
    label,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    daysDiff
  };
}

export function isDateInRange(dateStr: string | number | Date | undefined | null, range: DateRangeResult): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d >= range.startDate && d <= range.endDate;
}

// --- 1. SYSTEM HEALTH REPORT ENGINE ---

export function computeSystemHealthReport(params: {
  dbConnected: boolean;
  dbLatencyMs: number;
  backups: BackupMetadata[];
  jobs: ScheduledJob[];
  jobsSummary?: ScheduledJobsSummary;
  securityLogs: AdminSecurityLog[];
  integrityReport: DataIntegrityReportData;
  activeAdminsCount?: number;
}): SystemHealthReportData {
  const {
    dbConnected,
    dbLatencyMs,
    backups,
    jobs,
    jobsSummary,
    securityLogs,
    integrityReport,
    activeAdminsCount = 1
  } = params;

  let score = 100;
  const breakdown: ScoreDeduction[] = [];
  let warningsCount = 0;
  let criticalIssuesCount = 0;

  // 1. Database & Firestore Connectivity Check
  let firestoreStatus: HealthSeverity = 'healthy';
  let firestoreMsg = `Firestore connected (Latency: ${dbLatencyMs}ms).`;
  if (!dbConnected) {
    firestoreStatus = 'problem';
    firestoreMsg = 'Database connection failure detected.';
    score -= 30;
    criticalIssuesCount++;
    breakdown.push({
      reason: 'Database connection offline',
      deduction: 30,
      severity: 'problem',
      category: 'Firestore'
    });
  } else if (dbLatencyMs > 600) {
    firestoreStatus = 'warning';
    firestoreMsg = `High latency detected (${dbLatencyMs}ms).`;
    score -= 10;
    warningsCount++;
    breakdown.push({
      reason: `High database response latency (${dbLatencyMs}ms > 600ms)`,
      deduction: 10,
      severity: 'warning',
      category: 'Firestore'
    });
  }

  // 2. Backup System Health Check
  let backupStatus: HealthSeverity = 'healthy';
  let backupMsg = 'Recent verified disaster recovery backup available.';
  let lastBackupTime: string | null = null;
  let hoursAgo: number | null = null;

  const validBackups = backups.filter(b => b.status === 'verified' || !b.status || (b.status as string) === 'completed');
  if (validBackups.length > 0) {
    const sorted = [...validBackups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    lastBackupTime = sorted[0].createdAt;
    const diffMs = Date.now() - new Date(lastBackupTime).getTime();
    hoursAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

    if (hoursAgo > 48) {
      backupStatus = 'problem';
      backupMsg = `Critical: Last backup was ${hoursAgo} hours ago (>48h SLA).`;
      score -= 20;
      criticalIssuesCount++;
      breakdown.push({
        reason: `Backup overdue: Last snapshot is ${hoursAgo}h old (>48h SLA)`,
        deduction: 20,
        severity: 'problem',
        category: 'Backup'
      });
    } else if (hoursAgo > 24) {
      backupStatus = 'warning';
      backupMsg = `Warning: Last backup was ${hoursAgo} hours ago (>24h).`;
      score -= 10;
      warningsCount++;
      breakdown.push({
        reason: `Backup warning: Last snapshot is ${hoursAgo}h old (>24h)`,
        deduction: 10,
        severity: 'warning',
        category: 'Backup'
      });
    } else {
      backupMsg = `Up to date (Snapshot taken ${hoursAgo === 0 ? 'just recently' : `${hoursAgo}h ago`}).`;
    }
  } else {
    backupStatus = 'problem';
    backupMsg = 'No disaster recovery backups found in system index.';
    score -= 25;
    criticalIssuesCount++;
    breakdown.push({
      reason: 'No disaster recovery snapshots recorded in system',
      deduction: 25,
      severity: 'problem',
      category: 'Backup'
    });
  }

  // 3. Scheduled Jobs Health Check
  let scheduledStatus: HealthSeverity = 'healthy';
  const healthyCount = jobs.filter(j => j.status === 'HEALTHY' || j.status === 'RUNNING').length;
  const delayedCount = jobs.filter(j => j.status === 'DELAYED' || j.status === 'CRITICAL_DELAY').length;
  const failedCount = jobs.filter(j => j.status === 'FAILED').length;

  if (failedCount > 0) {
    scheduledStatus = 'problem';
    const ded = Math.min(30, failedCount * 15);
    score -= ded;
    criticalIssuesCount += failedCount;
    breakdown.push({
      reason: `${failedCount} scheduled background job(s) in failed state`,
      deduction: ded,
      severity: 'problem',
      category: 'Scheduled Jobs'
    });
  } else if (delayedCount > 0) {
    scheduledStatus = 'warning';
    const ded = Math.min(20, delayedCount * 10);
    score -= ded;
    warningsCount += delayedCount;
    breakdown.push({
      reason: `${delayedCount} scheduled background job(s) delayed past execution schedule`,
      deduction: ded,
      severity: 'warning',
      category: 'Scheduled Jobs'
    });
  }

  const jobMsg = failedCount > 0 
    ? `${failedCount} job(s) failed execution` 
    : delayedCount > 0 
    ? `${delayedCount} job(s) delayed execution` 
    : `${jobs.length} registered background job(s) running normally`;

  // 4. Data Integrity Warnings Check
  let integrityStatus: HealthSeverity = 'healthy';
  let integrityDiscrepancies = 0;

  if (!integrityReport.mainLedger.isBalanced) {
    integrityStatus = 'problem';
    score -= 15;
    criticalIssuesCount++;
    integrityDiscrepancies++;
    breakdown.push({
      reason: `Main ledger balance mismatch (₹${Math.abs(integrityReport.mainLedger.discrepancyAmount).toLocaleString()} variance)`,
      deduction: 15,
      severity: 'problem',
      category: 'Data Integrity'
    });
  }

  if (!integrityReport.gullak.isBalanced) {
    integrityStatus = 'problem';
    score -= 15;
    criticalIssuesCount++;
    integrityDiscrepancies++;
    breakdown.push({
      reason: `Gullak vault balance mismatch (₹${Math.abs(integrityReport.gullak.discrepancyAmount).toLocaleString()} variance)`,
      deduction: 15,
      severity: 'problem',
      category: 'Data Integrity'
    });
  }

  if (integrityReport.duplicates.length > 0) {
    if (integrityStatus !== 'problem') integrityStatus = 'warning';
    const ded = Math.min(10, integrityReport.duplicates.length * 5);
    score -= ded;
    warningsCount += integrityReport.duplicates.length;
    breakdown.push({
      reason: `${integrityReport.duplicates.length} potential duplicate transaction candidate(s)`,
      deduction: ded,
      severity: 'warning',
      category: 'Data Integrity'
    });
  }

  if (integrityReport.invalidAmounts.length > 0 || integrityReport.missingRequiredFields.length > 0) {
    if (integrityStatus !== 'problem') integrityStatus = 'warning';
    const ded = 5;
    score -= ded;
    warningsCount++;
    breakdown.push({
      reason: 'Missing required transaction fields or invalid amount entries detected',
      deduction: ded,
      severity: 'warning',
      category: 'Data Integrity'
    });
  }

  const integrityMsg = integrityDiscrepancies > 0 
    ? `${integrityDiscrepancies} ledger reconciliation discrepancy detected`
    : integrityReport.duplicates.length > 0
    ? `${integrityReport.duplicates.length} duplicate transaction candidate(s) flagged`
    : 'All double-entry equations and vault records balanced';

  // 5. Admin Security & Unauthorized Attempts Check
  let securityStatus: HealthSeverity = 'healthy';
  const unauthorizedAttempts = securityLogs.filter(
    l => l.action === 'LOGIN_DENIED_UNAUTHORIZED' || l.authorizationResult === 'denied'
  );

  if (unauthorizedAttempts.length > 0) {
    securityStatus = 'warning';
    const ded = Math.min(20, unauthorizedAttempts.length * 10);
    score -= ded;
    warningsCount += unauthorizedAttempts.length;
    breakdown.push({
      reason: `${unauthorizedAttempts.length} unauthorized admin access attempt(s) detected`,
      deduction: ded,
      severity: 'warning',
      category: 'Security'
    });
  }

  const securityMsg = unauthorizedAttempts.length > 0
    ? `${unauthorizedAttempts.length} unauthorized attempt(s) blocked`
    : 'Zero unauthorized access attempts. Sessions authenticated';

  // Score clamping
  score = Math.max(0, Math.min(100, score));

  // Overall Status
  let overallStatus: HealthSeverity = 'healthy';
  if (score < 70 || criticalIssuesCount > 0) {
    overallStatus = 'problem';
  } else if (score < 90 || warningsCount > 0) {
    overallStatus = 'warning';
  }

  const formulaDescription = 
    'Deterministic Score: Base 100 - [Database latency/outage deductions (max 30)] - ' +
    '[Backup recency SLA deductions (max 25)] - [Failed/delayed jobs (max 30)] - ' +
    '[Ledger/Gullak reconciliation discrepancies (max 30)] - [Duplicates/Field anomalies (max 15)] - ' +
    '[Unauthorized admin attempts (max 20)]. Floor at 0.';

  return {
    status: overallStatus,
    score,
    maxScore: 100,
    formulaDescription,
    scoreBreakdown: breakdown,
    components: {
      firestore: { status: firestoreStatus, latencyMs: dbLatencyMs, message: firestoreMsg },
      auth: { status: 'healthy', message: `${activeAdminsCount} active admin profile(s) enrolled with RBAC enforcement`, activeAdminsCount },
      backup: { status: backupStatus, message: backupMsg, lastBackupTime, hoursAgo },
      scheduledJobs: { status: scheduledStatus, message: jobMsg, healthyCount, delayedCount, failedCount },
      dataIntegrity: { status: integrityStatus, message: integrityMsg, discrepancyCount: integrityDiscrepancies },
      adminSecurity: { status: securityStatus, message: securityMsg, unauthorizedAttemptsCount: unauthorizedAttempts.length }
    },
    warningsCount,
    criticalIssuesCount,
    generatedAt: new Date().toISOString()
  };
}

// --- 2. BACKUP REPORT ENGINE ---

export function computeBackupReport(
  backups: BackupMetadata[], 
  range: DateRangeResult
): BackupReportData {
  const filtered = backups.filter(b => isDateInRange(b.createdAt, range));

  let successful = 0;
  let failed = 0;
  let scheduled = 0;
  let manual = 0;
  let totalBytes = 0;
  let totalDuration = 0;
  let durationCount = 0;

  const records = filtered.map(b => {
    const isSuccess = b.status === 'verified' || (b.status as string) === 'completed' || !b.status;
    if (isSuccess) successful++;
    else failed++;

    const isSched = (b.type as string) === 'automatic' || (b.type as string) === 'scheduled' || (b.type as string) === 'daily';
    if (isSched) scheduled++;
    else manual++;

    const size = b.size || b.fileSize || 0;
    totalBytes += size;

    if (b.durationMs && b.durationMs > 0) {
      totalDuration += b.durationMs;
      durationCount++;
    }

    return {
      id: b.id || b.backupId || 'snapshot',
      createdAt: b.createdAt,
      name: b.name || 'Disaster Recovery Snapshot',
      type: (b.type as string) || 'manual',
      status: isSuccess ? 'verified' : 'failed',
      sizeBytes: size,
      formattedSize: formatByteSize(size),
      durationMs: b.durationMs || 0,
      sha256: (b as any).sha256 || (b as any).checksum,
      recordsCount: (b as any).recordsCount
    };
  });

  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  let lastSuccess: BackupReportData['lastSuccessfulBackup'] = null;
  const latestVerified = records.find(r => r.status === 'verified');
  if (latestVerified) {
    const d = new Date(latestVerified.createdAt);
    lastSuccess = {
      id: latestVerified.id,
      createdAt: latestVerified.createdAt,
      formattedTime: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sizeBytes: latestVerified.sizeBytes,
      formattedSize: latestVerified.formattedSize,
      type: latestVerified.type
    };
  }

  const successRate = records.length > 0 ? Math.round((successful / records.length) * 100) : 100;
  const avgSize = records.length > 0 ? Math.round(totalBytes / records.length) : 0;
  const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

  // Identify missing expected backup days (checks each calendar day in the range)
  const missingDays: MissingBackupDay[] = [];
  const startDay = new Date(range.startDate);
  startDay.setHours(0, 0, 0, 0);

  const endDay = new Date(Math.min(range.endDate.getTime(), Date.now()));
  endDay.setHours(0, 0, 0, 0);

  const cur = new Date(startDay);
  while (cur <= endDay) {
    const dayStr = cur.toISOString().split('T')[0];
    const hasBackupOnDay = records.some(r => r.createdAt.startsWith(dayStr) && r.status === 'verified');
    if (!hasBackupOnDay) {
      missingDays.push({
        dateString: dayStr,
        formattedDate: cur.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    cur.setDate(cur.getDate() + 1);
  }

  return {
    totalBackupsInRange: records.length,
    successfulBackups: successful,
    failedBackups: failed,
    successRate,
    lastSuccessfulBackup: lastSuccess,
    totalSizeBytes: totalBytes,
    formattedTotalSize: formatByteSize(totalBytes),
    averageSizeBytes: avgSize,
    formattedAverageSize: formatByteSize(avgSize),
    scheduledCount: scheduled,
    manualCount: manual,
    averageDurationMs: avgDuration,
    missingExpectedBackupDays: missingDays,
    records
  };
}

// --- 3. SECURITY ACTIVITY REPORT ENGINE ---

export function computeSecurityReport(
  logs: AdminSecurityLog[], 
  range: DateRangeResult
): SecurityReportData {
  const filtered = logs.filter(l => isDateInRange(l.timestamp, range));

  let successfulLogins = 0;
  let failedAttempts = 0;
  let newDevices = 0;
  let unauthorizedAttempts = 0;
  let sessionEvents = 0;

  const ipSet = new Set<string>();
  const userSet = new Set<string>();
  const geoMap = new Map<string, number>();
  const devMap = new Map<string, number>();

  const sanitizedEvents: AdminSecurityLog[] = filtered.map(log => {
    const act = log.action || log.eventType;
    if (act === 'LOGIN_SUCCESS' || act === 'GOOGLE_LOGIN' || act === 'PASSWORD_LOGIN' || act === 'ADMIN_LOGIN') {
      successfulLogins++;
    } else if (act === 'LOGIN_FAILED') {
      failedAttempts++;
    } else if (act === 'LOGIN_DENIED_UNAUTHORIZED' || log.authorizationResult === 'denied') {
      unauthorizedAttempts++;
    } else if (act === 'NEW_DEVICE_DETECTED' || log.newDevice) {
      newDevices++;
    } else if (act === 'LOGOUT' || act === 'SESSION_REVOKED') {
      sessionEvents++;
    }

    if (log.ip) ipSet.add(log.ip);
    if (log.email) userSet.add(log.email);

    // Geo aggregation
    const locStr = log.location ? `${log.location.city ? log.location.city + ', ' : ''}${log.location.country || 'Unknown'}` : 'Local Network';
    geoMap.set(locStr, (geoMap.get(locStr) || 0) + 1);

    // Device aggregation
    const devCat = log.deviceInfo?.category || log.device || 'Desktop';
    devMap.set(devCat, (devMap.get(devCat) || 0) + 1);

    // Strict sanitization: ensure no tokens, hashes or passwords leak
    return {
      id: log.id,
      email: log.email || 'anonymous',
      uid: log.uid || 'user',
      ip: log.ip || 'Client IP',
      device: log.device || 'Unknown',
      browser: log.browser || 'Unknown',
      timestamp: log.timestamp,
      action: act,
      details: log.details || '',
      location: log.location,
      deviceInfo: log.deviceInfo,
      newDevice: log.newDevice,
      authorizationResult: log.authorizationResult
    };
  });

  sanitizedEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const geoDistribution = Array.from(geoMap.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const deviceDistribution = Array.from(devMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return {
    successfulLogins,
    failedAttempts,
    newUnrecognizedDevices: newDevices,
    unauthorizedAdminAttempts: unauthorizedAttempts,
    sessionEvents,
    totalEvents: sanitizedEvents.length,
    uniqueIpsCount: ipSet.size,
    uniqueUsersCount: userSet.size,
    geoDistribution,
    deviceDistribution,
    events: sanitizedEvents
  };
}

// --- 4. DATA INTEGRITY REPORT ENGINE ---

export function computeDataIntegrityReport(params: {
  transactions: Transaction[];
  customers: Customer[];
  gullakEntries: GullakEntry[];
  storedCurrentBalance: number;
  storedGullakBalance?: number;
  range?: DateRangeResult;
}): DataIntegrityReportData {
  const { transactions, customers, gullakEntries, storedCurrentBalance, storedGullakBalance } = params;

  let totalDiscrepancies = 0;

  // 1. Main Ledger Reconciliation
  let inflows = 0;
  let outflows = 0;
  let pending = 0;

  const validTransactions = transactions.filter(tx => tx && typeof tx === 'object');

  validTransactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    const type = String(tx.type || '').toLowerCase();

    if (type === 'received' || type === 'income') {
      inflows += amt;
    } else if (type === 'sent' || type === 'expense') {
      outflows += amt;
    } else if (type === 'pending') {
      pending += amt;
    }
  });

  const calculatedMainBalance = inflows - outflows;
  const mainDifference = Math.round((calculatedMainBalance - storedCurrentBalance) * 100) / 100;
  const isMainBalanced = Math.abs(mainDifference) < 0.01;

  if (!isMainBalanced) totalDiscrepancies++;

  // 2. Gullak Vault Reconciliation
  let gullakCredits = 0;
  let gullakDebits = 0;

  (gullakEntries || []).forEach(entry => {
    const signed = getGullakSignedAmount(entry);
    if (signed >= 0) gullakCredits += signed;
    else gullakDebits += Math.abs(signed);
  });

  const calculatedGullak = calculateGullakBalance(gullakEntries || []);
  const actualStoredGullak = typeof storedGullakBalance === 'number' ? storedGullakBalance : calculatedGullak;
  const gullakDifference = Math.round((calculatedGullak - actualStoredGullak) * 100) / 100;
  const isGullakBalanced = Math.abs(gullakDifference) < 0.01;

  if (!isGullakBalanced) totalDiscrepancies++;

  // 3. Duplicate Transaction Candidate Detection
  // Group by (same day + same amount + same person/customer name)
  const duplicates: DuplicateTransactionCandidate[] = [];
  const seenMap = new Map<string, Transaction>();

  validTransactions.forEach((tx: any) => {
    const amt = Number(tx.amount);
    const dateStr = (tx.date || tx.createdAt || tx.dueDate || '').split('T')[0];
    const person = (tx.personName || tx.customerName || tx.name || '').trim().toLowerCase();

    if (!dateStr || isNaN(amt) || amt <= 0) return;

    const signatureKey = `${dateStr}_${amt}_${person}`;
    if (seenMap.has(signatureKey)) {
      const match = seenMap.get(signatureKey)!;
      duplicates.push({
        id: tx.id,
        matchId: match.id,
        amount: amt,
        date: dateStr,
        personName: tx.personName || 'Unspecified',
        type: tx.type || 'transaction',
        reason: `Identical amount (₹${amt}) & person on ${dateStr} matches transaction #${match.id.slice(-6)}`
      });
    } else {
      seenMap.set(signatureKey, tx);
    }
  });

  // 4. Missing Required Fields Detection
  const missingRequiredFields: MissingFieldItem[] = [];
  validTransactions.forEach((tx: any) => {
    const missing: string[] = [];
    if (tx.amount == null || isNaN(Number(tx.amount))) missing.push('amount');
    if (!tx.date && !tx.createdAt && !tx.dueDate) missing.push('date');
    if (!tx.personName && !tx.customerName && !tx.category) missing.push('recipient/category');

    if (missing.length > 0) {
      missingRequiredFields.push({
        id: tx.id,
        date: tx.date || tx.createdAt || tx.dueDate || 'Missing Date',
        amount: Number(tx.amount) || 0,
        missingField: missing.join(', '),
        description: `Transaction record is missing required field(s): ${missing.join(', ')}`
      });
    }
  });

  // 5. Invalid Amounts Detection
  const invalidAmounts: InvalidAmountItem[] = [];
  validTransactions.forEach((tx: any) => {
    const raw = tx.amount;
    const num = Number(raw);
    const dateStr = tx.date || tx.createdAt || tx.dueDate || 'N/A';
    if (raw == null || isNaN(num)) {
      invalidAmounts.push({
        id: tx.id,
        amount: raw,
        date: dateStr,
        personName: tx.personName || 'N/A',
        issue: 'Non-numerical or NaN amount value'
      });
    } else if (num < 0) {
      invalidAmounts.push({
        id: tx.id,
        amount: raw,
        date: dateStr,
        personName: tx.personName || 'N/A',
        issue: `Negative transaction amount (-₹${Math.abs(num)})`
      });
    } else if (num === 0) {
      invalidAmounts.push({
        id: tx.id,
        amount: raw,
        date: dateStr,
        personName: tx.personName || 'N/A',
        issue: 'Zero value transaction'
      });
    }
  });

  // 6. Broken References
  const customerIdSet = new Set((customers || []).map(c => c.id));
  const brokenReferences: BrokenReferenceItem[] = [];

  validTransactions.forEach((tx: any) => {
    const custId = (tx as any).customerId;
    if (custId && !customerIdSet.has(custId)) {
      brokenReferences.push({
        id: tx.id,
        type: tx.type || 'transaction',
        referenceField: 'customerId',
        referenceId: custId,
        issue: `References deleted or missing Customer ID: ${custId}`
      });
    }
  });

  totalDiscrepancies += duplicates.length + missingRequiredFields.length + invalidAmounts.length + brokenReferences.length;

  let overallStatus: HealthSeverity = 'healthy';
  if (!isMainBalanced || !isGullakBalanced || invalidAmounts.length > 0) {
    overallStatus = 'problem';
  } else if (duplicates.length > 0 || missingRequiredFields.length > 0 || brokenReferences.length > 0) {
    overallStatus = 'warning';
  }

  return {
    overallStatus,
    totalDiscrepancies,
    mainLedger: {
      storedBalance: storedCurrentBalance,
      calculatedBalance: calculatedMainBalance,
      inflows,
      outflows,
      pendingReceivables: pending,
      discrepancyAmount: mainDifference,
      isBalanced: isMainBalanced
    },
    gullak: {
      storedBalance: actualStoredGullak,
      calculatedBalance: calculatedGullak,
      totalCredits: gullakCredits,
      totalDebits: gullakDebits,
      discrepancyAmount: gullakDifference,
      isBalanced: isGullakBalanced,
      entriesCount: (gullakEntries || []).length
    },
    duplicates,
    missingRequiredFields,
    invalidAmounts,
    brokenReferences
  };
}

// --- 5. SCHEDULED JOBS REPORT ENGINE ---

export function computeScheduledJobsReport(
  jobs: ScheduledJob[], 
  runs: ScheduledJobRun[], 
  range: DateRangeResult
): ScheduledJobsReportData {
  const filteredRuns = runs.filter(r => isDateInRange(r.startedAt, range));

  let successCount = 0;
  let failedCount = 0;

  filteredRuns.forEach(r => {
    if (r.status === 'SUCCESS') successCount++;
    else if (r.status === 'FAILED') failedCount++;
  });

  const successRate = filteredRuns.length > 0 ? Math.round((successCount / filteredRuns.length) * 100) : 100;

  const jobSummaries = jobs.map(j => {
    const jobRuns = filteredRuns.filter(r => r.jobId === j.jobId);
    const jSuccess = jobRuns.filter(r => r.status === 'SUCCESS').length;
    const jFailed = jobRuns.filter(r => r.status === 'FAILED').length;
    const totalDuration = jobRuns.reduce((sum, r) => sum + (r.durationMs || 0), 0);
    const avgDuration = jobRuns.length > 0 ? Math.round(totalDuration / jobRuns.length) : (j.estimatedDurationMs || 0);

    const sortedJobRuns = [...jobRuns].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    const lastExecutedAt = sortedJobRuns[0]?.startedAt || j.lastSuccessfulRun?.startedAt || null;

    return {
      jobId: j.jobId,
      jobName: j.jobName,
      scheduleHuman: j.scheduleHuman,
      status: j.status,
      totalRunsInRange: jobRuns.length,
      successRunsInRange: jSuccess,
      failedRunsInRange: jFailed,
      averageDurationMs: avgDuration,
      lastExecutedAt,
      isOverdue: j.isOverdue || false
    };
  });

  let overallHealth: HealthSeverity = 'healthy';
  const hasFailures = failedCount > 0 || jobs.some(j => j.status === 'FAILED');
  const hasDelayed = jobs.some(j => j.status === 'DELAYED' || j.status === 'CRITICAL_DELAY');

  if (hasFailures) overallHealth = 'problem';
  else if (hasDelayed) overallHealth = 'warning';

  return {
    totalJobsConfigured: jobs.length,
    totalExecutionsInRange: filteredRuns.length,
    successExecutionsCount: successCount,
    failedExecutionsCount: failedCount,
    successRate,
    overallHealth,
    jobSummaries,
    recentRuns: filteredRuns.slice(0, 50)
  };
}

// --- 6. ADMIN ACTIVITY REPORT ENGINE ---

export function computeAdminActivityReport(
  securityLogs: AdminSecurityLog[], 
  jobRuns: ScheduledJobRun[], 
  backups: BackupMetadata[], 
  range: DateRangeResult
): AdminActivityReportData {
  const actions: AdminActivityReportData['actions'] = [];

  // Filter security logs that reflect admin actions
  securityLogs.forEach(log => {
    if (!isDateInRange(log.timestamp, range)) return;

    const act = log.action || log.eventType;
    if (
      act === 'LOGIN_SUCCESS' || 
      act === 'ADMIN_LOGIN' || 
      act === 'ADMIN_ADDED' || 
      act === 'ADMIN_ROLE_UPDATED' || 
      act === 'ADMIN_STATUS_CHANGED' || 
      act === 'ADMIN_REMOVED' ||
      act === 'JOB_MANUAL_RUN' ||
      act === 'JOB_RETRY_RUN' ||
      act === 'JOB_CONFIG_TOGGLE' ||
      log.authorizationResult === 'admin'
    ) {
      actions.push({
        id: log.id,
        action: formatActionLabel(act),
        timestamp: log.timestamp,
        adminEmail: log.email || 'Admin',
        ip: log.ip || 'Local',
        device: log.device || 'Desktop',
        result: log.authorizationResult === 'denied' ? 'denied' : 'success',
        details: log.details || `Administrative event: ${act}`
      });
    }
  });

  // Manual job executions initiated by admins
  jobRuns.forEach(run => {
    if (!isDateInRange(run.startedAt, range)) return;
    if ((run as any).triggerType === 'MANUAL_ADMIN' || (run as any).triggerType === 'RETRY_ADMIN') {
      actions.push({
        id: run.runId,
        action: `Manual Run: ${run.jobName}`,
        timestamp: run.startedAt,
        adminEmail: (run as any).triggeredBy || 'Admin',
        ip: 'Server System',
        device: 'Admin Console',
        result: run.status === 'SUCCESS' ? 'success' : 'failed',
        details: `Manually executed background job. Duration: ${((run.durationMs || 0) / 1000).toFixed(2)}s.`
      });
    }
  });

  // Manual backup creations
  backups.forEach(b => {
    if (!isDateInRange(b.createdAt, range)) return;
    if ((b.type as string) === 'manual') {
      actions.push({
        id: b.id || 'backup',
        action: 'Manual Disaster Backup Created',
        timestamp: b.createdAt,
        adminEmail: 'Admin',
        ip: 'Encrypted Cloud Storage',
        device: 'Admin Console',
        result: (b.status === 'verified' || (b.status as string) === 'completed') ? 'success' : 'failed',
        details: `Created manual backup snapshot (${formatByteSize(b.size || b.fileSize || 0)})`
      });
    }
  });

  actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  let modeChangesCount = 0;
  let backupActionsCount = 0;
  let jobTriggersCount = 0;
  let securityConfigCount = 0;

  actions.forEach(a => {
    const act = a.action.toLowerCase();
    if (act.includes('mode')) modeChangesCount++;
    else if (act.includes('backup')) backupActionsCount++;
    else if (act.includes('job') || act.includes('run')) jobTriggersCount++;
    else if (act.includes('admin') || act.includes('role') || act.includes('login')) securityConfigCount++;
  });

  return {
    totalActions: actions.length,
    modeChangesCount,
    backupActionsCount,
    jobTriggersCount,
    securityConfigCount,
    actions
  };
}

function formatActionLabel(act: string): string {
  switch (act) {
    case 'LOGIN_SUCCESS': return 'Admin Authentication Verified';
    case 'ADMIN_LOGIN': return 'Admin Console Sign-in';
    case 'ADMIN_ADDED': return 'New Administrator Enrolled';
    case 'ADMIN_ROLE_UPDATED': return 'Admin RBAC Role Modified';
    case 'ADMIN_STATUS_CHANGED': return 'Admin Account Status Toggled';
    case 'ADMIN_REMOVED': return 'Administrator Deprovisioned';
    case 'JOB_MANUAL_RUN': return 'Scheduled Job Manual Execution';
    case 'JOB_RETRY_RUN': return 'Scheduled Job Retry Invocation';
    case 'JOB_CONFIG_TOGGLE': return 'Background Job Configuration Saved';
    default: return act.replace(/_/g, ' ');
  }
}

export function formatByteSize(bytes: number): string {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
