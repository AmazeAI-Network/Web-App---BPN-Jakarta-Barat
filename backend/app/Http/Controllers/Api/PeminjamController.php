<?php

namespace App\Http\Controllers\Api;

use App\Models\Peminjam;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PeminjamController extends Controller
{
    public function index()
    {
        return Peminjam::orderBy('kode')->get(['id','kode','nama','jenis','email','telepon','aktif']);
    }

    public function store(Request $r)
    {
        $data = $this->validateData($r);
        $data['kode'] = mb_strtoupper($data['kode']);
        $p = Peminjam::create($data);
        return response()->json(['ok' => true, 'id' => $p->id], 201);
    }

    public function update(Request $r, string $id)
    {
        $data = $this->validateData($r);
        $data['kode'] = mb_strtoupper($data['kode']);
        Peminjam::where('id', $id)->update($data);
        return response()->json(['ok' => true, 'id' => $id]);
    }

    public function destroy(string $id)
    {
        Peminjam::where('id', $id)->delete();
        return response()->json(['ok' => true]);
    }

    private function validateData(Request $r): array
    {
        return $r->validate([
            'kode' => ['required', 'string', 'max:64'],
            'nama' => ['required', 'string', 'max:200'],
            'jenis' => ['required', 'string', 'max:64'],
            'email' => ['nullable', 'email', 'max:255'],
            'telepon' => ['nullable', 'string', 'max:64'],
            'aktif' => ['required', 'boolean'],
        ]);
    }
}
