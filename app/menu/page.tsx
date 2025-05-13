"use client";
import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';

interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

export default function MenuPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ name, setName ] = useState<string>("");
  const [ description, setDescription ] = useState<string>("");
  const [ price, setPrice ] = useState<string>("");
  const [ category, setCategory ] = useState<string>("");
  const [ editingId, setEditingId ] = useState<string | null>(null);

  const loadDishes = async () => {
    const snap = await getDocs(collection(db, 'menu'));
    const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Dish, 'id'>) }));
    setDishes(items);
  };

  useEffect(() => {
    loadDishes();
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setCategory('');
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
      await updateDoc(doc(db, 'menu', editingId), data);
      alert('Блюдо обновлено');
    } else {
      await addDoc(collection(db, 'menu'), data);
      alert('Блюдо добавлено');
    }
    resetForm();
    loadDishes();
  };

  const handleEdit = (dish: Dish) => {
    setEditingId(dish.id);
    setName(dish.name);
    setDescription(dish.description);
    setPrice(dish.price.toString());
    setCategory(dish.category);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить блюдо?')) {
      await deleteDoc(doc(db, 'menu', id));
      alert('Блюдо удалено');
      loadDishes();
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Управление меню</h1>
      <div className="mb-6">
        <h2 className="text-xl mb-2">{editingId ? 'Редактировать блюдо' : 'Добавить блюдо'}</h2>
        <input
          type="text"
          placeholder="Название"
          className="p-2 border mb-2 w-full"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        />
        <textarea
          placeholder="Описание"
          className="p-2 border mb-2 w-full"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
        />
        <input
          type="number"
          placeholder="Цена"
          className="p-2 border mb-2 w-full"
          value={price}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
        />
        <input
          type="text"
          placeholder="Категория"
          className="p-2 border mb-2 w-full"
          value={category}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
        />
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {editingId ? 'Обновить' : 'Добавить'}
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

      <h2 className="text-xl font-semibold mb-4">Список блюд</h2>
      {dishes.length === 0 ? (
        <p>Меню пусто.</p>
      ) : (
        dishes.map(dish => (
          <div key={dish.id} className="border p-4 mb-2 rounded">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold">{dish.name}</h3>
                <p>{dish.category} — {dish.price} KZT</p>
              </div>
              <div>
                <button onClick={() => handleEdit(dish)} className="text-yellow-600 mr-2">Ред.</button>
                <button onClick={() => handleDelete(dish.id)} className="text-red-600">Удал.</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
