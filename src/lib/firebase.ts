import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { Timestamp, getFirestore, initializeFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyD3CJRaq-8pA5NFiG3val_WXVQGogd_Zlk",
    authDomain: "peer-schedule.firebaseapp.com",
    projectId: "peer-schedule",
    storageBucket: "peer-schedule.firebasestorage.app",
    messagingSenderId: "935086023192",
    appId: "1:935086023192:web:67f002a2ad35b796f3596d",
    measurementId: "G-HP4YMNXMDX",
};

const existingApp = getApps().length > 0;
export const app = existingApp ? getApp() : initializeApp(firebaseConfig);

// Ignore optional undefined fields such as photoURL or recurrenceRule. When Vite
// hot reloads this module, reuse the already-initialized Firestore instance.
export const db = existingApp
    ? getFirestore(app)
    : initializeFirestore(app, {
          ignoreUndefinedProperties: true,
      });

export const auth = getAuth(app);
export const functions = getFunctions(app);

export const dateToTimestamp = (date: Date | number | string): Timestamp => {
    const normalizedDate = date instanceof Date ? date : new Date(date);
    return Timestamp.fromDate(normalizedDate);
};

export const timestampToDate = (timestamp: Timestamp | null | undefined): Date | null =>
    timestamp ? timestamp.toDate() : null;
