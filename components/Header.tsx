"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserRole } from "@/lib/auth";

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
    <header className="w-full bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Левая часть */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-800">
            🍽 Restaurant System
          </h1>
          <button
            className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>

        {/* Навигация */}
        <nav
          className={`flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 absolute md:static bg-white md:bg-transparent left-0 w-full md:w-auto p-4 md:p-0 border-b md:border-none shadow-md md:shadow-none transition-all duration-200 ${
            menuOpen ? "top-14" : "top-[-400px]"
          }`}
        >
          {role === "admin" && (
            <>
              <Link href="/admin" className="nav-link">
                Админ-панель
              </Link>
              <Link href="/admin/staff" className="nav-link">
                Сотрудники
              </Link>
              <Link href="/admin/users" className="nav-link">
                Пользователи
              </Link>
              <Link href="/admin/logs" className="nav-link">
                Журнал действий
              </Link>
            </>
          )}

          <Link href="/orders" className="nav-link">
            Заказы
          </Link>
          <Link href="/menu" className="nav-link">
            Меню
          </Link>
          <Link href="/stock" className="nav-link">
            Склад
          </Link>
        </nav>

        {/* Правая часть */}
        <div className="hidden md:flex items-center gap-4">
          <span className="text-sm text-gray-600 font-medium">
            {userEmail}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md transition"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}
