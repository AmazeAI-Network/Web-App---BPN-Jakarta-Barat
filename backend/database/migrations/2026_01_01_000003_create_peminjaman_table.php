<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('peminjaman')) {
            return;
        }

        Schema::create('peminjaman', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('no_register', 64);
            $t->string('peminjam', 255);
            $t->string('email', 255)->nullable();
            $t->string('kegiatan', 255);
            $t->string('no_hak', 64);
            $t->string('jenis_hak', 64);
            $t->string('desa', 128)->nullable();
            $t->string('kecamatan', 128)->nullable();
            $t->string('no_su', 64)->nullable();
            $t->string('no_warkah', 64)->nullable();
            $t->string('no_ht', 64)->nullable();
            $t->string('no_berkas_pnbp', 64)->nullable();
            $t->string('tahun', 16)->nullable();
            $t->string('jenis_peminjaman', 64)->nullable();
            $t->string('file_pengamanan_url', 512)->nullable();
            $t->string('status', 64);
            $t->enum('tipe', ['register', 'pengamanan']);
            $t->string('created_by', 128)->nullable();
            $t->string('dikonfirmasi_oleh', 128)->nullable();
            $t->text('catatan')->nullable();
            $t->timestamp('tgl_pengajuan')->useCurrent();
            $t->timestamp('tgl_update')->nullable();
            $t->timestamp('tgl_konfirmasi')->nullable();
            $t->timestamps();
            $t->index(['tipe', 'status']);
            $t->index('tgl_pengajuan');
            $t->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('peminjaman');
    }
};
