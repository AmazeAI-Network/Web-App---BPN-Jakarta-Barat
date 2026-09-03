<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BackupRun;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class SchedulerStatusController extends Controller
{
    public function index()
    {
        $warnings = [];

        // --- Daftar event terjadwal (jangan sampai menggagalkan seluruh response) ---
        $events = [];
        try {
            $events = collect(app(\Illuminate\Console\Scheduling\Schedule::class)->events())
                ->map(function ($e) {
                    $next = null;
                    try {
                        $next = optional($e->nextRunDate())->toIso8601String();
                    } catch (\Throwable) {
                        $next = null;
                    }
                    return [
                        'command' => $this->normalizeCommand($e->command ?? $e->description ?? ''),
                        'description' => $e->description,
                        'expression' => $e->expression,
                        'timezone' => (string) ($e->timezone ?? config('app.timezone')),
                        'next_run_at' => $next,
                    ];
                })
                ->values()
                ->all();
        } catch (\Throwable $e) {
            Log::warning('Scheduler status: gagal membaca events', ['message' => $e->getMessage()]);
            $warnings[] = 'Daftar jadwal tidak dapat dibaca.';
        }

        $emptyJob = ['last_success' => null, 'last_failed' => null, 'last_any' => null];
        $summary = [
            'full' => $emptyJob + ['count_24h' => 0],
            'prune' => $emptyJob,
            'snapshot' => $emptyJob,
        ];
        $recent = [];

        $hasTable = false;
        try {
            $hasTable = Schema::hasTable('backup_runs') || BackupRun::ensureTable();
        } catch (\Throwable $e) {
            Log::warning('Scheduler status: schema check failed', ['message' => $e->getMessage()]);
        }

        if (! $hasTable) {
            $warnings[] = 'Tabel riwayat backup tidak dapat dibuat otomatis. Cek izin database.';

        } else {
            try {
                $byCmd = fn (string $like) => BackupRun::where(function ($q) use ($like) {
                    $q->where('type', $like)->orWhere('artifact', 'like', "%$like%");
                });

                $summary = [
                    'full' => [
                        'last_success' => (clone $byCmd('full'))->where('status', 'success')->orderByDesc('id')->first(),
                        'last_failed' => (clone $byCmd('full'))->where('status', 'failed')->orderByDesc('id')->first(),
                        'last_any' => (clone $byCmd('full'))->orderByDesc('id')->first(),
                        'count_24h' => (clone $byCmd('full'))->where('started_at', '>=', now()->subDay())->count(),
                    ],
                    'prune' => [
                        'last_success' => (clone $byCmd('prune'))->where('status', 'success')->orderByDesc('id')->first(),
                        'last_failed' => (clone $byCmd('prune'))->where('status', 'failed')->orderByDesc('id')->first(),
                        'last_any' => (clone $byCmd('prune'))->orderByDesc('id')->first(),
                    ],
                    'snapshot' => [
                        'last_success' => (clone $byCmd('snapshot'))->where('status', 'success')->orderByDesc('id')->first(),
                        'last_failed' => (clone $byCmd('snapshot'))->where('status', 'failed')->orderByDesc('id')->first(),
                        'last_any' => (clone $byCmd('snapshot'))->orderByDesc('id')->first(),
                    ],
                ];

                $recent = BackupRun::orderByDesc('id')->limit(30)->get()->map(function ($r) {
                    $r->artifact = $r->artifact ? basename($r->artifact) : $r->artifact;
                    return $r;
                });
            } catch (\Throwable $e) {
                Log::error('Scheduler status query failed', ['message' => $e->getMessage()]);
                $warnings[] = 'Riwayat eksekusi tidak dapat dibaca saat ini.';
            }
        }

        $logTail = [];
        try {
            $logTail = $this->logTail(80);
        } catch (\Throwable $e) {
            Log::warning('Scheduler status: gagal baca log', ['message' => $e->getMessage()]);
        }

        return response()->json([
            'now' => now()->toIso8601String(),
            'timezone' => config('app.timezone'),
            'events' => $events,
            'summary' => $summary,
            'recent' => $recent,
            'log_tail' => $logTail,
            'warnings' => $warnings,
        ]);
    }

    private function normalizeCommand(string $cmd): string
    {
        $cmd = preg_replace('/^.*artisan\s+/', '', $cmd) ?? $cmd;
        return trim($cmd);
    }

    private function logTail(int $lines = 80): array
    {
        $path = storage_path('logs/laravel.log');
        if (! is_file($path) || ! is_readable($path)) return [];
        $size = filesize($path) ?: 0;
        $read = min($size, 256 * 1024);
        $fh = fopen($path, 'r');
        if (! $fh) return [];
        fseek($fh, max(0, $size - $read));
        $buf = fread($fh, $read) ?: '';
        fclose($fh);
        $all = preg_split('/\r?\n/', $buf) ?: [];
        $filtered = array_values(array_filter($all, function ($l) {
            return $l !== '' && preg_match('/backup|schedule|restore|prune|snapshot/i', $l);
        }));
        return array_slice($filtered, -$lines);
    }
}
