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

interface Order {
  status: "new" | "ready" | "paid";
  items: { price: number; quantity: number }[];
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

    orders.forEach((order) => {
      order.items.forEach((item) => {
        sum += item.price * item.quantity;
      });
      status[order.status]++;
    });

    setTotalOrders(total);
    setTotalSum(sum);
    setStatusCounts(status);
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
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div>
          <label>До:</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button onClick={loadOrderStats}>Обновить</button>
      </div>

      <div className="report-card">
        <p>
          <strong>Всего заказов:</strong> {totalOrders}
        </p>
        <p>
          <strong>Общая сумма:</strong> {totalSum} ₸
        </p>
        <div className="status-blocks">
          <div className="status-item status-new">
            Новые: {statusCounts.new}
          </div>
          <div className="status-item status-ready">
            Готовые: {statusCounts.ready}
          </div>
          <div className="status-item status-paid">
            Оплаченные: {statusCounts.paid}
          </div>
        </div>
      </div>
    </div>
  );
}
