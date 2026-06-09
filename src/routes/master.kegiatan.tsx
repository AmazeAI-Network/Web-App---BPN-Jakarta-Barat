import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKegiatan, type Kegiatan } from "@/lib/master-data";
import { deleteKegiatan, upsertKegiatan } from "@/lib/data.functions";

export const Route = createFileRoute("/master/kegiatan")({
  head: () => ({ meta: [{ title: "Master Kegiatan — BPN Jakarta Barat" }] }),
  component: MasterKegiatanPage,
});

type Form = { nama: string; deskripsi: string; aktif: boolean };
const empty: Form = { nama: "", deskripsi: "", aktif: true };

function MasterKegiatanPage() {
  const { items, loading, refresh } = useKegiatan();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Kegiatan | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter(
      (i) => i.nama.toLowerCase().includes(k) || (i.deskripsi ?? "").toLowerCase().includes(k)
    );
  }, [items, q]);

  const startNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const startEdit = (k: Kegiatan) => {
    setEditing(k);
    setForm({ nama: k.nama, deskripsi: k.deskripsi ?? "", aktif: k.aktif });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nama.trim()) {
      toast.error("Nama kegiatan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await upsertKegiatan({
        data: {
          id: editing?.id,
          nama: form.nama.trim(),
          deskripsi: form.deskripsi.trim() || null,
          aktif: form.aktif,
        },
      });
      toast.success(editing ? "Kegiatan diperbarui" : "Kegiatan ditambahkan");
      setOpen(false);
      void refresh();
    } catch (e) {
      toast.error("Gagal menyimpan", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (k: Kegiatan) => {
    if (!confirm(`Hapus kegiatan "${k.nama}"?`)) return;
    try {
      await deleteKegiatan({ data: { id: k.id } });
      toast.success("Kegiatan dihapus");
      void refresh();
    } catch (e) {
      toast.error("Gagal menghapus", { description: (e as Error).message });
    }
  };

  return (
    <AppShell title="Master Kegiatan" subtitle="Kelola jenis kegiatan peminjaman warkah">
      <div className="space-y-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-primary" />
              Daftar Kegiatan ({items.length})
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari kegiatan..."
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
                      <th className="px-5 py-3 text-left font-semibold">Nama</th>
                      <th className="px-5 py-3 text-left font-semibold">Deskripsi</th>
                      <th className="px-5 py-3 text-left font-semibold">Status</th>
                      <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((k) => (
                      <tr key={k.id} className="hover:bg-muted/30">
                        <td className="px-5 py-3 font-semibold text-foreground">{k.nama}</td>
                        <td className="px-5 py-3 text-muted-foreground">{k.deskripsi ?? "—"}</td>
                        <td className="px-5 py-3">
                          {k.aktif ? (
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
                          <Button variant="ghost" size="icon" onClick={() => startEdit(k)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => void remove(k)}
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
            <DialogTitle>{editing ? "Edit Kegiatan" : "Tambah Kegiatan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nama">Nama Kegiatan *</Label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value.slice(0, 200) })}
                placeholder="cth. Pengukuran Bidang Tanah"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desk">Deskripsi</Label>
              <Textarea
                id="desk"
                value={form.deskripsi}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value.slice(0, 500) })}
                rows={3}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
              />
              Aktif (tampil di pilihan peminjaman)
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
