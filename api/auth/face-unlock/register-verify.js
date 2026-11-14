import { 
  verifyRegistrationResponseCore, 
  setCorsHeaders 
} from "../../../src/server/webauthn-core.js";

export default async function handler(req, res) {
  setCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ 
      error: 'Method Not Allowed. Please use POST.',
      allowedMethods: ['POST', 'OPTIONS']
    });
  }

  try {
    let payload = {};
    if (typeof req.body === 'string') {
      try {
        payload = JSON.parse(req.body);
      } catch {
        payload = {};
      }
    } else {
      payload = req.body || {};
    }

    const { userId, response } = payload;
    const result = await verifyRegistrationResponseCore({
      userId,
      response,
      req
    });

    if (result.verified) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('[API WebAuthn] register-verify error:', error);
    return res.status(500).json({ 
      error: error.message || 'Server error verifying registration' 
    });
  }
}
