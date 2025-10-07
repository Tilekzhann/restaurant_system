"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/config";
import { useRouter } from "next/navigation";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { getUserRole } from "@/lib/auth";
import LogsPage from "@/components/LogsPage";
import AdminGuard from "@/components/AdminGuard";

export default function AdminLogsPage() {
  const router = useRouter();

  return (
    <AdminGuard>
      <LogsPage />
    </AdminGuard>
  );
}
