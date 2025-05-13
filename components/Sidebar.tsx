// components/Sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import { getUserRole } from "@/lib/auth";

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

  if (!role) {
    return null;
  }

  return (
    <aside className="w-48 bg-gray-100 h-screen p-4">
      <nav className="flex flex-col space-y-2">
        {role === "admin" && (
          <>
            <Link
              href="/admin"
              className="px-2 py-1 rounded hover:bg-gray-200"
            >
              Админ-панель
            </Link>
            <Link
              href="/menu"
              className="px-2 py-1 rounded hover:bg-gray-200"
            >
              Меню
            </Link>
            <Link
              href="/stock"
              className="px-2 py-1 rounded hover:bg-gray-200"
            >
              Склад
            </Link>
          </>
        )}

        {role === "cashier" && (
          <>
            <Link
              href="/cashier"
              className="px-2 py-1 rounded hover:bg-gray-200"
            >
              Касса
            </Link>
            <Link
              href="/stock"
              className="px-2 py-1 rounded hover:bg-gray-200"
            >
              Склад
            </Link>
          </>
        )}

        {role === "kitchen" && (
          <>
            <Link
              href="/kitchen"
              className="px-2 py-1 rounded hover:bg-gray-200"
            >
              Заказы
            </Link>
            <Link
              href="/stock"
              className="px-2 py-1 rounded hover:bg-gray-200"
            >
              Склад
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
