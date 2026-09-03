<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter(array_merge(
        [
            env('FRONTEND_URL', 'https://arsip.bpnjakbar.id'),
            'https://arsip.bpnjakbar.id',
            'https://www.arsip.bpnjakbar.id',
        ],
        env('APP_ENV') === 'local' ? [
            'http://localhost:5173',
            'http://localhost:8080',
            'http://localhost:3000',
        ] : []
    ))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
