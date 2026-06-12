import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Peminjaman } from "@/lib/peminjaman-store";
import { getPengamananSignedUrl } from "@/lib/pengamanan-files.functions";
import { toast } from "sonner";

function extractPengamananPath(url: string): string | null {
  const marker = "/pengamanan-files/";
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

async function openPengamananPdf(url: string) {
  const path = extractPengamananPath(url);
  if (!path) {
    toast.error("URL file tidak valid", {
      description: "File pengamanan tidak dapat dibuka karena URL tidak dikenali.",
    });
    return;
  }
  try {
    const { signedUrl } = await getPengamananSignedUrl({ data: { path } });
    window.open(signedUrl, "_blank", "noopener,noreferrer");
  } catch (e) {
    toast.error("Gagal membuka PDF", {
      description: e instanceof Error ? e.message : "File tidak ditemukan",
    });
  }
}

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

export function DetailPeminjamanDialog({
  item,
  onClose,
}: {
  item: Peminjaman | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail Data Peminjaman</DialogTitle>
          <DialogDescription>
            Informasi lengkap Data Peminjaman, buku tanah & surat ukur
          </DialogDescription>
        </DialogHeader>
        {item && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                No. Register
              </p>
              <p className="mt-0.5 font-mono text-base font-bold text-primary">
                {item.noRegister}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3">
              <Field label="No. Hak" value={item.noHak} mono bold />
              <Field label="Jenis Hak" value={item.jenisHak} />
              <Field label="Desa" value={item.desa || "—"} />
              <Field label="Kecamatan" value={item.kecamatan || "—"} />
              <Field label="No. SU / Tahun" value={item.noSu || "—"} mono />
              <Field label="No. Warkah / Tahun" value={item.noWarkah || "—"} mono />
              <Field label="No. HT / Tahun" value={item.noHt || "—"} mono />
              <Field
                label="Tipe"
                value={item.tipe === "pengamanan" ? "Pengamanan" : "Register"}
              />
              <Field label="Jenis Peminjaman" value={item.jenisPeminjaman || "—"} />
              <Field label="Kegiatan" value={item.kegiatan} />
              <Field label="Peminjam" value={item.peminjam} />
              <Field label="Email" value={item.email || "—"} />
              <Field label="Status" value={item.status} />
              <Field label="Tgl Pengajuan" value={fmtDate(item.tglPengajuan)} />
              <Field label="Dikonfirmasi Oleh" value={item.dikonfirmasiOleh || "—"} />
              <Field label="Tgl Konfirmasi" value={fmtDate(item.tglKonfirmasi)} />
              <Field
                label="Tgl Pengembalian"
                value={item.status === "Sudah Dikembalikan" ? fmtDate(item.tglUpdate) : "—"}
              />
              <Field label="Tgl Update" value={fmtDate(item.tglUpdate)} />
            </div>
            {item.catatan && (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Catatan
                </p>
                <p className="mt-0.5 text-sm">{item.catatan}</p>
              </div>
            )}
            {item.filePengamananUrl && (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  File Pengamanan (PDF)
                </p>
                <button
                  type="button"
                  onClick={() => void openPengamananPdf(item.filePengamananUrl!)}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Lihat / Unduh PDF
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  mono,
  bold,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-0.5 ${mono ? "font-mono" : ""} ${
          bold ? "text-base font-bold" : "text-sm font-medium"
        } text-foreground`}
      >
        {value}
      </p>
    </div>
  );
}
