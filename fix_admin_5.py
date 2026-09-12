import sys

code = """
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

try {
  if (!admin.apps.length) {
    admin.initializeApp();
    console.log('[Firebase Admin] Initialized successfully.');
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
