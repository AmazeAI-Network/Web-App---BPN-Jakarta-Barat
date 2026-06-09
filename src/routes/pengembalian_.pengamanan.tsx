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
  ShieldCheck,
  Search,
  Loader2,
  Eye,
  Undo2,
  CheckCircle2,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  usePeminjaman,
  statusBadgeClasses,
  type StatusPeminjaman,
  type Peminjaman,
} from "@/lib/peminjaman-store";
import { DetailPeminjamanDialog } from "@/components/DetailPeminjamanDialog";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/pengembalian_/pengamanan")({
  head: () => ({ meta: [{ title: "Pengembalian Pengamanan — BPN Jakarta Barat" }] }),
  component: PengembalianPengamananPage,
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

function PengembalianPengamananPage() {
  const { items, loading, changeStatus } = usePeminjaman();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Peminjaman | null>(null);
  const [confirming, setConfirming] = useState<Peminjaman | null>(null);
  const [busy, setBusy] = useState(false);

  const diamankan = useMemo(
    () => items.filter((p) => p.tipe === "pengamanan" && p.status === "Diamankan"),
    [items],
  );

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return diamankan
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
  }, [diamankan, q]);

  const handleConfirm = async () => {
    if (!confirming) return;
    setBusy(true);
    await changeStatus(confirming.id, "Dikembalikan", confirming.catatan, user?.name);
    setBusy(false);
    setConfirming(null);
  };

  return (
    <AppShell
      title="Pengembalian Pengamanan"
      subtitle="Verifikasi pengembalian berkas jalur Pengamanan"
    >
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Diamankan
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{diamankan.length}</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-2.5 text-warning">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

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
              <ShieldCheck className="h-5 w-5 text-warning" />
              Pengembalian Berkas Pengamanan ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Tidak ada berkas pengamanan yang menunggu dikembalikan.
              </p>
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
                        <td className="px-3 py-3 text-xs text-muted-foreground">{fmtDate(p.tglPengajuan)}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeClasses(p.status as StatusPeminjaman)}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setDetail(p)}>
                              <Eye className="h-3.5 w-3.5" /> Detail
                            </Button>
                            <Button size="sm" className="h-8 gap-1.5" onClick={() => setConfirming(p)}>
                              <Undo2 className="h-3.5 w-3.5" /> Kembalikan
                            </Button>
                          </div>
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

      <Dialog open={!!confirming} onOpenChange={(o) => !busy && !o && setConfirming(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" /> Konfirmasi Pengembalian
            </DialogTitle>
            <DialogDescription>
              Berkas pengamanan akan ditandai sebagai <strong>Dikembalikan</strong>. Notifikasi email akan dikirim ke peminjam.
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
            <Button
              className="w-full gap-1.5 bg-success text-success-foreground hover:bg-success/90"
              onClick={handleConfirm}
              disabled={busy}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? "Memproses..." : "YA, Kembalikan"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setConfirming(null)} disabled={busy}>
              Batal
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
