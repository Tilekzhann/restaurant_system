"use client";
import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, getDocs } from 'firebase/firestore';

// Определяем интерфейс для блюда
interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

export default function CashierPage() {
  const [menuItems, setMenuItems] = useState<Dish[]>([]); // Типизируем menuItems как массив блюд
  const [order, setOrder] = useState<Dish[]>([]); // Типизируем order как массив блюд
  const [total, setTotal] = useState<number>(0); // Общая сумма заказа

  // Загрузка всех блюд из Firestore
  const loadMenu = async () => {
    const querySnapshot = await getDocs(collection(db, 'menu'));
    const dishes: Dish[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Dish[];
    setMenuItems(dishes);
  };

  // Добавление блюда в заказ
  const handleAddDishToOrder = (dish: Dish) => {
    setOrder((prevOrder) => [...prevOrder, dish]);
    setTotal((prevTotal) => prevTotal + dish.price); // Обновляем общую стоимость
  };

  // Завершение заказа
  const handleFinishOrder = () => {
    alert(`Общая сумма заказа: ${total} KZT`);
    // Здесь можно добавить логику для записи заказа в базу данных или выполнения оплаты
  };

  // Загружаем меню при монтировании компонента
  useEffect(() => {
    loadMenu();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Меню ресторана</h1>

      {/* Список доступных блюд */}
      <div className="mb-8">
        {menuItems.length === 0 ? (
          <p>Меню пусто. Добавьте блюда в меню.</p>
        ) : (
          menuItems.map((dish) => (
            <div key={dish.id} className="border p-4 mb-4">
              <h3 className="font-bold">{dish.name}</h3>
              <p>{dish.description}</p>
              <p>Цена: {dish.price} KZT</p>
              <button
                onClick={() => handleAddDishToOrder(dish)}
                className="bg-green-500 text-white px-2 py-1 rounded"
              >
                Добавить в заказ
              </button>
            </div>
          ))
        )}
      </div>

      {/* Просмотр текущего заказа */}
      <h2 className="text-xl font-semibold mb-2">Текущий заказ</h2>
      <div>
        {order.length === 0 ? (
          <p>Нет заказанных блюд.</p>
        ) : (
          order.map((dish, index) => (
            <div key={index} className="border p-2 mb-2">
              <p>{dish.name} - {dish.price} KZT</p>
            </div>
          ))
        )}
      </div>

      {/* Общая сумма */}
      <div className="mt-4">
        <h3 className="font-semibold">Общая сумма: {total} KZT</h3>
      </div>

      {/* Кнопка для завершения заказа */}
      <button
        onClick={handleFinishOrder}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Завершить заказ
      </button>
    </div>
  );
}
