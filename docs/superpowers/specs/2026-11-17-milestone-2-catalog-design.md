# Milestone 2 — Katalog Produk dan CRUD Admin (Design)

Tanggal: 17 November 2026 · Status: disetujui
Spec: `PRD Platform E-commerce dan Sistem Pembayaran.md` §5.2, §9.1, §11
Pendahulu: `docs/superpowers/plans/2026-11-17-milestone-1-foundation-auth.md`

## 1. Intent

Milestone 1 selesai: auth, guard peran, skema P0, seed user/kategori, CI hijau lokal (28 test).
Milestone ini membuat katalog yang bisa dibaca publik dan dikelola admin, sehingga milestone
keranjang punya data nyata untuk dipakai dan milestone storefront punya API stabil untuk
dikonsumsi.

Kenapa API dulu: storefront belum ada satu halaman pun. Membangun UI di atas API yang masih
bergerak berarti menggambar ulang halaman setiap kali bentuk respons berubah. API + test selesai
dulu, storefront jadi milestone terpisah yang hanya mengonsumsi kontrak di bawah.

## 2. Goals

- `GET /products`: daftar produk aktif dengan pencarian nama, pengurutan, pagination.
- `GET /products/:slug`: detail produk beserta stok per ukuran.
- CRUD admin untuk produk, kategori, dan varian ukuran, dijaga `JwtAuthGuard` + `RolesGuard`.
- Seed 24–32 produk dummy lengkap dengan 7 varian ukuran (EU 39–45) dan stok bervariasi.
- Validasi harga > 0 dan stok >= 0 (utang dari Milestone 1) terbukti lewat test.

## 3. Non-goals (milestone ini)

- Filter kategori/harga dan filter spesifikasi (CAT-03, CAT-07, RUN-02) — roadmap minggu 7.
- Unggah gambar. `image` menerima URL string; storage (Cloudinary) masuk milestone deployment.
  Alasan: kredensial storage belum ada dan disk lokal ephemeral saat deploy.
- Riwayat perubahan stok (ADM-02) — `StockMovement` baru ditulis saat checkout.
- Ulasan, perbandingan, panduan ukuran (P1/P2), Swagger, frontend Next.js.
- Endpoint publik `/categories` — belum ada konsumen; tambah saat storefront membutuhkannya.

## 4. Keputusan (approaches)

| Keputusan | Pilihan | Alternatif yang dibuang | Alasan |
| --- | --- | --- | --- |
| Urutan milestone | API katalog dulu | Storefront dulu; admin UI dulu | API stabil dulu, UI sekali jadi |
| Gambar | URL string di kolom `image` | Upload disk lokal; Cloudinary sekarang | Nol dependensi/kredensial; tahan redeploy |
| Filter P1 | Ditunda | Ikut sekarang | PRD menaruh di minggu 7; menambah query + test tanpa konsumen |
| Hapus produk/varian | Soft delete (`isActive = false`) | Hard delete | `OrderItem` merujuk varian; hard delete merusak riwayat pesanan |
| Slug | Dibuat dari nama saat create, **tidak** berubah saat rename | Slug ikut nama | URL yang sudah dibagikan tetap hidup |
| SKU | Opsional; default `<slug-produk>-<ukuran>` | Wajib diisi admin | Satu field lebih sedikit; bentrok mustahil karena slug unik |
| Pagination | `page` + `limit` (default 12, maks 48) | Cursor | Sederhana, cocok untuk grid katalog dan `total` untuk UI halaman |
| Modul | `catalog` (baca publik) + `admin` (tulis) | Satu modul campur | Route admin terkumpul di satu tempat, guard satu titik |

## 5. Kontrak API

Semua error memakai bentuk bawaan NestJS `{ statusCode, message, error }`. Kolom respons memakai
nama Prisma apa adanya (`weightGram`, `sizeEu`). Nilai uang `Int` rupiah.

### 5.1 Publik

```
GET /products?search=&sort=newest|price_asc|price_desc&page=1&limit=12
200 {
  items: [{
    id, name, slug, brand, gender, price, image,
    category: { name, slug },
    stockTotal            // jumlah stok varian aktif
  }],
  page, limit, total, totalPages
}
```
- Hanya `isActive = true`; urutan default `newest` (`createdAt desc`).
- Setiap urutan diakhiri kolom `id` sebagai penentu kedua, agar halaman tidak menggeser item
  saat `createdAt` atau `price` sama.
- `search`: substring nama, tidak peka huruf besar/kecil; kosong = tanpa filter. Karakter `%`
  dan `_` di-escape sebelum masuk `contains`, supaya dicari sebagai huruf biasa.
