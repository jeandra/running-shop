# PRD: Toko Sepatu Running dengan Sistem Pembayaran

Versi 1.2 · 17 November 2026 · Status: Draft · Jenis projek: Portofolio full stack developer

## 1. Ringkasan

Projek ini adalah toko online khusus sepatu running dengan sistem pembayaran terintegrasi melalui payment gateway Midtrans Snap dalam mode sandbox. Pembeli dapat menelusuri sepatu, memilih ukuran, mengelola keranjang, melakukan checkout, membayar, dan melacak pesanan. Admin dapat mengelola produk, stok per ukuran, pesanan, dan melihat laporan penjualan.

Tujuan utama projek adalah menjadi bukti kemampuan full stack yang relevan dengan kebutuhan industri: desain database relasional, autentikasi dan otorisasi, REST API terdokumentasi, integrasi pihak ketiga (payment gateway), penanganan transaksi yang aman, serta deployment dengan Docker.

## 2. Latar Belakang dan Tujuan

### 2.1 Latar belakang

E-commerce dan pembayaran digital adalah salah satu kebutuhan terbesar di industri teknologi Indonesia. Hampir semua perusahaan yang merekrut full stack developer pernah atau sedang membangun fitur katalog, transaksi, atau pembayaran. Projek ini meniru alur bisnis nyata sehingga dapat didemonstrasikan dan dibahas secara mendalam saat interview.

### 2.2 Tujuan produk

- Menyediakan alur belanja end-to-end yang berjalan dari pencarian produk sampai pembayaran terkonfirmasi.
- Menjamin konsistensi data transaksi (stok tidak minus, pesanan tidak diproses ganda, status pembayaran selalu sinkron).
- Menyediakan dashboard admin yang praktis untuk operasional toko.

### 2.3 Tujuan portofolio

- Memakai stack modern yang paling sering diminta lowongan: TypeScript, React/Next.js, Node.js, PostgreSQL.
- Menunjukkan praktik rekayasa perangkat lunak: testing, dokumentasi API, CI/CD, containerization, dan keamanan.
- Tersedia live demo dan repositori publik dengan README yang jelas.

## 3. Target Pengguna

| Peran | Deskripsi | Kebutuhan utama |
| --- | --- | --- |
| Pembeli (Customer) | Pengguna umum yang berbelanja | Mencari produk dengan cepat, checkout mudah, status pesanan jelas |
| Admin Toko | Pengelola operasional toko | Kelola produk dan stok, proses pesanan, lihat laporan |
| Super Admin (opsional) | Pengelola sistem | Kelola akun admin dan pengaturan sistem |

## 4. Ruang Lingkup

### 4.1 Dalam lingkup (in scope)

- Registrasi, login, dan manajemen profil serta alamat pengiriman
- Katalog produk dengan kategori, pencarian, filter, dan pagination
- Keranjang belanja dan checkout
- Pembayaran melalui payment gateway (sandbox) dengan notifikasi webhook
- Manajemen pesanan dan pelacakan status
- Dashboard admin: produk, stok, pesanan, laporan sederhana
- Notifikasi email untuk event penting
- Dokumentasi API, testing, dan deployment

### 4.2 Di luar lingkup (out of scope) untuk versi 1.0

- Pembayaran dengan uang asli (produksi)
- Integrasi kurir nyata (ongkir dihitung dengan tarif simulasi atau data statis)
- Aplikasi mobile native
- Multi-seller marketplace
- Sistem rekomendasi dan fitur AI
- Pakaian, aksesori, dan sepatu non-running (futsal, basket, lifestyle)

### 4.3 Produk yang dijual

Toko hanya menjual sepatu running. Satu produk adalah satu model dalam satu colorway, dan ukuran dijual sebagai varian. Data awal 24 sampai 32 produk dummy dibuat lewat seed script, dengan gambar dari sumber bebas lisensi. Kategori adalah tipe sepatu; brand disimpan sebagai atribut, bukan kategori. Daftar kategori berikut adalah usulan awal dan dapat disesuaikan.

