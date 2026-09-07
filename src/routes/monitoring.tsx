import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MonitoringPanel } from "@/components/MonitoringPanel";
import { useAuth } from "@/lib/auth";

// Admin diarahkan ke tab Monitoring di /pengembalian; akun non-admin
// mendapatkan halaman Monitoring tersendiri (terpisah dari Pengembalian).
export const Route = createFileRoute("/monitoring")({
  head: () => ({ meta: [{ title: "Monitoring Peminjaman — BPN Jakarta Barat" }] }),
  component: MonitoringPage,
});

function MonitoringPage() {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <Navigate to="/pengembalian" search={{ tab: "monitoring" }} />;
  }

  return (
    <AppShell
      title="Monitoring Peminjaman"
      subtitle="Pantau status peminjaman dan pengembalian warkah"
    >
      <MonitoringPanel />
    </AppShell>
  );
}
