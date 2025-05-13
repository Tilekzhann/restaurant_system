// components/Header.tsx
"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserRole } from "@/lib/auth";
import "../styles/globals.css";

type Role = "admin" | "cashier" | "kitchen" | null;

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        setUserEmail(user.email);
        const r = await getUserRole(user.uid);
        setRole(r as Role);
      } else {
        setUserEmail(null);
        setRole(null);
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
        {role === "admin" && (
          <Link href="/admin">Админ-панель</Link>
        )}
        <Link href="/menu">Меню</Link>
        <Link href="/stock">Склад</Link>
        <button onClick={handleLogout}>Выйти</button>
      </nav>
    </header>
  );
}
