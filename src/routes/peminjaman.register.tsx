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
import { Plus, Trash2, Save, X, FileEdit, Lock, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useKegiatan, usePeminjamMaster } from "@/lib/master-data";
import { insertPeminjaman } from "@/lib/data.functions";
import { usePeminjaman } from "@/lib/peminjaman-store";
import { KELURAHAN_PER_KECAMATAN, KECAMATAN_LIST, JENIS_HAK_OPTIONS } from "@/lib/wilayah-jakbar";

export const Route = createFileRoute("/peminjaman/register")({
  head: () => ({
    meta: [
      { title: "Peminjaman Register — BPN Jakarta Barat" },
      { name: "description", content: "Form pendaftaran peminjaman" },
    ],
  }),
  component: PeminjamanRegisterPage,
});

// Kegiatan diambil dari master data; Desa & Kecamatan dari KELURAHAN_PER_KECAMATAN.
// Jenis Hak diambil dari JENIS_HAK_OPTIONS.

// Peminjam options dimuat dari master data (tabel peminjam)

type HtEntry = { id: string; no: string; tahun: string };

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
  htList: HtEntry[];
};

export const JENIS_PEMINJAMAN_OPTIONS = [
  "BT",
  "BT & HT",
  "BT & SU",
  "BT & Warkah",
  "BT, SU & Warkah",
  "SU",
  "Warkah",
] as const;

const emptyHt = (): HtEntry => ({ id: crypto.randomUUID(), no: "", tahun: "" });

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
  htList: [emptyHt()],
});


// Validation schema — Buku Tanah, Surat Ukur & Warkah
// Aturan: Desa & Kecamatan WAJIB. Minimal salah satu dari No.Hak / No.SU / No.Warkah terisi.
// Jenis Hak hanya wajib bila No.Hak terisi. No.HT selalu opsional.
const htEntrySchema = z.object({
  no: z.string().trim().max(50),
  tahun: z.string().regex(/^(\d{4})?$/, "Tahun harus 4 digit"),
});

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
    htList: z.array(htEntrySchema).default([]),
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

    for (const ht of v.htList) {
      if (ht.no.trim() && !/^\d{4}$/.test(ht.tahun.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["htList"],
          message: "Tahun HT wajib 4 digit untuk setiap nomor HT",
        });
      }
    }
  });

const headerSchema = z.object({
  kegiatan: z.string().min(1, "Pilih kegiatan"),
  peminjamVia: z.string().min(1, "Pilih peminjam"),
  atensiNama: z.string().trim().max(150).optional(),
  tglPinjam: z.string().min(1),
  tglJatuhTempo: z.string().min(1),
});

