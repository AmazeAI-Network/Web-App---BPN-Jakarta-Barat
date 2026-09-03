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

        $username = strtolower(trim($data['username']));
        $user = User::where('username', $username)->first();

        if (! $user || ! $user->active || ! $this->passwordMatches($data['password'], (string) $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['Username atau password salah'],
            ]);
        }

        $user->forceFill(['last_login' => now()])->save();
        $token = $this->makeToken($user);

        return response()->json([
            'token' => $token,
            'user' => $this->serialize($user),
        ]);
    }

    public function logout(Request $request)
    {
        return response()->json(['ok' => true]);
    }

    public function me(Request $request)
    {
        $user = $this->resolveBearerUser($request);
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

    private function makeToken(User $user): string
    {
        $payload = $this->base64UrlEncode(json_encode([
            'sub' => $user->id,
            'exp' => now()->addHours(12)->timestamp,
        ], JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', $payload, (string) config('app.key'));

        return $payload . '.' . $signature;
    }

    private function passwordMatches(string $plain, string $hash): bool
    {
        if ($hash === '') {
            return false;
        }

        try {
            if (Hash::check($plain, $hash)) {
                return true;
            }
        } catch (\Throwable) {
            // Lanjut ke password_verify agar hash bcrypt lama tetap bisa dipakai
            // meskipun konfigurasi hasher Laravel di VPS berbeda.
        }

        if (str_starts_with($hash, '$2a$') || str_starts_with($hash, '$2b$') || str_starts_with($hash, '$2y$')) {
            return password_verify($plain, $hash) || password_verify($plain, str_replace('$2b$', '$2y$', $hash));
        }

        return false;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function resolveBearerUser(Request $request): ?User
    {
        $token = $request->bearerToken();
        if (! $token) {
            return null;
        }

        [$payload, $signature] = array_pad(explode('.', $token, 2), 2, null);
        if (! $payload || ! $signature) {
            return null;
        }

        $expectedSignature = hash_hmac('sha256', $payload, (string) config('app.key'));
        if (! hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $decodedPayload = json_decode($this->base64UrlDecode($payload), true);
        if (! is_array($decodedPayload) || empty($decodedPayload['sub']) || empty($decodedPayload['exp'])) {
            return null;
        }

        if ((int) $decodedPayload['exp'] < now()->timestamp) {
            return null;
        }

        return User::where('id', $decodedPayload['sub'])
            ->where('active', true)
            ->first();
    }

    private function base64UrlDecode(string $value): string
    {
        $remainder = strlen($value) % 4;
        if ($remainder) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        return base64_decode(strtr($value, '-_', '+/')) ?: '';
    }
}
