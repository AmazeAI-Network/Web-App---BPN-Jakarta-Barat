<?php

namespace App\Http\Controllers\Api;

use App\Models\Kegiatan;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class KegiatanController extends Controller
{
    public function index()
    {
        return Kegiatan::orderBy('nama')->get(['id','nama','deskripsi','aktif']);
    }

    public function store(Request $r)
    {
        $data = $this->validateData($r);
        $k = Kegiatan::create($data);
        return response()->json(['ok' => true, 'id' => $k->id], 201);
    }

    public function update(Request $r, string $id)
    {
        $data = $this->validateData($r);
        $kegiatan = Kegiatan::findOrFail($id);
        $kegiatan->update($data);
        return response()->json(['ok' => true, 'id' => $id]);
    }

    public function destroy(string $id)
    {
        Kegiatan::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    private function validateData(Request $r): array
    {
        return $r->validate([
            'nama' => ['required', 'string', 'max:200'],
            'deskripsi' => ['nullable', 'string', 'max:1000'],
            'aktif' => ['required', 'boolean'],
        ]);
    }
}
