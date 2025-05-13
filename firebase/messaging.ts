// firebase/messaging.ts
import { getMessaging } from "firebase/messaging";
import { initializeApp } from "firebase/app";

// 🔐 Замените эти данные на свои из Project Settings → General
const firebaseConfig = {
    apiKey: "AIzaSyD2O5VGePAY0OueIN5I48x9Cw__B13ibCw",
    authDomain: "restaurant-system-492af.firebaseapp.com",
    projectId: "restaurant-system-492af",
    storageBucket: "restaurant-system-492af.firebasestorage.app",
    messagingSenderId: "438497022574",
    appId: "1:438497022574:web:8473d3caf0663a61178c7f"
  };
  

const firebaseApp = initializeApp(firebaseConfig);
export const messaging = getMessaging(firebaseApp);
