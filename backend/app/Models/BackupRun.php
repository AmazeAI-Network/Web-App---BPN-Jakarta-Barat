<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class BackupRun extends Model
{
    protected $guarded = [];
    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'bytes' => 'integer',
    ];

    private static ?bool $tableReady = null;

    /**
     * Self-healing: buat tabel backup_runs bila belum ada (mis. migrasi belum
     * terupload ke VPS) sehingga perintah backup tidak gagal total.
     */
    public static function ensureTable(): bool
    {
        if (self::$tableReady !== null) {
            return self::$tableReady;
        }

        try {
            if (Schema::hasTable('backup_runs')) {
                return self::$tableReady = true;
            }

            Schema::create('backup_runs', function (Blueprint $t) {
                $t->id();
                $t->string('type', 32);
                $t->string('destination', 32);
                $t->string('status', 16);
                $t->string('artifact')->nullable();
                $t->unsignedBigInteger('bytes')->default(0);
                $t->text('message')->nullable();
                $t->timestamp('started_at')->nullable();
                $t->timestamp('finished_at')->nullable();
                $t->timestamps();
                $t->index(['type', 'destination', 'finished_at']);
            });

            return self::$tableReady = true;
        } catch (\Throwable $e) {
            return self::$tableReady = false;
        }
    }

    /** Buat baris riwayat tanpa pernah melempar exception. */
    public static function safeCreate(array $attributes): ?self
    {
        if (! self::ensureTable()) {
            return null;
        }

        try {
            return self::create($attributes);
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** Update aman (no-op bila baris tidak tersedia). */
    public static function safeUpdate(?self $run, array $attributes): void
    {
        if (! $run) {
            return;
        }

        try {
            $run->update($attributes);
        } catch (\Throwable $e) {
            // abaikan — riwayat bersifat opsional
        }
    }
}
