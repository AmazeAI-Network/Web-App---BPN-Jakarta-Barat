import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  ClipboardList,
  AlertCircle,
  Send,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { usePeminjaman, type Peminjaman } from "@/lib/peminjaman-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/peminjaman/verifikasi")({
  head: () => ({
    meta: [{ title: "Peminjaman Verifikasi — BPN Jakarta Barat" }],
  }),
  component: VerifikasiPage,
});

function VerifikasiPage() {
  const { items, changeStatus } = usePeminjaman();
  const [confirming, setConfirming] = useState<Peminjaman | null>(null);
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const queue = useMemo(() => {
    const k = q.trim().toLowerCase();
    return items
      .filter((p) => p.status === "Proses Pencarian" && !rejected.has(p.id))
      .filter(
        (p) =>
          !k ||
          p.peminjam.toLowerCase().includes(k) ||
          p.noRegister.toLowerCase().includes(k) ||
          p.noHak.toLowerCase().includes(k) ||
          (p.desa ?? "").toLowerCase().includes(k) ||
          (p.kecamatan ?? "").toLowerCase().includes(k) ||
          p.kegiatan.toLowerCase().includes(k),
      );
  }, [items, rejected, q]);

  const stats = useMemo(
    () => ({
      menunggu: queue.length,
      diterima: items.filter((p) => p.status !== "Proses Pencarian").length,
      ditolak: rejected.size,
    }),
    [queue, items, rejected],
  );

  const handleConfirmYes = async () => {
    if (!confirming) return;
    await changeStatus(confirming.id, "Siap Diserahkan");
    toast.success("Notifikasi terkirim ke peminjam", {
      description: `${confirming.noRegister} — ${confirming.peminjam}. Email pemberitahuan dikirim ke ${confirming.email}.`,
      duration: 7000,
    });
    setConfirming(null);
  };

  const handleReject = (p: Peminjaman) => {
    setRejected((s) => new Set(s).add(p.id));
    toast.error("Pengajuan ditolak", {
      description: `${p.noRegister} — ${p.peminjam}.`,
    });
  };

  return (
    <AppShell title="Peminjaman Verifikasi" subtitle="Antrian verifikasi: terima atau tolak pengajuan">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Menunggu" value={stats.menunggu} icon={AlertCircle} tone="text-warning" bg="bg-warning/10" />
          <StatCard label="Diterima" value={stats.diterima} icon={CheckCircle2} tone="text-success" bg="bg-success/10" />
          <StatCard label="Ditolak" value={stats.ditolak} icon={XCircle} tone="text-destructive" bg="bg-destructive/10" />
        </div>

        <Card className="shadow-card">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Antrian Verifikasi ({queue.length})
              </span>
              <div className="relative w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari peminjam, register, no.hak, desa..."
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold">Peminjam</th>
                    <th className="px-3 py-3 text-left font-semibold">Kegiatan</th>
                    <th className="px-3 py-3 text-left font-semibold">No. Hak / Jenis</th>
                    <th className="px-3 py-3 text-left font-semibold">Desa / Kecamatan</th>
                    <th className="px-3 py-3 text-left font-semibold">No. SU / Th</th>
                    <th className="px-3 py-3 text-left font-semibold">No. Warkah / Th</th>
                    <th className="px-3 py-3 text-left font-semibold">No. HT / Th</th>
                    <th className="px-3 py-3 text-left font-semibold">KET</th>
                    <th className="px-3 py-3 text-left font-semibold">Tgl Pengajuan</th>
                    <th className="px-3 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-10 text-center text-sm text-muted-foreground">
                        Antrian kosong — semua pengajuan sudah ditangani.
                      </td>
                    </tr>
                  ) : (
                    queue.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 align-top">
                        <td className="px-3 py-3">
                          <p className="text-sm font-medium">{p.peminjam}</p>
                          <p className="text-[11px] text-muted-foreground">{p.email}</p>
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
                        <td className="px-3 py-3 text-[11px] font-semibold text-primary">{p.jenisPeminjaman || "—"}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {new Date(p.tglPengajuan).toLocaleString("id-ID")}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                              onClick={() => setConfirming(p)}
                            >
                              <Send className="h-3.5 w-3.5" /> Verifikasi
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1.5"
                              onClick={() => handleReject(p)}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Tolak
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Konfirmasi pop-up */}
      <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" /> Konfirmasi Verifikasi
            </DialogTitle>
            <DialogDescription>
              Apakah data yang dipinjam sudah sesuai? Klik <strong>YA</strong> untuk
              menginformasikan data tersebut ke peminjam.
            </DialogDescription>
          </DialogHeader>
          {confirming && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                  Proses Pencarian
                </p>
                <dl className="space-y-1 font-mono text-xs">
                  <DetailLine label="No. Hak" value={confirming.noHak} />
                  <DetailLine label="Jenis Hak" value={confirming.jenisHak} />
                  <DetailLine label="Desa" value={confirming.desa || "—"} />
                  <DetailLine label="Kecamatan" value={confirming.kecamatan || "—"} />
                  <DetailLine label="No. HT" value={confirming.noHt || "—"} />
                  <DetailLine label="No. SU" value={confirming.noSu || "—"} />
                  <DetailLine label="No. Warkah" value={confirming.noWarkah || "—"} />
                </dl>
              </div>
              <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-xs text-foreground">
                "Sudah diterima dan sudah selesai, Mohon untuk mengambil hasil request peminjaman,
                Pada Ruang Arsip Kantah Administrasi Jakarta Barat"
              </div>
              <p className="text-[11px] text-muted-foreground">
                Notifikasi akan dikirim ke: <span className="font-semibold">{confirming.email}</span>
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Batal
            </Button>
            <Button
              className="gap-1.5 bg-success text-success-foreground hover:bg-success/90"
              onClick={handleConfirmYes}
            >
              <CheckCircle2 className="h-4 w-4" /> YA, Kirim Notifikasi
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
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex-1 font-semibold">: {value}</dd>
    </div>
  );
}

function StatCard({
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
