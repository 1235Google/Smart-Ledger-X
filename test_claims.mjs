import admin from 'firebase-admin';
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

admin.initializeApp({ projectId });
const { getAuth } = await import('firebase-admin/auth');

async function test() {
  try {
    const auth = getAuth();
    const user = await auth.getUserByEmail('souvikbbsr811@gmail.com');
    console.log("User UID:", user.uid);
    await auth.setCustomUserClaims(user.uid, { test_claim: true });
    console.log("Success setting claim!");
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
