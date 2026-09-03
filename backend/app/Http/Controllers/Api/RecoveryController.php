<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RecoveryController extends Controller
{
    private function snapshotDir(): string
    {
        return (string) config('backup.local.path', storage_path('app/backups/critical-data'));
    }

    public function snapshots()
    {
        $dir = $this->snapshotDir();
        if (! is_dir($dir)) return response()->json(['data' => [], 'full' => []]);
        $rows = [];
        foreach (glob($dir . DIRECTORY_SEPARATOR . '*.jsonl.enc') ?: [] as $f) {
            $rows[] = [
                'file' => basename($f),
                'bytes' => filesize($f) ?: 0,
                'modified_at' => date(DATE_ATOM, filemtime($f) ?: time()),
            ];
        }
        usort($rows, fn ($a, $b) => strcmp($b['file'], $a['file']));

        // Full snapshots
        $full = [];
        $fdir = (string) config('backup.full.path');
        if (is_dir($fdir)) {
            foreach (glob($fdir . DIRECTORY_SEPARATOR . '*.enc') ?: [] as $f) {
                $full[] = [
                    'file' => basename($f),
                    'bytes' => filesize($f) ?: 0,
                    'modified_at' => date(DATE_ATOM, filemtime($f) ?: time()),
                ];
            }
            usort($full, fn ($a, $b) => strcmp($b['file'], $a['file']));
        }

        return response()->json([
            'data' => $rows,
            'full' => $full,
        ]);
    }

    public function preview(string $file, Request $r)
    {
        $path = $this->resolveSnapshot($file);
        if (! $path) return response()->json(['message' => 'Snapshot tidak ditemukan'], 404);

        $limit = max(1, min(200, (int) $r->query('limit', 50)));
        $table = $r->query('table');
        $rows = [];
        $fh = fopen($path, 'r');
        while ($fh && ! feof($fh) && count($rows) < $limit) {
            $line = trim((string) fgets($fh));
            if ($line === '') continue;
            try {
                $payload = json_decode(Crypt::decryptString($line), true, 512, JSON_THROW_ON_ERROR);
            } catch (\Throwable) { continue; }
            if ($table && ($payload['table'] ?? null) !== $table) continue;
            if (isset($payload['row']) && is_array($payload['row'])) {
                unset($payload['row']['password'], $payload['row']['remember_token']);
            }
            $rows[] = $payload;
        }
        if ($fh) fclose($fh);
        return response()->json(['data' => $rows]);
    }

    public function restore(string $file, Request $r)
    {
        $payload = $r->validate([
            'table' => 'required|string|in:demo_accounts,kegiatan,peminjam,peminjaman',
            'dry_run' => 'sometimes|boolean',
            'target' => 'sometimes|string|in:production,staging',
        ]);
        $path = $this->resolveSnapshot($file);
        if (! $path) return response()->json(['message' => 'Snapshot tidak ditemukan'], 404);
        $table = $payload['table'];
        $dryRun = (bool) ($payload['dry_run'] ?? true);
        $target = $payload['target'] ?? 'production';

        // Resolve target connection
        $connectionName = config('database.default');
        if ($target === 'staging') {
            if (! env('STAGING_DB_ENABLED', false)) {
                return response()->json([
                    'message' => 'Database staging belum diaktifkan. Set STAGING_DB_ENABLED=true dan kredensial STAGING_DB_* di .env.',
                ], 422);
            }
            $connectionName = 'mysql_staging';
            try {
                DB::connection($connectionName)->getPdo();
            } catch (\Throwable $e) {
                \Log::error('Staging DB connect failed', ['error' => $e->getMessage()]);
                return response()->json([
                    'message' => 'Tidak dapat terhubung ke database staging. Periksa konfigurasi STAGING_DB_* di server.',
                ], 422);
            }
        }
        $conn = DB::connection($connectionName);

        // Pastikan tabel target ada di staging — jika belum, beri petunjuk.
        if (! Schema::connection($connectionName)->hasTable($table)) {
            return response()->json([
                'message' => "Tabel '$table' belum ada di database $target. Jalankan: php artisan migrate --database=$connectionName --force",
            ], 422);
        }
        $tableColumns = Schema::connection($connectionName)->getColumnListing($table);

        $rows = [];
        $fh = fopen($path, 'r');
        while ($fh && ! feof($fh)) {
            $line = trim((string) fgets($fh));
            if ($line === '') continue;
            try {
                $entry = json_decode(Crypt::decryptString($line), true, 512, JSON_THROW_ON_ERROR);
            } catch (\Throwable) { continue; }
            if (($entry['table'] ?? null) !== $table) continue;
            if (! is_array($entry['row'] ?? null) || empty($entry['row']['id'])) continue;
            $rows[$entry['row']['id']] = array_intersect_key($entry['row'], array_flip($tableColumns));
        }
        if ($fh) fclose($fh);

        $count = count($rows);
        if ($dryRun || $count === 0) {
            return response()->json([
                'dry_run' => true, 'table' => $table, 'target' => $target,
                'connection' => $connectionName,
                'rows_found' => $count,
                'sample' => array_slice(array_values($rows), 0, 5),
            ]);
        }

        $updateCols = array_values(array_diff($tableColumns, ['id']));
        foreach (array_chunk(array_values($rows), 200) as $batch) {
            $conn->table($table)->upsert($batch, ['id'], $updateCols);
        }

        return response()->json([
            'dry_run' => false, 'table' => $table, 'target' => $target,
            'connection' => $connectionName,
            'rows_restored' => $count,
        ]);
    }

    public function binlogs()
    {
        $candidates = ['/var/lib/mysql', '/var/log/mysql'];
        $files = [];
        $logBin = null;
        try {
            $row = DB::selectOne("SHOW VARIABLES LIKE 'log_bin'");
            $logBin = $row->Value ?? null;
        } catch (\Throwable) {}

        foreach ($candidates as $dir) {
            if (! is_dir($dir) || ! is_readable($dir)) continue;
            foreach (glob("$dir/mysql-bin.*") ?: [] as $f) {
                if (! is_file($f)) continue;
                $files[] = [
                    'file' => basename($f),
                    'bytes' => @filesize($f) ?: 0,
                    'modified_at' => date(DATE_ATOM, @filemtime($f) ?: time()),
                ];
            }
        }

        return response()->json([
            'log_bin' => $logBin,
            'enabled' => $logBin && $logBin !== 'OFF',
            'data' => $files,
            'note' => $files ? null : 'Binlog tidak ditemukan/tidak readable. Aktifkan log_bin di MySQL untuk Point-In-Time Recovery.',
        ]);
    }

    private function resolveSnapshot(string $file): ?string
    {
        $file = basename($file); // sanitasi path traversal
        $candidates = [
            $this->snapshotDir() . DIRECTORY_SEPARATOR . $file,
            (string) config('backup.full.path') . DIRECTORY_SEPARATOR . $file,
        ];
        foreach ($candidates as $c) {
            if (is_file($c)) return $c;
        }
        return null;
    }
}
