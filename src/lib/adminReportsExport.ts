import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { 
  AdminReportCategory, 
  SystemHealthReportData, 
  BackupReportData, 
  SecurityReportData, 
  DataIntegrityReportData, 
  ScheduledJobsReportData, 
  AdminActivityReportData 
} from '../types';
import { DateRangeResult, formatByteSize } from './adminReportsEngine';

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Format filename: SmartLedger-[Category]-Report-[YYYY-MM-DD].pdf
export function generateReportFilename(category: AdminReportCategory, ext: 'pdf' | 'csv'): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const catNames: Record<AdminReportCategory, string> = {
    system_health: 'System-Health',
    backup: 'Backup-Audit',
    security: 'Security-Activity',
    data_integrity: 'Data-Integrity',
    scheduled_jobs: 'Scheduled-Jobs',
    admin_activity: 'Admin-Activity'
  };
  return `SmartLedger-${catNames[category] || 'Admin'}-Report-${dateStr}.${ext}`;
}

// --- PDF GENERATION ENGINE ---

export function exportAdminReportToPdf(params: {
  category: AdminReportCategory;
  data: 
    | SystemHealthReportData 
    | BackupReportData 
    | SecurityReportData 
    | DataIntegrityReportData 
    | ScheduledJobsReportData 
    | AdminActivityReportData;
  dateRange: DateRangeResult;
  adminEmail: string;
}): void {
  const { category, data, dateRange, adminEmail } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const filename = generateReportFilename(category, 'pdf');

  const primaryDark = [15, 23, 42]; // #0f172a
  const slate600 = [71, 85, 105];
  const emerald600 = [5, 150, 105];
  const amber600 = [217, 119, 6];
  const rose600 = [225, 29, 72];

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 595.28, 70, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SMARTLEDGER ENTERPRISE', 40, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('CENTRAL ADMIN REPORTS CENTER // AUTHORITATIVE AUDIT', 40, 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(239, 68, 68);
  doc.text('RESTRICTED ACCESS', 490, 32, { align: 'right' });
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('CONFIDENTIAL AUDIT', 490, 46, { align: 'right' });

  let y = 90;

  // Metadata Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, y, 515.28, 48, 4, 4, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Type:', 52, y + 18);
  doc.text('Date Period:', 52, y + 34);

  doc.setFont('helvetica', 'normal');
  const titles: Record<AdminReportCategory, string> = {
    system_health: 'System Health & Infrastructure Report',
    backup: 'Disaster Recovery & Backup SLA Report',
    security: 'Security, Authentication & Threat Audit Report',
    data_integrity: 'Ledger Accounting & Data Integrity Report',
    scheduled_jobs: 'Automated Scheduled Jobs Reliability Report',
    admin_activity: 'Administrative Operations Audit Trail'
  };
  doc.text(titles[category] || 'Admin Report', 125, y + 18);
  doc.text(`${dateRange.label} (${dateRange.startDate.toLocaleDateString()} to ${dateRange.endDate.toLocaleDateString()})`, 125, y + 34);

  doc.setFont('helvetica', 'bold');
  doc.text('Generated At:', 340, y + 18);
  doc.text('Auditor / Admin:', 340, y + 34);

  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString('en-US'), 415, y + 18);
  doc.text(adminEmail || 'Central Admin', 415, y + 34);

  y += 65;

  // Render specific category content
  switch (category) {
    case 'system_health': {
      const sh = data as SystemHealthReportData;
      // Score Badge Box
      const scoreColor = sh.score >= 90 ? emerald600 : sh.score >= 70 ? amber600 : rose600;
      doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.roundedRect(40, y, 515.28, 42, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`System Health Status: ${sh.status.toUpperCase()} (${sh.score}/100)`, 55, y + 26);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Active Warnings: ${sh.warningsCount} | Critical Inconsistencies: ${sh.criticalIssuesCount}`, 360, y + 26);
      y += 55;

      // Subsystem Components Table
      const compRows = [
        ['Firestore DB', sh.components.firestore.status.toUpperCase(), `${sh.components.firestore.latencyMs}ms`, sh.components.firestore.message],
        ['Authentication & RBAC', sh.components.auth.status.toUpperCase(), `${sh.components.auth.activeAdminsCount} Admins`, sh.components.auth.message],
        ['Backup System', sh.components.backup.status.toUpperCase(), sh.components.backup.hoursAgo !== null ? `${sh.components.backup.hoursAgo}h ago` : 'N/A', sh.components.backup.message],
        ['Scheduled Jobs', sh.components.scheduledJobs.status.toUpperCase(), `${sh.components.scheduledJobs.healthyCount} Normal / ${sh.components.scheduledJobs.failedCount} Failed`, sh.components.scheduledJobs.message],
        ['Data Integrity', sh.components.dataIntegrity.status.toUpperCase(), `${sh.components.dataIntegrity.discrepancyCount} Discrepancies`, sh.components.dataIntegrity.message],
        ['Security & Auth', sh.components.adminSecurity.status.toUpperCase(), `${sh.components.adminSecurity.unauthorizedAttemptsCount} Blocked`, sh.components.adminSecurity.message]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Subsystem Component', 'Status', 'Metrics', 'Diagnostic Notes']],
        body: compRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 6 },
        columnStyles: {
          0: { cellWidth: 120, fontStyle: 'bold' },
          1: { cellWidth: 70 },
          2: { cellWidth: 90 },
          3: { cellWidth: 'auto' }
        }
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      // Score Deductions Table
      if (sh.scoreBreakdown.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text('Deterministic Health Score Deductions Breakdown:', 40, y);
        y += 10;

        const deductionRows = sh.scoreBreakdown.map(b => [
          b.category,
          b.reason,
          `-${b.deduction} pts`,
          b.severity.toUpperCase()
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Category', 'Deduction Reason', 'Impact', 'Severity']],
          body: deductionRows,
          theme: 'grid',
          headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8.5 },
          styles: { fontSize: 8, cellPadding: 5 }
        });
        y = (doc as any).lastAutoTable.finalY + 15;
      }
      break;
    }

    case 'backup': {
      const bData = data as BackupReportData;
      // Key Metrics Strip
      const backupRows = [
        ['Total Backups in Period', `${bData.totalBackupsInRange}`],
        ['Successful Snapshots', `${bData.successfulBackups} (${bData.successRate}%)`],
        ['Failed Snapshots', `${bData.failedBackups}`],
        ['Total Storage Consumed', bData.formattedTotalSize],
        ['Average Backup Size', bData.formattedAverageSize],
        ['Last Successful Backup', bData.lastSuccessfulBackup ? `${bData.lastSuccessfulBackup.formattedTime} (${bData.lastSuccessfulBackup.formattedSize})` : 'None in range']
      ];

      autoTable(doc, {
        startY: y,
        head: [['Backup SLA Metric', 'Authoritative Measurement']],
        body: backupRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 6 }
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      // Missing Days Warning
      if (bData.missingExpectedBackupDays.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(180, 83, 9);
        doc.text(`Days without recorded backups (${bData.missingExpectedBackupDays.length} days):`, 40, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(bData.missingExpectedBackupDays.map(d => d.formattedDate).join(', '), 40, y, { maxWidth: 515 });
        y += 20;
      }

      // Snapshot Records Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Snapshot Records:', 40, y);
      y += 10;

      const recordsRows = bData.records.slice(0, 25).map(r => [
        new Date(r.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        r.type.toUpperCase(),
        r.status.toUpperCase(),
        r.formattedSize,
        r.durationMs > 0 ? `${(r.durationMs / 1000).toFixed(1)}s` : 'N/A',
        r.sha256 ? `${r.sha256.substring(0, 16)}...` : 'Verified'
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Date & Time', 'Type', 'Status', 'Size', 'Duration', 'Integrity SHA-256']],
        body: recordsRows.length > 0 ? recordsRows : [['No snapshots found in selected range', '', '', '', '', '']],
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8.5 },
        styles: { fontSize: 7.5, cellPadding: 4 }
      });
      break;
    }

    case 'security': {
      const sData = data as SecurityReportData;
      const secSummaryRows = [
        ['Total Security Events', `${sData.totalEvents}`],
        ['Successful Authentications', `${sData.successfulLogins}`],
        ['Failed Login Attempts', `${sData.failedAttempts}`],
        ['New / Unrecognized Devices', `${sData.newUnrecognizedDevices}`],
        ['Unauthorized Access Blocked', `${sData.unauthorizedAdminAttempts}`],
        ['Unique IP Addresses', `${sData.uniqueIpsCount}`]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Security Metric', 'Value']],
        body: secSummaryRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 6 }
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      // Event Logs Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Authoritative Audit Log Events (Sanitized):', 40, y);
      y += 10;

      const logRows = sData.events.slice(0, 30).map(l => [
        new Date(l.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        l.email || 'Anonymous',
        l.action || l.eventType || 'EVENT',
        l.ip || 'N/A',
        l.device || 'Desktop',
        l.details || ''
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Timestamp', 'User / Identity', 'Action / Event', 'IP Address', 'Device', 'Details']],
        body: logRows.length > 0 ? logRows : [['No security events in selected range', '', '', '', '', '']],
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 100 },
          2: { cellWidth: 90 },
          3: { cellWidth: 60 },
          4: { cellWidth: 65 },
          5: { cellWidth: 'auto' }
        }
      });
      break;
    }

    case 'data_integrity': {
      const di = data as DataIntegrityReportData;
      // Main Ledger Reconciliation
      const mainDiff = di.mainLedger.discrepancyAmount;
      const gullakDiff = di.gullak.discrepancyAmount;

      const integRows = [
        ['Main Ledger Stored Balance', `INR ${di.mainLedger.storedBalance.toLocaleString()}`],
        ['Main Ledger Calculated Sum (Inflows - Outflows)', `INR ${di.mainLedger.calculatedBalance.toLocaleString()}`],
        ['Total Inflows (Received)', `INR ${di.mainLedger.inflows.toLocaleString()}`],
        ['Total Outflows (Sent)', `INR ${di.mainLedger.outflows.toLocaleString()}`],
        ['Ledger Discrepancy Variance', Math.abs(mainDiff) < 0.01 ? 'BALANCED (INR 0.00)' : `MISMATCH (INR ${mainDiff.toLocaleString()})`],
        ['Gullak Vault Calculated Balance', `INR ${di.gullak.calculatedBalance.toLocaleString()}`],
        ['Gullak Vault Reconciliation', Math.abs(gullakDiff) < 0.01 ? 'BALANCED (INR 0.00)' : `MISMATCH (INR ${gullakDiff.toLocaleString()})`],
        ['Duplicate Transaction Candidates', `${di.duplicates.length}`],
        ['Missing Required Fields', `${di.missingRequiredFields.length}`],
        ['Invalid Amount Entries', `${di.invalidAmounts.length}`],
        ['Broken References', `${di.brokenReferences.length}`]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Integrity Verification Audit', 'Computed Result']],
        body: integRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 5 }
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      // Duplicates list if any
      if (di.duplicates.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(180, 83, 9);
        doc.text('Potential Duplicate Transaction Candidates (Review Required):', 40, y);
        y += 8;

        const dupRows = di.duplicates.slice(0, 15).map(d => [
          d.date,
          d.personName,
          `INR ${d.amount}`,
          d.reason
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Date', 'Party Name', 'Amount', 'Diagnostic Reasoning']],
          body: dupRows,
          theme: 'grid',
          headStyles: { fillColor: [180, 83, 9], textColor: 255, fontSize: 8 },
          styles: { fontSize: 7.5, cellPadding: 4 }
        });
      }
      break;
    }

    case 'scheduled_jobs': {
      const sj = data as ScheduledJobsReportData;
      const sjSummaryRows = [
        ['Registered Background Jobs', `${sj.totalJobsConfigured}`],
        ['Total Executions in Range', `${sj.totalExecutionsInRange}`],
        ['Successful Executions', `${sj.successExecutionsCount} (${sj.successRate}%)`],
        ['Failed Executions', `${sj.failedExecutionsCount}`],
        ['Overall Execution Health', sj.overallHealth.toUpperCase()]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Measurement']],
        body: sjSummaryRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 6 }
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      // Registry breakdown
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Background Job Registry Execution Breakdown:', 40, y);
      y += 10;

      const jobRows = sj.jobSummaries.map(j => [
        j.jobName,
        j.scheduleHuman,
        j.status,
        `${j.successRunsInRange} / ${j.totalRunsInRange}`,
        j.averageDurationMs > 0 ? `${(j.averageDurationMs / 1000).toFixed(1)}s` : 'N/A',
        j.lastExecutedAt ? new Date(j.lastExecutedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Job Name', 'Schedule', 'Status', 'Runs (Success / Total)', 'Avg Duration', 'Last Run']],
        body: jobRows,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 4 }
      });
      break;
    }

    case 'admin_activity': {
      const aa = data as AdminActivityReportData;
      const aaSummaryRows = [
        ['Total Admin Operations in Period', `${aa.totalActions}`],
        ['System Mode Changes', `${aa.modeChangesCount}`],
        ['Disaster Backup Triggers', `${aa.backupActionsCount}`],
        ['Manual Job Executions', `${aa.jobTriggersCount}`],
        ['Admin / Security Role Updates', `${aa.securityConfigCount}`]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Administrative Metric', 'Count']],
        body: aaSummaryRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 6 }
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      // Actions Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Administrative Audit Trail:', 40, y);
      y += 10;

      const actRows = aa.actions.slice(0, 30).map(a => [
        new Date(a.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        a.adminEmail,
        a.action,
        a.ip,
        a.result.toUpperCase(),
        a.details
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Timestamp', 'Admin Account', 'Action Taken', 'Source IP', 'Result', 'Details']],
        body: actRows.length > 0 ? actRows : [['No administrative actions recorded in range', '', '', '', '', '']],
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 100 },
          2: { cellWidth: 100 },
          3: { cellWidth: 60 },
          4: { cellWidth: 50 },
          5: { cellWidth: 'auto' }
        }
      });
      break;
    }
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `SmartLedger Enterprise // Page ${i} of ${pageCount} // Generated: ${new Date().toISOString()} // Confidential Admin Audit`,
      297.64,
      825,
      { align: 'center' }
    );
  }

  // Download PDF
  doc.save(filename);
}

