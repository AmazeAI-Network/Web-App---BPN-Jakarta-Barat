<?php

return [
    'default' => env('MAIL_MAILER', 'log'),
    'mailers' => [
        'resend' => ['transport' => 'resend'],
        'log' => ['transport' => 'log', 'channel' => env('MAIL_LOG_CHANNEL')],
        'failover' => ['transport' => 'failover', 'mailers' => ['log']],
    ],
    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'hello@example.com'),
        'name' => env('MAIL_FROM_NAME', 'Example'),
    ],
];
