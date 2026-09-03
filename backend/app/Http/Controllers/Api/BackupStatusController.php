<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BackupRun;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class BackupStatusController extends Controller
{
    public function index()
    {
        $available = false;
        try {
            $available = Schema::hasTable('backup_runs') || BackupRun::ensureTable();
        } catch (\Throwable $e) {
            Log::warning('Backup status: schema check failed', ['message' => $e->getMessage()]);
        }


        $stats = [
            'full_local' => null,
            'full_remote' => null,
            'prune' => null,
            'snapshots_today' => 0,
            'remote_enabled' => (bool) config('backup.remote.enabled'),
            'retention_hours' => (int) config('backup.full.retention_hours'),
        ];
        $recent = [];
        $warning = null;

        if (! $available) {
            $warning = 'Tabel riwayat backup tidak dapat dibuat otomatis. Cek izin database.';
            return response()->json(['stats' => $stats, 'recent' => $recent, 'warning' => $warning]);
        }

        try {
            $latest = fn (string $type, string $dest) => BackupRun::where('type', $type)
                ->where('destination', $dest)->orderByDesc('id')->first();

            $stats['full_local'] = $latest('full', 'local');
            $stats['full_remote'] = $latest('full', 's3');
            $stats['prune'] = $latest('prune', 'local');
            $stats['snapshots_today'] = BackupRun::where('type', 'full')
                ->where('started_at', '>=', now()->subDay())->count();

            $recent = BackupRun::orderByDesc('id')->limit(20)->get()
                ->map(function ($r) {
                    $r->artifact = $r->artifact ? basename($r->artifact) : $r->artifact;
                    return $r;
                });
        } catch (\Throwable $e) {
            Log::error('Backup status query failed', ['message' => $e->getMessage()]);
            $warning = 'Riwayat backup tidak dapat dibaca saat ini.';
        }

        return response()->json(['stats' => $stats, 'recent' => $recent, 'warning' => $warning]);
    }
}
