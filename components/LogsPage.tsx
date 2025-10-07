// components/LogsPage.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";

interface Log {
  id: string;
  userId: string;
  email: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  timestamp: { seconds: number };
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Log[]);
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📜 Журнал действий</h1>
      <table className="min-w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Дата</th>
            <th className="p-2 border">Пользователь</th>
            <th className="p-2 border">Действие</th>
            <th className="p-2 border">Объект</th>
            <th className="p-2 border">Детали</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="p-2 border">{new Date(log.timestamp.seconds * 1000).toLocaleString()}</td>
              <td className="p-2 border">{log.email}</td>
              <td className="p-2 border">{log.action}</td>
              <td className="p-2 border">{log.targetType || "-"}</td>
              <td className="p-2 border">{log.details || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
