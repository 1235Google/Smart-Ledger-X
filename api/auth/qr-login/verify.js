import crypto from "crypto";
import { UAParser } from "ua-parser-js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { token, sessionId } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, error: "Missing security token" });
    }

    const ua = req.headers['user-agent'] || '';
    const parser = new UAParser(ua);
    const parsed = parser.getResult();

    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim() : '127.0.0.1';

    const mobileMetadata = {
      browser: parsed.browser.name || 'Mobile Browser',
      os: parsed.os.name || 'Mobile OS',
      ip,
      scannedAt: Date.now(),
      userAgent: ua
    };

    return res.status(200).json({
      success: true,
      session: {
        sessionId: sessionId || 'validated',
        status: 'SCANNED',
        mobileMetadata
      }
    });
  } catch (error) {
    console.error("API ERROR (/api/auth/qr-login/verify):", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to verify QR token" });
  }
}
