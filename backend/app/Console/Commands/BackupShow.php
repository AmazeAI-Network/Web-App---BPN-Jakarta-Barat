<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Crypt;

/**
 * Menampilkan isi snapshot terenkripsi tanpa perlu menulis script decrypt manual.
 *
 *   php artisan backup:show 2026-06-22 --table=peminjaman --limit=20
 *   php artisan backup:show /full/path/to/file.jsonl.enc --limit=5
 */
class BackupShow extends Command
{
    protected $signature = 'backup:show {target} {--table=} {--limit=20}';
    protected $description = 'Decrypt dan tampilkan isi snapshot critical-data (per perubahan, .jsonl.enc).';

    public function handle(): int
    {
        $target = (string) $this->argument('target');
        $file = is_file($target)
            ? $target
            : storage_path("app/backups/critical-data/$target.jsonl.enc");

        if (! is_file($file)) {
            $this->error("File tidak ditemukan: $file");
            return self::FAILURE;
        }

        $table = $this->option('table');
        $limit = (int) $this->option('limit') ?: 20;
        $fh = fopen($file, 'r');
        if (! $fh) {
            $this->error("Gagal membuka file");
            return self::FAILURE;
        }

        $shown = 0;
        while (! feof($fh) && $shown < $limit) {
            $line = trim((string) fgets($fh));
            if ($line === '') continue;
            try {
                $payload = json_decode(Crypt::decryptString($line), true, 512, JSON_THROW_ON_ERROR);
            } catch (\Throwable $e) {
                continue;
            }
            if ($table && ($payload['table'] ?? null) !== $table) continue;

            $this->line(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
            $this->line(str_repeat('-', 60));
            $shown++;
        }
        fclose($fh);

        $this->info("$shown baris ditampilkan dari $file");
        return self::SUCCESS;
    }
}
