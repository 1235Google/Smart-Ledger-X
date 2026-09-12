import sys

with open('server.ts', 'r') as f:
    code = f.read()

old_verify = """      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;
        delete userChallenges[userId];
        res.json({
          verified: true,
          credential: {
            id: Buffer.from(credential.id).toString('base64url'),
            publicKey: Buffer.from(credential.publicKey).toString('base64url')
          }
        });
      } else {"""

new_verify = """      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;
        delete userChallenges[userId];
        
        // Save to Firestore securely via Admin SDK
        const passkeyData = {
          id: Buffer.from(credential.id).toString('base64url'),
          publicKey: Buffer.from(credential.publicKey).toString('base64url'),
          counter: credential.counter,
          transports: credential.transports,
          createdAt: new Date().toISOString()
        };
        
        try {
          await admin.firestore().collection('users').doc(userId).collection('passkeys').doc(passkeyData.id).set(passkeyData);
        } catch(e) {
          console.error('[WebAuthn] Error saving passkey to Firestore:', e);
        }

        res.json({
          verified: true,
          credential: passkeyData
        });
      } else {"""

code = code.replace(old_verify, new_verify)

with open('server.ts', 'w') as f:
    f.write(code)

print("done")