- `limit` di luar 1..48 atau `page` < 1 → 400. `page` melewati total → `items: []`, 200.

```
GET /products/:slug
200 { id, name, slug, brand, gender, description, price, image,
      weightGram, dropMm, stackMm, cushioning, support, terrain,
      category: { id, name, slug },
      variants: [{ id, sizeEu, sku, stock }]   // aktif saja, urut sizeEu
404 bila tidak ada atau nonaktif
```

### 5.2 Admin (`@Roles(ADMIN)` di seluruh controller)

```
GET    /admin/products?page&limit&search&includeInactive
       → bentuk sama dengan daftar publik + isActive; includeInactive default false
GET    /admin/products/:id        → bentuk detail publik + isActive, dan SEMUA varian
                                    (termasuk nonaktif) dengan isActive-nya
POST   /admin/products            { categoryId, name, brand, gender, description, price, image?,
                                    weightGram?, dropMm?, stackMm?, cushioning?, support?, terrain? }
                                  201 → bentuk yang sama dengan GET /admin/products/:id
PATCH  /admin/products/:id        semua field create opsional + isActive?; slug tidak berubah
DELETE /admin/products/:id        204, isActive = false (bisa dihidangkan lagi lewat PATCH)
POST   /admin/products/:id/variants  { sizeEu, stock, sku? }  201
PATCH  /admin/variants/:id        { sizeEu?, sku?, stock?, isActive? }
DELETE /admin/variants/:id        204, isActive = false
GET    /admin/categories          200 → daftar + jumlah produk (termasuk yang nonaktif)
POST   /admin/categories          { name } → slug dibuat otomatis
PATCH  /admin/categories/:id      { name } → slug tetap
DELETE /admin/categories/:id      204; 409 bila masih punya produk, aktif atau tidak
```

Admin butuh `GET /admin/products/:id` karena daftar publik menyembunyikan varian nonaktif dan
produk nonaktif; tanpa endpoint ini produk yang dihapus tidak bisa dihidupkan lagi dan varian
nonaktif tidak bisa ditemukan id-nya. Produk bisa dipindah kategori lewat `categoryId` di PATCH,
sehingga kategori yang seluruh produknya nonaktif masih bisa dikosongkan lalu dihapus.

Aturan validasi:

| Field | Aturan |
| --- | --- |
| `name` | 1..120 karakter |
| `price` | `Int`, >= 1, <= 2_000_000_000 |
| `stock` | `Int`, >= 0 |
| `sizeEu` | `Int`, 39..45 |
| `gender` | `pria` \| `wanita` \| `unisex` |
| `cushioning` | `lembut` \| `sedang` \| `keras` |
| `support` | `netral` \| `stability` |
| `terrain` | `road` \| `trail` |
| `image` | URL http(s) atau null |
| angka di query | `@Type(() => Number)`, karena `transform: true` tanpa implicit conversion |

Slug: `name.trim().toLowerCase()`, non-alfanumerik → `-`, lalu `-2`, `-3`, … bila sudah dipakai.
SKU default: `<slug>-<sizeEu>`, hanya saat create. SKU tidak ditulis ulang bila `sizeEu` atau
nama berubah; SKU adalah identitas yang dipakai admin, bukan turunan nama.
Bentrok `(productId, sizeEu)` atau `sku` → 409. Kategori tidak dikenal → 400.

## 6. Struktur kode

```
apps/api/src/catalog/catalog.module.ts
apps/api/src/catalog/products.controller.ts      # publik
apps/api/src/catalog/products.service.ts         # bentuk respons, stockTotal, pagination
apps/api/src/catalog/dto/list-products.dto.ts
apps/api/src/catalog/slug.ts                     # slugify + SKU default
apps/api/src/admin/admin.module.ts
apps/api/src/admin/admin-products.controller.ts
apps/api/src/admin/admin-variants.controller.ts
apps/api/src/admin/admin-categories.controller.ts
apps/api/src/admin/admin-catalog.service.ts
apps/api/src/admin/dto/*.dto.ts
apps/api/prisma/seed.ts                          # + 24–32 produk
```

`AppModule` mengimpor `CatalogModule` dan `AdminModule`. Tidak ada dependensi npm baru.

## 7. Seed

- 24–32 produk, tersebar di 4 kategori yang sudah ada, tiap produk 7 varian EU 39–45.
- Harga 600.000–3.300.000; stok 0–12 dengan beberapa varian sengaja 0 dan satu produk seluruhnya
  habis, agar tampilan "stok habis" bisa diuji nanti.
