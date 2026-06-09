import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import { usePeminjaman, type Peminjaman } from "@/lib/peminjaman-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/peminjaman/konfirmasi")({
  head: () => ({
    meta: [{ title: "Peminjaman Konfirmasi — BPN Jakarta Barat" }],
  }),
  component: KonfirmasiPage,
});

function KonfirmasiPage() {
  const { items, changeStatus } = usePeminjaman();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // Tahap konfirmasi = peminjam sudah mengambil berkas (Sedang Dipinjam → akhir)
  // Sesuai konteks user: "konfirmasi bahwa berkas sudah diterima oleh si peminjam"
  const antrian = useMemo(
    () =>
      items
        .filter((p) => p.status === "Siap Diserahkan")
        .filter((p) => {
          const k = q.trim().toLowerCase();
          if (!k) return true;
          return (
            p.noRegister.toLowerCase().includes(k) ||
            p.peminjam.toLowerCase().includes(k) ||
            p.noHak.toLowerCase().includes(k) ||
            (p.desa ?? "").toLowerCase().includes(k) ||
            (p.kecamatan ?? "").toLowerCase().includes(k) ||
            p.kegiatan.toLowerCase().includes(k)
          );
        }),
    [items, q],
  );

  const isAdmin = user?.role === "admin";

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (checked.size === antrian.length) setChecked(new Set());
    else setChecked(new Set(antrian.map((p) => p.id)));
  };

  const checkedItems = useMemo(
    () => antrian.filter((p) => checked.has(p.id)),
    [antrian, checked],
  );

  const handleKirimKonfirmasi = async () => {
    if (checkedItems.length === 0) return;
    setSending(true);
    for (const p of checkedItems) {
      await changeStatus(
        p.id,
        "Sedang Dipinjam",
        `Dikonfirmasi & diambil oleh peminjam — ${user?.name ?? "Atasan"}`,
        user?.name ?? "Atasan",
      );
    }
    setSending(false);
    toast.success(`${checkedItems.length} konfirmasi terkirim`, {
      description: "Notifikasi telah dikirim ke peminjam.",
    });
    setChecked(new Set());
    setConfirmOpen(false);
  };

  const overdueDays = (iso: string) =>
    Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <AppShell
      title="Peminjaman Konfirmasi"
      subtitle="Konfirmasi bahwa berkas yang sudah diverifikasi siap diserahkan ke peminjam"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Menunggu Konfirmasi
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">{antrian.length}</p>
              </div>
              <div className="rounded-lg bg-info/10 p-2.5 text-info">
                <ClipboardCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tertunda &gt; 1 hari
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {antrian.filter((p) => overdueDays(p.tglUpdate) >= 1).length}
                </p>
              </div>
              <div className="rounded-lg bg-warning/10 p-2.5 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dipilih
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">{checked.size}</p>
              </div>
              <div className="rounded-lg bg-success/10 p-2.5 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Konfirmasi Pengambilan Berkas</p>
            <p className="mt-0.5 text-muted-foreground">
              Centang Data Peminjaman yang sudah diverifikasi & diambil oleh peminjam, lalu klik{" "}
              <strong>Kirim Konfirmasi</strong> untuk menandai status menjadi{" "}
              <em>Dipinjam</em> sekaligus mengirim notifikasi ke peminjam.
            </p>
          </div>
        </div>

        {/* Daftar Antrian */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex flex-col items-start justify-between gap-3 text-base sm:flex-row sm:items-center">
              <span className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" /> Daftar Konfirmasi
              </span>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cari register, peminjam, no.hak, desa..."
                    className="h-9 pl-8 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 whitespace-nowrap"
                  disabled={!isAdmin || checked.size === 0 || sending}
                  onClick={() => setConfirmOpen(true)}
                >
                  <Send className="h-4 w-4" /> Kirim Konfirmasi ({checked.size})
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-3 text-center">
                      <Checkbox
                        checked={antrian.length > 0 && checked.size === antrian.length}
                        onCheckedChange={toggleAll}
                        aria-label="Pilih semua"
                        disabled={!isAdmin || antrian.length === 0}
                      />
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">Peminjam</th>
                    <th className="px-3 py-3 text-left font-semibold">Kegiatan</th>
                    <th className="px-3 py-3 text-left font-semibold">No. Hak / Jenis</th>
                    <th className="px-3 py-3 text-left font-semibold">Desa / Kec.</th>
                    <th className="px-3 py-3 text-left font-semibold">No. SU / Th</th>
                    <th className="px-3 py-3 text-left font-semibold">No. Warkah / Th</th>
                    <th className="px-3 py-3 text-left font-semibold">No. HT / Th</th>
                    <th className="px-3 py-3 text-left font-semibold">KET</th>
                    <th className="px-3 py-3 text-left font-semibold">Menunggu</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {antrian.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-12 text-center text-sm text-muted-foreground">
                        <ClipboardCheck className="mx-auto mb-2 h-8 w-8 opacity-40" />
                        Tidak ada data yang menunggu konfirmasi.
                      </td>
                    </tr>
                  ) : (
                    antrian.map((p: Peminjaman) => {
                      const days = overdueDays(p.tglUpdate);
                      const isChecked = checked.has(p.id);
                      return (
                        <tr
                          key={p.id}
                          className={`align-top hover:bg-muted/30 ${isChecked ? "bg-primary/5" : ""}`}
                        >
                          <td className="px-3 py-3 text-center">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggle(p.id)}
                              disabled={!isAdmin}
                              aria-label={`Pilih ${p.noRegister}`}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-sm font-medium">{p.peminjam}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {p.noRegister}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-xs">{p.kegiatan}</td>
                          <td className="px-3 py-3">
                            <p className="font-mono text-base font-bold">{p.noHak}</p>
                            <p className="text-[11px] font-semibold uppercase text-primary">
                              {p.jenisHak}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-sm font-semibold">{p.desa || "—"}</p>
                            <p className="text-[11px] text-muted-foreground">{p.kecamatan || ""}</p>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                            {p.noSu || "—"}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                            {p.noWarkah || "—"}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                            {p.noHt || "—"}
                          </td>
                          <td className="px-3 py-3 text-[11px] font-semibold text-primary">{p.jenisPeminjaman || "—"}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                days >= 1
                                  ? "border border-warning/30 bg-warning/10 text-warning"
                                  : "border border-border bg-muted text-muted-foreground"
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              {days < 1 ? "< 1 hari" : `${days} hari`}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {!isAdmin && (
          <p className="text-center text-xs text-muted-foreground">
            Anda masuk sebagai non-admin. Aksi konfirmasi hanya tersedia untuk akun Administrator.{" "}
            <Link to="/" className="text-primary underline">
              Kembali ke dashboard
            </Link>
          </p>
        )}
      </div>

      {/* Pop-up konfirmasi sebelum kirim */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !sending && setConfirmOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Kirim Konfirmasi
            </DialogTitle>
            <DialogDescription>
              Anda akan menandai <strong>{checkedItems.length}</strong> data sebagai sudah diambil
              oleh peminjam dan mengirim notifikasi ke email mereka. Lanjutkan?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border bg-muted/30 p-2 text-xs">
            {checkedItems.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[11px]">{p.noRegister}</span>
                <span className="truncate text-muted-foreground">{p.peminjam}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Batal
            </Button>
            <Button onClick={handleKirimKonfirmasi} disabled={sending} className="gap-1.5">
              <Send className="h-4 w-4" />
              {sending ? "Mengirim..." : "YA, Kirim Konfirmasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
