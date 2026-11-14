import { 
  generateRegistrationOptionsCore, 
  setCorsHeaders 
} from "../../../src/server/webauthn-core.js";

export default async function handler(req, res) {
  setCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Accept GET, POST, and HEAD
  if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, POST, OPTIONS, HEAD');
    return res.status(405).json({ 
      error: 'Method Not Allowed. Please use POST or GET.',
      allowedMethods: ['GET', 'POST', 'OPTIONS', 'HEAD']
    });
  }

  try {
    let payload = {};
    if (req.method === 'POST') {
      if (typeof req.body === 'string') {
        try {
          payload = JSON.parse(req.body);
        } catch {
          payload = {};
        }
      } else {
        payload = req.body || {};
      }
    } else {
      payload = req.query || {};
    }

    const { userId, userName, userDisplayName } = payload;

    const options = await generateRegistrationOptionsCore({
      userId,
      userName,
      userDisplayName,
      req
    });

    return res.status(200).json(options);
  } catch (error) {
    console.error('[API WebAuthn] register-options error:', error);
    return res.status(500).json({ 
      error: error.message || 'Server error generating registration options' 
    });
  }
}
