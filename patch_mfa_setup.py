import sys

with open('src/server/mfa-service.ts', 'r') as f:
    code = f.read()

# Fix QRCode import to be safer in cjs
code = code.replace("import QRCode from 'qrcode';", "import * as QRCode from 'qrcode';")

new_setup = """export async function setupMfa(userId: string, email: string) {
  const secret = generateSecret();
  const label = email || userId;
  const issuer = 'SmartLedger';
  const uri = generateURI({ secret, label, issuer });
  
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await (QRCode.toDataURL || (QRCode as any).default.toDataURL)(uri);
  } catch(e) {
    qrCodeDataUrl = await (QRCode as any).default.toDataURL(uri);
  }
  
  const encryptedSecret = encrypt(secret);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
  const db = admin.firestore();
  await db.collection('users').doc(userId).collection('private_security').doc('totp').set({
    pendingSecret: encryptedSecret,
    pendingExpiresAt: expiresAt.getTime()
  }, { merge: true });
  
  return {
    success: true,
    qrCodeDataUrl,
    manualEntryKey: secret,
    issuer,
    accountName: label,
    expiresAt: expiresAt.toISOString(),
    // Also keep old fields for backwards compatibility with any other frontend code
    secret: secret,
    qrCodeUrl: qrCodeDataUrl
  };
}"""

import re
code = re.sub(r"export async function setupMfa.*?return \{ secret, qrCodeUrl \};.*?\}", new_setup, code, flags=re.DOTALL)

with open('src/server/mfa-service.ts', 'w') as f:
    f.write(code)

print("done")
