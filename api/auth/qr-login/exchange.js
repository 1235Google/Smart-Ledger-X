import crypto from "crypto";

const HMAC_SECRET = process.env.QR_HMAC_SECRET || 'smartledgerx_quantum_qr_auth_secret_2026';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { sessionId, secureToken, authGrant } = req.body || {};
    if (!sessionId || !secureToken || !authGrant) {
      return res.status(400).json({ success: false, error: "Missing exchange credentials" });
    }

    const jsonStr = Buffer.from(authGrant, 'base64url').toString('utf-8');
    const { payload, signature } = JSON.parse(jsonStr);
    const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
    if (signature !== expectedSig) {
      return res.status(401).json({ success: false, error: "Invalid signature" });
    }

    const [grantSessionId, uid, email] = payload.split(':');
    if (grantSessionId !== sessionId) {
      return res.status(401).json({ success: false, error: "Session mismatch" });
    }

    return res.status(200).json({
      success: true,
      user: {
        uid,
        email,
        displayName: email ? email.split('@')[0] : 'SmartLedger User',
        authMethod: 'google_qr_login',
        loginTime: Date.now()
      }
    });
  } catch (error) {
    console.error("API ERROR (/api/auth/qr-login/exchange):", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to exchange session" });
  }
}
