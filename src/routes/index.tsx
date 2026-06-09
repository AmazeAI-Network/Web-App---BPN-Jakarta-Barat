import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  PackageCheck,
  Handshake,
  Undo2,
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  FileEdit,
  Loader2,
  TrendingUp,
  Clock,
  Users,
  BookOpen,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import {
  usePeminjaman,
  STATUS_LIST,
  statusBadgeClasses,
  type StatusPeminjaman,
  type Peminjaman,
} from "@/lib/peminjaman-store";
import { useAuth } from "@/lib/auth";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Kantor Pertanahan Jakarta Barat" },
      { name: "description", content: "Dashboard Sistem Peminjaman Warkah BPN Jakarta Barat" },
    ],
  }),
  component: DashboardPage,
});

const STATUS_META: Record<
  StatusPeminjaman,
  { icon: typeof Search; tone: string; ring: string; desc: string }
> = {
  "Proses Pencarian": {
    icon: Search,
    tone: "text-warning",
    ring: "bg-warning/10",
    desc: "Berkas sedang dicari di gudang arsip",
  },
  "Siap Diserahkan": {
    icon: PackageCheck,
    tone: "text-info",
    ring: "bg-info/10",
    desc: "Telah diverifikasi & siap dikonfirmasi",
  },
  "Sedang Dipinjam": {
    icon: Handshake,
    tone: "text-primary",
    ring: "bg-primary/10",
    desc: "Berkas dipegang peminjam",
  },
  "Proses Dikembalikan": {
    icon: Undo2,
    tone: "text-warning",
    ring: "bg-warning/10",
    desc: "Petugas loket menandai berkas akan dikembalikan",
  },
  "Sudah Dikembalikan": {
    icon: Undo2,
    tone: "text-success",
    ring: "bg-success/10",
    desc: "Telah diverifikasi & diarsip",
  },
  "Pengembalian Diterima": {
    icon: Undo2,
    tone: "text-success",
    ring: "bg-success/10",
    desc: "Pengembalian diterima & diarsip",
  },
  "Diamankan": {
    icon: Handshake,
    tone: "text-primary",
    ring: "bg-primary/10",
    desc: "Berkas pengamanan tersimpan",
  },
  "Dikembalikan": {
    icon: Undo2,
    tone: "text-success",
    ring: "bg-success/10",
    desc: "Berkas pengamanan dikembalikan",
  },
};

function hoursBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 36e5;
}

