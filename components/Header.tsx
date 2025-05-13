// components/Header.tsx
"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  // Слушаем изменения авторизации, чтобы показать email или скрыть
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setUserEmail(user.email);
      } else {
        setUserEmail(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Функция выхода
  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = "token=; path=/; max-age=0";
    router.replace("/login");
  };

  return (
    <header className="w-full bg-gray-800 text-white p-4 flex justify-between items-center">
      <h1 className="text-lg font-semibold">Restaurant System</h1>
      <div className="flex items-center space-x-4">
        {userEmail && <span className="text-sm">Привет, {userEmail}</span>}
        <button
          onClick={handleLogout}
          className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm"
        >
          Выйти
        </button>
      </div>
    </header>
  );
}
