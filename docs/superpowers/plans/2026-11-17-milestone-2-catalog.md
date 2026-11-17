# Milestone 2 — Katalog dan CRUD Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Katalog yang bisa dibaca publik (daftar, pencarian, urutan, pagination, detail per ukuran) dan dikelola admin (produk, varian, kategori), dengan seed 24–32 produk nyata.

**Architecture:** Dua modul NestJS baru di atas skema Prisma yang sudah ada: `catalog` untuk baca publik dan `admin` untuk tulis. Keduanya memakai `PrismaService`, `JwtAuthGuard`, dan `RolesGuard` dari Milestone 1; tidak ada tabel atau dependensi baru. Test e2e memakai database nyata dengan pola `resetDb()` yang sudah ada.

**Tech Stack:** NestJS 11, Prisma 6, PostgreSQL 17, class-validator/class-transformer, Jest + Supertest.

**Spec:** `docs/superpowers/specs/2026-11-17-milestone-2-catalog-design.md`

## Global Constraints

- Model dan kolom Prisma berbahasa Inggris; pesan error yang dilihat admin/pembeli berbahasa Indonesia.
- Harga `Int` rupiah penuh, >= 1, <= 2_000_000_000. Stok `Int` >= 0. Tidak ada `Float`/`Decimal`.
- Stok hanya di `ProductVariant`; `stockTotal` dihitung dari varian aktif.
- Error memakai bentuk bawaan NestJS `{ statusCode, message, error }`. Jangan membuat amplop sendiri.
- Tidak menambah dependensi npm. `PartialType` dari `@nestjs/mapped-types` **tidak** tersedia — tulis DTO update secara eksplisit.
- Query angka wajib `@Type(() => Number)`; `transform: true` tidak melakukan konversi implisit.
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` sudah global di `AppModule`; field liar otomatis 400.
- Test e2e memakai `resetDb()` di `beforeEach`, membuat fixture sendiri, dan berjalan `--runInBand`.
- Setiap task berakhir satu commit dengan `npm run lint --workspace apps/api` dan test terkait hijau.

## Review Focus

1. **Produk atau varian nonaktif** — harus hilang dari `GET /products` dan `GET /products/:slug` (404 untuk produk), tapi tetap terlihat dan bisa dihidupkan lewat `/admin`.
2. **Query rusak** (`?page=abc`, `?limit=1000`, `?sort=ngawur`) — 400 dengan bentuk error Nest, bukan 500 atau error Prisma.
3. **Hapus varian yang sudah dipakai `CartItem`/`OrderItem`** — 204 tanpa error FK; barisnya tetap ada dengan `isActive = false`.
4. **Nama produk kembar atau berkarakter aneh** (emoji, spasi ganda, huruf besar) — slug tetap unik dan URL-nya bisa diakses.
5. **Pencarian berisi `%` atau `_`** — dicari sebagai huruf biasa, bukan wildcard yang mencocokkan semua produk.

---

### Task 1: API baca publik — daftar dan detail produk

**Files:**
- Create: `apps/api/src/catalog/catalog.module.ts`
- Create: `apps/api/src/catalog/products.controller.ts`
- Create: `apps/api/src/catalog/products.service.ts`
- Create: `apps/api/src/catalog/dto/list-products.dto.ts`
- Modify: `apps/api/src/app.module.ts` (impor `CatalogModule`)
- Create: `apps/api/test/catalog-fixtures.ts`
- Test: `apps/api/test/catalog-list.e2e-spec.ts`, `apps/api/test/catalog-detail.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (Milestone 1), `Product`, `ProductVariant`, `Category` dari Prisma.
- Produces:
  - `type ProductListItem = { id: string; name: string; slug: string; brand: string; gender: string; price: number; image: string | null; category: { name: string; slug: string }; stockTotal: number }`
  - `type ProductDetail = { id: string; name: string; slug: string; brand: string; gender: string; description: string; price: number; image: string | null; weightGram: number | null; dropMm: number | null; stackMm: number | null; cushioning: string | null; support: string | null; terrain: string | null; category: { id: string; name: string; slug: string }; variants: { id: string; sizeEu: number; sku: string; stock: number }[] }`
  - `ProductsService.list(query: ListProductsDto): Promise<{ items: ProductListItem[]; page: number; limit: number; total: number; totalPages: number }>`
  - `ProductsService.findBySlug(slug: string): Promise<ProductDetail>` (lempar `NotFoundException('Produk tidak ditemukan')`)
  - Test helper `makeCategory(prisma, name?)`, `makeProduct(prisma, overrides?)`, `makeVariant(prisma, productId, sizeEu?, stock?)` di `test/catalog-fixtures.ts`.

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/test/catalog-list.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './create-app';
import { makeProduct, makeVariant } from './catalog-fixtures';
import { resetDb } from './reset-db';

