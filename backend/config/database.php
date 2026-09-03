<?php

return [
    'default' => env('DB_CONNECTION', 'mysql'),

    'connections' => [
        'mysql' => [
            'driver' => 'mysql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'forge'),
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'unix_socket' => env('DB_SOCKET', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => 'InnoDB',
        ],

        // Database cadangan opsional. Aktifkan dengan BACKUP_DB_ENABLED=true
        // agar data penting ikut tersalin ke database kedua di luar database utama.
        'mysql_backup' => [
            'driver' => 'mysql',
            'url' => env('BACKUP_DB_URL'),
            'host' => env('BACKUP_DB_HOST', '127.0.0.1'),
            'port' => env('BACKUP_DB_PORT', '3306'),
            'database' => env('BACKUP_DB_DATABASE', 'bpn_jakbar_backup'),
            'username' => env('BACKUP_DB_USERNAME', 'forge'),
            'password' => env('BACKUP_DB_PASSWORD', ''),
            'unix_socket' => env('BACKUP_DB_SOCKET', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => 'InnoDB',
        ],

        // Database staging untuk uji restore tanpa menyentuh produksi.
        // Aktifkan dengan STAGING_DB_ENABLED=true dan kredensial STAGING_DB_*.
        'mysql_staging' => [
            'driver' => 'mysql',
            'url' => env('STAGING_DB_URL'),
            'host' => env('STAGING_DB_HOST', '127.0.0.1'),
            'port' => env('STAGING_DB_PORT', '3306'),
            'database' => env('STAGING_DB_DATABASE', 'bpn_jakbar_staging'),
            'username' => env('STAGING_DB_USERNAME', 'forge'),
            'password' => env('STAGING_DB_PASSWORD', ''),
            'unix_socket' => env('STAGING_DB_SOCKET', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => 'InnoDB',
        ],
    ],

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

    'redis' => [
        'client' => env('REDIS_CLIENT', 'phpredis'),
        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => env('REDIS_PREFIX', 'laravel_database_'),
        ],
        'default' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '0'),
        ],
    ],
];
