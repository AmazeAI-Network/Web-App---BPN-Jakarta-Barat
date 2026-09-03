<?php

namespace Database\Seeders;

use App\Services\CriticalDataBackupService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

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

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            foreach ($tables as $table) {
                $rows = $this->readCsvRows($dir . DIRECTORY_SEPARATOR . $table . '.csv', $table);
                if ($rows === null) {
                    continue;
                }

                $this->backupCurrentTable($table);

                DB::transaction(function () use ($table, $rows) {
                    if ($rows === []) {
                        return;
                    }

                    $updateColumns = array_values(array_diff(array_keys($rows[0]), ['id']));
                    foreach (array_chunk($rows, 200) as $batch) {
                        DB::table($table)->upsert($batch, ['id'], $updateColumns);
                    }
                });

                $this->command->info('Upserted ' . count($rows) . " rows into $table without deleting existing VPS data");
            }
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            $this->restoreDefaultAdminLogin();
        }
    }

    private function readCsvRows(string $file, string $table): ?array
    {
        if (! is_file($file)) {
            $this->command->warn("Lewati $table — file CSV tidak ditemukan: $file");
            return null;
        }

        $fh = fopen($file, 'r');
        $cols = fgetcsv($fh);
        if (! $cols) {
            fclose($fh);
            return [];
        }

        $tableColumns = Schema::getColumnListing($table);
        $rows = [];
        while (($row = fgetcsv($fh)) !== false) {
            $assoc = [];
            foreach ($cols as $i => $c) {
                if (! in_array($c, $tableColumns, true)) {
                    continue;
                }

                $assoc[$c] = $this->normalizeCsvValue($row[$i] ?? null, $c, $table);
            }
            $rows[] = $assoc;
        }
        fclose($fh);

        return $rows;
    }

    private function backupCurrentTable(string $table): void
    {
        $backup = app(CriticalDataBackupService::class);
        $count = 0;

        DB::table($table)
            ->orderBy('id')
            ->chunk(200, function ($rows) use ($backup, $table, &$count) {
                foreach ($rows as $row) {
                    $backup->recordTableRowSnapshot($table, (array) $row, 'before_snapshot_import', true);
                    $count++;
                }
            });

        if ($count > 0) {
            $this->command->info("Backed up $count existing rows from $table before import");
        }
    }

    private function normalizeCsvValue(?string $value, string $column, string $table): mixed
    {
        if ($value !== null) {
            $value = trim($value);
        }

        if ($value === '') {
            $value = null;
        } elseif ($value === 't' || $value === 'true') {
            return 1;
        } elseif ($value === 'f' || $value === 'false') {
            return 0;
        } elseif ($value !== null && $this->isDateColumn($column)) {
            return $this->normalizeDateTime($value);
        }

        if ($value === null && $table === 'demo_accounts' && in_array($column, ['nip', 'unit_kerja'], true)) {
            return '';
        }

        return $value;
    }

    private function restoreDefaultAdminLogin(): void
    {
        if (! DB::table('demo_accounts')->where('username', 'admin')->exists()) {
            $password = (string) env('ADMIN_BOOTSTRAP_PASSWORD', '');
            $generated = false;
            if ($password === '') {
                $password = \Illuminate\Support\Str::password(20);
                $generated = true;
            }

            DB::table('demo_accounts')->insert([
                'id' => '392951c7-69cc-4330-b8a7-e1603e55ee75',
                'username' => 'admin',
                'password' => Hash::make($password),
                'name' => 'Admin Arsip',
                'nip' => '',
                'email' => 'admin@gmail.com',
                'unit_kerja' => '',
                'role' => 'admin',
                'role_label' => 'Administrator',
                'active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($generated) {
                $this->command->warn('Admin dibuat dengan password acak sekali pakai: ' . $password);
                $this->command->warn('Segera login dan ganti password ini.');
            } else {
                $this->command->info('Admin dibuat memakai ADMIN_BOOTSTRAP_PASSWORD dari environment.');
            }
        } else {
            DB::table('demo_accounts')
                ->where('username', 'admin')
                ->update([
                    'role' => 'admin',
                    'role_label' => 'Administrator',
                    'active' => 1,
                ]);

            $this->command->info('Admin account available; imported password is preserved.');
        }
    }

    private function isDateColumn(string $column): bool
    {
        return in_array($column, [
            'created_at', 'updated_at', 'last_login', 'session_expires_at',
            'tgl_pengajuan', 'tgl_update', 'tgl_konfirmasi',
        ], true);
    }

    private function normalizeDateTime(string $value): string
    {
        try {
            return (new \DateTimeImmutable($value))->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            return preg_replace('/(\.\d+)?([+-]\d{2}(:?\d{2})?|Z)$/', '', str_replace('T', ' ', $value)) ?: $value;
        }
    }
}
