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
  orderNumber: number;
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
  category?: string;
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
  const [menuPopup, setMenuPopup] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const newOrderIds = useRef<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

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
                    vapidKey: "BDBoBvrgB82hODNhc7N-HltXErs6FPaq3AbMw5xHezEbTmfcuMAdfuzY16OXXqGi8YXUjoaPGugAqM2MYNhzsks",
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

  const handleAddItem = (item: MenuItem) => {
    const existing = orderItems.find((i) => i.name === item.name);
    if (existing) {
      setOrderItems(orderItems.map((i) =>
        i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setOrderItems([...orderItems, { name: item.name, price: item.price, quantity: 1 }]);
    }
    setMenuPopup(false); // Закрыть модалку после выбора
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getTotal = () =>
    orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async () => {
    if (!selectedTable || !selectedStaff || orderItems.length === 0) {
      setMessage("❗ Заполните все поля и добавьте блюда.");
      setTimeout(() => setMessage(null), 3000);
      return;
    }
  
    // Проверка склада
    for (const item of orderItems) {
      const menuItem = menu.find((m) => m.name === item.name);
      if (!menuItem) {
        setMessage(`❗ Блюдо не найдено: ${item.name}`);
        setTimeout(() => setMessage(null), 3000);
        return;
      }
  
      const stockRef = doc(db, "stock", menuItem.id);
      const stockSnap = await getDoc(stockRef);
      if (!stockSnap.exists()) {
        setMessage(`❗ На складе не найдено: ${item.name}`);
        setTimeout(() => setMessage(null), 3000);
        return;
      }
  
      const stock = stockSnap.data();
      if (stock.quantity < item.quantity) {
        setMessage(`❗ Недостаточно на складе: ${item.name}`);
        setTimeout(() => setMessage(null), 3000);
        return;
      }
    }
  
    if (activeOrder) {
      // Обновление существующего заказа
      await updateDoc(doc(db, "orders", activeOrder.id), {
        items: orderItems,
      });
      setMessage("✅ Заказ успешно обновлён!");
    } else {
      // Создание нового
      const counterRef = doc(db, "counters", "orders");
      const orderNumber = await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        const last = counterSnap.exists() ? counterSnap.data().lastOrderNumber || 0 : 0;
        const next = last + 1;
        transaction.set(counterRef, { lastOrderNumber: next }, { merge: true });
        return next;
      });
  
      await addDoc(collection(db, "orders"), {
        orderNumber,
        tableNumber: Number(selectedTable),
        staffId: selectedStaff,
        items: orderItems,
        status: "new",
        createdAt: Timestamp.now(),
      });
  
      setMessage("✅ Заказ успешно создан!");
    }
  
    // Уменьшение количества на складе
    for (const item of orderItems) {
      const menuItem = menu.find((m) => m.name === item.name)!;
      const stockRef = doc(db, "stock", menuItem.id);
      const stockSnap = await getDoc(stockRef);
      const current = stockSnap.data()!.quantity;
      await updateDoc(stockRef, { quantity: current - item.quantity });
    }
  
    // Сброс формы
    setShowForm(false);
    setSelectedTable("");
    setSelectedStaff("");
    setOrderItems([]);
    setActiveOrder(null);
  
    // Очистка сообщения через 3 секунды
    setTimeout(() => setMessage(null), 3000);
  };
    

  const handleMarkReady = async (id: string) => {
    await updateDoc(doc(db, "orders", id), { status: "ready" });
  };

  const handleMarkPaid = async (id: string) => {
    await updateDoc(doc(db, "orders", id), { status: "paid" });
  };
  const handleAddToOrder = (order: Order) => {
    setActiveOrder(order);
    setOrderItems(order.items); 
    setSelectedTable(order.tableNumber.toString());
    setSelectedStaff(order.staffId);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100); 
  };
  
  const renderOrder = (order: Order) => {
    const staffName = staff.find((s) => s.id === order.staffId)?.name || "—";
    const time = order.createdAt.toDate().toLocaleString();
    const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
      <li key={order.id} className={`order-item status-${order.status} ${newOrderIds.current.has(order.id) ? "flash" : ""}`}>
        <div><strong>🧾 Заказ №{order.orderNumber}</strong> | {time}</div>
        <div>📍Стол №{order.tableNumber}</div>
        <div>Блюда:</div>
        <ul>
          {order.items.map((item, index) => (
            <li key={index}>{item.name} ×{item.quantity} — {item.price * item.quantity} ₸</li>
          ))}
        </ul>
        <div>Общая сумма: {total} ₸</div>
        <div>Сотрудник: {staffName}</div>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
        {role === "kitchen" && order.status === "new" && (
          <button onClick={() => handleMarkReady(order.id)}>Готово</button>
        )}
        {role === "cashier" && order.status === "ready" && (
          <button onClick={() => handleMarkPaid(order.id)}>Оплачено</button>
        )}
        {role === "cashier" && order.status === "new" && (
          <button onClick={() => handleMarkReady(order.id)}>Готово</button>
        )}
        {role !== "kitchen" && (
          <button onClick={() => { setActiveOrder(order); setShowReceipt(true); }}>
            Показать чек
          </button>
        )}
        {(order.status === "new" || order.status === "ready") && role === "cashier" && (
          <button onClick={() => handleAddToOrder(order)}>Добавить в заказ</button>
        )}
      </div>
      </li>
    );
  };

  return (
    <div className="orders-wrapper">
      {message && (
          <div className="order-message">
            {message}
          </div>
        )}
      <h1>Заказы</h1>
      {role === "cashier" && (
       <button onClick={() => setShowForm((prev) => !prev)}>
       {showForm ? "Скрыть форму" : "+ Добавить заказ"}
     </button>     
      )}
      {showForm && (
          <div className="order-form" ref={formRef}>
          <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
            <option value="">Выберите сотрудника</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input type="number" placeholder="Номер стола" value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)} />
          <button onClick={() => setMenuPopup(true)}>Открыть меню</button>

          {menuPopup && (
  <div className="menu-modal">
    <div className="menu-popup-content">
      <input
        type="text"
        className="menu-search"
        placeholder="🔍 Поиск блюда..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="menu-categories">
        <button
          className={selectedCategory === "" ? "active" : ""}
          onClick={() => setSelectedCategory("")}
        >
          Все
        </button>
        {[...new Set(menu.map((item) => item.category))].map((cat) => (
          <button
            key={cat}
            className={selectedCategory === cat ? "active" : ""}
            onClick={() => setSelectedCategory(cat!)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="menu-grid">
        {menu
          .filter((item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (selectedCategory === "" || item.category === selectedCategory)
          )
          .map((item) => (
            <div key={item.id} className="menu-card">
              <div className="menu-title">{item.name}</div>
              <div className="menu-price">{item.price} ₸</div>
              <button onClick={() => {
                handleAddItem(item);
                setMenuPopup(false); // Автоматически закрываем
              }}>➕</button>
            </div>
          ))}
      </div>

      <button onClick={() => setMenuPopup(false)}>Закрыть</button>
    </div>
  </div>
)}
<ul className="order-items-list">
  {orderItems.map((item, idx) => (
    <li key={idx} className="order-item-row">
      <span className="order-item-name">{item.name}</span>

      <div className="qty-controls">
        <button
          className="qty-btn"
          onClick={() => {
            const updated = [...orderItems];
            if (updated[idx].quantity > 1) updated[idx].quantity -= 1;
            setOrderItems(updated);
          }}
        >
          ➖
        </button>

        <span className="qty-value">{item.quantity}</span>

        <button
          className="qty-btn"
          onClick={() => {
            const updated = [...orderItems];
            updated[idx].quantity += 1;
            setOrderItems(updated);
          }}
        >
          ➕
        </button>
      </div>

      <span className="order-item-price">{item.price * item.quantity} ₸</span>

      <button onClick={() => handleRemoveItem(idx)} className="order-remove-btn">
        ❌
      </button>
    </li>
  ))}
</ul>

          <div><strong>Итого: {getTotal()} ₸</strong></div>
          <button onClick={handleSubmit}>Сохранить заказ</button>
        </div>
      )}
      
  <div className="order-lists-wrapper">

<div className="order-section">
  <h2>Готовятся</h2>
  <ul>{orders.filter(o => o.status === "new").map(renderOrder)}</ul>
</div>

<div className="order-section">
  <h2>Готовы</h2>
  <ul>{orders.filter(o => o.status === "ready").map(renderOrder)}</ul>
</div>

<div className="order-section">
  <h2
    onClick={() => setShowArchive(!showArchive)}
    style={{ cursor: "pointer", userSelect: "none" }}
  >
    {showArchive ? "▼ Архив" : "► Архив"}
  </h2>
  {showArchive && (
    <ul>{orders.filter(o => o.status === "paid").map(renderOrder)}</ul>
  )}
</div>
</div>
{showReceipt && activeOrder && (
  <div className="receipt-backdrop" onClick={() => setShowReceipt(false)}>
    <div className="receipt-content" onClick={(e) => e.stopPropagation()}>
      <p><strong>Заказ №{activeOrder.orderNumber}</strong> | {activeOrder.createdAt.toDate().toLocaleString()}</p>
      <hr />
      <p>Стол №{activeOrder.tableNumber}</p>
      <hr />
      <p>Блюда:</p>
      <ul>
        {activeOrder.items.map((item, i) => (
          <li key={i}>
            {item.name} ×{item.quantity} — {item.price * item.quantity} ₸
          </li>
        ))}
      </ul>
      <hr />
      <p>Общая сумма: {activeOrder.items.reduce((sum, i) => sum + i.price * i.quantity, 0)} ₸</p>
      <p>Сотрудник: {staff.find(s => s.id === activeOrder.staffId)?.name || "—"}</p>
      <hr />
      <button onClick={() => setShowReceipt(false)}>Закрыть</button>
    </div>
  </div>
)}

 </div>
  );
}