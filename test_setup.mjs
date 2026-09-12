import express from 'express';
import fetch from 'node-fetch'; // native fetch

const app = express();
app.use(express.json());

// Mock setupMfa
async function setupMfa(userId, email, idToken) {
  // Try calling Firestore just like in the real code
  const getFirestoreUrl = (userId, updateMasks) => {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'studio-3200340687-9f052';
    let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/private_security/totp`;
    if (updateMasks && updateMasks.length > 0) {
      url += '?' + updateMasks.map(m => `updateMask.fieldPaths=${m}`).join('&');
    }
    return url;
  };

  const payload = {
    fields: {
      pendingSecret: { stringValue: 'secret' },
      pendingExpiresAt: { integerValue: Date.now().toString() }
    }
  };

  console.log("Calling Firestore:", getFirestoreUrl(userId, ['pendingSecret', 'pendingExpiresAt']));
  const response = await fetch(getFirestoreUrl(userId, ['pendingSecret', 'pendingExpiresAt']), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}` // fake token will fail
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to save pending TOTP secret to Firestore: ' + await response.text());
  }

  return { success: true };
}

app.post('/test', async (req, res) => {
  try {
    const data = await setupMfa('test_user', 'test@test.com', 'FAKE_TOKEN');
    res.json(data);
  } catch (e) {
    console.error("Caught error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(3001, async () => {
  console.log("Server listening on 3001");
  const res = await fetch('http://localhost:3001/test', { method: 'POST' });
  const text = await res.text();
  console.log("Response status:", res.status);
  console.log("Response text:", text);
  process.exit(0);
});