| Kategori | Contoh produk | Spesifikasi yang disimpan |
| --- | --- | --- |
| Daily trainer | Sepatu latihan harian | Berat, drop, stack height, cushioning |
| Tempo dan race | Sepatu cepat dan balapan | Berat, drop, plat karbon atau tidak |
| Trail | Sepatu lari lintas alam | Berat, drop, kedalaman lug, terrain |
| Stability | Sepatu untuk overpronasi | Berat, drop, tingkat dukungan |

Atribut yang disimpan per produk: brand, gender (pria, wanita, unisex), berat (gram), drop (mm), stack height (mm), cushioning (lembut, sedang, keras), support (netral, stability), dan terrain (road, trail). Ukuran tersedia dari EU 39 sampai 45 dan disimpan sebagai varian dengan stok masing-masing.

## 5. Kebutuhan Fungsional

Prioritas: **P0** wajib (MVP), **P1** penting, **P2** nilai tambah.

### 5.1 Autentikasi dan Akun

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| AUTH-01 | Registrasi dengan email dan password (password di-hash) | P0 |
| AUTH-02 | Login dengan access token JWT dan refresh token | P0 |
| AUTH-03 | Otorisasi berbasis peran (customer, admin) | P0 |
| AUTH-04 | Verifikasi email dan reset password | P1 |
| AUTH-05 | Login dengan Google (OAuth) | P2 |
| AUTH-06 | Kelola profil dan beberapa alamat pengiriman | P0 |

### 5.2 Katalog Produk

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| CAT-01 | Daftar produk dengan pagination dan pengurutan (harga, terbaru) | P0 |
| CAT-02 | Pencarian produk berdasarkan nama | P0 |
| CAT-03 | Filter berdasarkan kategori dan rentang harga | P1 |
| CAT-04 | Halaman detail produk dengan gambar, deskripsi, dan stok per ukuran | P0 |
| CAT-05 | Varian ukuran (EU 39-45) dengan stok masing-masing | P0 |
| CAT-06 | Ulasan dan rating setelah pesanan selesai | P2 |
| CAT-07 | Filter berdasarkan spesifikasi sepatu (terrain, cushioning, drop) | P1 |

### 5.3 Keranjang dan Checkout

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| CART-01 | Tambah, ubah jumlah, dan hapus item (per ukuran) di keranjang | P0 |
| CART-02 | Keranjang tersimpan di server untuk pengguna yang login | P0 |
| CART-03 | Validasi stok per ukuran saat checkout | P0 |
| CART-04 | Pilih alamat dan metode pengiriman (tarif simulasi) | P0 |
| CART-05 | Kode voucher atau diskon | P1 |
| CART-06 | Ringkasan pesanan sebelum membayar | P0 |

### 5.4 Pembayaran

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| PAY-01 | Membuat transaksi ke payment gateway dan menampilkan halaman pembayaran | P0 |
| PAY-02 | Menerima webhook notifikasi pembayaran dan memperbarui status pesanan | P0 |
| PAY-03 | Verifikasi keaslian webhook (signature) sebelum diproses | P0 |
| PAY-04 | Idempotency: webhook yang dikirim berulang tidak menimbulkan efek ganda | P0 |
| PAY-05 | Batas waktu pembayaran; pesanan kedaluwarsa dibatalkan otomatis dan stok dikembalikan | P0 |
| PAY-06 | Dukungan beberapa metode pembayaran (virtual account, e-wallet, QRIS) lewat gateway | P1 |
| PAY-07 | Refund atau pembatalan oleh admin | P2 |

### 5.5 Pesanan

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| ORD-01 | Riwayat pesanan dan detail pesanan untuk pembeli | P0 |
| ORD-02 | Status pesanan: menunggu pembayaran, dibayar, diproses, dikirim, selesai, dibatalkan | P0 |
| ORD-03 | Admin memperbarui status dan mengisi nomor resi | P0 |
| ORD-04 | Pembeli dapat membatalkan pesanan yang belum dibayar | P1 |
| ORD-05 | Invoice dalam format PDF | P2 |

