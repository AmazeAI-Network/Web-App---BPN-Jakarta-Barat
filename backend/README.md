# Backend Laravel — BPN Jakarta Barat

API backend untuk aplikasi peminjaman arsip BPN Jakbar.

- **Frontend (SPA)**: `https://arsip.bpnjakbar.id`
- **Backend (API)**: `https://api-arsip.bpnjakbar.id`
- **VPS**: 103.247.11.227

## Stack
- PHP 8.2+
- Laravel 11
- Laravel Sanctum (token bearer untuk SPA)
- MySQL 8
- Resend (email)

## Setup di VPS

1. **Install paket dasar**
   ```bash
   sudo apt update
   sudo apt install -y php8.2 php8.2-fpm php8.2-mysql php8.2-mbstring \
     php8.2-xml php8.2-curl php8.2-zip php8.2-bcmath composer mysql-server nginx
   ```

2. **Upload folder `backend/` ke `/var/www/api-arsip`** (lewat FTP/SFTP ke `103.247.11.227`), lalu:
   ```bash
   cd /var/www/api-arsip
   composer install --no-dev --optimize-autoloader
   cp .env.example .env
   nano .env       # isi DB_PASSWORD, RESEND_API_KEY
   php artisan key:generate
   php artisan migrate --force
   php artisan db:seed --force
   php artisan storage:link
   chmod -R 775 storage bootstrap/cache
   chown -R www-data:www-data .
   ```

3. **Akun seed default** (ganti password setelah login pertama):
   - `admin` / `admin123`
   - `petugas` / `admin123`
   - `informasi` / `admin123`

4. **Nginx vhost backend** `/etc/nginx/sites-available/api-arsip.bpnjakbar.id`:
   ```nginx
   server {
     listen 80;
     server_name api-arsip.bpnjakbar.id;
     root /var/www/api-arsip/public;
     index index.php;

     add_header X-Frame-Options "SAMEORIGIN";
     client_max_body_size 25M;

     location / { try_files $uri $uri/ /index.php?$query_string; }
     location ~ \.php$ {
       include snippets/fastcgi-php.conf;
       fastcgi_pass unix:/run/php/php8.2-fpm.sock;
     }
   }
   ```

5. **Nginx vhost frontend SPA** `/etc/nginx/sites-available/arsip.bpnjakbar.id`:
   ```nginx
   server {
     listen 80;
     server_name arsip.bpnjakbar.id www.arsip.bpnjakbar.id;
     root /var/www/arsip/dist;
     index index.html;

     # Fallback SPA — semua route diserahkan ke index.html
     location / { try_files $uri $uri/ /index.html; }

     # Cache aset hash
     location /assets/ {
       expires 1y;
       add_header Cache-Control "public, immutable";
     }
   }
   ```

6. **Aktifkan + HTTPS (Let's Encrypt)**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/api-arsip.bpnjakbar.id /etc/nginx/sites-enabled/
   sudo ln -s /etc/nginx/sites-available/arsip.bpnjakbar.id /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d arsip.bpnjakbar.id -d www.arsip.bpnjakbar.id -d api-arsip.bpnjakbar.id
   ```

## Endpoint utama

| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/login` | public |
| GET  | `/api/auth/me` | auth |
| POST | `/api/auth/logout` | auth |
| GET/POST | `/api/peminjaman` | auth |
| PATCH | `/api/peminjaman/{id}/status` | auth |
| DELETE | `/api/peminjaman/{id}` | admin |
| GET | `/api/kegiatan` `/api/peminjam` | auth |
| POST/PUT/DELETE | `/api/kegiatan` `/api/peminjam` | admin |
| GET/POST/PUT/DELETE | `/api/users` | admin |
| POST | `/api/files/pengamanan/upload` | auth |
| POST | `/api/files/pengamanan/signed-url` | auth |
| GET  | `/api/files/pengamanan/{path}?signature=...` | signed |
| POST | `/api/notifications/email` | auth |

## Auth flow (Bearer token Sanctum)

Frontend SPA mengirim:
1. `POST /api/auth/login` → balik `{ token, user }`. Token disimpan di `localStorage`.
2. Semua request berikutnya bawa header `Authorization: Bearer <token>`.
3. `POST /api/auth/logout` → revoke token aktif.

## Build & deploy frontend SPA

Di mesin lokal / CI:
```bash
echo 'VITE_API_URL="https://api-arsip.bpnjakbar.id/api"' > .env
bun install
bun run build
# upload isi folder dist/ ke /var/www/arsip/dist via FTP ke 103.247.11.227
```
