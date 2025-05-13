// app/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/config";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
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

  useEffect(() => {
    import("firebase/auth").then(({ getAuth, onAuthStateChanged }) => {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const { getUserRole } = await import("@/lib/auth");
          const r = await getUserRole(user.uid);
          setRole(r as "admin" | "cashier" | "kitchen");
        }
      });
    });
    fetchData();
  }, []);

  const fetchData = async () => {
    const ordersSnap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
    const menuSnap = await getDocs(collection(db, "menu"));
    const staffSnap = await getDocs(collection(db, "staff"));
    setOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    setMenu(menuSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    setStaff(staffSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));
  };

  const handleAddItem = () => {
    if (!selectedItem || quantity < 1) return;
    const item = menu.find(m => m.id === selectedItem);
    if (item) {
      setOrderItems([...orderItems, { name: item.name, price: item.price, quantity }]);
      setSelectedItem("");
      setQuantity(1);
    }
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const getTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleSubmit = async () => {
    if (!selectedTable || !selectedStaff || orderItems.length === 0) return;
    await addDoc(collection(db, "orders"), {
      tableNumber: Number(selectedTable),
      staffId: selectedStaff,
      items: orderItems,
      status: "new",
      createdAt: Timestamp.now(),
    });
    setShowForm(false);
    setSelectedTable("");
    setSelectedStaff("");
    setOrderItems([]);
    fetchData();
  };

  const handleMarkReady = async (id: string) => {
    await updateDoc(doc(db, "orders", id), { status: "ready" });
    fetchData();
  };

  const handleMarkPaid = async (id: string) => {
    await updateDoc(doc(db, "orders", id), { status: "paid" });
    fetchData();
  };

  const renderOrder = (order: Order) => {
    const staffName = staff.find(s => s.id === order.staffId)?.name || "—";
    const time = order.createdAt.toDate().toLocaleString();
    const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
      <li key={order.id} className="order-item">
        <div><strong>Стол #{order.tableNumber}</strong> — {order.items.map(i => `${i.name} x${i.quantity}`).join(", ")}</div>
        <div>Сотрудник: {staffName}</div>
        <div>Сумма: {total} ₸</div>
        <div>Создан: {time}</div>
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

      {(role === "cashier") && (
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Скрыть форму" : "+ Добавить заказ"}
        </button>
      )}

      {showForm && (
        <div className="order-form">
          <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
            <option value="">Выберите сотрудника</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <input
            type="number"
            placeholder="Номер стола"
            value={selectedTable}
            onChange={e => setSelectedTable(e.target.value)}
          />

          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)}>
            <option value="">Выберите блюдо</option>
            {menu.map(m => <option key={m.id} value={m.id}>{m.name} — {m.price}₸</option>)}
          </select>

          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
            min={1}
          />

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
      <ul>{[...orders.filter(o => o.status === "new")].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds).map(renderOrder)}</ul>

      <h2>Готовы</h2>
      <ul>{[...orders.filter(o => o.status === "ready")].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds).map(renderOrder)}</ul>

      <h2>Архив</h2>
      <ul>{[...orders.filter(o => o.status === "paid")].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds).map(renderOrder)}</ul>
    </div>
  );
}
