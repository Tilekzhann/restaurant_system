"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";

// Интерфейс для одного блюда в заказе
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

// Интерфейс для заказа
interface Order {
  id: string;
  items: OrderItem[];
  status: "pending" | "preparing" | "done";
  table?: string; // номер столика, если есть
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Загрузить все заказы со статусом pending или preparing
  const loadOrders = async () => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["pending", "preparing"])
    );
    const snap = await getDocs(q);
    const fetched: Order[] = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Order[];
    setOrders(fetched);
    setLoading(false);
  };

  // Отметить заказ как готовый (done)
  const handleMarkDone = async (orderId: string) => {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status: "done" });
    // Обновляем список
    loadOrders();
  };

  useEffect(() => {
    loadOrders();
    // Можно добавить интервал для авто-обновления:
    // const interval = setInterval(loadOrders, 5000);
    // return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl">Загрузка заказов...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Кухня: Текущие заказы</h1>

      {orders.length === 0 ? (
        <p>Нет активных заказов.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="border p-4 mb-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Заказ #{order.id}</span>
              <span className="italic">
                {order.status === "pending" ? "Ожидание" : "В процессе"}
              </span>
            </div>

            <ul className="mb-4 list-disc list-inside">
              {order.items.map((item, idx) => (
                <li key={idx}>
                  {item.name} × {item.quantity} ({item.price * item.quantity} KZT)
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleMarkDone(order.id)}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Отметить готовым
            </button>
          </div>
        ))
      )}
    </div>
  );
}
