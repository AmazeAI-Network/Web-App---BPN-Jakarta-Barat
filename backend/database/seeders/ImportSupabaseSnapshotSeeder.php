<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Mengimpor snapshot data lama dari Supabase yang disimpan sebagai CSV di
 * `database/exports/`. Jalankan dengan:
 *
 *     php artisan db:seed --class=Database\\Seeders\\ImportSupabaseSnapshotSeeder
 */
class ImportSupabaseSnapshotSeeder extends Seeder
{
    public function run(): void
    {
        $dir = database_path('exports');
        $tables = ['demo_accounts', 'kegiatan', 'peminjam', 'peminjaman'];

        foreach ($tables as $table) {
            $file = $dir . DIRECTORY_SEPARATOR . $table . '.csv';
            if (! is_file($file)) {
                $this->command->warn("Lewati $table — file CSV tidak ditemukan: $file");
                continue;
            }
            $fh = fopen($file, 'r');
            $cols = fgetcsv($fh);
            if (! $cols) { fclose($fh); continue; }

            DB::table($table)->truncate();
            $batch = [];
            $count = 0;
            while (($row = fgetcsv($fh)) !== false) {
                $assoc = [];
                foreach ($cols as $i => $c) {
                    $v = $row[$i] ?? null;
                    if ($v === '') $v = null;
                    elseif ($v === 't' || $v === 'true') $v = 1;
                    elseif ($v === 'f' || $v === 'false') $v = 0;
                    $assoc[$c] = $v;
                }
                $batch[] = $assoc;
                if (count($batch) >= 200) {
                    DB::table($table)->insert($batch);
                    $count += count($batch);
                    $batch = [];
                }
            }
            if ($batch) {
                DB::table($table)->insert($batch);
                $count += count($batch);
            }
            fclose($fh);
            $this->command->info("Imported $count rows into $table");
        }
    }
}
