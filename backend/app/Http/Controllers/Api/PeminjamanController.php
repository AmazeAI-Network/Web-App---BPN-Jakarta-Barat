<?php

namespace App\Http\Controllers\Api;

use App\Models\Peminjaman;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class PeminjamanController extends Controller
{
    private const ALLOWED_STATUSES = [
        'Proses Pencarian',
        'Siap Diserahkan',
        'Sedang Dipinjam',
        'Proses Dikembalikan',
        'Sudah Dikembalikan',
        'Pengembalian Diterima',
        'Diamankan',
        'Dikembalikan',
    ];

    public function index()
    {
        $rows = Peminjaman::orderByDesc('tgl_pengajuan')->get()->toArray();
        $usernames = array_values(array_unique(array_filter(array_column($rows, 'created_by'))));
        $roles = User::whereIn('username', $usernames)->pluck('role', 'username')->toArray();
        return collect($rows)->map(function ($r) use ($roles) {
            $r['created_by_role'] = $r['created_by'] ? ($roles[$r['created_by']] ?? null) : null;
            return $r;
        });
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'rows' => ['required', 'array', 'min:1', 'max:50'],
            'rows.*.no_register' => ['required', 'string', 'max:64'],
            'rows.*.peminjam' => ['required', 'string', 'max:255'],
            'rows.*.email' => ['nullable', 'email', 'max:255'],
            'rows.*.kegiatan' => ['required', 'string', 'max:255'],
            'rows.*.no_hak' => ['nullable', 'string', 'max:64'],
            'rows.*.jenis_hak' => ['nullable', 'string', 'max:64'],
            'rows.*.desa' => ['required', 'string', 'max:128'],
            'rows.*.kecamatan' => ['required', 'string', 'max:128'],
            'rows.*.no_su' => ['nullable', 'string', 'max:64'],
            'rows.*.no_warkah' => ['nullable', 'string', 'max:64'],
            'rows.*.no_ht' => ['nullable', 'string', 'max:64'],
            'rows.*.jenis_peminjaman' => ['nullable', 'string', 'max:64'],
            'rows.*.file_pengamanan_url' => ['nullable', 'string', 'max:512'],
            'rows.*.status' => ['required', 'string', Rule::in(self::ALLOWED_STATUSES)],
            'rows.*.tipe' => ['required', 'in:register,pengamanan'],
            'rows.*.catatan' => ['nullable', 'string', 'max:2000'],
        ]);

        $username = $request->user()->username;
        $now = now();
        $count = 0;
        foreach ($data['rows'] as $row) {
            $row['no_hak'] = trim((string) ($row['no_hak'] ?? '')) ?: '-';
            $row['jenis_hak'] = trim((string) ($row['jenis_hak'] ?? '')) ?: '-';
            $row['created_by'] = $username;
            $row['tgl_pengajuan'] = $now;
            Peminjaman::create($row);
            $count++;
        }
        return response()->json(['ok' => true, 'count' => $count], 201);
    }

    public function updateStatus(Request $request, string $id)
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(self::ALLOWED_STATUSES)],
            'catatan' => ['nullable', 'string', 'max:2000'],
            'dikonfirmasi_oleh' => ['nullable', 'string', 'max:128'],
        ]);
        $now = now();
        $p = Peminjaman::findOrFail($id);
        $p->status = $data['status'];
        $p->tgl_update = $now;
        $p->catatan = $data['catatan'] ?? null;
        if (! empty($data['dikonfirmasi_oleh'])) {
            $p->dikonfirmasi_oleh = $data['dikonfirmasi_oleh'];
            $p->tgl_konfirmasi = $now;
        }
        $p->save();
        return response()->json(['ok' => true, 'tgl_update' => $now->toIso8601String()]);
    }

    /**
     * Revisi data yang sudah disubmit.
     * Admin boleh merevisi semua data; role lain hanya data yang dibuatnya sendiri.
     */
    public function update(Request $request, string $id)
    {
        $data = $request->validate([
            'peminjam' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'kegiatan' => ['sometimes', 'string', 'max:255'],
            'no_hak' => ['sometimes', 'nullable', 'string', 'max:64'],
            'jenis_hak' => ['sometimes', 'nullable', 'string', 'max:64'],
            'desa' => ['sometimes', 'string', 'max:128'],
            'kecamatan' => ['sometimes', 'string', 'max:128'],
            'no_su' => ['sometimes', 'nullable', 'string', 'max:64'],
            'no_warkah' => ['sometimes', 'nullable', 'string', 'max:64'],
            'no_ht' => ['sometimes', 'nullable', 'string', 'max:64'],
            'jenis_peminjaman' => ['sometimes', 'nullable', 'string', 'max:64'],
            'catatan' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'status' => ['sometimes', 'string', Rule::in(self::ALLOWED_STATUSES)],
        ]);

        $p = Peminjaman::findOrFail($id);
        if (! $this->canModify($request, $p)) {
            return response()->json(['message' => 'Anda hanya dapat merevisi data yang Anda input sendiri.'], 403);
        }

        foreach ($data as $k => $v) {
            if (in_array($k, ['no_hak', 'jenis_hak'], true)) {
                $v = trim((string) $v) ?: '-';
            }
            $p->{$k} = $v;
        }
        $p->tgl_update = now();
        $p->save();

        return response()->json(['ok' => true, 'tgl_update' => $p->tgl_update->toIso8601String()]);
    }

    public function destroy(Request $request, string $id)
    {
        $p = Peminjaman::findOrFail($id);
        if (! $this->canModify($request, $p)) {
            return response()->json(['message' => 'Anda hanya dapat membatalkan data yang Anda input sendiri.'], 403);
        }
        $p->delete();
        return response()->json(['ok' => true]);
    }

    private function canModify(Request $request, Peminjaman $p): bool
    {
        $user = $request->user();
        if (! $user) return false;
        if ($user->role === 'admin') return true;
        return $p->created_by !== null && $p->created_by === $user->username;
    }
}