function todayLocal(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function PeminjamanRegisterPage() {
  const { user } = useAuth();
  const { items: kegiatanList, loading: loadingKegiatan } = useKegiatan();
  const { items: peminjamMaster } = usePeminjamMaster();
  const { refresh } = usePeminjaman();

  const [kegiatan, setKegiatan] = useState("");
  const [peminjamVia, setPeminjamVia] = useState<string>("");
  const [atensiNama, setAtensiNama] = useState("");
  const [tglPinjam, setTglPinjam] = useState(todayLocal(0));
  const [tglJatuhTempo, setTglJatuhTempo] = useState(todayLocal(14));
  const [jenisPeminjaman, setJenisPeminjaman] = useState<string>("");
  const [rows, setRows] = useState<WarkahRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);


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
    setTglJatuhTempo(todayLocal(14));
    setJenisPeminjaman("");
    setRows([emptyRow()]);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const headerCheck = headerSchema.safeParse({
      kegiatan,
      peminjamVia: peminjamVia === "ATENSI" || peminjamVia.startsWith("LOKET") ? peminjamVia : peminjamVia,
      atensiNama,
      tglPinjam,
      tglJatuhTempo,
    });
    if (!headerCheck.success) {
      toast.error("Lengkapi data peminjaman", {
        description: headerCheck.error.issues[0]?.message,
      });
      return;
    }
    if (isAtensi && !atensiNama.trim()) {
      toast.error("Catatan keterangan wajib diisi");
      return;
    }

    // Baris dianggap terisi bila ada salah satu data inti (Hak/SU/Warkah)
    // atau lokasi sudah dipilih
    const filled = rows.filter(
      (r) =>
        r.noHak.trim() ||
        r.noSu.trim() ||
        r.noWarkah.trim() ||
        r.desa.trim() ||
        r.kecamatan.trim(),
    );
    if (filled.length === 0) {
      toast.error("Tambahkan minimal 1 data peminjaman");
      return;
    }
    for (const r of filled) {
      const c = rowSchema.safeParse(r);
      if (!c.success) {
        toast.error("Data peminjaman belum valid", {
          description: c.error.issues[0]?.message,
        });
        return;
      }
    }

    setSaving(true);
    const peminjamLabel = isAtensi
      ? `${peminjamVia.trim()} — ${atensiNama.trim()}`
      : peminjamVia;
    const baseSeq = Date.now().toString().slice(-4);

    const inserts = filled.map((r, idx) => ({
      no_register: `REG-${new Date().getFullYear()}-${baseSeq}${idx}`,
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
      no_ht:
        r.htList
          .map((h) => {
            const no = h.no.trim();
            const th = h.tahun.trim();
            if (!no) return "";
            return th ? `${no}/${th}` : no;
          })
          .filter(Boolean)
          .join("; ") || null,
      jenis_peminjaman: jenisPeminjaman || null,
      status: "Proses Pencarian",
      tipe: "register",
      created_by: user.username,
    }));

    try {
      await insertPeminjaman({ data: { rows: inserts } });
    } catch (e) {
      setSaving(false);
      toast.error("Gagal menyimpan", { description: (e as Error).message });
      return;
    }
    setSaving(false);

    toast.success("Peminjaman tersimpan", {
      description: `${filled.length} peminjaman didaftarkan oleh ${user.name}.`,
    });
    void refresh();
    reset();
  };

  const isLoket = /^LOKET\b/i.test(peminjamVia.trim());
  const isAtensi = peminjamVia.trim() !== "" && !isLoket;
  const showAtensi = isAtensi;

  return (
    <AppShell title="Peminjaman Register" subtitle="Pendaftaran peminjaman baru">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header card */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileEdit className="h-5 w-5 text-primary" />
              Data Peminjaman
            </CardTitle>
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
              Sesi terenkripsi
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Nama Peminjam — locked to current account */}
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

            <div className="space-y-1.5">
              <Label htmlFor="tglJatuh">Tanggal Jatuh Tempo</Label>
              <Input
                id="tglJatuh"
                type="datetime-local"
                value={tglJatuhTempo}
                onChange={(e) => setTglJatuhTempo(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="jenisPeminjaman">Jenis Peminjaman (KET)</Label>
              <Select value={jenisPeminjaman} onValueChange={setJenisPeminjaman}>
                <SelectTrigger id="jenisPeminjaman">
                  <SelectValue placeholder="-- KET: BT / BT&SU dll --" />
                </SelectTrigger>
                <SelectContent>
                  {JENIS_PEMINJAMAN_OPTIONS.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {/* Warkah rows */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Daftar Peminjaman</CardTitle>
            <Button type="button" size="sm" onClick={addRow} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Baris
            </Button>
          </CardHeader>
          <CardContent className="p-0">
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
                            onValueChange={(v) =>
                              updateRow(row.id, { kecamatan: v, desa: "" })
                            }
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
                      <td className="px-2 py-2 min-w-[220px]">
                        <div className="space-y-1.5">
                          {row.htList.map((ht, idx) => (
                            <div key={ht.id} className="flex gap-1">
                              <Input
                                value={ht.no}
                                onChange={(e) => {
                                  const v = e.target.value.slice(0, 50);
                                  updateRow(row.id, {
                                    htList: row.htList.map((h) =>
                                      h.id === ht.id ? { ...h, no: v } : h,
                                    ),
                                  });
                                }}
                                placeholder="No. HT"
                                className="h-9"
                              />
                              <Input
                                value={ht.tahun}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                                  updateRow(row.id, {
                                    htList: row.htList.map((h) =>
                                      h.id === ht.id ? { ...h, tahun: v } : h,
                                    ),
                                  });
                                }}
                                placeholder="Tahun"
                                className="h-9 w-20"
                                inputMode="numeric"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  updateRow(row.id, {
                                    htList:
                                      row.htList.length > 1
                                        ? row.htList.filter((h) => h.id !== ht.id)
                                        : [emptyHt()],
                                  })
                                }
                                aria-label="Hapus HT"
                                disabled={row.htList.length <= 1 && !ht.no && !ht.tahun}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              {idx === row.htList.length - 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() =>
                                    updateRow(row.id, { htList: [...row.htList, emptyHt()] })
                                  }
                                  aria-label="Tambah HT"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          ))}
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

        {/* Actions */}
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
