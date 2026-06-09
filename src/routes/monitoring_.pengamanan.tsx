import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Search, Loader2, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import {
  usePeminjaman,
  statusBadgeClasses,
  type StatusPeminjaman,
  type Peminjaman,
} from "@/lib/peminjaman-store";
import { DetailPeminjamanDialog } from "@/components/DetailPeminjamanDialog";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/monitoring_/pengamanan")({
  head: () => ({ meta: [{ title: "Monitoring Pengamanan — BPN Jakarta Barat" }] }),
  component: MonitoringPengamananPage,
});

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayPeminjam(p: Peminjaman) {
  if (p.peminjam.startsWith("ATENSI — ")) return p.peminjam.replace("ATENSI — ", "");
  return p.peminjam;
}

function MonitoringPengamananPage() {
  const { items, loading } = usePeminjaman();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Peminjaman | null>(null);

  const isAdmin = user?.role === "admin";

  const pengamanan = useMemo(() => {
    const all = items.filter((p) => p.tipe === "pengamanan");
    if (isAdmin) return all;
    if (!user) return [];
    return all.filter(
      (p) => p.createdBy === user.username || p.createdBy === user.name,
    );
  }, [items, isAdmin, user]);

  const counts = useMemo(() => {
    return {
      Diamankan: pengamanan.filter((p) => p.status === "Diamankan").length,
      Dikembalikan: pengamanan.filter((p) => p.status === "Dikembalikan").length,
    };
  }, [pengamanan]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return pengamanan
      .filter(
        (p) =>
          !k ||
          p.noHak.toLowerCase().includes(k) ||
          p.peminjam.toLowerCase().includes(k) ||
          p.noRegister.toLowerCase().includes(k) ||
          (p.desa ?? "").toLowerCase().includes(k) ||
          (p.kecamatan ?? "").toLowerCase().includes(k) ||
          (p.noSu ?? "").toLowerCase().includes(k) ||
          (p.noWarkah ?? "").toLowerCase().includes(k) ||
          (p.noHt ?? "").toLowerCase().includes(k),
      )
      .sort((a, b) => (a.tglPengajuan < b.tglPengajuan ? 1 : -1));
  }, [pengamanan, q]);

  return (
    <AppShell
      title="Monitoring Pengamanan"
      subtitle="Hasil register dari menu Peminjaman Pengamanan"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Diamankan
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{counts.Diamankan}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Dikembalikan
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{counts.Dikembalikan}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Daftar Peminjaman Pengamanan ({filtered.length} dari {pengamanan.length})
            </CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari no.hak, peminjam, desa, no.SU/warkah/HT..."
                className="h-9 pl-8 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-12 text-center text-sm text-muted-foreground">
                Belum ada pengajuan pengamanan.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1480px] text-sm">
                  <thead className="border-y bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold">No.</th>
                      <th className="px-3 py-3 text-left font-semibold">No. Hak / Jenis</th>
                      <th className="px-3 py-3 text-left font-semibold">Desa / Kecamatan</th>
                      <th className="px-3 py-3 text-left font-semibold">No. SU / Th</th>
                      <th className="px-3 py-3 text-left font-semibold">No. Warkah / Th</th>
                      <th className="px-3 py-3 text-left font-semibold">No. HT / Th</th>
                      <th className="px-3 py-3 text-left font-semibold">Nama Peminjam</th>
                      <th className="px-3 py-3 text-left font-semibold">Kegiatan</th>
                      <th className="px-3 py-3 text-left font-semibold">Keterangan Pengamanan</th>
                      <th className="px-3 py-3 text-left font-semibold">Tgl Pengajuan</th>
                      <th className="px-3 py-3 text-left font-semibold">Status</th>
                      <th className="px-3 py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-muted/30 align-top">
                        <td className="px-3 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-3">
                          <p className="font-mono text-base font-bold text-foreground">{p.noHak}</p>
                          <p className="text-[11px] font-semibold uppercase text-primary">
                            {p.jenisHak}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-sm font-semibold">{p.desa || "—"}</p>
                          <p className="text-[11px] text-muted-foreground">{p.kecamatan || ""}</p>
                        </td>
                        <td className="px-3 py-3 font-mono text-sm font-bold text-foreground">
                          {p.noSu || "—"}
                        </td>
                        <td className="px-3 py-3 font-mono text-sm font-bold text-foreground">
                          {p.noWarkah || "—"}
                        </td>
                        <td className="px-3 py-3 font-mono text-sm font-bold text-foreground">
                          {p.noHt || "—"}
                        </td>
                        <td className="px-3 py-3 text-sm">{displayPeminjam(p)}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{p.kegiatan}</td>
                        <td className="px-3 py-3 text-xs text-foreground max-w-[260px]">
                          <p className="whitespace-pre-wrap break-words">{p.catatan || "—"}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {fmtDate(p.tglPengajuan)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeClasses(p.status as StatusPeminjaman)}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => setDetail(p)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </Button>
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

      <DetailPeminjamanDialog item={detail} onClose={() => setDetail(null)} />
    </AppShell>
  );
}
