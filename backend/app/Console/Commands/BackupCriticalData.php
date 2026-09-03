<?php

namespace App\Console\Commands;

use App\Services\CriticalDataBackupService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackupCriticalData extends Command
{
    protected $signature = 'backup:critical-data {--table=* : Batasi backup ke table tertentu} {--force : Izinkan berjalan di production}';

    protected $description = 'Membuat snapshot terenkripsi untuk data penting dan mirror ke database cadangan jika dikonfigurasi.';

    public function handle(CriticalDataBackupService $backup): int
    {
        $allowedTables = (array) config('backup.tables', []);
        $selectedTables = array_values(array_filter((array) $this->option('table')));
        $tables = $selectedTables ? array_values(array_intersect($allowedTables, $selectedTables)) : $allowedTables;

        foreach ($tables as $table) {
            $count = 0;
            DB::table($table)
                ->orderBy('id')
                ->chunk(200, function ($rows) use ($backup, $table, &$count) {
                    foreach ($rows as $row) {
                        $backup->recordTableRowSnapshot($table, (array) $row, 'scheduled_snapshot', true);
                        $count++;
                    }
                });

            $this->info("Backup $table selesai: $count baris");
        }

        return self::SUCCESS;
    }
}