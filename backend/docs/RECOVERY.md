# Panduan Recovery & Backup

Dokumen ini menjawab pertanyaan: **"Di mana letak backup/binlog/snapshot dan bagaimana melihat isinya?"**

## 1. Lokasi file di VPS

| Jenis | Path default | Format |
|---|---|---|
| Snapshot per-perubahan (otomatis tiap save/delete) | `/var/www/api-arsip/storage/app/backups/critical-data/YYYY-MM-DD.jsonl.enc` | JSON Lines terenkripsi AES (APP_KEY) |
| Snapshot penuh per jam (DB) | `/var/www/api-arsip/storage/app/backups/full/db-YYYYmmdd-HHmmss.sql.enc` | mysqldump terenkripsi |
| Snapshot penuh per jam (file) | `/var/www/api-arsip/storage/app/backups/full/files-YYYYmmdd-HHmmss.tar.enc` | tar terenkripsi |
| Binlog MySQL | `/var/lib/mysql/mysql-bin.*` atau `/var/log/mysql/mysql-bin.*` | Binary, hanya bila `log_bin=ON` |
| Mirror remote (opsional) | bucket S3/MinIO `s3://<bucket>/<prefix>/full/` | Sama dengan lokal |

## 2. Melihat isi snapshot tanpa script tambahan

```bash
cd /var/www/api-arsip

# Snapshot per-perubahan untuk tanggal tertentu
php artisan backup:show 2026-06-22 --table=peminjaman --limit=20

# Snapshot file lain di path penuh
php artisan backup:show /var/www/api-arsip/storage/app/backups/critical-data/2026-06-22.jsonl.enc --limit=5
```

Atau lewat halaman `Admin → Recovery` di aplikasi: tombol **Preview** otomatis dekripsi.

## 3. Mengembalikan data yang hilang dari snapshot

1. Buka halaman **/admin/recovery** sebagai admin.
2. Pilih file snapshot tanggal data terakhir terlihat (mis. `2026-06-22.jsonl.enc`).
3. Pilih tabel (`peminjaman` / `kegiatan` / `peminjam` / `demo_accounts`).
4. Klik **Dry-run**: sistem hitung berapa baris yang akan ter-upsert tanpa menulis.
5. Periksa hasil sample. Bila benar, klik **Restore**. Operasi memakai `UPSERT by id` — data baru di DB tidak akan terhapus.

## 4. Point-In-Time Recovery dengan binlog MySQL

```bash
# 1. Pastikan binlog aktif
mysql -e "SHOW VARIABLES LIKE 'log_bin';"
ls -lh /var/lib/mysql/mysql-bin.*

# 2. Bila kosong, aktifkan (file /etc/mysql/mysql.conf.d/mysqld.cnf):
#   [mysqld]
#   log_bin = /var/log/mysql/mysql-bin
#   binlog_expire_logs_seconds = 1209600
#   server-id = 1
sudo systemctl restart mysql

# 3. Replay perubahan dari rentang waktu:
sudo mysqlbinlog \
  --start-datetime="2026-06-22 00:00:00" \
  --stop-datetime="2026-06-22 23:59:59" \
  /var/lib/mysql/mysql-bin.000001 | less

# 4. Terapkan ke database (HATI-HATI di produksi, lakukan dulu di copy):
sudo mysqlbinlog --start-datetime="..." --stop-datetime="..." \
  /var/lib/mysql/mysql-bin.000001 | mysql -u root -p bpn_jakbar
```

## 5. Jadwal backup otomatis aktif

Cron Laravel scheduler harus dipasang di crontab `www-data`:

```cron
* * * * * cd /var/www/api-arsip && php artisan schedule:run >> /dev/null 2>&1
```

Sekali aktif, scheduler akan menjalankan:

| Command | Frekuensi | Tujuan |
|---|---|---|
| `backup:critical-data` | tiap hari 23:55 | snapshot ringan terenkripsi |
| `backup:full` | tiap **1 jam** | mysqldump + tar pengamanan, encrypt, mirror ke S3 bila aktif |
| `backup:prune` | tiap 6 jam | hapus file melebihi `BACKUP_RETENTION_HOURS` |

Set `BACKUP_RETENTION_HOURS=1` untuk retensi 1 jam, atau biarkan default `168` (7 hari).

## 6. Cara aman upload kode via FileZilla (PENTING)

Data hilang sebelumnya disebabkan karena folder `backend/database/` (berisi seeder + CSV) ikut ter-upload, lalu `php artisan migrate --seed` di-jalankan kembali dan menimpa baris yang sudah ada.

**Aturan baku saat upload:**

- ✅ Boleh ditimpa: `app/`, `routes/`, `config/`, `resources/`, `bootstrap/app.php`, `composer.json`.
- ❌ JANGAN PERNAH ditimpa di VPS: `storage/`, `.env`, `database/exports/`, `database/seeders/ImportSupabaseSnapshotSeeder.php`.
- Disarankan pakai `rsync`:
  ```bash
  rsync -avz --delete \
    --exclude='.env' --exclude='storage/' \
    --exclude='database/exports/' \
    backend/ user@103.247.11.227:/var/www/api-arsip/
  ```
- Selalu jalankan **sebelum upload**: `php artisan backup:full --force` agar ada titik aman untuk rollback.

## 7. Restore dari S3/MinIO

```bash
# Tarik file enkripsi terbaru
aws s3 cp s3://<bucket>/bpn-jakbar/full/db-20260622-160000.sql.enc /tmp/db.enc \
  --endpoint-url=$S3_BACKUP_ENDPOINT

# Dekripsi (di server Laravel)
cd /var/www/api-arsip
php artisan tinker --execute="echo collect(file('/tmp/db.enc'))->map(fn(\$l)=>\Crypt::decryptString(trim(\$l)))->implode('');" > /tmp/db.sql

# Restore
mysql -u root -p bpn_jakbar < /tmp/db.sql
```
