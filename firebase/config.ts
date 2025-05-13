// firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD2O5VGePAY0OueIN5I48x9Cw__B13ibCw",
  authDomain: "restaurant-system-492af.firebaseapp.com",
  projectId: "restaurant-system-492af",
  storageBucket: "restaurant-system-492af.firebasestorage.app",
  messagingSenderId: "438497022574",
  appId: "1:438497022574:web:8473d3caf0663a61178c7f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
