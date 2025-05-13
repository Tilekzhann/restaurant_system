// app/admin/staff.tsx
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export default function StaffPage() {
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const snapshot = await getDocs(collection(db, "staff"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setStaff(data as { id: string; name: string }[]);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addDoc(collection(db, "staff"), { name: newName });
    setNewName("");
    setShowForm(false);
    fetchStaff();
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "staff", id));
    fetchStaff();
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
