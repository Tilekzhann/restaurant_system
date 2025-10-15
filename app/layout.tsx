// app/layout.tsx
"use client";

import { useEffect, useState } from "react";
import "../styles/globals.css";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/lib/auth";

type Role = "admin" | "cashier" | "kitchen" | null;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const r = await getUserRole(u.uid);
        setRole(r as Role);
      } else {
        setUser(null);
        setRole(null);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = "token=; path=/; max-age=0";
    router.replace("/login");
  };

  if (!user) return null;

  return (
    <html lang="ru">
      <body className="min-h-screen flex bg-gray-100 text-gray-800">
        {/* Sidebar */}
        <aside
          className={`fixed md:static z-40 bg-white shadow-lg h-full w-64 flex flex-col p-5 transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <h2 className="text-lg font-semibold mb-6 text-blue-600">🍽 Restaurant System</h2>
          <nav className="flex flex-col gap-3">
            {role === "admin" && (
              <>
                <Link href="/admin" className="sidebar-link">
                  Админ-панель
                </Link>
                <Link href="/admin/staff" className="sidebar-link">
                  Сотрудники
                </Link>
                <Link href="/admin/users" className="sidebar-link">
                  Пользователи
                </Link>
                <Link href="/admin/logs" className="sidebar-link">
                  Журнал действий
                </Link>
              </>
            )}

            <Link href="/orders" className="sidebar-link">
              Заказы
            </Link>
            <Link href="/menu" className="sidebar-link">
              Меню
            </Link>
            <Link href="/stock" className="sidebar-link">
              Склад
            </Link>
          </nav>

          <button
            onClick={handleLogout}
            className="mt-auto bg-red-500 hover:bg-red-600 text-white py-2 rounded-md"
          >
            Выйти
          </button>
        </aside>

        {/* Основная часть */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-2 rounded-md hover:bg-gray-100"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                ☰
              </button>
              <h1 className="text-gray-700 font-semibold">
                Привет, <span className="text-blue-600">{user.email}</span>
              </h1>
            </div>
          </header>

          {/* Контент */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
