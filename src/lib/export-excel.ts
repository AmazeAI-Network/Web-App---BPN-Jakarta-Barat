import * as XLSX from "xlsx";
import type { Peminjaman } from "@/lib/peminjaman-store";

function fmt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("id-ID");
}

function baseRow(p: Peminjaman, i: number) {
  return {
    "No.": i + 1,
    "Tgl Pengajuan": fmt(p.tglPengajuan),
    "No. Register": p.noRegister,
    "Nama Pemohon": p.peminjam,
    "Nama Pemilik Sertifikat": "",
    "No. Berkas PNBP": "",
    Tahun: p.tglPengajuan ? new Date(p.tglPengajuan).getFullYear() : "",
    "No. SU/Tahun": p.noSu ?? "",
    "No. Hak": p.noHak,
    "Jenis Hak": p.jenisHak,
    Desa: p.desa,
    Kecamatan: p.kecamatan,
    "No. Warkah": p.noWarkah ?? "",
    "No. HT": p.noHt ?? "",
    "No HP Pemohon": "",
    "No HP Pemilik Sertifikat": "",
    "Link Shareloc": "",
    Email: p.email,
    Pengguna: p.createdBy ?? "",
    Kegiatan: p.kegiatan,
    "Jenis Peminjaman": p.jenisPeminjaman ?? "",
    Tipe: p.tipe,
    Status: p.status,
    "Catatan Penolakan": p.catatan ?? "",
    "Petugas arsip-verifikasi": p.dikonfirmasiOleh ?? "",
    "Tanggal Jam (arsip-verifikasi)": fmt(p.tglKonfirmasi),
    "Petugas validasi-su": "",
    "Tanggal Jam (validasi-su)": "",
    "Petugas validasi-bt": "",
    "Tanggal Jam (validasi-bt)": "",
    "Selesai Sudah Di infokan":
      p.status === "Sudah Dikembalikan" || p.status === "Pengembalian Diterima" ? "Ya" : "",
    "Diinput Oleh": p.createdBy ?? "",
    "Role Penginput": p.createdByRole ?? "",
    "Tgl Update": fmt(p.tglUpdate),
  };
}

function autoCols(rows: Record<string, unknown>[]) {
  return Object.keys(rows[0] ?? { a: "" }).map((k) => ({ wch: Math.max(12, k.length + 2) }));
}

function save(wb: XLSX.WorkBook, prefix: string) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  XLSX.writeFile(wb, `${prefix}-${stamp}.xlsx`);
}

/** Ekspor rekapitulasi laporan lengkap peminjaman warkah ke file Excel (.xlsx). */
export function exportRekapitulasiExcel(items: Peminjaman[], filenamePrefix = "rekapitulasi-peminjaman") {
  const rows = items.map(baseRow);

  const perStatus = new Map<string, number>();
  items.forEach((p) => perStatus.set(p.status, (perStatus.get(p.status) ?? 0) + 1));
  const ringkasan = [
    { Keterangan: "Total data", Jumlah: items.length },
    ...Array.from(perStatus.entries()).map(([Keterangan, Jumlah]) => ({ Keterangan, Jumlah })),
    { Keterangan: "Diekspor pada", Jumlah: new Date().toLocaleString("id-ID") },
  ];

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.json_to_sheet(rows);
  wsData["!cols"] = autoCols(rows);
  XLSX.utils.book_append_sheet(wb, wsData, "Rekapitulasi");
  const wsSum = XLSX.utils.json_to_sheet(ringkasan);
  wsSum["!cols"] = [{ wch: 28 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsSum, "Ringkasan");

  save(wb, filenamePrefix);
}

function safeSheetName(name: string) {
  return name.replace(/[\\/?*[\]:]/g, "-").slice(0, 31) || "Sheet";
}

/** Ekspor rekap keseluruhan data yang dipisah per status (1 sheet per status + ringkasan). */
export function exportRekapPerStatusExcel(items: Peminjaman[], filenamePrefix = "rekap-per-status") {
  const groups = new Map<string, Peminjaman[]>();
  items.forEach((p) => {
    const arr = groups.get(p.status) ?? [];
    arr.push(p);
    groups.set(p.status, arr);
  });

  const wb = XLSX.utils.book_new();

  const ringkasan = [
    ...Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([Status, list]) => ({
        Status,
        Jumlah: list.length,
        "Persentase (%)": items.length ? Number(((list.length / items.length) * 100).toFixed(1)) : 0,
      })),
    { Status: "TOTAL", Jumlah: items.length, "Persentase (%)": items.length ? 100 : 0 },
  ];
  const wsSum = XLSX.utils.json_to_sheet(ringkasan);
  wsSum["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsSum, "Rekap Status");

  Array.from(groups.entries()).forEach(([status, list]) => {
    const rows = list.map(baseRow);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = autoCols(rows);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(status));
  });

  save(wb, filenamePrefix);
}
