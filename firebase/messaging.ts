// firebase/messaging.ts
import { initializeApp } from "firebase/app";

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD2O5VGePAY0OueIN5I48x9Cw__B13ibCw",
  authDomain: "restaurant-system-492af.firebaseapp.com",
  projectId: "restaurant-system-492af",
  storageBucket: "restaurant-system-492af.firebasestorage.app",
  messagingSenderId: "438497022574",
  appId: "1:438497022574:web:8473d3caf0663a61178c7f"
};

// Инициализация приложения
const firebaseApp = initializeApp(firebaseConfig);

// ⛔ Не импортируем getMessaging глобально — только если есть window
export const getClientMessaging = async () => {
  if (typeof window === "undefined") {
    // SSR — пропускаем
    return null;
  }

  const { getMessaging } = await import("firebase/messaging");
  return getMessaging(firebaseApp);
};
