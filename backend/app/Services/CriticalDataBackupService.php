<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class CriticalDataBackupService
{
    public function recordModel(Model $model, string $action): void
    {
        if (! $this->enabled()) {
            return;
        }

        $table = $model->getTable();
        if (! $this->shouldBackupTable($table)) {
            return;
        }

        $row = $action === 'deleting' ? $model->getOriginal() : $model->getAttributes();
        unset($row['password'], $row['remember_token']);
        $this->recordTableRowSnapshot($table, $row, $action, $action !== 'deleting');
    }

    public function recordTableRowSnapshot(string $table, array $row, string $action = 'snapshot', bool $mirrorToSecondary = true): void
    {
        if (! $this->enabled() || ! $this->shouldBackupTable($table)) {
            return;
        }

        if ((bool) config('backup.local.enabled', true)) {
            $this->appendEncryptedLocalLog([
                'action' => $action,
                'table' => $table,
                'record_id' => $row['id'] ?? null,
                'recorded_at' => now()->toIso8601String(),
                'row' => $row,
            ]);
        }

        if ($mirrorToSecondary) {
            $this->mirrorToSecondaryDatabase($table, $row);
        }
    }

    private function enabled(): bool
    {
        return (bool) config('backup.enabled', true);
    }

    private function shouldBackupTable(string $table): bool
    {
        return in_array($table, (array) config('backup.tables', []), true);
    }

    private function appendEncryptedLocalLog(array $payload): void
    {
        try {
            $dir = (string) config('backup.local.path', storage_path('app/backups/critical-data'));
            File::ensureDirectoryExists($dir, 0700, true);

            $line = Crypt::encryptString(json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
            File::append($dir . DIRECTORY_SEPARATOR . now()->format('Y-m-d') . '.jsonl.enc', $line . PHP_EOL);
        } catch (\Throwable $e) {
            Log::warning('Critical data local backup failed', [
                'table' => $payload['table'] ?? null,
                'record_id' => $payload['record_id'] ?? null,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function mirrorToSecondaryDatabase(string $table, array $row): void
    {
        if (! (bool) config('backup.secondary_database.enabled', false)) {
            return;
        }

        if (empty($row['id']) || $this->secondaryDatabaseIsPrimary()) {
            return;
        }

        try {
            DB::connection((string) config('backup.secondary_database.connection', 'mysql_backup'))
                ->table($table)
                ->updateOrInsert(['id' => $row['id']], $row);
        } catch (\Throwable $e) {
            Log::warning('Critical data secondary database mirror failed', [
                'table' => $table,
                'record_id' => $row['id'] ?? null,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function secondaryDatabaseIsPrimary(): bool
    {
        $secondary = (string) config('backup.secondary_database.connection', 'mysql_backup');
        $primary = (string) config('database.default', 'mysql');

        if ($secondary === $primary) {
            return true;
        }

        $primaryConfig = (array) config("database.connections.$primary", []);
        $secondaryConfig = (array) config("database.connections.$secondary", []);

        foreach (['host', 'port', 'database', 'username'] as $key) {
            if (($primaryConfig[$key] ?? null) !== ($secondaryConfig[$key] ?? null)) {
                return false;
            }
        }

        return true;
    }
}