const prisma = new PrismaClient();
let app: INestApplication;

beforeEach(async () => {
  app = await createTestApp();
  await resetDb(prisma);
});
afterEach(async () => { await app.close(); });
afterAll(async () => { await prisma.$disconnect(); });

const get = (query: string) => request(app.getHttpServer()).get(`/products${query}`);
```

- `default: 12 per halaman, hanya aktif, urut terbaru` — buat 13 produk aktif (`createdAt` naik 1 menit tiap produk) + 1 nonaktif; `get('')` → 200, `items.length === 12`, `total === 13`, `items[0]` adalah produk terbaru, `items` tidak memuat slug nonaktif.
- `halaman kedua` — `get('?page=2')` → 1 item, `totalPages === 2`.
- `pencarian tidak peka huruf besar dan bisa sebagian` — produk bernama `Test Pegasus 41`; `get('?search=pegasus')` → 1 item; `get('?search=PEGASUS')` → 1 item.
- `search kosong sama dengan tanpa filter` — `get('?search=')` → `total` sama dengan `get('')`.
- `% dan _ dicari sebagai huruf biasa` — produk `Test 100% Cushion` dan `Test Biasa`; `get('?search=100%25')` (URL-encoded `%`) → hanya yang pertama. Ulangi dengan `_`: produk `Test A_B` vs `Test AXB`, `search=A_B` → hanya `Test A_B`.
- `sort=price_asc dan price_desc` — tiga produk harga 300000/100000/200000; periksa urutan `items.map(p => p.price)`.
- `limit=100 → 400, page=0 → 400, page=abc → 400, sort=ngawur → 400`
- `page jauh melewati total → 200 dengan items kosong`
- `stockTotal hanya menjumlah varian aktif` — satu varian 5, satu varian nonaktif 7 → `stockTotal === 5`; produk tanpa varian → `0`.

`apps/api/test/catalog-detail.e2e-spec.ts`:

- `detail memuat varian aktif urut sizeEu` — varian 42, 40, 39 aktif + 41 nonaktif; `sizeEu` hasil `[39, 40, 42]`.
- `detail memuat spesifikasi dan kategori` — `weightGram`, `dropMm`, `terrain`, `category.slug` sama dengan fixture.
- `slug tidak dikenal → 404` dan `produk nonaktif → 404`, body `statusCode === 404`.

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:e2e --workspace apps/api -- catalog-list catalog-detail`
Expected: FAIL 404 pada `GET /products` dan `Cannot find module './catalog-fixtures'`.

- [ ] **Step 3: Buat fixture helper dan implementasi**

`test/catalog-fixtures.ts` — `makeProduct` membuat kategori `test-cat` lewat `upsert` bila `categoryId` tidak diberikan, dan memakai slug `test-${randomUUID()}` (`randomUUID` dari `node:crypto`) agar tidak bentrok. `makeVariant` memakai `sku: `${productId}-${sizeEu}``.

`list-products.dto.ts`:

```ts
export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export class ListProductsDto {
  @IsOptional() @IsString() @Length(0, 120) search?: string;
  @IsOptional() @IsIn(PRODUCT_SORTS) sort: ProductSort = 'newest';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(48) limit = 12;
}
```

