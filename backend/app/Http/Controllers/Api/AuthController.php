<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'max:200'],
        ]);

        $username = mb_strtolower(trim($data['username']));
        $user = User::where('username', $username)->first();

        if (! $user || ! $user->active || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['Username atau password salah'],
            ]);
        }

        $user->forceFill(['last_login' => now()])->save();

        // Revoke previous tokens for this device label (optional) and issue new one.
        $token = $user->createToken('spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->serialize($user),
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $token = $user->currentAccessToken();
            if ($token) $token->delete();
        }
        return response()->json(['ok' => true]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        if (! $user) return response()->json(['authenticated' => false]);
        return response()->json([
            'authenticated' => true,
            'username' => $user->username,
            'role' => $user->role,
            'user' => $this->serialize($user),
        ]);
    }

    private function serialize(User $u): array
    {
        return [
            'id' => $u->id,
            'username' => $u->username,
            'name' => $u->name,
            'nip' => $u->nip,
            'email' => $u->email,
            'unitKerja' => $u->unit_kerja,
            'role' => $u->role,
            'roleLabel' => $u->role_label,
            'active' => (bool) $u->active,
            'lastLogin' => optional($u->last_login)->toIso8601String(),
        ];
    }
}
