import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Loader2, Handshake, Clock, Users, RefreshCw, MonitorPlay } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePeminjaman, statusBadgeClasses, type StatusPeminjaman } from "@/lib/peminjaman-store";

export const Route = createFileRoute("/peminjaman/informasi")({
  head: () => ({ meta: [{ title: "Peminjaman Informasi — BPN Jakarta Barat" }] }),
  component: PeminjamanInformasiPage,
});

// Hanya status "Proses Pencarian" yang ditampilkan di layar monitor
const PROSES_STATUSES: StatusPeminjaman[] = ["Proses Pencarian"];

const REFRESH_INTERVAL_MS = 60 * 1000; // 1 menit

function PeminjamanInformasiPage() {
  const { items, loading, refresh } = usePeminjaman();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [secondsLeft, setSecondsLeft] = useState<number>(REFRESH_INTERVAL_MS / 1000);

  // Auto-refresh tiap 1 menit (untuk tampilan layar monitor besar)
  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
      setLastRefresh(new Date());
      setSecondsLeft(REFRESH_INTERVAL_MS / 1000);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  // Countdown 1 detik
  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Hanya tampilkan status proses (Proses Pencarian, Siap Diserahkan, Sedang Dipinjam)
  const dataProses = useMemo(
    () => items.filter((p) => PROSES_STATUSES.includes(p.status)),
    [items],
  );

  const totalUnik = new Set(dataProses.map((p) => p.peminjam)).size;
  const daysSince = (iso: string) =>
    Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

  const sorted = useMemo(
    () => [...dataProses].sort((a, b) => (a.tglUpdate < b.tglUpdate ? 1 : -1)),
    [dataProses],
  );

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <AppShell
      title="Peminjaman Informasi"
      subtitle="Tampilan untuk layar monitor — auto refresh setiap 1 menit"
    >
      <div className="space-y-6">
        {/* Banner mode monitor */}
        <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <MonitorPlay className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Mode Tampilan Layar Monitor</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Halaman akan memuat ulang data otomatis setiap 1 menit. Hanya menampilkan
                status sedang berproses.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh berikutnya: <span className="font-mono font-semibold text-primary">{mm}:{ss}</span>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiMini label="Total Sedang Berproses" value={dataProses.length} icon={Handshake} tone="text-primary" bg="bg-primary/10" />
          <KpiMini label="Jumlah Peminjam" value={totalUnik} icon={Users} tone="text-info" bg="bg-info/10" />
          <KpiMini
            label="Pinjaman > 7 hari"
            value={dataProses.filter((p) => daysSince(p.tglUpdate) > 7).length}
            icon={Clock}
            tone="text-warning"
            bg="bg-warning/10"
          />
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> Daftar Berkas Berproses
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Diperbarui: {lastRefresh.toLocaleTimeString("id-ID")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
              </div>
            ) : sorted.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Tidak ada berkas dengan status berproses saat ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                  <thead className="border-y bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold">Peminjam</th>
                      <th className="px-3 py-3 text-left font-semibold">Kegiatan</th>
                      <th className="px-3 py-3 text-left font-semibold">No. Hak / Jenis</th>
                      <th className="px-3 py-3 text-left font-semibold">Desa / Kecamatan</th>
                      <th className="px-3 py-3 text-left font-semibold">No. SU / Th</th>
                      <th className="px-3 py-3 text-left font-semibold">No. Warkah / Th</th>
                      <th className="px-3 py-3 text-left font-semibold">No. HT / Th</th>
                      <th className="px-3 py-3 text-left font-semibold">Lama</th>
                      <th className="px-3 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sorted.map((p) => {
                      const days = daysSince(p.tglUpdate);
                      return (
                        <tr key={p.id} className="hover:bg-muted/30 align-top">
                          <td className="px-3 py-3">
                            <p className="text-sm font-medium">
                              {p.peminjam.startsWith("ATENSI — ")
                                ? p.peminjam.replace("ATENSI — ", "")
                                : p.peminjam}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">{p.noRegister}</p>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">{p.kegiatan}</td>
                          <td className="px-3 py-3">
                            <p className="font-mono text-base font-bold">{p.noHak}</p>
                            <p className="text-[11px] font-semibold uppercase text-primary">{p.jenisHak}</p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-sm font-semibold">{p.desa || "—"}</p>
                            <p className="text-[11px] text-muted-foreground">{p.kecamatan || ""}</p>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{p.noSu || "—"}</td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{p.noWarkah || "—"}</td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{p.noHt || "—"}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                days > 7
                                  ? "border border-destructive/30 bg-destructive/10 text-destructive"
                                  : "border border-border bg-muted text-muted-foreground"
                              }`}
                            >
                              {days} hari
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClasses(p.status)}`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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

function KpiMini({
  label,
  value,
  icon: Icon,
  tone,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  bg: string;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${bg} ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
