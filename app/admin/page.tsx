"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  Query,
  DocumentData,
} from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Order {
  status: "new" | "ready" | "paid";
  items: { name: string; price: number; quantity: number }[];
  createdAt: Timestamp;
}

export default function AdminMenuPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSum, setTotalSum] = useState(0);
  const [statusCounts, setStatusCounts] = useState({
    new: 0,
    ready: 0,
    paid: 0,
  });
  const [topDishes, setTopDishes] = useState<{ name: string; count: number }[]>([]);
  const [ordersByDay, setOrdersByDay] = useState<{ date: string; count: number }[]>([]);

  const toTimestamp = (dateStr: string) =>
    Timestamp.fromDate(new Date(dateStr));

  const loadOrderStats = useCallback(async () => {
    const ordersRef = collection(db, "orders");
    let q: Query<DocumentData> = ordersRef;

    if (fromDate && toDate) {
      q = query(
        ordersRef,
        where("createdAt", ">=", toTimestamp(fromDate)),
        where("createdAt", "<=", toTimestamp(toDate))
      );
    }

    const snap = await getDocs(q);
    const orders = snap.docs.map((doc) => doc.data() as Order);

    const total = orders.length;
    let sum = 0;
    const status = { new: 0, ready: 0, paid: 0 };
    const dishMap: Record<string, number> = {};
    const dateMap: Record<string, number> = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        sum += item.price * item.quantity;
        if (!dishMap[item.name]) dishMap[item.name] = 0;
        dishMap[item.name] += item.quantity;
      });

      const dateKey = order.createdAt.toDate().toISOString().split("T")[0];
      dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;

      status[order.status]++;
    });

    const sortedDishes = Object.entries(dishMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const dailyData = Object.entries(dateMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setTotalOrders(total);
    setTotalSum(sum);
    setStatusCounts(status);
    setTopDishes(sortedDishes);
    setOrdersByDay(dailyData);
  }, [fromDate, toDate]);

  useEffect(() => {
    loadOrderStats();
  }, [loadOrderStats]);

  return (
    <div className="admin-report">
      <h1 className="admin-title">📋 Отчет по заказам</h1>

      <div className="date-filters">
        <div>
          <label>От:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label>До:</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button onClick={loadOrderStats}>Обновить</button>
      </div>

      <div className="report-card">
        <p><strong>Всего заказов:</strong> {totalOrders}</p>
        <p><strong>Общая сумма:</strong> {totalSum} ₸</p>
        <div className="status-blocks">
          <div className="status-item status-new">Новые: {statusCounts.new}</div>
          <div className="status-item status-ready">Готовые: {statusCounts.ready}</div>
          <div className="status-item status-paid">Оплаченные: {statusCounts.paid}</div>
        </div>
      </div>

      <div className="report-card">
        <h3 className="mb-2">🍽️ ТОП-3 популярных блюда</h3>
        <ul>
          {topDishes.map((dish, idx) => (
            <li key={idx}>{dish.name} — {dish.count} шт.</li>
          ))}
        </ul>
      </div>

      <div className="report-card">
        <h3 className="mb-2">📊 Заказы по дням</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={ordersByDay}>
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#007bff" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