`products.service.ts`:
- `escapeLike(value)` mengganti `\` → `\\`, `%` → `\%`, `_` → `\_` (Postgres LIKE/ILIKE memakai backslash sebagai escape).
- `where = { isActive: true }` plus `name: { contains: escapeLike(search.trim()), mode: 'insensitive' }` bila `search` tidak kosong.
- `orderBy` per sort, selalu diakhiri `{ id: 'asc' }`.
- Satu query `findMany` dengan `select` (tanpa `description`/spesifikasi) + `variants: { where: { isActive: true }, select: { stock: true } }`, dan `count` untuk `total`. `stockTotal` dijumlah di JS. `totalPages = Math.ceil(total / limit)` (0 bila `total` 0).
- `findBySlug` memakai `findFirst({ where: { slug, isActive: true } })` dengan `variants: { where: { isActive: true }, orderBy: { sizeEu: 'asc' } }`.

`products.controller.ts` — `@Controller('products')`, `@Get()` → `list(@Query() query: ListProductsDto)`, `@Get(':slug')` → `findBySlug(@Param('slug') slug: string)`.

`catalog.module.ts` — mendeklarasikan controller + service. `AppModule` menambahkan `CatalogModule` ke `imports`.

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test:e2e --workspace apps/api -- catalog-list catalog-detail`
Expected: PASS semua, termasuk 4 kasus query rusak dan test `%`/`_`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/catalog apps/api/src/app.module.ts apps/api/test/catalog-fixtures.ts apps/api/test/catalog-list.e2e-spec.ts apps/api/test/catalog-detail.e2e-spec.ts
git commit -m "feat(catalog): public product list and detail"
```

---

### Task 2: CRUD admin produk dengan slug dan soft delete

**Files:**
- Create: `apps/api/src/catalog/slug.ts`
- Create: `apps/api/src/admin/admin.module.ts`
- Create: `apps/api/src/admin/admin-products.controller.ts`
- Create: `apps/api/src/admin/admin-catalog.service.ts`
- Create: `apps/api/src/admin/dto/create-product.dto.ts`
- Create: `apps/api/src/admin/dto/update-product.dto.ts`
- Create: `apps/api/src/admin/dto/list-admin-products.dto.ts`
- Modify: `apps/api/src/app.module.ts` (impor `AdminModule`)
- Create: `apps/api/test/auth-helpers.ts`
- Test: `apps/api/test/admin-products.e2e-spec.ts`

**Interfaces:**
- Consumes: `ProductsService` tidak dipakai ulang — admin punya bentuk respons sendiri; `JwtAuthGuard`, `RolesGuard`, `@Roles(Role.ADMIN)`; `makeCategory`/`makeProduct` dari Task 1.
- Produces:
  - `slugify(name: string): string` dan `uniqueSlug(prisma: PrismaClient | PrismaService, name: string): Promise<string>` di `catalog/slug.ts` (akhiran `-2`, `-3`, …).
  - `type AdminProduct = Omit<ProductDetail, 'variants'> & { isActive: boolean; variants: (ProductDetail['variants'][number] & { isActive: boolean })[] }` di `admin/admin-catalog.service.ts`.
  - `AdminCatalogService.createProduct(dto: CreateProductDto): Promise<AdminProduct>`
  - `AdminCatalogService.updateProduct(id: string, dto: UpdateProductDto): Promise<AdminProduct>`
  - `AdminCatalogService.softDeleteProduct(id: string): Promise<void>`
  - `AdminCatalogService.findOne(id: string): Promise<AdminProduct>` (404 `'Produk tidak ditemukan'`)
  - `AdminCatalogService.listProducts(query: ListAdminProductsDto): Promise<{ items: (ProductListItem & { isActive: boolean })[]; page: number; limit: number; total: number; totalPages: number }>`
  - Test helper `adminToken(app)`, `customerToken(app)` di `test/auth-helpers.ts` — membuat user langsung lewat `prisma.user.create` lalu menandatangani token dengan `app.get(JwtService).sign({ sub, role })`, supaya tidak menyentuh throttler `/auth`.

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/test/admin-products.e2e-spec.ts` (pola `createTestApp` + `resetDb` seperti Task 1, plus `const auth = () => adminToken(app)`):

