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

const STATUS_PENGEMBALIAN = new Set([
  "Proses Dikembalikan",
  "Sudah Dikembalikan",
  "Pengembalian Diterima",
  "Dikembalikan",
]);

function inMonth(iso: string | undefined, year: number, month: number) {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month - 1
  );
}

/**
 * Ekspor laporan bulanan (tanggal 1–31) Peminjaman & Pengembalian.
 * - Sheet "Peminjaman": data yang diajukan pada bulan tsb (tgl pengajuan).
 * - Sheet "Pengembalian": data yang diupdate ke status pengembalian pada bulan tsb.
 * - Sheet "Ringkasan": total + rincian per hari (1–31).
 */
export function exportBulananExcel(items: Peminjaman[], year: number, month: number) {
  const bulanLabel = new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const peminjaman = items.filter((p) => inMonth(p.tglPengajuan, year, month));
  const pengembalian = items.filter(
    (p) => STATUS_PENGEMBALIAN.has(p.status) && inMonth(p.tglUpdate, year, month),
  );

  const wb = XLSX.utils.book_new();

  const ringkasan: Record<string, unknown>[] = [
    { Keterangan: "Periode", Jumlah: `1–31 ${bulanLabel}` },
    { Keterangan: "Total Peminjaman (pengajuan bulan ini)", Jumlah: peminjaman.length },
    { Keterangan: "Total Pengembalian (update bulan ini)", Jumlah: pengembalian.length },
    { Keterangan: "", Jumlah: "" },
    { Keterangan: "Rincian per Tanggal", Jumlah: "" },
  ];
  for (let day = 1; day <= 31; day++) {
    const jmPinjam = peminjaman.filter((p) => new Date(p.tglPengajuan!).getDate() === day).length;
    const jmKembali = pengembalian.filter((p) => new Date(p.tglUpdate!).getDate() === day).length;
    if (jmPinjam === 0 && jmKembali === 0) continue;
    ringkasan.push({
      Keterangan: `Tanggal ${day}`,
      Jumlah: `Peminjaman: ${jmPinjam} | Pengembalian: ${jmKembali}`,
    });
  }
  const wsSum = XLSX.utils.json_to_sheet(ringkasan);
  wsSum["!cols"] = [{ wch: 42 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSum, "Ringkasan");

  const rowsP = peminjaman.map(baseRow);
  const wsP = XLSX.utils.json_to_sheet(rowsP.length ? rowsP : [{ "No.": "Tidak ada data" }]);
  wsP["!cols"] = autoCols(rowsP);
  XLSX.utils.book_append_sheet(wb, wsP, "Peminjaman");

  const rowsK = pengembalian.map(baseRow);
  const wsK = XLSX.utils.json_to_sheet(rowsK.length ? rowsK : [{ "No.": "Tidak ada data" }]);
  wsK["!cols"] = autoCols(rowsK);
  XLSX.utils.book_append_sheet(wb, wsK, "Pengembalian");

  save(wb, `laporan-bulanan-${year}-${String(month).padStart(2, "0")}`);
}
