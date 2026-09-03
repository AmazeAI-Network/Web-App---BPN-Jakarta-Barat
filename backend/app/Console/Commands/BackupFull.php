<?php

namespace App\Console\Commands;

use App\Models\BackupRun;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

/**
 * Backup penuh per jam — mysqldump database utama + tar folder pengamanan,
 * keduanya dienkripsi dengan APP_KEY lalu di-upload ke disk remote bila aktif.
 */
class BackupFull extends Command
{
    protected $signature = 'backup:full {--skip-db} {--skip-files} {--no-remote} {--force : Jalankan walau environment production}';
    protected $description = 'Buat snapshot terenkripsi DB + file pengamanan, mirror ke storage cadangan.';

    public function handle(): int
    {
        if (! (bool) config('backup.full.enabled', true) && ! $this->option('force')) {
            $this->warn('backup.full disabled by config (pakai --force untuk memaksa)');
            return self::SUCCESS;
        }

        if (! BackupRun::ensureTable()) {
            $this->warn('Tabel backup_runs tidak tersedia — backup tetap jalan tanpa pencatatan riwayat.');
        }


        $dir = (string) config('backup.full.path');
        File::ensureDirectoryExists($dir, 0700, true);
        $stamp = now()->format('Ymd-His');

        if (! $this->option('skip-db')) {
            $this->runStep('full', 'local', "db-$stamp.sql.enc", function ($artifactPath) {
                $tmp = tempnam(sys_get_temp_dir(), 'dbsql_');
                $bin = (string) config('backup.full.mysqldump', 'mysqldump');
                $db = config('database.connections.mysql');
                $args = [
                    $bin,
                    '-h', (string) ($db['host'] ?? '127.0.0.1'),
                    '-P', (string) ($db['port'] ?? '3306'),
                    '-u', (string) ($db['username'] ?? 'root'),
                    '--single-transaction', '--quick', '--routines', '--triggers',
                    '--default-character-set=utf8mb4',
                    (string) ($db['database'] ?? ''),
                ];
                $env = ['MYSQL_PWD' => (string) ($db['password'] ?? '')];
                $p = new Process($args, null, $env, null, 1800);
                $p->mustRun();
                file_put_contents($tmp, $p->getOutput());
                $this->encryptFileTo($tmp, $artifactPath);
                @unlink($tmp);
                return filesize($artifactPath) ?: 0;
            });
        }

        if (! $this->option('skip-files')) {
            $this->runStep('full', 'local', "files-$stamp.tar.enc", function ($artifactPath) {
                $root = (string) config('backup.full.files_root');
                File::ensureDirectoryExists($root, 0700, true);
                $tmp = tempnam(sys_get_temp_dir(), 'fstar_');
                $p = new Process(['tar', '-cf', $tmp, '-C', dirname($root), basename($root)], null, null, null, 1800);
                $p->mustRun();
                $this->encryptFileTo($tmp, $artifactPath);
                @unlink($tmp);
                return filesize($artifactPath) ?: 0;
            });
        }

        if (! $this->option('no-remote') && (bool) config('backup.remote.enabled', false)) {
            $this->mirrorRecentToRemote($dir);
        }

        $this->call('backup:prune');

        return self::SUCCESS;
    }

    private function runStep(string $type, string $dest, string $filename, \Closure $work): void
    {
        $dir = (string) config('backup.full.path');
        $artifact = $dir . DIRECTORY_SEPARATOR . $filename;
        $run = BackupRun::safeCreate([
            'type' => $type, 'destination' => $dest, 'status' => 'running',
            'artifact' => basename($artifact), 'started_at' => now(),
        ]);
        try {
            $bytes = (int) $work($artifact);
            BackupRun::safeUpdate($run, [
                'status' => 'success', 'bytes' => $bytes,
                'finished_at' => now(), 'message' => null,
            ]);
            $this->info("[$type/$dest] $filename — " . number_format($bytes) . ' bytes');
        } catch (\Throwable $e) {
            BackupRun::safeUpdate($run, [
                'status' => 'failed', 'finished_at' => now(),
                'message' => substr($e->getMessage(), 0, 1000),
            ]);
            $this->error("[$type/$dest] gagal: " . $e->getMessage());
        }
    }


    private function encryptFileTo(string $src, string $dst): void
    {
        $payload = file_get_contents($src);
        if ($payload === false) throw new \RuntimeException("baca $src gagal");
        // Encrypt in chunks for large files: simple chunked envelope
        $chunkSize = 1024 * 512; // 512KB
        $out = fopen($dst, 'wb');
        if (! $out) throw new \RuntimeException("tulis $dst gagal");
        $len = strlen($payload);
        for ($i = 0; $i < $len; $i += $chunkSize) {
            $chunk = substr($payload, $i, $chunkSize);
            $enc = Crypt::encryptString($chunk);
            fwrite($out, $enc . "\n");
        }
        fclose($out);
    }

    private function mirrorRecentToRemote(string $dir): void
    {
        $files = glob($dir . DIRECTORY_SEPARATOR . '*.enc') ?: [];
        usort($files, fn ($a, $b) => filemtime($b) <=> filemtime($a));
        foreach (array_slice($files, 0, 4) as $f) {
            $name = basename($f);
            $run = BackupRun::safeCreate([
                'type' => 'full', 'destination' => 's3', 'status' => 'running',
                'artifact' => $name, 'started_at' => now(),
            ]);
            try {
                $prefix = trim((string) config('backup.remote.prefix', 'bpn-jakbar'), '/');
                $key = ($prefix ? "$prefix/" : '') . "full/$name";
                Storage::disk((string) config('backup.remote.disk'))->put($key, fopen($f, 'rb'));
                BackupRun::safeUpdate($run, [
                    'status' => 'success', 'bytes' => filesize($f) ?: 0,
                    'finished_at' => now(),
                ]);
                $this->info("upload remote: $name");
            } catch (\Throwable $e) {
                BackupRun::safeUpdate($run, [
                    'status' => 'failed', 'finished_at' => now(),
                    'message' => substr($e->getMessage(), 0, 1000),
                ]);
                $this->error('upload remote gagal: ' . $e->getMessage());
            }

        }
    }
}
