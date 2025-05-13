"use client";
import { useEffect, useState } from 'react';
import { auth } from '@/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/lib/auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unlink = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) return router.replace('/login');
      const role = await getUserRole(user.uid);
      setLoading(false);
      // не делаем router.replace сразу, даём возможность увидеть Sidebar
      if (role === 'admin') router.replace('/admin');
      else if (role === 'cashier') router.replace('/cashier');
      else if (role === 'kitchen') router.replace('/kitchen');
      else router.replace('/login');
    });
    return () => unlink();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1">
        <Header />
        {/* сюда можно вставить общий дашборд-контент, если нужно */}
      </div>
    </div>
  );
}
