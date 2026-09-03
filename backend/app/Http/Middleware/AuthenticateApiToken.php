<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        [$payload, $signature] = array_pad(explode('.', $token, 2), 2, null);

        if (! $payload || ! $signature) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $expectedSignature = hash_hmac('sha256', $payload, (string) config('app.key'));
        if (! hash_equals($expectedSignature, $signature)) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $decodedPayload = json_decode($this->base64UrlDecode($payload), true);
        if (! is_array($decodedPayload) || empty($decodedPayload['sub']) || empty($decodedPayload['exp'])) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if ((int) $decodedPayload['exp'] < now()->timestamp) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = User::where('id', $decodedPayload['sub'])
            ->where('active', true)
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
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