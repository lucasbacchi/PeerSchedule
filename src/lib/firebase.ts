import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
export const db = getFirestore(app);
export const auth = getAuth(app);
