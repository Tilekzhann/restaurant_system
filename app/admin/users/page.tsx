"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { logAction } from "@/lib/logAction"; // твоя функция логирования
import AdminGuard from "@/components/AdminGuard";

interface User {
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  verified: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const roles = ["pending", "cashier", "kitchen", "admin"];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const list: User[] = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(list);
    });

    return () => unsub();
  }, []);

  const handleRoleChange = async (user: User, newRole: string) => {
    if (user.role === newRole) return;

    await updateDoc(doc(db, "users", user.uid), { role: newRole });
    await logAction("change_role", "user", user.uid, `Назначена роль: ${newRole}`);
  };

  return (
    <AdminGuard>
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">👤 Управление пользователями</h1>

        <table className="min-w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Имя</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Телефон</th>
              <th className="p-2 border">Роль</th>
              <th className="p-2 border">Подтверждён</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.uid}>
                <td className="p-2 border">{user.name}</td>
                <td className="p-2 border">{user.email}</td>
                <td className="p-2 border">{user.phone}</td>
                <td className="p-2 border">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user, e.target.value)}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2 border">{user.verified ? "✅" : "❌"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminGuard>
  );
}
