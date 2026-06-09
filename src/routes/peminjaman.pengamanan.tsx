import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Trash2, Save, X, ShieldCheck, Lock, Search, Loader2, Upload, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useKegiatan, usePeminjamMaster } from "@/lib/master-data";
import { insertPeminjaman } from "@/lib/data.functions";
import { usePeminjaman } from "@/lib/peminjaman-store";
import { KELURAHAN_PER_KECAMATAN, KECAMATAN_LIST, JENIS_HAK_OPTIONS } from "@/lib/wilayah-jakbar";

export const Route = createFileRoute("/peminjaman/pengamanan")({
  head: () => ({
    meta: [
      { title: "Peminjaman Pengamanan — BPN Jakarta Barat" },
      { name: "description", content: "Form pendaftaran peminjaman warkah pengamanan" },
    ],
  }),
  component: PeminjamanPengamananPage,
});

// Wilayah & jenis hak diambil dari src/lib/wilayah-jakbar.ts

type WarkahRow = {
  id: string;
  noHak: string;
  jenisHak: string;
  desa: string;
  kecamatan: string;
  noSu: string;
  tahunSu: string;
  noWarkah: string;
  tahunWarkah: string;
  noHt: string;
  tahunHt: string;
};

const emptyRow = (): WarkahRow => ({
  id: crypto.randomUUID(),
  noHak: "",
  jenisHak: "",
  desa: "",
  kecamatan: "",
  noSu: "",
  tahunSu: "",
  noWarkah: "",
  tahunWarkah: "",
  noHt: "",
  tahunHt: "",
});

// Buku Tanah, Surat Ukur & Warkah — sama seperti register
const rowSchema = z
  .object({
    noHak: z.string().trim().max(50),
    jenisHak: z.string().trim().max(50),
    desa: z.string().trim().min(1, "Desa wajib").max(100),
    kecamatan: z.string().trim().min(1, "Kecamatan wajib").max(100),
    noSu: z.string().trim().max(50),
    tahunSu: z.string().regex(/^(\d{4})?$/, "Tahun harus 4 digit"),
    noWarkah: z.string().trim().max(50),
    tahunWarkah: z.string().regex(/^(\d{4})?$/, "Tahun harus 4 digit"),
    noHt: z.string().trim().max(50),
    tahunHt: z.string().regex(/^(\d{4})?$/, "Tahun harus 4 digit"),
  })
  .superRefine((v, ctx) => {
    const noHak = v.noHak.trim();
    const noSu = v.noSu.trim();
    const noWarkah = v.noWarkah.trim();

    if (!noHak && !noSu && !noWarkah) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["noHak"],
        message: "Isi minimal salah satu: No. Hak, No. SU, atau No. Warkah",
      });
    }
    if (noHak && !v.jenisHak.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jenisHak"],
        message: "Jenis Hak wajib bila No. Hak diisi",
      });
    }
    const pairs: [string, string, string][] = [
      [noSu, v.tahunSu.trim(), "No. SU"],
      [noWarkah, v.tahunWarkah.trim(), "No. Warkah"],
      [v.noHt.trim(), v.tahunHt.trim(), "No. HT"],
    ];
    for (const [no, th, label] of pairs) {
      if (no && !/^\d{4}$/.test(th)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tahunSu"],
          message: `Tahun ${label} wajib 4 digit`,
        });
      }
    }
  });

const headerSchema = z.object({
  kegiatan: z.string().min(1, "Pilih kegiatan"),
  peminjamVia: z.string().min(1, "Pilih peminjam"),
  atensiNama: z.string().trim().max(150).optional(),
  tglPinjam: z.string().min(1),
});

