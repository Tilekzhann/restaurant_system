// app/admin/logs/page.tsx
import AdminGuard from "@/components/AdminGuard";
import LogsPage from "@/components/LogsPage";

export default function AdminLogsPage() {
  return (
    <AdminGuard>
      <LogsPage />
    </AdminGuard>
  );
}
