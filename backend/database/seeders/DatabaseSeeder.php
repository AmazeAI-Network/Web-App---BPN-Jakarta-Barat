<?php

namespace Database\Seeders;

use App\Models\Kegiatan;
use App\Models\Peminjam;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['admin', 'Administrator', 'admin', 'Administrator', 'admin@bpnjakbar.id'],
            ['petugas', 'Petugas Loket', 'petugas_loket', 'Petugas Loket', 'petugas@bpnjakbar.id'],
            ['informasi', 'Informasi', 'verifikator', 'Informasi', 'informasi@bpnjakbar.id'],
        ];
        foreach ($users as [$u, $name, $role, $label, $email]) {
            User::updateOrCreate(['username' => $u], [
                'name' => $name,
                'nip' => '',
                'email' => $email,
                'unit_kerja' => 'BPN Jakarta Barat',
                'role' => $role,
                'role_label' => $label,
                'active' => true,
                'password' => Hash::make('admin123'),
            ]);
        }

        foreach (['Pengukuran', 'Pengecekan', 'Peralihan Hak', 'Roya', 'Pemasangan HT'] as $n) {
            Kegiatan::updateOrCreate(['nama' => $n], ['aktif' => true]);
        }

        $samples = [
            ['BPN-001', 'BPN Jakarta Barat', 'Instansi'],
            ['NOT-001', 'Notaris Contoh', 'Notaris'],
        ];
        foreach ($samples as [$kode, $nama, $jenis]) {
            Peminjam::updateOrCreate(['kode' => $kode], [
                'nama' => $nama, 'jenis' => $jenis, 'aktif' => true,
            ]);
        }

        $this->command->info('Seeded: admin / petugas / informasi  (password: admin123)');
    }
}
