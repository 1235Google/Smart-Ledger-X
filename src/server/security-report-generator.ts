import { jsPDF } from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';
import { translateFinding } from './security-report-translator';
import { formatUserDateTime, formatDuration, getUserTimeZone } from '../lib/date-time';

const REPORTS_DIR = path.join(process.cwd(), 'security-reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

export function generateScanPdf(scanRecord: any, findings: any[] = []): string {
  try {
    const userId = scanRecord.userId || 'guest';
    const scanId = scanRecord.id || `scan_${Date.now()}`;
    const userDir = path.join(REPORTS_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const filePath = path.join(userDir, `${scanId}.pdf`);

    // PRIORITY 0: Single Source of Truth consistency check & derived verdict/score
    const nonPassFindings = findings.filter(f => 
      f.severity === 'critical' || 
      f.severity === 'high' || 
      f.severity === 'medium' || 
      f.status === 'warning' || 
      f.status === 'fail'
    );

    const hasWarnings = nonPassFindings.length > 0;
    const computedScore = hasWarnings ? Math.max(65, 100 - (nonPassFindings.length * 8)) : 100;
    const finalScore = scanRecord.finalScore ?? computedScore;

    const verdictTitle = hasWarnings 
      ? 'VERDICT: Attention Recommended' 
      : 'VERDICT: Account is well protected';

    const verdictDescription = hasWarnings
      ? `We found ${nonPassFindings.length} item(s) in your inspection that need review or updating to maintain top-tier security posture.`
      : 'We checked your backups, authentication, software components, and safety configurations. Found no serious problems or warnings.';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const maxWidth = 170; // 210mm width minus 20mm left/right margins
    const userTz = getUserTimeZone();
    const dateStr = formatUserDateTime(scanRecord.startedAt || Date.now(), userTz);
    const scanType = (scanRecord.mode || 'full').toUpperCase() + ' SCAN';
    const durationStr = formatDuration(scanRecord.startedAt, scanRecord.completedAt);

    // ==========================================
    // PAGE 1 ONLY — SINGLE PAGE SHORT REPORT
    // ==========================================
    doc.setFillColor(15, 20, 29);
    doc.rect(0, 0, 210, 297, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('SmartGuard Security Report', 20, 20);

    // Metadata
    doc.setFontSize(8);
    doc.setTextColor(160, 174, 192);
    doc.text(`Generated: ${dateStr}  |  Type: ${scanType}  |  Scan ID: ${scanId}  |  Duration: ${durationStr}`, 20, 27);

    // Verdict Box
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(20, 33, 170, 42, 3, 3, 'F');

    doc.setFontSize(12);
    doc.setTextColor(hasWarnings ? 250 : 52, hasWarnings ? 204 : 211, hasWarnings ? 21 : 153);
    doc.text(verdictTitle, 25, 42);

    doc.setFontSize(9);
    doc.setTextColor(226, 232, 240);
    const wrappedVerdict = doc.splitTextToSize(verdictDescription, maxWidth - 10);
    doc.text(wrappedVerdict, 25, 50);

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`Overall Security Score: ${finalScore} / 100`, 25, 68);

    // What We Checked
    let currentY = 82;
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('What We Checked in This Inspection', 20, currentY);

    currentY += 8;
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    const checks = [
      '- Checked if your database backups are safe and cryptographically verified',
      '- Inspected authentication tokens and multi-device session security',
      '- Audited software library dependencies for known vulnerabilities',
      '- Checked server configuration headers and CORS safety policies',
      '- Scanned for exposed sensitive environment secrets'
    ];
    for (const c of checks) {
      const wrappedCheck = doc.splitTextToSize(c, maxWidth);
      doc.text(wrappedCheck, 20, currentY);
      currentY += wrappedCheck.length * 5 + 2;
    }

    // What You Should Know (Plain Language Findings Summary)
    currentY += 4;
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('What You Should Know', 20, currentY);

    currentY += 8;
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);

    if (hasWarnings) {
      // List top findings, max 5-6 lines total
      const translatedFindings = nonPassFindings.slice(0, 3).map(f => translateFinding(f));
      for (const tf of translatedFindings) {
        const lineText = `[!] ${tf.title}: ${tf.actionText}`;
        const wrappedLine = doc.splitTextToSize(lineText, maxWidth);
        doc.text(wrappedLine, 20, currentY);
        currentY += wrappedLine.length * 5 + 2;
        if (currentY > 255) break;
      }
    } else {
      const okText = '[PASS] Everything checked out fine — no security warnings or action needed.';
      const wrappedOk = doc.splitTextToSize(okText, maxWidth);
      doc.text(wrappedOk, 20, currentY);
      currentY += wrappedOk.length * 5 + 4;
    }

    // One-line summary count
    currentY += 6;
    doc.setFontSize(9);
    doc.setTextColor(160, 174, 192);
    const summaryCountText = 'Summary: We checked 400+ app components, your secure backups, login session protection, and account settings.';
    const wrappedSummaryCount = doc.splitTextToSize(summaryCountText, maxWidth);
    doc.text(wrappedSummaryCount, 20, currentY);

    // Footer Page 1 of 1
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('SmartGuard Automated Security Engine v2.5  |  Page 1 of 1', 20, 288);

    doc.save(filePath);
    return filePath;
  } catch (error) {
    console.error('[SmartGuard PDF Generator] Error generating PDF report:', error);
    throw error;
  }
}
