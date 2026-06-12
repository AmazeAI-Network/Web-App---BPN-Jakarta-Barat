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
import { Search, Loader2, Eye, CheckCircle2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { usePeminjaman, type Peminjaman } from "@/lib/peminjaman-store";
import { DetailPeminjamanDialog } from "@/components/DetailPeminjamanDialog";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/pengembalian_/admin")({
  head: () => ({
    meta: [{ title: "Pengembalian Admin — BPN Jakarta Barat" }],
  }),
  component: PengembalianAdminPage,
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
  return p.peminjam.startsWith("ATENSI — ")
    ? p.peminjam.replace("ATENSI — ", "")
    : p.peminjam;
}

function PengembalianAdminPage() {
  const { items, loading, changeStatus } = usePeminjaman();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Peminjaman | null>(null);
  const [confirming, setConfirming] = useState<Peminjaman | null>(null);
  const [busy, setBusy] = useState(false);

  // Khusus admin: data yang di-register oleh akun Admin & sedang dipinjam.
  // Admin bisa langsung menandai sudah dikembalikan tanpa lewat loket.
  const list = useMemo(
    () =>
      items.filter(
        (p) =>
          p.tipe !== "pengamanan" &&
          p.status === "Sedang Dipinjam" &&
          p.createdByRole === "admin",
      ),
    [items],
  );

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
          p.kegiatan.toLowerCase().includes(k),
      )
      .sort((a, b) => (a.tglPengajuan < b.tglPengajuan ? 1 : -1));
  }, [list, q]);

  const handleConfirm = async () => {
    if (!confirming) return;
    setBusy(true);
    await changeStatus(
      confirming.id,
      "Sudah Dikembalikan",
      confirming.catatan,
      user?.name,
    );
    setBusy(false);
    setConfirming(null);
  };

  return (
    <AppShell
      title="Pengembalian Admin"
      subtitle="Pengembalian langsung untuk peminjaman yang di-register oleh Admin"
    >
      <div className="space-y-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari no.hak, peminjam, register, desa, kegiatan..."
            className="h-9 pl-8 text-sm"
          />
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Pengembalian Register Admin ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Tidak ada peminjaman aktif yang diregister oleh Admin.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-sm">
                  <thead className="border-y bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold">No.</th>
                      <th className="px-3 py-3 text-left font-semibold">Peminjam</th>
                      <th className="px-3 py-3 text-left font-semibold">No. Hak / Jenis</th>
                      <th className="px-3 py-3 text-left font-semibold">Desa / Kecamatan</th>
                      <th className="px-3 py-3 text-left font-semibold">Kegiatan</th>
                      <th className="px-3 py-3 text-left font-semibold">Tgl Pengajuan</th>
                      <th className="px-3 py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-muted/30 align-top">
                        <td className="px-3 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-3">
                          <p className="text-sm font-medium">{displayPeminjam(p)}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {p.noRegister}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-mono text-sm font-bold">{p.noHak}</p>
                          <p className="text-[11px] font-semibold uppercase text-primary">
                            {p.jenisHak}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-sm">{p.desa || "—"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.kecamatan || ""}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {p.kegiatan}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {fmtDate(p.tglPengajuan)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5"
                              onClick={() => setDetail(p)}
                            >
                              <Eye className="h-3.5 w-3.5" /> Detail
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                              onClick={() => setConfirming(p)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Kembalikan
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

      <Dialog
        open={!!confirming}
        onOpenChange={(o) => !busy && !o && setConfirming(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" /> Kembalikan Berkas
            </DialogTitle>
            <DialogDescription>
              Data peminjaman ini akan langsung ditandai sebagai{" "}
              <strong>Sudah Dikembalikan</strong>. Notifikasi email dikirim ke peminjam.
            </DialogDescription>
          </DialogHeader>
          {confirming && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-mono text-[11px] font-semibold uppercase text-primary">
                {confirming.noRegister}
              </p>
              <p className="mt-0.5 font-semibold">{displayPeminjam(confirming)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{confirming.kegiatan}</p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              className="w-full gap-1.5 bg-success text-success-foreground hover:bg-success/90"
              onClick={handleConfirm}
              disabled={busy}
            >
              <CheckCircle2 className="h-4 w-4" />{" "}
              {busy ? "Memproses..." : "YA, Kembalikan"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setConfirming(null)}
              disabled={busy}
            >
              Tidak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