function todayLocal(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function PeminjamanPengamananPage() {
  const { user } = useAuth();
  const { items: kegiatanList, loading: loadingKegiatan } = useKegiatan();
  const { items: peminjamMaster } = usePeminjamMaster();
  const { refresh } = usePeminjaman();

  const [kegiatan, setKegiatan] = useState("");
  const [peminjamVia, setPeminjamVia] = useState<string>("");
  const [atensiNama, setAtensiNama] = useState("");
  const [tglPinjam, setTglPinjam] = useState(todayLocal(0));
  const [keteranganPengamanan, setKeteranganPengamanan] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState<WarkahRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("File harus berformat PDF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10 MB");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const buf = await file.arrayBuffer();
      // Encode to base64 in chunks (large ArrayBuffers blow the call stack)
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(
          null,
          Array.from(bytes.subarray(i, i + chunk)),
        );
      }
      const contentBase64 = btoa(binary);
      const { uploadPengamananFile } = await import("@/lib/pengamanan-files.functions");
      const { path } = await uploadPengamananFile({
        data: { fileName: safeName, contentBase64 },
      });
      // Store the path with the marker so existing extractor still works
      setUploadedUrl(`/pengamanan-files/${path}`);
      setPdfFile(file);
      toast.success("PDF berhasil diupload");
    } catch (e) {
      toast.error("Gagal upload PDF", {
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
      });
    } finally {
      setUploading(false);
    }
  };


  const peminjamOptions: string[] = peminjamMaster.length
    ? peminjamMaster.map((p) => p.nama)
    : ["LOKET 1", "LOKET 2", "LOKET 3", "ATENSI"];

  const updateRow = (id: string, patch: Partial<WarkahRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));

  const addRow = () => setRows((rs) => [...rs, emptyRow()]);

  const reset = () => {
    setKegiatan("");
    setPeminjamVia("");
    setAtensiNama("");
    setTglPinjam(todayLocal(0));
    setKeteranganPengamanan("");
    setPdfFile(null);
    setUploadedUrl("");
    setRows([emptyRow()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const headerCheck = headerSchema.safeParse({
      kegiatan,
      peminjamVia,
      atensiNama,
      tglPinjam,
    });
    if (!headerCheck.success) {
      toast.error("Lengkapi data peminjaman", {
        description: headerCheck.error.issues[0]?.message,
      });
      return;
    }
    const isLoketP = /^LOKET\b/i.test(peminjamVia.trim());
    const isAtensiP = peminjamVia.trim() !== "" && !isLoketP;
    if (isAtensiP && !atensiNama.trim()) {
      toast.error("Catatan keterangan wajib diisi");
      return;
    }
    if (!keteranganPengamanan.trim()) {
      toast.error("Keterangan Pengamanan wajib diisi");
      return;
    }

    const filled = rows.filter(
      (r) =>
        r.noHak.trim() ||
        r.noSu.trim() ||
        r.noWarkah.trim() ||
        r.desa.trim() ||
        r.kecamatan.trim(),
    );
    if (filled.length === 0) {
      toast.error("Tambahkan minimal 1 data warkah");
      return;
    }
    for (const r of filled) {
      const c = rowSchema.safeParse(r);
      if (!c.success) {
        toast.error("Data warkah belum valid", {
          description: c.error.issues[0]?.message,
        });
        return;
      }
    }

    setSaving(true);
    const peminjamLabel = isAtensiP
      ? `${peminjamVia.trim()} — ${atensiNama.trim()}`
      : peminjamVia;
    const baseSeq = Date.now().toString().slice(-4);

    const inserts = filled.map((r, idx) => ({
      no_register: `PNG-${new Date().getFullYear()}-${baseSeq}${idx}`,
      peminjam: peminjamLabel,
      email: user.email,
      kegiatan,
      no_hak: r.noHak.trim() || "-",
      jenis_hak: r.jenisHak.trim() || "-",
      desa: r.desa,
      kecamatan: r.kecamatan,
      no_su: r.noSu && r.tahunSu ? `${r.noSu}/${r.tahunSu}` : r.noSu || null,
      no_warkah:
        r.noWarkah && r.tahunWarkah ? `${r.noWarkah}/${r.tahunWarkah}` : r.noWarkah || null,
      no_ht: r.noHt && r.tahunHt ? `${r.noHt}/${r.tahunHt}` : r.noHt || null,
      status: "Diamankan",
      tipe: "pengamanan",
      created_by: user.username,
      catatan: keteranganPengamanan.trim(),
      file_pengamanan_url: uploadedUrl || null,
    }));

    try {
      await insertPeminjaman({ data: { rows: inserts } });
    } catch (e) {
      setSaving(false);
      toast.error("Gagal menyimpan", { description: (e as Error).message });
      return;
    }
    setSaving(false);

    toast.success("Peminjaman pengamanan tersimpan", {
      description: `${filled.length} peminjaman didaftarkan oleh ${user.name}.`,
    });
    void refresh();
    reset();
  };

  const isLoket = /^LOKET\b/i.test(peminjamVia.trim());
  const showAtensi = peminjamVia.trim() !== "" && !isLoket;

  return (
    <AppShell title="Peminjaman Pengamanan" subtitle="Pendaftaran peminjaman warkah dengan jalur pengamanan">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-primary/30 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Data Peminjaman Pengamanan
            </CardTitle>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Jalur Pengamanan
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nama">Nama Peminjam</Label>
              <div className="relative">
                <Input
                  id="nama"
                  value={user?.name ?? ""}
                  readOnly
                  disabled
                  className="bg-muted/50 pr-10 font-semibold"
                />
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Otomatis dari akun terdaftar — tidak dapat diubah
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nip">NIP</Label>
              <Input id="nip" value={user?.nip ?? ""} readOnly disabled className="bg-muted/50 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit Kerja</Label>
              <Input id="unit" value={user?.unitKerja ?? ""} readOnly disabled className="bg-muted/50" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kegiatan">
                Kegiatan <span className="text-destructive">*</span>
              </Label>
              <Select value={kegiatan} onValueChange={setKegiatan}>
                <SelectTrigger id="kegiatan">
                  <SelectValue placeholder="-- Pilih kegiatan --" />
                </SelectTrigger>
                <SelectContent>
                  {loadingKegiatan ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Memuat...
                    </div>
                  ) : (
                    kegiatanList.filter((k) => k.aktif).map((k) => (
                      <SelectItem key={k.id} value={k.nama}>
                        {k.nama}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tglPinjam">Tanggal Pinjam</Label>
              <Input
                id="tglPinjam"
                type="datetime-local"
                value={tglPinjam}
                onChange={(e) => setTglPinjam(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="keteranganPengamanan">
                Keterangan Pengamanan <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="keteranganPengamanan"
                value={keteranganPengamanan}
                onChange={(e) => setKeteranganPengamanan(e.target.value.slice(0, 500))}
                placeholder="Untuk keperluan apa berkas ini diamankan..."
                maxLength={500}
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground">
                Jelaskan tujuan/alasan pengamanan berkas ({keteranganPengamanan.length}/500)
              </p>
            </div>




            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="peminjam">
                Peminjam <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Select value={peminjamVia} onValueChange={(v) => { setPeminjamVia(v); if (/^LOKET\b/i.test(v.trim())) setAtensiNama(""); }}>
                  <SelectTrigger id="peminjam">
                    <SelectValue placeholder="-- Pilih peminjam --" />
                  </SelectTrigger>
                  <SelectContent>
                    {peminjamOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showAtensi && (
                  <Input
                    placeholder="Nama / Keterangan Atensi"
                    value={atensiNama}
                    onChange={(e) => setAtensiNama(e.target.value.slice(0, 150))}
                    maxLength={150}
                    autoFocus
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Daftar Peminjaman</CardTitle>
            <Button type="button" size="sm" onClick={addRow} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Baris
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="space-y-1.5 border-b px-6 py-4">
              <Label htmlFor="pdfFile">Upload File PDF Pengamanan</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="pdfFile"
                  type="file"
                  accept="application/pdf"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                  }}
                  className="cursor-pointer"
                />
                {uploading && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengupload...
                  </span>
                )}
                {uploadedUrl && !uploading && (
                  <a
                    href={uploadedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/20"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {pdfFile?.name || "Lihat PDF"}
                  </a>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Maks. 10 MB. Format PDF. Opsional.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-y bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold">No. Hak / Jenis</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Desa / Kecamatan</th>
                    <th className="px-3 py-2.5 text-left font-semibold">No. SU / Tahun</th>
                    <th className="px-3 py-2.5 text-left font-semibold">No. Warkah / Tahun</th>
                    <th className="px-3 py-2.5 text-left font-semibold">No. HT / Tahun</th>
                    <th className="w-12 px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 align-top">
                      <td className="px-2 py-2 min-w-[180px]">
                        <div className="space-y-1.5">
                          <Input
                            value={row.noHak}
                            onChange={(e) => updateRow(row.id, { noHak: e.target.value.slice(0, 50) })}
                            placeholder="Nomor Hak"
                            className="h-9 font-semibold"
                          />
                          <Select
                            value={row.jenisHak}
                            onValueChange={(v) => updateRow(row.id, { jenisHak: v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Jenis Hak" />
                            </SelectTrigger>
                            <SelectContent>
                              {JENIS_HAK_OPTIONS.map((j) => (
                                <SelectItem key={j} value={j}>
                                  {j}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-2 py-2 min-w-[200px]">
                        <div className="space-y-1.5">
                          <Select
                            value={row.kecamatan}
                            onValueChange={(v) => updateRow(row.id, { kecamatan: v, desa: "" })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Kecamatan" />
                            </SelectTrigger>
                            <SelectContent>
                              {KECAMATAN_LIST.map((k) => (
                                <SelectItem key={k} value={k}>
                                  {k}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={row.desa}
                            onValueChange={(v) => updateRow(row.id, { desa: v })}
                            disabled={!row.kecamatan}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue
                                placeholder={row.kecamatan ? "Pilih kelurahan" : "Pilih kec. dulu"}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {(KELURAHAN_PER_KECAMATAN[row.kecamatan] ?? []).map((d) => (
                                <SelectItem key={d} value={d}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <Input
                            value={row.noSu}
                            onChange={(e) => updateRow(row.id, { noSu: e.target.value.slice(0, 50) })}
                            placeholder="No. SU"
                            className="h-9"
                          />
                          <Input
                            value={row.tahunSu}
                            onChange={(e) =>
                              updateRow(row.id, { tahunSu: e.target.value.replace(/\D/g, "").slice(0, 4) })
                            }
                            placeholder="Tahun"
                            className="h-9 w-20"
                            inputMode="numeric"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <Input
                            value={row.noWarkah}
                            onChange={(e) => updateRow(row.id, { noWarkah: e.target.value.slice(0, 50) })}
                            placeholder="No. Warkah"
                            className="h-9"
                          />
                          <Input
                            value={row.tahunWarkah}
                            onChange={(e) =>
                              updateRow(row.id, { tahunWarkah: e.target.value.replace(/\D/g, "").slice(0, 4) })
                            }
                            placeholder="Tahun"
                            className="h-9 w-20"
                            inputMode="numeric"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <Input
                            value={row.noHt}
                            onChange={(e) => updateRow(row.id, { noHt: e.target.value.slice(0, 50) })}
                            placeholder="No. HT"
                            className="h-9"
                          />
                          <Input
                            value={row.tahunHt}
                            onChange={(e) =>
                              updateRow(row.id, { tahunHt: e.target.value.replace(/\D/g, "").slice(0, 4) })
                            }
                            placeholder="Tahun"
                            className="h-9 w-20"
                            inputMode="numeric"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:bg-destructive/10"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length <= 1}
                          aria-label="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            Menampilkan {rows.length} baris peminjaman
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={reset} className="gap-1.5">
              <X className="h-4 w-4" />
              Batal
            </Button>
            <Button type="submit" className="gap-1.5" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