### 5.6 Dashboard Admin

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| ADM-01 | CRUD produk, kategori, dan unggah gambar | P0 |
| ADM-02 | Manajemen stok per ukuran dan riwayat perubahan stok | P1 |
| ADM-03 | Daftar dan filter pesanan berdasarkan status dan tanggal | P0 |
| ADM-04 | Ringkasan penjualan (total pendapatan, jumlah pesanan, produk terlaris) dengan grafik | P1 |
| ADM-05 | Ekspor laporan ke CSV | P2 |

### 5.7 Notifikasi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| NOT-01 | Email konfirmasi pesanan dibuat dan pembayaran berhasil | P1 |
| NOT-02 | Email perubahan status pengiriman | P2 |

### 5.8 Fitur Khas Toko Sepatu Running

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| RUN-01 | Tabel spesifikasi sepatu di halaman detail (berat, drop, stack height, cushioning, support, terrain) | P0 |
| RUN-02 | Filter produk berdasarkan spesifikasi (terrain, cushioning, rentang drop) | P1 |
| RUN-03 | Panduan ukuran: konversi EU, UK, US, dan panjang kaki dalam cm | P1 |
| RUN-04 | Perbandingan hingga 3 sepatu dalam kategori yang sama | P2 |
| RUN-05 | Rekomendasi sederhana berdasarkan terrain dan jarak lari, memakai aturan tetap (bukan model AI) | P2 |

## 6. Alur Utama

### 6.1 Alur checkout dan pembayaran

1. Pembeli menekan Checkout. Server memvalidasi isi keranjang dan ketersediaan stok setiap ukuran.
2. Server membuat pesanan berstatus **PENDING\_PAYMENT** dan mengurangi stok varian secara atomik dalam satu transaksi database.
3. Server meminta token atau tautan pembayaran ke payment gateway dengan order ID yang unik.
4. Pembeli diarahkan ke halaman pembayaran gateway dan menyelesaikan pembayaran.
5. Gateway mengirim notifikasi webhook ke endpoint server.
6. Server memverifikasi signature, memastikan notifikasi belum pernah diproses, lalu memperbarui status menjadi **PAID** atau **FAILED/EXPIRED**.
7. Jika kedaluwarsa atau gagal, stok varian dikembalikan otomatis.
8. Pembeli menerima email dan dapat melihat status terbaru di halaman pesanan.

### 6.2 Status pesanan

PENDING\_PAYMENT → PAID → PROCESSING → SHIPPED → COMPLETED

PENDING\_PAYMENT → EXPIRED atau CANCELLED (stok dikembalikan)

Perpindahan status hanya boleh mengikuti alur di atas dan harus divalidasi di sisi server.

## 7. Kebutuhan Non-Fungsional

| Aspek | Target |
| --- | --- |
| Kinerja | Halaman daftar produk dimuat di bawah 2 detik pada koneksi normal; respons API utama di bawah 500 ms |
| Konsistensi data | Operasi stok per varian dan pesanan dalam transaksi database; tidak ada stok negatif atau overselling |
| Keamanan | Lihat bagian 10 |
| Keandalan | Webhook idempotent; ada retry dan logging untuk kegagalan |
| Skalabilitas | Backend stateless sehingga dapat dijalankan lebih dari satu instance; job terjadwal dilindungi advisory lock PostgreSQL agar tidak berjalan dobel |
| Kemudahan pemeliharaan | TypeScript, linting, struktur modular, cakupan test pada logika kritis |
| Responsif | Tampilan nyaman di mobile dan desktop |
| Aksesibilitas | Mengikuti praktik dasar (label form, kontras, navigasi keyboard) |

## 8. Arsitektur dan Tech Stack

### 8.1 Usulan stack

