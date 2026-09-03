# Snapshot Data Lama → Backend Laravel

Berisi seluruh data terbaru yang sebelumnya tersimpan di Lovable Cloud, diekspor
ulang untuk migrasi penuh ke backend Laravel/VPS.

## Isi

| File                | Baris  | Keterangan                                |
|---------------------|--------|-------------------------------------------|
| `demo_accounts.csv` | 13     | Akun pengguna (admin, petugas, dll)       |
| `kegiatan.csv`      | 47     | Master kegiatan                           |
| `peminjam.csv`      | 7      | Master peminjam                           |
| `peminjaman.csv`    | 663    | Transaksi peminjaman arsip                |

## Cara import aman ke database Laravel (MySQL)

```bash
# Pastikan schema sudah dibuat lewat migrasi terlebih dahulu
cd backend
php artisan migrate --force

# Import data snapshot terbaru tanpa menghapus data baru yang sudah ada di VPS.
# Seeder akan membuat backup terenkripsi dulu, lalu UPSERT berdasarkan id.
php artisan db:seed --class=Database\\Seeders\\ImportSupabaseSnapshotSeeder --force
```

Jangan gunakan import SQL langsung pada database VPS aktif karena snapshot lama bisa
bertabrakan dengan data terbaru. Jika terpaksa memakai SQL, lakukan hanya pada
database kosong atau setelah membuat backup MySQL terlebih dahulu.

## Catatan

- Password di `demo_accounts.csv` adalah hash bcrypt lama dan tetap dipertahankan
  agar akun yang sudah terdaftar bisa login dengan password yang sama.
- Kolom `file_pengamanan_url` di `peminjaman.csv` menunjuk ke path storage
  lama (bucket `pengamanan-files`). File fisik PDF tidak ikut
  ter-export di sini; bila masih diperlukan, unduh manual dan letakkan di
  `backend/storage/app/pengamanan/`.
- `session_token` / `session_expires_at` di `demo_accounts` tidak relevan
  untuk Laravel Sanctum dan boleh diabaikan saat import.
- Untuk backup manual sewaktu-waktu jalankan:
  `php artisan backup:critical-data --force`.
