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
    <header className="header">
      <div className="left">
        <span>Привет, {userEmail}</span>
      </div>
      <div className="right">
        <a href="/admin">Админ-панель</a>
        <a href="/menu">Меню</a>
        <a href="/stock">Склад</a>
        <button onClick={handleLogout}>Выйти</button>
      </div>
    </header>
  );
}