function formatDuration(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} mnt`;
  if (hours < 24) return `${hours.toFixed(1)} jam`;
  return `${(hours / 24).toFixed(1)} hari`;
}

function DashboardPage() {
  const { items, loading, notifPermission, requestNotificationPermission } = usePeminjaman();
  const { user } = useAuth();
  const role = user?.role ?? "petugas_loket";
  const visibleItems = useMemo(() => {
    if (role === "admin") return items;
    if (!user) return [];
    return items.filter((p) => p.createdBy === user.username || p.createdBy === user.name);
  }, [items, role, user]);

  const counts = useMemo(() => {
    const c: Record<StatusPeminjaman, number> = {
      "Proses Pencarian": 0,
      "Siap Diserahkan": 0,
      "Sedang Dipinjam": 0,
      "Proses Dikembalikan": 0,
      "Sudah Dikembalikan": 0,
      "Pengembalian Diterima": 0,
      "Diamankan": 0,
      "Dikembalikan": 0,
    };
    visibleItems.forEach((p) => {
      c[p.status]++;
    });
    return c;
  }, [visibleItems]);

  const visibleStatuses: StatusPeminjaman[] =
    role === "verifikator"
      ? ["Proses Pencarian", "Siap Diserahkan"]
      : role === "petugas_loket"
        ? ["Siap Diserahkan", "Sedang Dipinjam", "Sudah Dikembalikan"]
        : STATUS_LIST;

  const quickActions =
    role === "admin"
      ? [
          {
            to: "/peminjaman/konfirmasi",
            label: "Konfirmasi Akhir",
            icon: CheckCircle2,
            count: counts["Siap Diserahkan"],
          },
          { to: "/monitoring", label: "Monitoring Peminjaman", icon: Activity, count: visibleItems.length },
          { to: "/peminjaman/pengamanan", label: "Pengamanan", icon: Activity, count: 0 },
        ]
      : role === "verifikator"
        ? [
            {
              to: "/peminjaman/verifikasi",
              label: "Antrian Verifikasi",
              icon: CheckCircle2,
              count: counts["Proses Pencarian"],
            },
          ]
        : [
            { to: "/peminjaman/register", label: "Buat Pengajuan Baru", icon: FileEdit, count: 0 },
            {
              to: "/monitoring",
              label: "Monitoring Peminjaman",
              icon: Activity,
              count: 0,
            },
          ];

  const greeting = `Selamat datang, ${user?.name.split(",")[0] ?? ""}`;
  const subtitle =
    role === "admin"
      ? "Ringkasan keseluruhan aktivitas peminjaman warkah"
      : role === "verifikator"
        ? "Tugas Anda: memverifikasi pengajuan peminjaman warkah"
        : "Tugas Anda: menginput pengajuan & menyerahkan warkah";

  return (
    <AppShell title={greeting} subtitle={subtitle}>
      <div className="space-y-6">
        {notifPermission !== "granted" && notifPermission !== "unsupported" && (
          <Card className="border-info/40 bg-info/5 shadow-card">
            <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-info/15 p-2 text-info">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Aktifkan notifikasi browser
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Anda akan menerima pop-up status berkas meski tab tidak aktif.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => void requestNotificationPermission()}
                className="gap-1.5"
              >
                <Bell className="h-4 w-4" /> Aktifkan
              </Button>
            </CardContent>
          </Card>
        )}

        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
            visibleStatuses.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
          }`}
        >
          {visibleStatuses.map((s) => {
            const meta = STATUS_META[s];
            const Icon = meta.icon;
            return (
              <Card key={s} className="shadow-card transition-shadow hover:shadow-elegant">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {s}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-foreground">{counts[s]}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{meta.desc}</p>
                    </div>
                    <div className={`rounded-lg p-2.5 ${meta.ring} ${meta.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ========== ADMIN-ONLY DETAILED PANELS ========== */}
        {role === "admin" && <AdminInsights items={items} loading={loading} />}

        {/* Quick actions per role */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to}
                className="group flex items-center gap-4 rounded-lg border bg-card p-4 shadow-card transition-all hover:border-primary/40 hover:shadow-elegant"
              >
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{a.label}</p>
                  {a.count > 0 && (
                    <p className="text-xs text-muted-foreground">{a.count} berkas menunggu</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>

        {/* ========== ADMIN: PROSES PENCARIAN TABLE ========== */}
        {role === "admin" && <ProsesPencarianTable items={items} loading={loading} />}

        {/* Recent activity (semua role) */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-primary" />
              Aktivitas Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat data dari database...
              </div>
            ) : items.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Belum ada data peminjaman.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">No. Register</th>
                      <th className="px-5 py-3 text-left font-semibold">Peminjam</th>
                      <th className="px-5 py-3 text-left font-semibold">Kegiatan</th>
                      <th className="px-5 py-3 text-left font-semibold">Status</th>
                      <th className="px-5 py-3 text-left font-semibold">Diperbarui</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...items]
                      .sort((a, b) => (a.tglUpdate < b.tglUpdate ? 1 : -1))
                      .slice(0, 6)
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-muted/30">
                          <td className="px-5 py-3 font-mono text-xs font-semibold text-primary">
                            {r.noRegister}
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-medium">{r.peminjam}</p>
                            <p className="text-[11px] text-muted-foreground">{r.email}</p>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{r.kegiatan}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClasses(
                                r.status,
                              )}`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">
                            {new Date(r.tglUpdate).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

/* ============================================================
 * Admin: Insights ringkas (KPI rinci, top peminjam/kegiatan, tren 7 hari)
 * ============================================================ */
function AdminInsights({ items, loading }: { items: Peminjaman[]; loading: boolean }) {
  const insights = useMemo(() => {
    const now = Date.now();
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);

    const todayCount = items.filter((p) => new Date(p.tglPengajuan) >= today0).length;
    const weekAgo = now - 7 * 86400000;
    const weekCount = items.filter((p) => new Date(p.tglPengajuan).getTime() >= weekAgo).length;

    const pencarian = items.filter((p) => p.status === "Proses Pencarian");
    const overdueSearch = pencarian.filter(
      (p) => hoursBetween(p.tglPengajuan, new Date().toISOString()) > 24,
    ).length;

    const sedangDipinjam = items.filter((p) => p.status === "Sedang Dipinjam");
    const overdueReturn = sedangDipinjam.filter(
      (p) => hoursBetween(p.tglUpdate, new Date().toISOString()) > 24 * 7,
    ).length;

    // avg processing time: pengajuan -> "Siap Diserahkan" (pakai tglUpdate sebagai proxy)
    const ready = items.filter((p) =>
      ["Siap Diserahkan", "Sedang Dipinjam", "Sudah Dikembalikan"].includes(p.status),
    );
    const avgReadyHours =
      ready.length === 0
        ? 0
        : ready.reduce((s, p) => s + Math.max(0, hoursBetween(p.tglPengajuan, p.tglUpdate)), 0) /
          ready.length;

    const completed = items.filter((p) => p.status === "Sudah Dikembalikan").length;
    const completionRate = items.length === 0 ? 0 : (completed / items.length) * 100;

    // top peminjam
    const peminjamMap = new Map<string, number>();
    items.forEach((p) => peminjamMap.set(p.peminjam, (peminjamMap.get(p.peminjam) ?? 0) + 1));
    const topPeminjam = [...peminjamMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // top kegiatan
    const kegMap = new Map<string, number>();
    items.forEach((p) => kegMap.set(p.kegiatan, (kegMap.get(p.kegiatan) ?? 0) + 1));
    const topKegiatan = [...kegMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    // tren 7 hari
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const c = items.filter((p) => {
        const t = new Date(p.tglPengajuan).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      days.push({
        label: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
        count: c,
      });
    }
    const maxDay = Math.max(1, ...days.map((d) => d.count));

    return {
      todayCount,
      weekCount,
      overdueSearch,
      overdueReturn,
      avgReadyHours,
      completionRate,
      topPeminjam,
      topKegiatan,
      days,
      maxDay,
    };
  }, [items]);

  const kpis = [
    {
      label: "Pengajuan Hari Ini",
      value: insights.todayCount,
      icon: Calendar,
      tone: "text-primary",
      bg: "bg-primary/10",
      hint: `${insights.weekCount} dalam 7 hari`,
    },
    {
      label: "Avg. Waktu Pencarian",
      value: insights.avgReadyHours > 0 ? formatDuration(insights.avgReadyHours) : "—",
      icon: Clock,
      tone: "text-info",
      bg: "bg-info/10",
      hint: "Pengajuan → Siap Diserahkan",
    },
    {
      label: "Tingkat Penyelesaian",
      value: `${insights.completionRate.toFixed(0)}%`,
      icon: TrendingUp,
      tone: "text-success",
      bg: "bg-success/10",
      hint: "Berkas dikembalikan / total",
    },
    {
      label: "Berkas Terlambat",
      value: insights.overdueSearch + insights.overdueReturn,
      icon: AlertTriangle,
      tone: "text-destructive",
      bg: "bg-destructive/10",
      hint: `${insights.overdueSearch} pencarian · ${insights.overdueReturn} pengembalian`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI rinci */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="shadow-card">
              <CardContent className="flex items-start justify-between p-5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{k.value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{k.hint}</p>
                </div>
                <div className={`rounded-lg p-2.5 ${k.bg} ${k.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tren 7 hari + Top lists */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tren 7 Hari Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat...
              </div>
            ) : (
              <div className="flex h-48 items-end justify-between gap-2">
                {insights.days.map((d) => {
                  const h = (d.count / insights.maxDay) * 100;
                  return (
                    <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <p className="text-[10px] font-semibold text-foreground">{d.count}</p>
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-primary to-primary/60 transition-all"
                        style={{ height: `${Math.max(4, h * 0.6)}%` }}
                        title={`${d.count} pengajuan`}
                      />
                      <p className="whitespace-nowrap text-[10px] leading-tight text-muted-foreground">
                        {d.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              Top Peminjam
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.topPeminjam.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Belum ada data</p>
            ) : (
              insights.topPeminjam.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {name}
                  </p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                    {count}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-primary" />
              Kegiatan Terbanyak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.topKegiatan.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Belum ada data</p>
            ) : (
              insights.topKegiatan.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-info/10 text-xs font-bold text-info">
                    {i + 1}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {name}
                  </p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                    {count}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
 * Admin: Tabel Proses Pencarian (semua berkas yang sedang dicari)
 * ============================================================ */
function ProsesPencarianTable({ items, loading }: { items: Peminjaman[]; loading: boolean }) {
  const rows = useMemo(
    () =>
      items
        .filter((p) => p.status === "Proses Pencarian")
        .sort((a, b) => (a.tglPengajuan < b.tglPengajuan ? 1 : -1)),
    [items],
  );

  return (
    <Card className="border-warning/30 shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-5 w-5 text-warning" />
          Proses Pencarian
          <span className="ml-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
            {rows.length}
          </span>
        </CardTitle>
        <Link
          to="/monitoring"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Lihat semua <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
          </div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            Tidak ada berkas dalam proses pencarian.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">No. Register</th>
                  <th className="px-5 py-3 text-left font-semibold">Peminjam</th>
                  <th className="px-5 py-3 text-left font-semibold">Kegiatan</th>
                  <th className="px-5 py-3 text-left font-semibold">No. Hak / Jenis</th>
                  <th className="px-5 py-3 text-left font-semibold">Lokasi</th>
                  <th className="px-5 py-3 text-left font-semibold">Diajukan</th>
                  <th className="px-5 py-3 text-left font-semibold">Lama</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 10).map((r) => {
                  const elapsed = hoursBetween(r.tglPengajuan, new Date().toISOString());
                  const overdue = elapsed > 24;
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-primary">
                        {r.noRegister}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium">{r.peminjam}</p>
                        <p className="text-[11px] text-muted-foreground">{r.email}</p>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{r.kegiatan}</td>
                      <td className="px-5 py-3">
                        <p className="font-mono text-xs font-semibold">{r.noHak}</p>
                        <p className="text-[11px] text-muted-foreground">{r.jenisHak}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {r.desa || "—"}
                        {r.kecamatan ? `, ${r.kecamatan}` : ""}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {new Date(r.tglPengajuan).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            overdue
                              ? "bg-destructive/15 text-destructive"
                              : "bg-warning/15 text-warning"
                          }`}
                        >
                          {overdue && <AlertTriangle className="h-3 w-3" />}
                          {formatDuration(elapsed)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > 10 && (
              <p className="border-t bg-muted/30 px-5 py-2 text-center text-xs text-muted-foreground">
                Menampilkan 10 dari {rows.length} berkas
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
