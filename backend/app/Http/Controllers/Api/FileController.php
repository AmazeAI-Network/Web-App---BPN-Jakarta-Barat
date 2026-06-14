<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class FileController extends Controller
{
    private string $disk = 'pengamanan';

    public function upload(Request $request)
    {
        // Accept JSON { fileName, contentBase64 } from the SPA.
        $data = $request->validate([
            'fileName' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z0-9._-]+$/'],
            'contentBase64' => ['required', 'string'],
        ]);

        $bin = base64_decode($data['contentBase64'], true);
        if ($bin === false) {
            return response()->json(['message' => 'Konten base64 tidak valid'], 422);
        }
        if (strlen($bin) > 10 * 1024 * 1024) {
            return response()->json(['message' => 'Ukuran file maksimal 10 MB'], 413);
        }

        $safe = time() . '-' . $data['fileName'];
        Storage::disk($this->disk)->put($safe, $bin);

        return response()->json(['path' => $safe]);
    }

    public function signedUrl(Request $request)
    {
        $request->validate([
            'path' => ['required', 'string', 'max:512', 'regex:/^[a-zA-Z0-9._-]+$/'],
        ]);
        $url = URL::temporarySignedRoute(
            'files.pengamanan.show',
            now()->addMinutes(10),
            ['path' => $request->input('path')]
        );
        return response()->json(['signedUrl' => $url]);
    }

    public function show(Request $request, string $path)
    {
        if (! $request->hasValidSignature()) abort(401);
        if (! preg_match('/^[a-zA-Z0-9._-]+$/', $path)) abort(400);
        if (! Storage::disk($this->disk)->exists($path)) abort(404);
        return Storage::disk($this->disk)->response($path, $path, [
            'Content-Type' => 'application/pdf',
        ]);
    }
}
