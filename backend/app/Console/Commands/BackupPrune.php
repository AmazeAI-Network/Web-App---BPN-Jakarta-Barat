<?php

namespace App\Console\Commands;

use App\Models\BackupRun;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class BackupPrune extends Command
{
    protected $signature = 'backup:prune {--force}';
    protected $description = 'Hapus snapshot lebih lama dari BACKUP_RETENTION_HOURS pada lokal & remote.';

    public function handle(): int
    {
        $hours = (int) config('backup.full.retention_hours', 168);
        $threshold = now()->subHours($hours)->getTimestamp();
        $dir = (string) config('backup.full.path');
        $deletedLocal = 0;
        foreach (glob($dir . DIRECTORY_SEPARATOR . '*.enc') ?: [] as $f) {
            if (filemtime($f) < $threshold) {
                @unlink($f); $deletedLocal++;
            }
        }

        $deletedRemote = 0;
        if ((bool) config('backup.remote.enabled', false)) {
            try {
                $disk = Storage::disk((string) config('backup.remote.disk'));
                $prefix = trim((string) config('backup.remote.prefix', 'bpn-jakbar'), '/');
                $remoteDir = ($prefix ? "$prefix/" : '') . 'full';
                foreach ($disk->files($remoteDir) as $f) {
                    if ($disk->lastModified($f) < $threshold) {
                        $disk->delete($f); $deletedRemote++;
                    }
                }
            } catch (\Throwable $e) {
                $this->warn('Prune remote gagal: ' . $e->getMessage());
            }
        }

        BackupRun::safeCreate([
            'type' => 'prune', 'destination' => 'local', 'status' => 'success',
            'message' => "lokal=$deletedLocal remote=$deletedRemote retention=$hours" . 'h',
            'started_at' => now(), 'finished_at' => now(),
        ]);


        $this->info("Pruned lokal=$deletedLocal remote=$deletedRemote (retention $hours jam)");
        return self::SUCCESS;
    }
}
