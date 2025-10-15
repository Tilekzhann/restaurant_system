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
    if (confirm("Удалить этого сотрудника?")) {
      await deleteDoc(doc(db, "staff", id));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          👥 Сотрудники
        </h1>

        {staff.length === 0 ? (
          <p className="text-gray-500 text-sm italic mb-4">
            Пока нет добавленных сотрудников.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 mb-6 animate-fadeIn">
            {staff.map((s) => (
              <li
                key={s.id}
                className="flex justify-between items-center py-3 hover:bg-gray-50 px-2 rounded-md transition"
              >
                <span className="font-medium text-gray-700">{s.name}</span>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
          >
            + Добавить сотрудника
          </button>
        ) : (
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Введите ФИО"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition"
              >
                Добавить
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setNewName("");
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md transition"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