- `tanpa token → 401` pada `GET /admin/products`; `token customer → 403`.
- `create sukses dan bentuknya sama dengan detail admin` — POST body `{ categoryId, name: 'Test Produk Uji', brand: 'Test', gender: 'unisex', description: 'Deskripsi', price: 899000, weightGram: 250, dropMm: 8, stackMm: 32, cushioning: 'sedang', support: 'netral', terrain: 'road' }` → 201, `slug === 'test-produk-uji'`, `variants` = `[]`; `GET /admin/products/:id` → body `toEqual` body create.
- `nama sama menghasilkan slug -2` — POST dua kali nama sama → `test-produk-uji` lalu `test-produk-uji-2`, keduanya 201.
- `nama berkarakter aneh menghasilkan slug bersih` — nama `'  Sepatu  Trail 🏃  '` → slug `sepatu-trail`, dan `GET /products/sepatu-trail` → 200.
- `harga 0 ditolak 400`, `field tak dikenal ditolak 400` (kirim `{ ...payload, role: 'ADMIN' }`), `categoryId asing → 400`.
- `rename tidak mengubah slug` — PATCH `{ name: 'Nama Baru' }` → `name` berubah, `slug` lama.
- `delete menyembunyikan dari publik tapi menyisakan baris` — DELETE → 204; `GET /products` tidak memuatnya; `GET /products/:slug` → 404; `prisma.product.findUnique` → `isActive === false`.
- `PATCH isActive true menghidupkan lagi` — setelah delete, PATCH `{ isActive: true }` → 200 dan produk muncul lagi di `GET /products`.
- `GET /admin/products/:id menampilkan varian nonaktif, detail publik tidak` — buat varian aktif + nonaktif lewat prisma; admin detail memuat keduanya, `/products/:slug` hanya yang aktif.
- `includeInactive` — `GET /admin/products` default tidak memuat produk nonaktif; `?includeInactive=true` memuatnya.
- `page=abc → 400`.

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:e2e --workspace apps/api -- admin-products`
Expected: FAIL 404 pada semua route `/admin/products`.

- [ ] **Step 3: Implementasi**

`slugify`: `name.trim().toLowerCase()`, ganti rangkaian non `[a-z0-9]` dengan `-`, pangkas `-` di ujung; hasil kosong → `'produk'`. `uniqueSlug`: ambil slug dasar, lalu `findUnique` berulang menambahkan `-2`, `-3` sampai kosong.

DTO create memakai aturan spec §5.2: `name` 1..120, `brand` 1..80, `description` 1..5000, `price` `@IsInt @Min(1) @Max(2_000_000_000)`, `gender` `@IsIn(['pria','wanita','unisex'])`, `categoryId` `@IsString @IsNotEmpty`, `image` `@IsOptional @IsUrl({ protocols: ['http','https'], require_protocol: true })`, `weightGram/dropMm/stackMm` `@IsOptional @IsInt @Min(0)`, `cushioning/support/terrain` `@IsOptional @IsIn([...])`. DTO update menulis ulang semua field itu sebagai `@IsOptional()` **plus** `isActive?: boolean`; jangan memakai `PartialType`.

Service:
- `createProduct`: pastikan kategori ada (`count` → 0 = `BadRequestException('Kategori tidak dikenal')`), slug dari `uniqueSlug`, `create` dengan `select` detail admin, tangkap `P2002` → `ConflictException`.
- `updateProduct`: `findOne` dulu (404), update field yang ada saja, tanpa menyentuh `slug`. Ubah `categoryId` → validasi seperti create.
- `softDeleteProduct`: `update({ where: { id }, data: { isActive: false } })`, 404 bila tidak ada.
- `findOne`: `findUnique` dengan `variants` (semua, `orderBy: sizeEu asc`), lempar 404 bila null.
- `listProducts`: `where.isActive = false` hanya bila `includeInactive` tidak true; sort/pagination sama seperti Task 1; `stockTotal` dari varian aktif. `ListAdminProductsDto` menambahkan `@Transform(({ value }) => value === true || value === 'true') @IsBoolean() includeInactive = false` — query tiba sebagai string.

Controller `@Controller('admin/products')` dengan `@UseGuards(JwtAuthGuard, RolesGuard)` dan `@Roles(Role.ADMIN)` di kelas; route `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` (`@HttpCode(204)`).

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test:e2e --workspace apps/api -- admin-products`
Expected: PASS semua.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/catalog/slug.ts apps/api/src/admin apps/api/src/app.module.ts apps/api/test/auth-helpers.ts apps/api/test/admin-products.e2e-spec.ts
git commit -m "feat(admin): product crud with unique slugs and soft delete"
```

---

### Task 3: CRUD varian ukuran dan stok

**Files:**
- Create: `apps/api/src/admin/admin-variants.controller.ts`
- Create: `apps/api/src/admin/dto/create-variant.dto.ts`
- Create: `apps/api/src/admin/dto/update-variant.dto.ts`
- Modify: `apps/api/src/admin/admin.module.ts`
- Modify: `apps/api/src/admin/admin-catalog.service.ts`
- Test: `apps/api/test/admin-variants.e2e-spec.ts`

**Interfaces:**
- Consumes: `AdminCatalogService`, `makeProduct`, `adminToken`.
- Produces:
  - `AdminCatalogService.createVariant(productId: string, dto: CreateVariantDto): Promise<{ id: string; sizeEu: number; sku: string; stock: number; isActive: boolean }>`
  - `AdminCatalogService.updateVariant(id: string, dto: UpdateVariantDto): Promise<same as above>`
  - `AdminCatalogService.softDeleteVariant(id: string): Promise<void>`

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/test/admin-variants.e2e-spec.ts`:

