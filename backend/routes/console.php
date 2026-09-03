<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Snapshot critical-data ringan harian (existing behaviour)
Schedule::command('backup:critical-data')->dailyAt('23:55')->withoutOverlapping();

// Backup penuh + sync ke storage cadangan setiap 1 jam
Schedule::command('backup:full')->hourly()->withoutOverlapping();

// Pembersihan retensi tiap 6 jam (default 7 hari, configurable)
Schedule::command('backup:prune')->everySixHours()->withoutOverlapping();
