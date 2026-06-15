# Snapshot Data Supabase → Backend Laravel

Berisi seluruh data lama yang sebelumnya tersimpan di Supabase, diekspor pada
saat migrasi ke backend Laravel.

## Isi

| File                | Baris  | Keterangan                                |
|---------------------|--------|-------------------------------------------|
| `demo_accounts.csv` | 10     | Akun pengguna (admin, petugas, dll)       |
| `kegiatan.csv`      | 40     | Master kegiatan                           |
| `peminjam.csv`      | 4      | Master peminjam                           |
| `peminjaman.csv`    | 213    | Transaksi peminjaman arsip                |
| `data.sql`          | 267 INSERT | Dump MySQL-compatible siap di-`source` |

## Cara import ke database Laravel (MySQL)

```bash
# Pastikan schema sudah dibuat lewat migrasi terlebih dahulu
cd backend
php artisan migrate --force

# Import data snapshot
mysql -u <user> -p <database> < database/exports/data.sql
```

Atau lewat `php artisan db:seed` setelah seeder `ImportSupabaseSnapshotSeeder`
dijalankan (membaca CSV di folder ini).

## Catatan

- Password di `demo_accounts.csv` adalah hash bcrypt — kompatibel langsung
  dengan Laravel `Hash::check()`.
- Kolom `file_pengamanan_url` di `peminjaman.csv` menunjuk ke path Supabase
  Storage lama (bucket `pengamanan-files`). File fisik PDF tidak ikut
  ter-export di sini; bila masih diperlukan, unduh manual dan letakkan di
  `backend/storage/app/pengamanan/`.
- `session_token` / `session_expires_at` di `demo_accounts` tidak relevan
  untuk Laravel Sanctum dan boleh diabaikan saat import.
