<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
        $data = $this->validateData($r, true);
        $data['username'] = mb_strtolower(trim($data['username']));
        $data['role_label'] = $this->roleLabel[$data['role']];
        $data['password'] = Hash::make($data['password']);
        $u = User::create($data);
        return response()->json(['ok' => true, 'id' => $u->id], 201);
    }

    public function update(Request $r, string $id)
    {
        $u = User::findOrFail($id);
        $data = $this->validateData($r, false);
        if (isset($data['password']) && $data['password']) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        $data['role_label'] = $this->roleLabel[$data['role']];
        $u->update($data);
        return response()->json(['ok' => true, 'id' => $u->id]);
    }

    public function destroy(string $id)
    {
        User::where('id', $id)->delete();
        return response()->json(['ok' => true]);
    }

    public function setActive(Request $r, string $id)
    {
        $r->validate(['active' => ['required', 'boolean']]);
        User::where('id', $id)->update(['active' => $r->boolean('active')]);
        return response()->json(['ok' => true]);
    }

    public function resetPassword(Request $r, string $id)
    {
        $r->validate(['newPassword' => ['nullable', 'string', 'min:6', 'max:200']]);
        $new = $r->input('newPassword') ?: Str::random(12);
        User::where('id', $id)->update(['password' => Hash::make($new)]);
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
            'role' => ['required', 'in:admin,verifikator,verifikasi,petugas_loket'],
            'active' => ['required', 'boolean'],
            'password' => [$isNew ? 'required' : 'nullable', 'string', 'max:200'],
        ]) + ['unit_kerja' => $r->input('unitKerja', '')];
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
