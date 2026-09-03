<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration {
    public function up(): void
    {
        if (! DB::table('demo_accounts')->where('username', 'admin')->exists()) {
            $password = (string) env('ADMIN_BOOTSTRAP_PASSWORD', '');
            $generated = false;
            if ($password === '') {
                $password = \Illuminate\Support\Str::password(20);
                $generated = true;
            }

            DB::table('demo_accounts')->insert([
                'id' => '392951c7-69cc-4330-b8a7-e1603e55ee75',
                'username' => 'admin',
                'password' => Hash::make($password),
                'name' => 'Admin Arsip',
                'nip' => '',
                'email' => 'admin@gmail.com',
                'unit_kerja' => '',
                'active' => 1,
                'role' => 'admin',
                'role_label' => 'Administrator',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($generated) {
                \Illuminate\Support\Facades\Log::warning('Admin bootstrap password dibuat acak saat migrasi. Gunakan artisan tinker untuk set ulang jika tidak tercatat.');
                if (\PHP_SAPI === 'cli') {
                    fwrite(STDOUT, PHP_EOL . '>> Password admin sekali pakai: ' . $password . PHP_EOL . '>> Segera ganti setelah login.' . PHP_EOL);
                }
            }
        } else {
            DB::table('demo_accounts')
                ->where('username', 'admin')
                ->update([
                    'name' => 'Admin Arsip',
                    'nip' => '',
                    'email' => 'admin@gmail.com',
                    'unit_kerja' => '',
                    'active' => 1,
                    'role' => 'admin',
                    'role_label' => 'Administrator',
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // Tidak dibalik agar akses admin produksi tidak terkunci kembali.
    }
};