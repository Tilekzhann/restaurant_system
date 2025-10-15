"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase/config";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserRole } from "@/lib/auth";

type Role = "admin" | "cashier" | "kitchen" | null;

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [verified, setVerified] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        setUserEmail(user.email);

        // Получаем роль
        const r = await getUserRole(user.uid);
        setRole(r as Role);

        // Проверяем статус верификации
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data();
        setVerified(data?.verified ?? false);
      } else {
        setUserEmail(null);
        setRole(null);
        setVerified(false);
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
    <>
      <header className="header">
        <div className="header-left">
          Привет, {userEmail}
        </div>

        <div className="header-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </div>

        {verified ? (
          <nav className={`header-nav ${menuOpen ? "open" : ""}`}>
            {role === "admin" && (
              <>
                <Link href="/admin">Админ-панель</Link>
                <Link href="/admin/staff">Сотрудники</Link>
                <Link href="/admin/users">Пользователи</Link>
                <Link href="/admin/logs">Журнал действий</Link>
              </>
            )}

            <Link href="/orders">Заказы</Link>
            <Link href="/menu">Меню</Link>
            <Link href="/stock">Склад</Link>
            <button onClick={handleLogout}>Выйти</button>
          </nav>
        ) : (
          // ⚠️ Показываем баннер вместо меню
          <div
            style={{
              backgroundColor: "#fff3cd",
              color: "#664d03",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid #ffeeba",
              marginLeft: "auto",
              fontWeight: 500,
              maxWidth: "500px",
              textAlign: "center",
            }}
          >
            ⚠️ Подтвердите номер телефона, чтобы получить доступ к системе.
          </div>
        )}
      </header>
    </>
  );
}
