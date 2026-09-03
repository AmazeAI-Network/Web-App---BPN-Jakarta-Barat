<?php

return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'serve' => true,
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        // Disk khusus untuk PDF pengamanan — private, akses via signed URL
        'pengamanan' => [
            'driver' => 'local',
            'root' => storage_path('app/pengamanan'),
            'throw' => false,
        ],

        // Disk tujuan backup eksternal (S3 / MinIO / R2 / Wasabi).
        // Aktifkan dengan mengisi S3_BACKUP_* di .env dan set S3_BACKUP_ENABLED=true.
        's3_backup' => [
            'driver' => 's3',
            'key' => env('S3_BACKUP_KEY'),
            'secret' => env('S3_BACKUP_SECRET'),
            'region' => env('S3_BACKUP_REGION', 'auto'),
            'bucket' => env('S3_BACKUP_BUCKET'),
            'endpoint' => env('S3_BACKUP_ENDPOINT'),
            'use_path_style_endpoint' => (bool) env('S3_BACKUP_PATH_STYLE', true),
            'throw' => false,
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],
];
