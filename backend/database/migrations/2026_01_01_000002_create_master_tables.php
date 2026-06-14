<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('peminjam', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('kode', 64)->unique();
            $t->string('nama', 200);
            $t->string('jenis', 64);
            $t->string('email', 255)->nullable();
            $t->string('telepon', 64)->nullable();
            $t->boolean('aktif')->default(true);
            $t->timestamps();
        });

        Schema::create('kegiatan', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('nama', 200);
            $t->string('deskripsi', 1000)->nullable();
            $t->boolean('aktif')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kegiatan');
        Schema::dropIfExists('peminjam');
    }
};
