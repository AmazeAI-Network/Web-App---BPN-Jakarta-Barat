import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HandCoins, Plus, Pencil, Trash2, Search, Mail, Phone, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePeminjamMaster, type Peminjam } from "@/lib/master-data";
import { deletePeminjamMaster, upsertPeminjamMaster } from "@/lib/data.functions";

export const Route = createFileRoute("/master/peminjam")({
  head: () => ({ meta: [{ title: "Master Peminjam — BPN Jakarta Barat" }] }),
  component: MasterPeminjamPage,
});

type Form = {
  kode: string;
  nama: string;
  jenis: string;
  email: string;
  telepon: string;
  aktif: boolean;
};
const empty: Form = { kode: "", nama: "", jenis: "Loket", email: "", telepon: "", aktif: true };

function MasterPeminjamPage() {
  const { items, loading, refresh } = usePeminjamMaster();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Peminjam | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter(
      (i) =>
        i.nama.toLowerCase().includes(k) ||
        i.kode.toLowerCase().includes(k) ||
        (i.email ?? "").toLowerCase().includes(k)
    );
  }, [items, q]);

  const startNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const startEdit = (p: Peminjam) => {
    setEditing(p);
    setForm({
      kode: p.kode,
      nama: p.nama,
      jenis: p.jenis,
      email: p.email ?? "",
      telepon: p.telepon ?? "",
      aktif: p.aktif,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.kode.trim() || !form.nama.trim()) {
      toast.error("Kode dan Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await upsertPeminjamMaster({
        data: {
          id: editing?.id,
          kode: form.kode.trim().toUpperCase(),
          nama: form.nama.trim(),
          jenis: form.jenis,
          email: form.email.trim() || null,
          telepon: form.telepon.trim() || null,
          aktif: form.aktif,
        },
      });
      toast.success(editing ? "Peminjam diperbarui" : "Peminjam ditambahkan");
      setOpen(false);
      void refresh();
    } catch (e) {
      toast.error("Gagal menyimpan", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Peminjam) => {
    if (!confirm(`Hapus peminjam "${p.nama}"?`)) return;
    try {
      await deletePeminjamMaster({ data: { id: p.id } });
      toast.success("Peminjam dihapus");
      void refresh();
    } catch (e) {
      toast.error("Gagal menghapus", { description: (e as Error).message });
    }
  };

  return (
    <AppShell title="Master Peminjam" subtitle="Kelola data peminjam yang diizinkan">
      <div className="space-y-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <HandCoins className="h-5 w-5 text-primary" />
              Daftar Peminjam ({items.length})
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari peminjam..."
                  className="pl-9 sm:w-64"
                />
              </div>
              <Button onClick={startNew} className="gap-1.5">
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">Tidak ada data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">Kode</th>
                      <th className="px-5 py-3 text-left font-semibold">Nama</th>
                      <th className="px-5 py-3 text-left font-semibold">Jenis</th>
                      <th className="px-5 py-3 text-left font-semibold">Kontak</th>
                      <th className="px-5 py-3 text-left font-semibold">Status</th>
                      <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-5 py-3 font-mono text-xs font-bold text-primary">
                          {p.kode}
                        </td>
                        <td className="px-5 py-3 font-semibold text-foreground">{p.nama}</td>
                        <td className="px-5 py-3 text-muted-foreground">{p.jenis}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {p.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {p.email}
                            </div>
                          )}
                          {p.telepon && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {p.telepon}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {p.aktif ? (
                            <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Nonaktif
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => void remove(p)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Peminjam" : "Tambah Peminjam"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode *</Label>
                <Input
                  value={form.kode}
                  onChange={(e) => setForm({ ...form, kode: e.target.value.slice(0, 20) })}
                  placeholder="LOKET-1"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Jenis</Label>
                <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Loket">Loket</SelectItem>
                    <SelectItem value="Atensi">Atensi</SelectItem>
                    <SelectItem value="Internal">Internal</SelectItem>
                    <SelectItem value="Eksternal">Eksternal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nama *</Label>
              <Input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value.slice(0, 150) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value.slice(0, 150) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telepon</Label>
                <Input
                  value={form.telepon}
                  onChange={(e) => setForm({ ...form, telepon: e.target.value.slice(0, 30) })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
              />
              Aktif
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
