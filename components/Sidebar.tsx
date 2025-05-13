// components/Sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import { getUserRole } from "@/lib/auth";
import "../styles/sidebar.css";

type Role = "admin" | "cashier" | "kitchen" | null;

export default function Sidebar() {
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        const r = await getUserRole(user.uid);
        setRole(r as Role);
      } else {
        setRole(null);
      }
    });
    return () => unsub();
  }, []);

  if (!role) return null;

  return (
    <aside className="sidebar">
      <nav>
        {role === "admin" && (
          <>
            <Link href="/admin">Админ-панель</Link>
            <Link href="/menu">Меню</Link>
            <Link href="/stock">Склад</Link>
          </>
        )}

        {role === "cashier" && (
          <>
            <Link href="/cashier">Касса</Link>
            <Link href="/stock">Склад</Link>
          </>
        )}

        {role === "kitchen" && (
          <>
            <Link href="/kitchen">Заказы</Link>
            <Link href="/stock">Склад</Link>
          </>
        )}
      </nav>
    </aside>
  );
}
