import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Loader2,
  Eye,
  Undo2,
  CheckCircle2,
  Clock,
  PackageCheck,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  usePeminjaman,
  type Peminjaman,
  type StatusPeminjaman,
} from "@/lib/peminjaman-store";
import { DetailPeminjamanDialog } from "@/components/DetailPeminjamanDialog";
import { MonitoringPanel } from "@/components/MonitoringPanel";
import { PengembalianAdminPanel } from "@/components/PengembalianAdminPanel";
import { useAuth } from "@/lib/auth";

type TabKey = "pengembalian" | "admin" | "monitoring";

export const Route = createFileRoute("/pengembalian")({
  validateSearch: (search: Record<string, unknown>): { tab?: TabKey } => {
    const t = search.tab;
    return {
      tab: t === "admin" || t === "monitoring" || t === "pengembalian" ? t : undefined,
    };
  },
  head: () => ({ meta: [{ title: "Pengembalian & Monitoring — BPN Jakarta Barat" }] }),
  component: PengembalianPage,
});

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayPeminjam(p: Peminjaman) {
  return p.peminjam.startsWith("ATENSI — ") ? p.peminjam.replace("ATENSI — ", "") : p.peminjam;
}

type Mode = "ajukan" | "konfirmasi";

function PengembalianPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const activeTab: TabKey =
    tab === "admin" && !isAdmin ? "pengembalian" : (tab ?? "pengembalian");

  const setTab = (t: string) =>
    void navigate({
      search: (prev) => ({ ...prev, tab: t as TabKey }),
      replace: true,
    });

  return (
    <AppShell
      title="Pengembalian & Monitoring"
      subtitle="Pengembalian warkah (global untuk semua akun) dan monitoring peminjaman dalam satu halaman"
    >
      <Tabs value={activeTab} onValueChange={setTab} className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="pengembalian" className="gap-1.5">
            <Undo2 className="h-4 w-4" /> Pengembalian
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Pengembalian Admin
            </TabsTrigger>
          )}
          <TabsTrigger value="monitoring" className="gap-1.5">
            <Activity className="h-4 w-4" /> Monitoring Peminjaman
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pengembalian" className="mt-0">
          <PengembalianPanel />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="admin" className="mt-0">
            <PengembalianAdminPanel />
          </TabsContent>
        )}
        <TabsContent value="monitoring" className="mt-0">
          <MonitoringPanel />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function PengembalianPanel() {
  const { items, loading, changeStatus } = usePeminjaman();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Peminjaman | null>(null);
  const [confirming, setConfirming] = useState<{ item: Peminjaman; mode: Mode } | null>(null);
  const [busy, setBusy] = useState(false);

  // Semua akun dapat mengajukan pengembalian DAN mengonfirmasi pengembalian.
  const dipinjam = useMemo(
    () => items.filter((p) => p.tipe !== "pengamanan" && p.status === "Sedang Dipinjam"),
    [items],
  );
  const prosesKembali = useMemo(
    () => items.filter((p) => p.tipe !== "pengamanan" && p.status === "Proses Dikembalikan"),
    [items],
  );

  const overdueOf = (iso: string) =>
    Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

  const applySearch = (list: Peminjaman[]) => {
    const k = q.trim().toLowerCase();
    return list
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
          (p.noHt ?? "").toLowerCase().includes(k) ||
          p.kegiatan.toLowerCase().includes(k),
      )
      .sort((a, b) => (a.tglPengajuan < b.tglPengajuan ? 1 : -1));
  };

  const filteredDipinjam = useMemo(() => applySearch(dipinjam), [dipinjam, q]);
  const filteredProses = useMemo(() => applySearch(prosesKembali), [prosesKembali, q]);

  const handleConfirm = async () => {
    if (!confirming) return;
    const nextStatus: StatusPeminjaman =
      confirming.mode === "ajukan" ? "Proses Dikembalikan" : "Sudah Dikembalikan";
    setBusy(true);
    await changeStatus(confirming.item.id, nextStatus, confirming.item.catatan, user?.name);
    setBusy(false);
    setConfirming(null);
  };

  const renderTable = (
    list: Peminjaman[],
    mode: Mode,
    emptyText: string,
  ) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
        </div>
      );
    }
    if (list.length === 0) {
      return <p className="p-10 text-center text-sm text-muted-foreground">{emptyText}</p>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="border-y bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3 text-left font-semibold">No.</th>
              <th className="px-3 py-3 text-left font-semibold">Peminjam</th>
              <th className="px-3 py-3 text-left font-semibold">No. Hak / Jenis</th>
              <th className="px-3 py-3 text-left font-semibold">Desa / Kecamatan</th>
              <th className="px-3 py-3 text-left font-semibold">No. SU/Warkah/HT</th>
              <th className="px-3 py-3 text-left font-semibold">Kegiatan</th>
              <th className="px-3 py-3 text-left font-semibold">KET</th>
              <th className="px-3 py-3 text-left font-semibold">Tgl Konfirmasi</th>
              <th className="px-3 py-3 text-left font-semibold">Lama</th>
              <th className="px-3 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.map((p, idx) => {
              const days = overdueOf(p.tglPengajuan);
              return (
                <tr key={p.id} className="hover:bg-muted/30 align-top">
                  <td className="px-3 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-medium">{displayPeminjam(p)}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{p.noRegister}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-mono text-sm font-bold">{p.noHak}</p>
                    <p className="text-[11px] font-semibold uppercase text-primary">{p.jenisHak}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm">{p.desa || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{p.kecamatan || ""}</p>
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                    <div>{p.noSu || "—"}</div>
                    <div>{p.noWarkah || "—"}</div>
                    <div>{p.noHt || "—"}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{p.kegiatan}</td>
                  <td className="px-3 py-3 text-[11px] font-semibold text-primary">{p.jenisPeminjaman || "—"}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{fmtDate(p.tglKonfirmasi)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        days > 7
                          ? "bg-destructive/10 text-destructive border border-destructive/30"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {days} hari
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setDetail(p)}>
                        <Eye className="h-3.5 w-3.5" /> Detail
                      </Button>
                      {mode === "ajukan" ? (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 bg-warning text-warning-foreground hover:bg-warning/90"
                          onClick={() => setConfirming({ item: p, mode: "ajukan" })}
                        >
                          <PackageCheck className="h-3.5 w-3.5" /> Ajukan Pengembalian
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                          onClick={() => setConfirming({ item: p, mode: "konfirmasi" })}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Konfirmasi Pengembalian
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sedang Dipinjam
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{dipinjam.length}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <PackageCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Proses Dikembalikan
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{prosesKembali.length}</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-2.5 text-warning">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Terlambat (&gt;7 hari)
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {dipinjam.filter((p) => overdueOf(p.tglPengajuan) > 7).length}
              </p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-2.5 text-destructive">
              <Undo2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari no.hak, peminjam, register, desa, no.SU/warkah/HT, kegiatan..."
          className="h-9 pl-8 text-sm"
        />
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="h-5 w-5 text-warning" />
            Ajukan Pengembalian ({filteredDipinjam.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {renderTable(filteredDipinjam, "ajukan", "Tidak ada peminjaman yang sedang berjalan.")}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Undo2 className="h-5 w-5 text-success" />
            Konfirmasi Pengembalian ({filteredProses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {renderTable(filteredProses, "konfirmasi", "Tidak ada permintaan pengembalian yang menunggu konfirmasi.")}
        </CardContent>
      </Card>

      <DetailPeminjamanDialog item={detail} onClose={() => setDetail(null)} />

      <Dialog open={!!confirming} onOpenChange={(o) => !busy && !o && setConfirming(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirming?.mode === "ajukan" ? (
                <><PackageCheck className="h-5 w-5 text-warning" /> Ajukan Pengembalian</>
              ) : (
                <><CheckCircle2 className="h-5 w-5 text-success" /> Konfirmasi Pengembalian</>
              )}
            </DialogTitle>
            <DialogDescription>
              {confirming?.mode === "ajukan" ? (
                <>Apakah Peminjaman ini sudah selesai dipinjam? Status akan diubah menjadi <strong>Proses Dikembalikan</strong> dan menunggu konfirmasi.</>
              ) : (
                <>Data Peminjaman akan ditandai sebagai <strong>Sudah Dikembalikan</strong>. Notifikasi email akan dikirim ke peminjam.</>
              )}
            </DialogDescription>
          </DialogHeader>
          {confirming && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-mono text-[11px] font-semibold uppercase text-primary">
                  {confirming.item.noRegister}
                </p>
                <p className="mt-0.5 font-semibold">{displayPeminjam(confirming.item)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{confirming.item.kegiatan}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 font-mono text-[12px] leading-relaxed">
                <DetailLine label="No. Hak" value={`${confirming.item.noHak || "—"} (${confirming.item.jenisHak || "—"})`} />
                <DetailLine label="Desa" value={confirming.item.desa || "—"} />
                <DetailLine label="Kecamatan" value={confirming.item.kecamatan || "—"} />
                <DetailLine label="No. SU" value={confirming.item.noSu || "—"} />
                <DetailLine label="No. Warkah" value={confirming.item.noWarkah || "—"} />
                <DetailLine label="No. HT" value={confirming.item.noHt || "—"} />
                <DetailLine label="Tgl Pengajuan" value={fmtDate(confirming.item.tglPengajuan)} />
                <DetailLine label="Tgl Konfirmasi" value={fmtDate(confirming.item.tglKonfirmasi)} />
                <DetailLine label="Email" value={confirming.item.email || "—"} />
              </div>
              {confirming.item.catatan && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-xs">
                  <p className="font-semibold text-success">Catatan:</p>
                  <p className="mt-1 italic">"{confirming.item.catatan}"</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {confirming?.mode === "ajukan" ? (
              <Button
                className="w-full gap-1.5 bg-warning text-warning-foreground hover:bg-warning/90"
                onClick={handleConfirm}
                disabled={busy}
              >
                <PackageCheck className="h-4 w-4" /> {busy ? "Memproses..." : "YA, Ajukan"}
              </Button>
            ) : (
              <Button
                className="w-full gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                onClick={handleConfirm}
                disabled={busy}
              >
                <CheckCircle2 className="h-4 w-4" /> {busy ? "Memproses..." : "YA, Kembalikan"}
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setConfirming(null)} disabled={busy}>
              Tidak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-muted-foreground">:</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}