| Lapisan | Teknologi |
| --- | --- |
| Frontend | Next.js (React) + TypeScript + Tailwind CSS |
| Backend | NestJS (Node.js) + TypeScript, REST API |
| Database | PostgreSQL dengan Prisma atau TypeORM |
| Cache dan antrean | Tidak dipakai di v1.0. Job kedaluwarsa dan email memakai query terjadwal di proses API |
| Pembayaran | Midtrans Snap (sandbox) |
| Penyimpanan gambar | Cloudinary atau penyimpanan berbasis S3 |
| Email | Resend, Nodemailer, atau layanan SMTP sandbox |
| DevOps | Docker, Docker Compose, GitHub Actions |
| Deployment | Satu host untuk web dan API agar cookie refresh tetap satu domain: Railway atau Render; VPS sebagai alternatif |
| Dokumentasi dan test | Swagger/OpenAPI, Jest, Supertest, Playwright (opsional) |

### 8.2 Komponen utama

- **Web app (Next.js):** halaman publik, akun pembeli, dan dashboard admin.
- **API server (NestJS):** modul auth, users, products, cart, orders, payments, admin, notifications, dan job terjadwal.
- **Database:** PostgreSQL untuk data dan untuk lock job terjadwal.

## 9. Model Data (Entitas Utama)

| Entitas | Atribut penting |
| --- | --- |
| User | id, name, email, password\_hash, role, created\_at, updated\_at |
| RefreshToken | id, user\_id, token\_hash, expires\_at, revoked\_at, created\_at |
| Address | id, user\_id, recipient, phone, street, city, postal\_code, is\_default |
| Category | id, name, slug |
| Product | id, category\_id, name, slug, brand, gender, description, price, image, weight\_gram, drop\_mm, stack\_mm, cushioning, support, terrain, is\_active |
| ProductVariant | id, product\_id, size\_eu, sku, stock, is\_active |
| Cart / CartItem | id, user\_id; cart\_id, variant\_id, qty |
| Order | id, order\_number, user\_id, address\_snapshot, subtotal, shipping\_cost, discount, total, status, tracking\_number, expires\_at, paid\_at, created\_at |
| OrderItem | id, order\_id, variant\_id, product\_id, name\_snapshot, size\_snapshot, price\_snapshot, qty |
| Payment | id, order\_id, provider, provider\_ref, method, amount, status, raw\_payload, paid\_at |
| WebhookEvent | id, provider, event\_id, payload, processed\_at (untuk idempotency) |
| StockMovement | id, product\_id, variant\_id, change, reason, order\_id, created\_at |

Nama model dan kolom memakai bahasa Inggris; teks yang dilihat pengguna memakai bahasa Indonesia. Tabel Voucher dan Build tidak dibuat karena voucher ditunda (§16) dan PC Builder dihapus.

Catatan desain: nama, ukuran, dan harga produk disalin (snapshot) ke OrderItem agar riwayat pesanan tidak berubah ketika produk diubah. Stok disimpan di varian, bukan di produk. Gunakan indeks pada kolom pencarian dan relasi yang sering diakses.

### 9.1 Ukuran sebagai varian

Sepatu tidak bisa dijual tanpa ukuran, sehingga satu produk punya beberapa varian ukuran dan setiap varian punya stok sendiri.

- **ProductVariant** menyimpan ukuran dan stok, dengan keunikan `(product_id, size_eu)`. Kolom stok tidak ada di Product.
- Keranjang dan OrderItem merujuk `variant_id`; OrderItem menyimpan `size_snapshot` agar riwayat tidak berubah.
- Pengurangan stok memakai satu update atomik: `UPDATE product_variants SET stock = stock - qty WHERE id = $1 AND stock >= qty`. Tidak ada baris yang terpengaruh berarti stok tidak cukup.
- Stok yang ditampilkan di katalog adalah jumlah stok varian yang aktif.
- Spesifikasi sepatu disimpan sebagai kolom tetap, bukan JSONB: atributnya sedikit, seragam, dan langsung bisa di-index untuk filter (CAT-07, RUN-02).

## 10. Keamanan

