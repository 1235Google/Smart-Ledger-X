import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { email, time, device, browser, os, location, ip } = req.body || {};
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });

    console.log(`Sending login alert to: ${email}`);

    const apiKey = (process.env.RESEND_API_KEY || process.env.RESEND_KEY || '').trim();
    if (!apiKey) {
      console.warn('RESEND_API_KEY not configured. Skipping email delivery.');
      return res.status(200).json({ success: true, message: 'Email service unconfigured, notification logged.' });
    }

    const resend = new Resend(apiKey);
    const loginTime = time || new Date().toLocaleString();
    const deviceStr = device || 'Desktop';
    const browserStr = `${browser || 'Web Browser'}${os ? ` (${os})` : ''}`;
    const locStr = location || 'Online';
    const ipStr = ip || '127.0.0.1';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">New Sign-In Detected</h2>
        <p style="color: #475569; font-size: 15px;">A new login session was established on your SmartLedgerX account.</p>
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 6px 0;"><strong>Time:</strong> ${loginTime}</p>
          <p style="margin: 6px 0;"><strong>Device:</strong> ${deviceStr}</p>
          <p style="margin: 6px 0;"><strong>Browser:</strong> ${browserStr}</p>
          <p style="margin: 6px 0;"><strong>Location:</strong> ${locStr}</p>
          <p style="margin: 6px 0;"><strong>IP Address:</strong> ${ipStr}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">If this was you, you can safely ignore this alert. If you do not recognize this activity, please revoke this session immediately from your Linked Devices dashboard.</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'SmartLedgerX Security <onboarding@resend.dev>',
      to: [email],
      subject: `Security Alert: New Sign-in from ${deviceStr}`,
      html
    });

    if (error) {
      console.error('Failed to send login alert via Resend:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to send login alert' });
    }

    return res.status(200).json({ success: true, message: 'Login alert sent', messageId: data?.id });
  } catch (error) {
    console.error("API ERROR (/api/security/notify-login):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Unknown server error"
    });
  }
}
