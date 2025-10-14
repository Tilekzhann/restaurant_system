"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getUserRole } from "@/lib/auth";
import "../styles/globals.css";

type Role = "admin" | "cashier" | "kitchen" | null;

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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

  // 🔹 функция для подсветки активной ссылки
  const linkClass = (href: string) =>
    pathname.startsWith(href)
      ? "px-3 py-1 rounded bg-blue-600 text-white font-medium"
      : "px-3 py-1 rounded text-blue-600 hover:bg-blue-100 transition";

  return (
    <header className="flex justify-between items-center bg-gray-50 border-b px-6 py-3 shadow-sm">
      <div className="font-semibold text-gray-700">
        Привет, <span className="text-blue-600">{userEmail}</span>
      </div>

      <button
        className="text-2xl md:hidden"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>

      <nav
        className={`${
          menuOpen
            ? "absolute top-14 left-0 w-full bg-white shadow-md flex flex-col gap-2 p-4"
            : "hidden md:flex md:gap-3 md:items-center"
        }`}
      >
        {/* 🔹 Админские ссылки */}
        {role === "admin" && (
          <>
            <Link href="/admin" className={linkClass("/admin")}>
              Админ-панель
            </Link>
            <Link href="/admin/staff" className={linkClass("/admin/staff")}>
              Сотрудники
            </Link>
            <Link href="/admin/users" className={linkClass("/admin/users")}>
              Пользователи
            </Link>
            <Link href="/admin/logs" className={linkClass("/admin/logs")}>
              Журнал действий
            </Link>
          </>
        )}

        {/* 🔹 Общие ссылки */}
        <Link href="/orders" className={linkClass("/orders")}>
          Заказы
        </Link>
        <Link href="/menu" className={linkClass("/menu")}>
          Меню
        </Link>
        <Link href="/stock" className={linkClass("/stock")}>
          Склад
        </Link>

        <button
          onClick={handleLogout}
          className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition"
        >
          Выйти
        </button>
      </nav>
    </header>
  );
}
