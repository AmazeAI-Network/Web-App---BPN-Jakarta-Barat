import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { updatePeminjaman, type PeminjamanUpdate } from "@/lib/data.functions";
import type { Peminjaman } from "@/lib/peminjaman-store";

type Props = {
  item: Peminjaman | null;
  onClose: () => void;
  onSaved: () => void;
};

/** Dialog revisi data yang sudah disubmit (tersedia untuk semua role atas data miliknya). */
export function RevisePeminjamanDialog({ item, onClose, onSaved }: Props) {
  const [form, setForm] = useState<PeminjamanUpdate>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return;
    setForm({
      peminjam: item.peminjam,
      kegiatan: item.kegiatan,
      no_hak: item.noHak,
      jenis_hak: item.jenisHak,
      desa: item.desa,
      kecamatan: item.kecamatan,
      no_su: item.noSu ?? "",
      no_warkah: item.noWarkah ?? "",
      no_ht: item.noHt ?? "",
      jenis_peminjaman: item.jenisPeminjaman ?? "",
      catatan: item.catatan ?? "",
    });
  }, [item]);

  const set = (k: keyof PeminjamanUpdate, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!item) return;
    if (!String(form.desa ?? "").trim() || !String(form.kecamatan ?? "").trim()) {
      toast.error("Desa dan Kecamatan wajib diisi");
      return;
    }
    setBusy(true);
    try {
      await updatePeminjaman(item.id, form);
      toast.success("Revisi tersimpan", { description: item.noRegister });
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Gagal menyimpan revisi", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, key: keyof PeminjamanUpdate) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        className="h-9"
        value={String(form[key] ?? "")}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <Dialog open={!!item} onOpenChange={(o) => !busy && !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" /> Revisi Data Peminjaman
          </DialogTitle>
          <DialogDescription>
            Perbaiki data yang sudah disubmit. Desa dan Kecamatan wajib diisi.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded border bg-muted/30 p-2 text-xs font-mono text-muted-foreground">
              {item.noRegister} · status: {item.status}
            </div>
            {field("Nama Peminjam", "peminjam")}
            {field("Kegiatan", "kegiatan")}
            {field("No. Hak", "no_hak")}
            {field("Jenis Hak", "jenis_hak")}
            {field("Desa *", "desa")}
            {field("Kecamatan *", "kecamatan")}
            {field("No. SU", "no_su")}
            {field("No. Warkah", "no_warkah")}
            {field("No. HT", "no_ht")}
            {field("Jenis Peminjaman (KET)", "jenis_peminjaman")}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Catatan</Label>
              <Textarea
                rows={3}
                value={String(form.catatan ?? "")}
                onChange={(e) => set("catatan", e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Menyimpan..." : "Simpan Revisi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
