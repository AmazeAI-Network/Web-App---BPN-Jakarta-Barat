<?php

return [
    'enabled' => (bool) env('DATA_BACKUP_ENABLED', true),

    'tables' => [
        'demo_accounts',
        'kegiatan',
        'peminjam',
        'peminjaman',
    ],

    'local' => [
        'enabled' => (bool) env('DATA_BACKUP_LOCAL_ENABLED', true),
        'path' => env('DATA_BACKUP_LOCAL_PATH') ?: storage_path('app/backups/critical-data'),
    ],

    'secondary_database' => [
        'enabled' => (bool) env('BACKUP_DB_ENABLED', false),
        'connection' => env('BACKUP_DB_CONNECTION', 'mysql_backup'),
    ],

    // Backup penuh per jam (DB + file pengamanan)
    'full' => [
        'enabled' => (bool) env('BACKUP_FULL_ENABLED', true),
        'path' => env('BACKUP_FULL_PATH') ?: storage_path('app/backups/full'),
        'mysqldump' => env('MYSQLDUMP_BIN', 'mysqldump'),
        'files_root' => env('BACKUP_FILES_ROOT') ?: storage_path('app/pengamanan'),
        // Retensi (jam) — file lebih lama dari ini akan dihapus
        'retention_hours' => (int) env('BACKUP_RETENTION_HOURS', 168),
    ],

    // Tujuan kedua: S3 / MinIO / R2 / Wasabi
    'remote' => [
        'enabled' => (bool) env('S3_BACKUP_ENABLED', false),
        'disk' => 's3_backup',
        'prefix' => env('S3_BACKUP_PREFIX', 'bpn-jakbar'),
    ],
];
