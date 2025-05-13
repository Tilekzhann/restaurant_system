// components/Header.tsx
"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "../styles/globals.css";

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

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

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = "token=; path=/; max-age=0";
    router.replace("/login");
  };

  if (!userEmail) return null;

  return (
    <header className="header">
      <div className="header-left">Привет, {userEmail}</div>
      <div className="header-toggle" onClick={() => setMenuOpen(!menuOpen)}>☰</div>
      <nav className={`header-nav ${menuOpen ? "open" : ""}`}>
        <Link href="/admin">Админ-панель</Link>
        <Link href="/menu">Меню</Link>
        <Link href="/stock">Склад</Link>
        <button onClick={handleLogout}>Выйти</button>
      </nav>
    </header>
  );
}