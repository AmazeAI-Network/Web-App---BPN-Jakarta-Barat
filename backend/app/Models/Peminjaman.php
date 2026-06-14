<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Peminjaman extends Model
{
    use HasUuids;

    protected $table = 'peminjaman';

    protected $fillable = [
        'no_register', 'peminjam', 'email', 'kegiatan',
        'no_hak', 'jenis_hak', 'desa', 'kecamatan',
        'no_su', 'no_warkah', 'no_ht', 'jenis_peminjaman',
        'file_pengamanan_url', 'status', 'tipe',
        'created_by', 'catatan',
        'tgl_pengajuan', 'tgl_update', 'tgl_konfirmasi',
        'dikonfirmasi_oleh',
    ];

    protected function casts(): array
    {
        return [
            'tgl_pengajuan' => 'datetime',
            'tgl_update' => 'datetime',
            'tgl_konfirmasi' => 'datetime',
        ];
    }
}