- `POST /admin/products/:id/variants` `{ sizeEu: 42, stock: 3 }` → 201, `sku === '<slug-produk>-42'`.
- ukuran sama dua kali → 409; `sku` eksplisit yang sudah dipakai produk lain → 409.
- `stock: -1` → 400; `sizeEu: 50` → 400; `sizeEu: 38` → 400; field tak dikenal → 400.
- `PATCH /admin/variants/:id` `{ stock: 9 }` → 200; `GET /products/:slug` menampilkan stok 9.
- `PATCH` `{ sizeEu: 43 }` → 200 dan `sku` tidak berubah.
- `DELETE /admin/variants/:id` → 204; hilang dari detail publik; `GET /admin/products/:id` menampilkan varian itu dengan `isActive: false`.
- `delete varian yang dipakai CartItem → 204` — buat `Cart` + `CartItem` lewat prisma untuk varian itu, lalu DELETE → 204 tanpa error FK.
- `POST varian untuk produk tak dikenal → 404`; `PATCH varian tak dikenal → 404`.

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:e2e --workspace apps/api -- admin-variants`
Expected: FAIL 404.

- [ ] **Step 3: Implementasi**

DTO: `sizeEu` `@IsInt @Min(39) @Max(45)`, `stock` `@IsInt @Min(0)`, `sku` `@IsOptional @IsString @Length(1, 64)`; update menambahkan `isActive?: boolean`, semua opsional.

Service: `createVariant` memastikan produk ada (404), memakai `sku ?? `${product.slug}-${dto.sizeEu}``, tangkap `P2002` → `ConflictException('Ukuran atau SKU sudah dipakai')`. `updateVariant` cek existence dulu. `softDeleteVariant` set `isActive = false`.

Controller `@Controller('admin')` dengan guard + `@Roles(Role.ADMIN)` di kelas: `@Post('products/:id/variants')`, `@Patch('variants/:id')`, `@Delete('variants/:id')` (`@HttpCode(204)`). Daftarkan di `AdminModule`.

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test:e2e --workspace apps/api -- admin-variants`
Expected: PASS semua.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/admin apps/api/test/admin-variants.e2e-spec.ts
git commit -m "feat(admin): variant crud for stock per size"
```

---

### Task 4: CRUD kategori admin

**Files:**
- Create: `apps/api/src/admin/admin-categories.controller.ts`
- Create: `apps/api/src/admin/dto/category.dto.ts`
- Modify: `apps/api/src/admin/admin.module.ts`
- Modify: `apps/api/src/admin/admin-catalog.service.ts`
- Test: `apps/api/test/admin-categories.e2e-spec.ts`

**Interfaces:**
- Consumes: `slugify`, `uniqueSlug`, `adminToken`, `makeProduct`.
- Produces:
  - `AdminCatalogService.listCategories(): Promise<{ id: string; name: string; slug: string; productCount: number }[]>` (`productCount` menghitung semua produk, aktif maupun tidak)
  - `AdminCatalogService.createCategory(name: string): Promise<{ id, name, slug }>`
  - `AdminCatalogService.updateCategory(id: string, name: string): Promise<{ id, name, slug }>`
  - `AdminCatalogService.deleteCategory(id: string): Promise<void>` (409 `'Kategori masih punya produk'`)

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/test/admin-categories.e2e-spec.ts`:

