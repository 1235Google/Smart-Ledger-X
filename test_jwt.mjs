import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

let projectId = process.env.VITE_FIREBASE_PROJECT_ID;

if (!projectId) {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    projectId = config.projectId;
  } catch (err) {}
}

admin.initializeApp(projectId ? { projectId } : undefined);

async function test() {
  const auth = getAuth();
  console.log("Expected aud:", projectId);
}
test();
