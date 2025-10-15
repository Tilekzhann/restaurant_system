
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
      <body className="min-h-screen bg-gray-50 text-gray-800">
        {/* ======= HEADER (Navbar) ======= */}
        <header className="flex items-center justify-between bg-white shadow-sm px-6 py-3 rounded-lg mx-4 mt-3 mb-6">
          <div className="font-semibold text-lg text-blue-600">🍽 Restaurant System</div>

          <nav className="flex items-center gap-5">
            {role === "admin" && (
              <>
                <Link href="/admin" className="nav-link">Админ-панель</Link>
                <Link href="/admin/staff" className="nav-link">Сотрудники</Link>
                <Link href="/admin/users" className="nav-link">Пользователи</Link>
                <Link href="/admin/logs" className="nav-link">Журнал действий</Link>
              </>
            )}
            <Link href="/orders" className="nav-link">Заказы</Link>
            <Link href="/menu" className="nav-link">Меню</Link>
            <Link href="/stock" className="nav-link">Склад</Link>

            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Выйти
            </button>
          </nav>
        </header>

        {/* ======= PAGE CONTENT ======= */}
        <main className="max-w-6xl mx-auto px-6 pb-12">{children}</main>
      </body>
    </html>
  );
}
