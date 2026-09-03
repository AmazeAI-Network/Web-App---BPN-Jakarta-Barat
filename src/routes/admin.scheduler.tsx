import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Clock, RefreshCw, CheckCircle2, XCircle, Terminal, CalendarClock,
} from "lucide-react";

export const Route = createFileRoute("/admin/scheduler")({
  head: () => ({ meta: [{ title: "Status Scheduler — BPN Jakarta Barat" }] }),
  component: SchedulerPage,
});

type Run = {
  id: number; type: string; destination: string; status: string;
  artifact: string | null; bytes: number; message: string | null;
  started_at: string | null; finished_at: string | null;
};
type Event = {
  command: string; description: string | null; expression: string;
  timezone: string; next_run_at: string | null;
};
type Summary = {
  full: { last_success: Run | null; last_failed: Run | null; last_any: Run | null; count_24h: number };
  prune: { last_success: Run | null; last_failed: Run | null; last_any: Run | null };
  snapshot: { last_success: Run | null; last_failed: Run | null; last_any: Run | null };
};
type Status = {
  now: string;
  timezone: string;
  events: Event[];
  summary: Summary;
  recent: Run[];
  log_tail: string[];
  warnings?: string[];
};

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleString("id-ID") : "—";
}
function bytesFmt(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

function SchedulerPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const r = await api.get<Status>("/scheduler/status");
      setData(r);
      setErr(null);
    } catch (e) {
      setErr(
        (e instanceof Error ? e.message : "Gagal memuat status scheduler") +
          " — pastikan backend sudah dimigrasi (php artisan migrate --force) dan cache dibersihkan.",
      );
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [isAdmin]);

  if (!isAdmin) {
    return (
      <AppShell title="Status Scheduler">
        <Card><CardContent className="p-6">Halaman ini hanya untuk admin.</CardContent></Card>
      </AppShell>
    );
  }

  const renderJobCard = (
    title: string,
    s: { last_success: Run | null; last_failed: Run | null; last_any: Run | null; count_24h?: number },
  ) => {
    const last = s.last_any;
    const ok = last?.status === "success";
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          <div>Status terakhir: <Badge variant={ok ? "secondary" : last?.status === "failed" ? "destructive" : "outline"}>{last?.status ?? "belum ada"}</Badge></div>
          <div>Terakhir sukses: <b>{fmt(s.last_success?.finished_at ?? null)}</b></div>
          <div>Terakhir gagal: <b className="text-destructive">{fmt(s.last_failed?.finished_at ?? null)}</b></div>
          {typeof s.count_24h === "number" && <div>Jalan 24 jam terakhir: <b>{s.count_24h}×</b></div>}
          {s.last_failed?.message && (
            <p className="mt-1 text-destructive line-clamp-2">{s.last_failed.message}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AppShell title="Status Scheduler" subtitle="Pemantauan cron Laravel: backup, prune, snapshot.">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="h-6 w-6" /> Status Scheduler</h1>
            <p className="text-sm text-muted-foreground">
              Zona waktu server: <b>{data?.timezone ?? "—"}</b> · Server time: <b>{fmt(data?.now ?? null)}</b>
            </p>
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
        {(data?.warnings ?? []).map((w, i) => (
          <div key={i} className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
            {w}
          </div>
        ))}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {renderJobCard("Backup Penuh (per jam)", data?.summary.full ?? { last_success: null, last_failed: null, last_any: null, count_24h: 0 })}
          {renderJobCard("Snapshot Data Kritis", data?.summary.snapshot ?? { last_success: null, last_failed: null, last_any: null })}
          {renderJobCard("Pruning Retensi", data?.summary.prune ?? { last_success: null, last_failed: null, last_any: null })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Jadwal Terdaftar</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perintah</TableHead>
                  <TableHead>Cron</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Jalan berikutnya</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.events ?? []).map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{e.command || e.description}</TableCell>
                    <TableCell className="font-mono text-xs">{e.expression}</TableCell>
                    <TableCell className="text-xs">{e.timezone}</TableCell>
                    <TableCell className="text-xs">{fmt(e.next_run_at)}</TableCell>
                  </TableRow>
                ))}
                {(data?.events ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Tidak ada event scheduler terbaca. Pastikan crontab aktif:
                    <code className="ml-1">* * * * * cd /var/www/api-arsip && php artisan schedule:run</code>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Riwayat Eksekusi Terbaru</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mulai</TableHead><TableHead>Selesai</TableHead>
                  <TableHead>Tipe</TableHead><TableHead>Tujuan</TableHead>
                  <TableHead>Status</TableHead><TableHead>Ukuran</TableHead>
                  <TableHead>Pesan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recent ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{fmt(r.started_at)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{fmt(r.finished_at)}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{r.destination}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "success" ? "secondary" : r.status === "failed" ? "destructive" : "outline"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>{bytesFmt(r.bytes)}</TableCell>
                    <TableCell className="text-xs max-w-[280px] truncate" title={r.message ?? ""}>{r.message ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {(data?.recent ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Belum ada riwayat.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" /> Log Singkat (laravel.log)</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.log_tail && data.log_tail.length > 0 ? (
              <pre className="rounded bg-muted p-3 text-[11px] overflow-auto max-h-96 whitespace-pre-wrap">
{data.log_tail.join("\n")}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">Tidak ada entri log relevan ditemukan.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
