"use client";
import { getDoc } from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: number; // ✅ Добавлено
  tableNumber: number;
  staffId: string;
  items: OrderItem[];
  status: "new" | "ready" | "paid";
  createdAt: Timestamp;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

interface StaffMember {
  id: string;
  name: string;
}

export default function OrdersPage() {
  const [role, setRole] = useState<"admin" | "cashier" | "kitchen" | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const newOrderIds = useRef<Set<string>>(new Set());

  // 🔐 Получение роли и push-токена
  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const { getUserRole } = await import("@/lib/auth");
        const r = await getUserRole(user.uid);
        setRole(r as "admin" | "cashier" | "kitchen");

        if (typeof window !== "undefined") {
          import("@/firebase/messaging").then(async ({ messaging }) => {
            if ("serviceWorker" in navigator) {
              const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

              if ("Notification" in window) {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                  const { getToken, onMessage } = await import("firebase/messaging");
                  const token = await getToken(messaging, {
                    vapidKey: "BDBoBvrgB82hODNhc7N-HltXErs6FPaq3AbMw5xHezEbTmfcuMAdfuzY16OXXqGi8YXUjoaPGugAqM2MYNhzsks", // вставь свой VAPID
                    serviceWorkerRegistration: registration,
                  });

                  if (token) {
                    await setDoc(doc(db, "fcm_tokens", user.uid), {
                      token,
                      role: r,
                      timestamp: Timestamp.now(),
                    });
                  }

                  onMessage(messaging, (payload) => {
                    const { title, body } = payload.notification ?? {};
                    if (title) new Notification(title, { body: body || "" });
                  });
                }
              }
            }
          });
        }
      }
    });
  }, []);

  // Загрузка заказов, меню и сотрудников
  useEffect(() => {
    const unsubOrders = onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((doc) => {
          const order = { id: doc.id, ...doc.data() } as Order;
          if (!newOrderIds.current.has(order.id)) {
            newOrderIds.current.add(order.id);
            setTimeout(() => newOrderIds.current.delete(order.id), 3000);
          }
          list.push(order);
        });
        setOrders(list);
      }
    );

    const unsubMenu = onSnapshot(collection(db, "menu"), (snap) => {
      setMenu(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MenuItem)));
    });

    const unsubStaff = onSnapshot(collection(db, "staff"), (snap) => {
      setStaff(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as StaffMember)));
    });

    return () => {
      unsubOrders();
      unsubMenu();
      unsubStaff();
    };
  }, []);

  const handleAddItem = () => {
    if (!selectedItem || quantity < 1) return;
    const item = menu.find((m) => m.id === selectedItem);
    if (item) {
      setOrderItems([...orderItems, { name: item.name, price: item.price, quantity }]);
      setSelectedItem("");
      setQuantity(1);
    }
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getTotal = () =>
    orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async () => {
    if (!selectedTable || !selectedStaff || orderItems.length === 0) return;
  
    for (const item of orderItems) {
      const menuItem = menu.find((m) => m.name === item.name);
      if (!menuItem) {
        alert(`Блюдо не найдено в меню: ${item.name}`);
        return;
      }
  
      const stockRef = doc(db, "stock", menuItem.id);
      const stockSnap = await getDoc(stockRef);
      if (!stockSnap.exists()) {
        alert(`На складе не найдено: ${item.name}`);
        return;
      }
  
      const stock = stockSnap.data();
      if (stock.quantity < item.quantity) {
        alert(`Недостаточно на складе: ${item.name}`);
        return;
      }
    }
  
    // 🔢 Получаем orderNumber
    const counterRef = doc(db, "counters", "orders");
    const orderNumber = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const lastNumber = counterSnap.exists() ? counterSnap.data().lastOrderNumber || 0 : 0;
      const newNumber = lastNumber + 1;
      transaction.set(counterRef, { lastOrderNumber: newNumber }, { merge: true });
      return newNumber;
    });
  
    // ✅ Создаём заказ с номером
    await addDoc(collection(db, "orders"), {
      orderNumber,
      tableNumber: Number(selectedTable),
      staffId: selectedStaff,
      items: orderItems,
      status: "new",
      createdAt: Timestamp.now(),
    });
  
    for (const item of orderItems) {
      const menuItem = menu.find((m) => m.name === item.name);
      const stockRef = doc(db, "stock", menuItem!.id);
      const stockSnap = await getDoc(stockRef);
      const current = stockSnap.data()!.quantity;
      await updateDoc(stockRef, { quantity: current - item.quantity });
    }
  
    await fetch("/api/sendPush", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Новый заказ",
        body: `Стол #${selectedTable} — ${orderItems.length} блюд`,
        role: "kitchen",
      }),
    });
  
    setShowForm(false);
    setSelectedTable("");
    setSelectedStaff("");
    setOrderItems([]);
  };
      

  const handleMarkReady = async (id: string) => {
    await updateDoc(doc(db, "orders", id), { status: "ready" });
  };

  const handleMarkPaid = async (id: string) => {
    await updateDoc(doc(db, "orders", id), { status: "paid" });
  };

  const renderOrder = (order: Order) => {
    const staffName = staff.find((s) => s.id === order.staffId)?.name || "—";
    const time = order.createdAt.toDate().toLocaleString();
    const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
    return (
      <li key={order.id}   className={`order-item status-${order.status} ${newOrderIds.current.has(order.id) ? "flash" : ""}`}>
        <div><strong>🧾 Заказ №{order.orderNumber}</strong> | {time}</div>
        <div>📍 Стол №{order.tableNumber}</div>
        <div>🍽️ Блюда:</div>
        <ul>
          {order.items.map((item, index) => (
            <li key={index}>• {item.name} ×{item.quantity} — {item.price * item.quantity} ₸</li>
          ))}
        </ul>
        <div>💰 Общая сумма: {total} ₸</div>
        <div>👤 Сотрудник: {staffName}</div>
        {role === "kitchen" && order.status === "new" && (
          <button onClick={() => handleMarkReady(order.id)}>Готово</button>
        )}
        {role === "cashier" && order.status === "ready" && (
          <button onClick={() => handleMarkPaid(order.id)}>Оплачено</button>
        )}
      </li>
    );
  };
  

  return (
    <div className="orders-wrapper">
      <h1>Заказы</h1>
      {role === "cashier" && (
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Скрыть форму" : "+ Добавить заказ"}
        </button>
      )}
      {showForm && (
        <div className="order-form">
          <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
            <option value="">Выберите сотрудника</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input type="number" placeholder="Номер стола" value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)} />
          <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}>
            <option value="">Выберите блюдо</option>
            {menu.map((m) => (
              <option key={m.id} value={m.id}>{m.name} — {m.price}₸</option>
            ))}
          </select>
          <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={1} />
          <button onClick={handleAddItem}>Добавить блюдо</button>
          <ul>
  {orderItems.map((item, idx) => (
    <li key={idx} className="flex justify-between items-center">
      {item.name} x{item.quantity} — {item.price * item.quantity}₸
      <button onClick={() => handleRemoveItem(idx)}>❌</button>
    </li>
  ))}
</ul>
          <div><strong>Итого: {getTotal()} ₸</strong></div>
          <button onClick={handleSubmit}>Сохранить заказ</button>
        </div>
      )}
      <h2>Готовятся</h2>
      <ul>{orders.filter(o => o.status === "new").map(renderOrder)}</ul>
      <h2>Готовы</h2>
      <ul>{orders.filter(o => o.status === "ready").map(renderOrder)}</ul>
      <h2>Архив</h2>
      <ul>{orders.filter(o => o.status === "paid").map(renderOrder)}</ul>
    </div>
  );
}
