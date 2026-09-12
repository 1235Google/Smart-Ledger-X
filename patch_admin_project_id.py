import sys

with open('src/server/firebase-admin.ts', 'r') as f:
    code = f.read()

replacement = """import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let projectId = process.env.VITE_FIREBASE_PROJECT_ID;

if (!projectId) {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    projectId = config.projectId;
  } catch (err) {
    console.warn('[Firebase Admin] Could not load firebase-applet-config.json', err);
  }
}

try {
  // @ts-ignore
  if (admin.apps && !admin.apps.length) {
    admin.initializeApp(projectId ? { projectId } : undefined);
    console.log(`[Firebase Admin] Initialized successfully. Project ID: ${projectId || 'default'}`);
  // @ts-ignore
  } else if (!admin.apps) { 
     admin.initializeApp(projectId ? { projectId } : undefined);
     console.log(`[Firebase Admin] Initialized successfully (no apps array). Project ID: ${projectId || 'default'}`);
  }
} catch (e: any) {
  if (e.code === 'app/duplicate-app') {
    console.log('[Firebase Admin] Already initialized.');
  } else {
    console.warn('[Firebase Admin] Initialization failed:', e);
  }
}"""

import re
code = re.sub(r"import admin from 'firebase-admin';.*?\} catch \(e: any\) \{.*?\}", replacement, code, flags=re.DOTALL)

with open('src/server/firebase-admin.ts', 'w') as f:
    f.write(code)

print("done")
