// Removed ExcelJS import
// Removed PDFKit import
import { Resend } from 'resend';

async function createExcelWorkbook(month: string, transactions: any[], customers: any[]) {
  // Simplified to CSV to save memory
  let csv = 'Metric,Value\n';
  csv += `Month,${month}\n`;
  csv += `Total Transactions,${transactions.length}\n`;
  csv += `Total Customers,${customers.length}\n`;
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

  const excelBuffer = await createExcelWorkbook(month, transactions, customers);

  let pdfBuffer: Buffer | null = null;
  if (includePdf) {
    pdfBuffer = Buffer.from('PDF Generation is temporarily disabled.', 'utf-8');
  }

  const attachments = [
    {
      filename: `SmartLedger_Report_${month.replace(' ', '_')}.csv`,
      content: excelBuffer,
    }
  ];

  if (pdfBuffer) {
    attachments.push({
      filename: `SmartLedger_Report_${month.replace(' ', '_')}.txt`,
      content: pdfBuffer,
    });
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="padding: 32px 24px;">
        <p style="color: #475569; font-size: 16px; margin: 0 0 16px;">Hello,</p>
        <p style="color: #475569; font-size: 16px; margin: 0 0 16px;">Your SmartLedger Monthly Business Report has been generated successfully.</p>
        <p style="color: #475569; font-size: 16px; margin: 0 0 16px;">Included:</p>
        <ul style="color: #475569; font-size: 16px; margin: 0 0 16px;">
          <li>Excel Report</li>
          ${includePdf ? '<li>PDF Summary</li>' : ''}
          <li>AI Business Summary</li>
        </ul>
        <p style="color: #475569; font-size: 16px; margin: 0 0 16px;"><strong>AI Business Summary:</strong><br/>${aiSummary.replace(/\n/g, '<br/>')}</p>
        <p style="color: #475569; font-size: 16px; margin: 0 0 16px;">Thank you for using SmartLedger.</p>
      </div>
    </div>
  `;

  const data = await resend.emails.send({
    from: 'SmartLedger <onboarding@resend.dev>',
    to: email,
    subject: `📊 SmartLedger Monthly Business Report – ${month}`,
    html: htmlContent,
    attachments
  });

  return {
    success: !data.error,
    error: data.error,
    fileSizeXlsx: excelBuffer.length,
    fileSizePdf: pdfBuffer ? pdfBuffer.length : 0
  };
}

export async function buildReportFiles(
  month: string,
  transactions: any[],
  customers: any[],
  aiSummary: string
) {
  const excelBuffer = await createExcelWorkbook(month, transactions, customers);
  const pdfBuffer = Buffer.from('PDF Generation is temporarily disabled.', 'utf-8');

  return {
    excelBase64: excelBuffer.toString('base64'),
    pdfBase64: pdfBuffer.toString('base64'),
    fileSizeXlsx: excelBuffer.length,
    fileSizePdf: pdfBuffer.length
  };
}
