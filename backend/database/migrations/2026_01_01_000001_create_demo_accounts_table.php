<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('demo_accounts', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('username', 100)->unique();
            $t->string('password');
            $t->string('name', 200);
            $t->string('nip', 50)->default('');
            $t->string('email', 255);
            $t->string('unit_kerja', 200)->default('');
            $t->enum('role', ['admin', 'verifikator', 'verifikasi', 'petugas_loket']);
            $t->string('role_label', 100);
            $t->boolean('active')->default(true);
            $t->timestamp('last_login')->nullable();
            $t->rememberToken();
            $t->timestamps();
            $t->index('role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demo_accounts');
    }
};
