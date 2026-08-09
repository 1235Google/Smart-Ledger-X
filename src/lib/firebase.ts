import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);
const auth = getAuth(app);

// Enable Firestore offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support all of the persistence features.');
    }
});

export { app, db, auth };
