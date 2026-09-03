<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $table = 'demo_accounts';

    protected $fillable = [
        'username', 'name', 'nip', 'email', 'unit_kerja',
        'role', 'role_label', 'active', 'password', 'last_login',
        'session_token', 'session_expires_at',
    ];

    protected $hidden = [
        'password', 'remember_token', 'session_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'active' => 'boolean',
            'last_login' => 'datetime',
            'session_expires_at' => 'datetime',
        ];
    }

    public function getAuthIdentifierName(): string
    {
        return 'username';
    }

    public function hasRole(string|array $roles): bool
    {
        return in_array($this->role, (array) $roles, true);
    }
}
