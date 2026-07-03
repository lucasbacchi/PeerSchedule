import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Timestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD3CJRaq-8pA5NFiG3val_WXVQGogd_Zlk",
    authDomain: "peer-schedule.firebaseapp.com",
    projectId: "peer-schedule",
    storageBucket: "peer-schedule.firebasestorage.app",
    messagingSenderId: "935086023192",
    appId: "1:935086023192:web:67f002a2ad35b796f3596d",
    measurementId: "G-HP4YMNXMDX",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const dateToTimestamp = (date: Date | number | string): Timestamp => {
    const normalizedDate = date instanceof Date ? date : new Date(date);
    return Timestamp.fromDate(normalizedDate);
};

export const timestampToDate = (timestamp: Timestamp | null | undefined): Date | null => {
    return timestamp ? timestamp.toDate() : null;
};
