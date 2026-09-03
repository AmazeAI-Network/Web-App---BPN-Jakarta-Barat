import { createFileRoute } from "@tanstack/react-router";
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
import {
  Search,
  Loader2,
  Eye,
  Undo2,
  CheckCircle2,
  Clock,
  PackageCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  usePeminjaman,
  type Peminjaman,
  type StatusPeminjaman,
} from "@/lib/peminjaman-store";
import { DetailPeminjamanDialog } from "@/components/DetailPeminjamanDialog";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/pengembalian")({
  head: () => ({ meta: [{ title: "Pengembalian — BPN Jakarta Barat" }] }),
  component: PengembalianRegisterPage,
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

function PengembalianRegisterPage() {
  const { items, loading, changeStatus } = usePeminjaman();
  const { user } = useAuth();
  // Semua akun non-admin dapat mengajukan pengembalian; admin mengonfirmasi.
  const isLoket = !!user && user.role !== "admin";
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Peminjaman | null>(null);
  const [confirming, setConfirming] = useState<Peminjaman | null>(null);
  const [busy, setBusy] = useState(false);

  // Non-admin: ajukan pengembalian dari item yang sedang dipinjam
  // Admin: konfirmasi pengembalian dari item yang sudah diajukan
  const targetStatus: StatusPeminjaman = isLoket ? "Sedang Dipinjam" : "Proses Dikembalikan";
  const nextStatus: StatusPeminjaman = isLoket ? "Proses Dikembalikan" : "Sudah Dikembalikan";

  const list = useMemo(
    () =>
      items.filter((p) => {
        if (p.tipe === "pengamanan") return false;
        if (p.status !== targetStatus) return false;
        return true;
      }),
    [items, targetStatus],
  );


  const overdueOf = (iso: string) =>
    Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

  const filtered = useMemo(() => {
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
  }, [list, q]);

  const handleConfirm = async () => {
    if (!confirming) return;
    setBusy(true);
    await changeStatus(confirming.id, nextStatus, confirming.catatan, user?.name);
    setBusy(false);
    setConfirming(null);
  };

  const cardTitle = isLoket
    ? `Ajukan Pengembalian (${filtered.length})`
    : `Konfirmasi Pengembalian dari Loket (${filtered.length})`;
  const emptyText = isLoket
    ? "Tidak ada peminjaman yang sedang berjalan."
    : "Tidak ada permintaan pengembalian dari loket.";
  const subtitle = isLoket
    ? "Ajukan pengembalian berkas yang sedang dipinjam"
    : "Verifikasi pengembalian warkah jalur Register Peminjaman";

  return (
    <AppShell title="Pengembalian" subtitle={subtitle}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="shadow-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isLoket ? "Sedang Dipinjam" : "Proses Dikembalikan"}
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">{list.length}</p>
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
                  {list.filter((p) => overdueOf(p.tglPengajuan) > 7).length}
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
              <Undo2 className="h-5 w-5 text-primary" />
              {cardTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">{emptyText}</p>
            ) : (
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
                    {filtered.map((p, idx) => {
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
                              {isLoket ? (
                                <Button size="sm" className="h-8 gap-1.5 bg-warning text-warning-foreground hover:bg-warning/90" onClick={() => setConfirming(p)}>
                                  <PackageCheck className="h-3.5 w-3.5" /> Ajukan Pengembalian
                                </Button>
                              ) : (
                                <Button size="sm" className="h-8 gap-1.5 bg-success text-success-foreground hover:bg-success/90" onClick={() => setConfirming(p)}>
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
            )}
          </CardContent>
        </Card>
      </div>

      <DetailPeminjamanDialog item={detail} onClose={() => setDetail(null)} />

      <Dialog open={!!confirming} onOpenChange={(o) => !busy && !o && setConfirming(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isLoket ? (
                <><PackageCheck className="h-5 w-5 text-warning" /> Ajukan Pengembalian</>
              ) : (
                <><CheckCircle2 className="h-5 w-5 text-success" /> Konfirmasi Pengembalian</>
              )}
            </DialogTitle>
            <DialogDescription>
              {isLoket ? (
                <>Apakah Peminjaman ini sudah selesai dipinjam? Status akan diubah menjadi <strong>Proses Dikembalikan</strong> dan menunggu konfirmasi admin.</>
              ) : (
                <>Data Peminjaman akan ditandai sebagai <strong>Sudah Dikembalikan</strong>. Notifikasi email akan dikirim ke peminjam.</>
              )}
            </DialogDescription>
          </DialogHeader>
          {confirming && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-mono text-[11px] font-semibold uppercase text-primary">
                  {confirming.noRegister}
                </p>
                <p className="mt-0.5 font-semibold">{displayPeminjam(confirming)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{confirming.kegiatan}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 font-mono text-[12px] leading-relaxed">
                <DetailLine label="No. Hak" value={`${confirming.noHak || "—"} (${confirming.jenisHak || "—"})`} />
                <DetailLine label="Desa" value={confirming.desa || "—"} />
                <DetailLine label="Kecamatan" value={confirming.kecamatan || "—"} />
                <DetailLine label="No. SU" value={confirming.noSu || "—"} />
                <DetailLine label="No. Warkah" value={confirming.noWarkah || "—"} />
                <DetailLine label="No. HT" value={confirming.noHt || "—"} />
                <DetailLine label="Tgl Pengajuan" value={fmtDate(confirming.tglPengajuan)} />
                <DetailLine label="Tgl Konfirmasi" value={fmtDate(confirming.tglKonfirmasi)} />
                <DetailLine label="Email" value={confirming.email || "—"} />
              </div>
              {confirming.catatan && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-xs">
                  <p className="font-semibold text-success">Catatan:</p>
                  <p className="mt-1 italic">"{confirming.catatan}"</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {isLoket ? (
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
    </AppShell>
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
