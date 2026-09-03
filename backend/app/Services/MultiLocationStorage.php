<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

/**
 * Menyimpan file ke disk lokal sekaligus mirror ke disk remote (S3/MinIO)
 * sehingga file pengamanan tidak bergantung pada satu folder VPS.
 */
class MultiLocationStorage
{
    public function put(string $path, string $contents, string $primaryDisk = 'pengamanan'): void
    {
        Storage::disk($primaryDisk)->put($path, $contents);
        $this->mirror($path, $contents, $primaryDisk);
    }

    public function putStream(string $path, $stream, string $primaryDisk = 'pengamanan'): void
    {
        Storage::disk($primaryDisk)->put($path, $stream);
        // Re-read once to mirror, file sudah ada di lokal
        $bytes = Storage::disk($primaryDisk)->get($path);
        $this->mirror($path, $bytes, $primaryDisk);
    }

    public function get(string $path, string $primaryDisk = 'pengamanan'): ?string
    {
        if (Storage::disk($primaryDisk)->exists($path)) {
            return Storage::disk($primaryDisk)->get($path);
        }
        // Fallback ke remote bila lokal hilang
        if ($this->remoteEnabled()) {
            $remote = $this->remoteDisk();
            $remotePath = $this->remoteKey($path);
            try {
                if (Storage::disk($remote)->exists($remotePath)) {
                    $bytes = Storage::disk($remote)->get($remotePath);
                    // Recover ke lokal agar konsisten
                    Storage::disk($primaryDisk)->put($path, $bytes);
                    return $bytes;
                }
            } catch (\Throwable $e) {
                Log::warning('MultiLocationStorage remote fallback failed', ['msg' => $e->getMessage()]);
            }
        }
        return null;
    }

    public function delete(string $path, string $primaryDisk = 'pengamanan'): void
    {
        Storage::disk($primaryDisk)->delete($path);
        if ($this->remoteEnabled()) {
            try {
                Storage::disk($this->remoteDisk())->delete($this->remoteKey($path));
            } catch (\Throwable $e) {
                Log::warning('MultiLocationStorage remote delete failed', ['msg' => $e->getMessage()]);
            }
        }
    }

    private function mirror(string $path, string $bytes, string $primaryDisk): void
    {
        if (! $this->remoteEnabled()) return;
        try {
            Storage::disk($this->remoteDisk())->put($this->remoteKey($path), $bytes);
        } catch (\Throwable $e) {
            Log::warning('MultiLocationStorage remote mirror failed', [
                'disk' => $primaryDisk, 'path' => $path, 'msg' => $e->getMessage(),
            ]);
        }
    }

    private function remoteEnabled(): bool
    {
        return (bool) config('backup.remote.enabled', false);
    }

    private function remoteDisk(): string
    {
        return (string) config('backup.remote.disk', 's3_backup');
    }

    private function remoteKey(string $path): string
    {
        $prefix = trim((string) config('backup.remote.prefix', 'bpn-jakbar'), '/');
        return $prefix ? "$prefix/pengamanan/$path" : "pengamanan/$path";
    }
}