- `create` `{ name: 'Trail Sepatu' }` → 201, `slug === 'trail-sepatu'`; nama sama → 409.
- `PATCH` `{ name: 'Nama Baru' }` → 200, `slug` tetap `trail-sepatu`.
- `GET /admin/categories` memuat `productCount`; kategori dengan 1 produk aktif + 1 produk nonaktif → `productCount === 2`.
- `DELETE` kategori yang masih punya produk (nonaktif sekalipun) → 409.
- `DELETE` sukses 204 setelah produk dipindah ke kategori lain lewat `PATCH /admin/products/:id`.
- tanpa token → 401; customer → 403.

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:e2e --workspace apps/api -- admin-categories`
Expected: FAIL 404.

- [ ] **Step 3: Implementasi**

`category.dto.ts` — `CategoryNameDto { @IsString() @Length(1, 60) name: string }`.

Service: `createCategory` memakai `slugify` + `uniqueSlug`; `P2002` → `ConflictException('Kategori sudah ada')`. `updateCategory` hanya mengubah `name`. `deleteCategory` memakai `product.count({ where: { categoryId: id } })` → `ConflictException` bila > 0, lalu `delete`. `listCategories` memakai `_count: { select: { products: true } }` dan memetakan ke `productCount`.

Controller `@Controller('admin/categories')` dengan guard + `@Roles(Role.ADMIN)`: `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` (`@HttpCode(204)`).

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test:e2e --workspace apps/api -- admin-categories`
Expected: PASS semua.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/admin apps/api/test/admin-categories.e2e-spec.ts
git commit -m "feat(admin): category crud"
```

---

### Task 5: Seed katalog 24–32 produk

**Files:**
- Modify: `apps/api/prisma/seed.ts`
- Test: `apps/api/test/seed.e2e-spec.ts` (tambah dua test)

**Interfaces:**
- Consumes: `Table` kategori yang dibuat seed sendiri (`daily-trainer`, `tempo-dan-race`, `trail`, `stability`), `slugify`.
- Produces: `seedDatabase(prisma)` tetap mengembalikan `{ adminId, customerId }`; jumlah `Product` 24–32 dan tiap produk 7 `ProductVariant` (EU 39–45) setelah satu kali seed.

- [ ] **Step 1: Tulis test yang gagal**

Tambahkan ke `apps/api/test/seed.e2e-spec.ts`:

```ts
it('seed membuat 28 produk dengan 7 varian tiap produk', async () => {
  await seedDatabase(prisma);

  const products = await prisma.product.count();
  expect(products).toBeGreaterThanOrEqual(24);
  expect(products).toBeLessThanOrEqual(32);
  expect(await prisma.productVariant.count()).toBe(products * 7);
  expect(
    await prisma.product.count({ where: { variants: { every: { stock: 0 } } } }),
  ).toBe(1);
});

