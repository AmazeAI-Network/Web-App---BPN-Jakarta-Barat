import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Database, HardDrive, ShieldCheck, RefreshCw, Eye, Undo2, CloudUpload, FileWarning,
} from "lucide-react";

export const Route = createFileRoute("/admin/recovery")({
  head: () => ({
    meta: [{ title: "Recovery Data — BPN Jakarta Barat" }],
  }),
  component: RecoveryPage,
});

type SnapshotFile = { file: string; bytes: number; modified_at: string };
type BackupRun = {
  id: number; type: string; destination: string; status: string;
  artifact: string | null; bytes: number; message: string | null;
  started_at: string | null; finished_at: string | null;
};
type StatusResp = {
  stats: {
    full_local: BackupRun | null; full_remote: BackupRun | null; prune: BackupRun | null;
    snapshots_today: number; remote_enabled: boolean; retention_hours: number;
  };
  recent: BackupRun[];
};

const TABLES = ["peminjaman", "peminjam", "kegiatan", "demo_accounts"] as const;

function bytesFmt(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function RecoveryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [status, setStatus] = useState<StatusResp | null>(null);
  const [snaps, setSnaps] = useState<{ data: SnapshotFile[]; full: SnapshotFile[] } | null>(null);
  const [binlogs, setBinlogs] = useState<{ log_bin: string | null; enabled: boolean; data: Array<{ file: string; bytes: number; modified_at: string }>; note: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<(typeof TABLES)[number]>("peminjaman");
  const [target, setTarget] = useState<"production" | "staging">("staging");
  const [preview, setPreview] = useState<unknown[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const refresh = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [s, l, b] = await Promise.all([
        api.get<StatusResp>("/backup/status"),
        api.get<{ data: SnapshotFile[]; full: SnapshotFile[]; dir: string; full_dir: string }>("/recovery/snapshots"),
        api.get<typeof binlogs>("/recovery/binlogs").catch(() => null),
      ]);
      setStatus(s);
      setSnaps(l);
      setBinlogs(b);
      setErr(null);
      setWarning((s as StatusResp & { warning?: string | null }).warning ?? null);
      if (!selectedFile && l.data[0]) setSelectedFile(l.data[0].file);
    } catch (e) {
      setErr(
        (e instanceof Error ? e.message : "Gagal memuat status backup") +
          " — pastikan backend sudah dimigrasi (php artisan migrate --force) dan cache dibersihkan.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [isAdmin]);

  const doPreview = async () => {
    if (!selectedFile) return;
    setBusy(true);
    try {
      const r = await api.get<{ data: unknown[] }>(`/recovery/snapshots/${encodeURIComponent(selectedFile)}/preview?table=${selectedTable}&limit=50`);
      setPreview(r.data);
      if (r.data.length === 0) toast.info("Tidak ada baris untuk tabel tersebut di snapshot ini");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview gagal");
    } finally { setBusy(false); }
  };

  const doRestore = async (dryRun: boolean) => {
    if (!selectedFile) return;
    const label = target === "staging" ? "DATABASE STAGING (uji)" : "DATABASE PRODUKSI";
    if (!dryRun && !window.confirm(`Restore ${selectedTable} dari ${selectedFile} ke ${label}? Operasi upsert by id — data baru tidak terhapus.`)) return;
    setBusy(true);
    try {
      const r = await api.post<{ dry_run: boolean; rows_found?: number; rows_restored?: number; sample?: unknown[]; target?: string; connection?: string }>(
        `/recovery/snapshots/${encodeURIComponent(selectedFile)}/restore`,
        { table: selectedTable, dry_run: dryRun, target },
      );
      if (dryRun) {
        toast.success(`Dry-run OK (${r.target ?? target}) — akan upsert ${r.rows_found ?? 0} baris`);
        if (r.sample) setPreview(r.sample);
      } else {
        toast.success(`Restore selesai ke ${r.target ?? target} — ${r.rows_restored ?? 0} baris ter-upsert`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore gagal");
    } finally { setBusy(false); }
  };

  const statusCard = (label: string, run: BackupRun | null, Icon: typeof Database) => {
    const ok = run?.status === "success";
    const failed = run?.status === "failed";
    const tone = !run ? "bg-muted text-muted-foreground" : ok ? "bg-emerald-500/15 text-emerald-700" : failed ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700";
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Icon className="h-4 w-4" /> {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={tone}>{run?.status ?? "belum ada"}</Badge>
          <p className="mt-2 text-xs text-muted-foreground">
            {run?.finished_at ? new Date(run.finished_at).toLocaleString("id-ID") : "—"}
          </p>
          <p className="text-xs">{run ? bytesFmt(run.bytes) : ""}</p>
          {run?.message && <p className="mt-1 text-xs text-destructive line-clamp-2">{run.message}</p>}
        </CardContent>
      </Card>
    );
  };

  const allFiles = useMemo(() => {
    const a = (snaps?.data ?? []).map((f) => ({ ...f, kind: "critical" as const }));
    const b = (snaps?.full ?? []).map((f) => ({ ...f, kind: "full" as const }));
    return [...a, ...b];
  }, [snaps]);

  if (!isAdmin) {
    return (
      <AppShell title="Recovery & Backup">
        <Card><CardContent className="p-6">Halaman ini hanya untuk admin.</CardContent></Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Recovery & Backup" subtitle="Status sinkronisasi, snapshot, dan pemulihan data hilang.">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Recovery & Backup</h1>
            <p className="text-sm text-muted-foreground">Status sinkronisasi, snapshot, dan pemulihan data hilang.</p>
          </div>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={"mr-2 h-4 w-4 " + (loading ? "animate-spin" : "")} /> Refresh
          </Button>
        </div>

        {err && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {err}
          </div>
        )}
        {warning && !err && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
            {warning}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statusCard("Backup Penuh — Lokal", status?.stats.full_local ?? null, HardDrive)}
          {statusCard("Backup Penuh — Remote (S3)", status?.stats.full_remote ?? null, CloudUpload)}
          {statusCard("Pruning Retensi", status?.stats.prune ?? null, FileWarning)}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Ringkasan</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <div>Snapshots 24 jam: <b>{status?.stats.snapshots_today ?? 0}</b></div>
              <div>Remote aktif: <b>{status?.stats.remote_enabled ? "Ya" : "Tidak"}</b></div>
              <div>Retensi: <b>{status?.stats.retention_hours ?? 0} jam</b></div>
              <div>Binlog MySQL: <b>{binlogs?.enabled ? "ON" : "OFF"}</b></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Pemulihan dari Snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="text-xs font-medium">File snapshot</label>
                <Select value={selectedFile} onValueChange={setSelectedFile}>
                  <SelectTrigger><SelectValue placeholder="Pilih snapshot" /></SelectTrigger>
                  <SelectContent>
                    {allFiles.map((f) => (
                      <SelectItem key={f.file} value={f.file}>
                        [{f.kind}] {f.file} — {bytesFmt(f.bytes)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Tabel</label>
                <Select value={selectedTable} onValueChange={(v) => setSelectedTable(v as (typeof TABLES)[number])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TABLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Target database</label>
                <Select value={target} onValueChange={(v) => setTarget(v as "production" | "staging")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staging">Staging (uji — aman)</SelectItem>
                    <SelectItem value="production">Produksi (live)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {target === "staging"
                    ? "Restore uji: data dipulihkan ke database staging, produksi tidak tersentuh."
                    : "Peringatan: restore akan upsert langsung ke database produksi."}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Button onClick={doPreview} disabled={busy || !selectedFile} variant="outline">
                  <Eye className="mr-2 h-4 w-4" /> Preview
                </Button>
                <Button onClick={() => doRestore(true)} disabled={busy || !selectedFile} variant="secondary">
                  Dry-run
                </Button>
                <Button
                  onClick={() => doRestore(false)}
                  disabled={busy || !selectedFile}
                  variant={target === "production" ? "destructive" : "default"}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  {target === "staging" ? "Restore uji" : "Restore"}
                </Button>
              </div>
            </div>

            {preview.length > 0 && (
              <div className="rounded border max-h-96 overflow-auto bg-muted/40 p-3 text-xs">
                <pre>{JSON.stringify(preview, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Riwayat Backup Terakhir</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead><TableHead>Tipe</TableHead><TableHead>Tujuan</TableHead>
                  <TableHead>Status</TableHead><TableHead>Artifact</TableHead><TableHead>Ukuran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(status?.recent ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{r.finished_at ? new Date(r.finished_at).toLocaleString("id-ID") : "—"}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{r.destination}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "success" ? "secondary" : r.status === "failed" ? "destructive" : "outline"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[280px]">{r.artifact ?? "—"}</TableCell>
                    <TableCell>{bytesFmt(r.bytes)}</TableCell>
                  </TableRow>
                ))}
                {(status?.recent ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Belum ada riwayat. Jalankan <code>php artisan backup:full</code> di VPS.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Binlog MySQL (Point-In-Time Recovery)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>Status <code>log_bin</code>: <b>{binlogs?.log_bin ?? "tidak diketahui"}</b></div>
            {binlogs?.note && <p className="text-muted-foreground text-xs">{binlogs.note}</p>}
            {binlogs && binlogs.data.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Ukuran</TableHead><TableHead>Modified</TableHead></TableRow></TableHeader>
                <TableBody>
                  {binlogs.data.map((b) => (
                    <TableRow key={b.file}>
                      <TableCell className="font-mono text-xs">{b.file}</TableCell>
                      <TableCell>{bytesFmt(b.bytes)}</TableCell>
                      <TableCell>{new Date(b.modified_at).toLocaleString("id-ID")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded bg-muted p-3 text-xs">
                Aktifkan binlog di <code>/etc/mysql/mysql.conf.d/mysqld.cnf</code>:
                <pre className="mt-2">{`[mysqld]
log_bin = /var/log/mysql/mysql-bin
binlog_expire_logs_seconds = 1209600
server-id = 1`}</pre>
                Lalu <code>sudo systemctl restart mysql</code>.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cara Melihat Isi Backup di VPS</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Lokasi default file di server:</p>
            <ul className="list-disc pl-6 text-xs space-y-1">
              <li><code>storage/app/backups/critical-data/</code> — snapshot per perubahan</li>
              <li><code>storage/app/backups/full/</code> — backup penuh tiap jam</li>
              <li><code>/var/lib/mysql/mysql-bin.*</code> — binlog (bila aktif)</li>
            </ul>
            <p>Perintah cepat (SSH ke VPS):</p>
            <pre className="rounded bg-muted p-3 text-xs overflow-auto">{`cd /var/www/api-arsip
ls -lh storage/app/backups/critical-data/ storage/app/backups/full/
php artisan backup:show 2026-06-22 --table=peminjaman --limit=20
mysql -e "SHOW VARIABLES LIKE 'log_bin';"`}</pre>
            <p className="text-xs text-muted-foreground">
              Dokumen lengkap: <code>backend/docs/RECOVERY.md</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
