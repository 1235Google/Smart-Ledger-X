import sys

with open('server.ts', 'r') as f:
    code = f.read()

new_routes = """
  app.post('/api/security/record-ledger-change', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      const { action, details, previousValue, newValue } = req.body;
      
      const event: AuthoritativeSecurityEvent = {
        id: crypto.randomUUID(),
        uid: decodedToken.uid,
        email: decodedToken.email || 'Unknown',
        eventType: action as any,
        authProvider: 'none',
        timestamp: new Date().toISOString(),
        serverTimestampMs: Date.now(),
        ip: extractClientIp(req),
        sessionId: 'ledger-mutation',
        newDevice: false,
        authorizationResult: 'SUCCESS',
        device: parseDeviceAndBrowser(req),
        location: await getApproximateLocation(extractClientIp(req)),
        details: `${details}. Previous: ${JSON.stringify(previousValue)}. New: ${JSON.stringify(newValue)}`
      };
      
      addAuthoritativeEvent(event);
      await writeSecurityEventToFirestore(event, process.env.VITE_FIREBASE_PROJECT_ID || 'smart-ledger', process.env.VITE_FIREBASE_API_KEY || '');
      
      res.json({ success: true });
    } catch (e: any) {
      console.error('[Security] Record ledger change error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/security/step-up-auth', async (req, res) => {
    try {
      // Step-up authentication verification (Passkey or password)
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Real step-up logic would verify the signature of a challenge
      // Here we simulate successful verification for the requested sensitive action
      res.json({ success: true, authorizationToken: crypto.randomBytes(32).toString('hex') });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
"""

if "/api/security/record-ledger-change" not in code:
    code = code.replace("app.post('/api/security/get-audit-logs'", new_routes + "  app.post('/api/security/get-audit-logs'")

with open('server.ts', 'w') as f:
    f.write(code)

print("done")
