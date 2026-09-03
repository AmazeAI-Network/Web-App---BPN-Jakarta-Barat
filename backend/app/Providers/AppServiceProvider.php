<?php

namespace App\Providers;

use App\Models\Kegiatan;
use App\Models\Peminjam;
use App\Models\Peminjaman;
use App\Models\User;
use App\Services\CriticalDataBackupService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Disk "pengamanan" — private, signed URL only
        // Konfigurasinya ada di config/filesystems.php

        foreach ([User::class, Kegiatan::class, Peminjam::class, Peminjaman::class] as $modelClass) {
            $modelClass::saved(function (Model $model) {
                app(CriticalDataBackupService::class)->recordModel($model, 'saved');
            });

            $modelClass::deleting(function (Model $model) {
                app(CriticalDataBackupService::class)->recordModel($model, 'deleting');
            });
        }
    }
}
