// app/layout.tsx
import "../styles/globals.css";
import { ReactNode } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "Restaurant System",
  description: "Управление рестораном: админ, касса, кухня и склад",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-gray-50">
        <div className="flex h-full">
          {/* Боковое меню */}
          <Sidebar />

          {/* Основная область */}
          <div className="flex-1 flex flex-col">
            {/* Заголовок */}
            <Header />

            {/* Контент страниц */}
            <main className="flex-1 p-4 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
