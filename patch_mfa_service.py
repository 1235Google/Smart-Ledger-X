import sys

with open('src/server/mfa-service.ts', 'r') as f:
    code = f.read()

# Replace setupMfa
old_setup_mfa_db = """  const db = admin.firestore();
  await db.collection('users').doc(userId).collection('private_security').doc('totp').set({
    pendingSecret: encryptedSecret,
    pendingExpiresAt: expiresAt.getTime()
  }, { merge: true });"""

new_setup_mfa_db = """  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${process.env.VITE_FIREBASE_PROJECT_ID || 'studio-3200340687-9f052'}/databases/(default)/documents/users/${userId}/private_security/totp?updateMask.fieldPaths=pendingSecret&updateMask.fieldPaths=pendingExpiresAt`;
  
  const payload = {
    fields: {
      pendingSecret: { stringValue: encryptedSecret },
      pendingExpiresAt: { integerValue: expiresAt.getTime().toString() }
    }
  };

  const response = await fetch(firestoreUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[Firestore REST Error]', err);
    throw new Error('Failed to save pending TOTP secret to Firestore: ' + response.statusText);
  }"""

code = code.replace("export async function setupMfa(userId: string, email: string) {", "export async function setupMfa(userId: string, email: string, idToken: string) {")
code = code.replace(old_setup_mfa_db, new_setup_mfa_db)

with open('src/server/mfa-service.ts', 'w') as f:
    f.write(code)

print("done")
