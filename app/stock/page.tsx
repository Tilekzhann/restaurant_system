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

interface StockItem {
  id: string;
  name: string;
  quantity: number;
}

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [role, setRole] = useState<"admin" | "cashier" | "kitchen" | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState<number>(0);

  const router = useRouter();

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

  const handleUpdate = async (id: string, qty: number) => {
    const ref = doc(db, "stock", id);
    await updateDoc(ref, { quantity: qty });
    loadStock();
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "stock", id));
    loadStock();
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

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
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Количество"
            value={newQty}
            onChange={(e) => setNewQty(parseInt(e.target.value, 10))}
          />
          <button onClick={handleAdd}>Добавить</button>
        </div>
      )}

      {/* Поисковое поле */}
      <input
        type="text"
        placeholder="Поиск по названию..."
        className="p-2 border mb-4 w-full"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredItems.length === 0 ? (
        <p>Совпадений не найдено.</p>
      ) : (
        <div className="stock-grid">
          {filteredItems.map((item) => (
            <div key={item.id} className="stock-card">
              <p className="stock-name">{item.name}</p>
              <p className="stock-qty">Количество: {item.quantity}</p>
              {role === "admin" && (
                <div className="stock-actions">
                  <button onClick={() => handleUpdate(item.id, item.quantity + 1)} className="stock-btn plus">
                    +1
                  </button>
                  <button
                    onClick={() => handleUpdate(item.id, item.quantity - 1)}
                    className="stock-btn minus"
                    disabled={item.quantity <= 0}
                  >
                    -1
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="stock-btn delete">
                    Удалить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
