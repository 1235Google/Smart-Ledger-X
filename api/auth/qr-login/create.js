import crypto from "crypto";
import QRCode from "qrcode";
import { UAParser } from "ua-parser-js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const forwarded = req.headers['x-forwarded-for'];
    let ip = '127.0.0.1';
    if (forwarded) {
      ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim();
    } else if (req.headers['x-real-ip']) {
      ip = String(req.headers['x-real-ip']).trim();
    }

    const ua = req.headers['user-agent'] || '';
    const parser = new UAParser(ua);
    const parsed = parser.getResult();

    const sessionId = crypto.randomUUID();
    const secureToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(secureToken).digest('hex');
    const now = Date.now();
    const expiresAt = now + 120 * 1000;

    const desktopMetadata = {
      browser: parsed.browser.name || 'Web Browser',
      os: parsed.os.name || 'Operating System',
      ip,
      location: 'Desktop Client',
      deviceType: parsed.device.type || 'desktop',
      userAgent: ua,
      requestedAt: now
    };

    // Official SmartLedgerX mobile web production URL
    const qrUrl = 'https://smartledgerx.vercel.app';

    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 8,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    return res.status(200).json({
      success: true,
      sessionId,
      secureToken,
      qrUrl,
      qrCodeDataUrl,
      expiresAt,
      expiresInSeconds: 120,
      desktopMetadata
    });
  } catch (error) {
    console.error("API ERROR (/api/auth/qr-login/create):", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to create QR session" });
  }
}
