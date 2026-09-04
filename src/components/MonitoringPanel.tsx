import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Activity,
  Search,
  Loader2,
  Filter,
  Eye,
  Trash2,
  Undo2,
  ShieldCheck,
  PackageCheck,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Pencil,
  FileSpreadsheet,
} from "lucide-react";
import {
  usePeminjaman,
  STATUS_LIST,
  STATUS_LABEL,
  statusBadgeClasses,
  type StatusPeminjaman,
  type Peminjaman,
} from "@/lib/peminjaman-store";
import { DetailPeminjamanDialog } from "@/components/DetailPeminjamanDialog";
import { RevisePeminjamanDialog } from "@/components/RevisePeminjamanDialog";
import { exportRekapitulasiExcel, exportRekapPerStatusExcel, exportBulananExcel } from "@/lib/export-excel";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { deletePeminjaman, updatePeminjamanStatus } from "@/lib/data.functions";
import { toast } from "sonner";

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

export function MonitoringPanel() {
  const { items: allItems, loading, refresh } = usePeminjaman();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kegiatanFilter, setKegiatanFilter] = useState<string>("all");
  const now = new Date();
  const [bulanExport, setBulanExport] = useState<string>(String(now.getMonth() + 1));
  const [tahunExport, setTahunExport] = useState<string>(String(now.getFullYear()));
  const [detail, setDetail] = useState<Peminjaman | null>(null);
  const [toDelete, setToDelete] = useState<Peminjaman | null>(null);
  const [toRevise, setToRevise] = useState<Peminjaman | null>(null);
  const [toRevert, setToRevert] = useState<Peminjaman | null>(null);
  const [toArchive, setToArchive] = useState<Peminjaman | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  type SortKey = "noHak" | "desa" | "peminjam" | "kegiatan" | "jenisPeminjaman" | "tglPengajuan" | "tglKonfirmasi" | "status";
  type SortRule = { key: SortKey; dir: "asc" | "desc" };
  const [sorts, setSorts] = useState<SortRule[]>([{ key: "tglPengajuan", dir: "desc" }]);
  const toggleSort = (k: SortKey, additive: boolean) => {
    setSorts((prev) => {
      const idx = prev.findIndex((s) => s.key === k);
      if (!additive) {
        if (idx === 0 && prev.length === 1) {
          return [{ key: k, dir: prev[0].dir === "asc" ? "desc" : "asc" }];
        }
        return [{ key: k, dir: "asc" }];
      }
      if (idx === -1) return [...prev, { key: k, dir: "asc" }];
      const next = [...prev];
      const cur = next[idx];
      if (cur.dir === "asc") next[idx] = { key: k, dir: "desc" };
      else next.splice(idx, 1);
      return next.length ? next : [{ key: "tglPengajuan", dir: "desc" }];
    });
  };
  const SortIcon = ({ k }: { k: SortKey }) => {
    const idx = sorts.findIndex((s) => s.key === k);
    if (idx === -1) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    const rule = sorts[idx];
    return (
      <span className="ml-1 inline-flex items-center text-primary">
        {rule.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {sorts.length > 1 && <span className="ml-0.5 text-[9px] font-bold">{idx + 1}</span>}
      </span>
    );
  };

  const isAdmin = user?.role === "admin";

  const items = useMemo(() => {
    if (isAdmin) return allItems;
    if (!user) return [];
    return allItems.filter(
      (p) => p.createdBy === user.username || p.createdBy === user.name,
    );
  }, [allItems, isAdmin, user]);

  const kegiatanOptions = useMemo(
    () => Array.from(new Set(items.map((p) => p.kegiatan).filter(Boolean))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return items
      .filter((p) => statusFilter === "all" || p.status === statusFilter)
      .filter((p) => kegiatanFilter === "all" || p.kegiatan === kegiatanFilter)
      .filter(
        (p) =>
          !k ||
          p.noHak.toLowerCase().includes(k) ||
          p.peminjam.toLowerCase().includes(k) ||
          p.noRegister.toLowerCase().includes(k) ||
          (p.desa ?? "").toLowerCase().includes(k) ||
          (p.kecamatan ?? "").toLowerCase().includes(k) ||
          (p.noSu ?? "").toLowerCase().includes(k) ||
          (p.noWarkah ?? "").toLowerCase().includes(k) ||
          (p.noHt ?? "").toLowerCase().includes(k) ||
          p.kegiatan.toLowerCase().includes(k),
      )
      .sort((a, b) => {
        for (const s of sorts) {
          const av = (a[s.key] ?? "") as string;
          const bv = (b[s.key] ?? "") as string;
          if (av === bv) continue;
          const dir = s.dir === "asc" ? 1 : -1;
          return av < bv ? -dir : dir;
        }
        return 0;
      });
  }, [items, q, statusFilter, kegiatanFilter, sorts]);

  // Reset ke halaman 1 saat filter/pencarian berubah
  useMemo(() => {
    setPage(1);
  }, [q, statusFilter, kegiatanFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + pageSize);

  const counts = useMemo(() => {
    const c: Record<StatusPeminjaman, number> = {
      "Proses Pencarian": 0,
      "Siap Diserahkan": 0,
      "Sedang Dipinjam": 0,
      "Proses Dikembalikan": 0,
      "Sudah Dikembalikan": 0,
      "Pengembalian Diterima": 0,
      "Diamankan": 0,
      "Dikembalikan": 0,
    };
    items.forEach((p) => c[p.status]++);
    return c;
  }, [items]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await deletePeminjaman({ data: { id: toDelete.id } });
      toast.success("Data dihapus", { description: toDelete.noRegister });
      setToDelete(null);
      void refresh();
    } catch (e) {
      toast.error("Gagal menghapus", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleRevert = async () => {
    if (!toRevert) return;
    setBusy(true);
    try {
      await updatePeminjamanStatus({
        data: { id: toRevert.id, status: "Proses Pencarian", catatan: null },
      });
      toast.success("Status dikembalikan", {
        description: `${toRevert.noRegister} → Proses Pencarian`,
      });
      setToRevert(null);
      void refresh();
    } catch (e) {
      toast.error("Gagal mengembalikan status", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!toArchive) return;
    setBusy(true);
    try {
      await updatePeminjamanStatus({
        data: { id: toArchive.id, status: "Proses Dikembalikan", catatan: null },
      });
      toast.success("Pengembalian diverifikasi loket", {
        description: `${toArchive.noRegister} → Proses Dikembalikan (menunggu konfirmasi)`,
      });
      setToArchive(null);
      void refresh();
    } catch (e) {
      toast.error("Gagal verifikasi pengembalian", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {STATUS_LIST.map((s) => (
          <Card key={s} className="shadow-card">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {STATUS_LABEL[s]}
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-primary" />
            Daftar Peminjaman ({filtered.length} dari {items.length})
            {isAdmin && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <ShieldCheck className="h-3 w-3" /> Admin
              </span>
            )}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              disabled={filtered.length === 0}
              onClick={() => {
                exportRekapitulasiExcel(filtered);
                toast.success("Rekapitulasi diekspor", {
                  description: `${filtered.length} baris ke file Excel`,
                });
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel ({filtered.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              disabled={items.length === 0}
              onClick={() => {
                exportRekapPerStatusExcel(items);
                toast.success("Rekap per status diekspor", {
                  description: `${items.length} baris, dipisah per status`,
                });
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Rekap per Status ({items.length})
            </Button>
            <div className="flex items-center gap-1.5">
              <Select value={bulanExport} onValueChange={setBulanExport}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {new Date(2000, i, 1).toLocaleDateString("id-ID", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tahunExport} onValueChange={setTahunExport}>
                <SelectTrigger className="h-9 w-[100px]">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5"
                disabled={items.length === 0}
                onClick={() => {
                  exportBulananExcel(items, Number(tahunExport), Number(bulanExport));
                  toast.success("Laporan bulanan diekspor", {
                    description: `Periode 1–31, bulan ${bulanExport}/${tahunExport}`,
                  });
                }}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Bulanan
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari no.hak, peminjam, register, desa, no.SU/peminjaman/HT, kegiatan..."
                className="h-9 pl-8 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full md:w-[180px]">
                <Filter className="mr-1 h-3.5 w-3.5" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {STATUS_LIST.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={kegiatanFilter} onValueChange={setKegiatanFilter}>
              <SelectTrigger className="h-9 w-full md:w-[200px]">
                <SelectValue placeholder="Kegiatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kegiatan</SelectItem>
                {kegiatanOptions.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-12 text-center text-sm text-muted-foreground">
              Tidak ada data sesuai filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="border-y bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-2 py-3 text-left font-semibold">No.</th>
                    <th className="px-2 py-3 text-left font-semibold cursor-pointer select-none hover:text-foreground" onClick={(e) => toggleSort("noHak", e.shiftKey)}>No. Hak / Jenis<SortIcon k="noHak" /></th>
                    <th className="px-2 py-3 text-left font-semibold cursor-pointer select-none hover:text-foreground" onClick={(e) => toggleSort("desa", e.shiftKey)}>Desa / Kec.<SortIcon k="desa" /></th>
                    <th className="px-2 py-3 text-left font-semibold">No. SU/Warkah/HT</th>
                    <th className="px-2 py-3 text-left font-semibold cursor-pointer select-none hover:text-foreground" onClick={(e) => toggleSort("peminjam", e.shiftKey)}>Nama Peminjam<SortIcon k="peminjam" /></th>
                    <th className="px-2 py-3 text-left font-semibold cursor-pointer select-none hover:text-foreground" onClick={(e) => toggleSort("kegiatan", e.shiftKey)}>Kegiatan<SortIcon k="kegiatan" /></th>
                    <th className="px-2 py-3 text-left font-semibold cursor-pointer select-none hover:text-foreground" onClick={(e) => toggleSort("jenisPeminjaman", e.shiftKey)}>KET<SortIcon k="jenisPeminjaman" /></th>
                    <th className="px-2 py-3 text-left font-semibold cursor-pointer select-none hover:text-foreground" onClick={(e) => toggleSort("tglPengajuan", e.shiftKey)}>Tgl Pengajuan<SortIcon k="tglPengajuan" /></th>
                    <th className="px-2 py-3 text-left font-semibold cursor-pointer select-none hover:text-foreground" onClick={(e) => toggleSort("tglKonfirmasi", e.shiftKey)}>Tgl Konfirmasi<SortIcon k="tglKonfirmasi" /></th>
                    <th className="px-2 py-3 text-left font-semibold cursor-pointer select-none hover:text-foreground" onClick={(e) => toggleSort("status", e.shiftKey)}>Status<SortIcon k="status" /></th>
                    <th className="px-2 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pageRows.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-muted/30 align-top">
                      <td className="px-2 py-3 text-xs text-muted-foreground">{startIdx + idx + 1}</td>
                      <td className="px-2 py-3">
                        <p className="font-mono text-sm font-bold text-foreground">{p.noHak}</p>
                        <p className="text-[11px] font-semibold uppercase text-primary">
                          {p.jenisHak}
                        </p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="text-sm font-semibold">{p.desa || "—"}</p>
                        <p className="text-[11px] text-muted-foreground">{p.kecamatan || ""}</p>
                      </td>
                      <td className="px-2 py-3 font-mono text-[11px] text-muted-foreground leading-tight">
                        <div>SU: <span className="font-semibold text-foreground">{p.noSu || "—"}</span></div>
                        <div>Wk: <span className="font-semibold text-foreground">{p.noWarkah || "—"}</span></div>
                        <div>HT: <span className="font-semibold text-foreground">{p.noHt || "—"}</span></div>
                      </td>
                      <td className="px-2 py-3">
                        <p className="text-sm">
                          {p.peminjam.startsWith("ATENSI — ")
                            ? p.peminjam.replace("ATENSI — ", "")
                            : p.peminjam}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground">{p.kegiatan}</td>
                      <td className="px-2 py-3 text-[11px] font-semibold text-foreground whitespace-nowrap">
                        {p.jenisPeminjaman || "—"}
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(p.tglPengajuan)}
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(p.tglKonfirmasi)}
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeClasses(p.status)}`}
                        >
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => setDetail(p)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5"
                                onClick={() => setToRevise(p)}
                                title="Revisi data"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5"
                                onClick={() => setToRevert(p)}
                                title="Kembalikan ke Proses"
                              >
                                <Undo2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setToDelete(p)}
                                title="Hapus data"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {!isAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5"
                                onClick={() => setToRevise(p)}
                                title="Revisi data yang sudah disubmit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Revisi
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setToDelete(p)}
                                title="Batalkan / hapus data yang Anda input"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {!isAdmin && p.status === "Sedang Dipinjam" && (
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 bg-warning text-warning-foreground hover:bg-warning/90"
                              onClick={() => setToArchive(p)}
                              title="Verifikasi pengembalian peminjaman"
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              Verifikasi Pengembalian
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground">
                Menampilkan <span className="font-semibold text-foreground">{startIdx + 1}</span>
                –<span className="font-semibold text-foreground">{Math.min(startIdx + pageSize, filtered.length)}</span>
                {" "}dari <span className="font-semibold text-foreground">{filtered.length}</span> data
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">Baris/hal:</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[25, 50, 100, 200].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="ml-2 flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-8 px-2" disabled={currentPage === 1} onClick={() => setPage(1)}>«</Button>
                  <Button size="sm" variant="outline" className="h-8 px-2" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</Button>
                  <span className="px-2 font-semibold">Hal {currentPage} / {totalPages}</span>
                  <Button size="sm" variant="outline" className="h-8 px-2" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</Button>
                  <Button size="sm" variant="outline" className="h-8 px-2" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}>»</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailPeminjamanDialog item={detail} onClose={() => setDetail(null)} />

      <RevisePeminjamanDialog
        item={toRevise}
        onClose={() => setToRevise(null)}
        onSaved={() => void refresh()}
      />

      {/* Hapus */}
      <Dialog open={!!toDelete} onOpenChange={(o) => !busy && !o && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Hapus Data Peminjaman
            </DialogTitle>
            <DialogDescription>
              Data peminjaman akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          {toDelete && (
            <div className="rounded border bg-muted/30 p-3 text-sm">
              <p className="font-mono text-xs text-muted-foreground">{toDelete.noRegister}</p>
              <p className="font-semibold">{toDelete.peminjam}</p>
              <p className="font-mono text-xs">
                {toDelete.noHak} ({toDelete.jenisHak})
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={busy}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? "Menghapus..." : "YA, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kembalikan status */}
      <Dialog open={!!toRevert} onOpenChange={(o) => !busy && !o && setToRevert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-primary" /> Kembalikan Status
            </DialogTitle>
            <DialogDescription>
              Status data ini akan dikembalikan ke <strong>Proses Pencarian</strong> untuk diproses
              ulang.
            </DialogDescription>
          </DialogHeader>
          {toRevert && (
            <div className="rounded border bg-muted/30 p-3 text-sm">
              <p className="font-mono text-xs text-muted-foreground">{toRevert.noRegister}</p>
              <p className="font-semibold">{toRevert.peminjam}</p>
              <p className="text-xs">
                Status saat ini: <strong>{toRevert.status}</strong>
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setToRevert(null)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={handleRevert} disabled={busy}>
              {busy ? "Memproses..." : "YA, Kembalikan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verifikasi pengembalian (loket) */}
      <Dialog open={!!toArchive} onOpenChange={(o) => !busy && !o && setToArchive(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-success" /> Verifikasi Pengembalian
            </DialogTitle>
            <DialogDescription>
              Apakah Peminjaman ini sudah selesai dipinjam dan akan dikembalikan ke Arsip?
            </DialogDescription>
          </DialogHeader>
          {toArchive && (
            <div className="rounded border bg-muted/30 p-3 text-sm">
              <p className="font-mono text-xs text-muted-foreground">{toArchive.noRegister}</p>
              <p className="font-semibold">{toArchive.peminjam}</p>
              <p className="font-mono text-xs">
                {toArchive.noHak} ({toArchive.jenisHak})
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setToArchive(null)} disabled={busy}>
              Tidak
            </Button>
            <Button
              className="gap-1.5 bg-success text-success-foreground hover:bg-success/90"
              onClick={handleArchive}
              disabled={busy}
            >
              <PackageCheck className="h-4 w-4" />
              {busy ? "Memproses..." : "YA, Kembalikan ke Arsip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