// --- CSV GENERATION ENGINE ---

export function exportAdminReportToCsv(params: {
  category: AdminReportCategory;
  data: any;
  dateRange: DateRangeResult;
  adminEmail: string;
}): void {
  const { category, data, dateRange, adminEmail } = params;
  const filename = generateReportFilename(category, 'csv');

  let csvContent = '';
  csvContent += `SMARTLEDGER CENTRAL ADMIN REPORTS CENTER\n`;
  csvContent += `Report Type,${category.toUpperCase()}\n`;
  csvContent += `Date Range,"${dateRange.label}"\n`;
  csvContent += `Start Date,${dateRange.startDate.toISOString()}\n`;
  csvContent += `End Date,${dateRange.endDate.toISOString()}\n`;
  csvContent += `Generated At,${new Date().toISOString()}\n`;
  csvContent += `Auditor / Admin,${adminEmail}\n`;
  csvContent += `Classification,RESTRICTED ADMINISTRATIVE AUDIT\n\n`;

  switch (category) {
    case 'system_health': {
      const sh = data as SystemHealthReportData;
      csvContent += `SYSTEM HEALTH METRICS\n`;
      csvContent += `Overall Status,${sh.status}\n`;
      csvContent += `Deterministic Score,${sh.score}/${sh.maxScore}\n`;
      csvContent += `Warnings Count,${sh.warningsCount}\n`;
      csvContent += `Critical Issues Count,${sh.criticalIssuesCount}\n\n`;

      csvContent += `SUBSYSTEM COMPONENTS\n`;
      const compRows = [
        { Subsystem: 'Firestore', Status: sh.components.firestore.status, Latency: `${sh.components.firestore.latencyMs}ms`, Notes: sh.components.firestore.message },
        { Subsystem: 'Authentication', Status: sh.components.auth.status, Latency: 'N/A', Notes: sh.components.auth.message },
        { Subsystem: 'Backup System', Status: sh.components.backup.status, Latency: `${sh.components.backup.hoursAgo || 0}h ago`, Notes: sh.components.backup.message },
        { Subsystem: 'Scheduled Jobs', Status: sh.components.scheduledJobs.status, Latency: `${sh.components.scheduledJobs.healthyCount} normal`, Notes: sh.components.scheduledJobs.message },
        { Subsystem: 'Data Integrity', Status: sh.components.dataIntegrity.status, Latency: `${sh.components.dataIntegrity.discrepancyCount} issues`, Notes: sh.components.dataIntegrity.message },
        { Subsystem: 'Security & Threat', Status: sh.components.adminSecurity.status, Latency: `${sh.components.adminSecurity.unauthorizedAttemptsCount} blocked`, Notes: sh.components.adminSecurity.message }
      ];
      csvContent += Papa.unparse(compRows) + '\n\n';

      if (sh.scoreBreakdown.length > 0) {
        csvContent += `SCORE DEDUCTIONS BREAKDOWN\n`;
        csvContent += Papa.unparse(sh.scoreBreakdown) + '\n';
      }
      break;
    }

    case 'backup': {
      const b = data as BackupReportData;
      csvContent += `BACKUP SUMMARY METRICS\n`;
      csvContent += `Total Backups in Period,${b.totalBackupsInRange}\n`;
      csvContent += `Successful Snapshots,${b.successfulBackups}\n`;
      csvContent += `Failed Snapshots,${b.failedBackups}\n`;
      csvContent += `Success Rate,${b.successRate}%\n`;
      csvContent += `Total Storage Consumed,${b.formattedTotalSize}\n`;
      csvContent += `Average Size,${b.formattedAverageSize}\n`;
      csvContent += `Average Duration Ms,${b.averageDurationMs}\n\n`;

      csvContent += `BACKUP SNAPSHOT RECORDS\n`;
      const recs = b.records.map(r => ({
        ID: r.id,
        CreatedAt: r.createdAt,
        Name: r.name,
        Type: r.type,
        Status: r.status,
        SizeBytes: r.sizeBytes,
        FormattedSize: r.formattedSize,
        DurationMs: r.durationMs,
        SHA256: r.sha256 || 'N/A'
      }));
      csvContent += Papa.unparse(recs) + '\n';
      break;
    }

    case 'security': {
      const s = data as SecurityReportData;
      csvContent += `SECURITY SUMMARY METRICS\n`;
      csvContent += `Total Events,${s.totalEvents}\n`;
      csvContent += `Successful Logins,${s.successfulLogins}\n`;
      csvContent += `Failed Attempts,${s.failedAttempts}\n`;
      csvContent += `New Devices,${s.newUnrecognizedDevices}\n`;
      csvContent += `Unauthorized Attempts Blocked,${s.unauthorizedAdminAttempts}\n`;
      csvContent += `Unique IPs,${s.uniqueIpsCount}\n\n`;

      csvContent += `SECURITY AUDIT EVENTS (SANITIZED)\n`;
      const evs = s.events.map(e => ({
        ID: e.id,
        Timestamp: e.timestamp,
        User: e.email,
        Action: e.action,
        IP: e.ip,
        Device: e.device,
        Browser: e.browser,
        Location: e.location ? `${e.location.city}, ${e.location.country}` : 'Local',
        Details: e.details
      }));
      csvContent += Papa.unparse(evs) + '\n';
      break;
    }

    case 'data_integrity': {
      const di = data as DataIntegrityReportData;
      csvContent += `LEDGER RECONCILIATION SUMMARY\n`;
      csvContent += `Main Ledger Stored Balance,${di.mainLedger.storedBalance}\n`;
      csvContent += `Main Ledger Calculated Balance,${di.mainLedger.calculatedBalance}\n`;
      csvContent += `Total Inflows,${di.mainLedger.inflows}\n`;
      csvContent += `Total Outflows,${di.mainLedger.outflows}\n`;
      csvContent += `Discrepancy Amount,${di.mainLedger.discrepancyAmount}\n`;
      csvContent += `Is Balanced,${di.mainLedger.isBalanced}\n\n`;

      csvContent += `GULLAK RECONCILIATION\n`;
      csvContent += `Gullak Stored Balance,${di.gullak.storedBalance}\n`;
      csvContent += `Gullak Calculated Balance,${di.gullak.calculatedBalance}\n`;
      csvContent += `Gullak Discrepancy,${di.gullak.discrepancyAmount}\n`;
      csvContent += `Is Gullak Balanced,${di.gullak.isBalanced}\n\n`;

      if (di.duplicates.length > 0) {
        csvContent += `DUPLICATE TRANSACTION CANDIDATES\n`;
        csvContent += Papa.unparse(di.duplicates) + '\n\n';
      }
      if (di.missingRequiredFields.length > 0) {
        csvContent += `MISSING REQUIRED FIELDS\n`;
        csvContent += Papa.unparse(di.missingRequiredFields) + '\n\n';
      }
      if (di.invalidAmounts.length > 0) {
        csvContent += `INVALID AMOUNT ENTRIES\n`;
        csvContent += Papa.unparse(di.invalidAmounts) + '\n';
      }
      break;
    }

    case 'scheduled_jobs': {
      const sj = data as ScheduledJobsReportData;
      csvContent += `SCHEDULED JOBS SUMMARY\n`;
      csvContent += `Total Jobs Configured,${sj.totalJobsConfigured}\n`;
      csvContent += `Total Executions in Range,${sj.totalExecutionsInRange}\n`;
      csvContent += `Success Executions,${sj.successExecutionsCount}\n`;
      csvContent += `Failed Executions,${sj.failedExecutionsCount}\n`;
      csvContent += `Success Rate,${sj.successRate}%\n`;
      csvContent += `Overall Health,${sj.overallHealth}\n\n`;

      csvContent += `JOB SUMMARIES\n`;
      csvContent += Papa.unparse(sj.jobSummaries) + '\n\n';

      csvContent += `RECENT EXECUTION RUNS\n`;
      const runRows = sj.recentRuns.map(r => ({
        RunID: r.runId,
        JobName: r.jobName,
        StartedAt: r.startedAt,
        DurationMs: r.durationMs,
        Status: r.status,
        TriggerType: (r as any).triggerType || 'SCHEDULED',
        ErrorCode: r.errorCode || 'NONE'
      }));
      csvContent += Papa.unparse(runRows) + '\n';
      break;
    }

    case 'admin_activity': {
      const aa = data as AdminActivityReportData;
      csvContent += `ADMIN ACTIVITY SUMMARY\n`;
      csvContent += `Total Actions in Range,${aa.totalActions}\n`;
      csvContent += `System Mode Changes,${aa.modeChangesCount}\n`;
      csvContent += `Backup Actions,${aa.backupActionsCount}\n`;
      csvContent += `Job Triggers,${aa.jobTriggersCount}\n`;
      csvContent += `Security / Role Changes,${aa.securityConfigCount}\n\n`;

      csvContent += `ADMIN ACTIONS AUDIT TRAIL\n`;
      csvContent += Papa.unparse(aa.actions) + '\n';
      break;
    }
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveBlob(blob, filename);
}
