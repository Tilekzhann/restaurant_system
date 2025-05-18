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
  const [showOrders, setShowOrders] = useState(true);

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
    if (!selectedTable || !selectedStaff || orderItems.length === 0) return;
    for (const item of orderItems) {
      const menuItem = menu.find((m) => m.name === item.name);
      if (!menuItem) return alert(`Блюдо не найдено: ${item.name}`);
      const stockRef = doc(db, "stock", menuItem.id);
      const stockSnap = await getDoc(stockRef);
      if (!stockSnap.exists()) return alert(`На складе не найдено: ${item.name}`);
      const stock = stockSnap.data();
      if (stock.quantity < item.quantity) return alert(`Недостаточно на складе: ${item.name}`);
    }

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

    for (const item of orderItems) {
      const menuItem = menu.find((m) => m.name === item.name)!;
      const stockRef = doc(db, "stock", menuItem.id);
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
    setTimeout(() => {
      setShowOrders(true); 
    }, 300); 
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
        {role === "kitchen" && order.status === "new" && <button onClick={() => handleMarkReady(order.id)}>Готово</button>}
        {role === "cashier" && order.status === "ready" && <button onClick={() => handleMarkPaid(order.id)}>Оплачено</button>}
        {role === "cashier" && order.status === "new" && <button onClick={() => handleMarkPaid(order.id)}>Готово</button>}
      </li>
    );
  };

  return (
    <div className="orders-wrapper">
      <h1>Заказы</h1>
      {role === "cashier" && (
        <button
        onClick={() => {
          if (!showForm) {
            setShowOrders(false);
            setTimeout(() => setShowForm(true), 300); // сначала скрыть заказы
          } else {
            setShowForm(false);
            setTimeout(() => setShowOrders(true), 300); // потом снова показать заказы
          }
        }}
      >
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
     {showOrders && (
  <div className={`order-lists-wrapper ${showForm ? "fade-out" : "fade-in"}`}>
    <h2>Готовятся</h2>
    <ul>{orders.filter(o => o.status === "new").map(renderOrder)}</ul>

    <h2>Готовы</h2>
    <ul>{orders.filter(o => o.status === "ready").map(renderOrder)}</ul>

    <h2
      onClick={() => setShowArchive(!showArchive)}
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      {showArchive ? "▼ Архив" : "► Архив"}
    </h2>

    {showArchive && <ul>{orders.filter(o => o.status === "paid").map(renderOrder)}</ul>}
  </div>
)}
 </div>
  );
}