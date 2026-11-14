import { sendLoginSuccessEmail } from "../../src/server/resend-service.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { email, time, device, browser, os, location, ip } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });

    console.log(`Sending login alert to: ${email}`);

    const result = await sendLoginSuccessEmail(email, {
      time: time || new Date().toLocaleString(),
      device: device || 'Desktop',
      browser: `${browser || 'Web Browser'}${os ? ` (${os})` : ''}`,
      location: location || 'Online',
      ip: ip || '127.0.0.1'
    });

    if (result.success) {
      console.log('Login alert sent successfully');
      return res.status(200).json({ success: true, message: 'Login alert sent' });
    } else {
      console.error('Failed to send login alert:', result.error);
      return res.status(500).json({ success: false, error: 'Failed to send login alert' });
    }
  } catch (error) {
    console.error("API ERROR (/api/security/notify-login):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Unknown server error"
    });
  }
}
