<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class UserController extends Controller
{
    private array $roleLabel = [
        'admin' => 'Administrator',
        'verifikator' => 'Informasi',
        'verifikasi' => 'Verifikasi',
        'petugas_loket' => 'Petugas Loket',
    ];

    public function index()
    {
        return User::orderByDesc('created_at')->get()->map(fn ($u) => $this->serialize($u));
    }

    public function store(Request $r)
    {
        try {
            $input = $this->validateData($r, true);
            $username = strtolower(trim($input['username']));

            if (User::where('username', $username)->exists()) {
                return response()->json([
                    'message' => 'Username sudah digunakan',
                    'errors' => ['username' => ['Username sudah digunakan']],
                ], 422);
            }

            $user = User::create([
                'username' => $username,
                'name' => $input['name'],
                'nip' => $input['nip'] ?? '',
                'email' => $input['email'],
                'unit_kerja' => $input['unitKerja'] ?? '',
                'role' => $input['role'],
                'role_label' => $this->roleLabel[$input['role']],
                'active' => (bool) $input['active'],
                'password' => Hash::make($input['password']),
            ]);

            return response()->json(['ok' => true, 'id' => $user->id], 201);
        } catch (Throwable $e) {
            Log::error('UserController@store failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Gagal membuat user: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $r, string $id)
    {
        try {
            $user = User::findOrFail($id);
            $input = $this->validateData($r, false);

            $username = strtolower(trim($input['username']));
            if ($username !== $user->username
                && User::where('username', $username)->where('id', '!=', $id)->exists()) {
                return response()->json([
                    'message' => 'Username sudah digunakan',
                    'errors' => ['username' => ['Username sudah digunakan']],
                ], 422);
            }

            $user->username = $username;
            $user->name = $input['name'];
            $user->nip = $input['nip'] ?? '';
            $user->email = $input['email'];
            $user->unit_kerja = $input['unitKerja'] ?? '';
            $user->role = $input['role'];
            $user->role_label = $this->roleLabel[$input['role']];
            $user->active = (bool) $input['active'];
            if (! empty($input['password'])) {
                $user->password = Hash::make($input['password']);
            }
            $user->save();

            return response()->json(['ok' => true, 'id' => $user->id]);
        } catch (Throwable $e) {
            Log::error('UserController@update failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Gagal menyimpan user: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        User::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    public function setActive(Request $r, string $id)
    {
        $r->validate(['active' => ['required', 'boolean']]);
        $user = User::findOrFail($id);
        $user->active = $r->boolean('active');
        $user->save();
        return response()->json(['ok' => true]);
    }

    public function resetPassword(Request $r, string $id)
    {
        $r->validate(['newPassword' => ['nullable', 'string', 'min:6', 'max:200']]);
        $new = $r->input('newPassword') ?: Str::random(12);
        $user = User::findOrFail($id);
        $user->password = Hash::make($new);
        $user->save();
        return response()->json(['ok' => true, 'newPassword' => $new]);
    }

    private function validateData(Request $r, bool $isNew): array
    {
        return $r->validate([
            'username' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:200'],
            'nip' => ['nullable', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'unitKerja' => ['nullable', 'string', 'max:200'],
            'role' => ['required', Rule::in(['admin', 'verifikator', 'verifikasi', 'petugas_loket'])],
            'active' => ['required', 'boolean'],
            'password' => [$isNew ? 'required' : 'nullable', 'string', 'min:6', 'max:200'],
        ]);
    }

    private function serialize(User $u): array
    {
        return [
            'id' => $u->id, 'username' => $u->username, 'name' => $u->name,
            'nip' => $u->nip, 'email' => $u->email, 'unitKerja' => $u->unit_kerja,
            'role' => $u->role, 'roleLabel' => $u->role_label,
            'active' => (bool) $u->active,
            'lastLogin' => optional($u->last_login)->toIso8601String(),
        ];
    }
}
