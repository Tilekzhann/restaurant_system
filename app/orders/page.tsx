"use client";
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
  getDoc,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "@/firebase/config";
import { logAction } from "@/lib/logAction";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const newOrderIds = useRef<Set<string>>(new Set());

  // === AUTH + ROLE ===
  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const { getUserRole } = await import("@/lib/auth");
      const r = await getUserRole(user.uid);
      setRole(r as "admin" | "cashier" | "kitchen");
    });
  }, []);

  // === FIRESTORE SUBSCRIPTIONS ===
  useEffect(() => {
    const unsubOrders = onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Order[];
        setOrders(list);
      }
    );
    const unsubMenu = onSnapshot(collection(db, "menu"), (snap) => {
      setMenu(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)));
    });
    const unsubStaff = onSnapshot(collection(db, "staff"), (snap) => {
      setStaff(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StaffMember)));
    });
    return () => {
      unsubOrders();
      unsubMenu();
      unsubStaff();
    };
  }, []);

  // === HANDLERS ===
  const getTotal = () => orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleAddItem = (item: MenuItem) => {
    const existing = orderItems.find((i) => i.name === item.name);
    if (existing) {
      setOrderItems(orderItems.map((i) =>
        i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setOrderItems([...orderItems, { name: item.name, price: item.price, quantity: 1 }]);
    }
    setMenuPopup(false);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedTable || !selectedStaff || orderItems.length === 0) {
      setMessage("❗ Заполните все поля и добавьте блюда.");
      return;
    }

    const counterRef = doc(db, "counters", "orders");
    const orderNumber = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const last = snap.exists() ? snap.data().lastOrderNumber || 0 : 0;
      const next = last + 1;
      tx.set(counterRef, { lastOrderNumber: next }, { merge: true });
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
    await logAction("create_order", "order", orderNumber.toString(), `Создан заказ для стола ${selectedTable}`);

    setMessage("✅ Заказ успешно создан!");
    setShowForm(false);
    setSelectedStaff("");
    setSelectedTable("");
    setOrderItems([]);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleMarkReady = async (id: string) => {
    await updateDoc(doc(db, "orders", id), { status: "ready" });
    await logAction("mark_ready", "order", id, "Заказ готов");
  };

  const handleMarkPaid = async (id: string) => {
    await updateDoc(doc(db, "orders", id), { status: "paid" });
    await logAction("mark_paid", "order", id, "Заказ оплачен");
  };

  const handleAddToOrder = (order: Order) => {
    setActiveOrder(order);
    setOrderItems(order.items);
    setSelectedTable(order.tableNumber.toString());
    setSelectedStaff(order.staffId);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // === RENDER ORDER ===
  const renderOrder = (order: Order) => {
    const staffName = staff.find((s) => s.id === order.staffId)?.name || "—";
    const time = order.createdAt.toDate().toLocaleString();
    const total = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return (
      <li key={order.id} className={`order-item status-${order.status}`}>
        <div><strong>🧾 Заказ №{order.orderNumber}</strong> | {time}</div>
        <div>📍 Стол №{order.tableNumber}</div>
        <div>Сотрудник: {staffName}</div>
        <ul>
          {order.items.map((i, idx) => (
            <li key={idx}>{i.name} ×{i.quantity} — {i.price * i.quantity} ₸</li>
          ))}
        </ul>
        <div><strong>Итого: {total} ₸</strong></div>
        <div className="order-actions">
          {role === "kitchen" && order.status === "new" && (
            <button onClick={() => handleMarkReady(order.id)}>Готово</button>
          )}
          {role === "cashier" && order.status === "ready" && (
            <button onClick={() => handleMarkPaid(order.id)}>Оплачено</button>
          )}
          {role !== "kitchen" && (
            <button
              onClick={() => {
                setActiveOrder(order);
                setTimeout(() => setShowReceipt(true), 0); // 🔧 фикс для показа чека
              }}
            >
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
      {message && <div className="order-message">{message}</div>}
      <h1>Заказы</h1>

      {role === "cashier" && (
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Скрыть форму" : "+ Добавить заказ"}
        </button>
      )}

      {showForm && (
        <div className="order-form card" ref={formRef}>
          <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
            <option value="">Выберите сотрудника</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            type="number"
            placeholder="Номер стола"
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
          />
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
                  <button className={!selectedCategory ? "active" : ""} onClick={() => setSelectedCategory("")}>Все</button>
                  {[...new Set(menu.map((i) => i.category))].map((cat) => (
                    <button key={cat} className={selectedCategory === cat ? "active" : ""} onClick={() => setSelectedCategory(cat!)}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="menu-grid">
                  {menu
                    .filter((i) =>
                      i.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                      (!selectedCategory || i.category === selectedCategory)
                    )
                    .map((item) => (
                      <div key={item.id} className="menu-card">
                        <div className="menu-title">{item.name}</div>
                        <div className="menu-price">{item.price} ₸</div>
                        <button onClick={() => handleAddItem(item)}>➕</button>
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
                <span>{item.name}</span>
                <div className="qty-controls">
                  <button onClick={() => {
                    const updated = [...orderItems];
                    if (updated[idx].quantity > 1) updated[idx].quantity--;
                    setOrderItems(updated);
                  }}>➖</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => {
                    const updated = [...orderItems];
                    updated[idx].quantity++;
                    setOrderItems(updated);
                  }}>➕</button>
                </div>
                <span>{item.price * item.quantity} ₸</span>
                <button onClick={() => handleRemoveItem(idx)}>❌</button>
              </li>
            ))}
          </ul>

          <strong>Итого: {getTotal()} ₸</strong>
          <button onClick={handleSubmit}>Сохранить заказ</button>
        </div>
      )}

      {/* ====== Списки ====== */}
      <div className="order-section"><h2>Готовятся</h2><ul>{orders.filter(o => o.status === "new").map(renderOrder)}</ul></div>
      <div className="order-section"><h2>Готовы</h2><ul>{orders.filter(o => o.status === "ready").map(renderOrder)}</ul></div>
      <div className="order-section">
        <h2 onClick={() => setShowArchive(!showArchive)} style={{ cursor: "pointer" }}>
          {showArchive ? "▼ Архив" : "► Архив"}
        </h2>
        {showArchive && <ul>{orders.filter(o => o.status === "paid").map(renderOrder)}</ul>}
      </div>

      {/* ====== Чек ====== */}
      {showReceipt && activeOrder && (
        <div className="receipt-backdrop" onClick={() => setShowReceipt(false)}>
          <div className="receipt-content" onClick={(e) => e.stopPropagation()}>
            <p><strong>Заказ №{activeOrder.orderNumber}</strong> | {activeOrder.createdAt.toDate().toLocaleString()}</p>
            <p>Стол №{activeOrder.tableNumber}</p>
            <hr />
            <ul>
              {activeOrder.items.map((i, idx) => (
                <li key={idx}>{i.name} ×{i.quantity} — {i.price * i.quantity} ₸</li>
              ))}
            </ul>
            <hr />
            <p><strong>Итого: {activeOrder.items.reduce((s, i) => s + i.price * i.quantity, 0)} ₸</strong></p>
            <p>Сотрудник: {staff.find((s) => s.id === activeOrder.staffId)?.name || "—"}</p>
            <button onClick={() => setShowReceipt(false)}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}
