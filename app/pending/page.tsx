"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function PendingPage() {
  const router = useRouter();
  const [message, setMessage] = useState("⏳ Ваш аккаунт ожидает подтверждения администратора...");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/login");
      return;
    }

    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      const role = docSnap.data()?.role;
      if (role && role !== "pending") {
        // Перенаправляем в зависимости от роли
        if (role === "admin") router.push("/admin");
        else if (role === "cashier") router.push("/cashier");
        else if (role === "kitchen") router.push("/kitchen");
      }
    });

    return () => unsub();
  }, [router]);

  return (
    <div>
      <h1>Ожидание подтверждения</h1>
      <p>{message}</p>
    </div>
  );
}
