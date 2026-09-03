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
        if (is_file(database_path('exports/peminjaman.csv'))) {
            $this->call(ImportSupabaseSnapshotSeeder::class);
            return;
        }

        $users = [
            ['admin', 'Administrator', 'admin', 'Administrator', 'admin@bpnjakbar.id'],
            ['petugas', 'Petugas Loket', 'petugas_loket', 'Petugas Loket', 'petugas@bpnjakbar.id'],
            ['informasi', 'Informasi', 'verifikator', 'Informasi', 'informasi@bpnjakbar.id'],
        ];
        $credentials = [];
        foreach ($users as [$u, $name, $role, $label, $email]) {
            $existing = User::where('username', $u)->first();
            $attributes = [
                'name' => $name,
                'nip' => '',
                'email' => $email,
                'unit_kerja' => 'BPN Jakarta Barat',
                'role' => $role,
                'role_label' => $label,
                'active' => true,
            ];

            if (! $existing) {
                $password = (string) env('ADMIN_BOOTSTRAP_PASSWORD', '');
                if ($password === '') {
                    $password = \Illuminate\Support\Str::password(20);
                }
                $attributes['password'] = Hash::make($password);
                $credentials[$u] = $password;
            }

            User::updateOrCreate(['username' => $u], $attributes);
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

        foreach ($credentials as $username => $password) {
            $this->command->warn("Akun baru '{$username}' dibuat dengan password sekali pakai: {$password}");
        }
        $this->command->info('Segera ganti password akun-akun tersebut setelah login pertama.');
    }
}
