// app/admin/staff/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export default function StaffPage() {
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "staff"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as { name: string }),
      }));
      setStaff(data);
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addDoc(collection(db, "staff"), { name: newName });
    setNewName("");
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "staff", id));
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Сотрудники</h1>

      <ul className="mb-6">
        {staff.map((s) => (
          <li key={s.id} className="flex justify-between items-center mb-2">
            <span>{s.name}</span>
            <button onClick={() => handleDelete(s.id)}>Удалить</button>
          </li>
        ))}
      </ul>

      {!showForm && (
        <button onClick={() => setShowForm(true)}>+ Добавить сотрудника</button>
      )}

      {showForm && (
        <div className="mt-4">
          <input
            type="text"
            placeholder="ФИО"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button onClick={handleAdd}>Добавить</button>
        </div>
      )}
    </div>
  );
}
