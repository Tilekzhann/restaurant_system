// components/AdminGuard.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/lib/auth";

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const role = await getUserRole(user.uid);
      if (role === "admin") {
        setIsAdmin(true);
      } else {
        router.replace("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) return <p>Загрузка...</p>;
  if (!isAdmin) return null;

  return <>{children}</>;
}
