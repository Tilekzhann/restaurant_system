"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import {
  collection,
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

  const [selectedCategory, setSelectedCategory] = useState("Все категории");
  const [categories, setCategories] = useState<string[]>([]);

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

      const unique = Array.from(new Set(items.map((d) => d.category)));
      setCategories(["Все категории", ...unique]);
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
      const newRef = doc(collection(db, "menu"));
      await setDoc(newRef, data);
      await setDoc(doc(db, "stock", newRef.id), { name, quantity: 0 });
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

  const filteredDishes =
    selectedCategory === "Все категории"
      ? dishes
      : dishes.filter((dish) => dish.category === selectedCategory);

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

      <div className="mb-4">
        <label htmlFor="categoryFilter" className="mr-2 font-semibold">
          Фильтр по категории:
        </label>
        <select
          id="categoryFilter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="p-2 border"
        >
          {categories.map((cat, i) => (
            <option key={i} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <h2 className="text-xl font-semibold mb-4">Список блюд</h2>

      {filteredDishes.length === 0 ? (
        <p>Блюд не найдено.</p>
      ) : (
        <div className="menu-grid">
          {filteredDishes.map((dish) => (
            <div key={dish.id} className="menu-card">
              <h3 className="menu-title">{dish.name}</h3>
              <p className="menu-description">{dish.description}</p>
              <p className="menu-category">Категория: {dish.category}</p>
              <p className="menu-price">{dish.price} ₸</p>
              {role === "admin" && (
                <div className="menu-actions">
                  <button
                    onClick={() => handleEdit(dish)}
                    className="edit-btn"
                  >
                    Ред.
                  </button>
                  <button
                    onClick={() => handleDelete(dish.id)}
                    className="delete-btn"
                  >
                    Удал.
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
