<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Kegiatan extends Model
{
    use HasUuids;

    protected $table = 'kegiatan';

    protected $fillable = ['nama', 'deskripsi', 'aktif'];

    protected function casts(): array
    {
        return ['aktif' => 'boolean'];
    }
}
