<?php

namespace App\Http\Controllers\Api;

use App\Models\Peminjaman;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PeminjamanController extends Controller
{
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
            'rows.*.no_hak' => ['required', 'string', 'max:64'],
            'rows.*.jenis_hak' => ['required', 'string', 'max:64'],
            'rows.*.desa' => ['nullable', 'string', 'max:128'],
            'rows.*.kecamatan' => ['nullable', 'string', 'max:128'],
            'rows.*.no_su' => ['nullable', 'string', 'max:64'],
            'rows.*.no_warkah' => ['nullable', 'string', 'max:64'],
            'rows.*.no_ht' => ['nullable', 'string', 'max:64'],
            'rows.*.jenis_peminjaman' => ['nullable', 'string', 'max:64'],
            'rows.*.file_pengamanan_url' => ['nullable', 'string', 'max:512'],
            'rows.*.status' => ['required', 'string', 'max:64'],
            'rows.*.tipe' => ['required', 'in:register,pengamanan'],
            'rows.*.catatan' => ['nullable', 'string', 'max:2000'],
        ]);

        $username = $request->user()->username;
        $now = now();
        $count = 0;
        foreach ($data['rows'] as $row) {
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
            'status' => ['required', 'string', 'max:64'],
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

    public function destroy(string $id)
    {
        Peminjaman::where('id', $id)->delete();
        return response()->json(['ok' => true]);
    }
}
