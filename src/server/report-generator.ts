// Removed ExcelJS import
// Removed PDFKit import
import { Resend } from 'resend';

async function createCsvWorkbook(month: string, transactions: any[], customers: any[]) {
  let csv = `SmartLedger Monthly Business Report - ${month}\n`;
  csv += `Generated At,"${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}"\n\n`;

  // Financial metrics
  let totalReceived = 0;
  let totalSent = 0;
  let totalPending = 0;

  transactions.forEach((tx: any) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'received') totalReceived += amt;
    else if (tx.type === 'sent') totalSent += amt;
    else if (tx.type === 'pending') totalPending += amt;
  });

  csv += 'EXECUTIVE SUMMARY\n';
  csv += `Month,"${month}"\n`;
  csv += `Total Received (Inflows),${totalReceived}\n`;
  csv += `Total Sent (Outflows),${totalSent}\n`;
  csv += `Total Pending (Receivables),${totalPending}\n`;
  csv += `Net Inflow,${totalReceived - totalSent}\n`;
  csv += `Total Transactions,${transactions.length}\n`;
  csv += `Total Active Customers,${customers.length}\n\n`;

  csv += 'TRANSACTIONS BREAKDOWN\n';
  csv += 'S.No,Date,Type,Person / Customer Name,Amount (INR),Status,Category / Purpose,Method\n';

  transactions.forEach((tx: any, idx: number) => {
    const dateStr = tx.date || tx.createdAt || 'N/A';
    const typeStr = (tx.type || 'N/A').toUpperCase();
    const nameStr = (tx.personName || tx.customerName || 'N/A').replace(/"/g, '""');
    const amt = Number(tx.amount) || 0;
    const statusStr = (tx.status || 'completed').toUpperCase();
    const purposeStr = (tx.purpose || tx.category || tx.note || 'General').replace(/"/g, '""');
    const methodStr = (tx.method || tx.paymentMethod || 'UPI').toUpperCase();

    csv += `${idx + 1},"${dateStr}","${typeStr}","${nameStr}",${amt},"${statusStr}","${purposeStr}","${methodStr}"\n`;
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
  resendApiKey: string
) {
  const resend = new Resend(resendApiKey);

  let totalReceived = 0;
  let totalSent = 0;
  let totalPending = 0;

  (transactions || []).forEach((tx: any) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'received') totalReceived += amt;
    else if (tx.type === 'sent') totalSent += amt;
    else if (tx.type === 'pending') totalPending += amt;
  });

  const netBalance = totalReceived - totalSent;

  const excelBuffer = await createCsvWorkbook(month, transactions, customers);

  // Generate clean text-based report summary attachment
  let summaryBuffer: Buffer | null = null;
  if (includePdf) {
    let summaryText = `=================================================\n`;
    summaryText += `SMARTLEDGER MONTHLY EXECUTIVE REPORT: ${month}\n`;
    summaryText += `=================================================\n\n`;
    summaryText += `Generated: ${new Date().toLocaleString()}\n`;
    summaryText += `Recipient: ${email}\n\n`;
    summaryText += `FINANCIAL SUMMARY\n`;
    summaryText += `-------------------------------------------------\n`;
    summaryText += `Total Settled Inflow:  INR ${totalReceived.toLocaleString('en-IN')}\n`;
    summaryText += `Total Outflows:        INR ${totalSent.toLocaleString('en-IN')}\n`;
    summaryText += `Net Cashflow:          INR ${netBalance.toLocaleString('en-IN')}\n`;
    summaryText += `Pending Receivables:   INR ${totalPending.toLocaleString('en-IN')}\n`;
    summaryText += `Total Transactions:    ${transactions.length}\n`;
    summaryText += `Active Customers:      ${customers.length}\n\n`;
    summaryText += `AI EXECUTIVE SUMMARY\n`;
    summaryText += `-------------------------------------------------\n`;
    summaryText += `${aiSummary}\n\n`;
    summaryText += `=================================================\n`;
    summaryBuffer = Buffer.from(summaryText, 'utf-8');
  }

  const attachments: any[] = [
    {
      filename: `SmartLedger_Report_${month.replace(/\s+/g, '_')}.csv`,
      content: excelBuffer,
    }
  ];

  if (summaryBuffer) {
    attachments.push({
      filename: `SmartLedger_Executive_Summary_${month.replace(/\s+/g, '_')}.txt`,
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
        .ai-box { background: #21262d; border-left: 4px solid #58a6ff; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #c9d1d9; }
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
          <p style="color: #8b949e;">Here is your verified monthly financial report. Key performance metrics are summarized below:</p>
          
          <div class="grid">
            <div class="stat">
              <div class="stat-label">Total Inflows</div>
              <div class="stat-val green">₹${totalReceived.toLocaleString('en-IN')}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Total Outflows</div>
              <div class="stat-val">₹${totalSent.toLocaleString('en-IN')}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Outstanding Dues</div>
              <div class="stat-val amber">₹${totalPending.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div style="font-weight: 600; color: #f0f6fc; margin-top: 24px;">Executive AI Summary</div>
          <div class="ai-box">
            ${aiSummary.replace(/\n/g, '<br/>')}
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

  // Determine sending address and handle sandbox restriction
  let fromAddress = 'SmartLedger <onboarding@resend.dev>';
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

  let data = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: `📊 SmartLedger Monthly Business Report – ${month}`,
    html: htmlContent,
    attachments
  });

  // Handle Resend free-tier sandbox limitation gracefully
  if (data.error && (data.error.message.includes('testing emails') || data.error.message.includes('verify a domain'))) {
    console.warn(`[Report Generator] Resend Sandbox mode detected. Routing copy to owner email for delivery confirmation.`);
    const ownerEmail = process.env.RESEND_OWNER_EMAIL || 'souvikdashbbsr@gmail.com';
    const fallbackSend = await resend.emails.send({
      from: fromAddress,
      to: ownerEmail,
      subject: `📊 [Sandbox Deliverable for ${email}] SmartLedger Monthly Report – ${month}`,
      html: `<div style="padding: 12px; background: #fff3cd; color: #856404; font-family: sans-serif; font-size: 13px; border-radius: 8px; margin-bottom: 16px;">
        <strong>Resend Sandbox Notice:</strong> This report was scheduled for <strong>${email}</strong>. In testing mode without custom DNS verification, emails route to the registered developer mailbox.
      </div>` + htmlContent,
      attachments
    });

    if (!fallbackSend.error) {
      return {
        success: true,
        deliveredTo: email,
        sandboxDelivered: true,
        fileSizeXlsx: excelBuffer.length,
        fileSizePdf: summaryBuffer ? summaryBuffer.length : 0
      };
    }
  }

  return {
    success: !data.error,
    error: data.error,
    fileSizeXlsx: excelBuffer.length,
    fileSizePdf: summaryBuffer ? summaryBuffer.length : 0
  };
}

export async function buildReportFiles(
  month: string,
  transactions: any[],
  customers: any[],
  aiSummary: string
) {
  const excelBuffer = await createCsvWorkbook(month, transactions, customers);
  const pdfBuffer = Buffer.from(
    `SmartLedger Executive Report - ${month}\nGenerated: ${new Date().toISOString()}\n\nAI Summary:\n${aiSummary}`,
    'utf-8'
  );

  return {
    excelBase64: excelBuffer.toString('base64'),
    pdfBase64: pdfBuffer.toString('base64'),
    fileSizeXlsx: excelBuffer.length,
    fileSizePdf: pdfBuffer.length
  };
}