- Hash password dengan bcrypt atau argon2; jangan simpan password dalam bentuk asli.
- Validasi dan sanitasi semua input (DTO validation); gunakan query terparameter untuk mencegah SQL injection.
- Perlindungan XSS, CSRF, dan pengaturan CORS yang ketat; security header (Helmet).
- Rate limiting pada login, registrasi, dan endpoint publik; endpoint auth dibatasi 10 permintaan per menit per IP.
- Refresh token disimpan sebagai hash, dirotasi setiap pemakaian, dan pemakaian ulang token lama mencabut seluruh sesi pengguna.
- Access token hanya di memori klien; refresh token di cookie httpOnly dengan SameSite, tidak pernah di localStorage.
- Otorisasi di sisi server pada setiap endpoint; pembeli hanya boleh mengakses pesanannya sendiri.
- Verifikasi signature webhook; jangan pernah memercayai status pembayaran dari frontend.
- Hitung total harga di server, bukan dari data yang dikirim klien.
- Simpan kunci API (server key) di environment variable; jangan di-commit ke repositori.
- Tidak menyimpan data kartu; seluruh data pembayaran sensitif ditangani gateway.
- Audit log untuk aksi admin penting.

## 11. Rancangan API (Ringkas)

| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| POST | /auth/register | Registrasi | Publik |
| POST | /auth/login | Login, mengembalikan token | Publik |
| POST | /auth/refresh | Perbarui access token | Publik |
| POST | /auth/logout | Cabut refresh token dan hapus cookie | Customer |
| GET | /users/me | Profil pengguna yang sedang login | Customer |
| GET | /products | Daftar produk (search, filter, pagination) | Publik |
| GET | /products/:slug | Detail produk beserta varian ukuran | Publik |
| GET/POST/PATCH/DELETE | /cart, /cart/items | Kelola keranjang (per ukuran) | Customer |
| POST | /orders/checkout | Membuat pesanan dan transaksi pembayaran | Customer |
| GET | /orders, /orders/:id | Riwayat dan detail pesanan | Customer |
| POST | /orders/:id/cancel | Batalkan pesanan belum dibayar | Customer |
| POST | /payments/webhook | Menerima notifikasi gateway | Gateway (diverifikasi signature) |
| CRUD | /admin/products, /admin/products/:id/variants, /admin/categories | Kelola katalog dan stok per ukuran | Admin |
| GET/PATCH | /admin/orders | Daftar dan ubah status pesanan | Admin |
| GET | /admin/reports/summary | Ringkasan penjualan | Admin |

Seluruh API didokumentasikan dengan Swagger/OpenAPI dan memakai format respons serta kode error yang konsisten.

## 12. Metrik Keberhasilan

Karena ini projek portofolio, keberhasilan diukur dari kualitas teknis dan kesiapan presentasi:

- Alur beli sampai bayar berhasil end-to-end di lingkungan sandbox yang ter-deploy.
- Tidak ada kasus overselling atau status pembayaran ganda pada pengujian konkurensi dan webhook berulang.
- Tiga pengujian wajib lulus: dua checkout bersamaan untuk satu unit stok (satu berhasil, satu gagal tanpa stok minus), webhook dikirim tiga kali (efeknya satu pembayaran), dan checkout setelah `expires_at` (ditolak).
- Skor Lighthouse performa dan aksesibilitas di atas 80 pada halaman utama.
- Repositori memiliki README lengkap, diagram arsitektur, dokumentasi API, dan live demo.
- Dapat didemonstrasikan dan dijelaskan dalam 5 sampai 10 menit saat interview.

## 13. Roadmap Pengerjaan (±8 Minggu)

| Minggu | Fokus | Hasil |
| --- | --- | --- |
| 1 | Setup repositori, Docker Compose, skema database, autentikasi, dan CI | Register, login, role berjalan, pipeline hijau |
| 2 | Katalog produk, varian ukuran, dan dashboard admin untuk produk | CRUD produk dan varian, listing, pencarian, detail, stok per ukuran |
| 3 | Keranjang dan alamat | Keranjang server-side, manajemen alamat |
| 4 | Checkout dan model pesanan | Pembuatan pesanan, validasi dan pengurangan stok transaksional |
| 5 | Integrasi payment gateway | Transaksi sandbox, webhook, verifikasi signature, idempotency |
| 6 | Job kedaluwarsa (query terjadwal), email, manajemen pesanan admin | Auto-cancel, notifikasi, update status |
| 7 | Laporan, voucher, polesan UI, testing | Dashboard ringkasan, test, perbaikan bug |
| 8 | Deployment, dokumentasi, demo | Live demo, README, Swagger, CI/CD, video demo |

