// app/admin/logs/page.tsx
"use client";

import LogsPage from "@/components/LogsPage";
import AdminGuard from "@/components/AdminGuard";

export default function AdminLogsPage() {
  return (
    <AdminGuard>
      <LogsPage />
    </AdminGuard>
  );
}
