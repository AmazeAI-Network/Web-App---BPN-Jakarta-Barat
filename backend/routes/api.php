<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupStatusController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\KegiatanController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PeminjamController;
use App\Http\Controllers\Api\PeminjamanController;
use App\Http\Controllers\Api\RecoveryController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/auth/me', [AuthController::class, 'me']);

// Authenticated via Authorization: Bearer ...
Route::middleware('auth.api')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Peminjaman
    Route::get('/peminjaman', [PeminjamanController::class, 'index']);
    Route::post('/peminjaman', [PeminjamanController::class, 'store']);
    Route::patch('/peminjaman/{id}/status', [PeminjamanController::class, 'updateStatus']);
    // Revisi / pembatalan: admin bebas, role lain hanya data miliknya (dicek di controller).
    Route::put('/peminjaman/{id}', [PeminjamanController::class, 'update']);
    Route::delete('/peminjaman/{id}', [PeminjamanController::class, 'destroy']);

    // Master data — read untuk semua login, tulis untuk admin
    Route::get('/kegiatan', [KegiatanController::class, 'index']);
    Route::get('/peminjam', [PeminjamController::class, 'index']);

    Route::middleware('role:admin')->group(function () {
        Route::post('/kegiatan', [KegiatanController::class, 'store']);
        Route::put('/kegiatan/{id}', [KegiatanController::class, 'update']);
        Route::delete('/kegiatan/{id}', [KegiatanController::class, 'destroy']);

        Route::post('/peminjam', [PeminjamController::class, 'store']);
        Route::put('/peminjam/{id}', [PeminjamController::class, 'update']);
        Route::delete('/peminjam/{id}', [PeminjamController::class, 'destroy']);

        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
        Route::patch('/users/{id}/active', [UserController::class, 'setActive']);
        Route::post('/users/{id}/reset-password', [UserController::class, 'resetPassword']);

        // Backup & recovery (admin-only)
        Route::get('/backup/status', [BackupStatusController::class, 'index']);
        Route::get('/recovery/snapshots', [RecoveryController::class, 'snapshots']);
        Route::get('/recovery/snapshots/{file}/preview', [RecoveryController::class, 'preview']);
        Route::post('/recovery/snapshots/{file}/restore', [RecoveryController::class, 'restore']);
        Route::get('/recovery/binlogs', [RecoveryController::class, 'binlogs']);
        Route::get('/scheduler/status', [\App\Http\Controllers\Api\SchedulerStatusController::class, 'index']);
    });

    // Files
    Route::post('/files/pengamanan/upload', [FileController::class, 'upload']);
    Route::post('/files/pengamanan/signed-url', [FileController::class, 'signedUrl']);

    // Notifications
    Route::post('/notifications/email', [NotificationController::class, 'email']);
});

// Signed file download (public route + signature check)
Route::get('/files/pengamanan/{path}', [FileController::class, 'show'])
    ->name('files.pengamanan.show');