- Idempoten lewat `upsert` per `slug`; menjalankan dua kali tidak menggandakan produk/varian.
- Gambar: URL `images.unsplash.com` (lisensi bebas); setiap URL diperiksa sekali saat implementasi.
  Bila sebuah URL mati, ganti — jangan biarkan gambar rusak di seed.

## 8. Test (e2e, database nyata)

`test/catalog-list.e2e-spec.ts`
- default: hanya produk aktif, 12 per halaman, urut terbaru
- `search` substring tidak peka huruf besar/kecil; `search=` kosong sama dengan tanpa filter
- `sort=price_asc` dan `price_desc` benar
- `limit=100` → 400; `page=0` → 400; `page` jauh melewati total → 200 dengan `items: []`
- `stockTotal` = jumlah stok varian aktif

`test/catalog-detail.e2e-spec.ts`
- detail memuat varian aktif urut `sizeEu`, tanpa varian nonaktif
- slug tidak dikenal dan produk nonaktif → 404

`test/admin-products.e2e-spec.ts`
- tanpa token → 401; token customer → 403
- create sukses dan responsnya sama bentuk dengan `GET /admin/products/:id` (`variants: []`)
- slug bentrok jadi `-2`; `price: 0` → 400; field tak dikenal → 400
- rename tidak mengubah slug
- delete → 204, hilang dari daftar publik, baris masih ada dengan `isActive = false`
- PATCH `isActive: true` menghidupkan kembali produk yang dihapus
- `GET /admin/products/:id` memuat varian nonaktif; `GET /products/:slug` tidak
- `categoryId` tidak dikenal → 400

`test/admin-variants.e2e-spec.ts`
- create varian sukses dengan SKU default; ukuran sama dua kali → 409
- `stock: -1` → 400; `sizeEu: 50` → 400
- delete varian yang dirujuk `CartItem`/`OrderItem` → 204 tanpa error FK

`test/admin-categories.e2e-spec.ts`
- create dengan slug otomatis; nama sama → 409
- delete kategori yang masih punya produk → 409, termasuk bila produknya nonaktif
- kategori yang produknya sudah dipindah/dihapus permanen → 204

`test/seed.e2e-spec.ts` (ditambah)
- jumlah produk 24–32; tiap produk 7 varian; dijalankan dua kali tetap sama

Test tetap memakai pola yang sudah ada: `resetDb()` di `beforeEach` mengosongkan semua tabel, lalu
setiap spec membuat fixture-nya sendiri (produk dengan slug `test-…`), berjalan `--runInBand`.
Seed tidak dijalankan sebelum suite katalog dan CI tidak butuh langkah seed; test katalog butuh
>12 produk fixture untuk kasus pagination. Test idempotensi seed ada di `seed.e2e-spec.ts` dan
memanggil `seedDatabase` sendiri setelah `resetDb`.

## 9. Kasus yang mudah menggigit

1. **`limit` atau `page` bukan angka** (`?page=abc`) — harus 400 dari validasi, bukan 500 Prisma.
2. **Produk tanpa varian aktif** — tetap tampil dengan `stockTotal: 0`, bukan hilang atau error.
3. **Produk nonaktif diakses lewat slug** — 404, bukan 200 (jangan bocorkan produk yang ditarik).
4. **Hapus varian yang sudah ada di keranjang/pesanan** — soft delete, bukan error FK.
5. **Nama produk sama** — dua produk boleh bernama sama, slug kedua diberi akhiran; jangan 500.
6. **Pencarian dengan karakter `%` atau `_`** — tidak boleh jadi error atau mencocokkan semua.
7. **Angka di query datang sebagai string** — DTO wajib `@Type(() => Number)`, kalau tidak
   `@Min` tidak pernah jalan.
8. **Harga di atas batas `Int` Postgres** — ditolak 400 di DTO, bukan P2000/500 saat insert.

## 10. Selesai bila

- Semua test lama tetap hijau, test baru hijau, `lint` dan `build` bersih.
- `npm run test:e2e` bisa dijalankan berulang tanpa gagal karena sisa data run sebelumnya.
- Seed idempoten dan `GET /products` menampilkan 24–32 produk nyata.
- Setiap task berakhir satu commit dan CI lokal (lint, unit, e2e, build) hijau.

## 11. Yang diserahkan ke pelaksana

- Nama, brand, dan pasangan gambar produk untuk seed; harga dan stok per varian dalam rentang §7.
- Apakah `GET /admin/products` menyertakan produk nonaktif secara default (disarankan: tidak).
- Detail kecil bentuk pesan error berbahasa Indonesia.
