import sys

code = """
import admin from 'firebase-admin';

try {
  // @ts-ignore
  if (admin.apps && !admin.apps.length) {
    admin.initializeApp();
    console.log('[Firebase Admin] Initialized successfully.');
  // @ts-ignore
  } else if (!admin.apps) {
     admin.initializeApp();
     console.log('[Firebase Admin] Initialized successfully (no apps array).');
  }
} catch (e: any) {
  if (e.code === 'app/duplicate-app') {
    console.log('[Firebase Admin] Already initialized.');
  } else {
    console.warn('[Firebase Admin] Initialization failed:', e);
  }
}

export { admin };
"""

with open('src/server/firebase-admin.ts', 'w') as f:
    f.write(code)

print("done")
