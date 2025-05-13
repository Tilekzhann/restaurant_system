"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/lib/auth";

// Тип для позиции на складе
interface StockItem {
  id: string;
  name: string;
  quantity: number;
}

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [role, setRole] = useState<"admin" | "cashier" | "kitchen" | null>(null);
  const [loading, setLoading] = useState(true);

  // Поля для новой позиции
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState<number>(0);

  const router = useRouter();

  // Проверка аутентификации и получение роли
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const r = await getUserRole(user.uid);
      setRole(r as typeof role);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // Загрузка склада
  const loadStock = async () => {
    const snap = await getDocs(collection(db, "stock"));
    const data = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<StockItem, "id">),
    }));
    setItems(data);
  };

  useEffect(() => {
    if (role) loadStock();
  }, [role]);

  // Добавить новую позицию (только для админа)
  const handleAdd = async () => {
    if (!newName || newQty < 0) return alert("Введите корректные данные");
    await addDoc(collection(db, "stock"), {
      name: newName,
      quantity: newQty,
    });
    setNewName("");
    setNewQty(0);
    loadStock();
  };

  // Обновить количество (только для админа)
  const handleUpdate = async (id: string, qty: number) => {
    const ref = doc(db, "stock", id);
    await updateDoc(ref, { quantity: qty });
    loadStock();
  };

  // Удалить позицию (только для админа)
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "stock", id));
    loadStock();
  };

  if (loading || role === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Склад</h1>

      {role === "admin" && (
        <div className="mb-6 border p-4 rounded">
          <h2 className="font-semibold mb-2">Добавить новый товар</h2>
          <input
            type="text"
            placeholder="Название"
            className="p-2 border mb-2 w-full"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Количество"
            className="p-2 border mb-2 w-full"
            value={newQty}
            onChange={(e) => setNewQty(parseInt(e.target.value, 10))}
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Добавить
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p>Склад пуст.</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border p-4 mb-2 rounded"
          >
            <div>
              <p className="font-semibold">{item.name}</p>
              <p>Количество: {item.quantity}</p>
            </div>

            {role === "admin" ? (
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    handleUpdate(item.id, item.quantity + 1)
                  }
                  className="px-2 py-1 bg-green-500 text-white rounded"
                >
                  +1
                </button>
                <button
                  onClick={() =>
                    handleUpdate(item.id, item.quantity - 1)
                  }
                  className="px-2 py-1 bg-yellow-500 text-white rounded"
                  disabled={item.quantity <= 0}
                >
                  -1
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-2 py-1 bg-red-500 text-white rounded"
                >
                  Удалить
                </button>
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
