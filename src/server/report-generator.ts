import { Resend } from 'resend';

function createPendingCsv(month: string, pendingTx: any[]) {
  let csv = `SmartLedger Pending Dues Report - ${month}\n`;
  csv += `Generated At,"${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}"\n\n`;
  
  let totalPending = 0;
  pendingTx.forEach(tx => totalPending += (Number(tx.amount) || 0));

  csv += 'EXECUTIVE SUMMARY\n';
  csv += `Total Pending (Receivables),${totalPending}\n`;
  csv += `Total Records,${pendingTx.length}\n\n`;

  csv += 'PENDING TRANSACTIONS\n';
  csv += 'S.No,Date,Name,Amount (INR),Due Date,Status,Notes\n';

  pendingTx.forEach((tx, idx) => {
    const dateStr = tx.date || tx.createdAt || 'N/A';
    const nameStr = (tx.personName || tx.customerName || 'N/A').replace(/"/g, '""');
    const amt = Number(tx.amount) || 0;
    const dueDateStr = tx.dueDate || 'N/A';
    const statusStr = (tx.status || 'Pending').toUpperCase();
    const noteStr = (tx.note || tx.notes || tx.reason || '').replace(/"/g, '""');

    csv += `${idx + 1},"${dateStr}","${nameStr}",${amt},"${dueDateStr}","${statusStr}","${noteStr}"\n`;
  });

  return Buffer.from(csv, 'utf-8');
}

function createGullakCsv(month: string, gullakEntries: any[]) {
  let csv = `SmartLedger Gullak Savings Report - ${month}\n`;
  csv += `Generated At,"${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}"\n\n`;
  
  let totalSavings = 0;
  gullakEntries.forEach(tx => {
     const amt = Number(tx.amount) || 0;
     const isCredit = tx.direction === 'credit' || tx.type === 'deposit';
     totalSavings += isCredit ? amt : -amt;
  });

  csv += 'EXECUTIVE SUMMARY\n';
  csv += `Net Savings Balance,${totalSavings}\n`;
  csv += `Total Records,${gullakEntries.length}\n\n`;

  csv += 'GULLAK TRANSACTIONS\n';
  csv += 'S.No,Date,Name,Category,Amount (INR),Type,Notes\n';

  gullakEntries.forEach((tx, idx) => {
    const dateStr = tx.date || tx.createdAt || 'N/A';
    const nameStr = (tx.personName || 'N/A').replace(/"/g, '""');
    const catStr = (tx.category || 'N/A').replace(/"/g, '""');
    const amt = Number(tx.amount) || 0;
    const isCredit = tx.direction === 'credit' || tx.type === 'deposit';
    const typeStr = isCredit ? 'CREDIT' : 'DEBIT';
    const noteStr = (tx.note || '').replace(/"/g, '""');

    csv += `${idx + 1},"${dateStr}","${nameStr}","${catStr}",${amt},"${typeStr}","${noteStr}"\n`;
  });

  return Buffer.from(csv, 'utf-8');
}

export async function generateAndSendReport(
  email: string,
  month: string,
  transactions: any[],
  customers: any[],
  includePdf: boolean,
  aiSummary: string,
  resendApiKey: string,
  gullakEntries: any[] = []
) {
  const resend = new Resend(resendApiKey);

  const pendingTx = (transactions || []).filter(t => t.type === 'pending');
  let totalPending = 0;
  pendingTx.forEach(tx => totalPending += (Number(tx.amount) || 0));

  let totalSavings = 0;
  (gullakEntries || []).forEach(tx => {
     const amt = Number(tx.amount) || 0;
     const isCredit = tx.direction === 'credit' || tx.type === 'deposit';
     totalSavings += isCredit ? amt : -amt;
  });

  const pendingCsvBuffer = createPendingCsv(month, pendingTx);
  const gullakCsvBuffer = createGullakCsv(month, gullakEntries || []);

  let summaryBuffer: Buffer | null = null;
  if (includePdf) {
    let summaryText = `=================================================
`;
    summaryText += `SMARTLEDGER MONTHLY REPORT: ${month}
`;
    summaryText += `=================================================

`;
    summaryText += `Generated: ${new Date().toLocaleString()}
`;
    summaryText += `Recipient: ${email}

`;
    summaryText += `SUMMARY
`;
    summaryText += `-------------------------------------------------
`;
    summaryText += `Gullak Savings Balance: INR ${totalSavings.toLocaleString('en-IN')}
`;
    summaryText += `Pending Receivables:    INR ${totalPending.toLocaleString('en-IN')}
`;
    summaryText += `Pending Records:        ${pendingTx.length}
`;
    summaryText += `Savings Records:        ${(gullakEntries || []).length}

`;
    summaryText += `=================================================
`;
    summaryBuffer = Buffer.from(summaryText, 'utf-8');
  }

  const attachments: any[] = [
    {
      filename: `SmartLedger_Pending_Report_${month.replace(/\s+/g, '_')}.csv`,
      content: pendingCsvBuffer,
    },
    {
      filename: `SmartLedger_Gullak_Savings_${month.replace(/\s+/g, '_')}.csv`,
      content: gullakCsvBuffer,
    }
  ];

  if (summaryBuffer) {
    attachments.push({
      filename: `SmartLedger_Summary_${month.replace(/\s+/g, '_')}.txt`,
      content: summaryBuffer,
    });
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; padding: 24px; margin: 0; }
        .card { max-width: 620px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #1f6feb 0%, #0969da 100%); padding: 32px 24px; text-align: left; }
        .title { font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 6px; }
        .subtitle { font-size: 14px; color: #d0d7de; margin: 0; }
        .content { padding: 24px; }
        .grid { display: flex; gap: 12px; margin: 20px 0; flex-wrap: wrap; }
        .stat { flex: 1; min-width: 130px; background: #21262d; border: 1px solid #30363d; border-radius: 12px; padding: 16px; }
        .stat-label { font-size: 11px; text-transform: uppercase; color: #8b949e; margin-bottom: 4px; font-weight: 600; }
        .stat-val { font-size: 18px; font-weight: 700; color: #58a6ff; }
        .stat-val.green { color: #3fb950; }
        .stat-val.amber { color: #d29922; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #8b949e; border-top: 1px solid #30363d; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="title">SmartLedger Monthly Report</div>
          <div class="subtitle">Period: ${month} &bull; Delivered to ${email}</div>
        </div>
        <div class="content">
          <p style="margin-top: 0; color: #c9d1d9;">Hello,</p>
          <p style="color: #8b949e;">Here is your verified monthly financial report containing <b>Gullak Savings</b> and <b>Pending Dues</b>. Key metrics are summarized below:</p>
          
          <div class="grid">
            <div class="stat">
              <div class="stat-label">Net Savings</div>
              <div class="stat-val green">₹${totalSavings.toLocaleString('en-IN')}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Outstanding Dues</div>
              <div class="stat-val amber">₹${totalPending.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <p style="font-size: 13px; color: #8b949e; margin-bottom: 0;">
            📎 Detailed transaction spreadsheets (.csv) and executive summaries have been attached to this email.
          </p>
        </div>
        <div class="footer">
          Generated automatically by SmartLedger &bull; All data securely encrypted
        </div>
      </div>
    </body>
    </html>
  `;

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return {
      success: false,
      deliveredTo: cleanEmail,
      error: { message: `Invalid recipient email address format: ${cleanEmail}` },
      fileSizeXlsx: 0,
      fileSizePdf: 0
    };
  }

  let fromAddress = process.env.RESEND_FROM_EMAIL || 'SmartLedger <onboarding@resend.dev>';
  try {
    const domains = await resend.domains.list();
    const domainList = Array.isArray(domains.data) ? domains.data : (domains.data?.data || []);
    const verifiedDomain = domainList.find((d: any) => d.status === 'verified');
    if (verifiedDomain) {
      fromAddress = `SmartLedger <updates@${verifiedDomain.name}>`;
    }
  } catch (err) {
    console.warn('[Report Generator] Domain list check skipped:', err);
  }

  console.log(`[Report Generator] Dispatching monthly report to recipient: ${cleanEmail}`);
  const data = await resend.emails.send({
    from: fromAddress,
    to: cleanEmail,
    subject: `📊 SmartLedger Monthly Report – ${month}`,
    html: htmlContent,
    attachments
  });

  if (data.error) {
    console.error(`[Report Generator] Email dispatch error for ${cleanEmail}:`, data.error);
    return {
      success: false,
      deliveredTo: cleanEmail,
      error: data.error,
      fileSizeXlsx: pendingCsvBuffer.length + gullakCsvBuffer.length,
      fileSizePdf: summaryBuffer ? summaryBuffer.length : 0
    };
  }

  return {
    success: true,
    deliveredTo: cleanEmail,
    messageId: data.data?.id,
    fileSizeXlsx: pendingCsvBuffer.length + gullakCsvBuffer.length,
    fileSizePdf: summaryBuffer ? summaryBuffer.length : 0
  };
}
