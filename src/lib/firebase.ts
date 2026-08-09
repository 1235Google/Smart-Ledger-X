import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
const auth = getAuth(app);

// Enable Auth persistence across browser restarts
setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase Auth persistence setup warning:', err);
});

// Enable Firestore offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support all of the persistence features.');
    }
});

export { app, db, auth };

