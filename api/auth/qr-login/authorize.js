import crypto from "crypto";

const HMAC_SECRET = process.env.QR_HMAC_SECRET || 'smartledgerx_quantum_qr_auth_secret_2026';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { sessionId, secureToken, idToken, user } = req.body || {};
    if (!sessionId || !secureToken || !idToken || !user?.uid) {
      return res.status(400).json({ success: false, error: "Missing authorization parameters" });
    }

    // Generate cryptographic single-use grant
    const payload = `${sessionId}:${user.uid}:${user.email}:${Date.now()}`;
    const signature = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
    const authGrant = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');

    return res.status(200).json({
      success: true,
      message: "Session successfully authorized",
      authGrant
    });
  } catch (error) {
    console.error("API ERROR (/api/auth/qr-login/authorize):", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to authorize QR login" });
  }
}