Jika waktu terbatas, selesaikan seluruh fitur P0 lebih dahulu, lalu ambil P1 dan P2 sesuai sisa waktu. Fitur P2 (perbandingan sepatu, rekomendasi sederhana, ulasan) dikerjakan paling akhir setelah seluruh P0 dan P1 selesai.

## 14. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Webhook tidak sampai atau terlambat | Status pesanan tidak sinkron | Sediakan pengecekan status ke API gateway secara berkala sebagai cadangan |
| Race condition pada stok | Overselling | Transaksi database dengan row locking atau update atomik |
| Cakupan terlalu besar | Projek tidak selesai | Kunci MVP pada fitur P0 dan tambah fitur secara bertahap |
| Perubahan dokumentasi atau sandbox gateway | Integrasi terganggu | Rujuk dokumentasi resmi terbaru dan isolasi integrasi di balik satu lapisan service |
| Biaya hosting | Demo mati | Pakai free tier dan sediakan video demo cadangan |

## 15. Deliverables

- Repositori GitHub publik (monorepo npm workspaces) dengan riwayat commit yang rapi
- Live demo beserta akun uji coba (customer dan admin) dan panduan kartu atau metode uji sandbox
- README: deskripsi, fitur, screenshot, diagram arsitektur dan ERD, cara menjalankan
- Dokumentasi API (Swagger)
- Docker Compose dan pipeline CI (lint, test, build)
- Video demo singkat 2 sampai 3 menit

## 16. Keputusan

Diputuskan 17 November 2026, berlaku sampai ada revisi tertulis di dokumen ini.

| Keputusan | Isi | Alasan |
| --- | --- | --- |
| Payment gateway | **Midtrans Snap** (sandbox) | Halaman pembayaran siap pakai, dokumentasi Indonesia lengkap, tidak perlu membangun UI pembayaran sendiri |
| Backend | **NestJS** + TypeScript, REST API | REST API terpisah dengan Swagger adalah bagian dari nilai jual portofolio |
| Voucher dan ulasan | **Ditunda** ke v1.1 produk | Tidak ada di jalur P0; menambah tabel, UI, dan test tanpa memperkuat demo |
| Repositori | **Monorepo** npm workspaces | Satu pipeline, satu versi skema, satu riwayat commit |
| Tipe uang | **Integer rupiah** (`Int`) di seluruh skema | Tidak ada pembulatan; nilai dari gateway dikonversi di batas integrasi |
| Stok | **Dipotong langsung** secara atomik saat checkout, dikembalikan saat kedaluwarsa | Satu `UPDATE ... WHERE stok >= qty` lebih murah dan lebih aman daripada reservasi terpisah |

Yang sengaja tidak dipilih: Laravel (backend terpisah sudah sesuai stack tujuan), reservasi stok dengan Redis lock (kompleksitas tanpa manfaat untuk volume demo), dan spesifikasi JSONB dinamis (atribut sepatu seragam, kolom tetap lebih murah).

## Riwayat versi

- v1.1 (17 November 2026): tema produk diganti menjadi sepatu running; ukuran menjadi varian P0 dengan stok sendiri; fitur PC Builder dan pemeriksaan kompatibilitas dihapus; spesifikasi dinamis (JSONB + CategoryAttribute) diganti kolom tetap; gateway, backend, tipe uang, dan model stok dikunci di bagian 16.
- v1.2 (17 November 2026): dokumen diselaraskan dengan bagian 16 — Redis, BullMQ, dan worker dihapus (job terjadwal memakai query + advisory lock); entitas RefreshToken dan endpoint logout serta /users/me ditambahkan; nama entitas dan kolom memakai bahasa Inggris; tabel Voucher dihapus; metrik coverage diganti tiga pengujian konkurensi; CI pindah ke minggu 1; monorepo npm workspaces.
