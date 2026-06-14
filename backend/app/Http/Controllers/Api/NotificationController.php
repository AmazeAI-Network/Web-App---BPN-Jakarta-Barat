<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Http;

class NotificationController extends Controller
{
    public function email(Request $request)
    {
        $data = $request->validate([
            'to' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:200'],
            'html' => ['required', 'string', 'max:50000'],
        ]);

        $apiKey = env('RESEND_API_KEY');
        $from = env('MAIL_FROM_ADDRESS', 'no-reply@bpnjakbar.xyz');
        $fromName = env('MAIL_FROM_NAME', 'BPN Jakarta Barat');

        if (! $apiKey) {
            return response()->json([
                'ok' => false,
                'message' => 'Email service belum dikonfigurasi',
            ], 503);
        }

        $res = Http::withToken($apiKey)
            ->acceptJson()
            ->post('https://api.resend.com/emails', [
                'from' => "$fromName <$from>",
                'to' => [$data['to']],
                'subject' => $data['subject'],
                'html' => $data['html'],
            ]);

        if (! $res->successful()) {
            return response()->json([
                'ok' => false,
                'message' => 'Gagal mengirim email',
            ], 502);
        }

        return response()->json(['ok' => true]);
    }
}
