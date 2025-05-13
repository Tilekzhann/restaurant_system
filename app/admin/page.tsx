"use client";
import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// Интерфейс для типа блюда
interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

// Компонент для отображения блюда в меню
const MenuItem = ({ dish, onDelete, onEdit }: { dish: Dish; onDelete: (id: string) => void; onEdit: (id: string) => void }) => {
  const { id, name, description, price, category } = dish;

  const handleEdit = () => {
    onEdit(id);
  };

  const handleDelete = () => {
    onDelete(id);
  };

  return (
    <div className="border p-4 mb-4">
      <h3 className="font-bold">{name}</h3>
      <p>{description}</p>
      <p>Цена: {price} KZT</p>
      <p>Категория: {category}</p>
      <button onClick={handleEdit} className="bg-yellow-500 text-white px-2 py-1 rounded mr-2">Редактировать</button>
      <button onClick={handleDelete} className="bg-red-500 text-white px-2 py-1 rounded">Удалить</button>
    </div>
  );
};

export default function AdminMenuPage() {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [menuItems, setMenuItems] = useState<Dish[]>([]); // Типизируем menuItems как массив объектов Dish
  const router = useRouter();

  // Функция для добавления блюда в меню
  const handleAddDish = async () => {
    try {
      await addDoc(collection(db, 'menu'), {
        name,
        description,
        price: parseFloat(price),
        category,
        available: true, // Блюдо доступно для заказа
      });
      alert('Блюдо добавлено');
      // Обновляем меню после добавления
      loadMenu();
    } catch (err) {
      alert('Ошибка при добавлении блюда');
    }
  };

  // Функция для загрузки всех блюд из Firestore
  const loadMenu = async () => {
    const querySnapshot = await getDocs(collection(db, 'menu'));
    const dishes: Dish[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Dish[];
    setMenuItems(dishes);
  };

  // Функция для удаления блюда
  const handleDeleteDish = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'menu', id));
      alert('Блюдо удалено');
      loadMenu();
    } catch (err) {
      alert('Ошибка при удалении блюда');
    }
  };

  // Функция для редактирования блюда
  const handleEditDish = (id: string) => {
    router.push(`/admin/edit/${id}`);  // Перенаправление на страницу редактирования блюда
  };

  // Загружаем меню при монтировании компонента
  useEffect(() => {
    loadMenu();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Меню ресторана</h1>
      
      {/* Форма для добавления нового блюда */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Добавить новое блюдо</h2>
        <input
          type="text"
          className="p-2 border mb-2 w-full"
          placeholder="Название блюда"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="p-2 border mb-2 w-full"
          placeholder="Описание блюда"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="number"
          className="p-2 border mb-2 w-full"
          placeholder="Цена блюда (в KZT)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <input
          type="text"
          className="p-2 border mb-2 w-full"
          placeholder="Категория"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <button
          onClick={handleAddDish}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Добавить блюдо
        </button>
      </div>

      {/* Список всех блюд */}
      <h2 className="text-xl font-semibold mb-4">Все блюда</h2>
      {menuItems.length === 0 ? (
        <p>Меню пусто. Добавьте блюда.</p>
      ) : (
        menuItems.map((dish) => (
          <MenuItem
            key={dish.id}
            dish={dish}
            onDelete={handleDeleteDish}
            onEdit={handleEditDish}
          />
        ))
      )}
    </div>
  );
}
