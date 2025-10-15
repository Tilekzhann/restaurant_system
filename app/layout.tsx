// app/layout.tsx
import "../styles/globals.css";
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdTokenResult();
        setRole(token.claims.role || null);
      } else {
        setRole(null);
      }
    });
    return () => unsub();
  }, []);

  return (
    <html lang="ru">
      <body className="min-h-screen bg-gray-50">
        <div className="flex h-full">
          {role && role !== "admin" && <Sidebar />} {/* 👈 только не для админа */}
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-4 overflow-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

