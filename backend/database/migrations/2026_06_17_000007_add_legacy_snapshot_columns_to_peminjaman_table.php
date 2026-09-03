<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('peminjaman', function (Blueprint $table) {
            if (! Schema::hasColumn('peminjaman', 'no_berkas_pnbp')) {
                $table->string('no_berkas_pnbp', 64)->nullable()->after('tgl_konfirmasi');
            }

            if (! Schema::hasColumn('peminjaman', 'tahun')) {
                $table->string('tahun', 16)->nullable()->after('no_berkas_pnbp');
            }
        });
    }

    public function down(): void
    {
        Schema::table('peminjaman', function (Blueprint $table) {
            if (Schema::hasColumn('peminjaman', 'tahun')) {
                $table->dropColumn('tahun');
            }

            if (Schema::hasColumn('peminjaman', 'no_berkas_pnbp')) {
                $table->dropColumn('no_berkas_pnbp');
            }
        });
    }
};