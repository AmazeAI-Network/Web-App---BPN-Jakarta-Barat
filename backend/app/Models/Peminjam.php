<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Peminjam extends Model
{
    use HasUuids;

    protected $table = 'peminjam';

    protected $fillable = [
        'kode', 'nama', 'jenis', 'email', 'telepon', 'aktif',
    ];

    protected function casts(): array
    {
        return ['aktif' => 'boolean'];
    }
}