it('seed dua kali tidak menggandakan produk atau varian', async () => {
  await seedDatabase(prisma);
  const first = { products: await prisma.product.count(), variants: await prisma.productVariant.count() };
  await seedDatabase(prisma);
  expect(await prisma.product.count()).toBe(first.products);
  expect(await prisma.productVariant.count()).toBe(first.variants);
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:e2e --workspace apps/api -- seed`
Expected: FAIL `expected 0 to be greater than or equal to 24` dan hitungan varian.

- [ ] **Step 3: Implementasi seed produk**

Tambahkan array `products` (28 entri, 7 per kategori) berisi `{ name, slug, categorySlug, brand, gender, description, price, weightGram, dropMm, stackMm, cushioning, support, terrain, image }`. Harga 600.000–3.300.000 merata; brand nyata (Nike, Adidas, Asics, Hoka, Brooks, Saucony, New Balance, On); `gender` diputar `pria`/`wanita`/`unisex`; satu produk (`tempo` teratas) stoknya 0 di semua ukuran, sisanya acak 0–12 per ukuran dengan minimal satu ukuran berstok. Nama produk nyata per kategori (mis. Daily trainer: `Pegasus 41`, `Novablast 5`, `Ghost 16`, …).

Gambar: kumpulkan 12 URL `images.unsplash.com/photo-…` yang mengembalikan 200 (`curl -I` sekali saat implementasi), lalu putar ulang untuk 28 produk. Tambahkan komentar:

```ts
// shortcut: 12 foto Unsplash diputar ulang untuk 28 produk, ganti dengan foto per produk saat storage tersedia
```

Setelah kategori di-upsert, simpan `Map<slug, id>`, lalu untuk tiap produk `product.upsert({ where: { slug }, update: {}, create: {...} })` dan untuk tiap ukuran `productVariant.upsert({ where: { productId_sizeEu: { productId, sizeEu } }, update: {}, create: { productId, sizeEu, sku: `${slug}-${sizeEu}`, stock } })`. `update: {}` supaya stok yang sudah diubah admin tidak tertimpa.

- [ ] **Step 4: Jalankan seed dan test**

Run: `npm run seed --workspace apps/api`
Run: `npm run test:e2e --workspace apps/api -- seed`
Expected: PASS 4 test (2 lama + 2 baru).

- [ ] **Step 5: Cek katalog nyata sekali**

Run: `npm run start:dev --workspace apps/api` lalu `curl "http://localhost:3001/products?limit=3"` (PowerShell: `Invoke-RestMethod`).
Expected: 200 dengan `total >= 24` dan tiap item punya `image` dan `category`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/seed.ts apps/api/test/seed.e2e-spec.ts
git commit -m "feat(db): seed 28 catalog products with size variants"
```

---

### Task 6: Verifikasi menyeluruh

**Files:** tidak ada file baru.

- [ ] **Step 1: Jalankan seluruh pemeriksaan**

```bash
npm run lint --workspace apps/api
npm run test --workspace apps/api
npm run test:e2e --workspace apps/api
npm run build --workspace apps/api
```

Expected: keempat perintah keluar dengan kode 0; `test:e2e` melaporkan 12 suite hijau (7 lama + 5 baru).

- [ ] **Step 2: Jalankan ulang e2e sekali lagi**

Run: `npm run test:e2e --workspace apps/api`
Expected: tetap hijau — membuktikan `resetDb()` membuat suite bisa diulang tanpa sisa data.

- [ ] **Step 3: Perbarui dokumen dan commit bila ada perubahan**

Bila ada penyimpangan dari rencana, catat di bagian "Catatan pelaksanaan" pada file rencana ini, lalu:

```bash
git add docs/superpowers/plans/2026-11-17-milestone-2-catalog.md
git commit -m "docs: record milestone 2 deviations"
```

---

## Tidak termasuk milestone ini

Storefront Next.js, keranjang, checkout, Midtrans, filter kategori/harga/spesifikasi, unggah gambar, riwayat stok, Swagger, dashboard admin UI.

## Risiko yang diterima

- 28 produk × 7 varian ditulis dengan `upsert` per baris (±200 query) saat seed; cukup cepat untuk mesin lokal dan CI.
- Slug tidak berubah saat rename, jadi URL lama tetap hidup tetapi tidak pernah mencerminkan nama baru.
- Foto seed diputar ulang dari 12 URL; tampilan katalog akan terasa berulang sampai storage gambar dikerjakan.
