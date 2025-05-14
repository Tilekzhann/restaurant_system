"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getUserRole } from "@/lib/auth";

interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

export default function MenuPage() {
  const [role, setRole] = useState<"admin" | "cashier" | "kitchen" | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const r = await getUserRole(user.uid);
        setRole(r as "admin" | "cashier" | "kitchen");
      }
    });

    const unsub = onSnapshot(collection(db, "menu"), (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Dish, "id">),
      }));
      setDishes(items);
    });

    return () => unsub();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setCategory("");
    setEditingId(null);
  };

  const handleSubmit = async () => {
    const data = {
      name,
      description,
      price: parseFloat(price),
      category,
      available: true,
    };

    if (editingId) {
      await updateDoc(doc(db, "menu", editingId), data);
      alert("Блюдо обновлено");
    } else {
      const newMenuRef = doc(collection(db, "menu"));
      await setDoc(newMenuRef, data);
      await setDoc(doc(db, "stock", newMenuRef.id), {
        name,
        quantity: 0,
      });
      alert("Блюдо добавлено");
      
    }
    resetForm();
  };

  const handleEdit = (dish: Dish) => {
    setEditingId(dish.id);
    setName(dish.name);
    setDescription(dish.description);
    setPrice(dish.price.toString());
    setCategory(dish.category);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Удалить блюдо?")) {
      await deleteDoc(doc(db, "menu", id));
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Управление меню</h1>

      {role === "admin" && (
        <div className="mb-6">
          <h2 className="text-xl mb-2">
            {editingId ? "Редактировать блюдо" : "Добавить блюдо"}
          </h2>
          <input
            type="text"
            placeholder="Название"
            className="p-2 border mb-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            placeholder="Описание"
            className="p-2 border mb-2 w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            type="number"
            placeholder="Цена"
            className="p-2 border mb-2 w-full"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            type="text"
            placeholder="Категория"
            className="p-2 border mb-2 w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {editingId ? "Обновить" : "Добавить"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="ml-2 px-4 py-2 bg-gray-500 text-white rounded"
            >
              Отменить
            </button>
          )}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Список блюд</h2>
      {dishes.length === 0 ? (
        <p>Меню пусто.</p>
      ) : (
        dishes.map((dish) => (
          <div key={dish.id} className="border p-4 mb-2 rounded">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold">{dish.name}</h3>
                <p>
                  {dish.category} — {dish.price} KZT
                </p>
              </div>
              {role === "admin" && (
                <div>
                  <button
                    onClick={() => handleEdit(dish)}
                    className="text-yellow-600 mr-2"
                  >
                    Ред.
                  </button>
                  <button
                    onClick={() => handleDelete(dish.id)}
                    className="text-red-600"
                  >
                    Удал.
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
