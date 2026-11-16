# Milestone 1 — Fondasi dan Autentikasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repositori monorepo yang berjalan dengan PostgreSQL, skema database penuh untuk P0, dan autentikasi JWT dengan rotasi refresh token sehingga register, login, refresh, logout, dan otorisasi peran terbukti lewat test.

**Architecture:** Satu monorepo npm workspaces berisi `apps/api` (NestJS + Prisma). Postgres dijalankan lewat Docker Compose; test e2e memakai database terpisah di instance yang sama. Autentikasi memakai access token JWT 15 menit di body respons dan refresh token opaque 7 hari di cookie httpOnly dengan rotasi dan deteksi pemakaian ulang. Frontend Next.js tidak dibuat di milestone ini; ia masuk milestone katalog.

**Tech Stack:** Node 24, npm workspaces, NestJS 11, Prisma 6, PostgreSQL 17, argon2, `@nestjs/jwt`, `@nestjs/throttler`, class-validator, Jest + Supertest, GitHub Actions.

**Spec:** `PRD Platform E-commerce dan Sistem Pembayaran.md`

## Global Constraints

- Model dan kolom Prisma memakai bahasa Inggris (`name`, `price`); teks yang dilihat pengguna memakai bahasa Indonesia.
- Semua nilai uang bertipe `Int` dalam rupiah penuh. Tidak ada `Float`, `Decimal`, atau pembulatan.
- Stok hanya ada di `ProductVariant`. `Product` tidak punya kolom stok.
- Error memakai bentuk bawaan NestJS `{ statusCode, message, error }`. Jangan membuat amplop respons sendiri.
- Password di-hash dengan argon2id (`memoryCost` default library). Password mentah tidak boleh muncul di log, respons, atau test fixture yang dicetak.
- Access token JWT berlaku 15 menit dengan payload `{ sub: userId, role }`. Refresh token berlaku 7 hari, disimpan sebagai hash SHA-256, dikirim sebagai cookie `rt` dengan `httpOnly`, `sameSite: 'lax'`, `path: '/auth'`.
- Email disimpan dan dibandingkan dalam bentuk `trim().toLowerCase()`.
- Tidak menambah dependensi di luar yang tercantum pada Tech Stack tanpa alasan tertulis di commit message.
- Setiap task diakhiri commit yang berdiri sendiri dan test hijau.

## Review Focus

Kondisi berikut tidak diwujudkan oleh satu requirement pun di PRD, tapi paling mungkin menggigit pemakai:

1. **Email dengan huruf besar atau spasi di awal/akhir** — `Budi@Mail.com ` saat register lalu `budi@mail.com` saat login harus masuk ke akun yang sama, bukan 401 atau akun kedua.
2. **Refresh token dipakai dari dua tab bersamaan** — satu permintaan boleh menang; yang kalah harus 401 tanpa menghapus sesi lain milik pengguna yang sama.
3. **Password sangat panjang (10.000 karakter) atau unicode** — harus ditolak di 400 karena batas panjang, bukan menggantungkan CPU pada argon2.
4. **Body bukan JSON atau berisi field tak dikenal** — harus 400 dengan bentuk error yang sama, bukan 500.
5. **Cookie refresh yang masa berlakunya sudah lewat** — harus 401 dan tidak memperpanjang sesi diam-diam.

---

### Task 1: Kerangka monorepo, Postgres, dan endpoint health

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`, `docker-compose.yml`
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/health/health.controller.ts`
- Test: `apps/api/test/health.e2e-spec.ts`, `apps/api/test/jest-e2e.json`

**Interfaces:**
- Consumes: tidak ada.
- Produces: `PrismaService extends PrismaClient implements OnModuleInit` di `apps/api/src/prisma/prisma.service.ts`; `GET /health` → `200 { status: 'ok', db: 'ok' }`.

- [ ] **Step 1: Tulis test yang gagal**

```ts
// apps/api/test/health.e2e-spec.ts
it('GET /health melaporkan aplikasi dan database hidup', async () => {
  const res = await request(app.getHttpServer()).get('/health').expect(200);
  expect(res.body).toEqual({ status: 'ok', db: 'ok' });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:e2e --workspace apps/api -- health`
Expected: FAIL karena `apps/api` belum ada.

- [ ] **Step 3: Buat kerangka**

`docker-compose.yml` berisi satu service `db` (image `postgres:17`, port `5432`, `POSTGRES_DB=running_shop`, user/password `dev`). `.env.example` memuat `DATABASE_URL=postgresql://dev:dev@localhost:5432/running_shop?schema=public` dan `JWT_ACCESS_SECRET=`. `apps/api/package.json` memakai skrip `start:dev`, `build`, `lint`, `test`, `test:e2e`. `main.ts` memasang `app.setGlobalPrefix('')` tanpa prefix, `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`, lalu `listen(process.env.PORT ?? 3001)`. `HealthController` menjalankan `prisma.$queryRaw\`SELECT 1\`` dan mengembalikan `{ status: 'ok', db: 'ok' }`.

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test:e2e --workspace apps/api -- health`
Expected: PASS 1 test.

- [ ] **Step 5: Commit**

```bash
git init && git add -A
git commit -m "chore: monorepo skeleton, postgres compose, health endpoint"
```

---

### Task 2: Skema Prisma penuh untuk P0

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_init/migration.sql` (hasil `prisma migrate dev`)
- Test: `apps/api/test/schema.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` dari Task 1.
- Produces: model `User`, `RefreshToken`, `Address`, `Category`, `Product`, `ProductVariant`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `WebhookEvent`, `StockMovement`; enum `Role { CUSTOMER ADMIN }` dan `OrderStatus { PENDING_PAYMENT PAID PROCESSING SHIPPED COMPLETED EXPIRED CANCELLED }`.

- [ ] **Step 1: Tulis test yang gagal**

```ts
// apps/api/test/schema.spec.ts
it('menolak dua varian dengan produk dan ukuran sama', async () => {
  await prisma.productVariant.create({ data: { productId, sizeEu: 42, sku: 'A-42', stock: 3 } });
  await expect(
    prisma.productVariant.create({ data: { productId, sizeEu: 42, sku: 'B-42', stock: 1 } }),
  ).rejects.toMatchObject({ code: 'P2002' });
});

it('menyimpan harga sebagai integer rupiah tanpa pembulatan', async () => {
  const created = await prisma.product.create({ data: { ...base, price: 899000 } });
  expect(await prisma.product.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({ price: 899000 });
});
```

Normalisasi email huruf besar bukan urusan database; test-nya ada di Task 4.

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test --workspace apps/api -- schema`
Expected: FAIL karena `prisma.productVariant` tidak ada.

- [ ] **Step 3: Tulis skema**

Model dan kolom wajib (selain `id String @id @default(uuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`):

```prisma
model User { name String; email String @unique; passwordHash String; role Role @default(CUSTOMER); addresses Address[]; carts Cart[]; orders Order[]; refreshTokens RefreshToken[] }
model RefreshToken { userId String; tokenHash String @unique; expiresAt DateTime; revokedAt DateTime?; user User @relation(fields: [userId], references: [id], onDelete: Cascade) @@index([userId]) }
model Address { userId String; recipient String; phone String; street String; city String; postalCode String; isDefault Boolean @default(false) @@index([userId]) }
model Category { name String; slug String @unique }
model Product { categoryId String; name String; slug String @unique; brand String; gender String; description String; price Int; image String?; weightGram Int?; dropMm Int?; stackMm Int?; cushioning String?; support String?; terrain String?; isActive Boolean @default(true); variants ProductVariant[] @@index([categoryId]) }
model ProductVariant { productId String; sizeEu Int; sku String @unique; stock Int @default(0); isActive Boolean @default(true) @@unique([productId, sizeEu]) }
model Cart { userId String @unique; items CartItem[] }
model CartItem { cartId String; variantId String; qty Int @@unique([cartId, variantId]) }
model Order { orderNumber String @unique; userId String; addressSnapshot Json; subtotal Int; shippingCost Int; discount Int @default(0); total Int; status OrderStatus @default(PENDING_PAYMENT); trackingNumber String?; expiresAt DateTime; paidAt DateTime?; items OrderItem[] @@index([userId, createdAt]) }
model OrderItem { orderId String; variantId String; productId String; nameSnapshot String; sizeSnapshot Int; priceSnapshot Int; qty Int @@index([orderId]) }
model Payment { orderId String; provider String; providerRef String?; method String?; amount Int; status String; rawPayload Json?; paidAt DateTime?; @@index([orderId]) }
model WebhookEvent { provider String; eventId String; payload Json; processedAt DateTime?; @@unique([provider, eventId]) }
model StockMovement { productId String; variantId String; change Int; reason String; orderId String?; createdAt DateTime @default(now()) @@index([variantId, createdAt]) }
```

Tambahkan relasi balik yang dibutuhkan Prisma. Kolom `Voucher` **tidak** dibuat: CART-05 ditunda per bagian 16 PRD.

- [ ] **Step 4: Jalankan migrasi dan test**

Run: `npx prisma migrate dev --name init --schema apps/api/prisma/schema.prisma`
Run: `npm run test --workspace apps/api -- schema`
Expected: migrasi membuat 13 tabel; PASS 2 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma apps/api/test/schema.spec.ts
git commit -m "feat(db): prisma schema for P0 entities"
```

---

### Task 3: Seed pengguna dan kategori

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json` (skrip `seed`, konfigurasi `prisma.seed`)
- Test: `apps/api/test/seed.spec.ts`

**Interfaces:**
- Consumes: skema Task 2.
- Produces: `seedDatabase(prisma: PrismaClient): Promise<{ adminId: string; customerId: string }>` di `apps/api/prisma/seed.ts`; akun `admin@toko.test` / `customer@toko.test` dengan password `Password123!`; 4 kategori: `Daily trainer`, `Tempo dan race`, `Trail`, `Stability`.

- [ ] **Step 1: Tulis test yang gagal**

```ts
it('seed dapat dijalankan dua kali tanpa duplikat', async () => {
  await seedDatabase(prisma); await seedDatabase(prisma);
  expect(await prisma.user.count()).toBe(2);
  expect(await prisma.category.count()).toBe(4);
});
it('admin tersimpan dengan hash, bukan password mentah', async () => {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@toko.test' } });
  expect(admin.passwordHash).not.toBe('Password123!');
  expect(await argon2.verify(admin.passwordHash, 'Password123!')).toBe(true);
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test --workspace apps/api -- seed`
Expected: FAIL karena `seedDatabase` belum ada.

- [ ] **Step 3: Implementasi seed**

`seedDatabase` memakai `upsert` untuk user (berdasarkan `email`) dan kategori (berdasarkan `slug`), sehingga aman dijalankan berulang. Produk tidak di-seed di milestone ini; data katalog masuk rencana milestone berikutnya.

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test --workspace apps/api -- seed`
Expected: PASS 2 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed.ts apps/api/package.json apps/api/test/seed.spec.ts
git commit -m "feat(db): idempotent seed for users and categories"
```

---

### Task 4: Registrasi

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/dto/register.dto.ts`, `apps/api/src/auth/password.service.ts`
- Test: `apps/api/test/auth-register.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 1), `Role` (Task 2).
- Produces: `POST /auth/register` → `201 { id, email, role }`; `AuthService.register(dto: RegisterDto): Promise<{ id: string; email: string; role: Role }>`; `PasswordService.hash(plain: string): Promise<string>` dan `PasswordService.verify(hash: string, plain: string): Promise<boolean>`.

- [ ] **Step 1: Tulis test yang gagal**

```ts
it('mendaftar dan tidak mengembalikan password', async () => {
  const res = await request(server).post('/auth/register')
    .send({ name: 'Budi', email: 'Budi@Mail.com ', password: 'Password123!' }).expect(201);
  expect(res.body).toMatchObject({ email: 'budi@mail.com', role: 'CUSTOMER' });
  expect(JSON.stringify(res.body)).not.toMatch(/password/i);
});
it('email yang sama dengan huruf berbeda ditolak 409', async () => { /* register budi@mail.com lalu Budi@Mail.com → 409 */ });
it('password 7 karakter ditolak 400', async () => { /* → 400 */ });
it('password 10.000 karakter ditolak 400 tanpa memanggil argon2', async () => { /* spy argon2.hash tidak dipanggil */ });
it('field tak dikenal ditolak 400', async () => { /* body { ..., role: 'ADMIN' } → 400, bukan 201 */ });
it('body yang bukan JSON dijawab 400, bukan 500', async () => { /* kirim body 'bukan json' dengan Content-Type application/json → 400 */ });
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:e2e --workspace apps/api -- auth-register`
Expected: FAIL 404 karena route belum ada.

- [ ] **Step 3: Implementasi**

`RegisterDto`: `name` (`@Length(1, 80)`), `email` (`@IsEmail()`), `password` (`@Length(8, 128)`). `AuthService.register` menormalkan email dengan `trim().toLowerCase()`, menangkap `P2002` dan melempar `ConflictException`, lalu menyimpan `passwordHash` hasil `PasswordService.hash`. `role` tidak pernah diambil dari body; `whitelist: true` di Task 1 sudah menolak field liar.

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test:e2e --workspace apps/api -- auth-register`
Expected: PASS 6 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth apps/api/test/auth-register.spec.ts
git commit -m "feat(auth): register with normalized email and argon2 hash"
```

---

### Task 5: Login, access token, dan pembatasan laju

**Files:**
- Create: `apps/api/src/auth/dto/login.dto.ts`, `apps/api/src/auth/token.service.ts`, `apps/api/src/auth/jwt.strategy.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.module.ts`, `apps/api/src/app.module.ts`
- Test: `apps/api/test/auth-login.spec.ts`

**Interfaces:**
- Consumes: `AuthService.register`, `PasswordService`.
- Produces: `AuthTokens { accessToken: string; refreshToken: string }`; `POST /auth/login` → `200 { accessToken }` dan cookie `rt`; `TokenService.issueRefresh(userId: string): Promise<string>`.

- [ ] **Step 1: Tulis test yang gagal**

```ts
it('login benar mengembalikan access token dan cookie refresh', async () => {
  const res = await request(server).post('/auth/login')
    .send({ email: 'BUDI@mail.com', password: 'Password123!' }).expect(200);
  expect(res.body.accessToken).toBeDefined();
  expect(res.headers['set-cookie'][0]).toContain('rt=');
  expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
});
it('password salah dan email tidak dikenal memberi pesan yang sama', async () => { /* keduanya 401 body identik */ });
it('permintaan login ke-11 dalam satu menit dijawab 429', async () => { /* loop 10 → 200/401, ke-11 → 429 */ });
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:e2e --workspace apps/api -- auth-login`
Expected: FAIL 404.

- [ ] **Step 3: Implementasi**

`AuthService.login` mencari user dengan email ternormalisasi; bila tidak ada, tetap jalankan `PasswordService.verify` terhadap hash dummy agar waktu respons serupa, lalu lempar `UnauthorizedException('Email atau password salah')`. Access token ditandatangani `JwtModule` dengan secret `JWT_ACCESS_SECRET`, `expiresIn: '15m'`, payload `{ sub, role }`. `TokenService.issueRefresh` membuat 32 byte acak (`randomBytes(32).toString('base64url')`), menyimpan `sha256`-nya di `RefreshToken` dengan `expiresAt = now + 7d`. `@ThrottlerModule` global dengan `ttl: 60_000, limit: 10`, hanya dipasang di `AuthController`.

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test:e2e --workspace apps/api -- auth-login`
Expected: PASS 3 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth apps/api/src/app.module.ts apps/api/test/auth-login.spec.ts
git commit -m "feat(auth): login with jwt access token and refresh cookie"
```

---

### Task 6: Rotasi refresh token dan logout

**Files:**
- Modify: `apps/api/src/auth/token.service.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.controller.ts`
- Test: `apps/api/test/auth-refresh.spec.ts`

**Interfaces:**
- Consumes: `TokenService.issueRefresh`.
- Produces: `TokenService.rotate(rawToken: string): Promise<{ userId: string; raw: string }>`; `TokenService.revoke(rawToken: string): Promise<void>`; `TokenService.revokeAll(userId: string): Promise<void>`; `POST /auth/refresh` → `200 { accessToken }`; `POST /auth/logout` → `204`.

- [ ] **Step 1: Tulis test yang gagal**

```ts
it('refresh mengembalikan token baru dan token lama tidak berlaku', async () => {
  const first = await login();                       // cookie rt=...
  const second = await request(server).post('/auth/refresh').set('Cookie', first.cookie).expect(200);
  await request(server).post('/auth/refresh').set('Cookie', first.cookie).expect(401);
  await request(server).post('/auth/refresh').set('Cookie', secondSetCookie(second)).expect(200);
});
it('pemakaian ulang token yang sudah dirotasi mencabut semua sesi pengguna', async () => { /* login dua kali, refresh yang pertama, pakai ulang yang pertama → 401, lalu token sesi kedua juga 401 */ });
it('refresh tanpa cookie dijawab 401, bukan 500', async () => { /* → 401 */ });
it('logout mencabut token dan menghapus cookie', async () => { /* → 204, Set-Cookie rt=; Max-Age=0 */ });
it('dua refresh bersamaan: satu menang, satu 401', async () => { /* Promise.all dua request dengan cookie sama → satu 200, satu 401 */ });
it('refresh dengan token kedaluwarsa dijawab 401 tanpa memperpanjang sesi', async () => { /* expiresAt = kemarin → 401 */ });
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:e2e --workspace apps/api -- auth-refresh`
Expected: FAIL 404.

- [ ] **Step 3: Implementasi**

`rotate` mencari `RefreshToken` berdasarkan `sha256(raw)`. Tidak ditemukan → `UnauthorizedException`. `revokedAt != null` → `revokeAll(userId)` lalu `UnauthorizedException` (deteksi pemakaian ulang). `expiresAt < now` → `UnauthorizedException`. Bila valid: set `revokedAt = now`, terbitkan token baru. Perlindungan balapan memakai `updateMany({ where: { id, revokedAt: null }, data: { revokedAt: now } })` dan menolak bila `count === 0`.

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test:e2e --workspace apps/api -- auth-refresh`
Expected: PASS 6 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth apps/api/test/auth-refresh.spec.ts
git commit -m "feat(auth): refresh rotation with reuse detection and logout"
```

---

### Task 7: Guard peran dan profil pengguna

**Files:**
- Create: `apps/api/src/auth/roles.decorator.ts`, `apps/api/src/auth/roles.guard.ts`, `apps/api/src/auth/jwt-auth.guard.ts`
- Create: `apps/api/src/users/users.module.ts`, `apps/api/src/users/users.controller.ts`
- Test: `apps/api/test/users-me.spec.ts`

**Interfaces:**
- Consumes: `jwt.strategy.ts` (Task 5), `Role` (Task 2).
- Produces: `@Roles(Role.ADMIN)`; `JwtAuthGuard`; `RolesGuard`; `GET /users/me` → `200 { id, name, email, role }` tanpa `passwordHash`.

- [ ] **Step 1: Tulis test yang gagal**

```ts
it('tanpa token dijawab 401', async () => { await request(server).get('/users/me').expect(401); });
it('token customer di route admin dijawab 403', async () => { /* route uji @Roles(ADMIN) → 403 */ });
it('profil tidak memuat passwordHash', async () => { /* → body tanpa key passwordHash */ });
it('token kedaluwarsa dijawab 401', async () => { /* token exp -1s → 401 */ });
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:e2e --workspace apps/api -- users-me`
Expected: FAIL 404.

- [ ] **Step 3: Implementasi**

`JwtAuthGuard` memperluas `AuthGuard('jwt')`. `RolesGuard` membaca metadata `Roles` via `Reflector` dan membandingkan dengan `request.user.role`; tanpa metadata → lolos. `UsersController` memakai `@UseGuards(JwtAuthGuard)` dan `@Get('me')` mengembalikan field terpilih lewat `select` Prisma, bukan `delete` setelah query.

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test:e2e --workspace apps/api -- users-me`
Expected: PASS 4 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth apps/api/src/users apps/api/test/users-me.spec.ts
git commit -m "feat(auth): role guard and current user profile"
```

---

### Task 8: Pipeline CI

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `apps/api/package.json` (pastikan `lint`, `test`, `test:e2e`, `build` ada)

**Interfaces:**
- Consumes: seluruh skrip npm dari Task 1–7.
- Produces: workflow `CI` yang berjalan pada `push` dan `pull_request`.

- [ ] **Step 1: Tulis workflow yang gagal**

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env: { POSTGRES_USER: dev, POSTGRES_PASSWORD: dev, POSTGRES_DB: running_shop_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL: postgresql://dev:dev@localhost:5432/running_shop_test?schema=public
      JWT_ACCESS_SECRET: ci-secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
      - run: npm run lint --workspace apps/api
      - run: npm run test --workspace apps/api
      - run: npm run test:e2e --workspace apps/api
      - run: npm run build --workspace apps/api
```

- [ ] **Step 2: Jalankan langkah yang sama secara lokal**

Run: `npm ci && npm run lint --workspace apps/api && npm run test --workspace apps/api && npm run test:e2e --workspace apps/api && npm run build --workspace apps/api`
Expected: seluruh perintah keluar dengan kode 0. Perintah ini identik dengan isi workflow; bila ada yang gagal, perbaiki sebelum push.

- [ ] **Step 3: Push dan buktikan CI hijau**

Run: `git push -u origin main`
Expected: tab Actions menampilkan workflow `CI` selesai hijau pada commit terakhir. Bila merah, baca log langkah yang gagal dan perbaiki dengan commit baru.

- [ ] **Step 4: Commit perubahan tersisa**

```bash
git add .github/workflows/ci.yml apps/api/package.json
git commit -m "ci: lint, test, e2e, and build on push"
```

---

## Tidak termasuk milestone ini

Katalog produk, varian ukuran di UI, keranjang, checkout, pembayaran Midtrans, webhook, job kedaluwarsa, dashboard admin, dan aplikasi Next.js. Masing-masing menjadi rencana milestone sendiri; jangan dikerjakan di sini.

Validasi harga positif dan stok tidak negatif belum punya pemilik di milestone ini karena endpoint admin belum ada. Test-nya wajib masuk rencana milestone katalog, di task CRUD produk.

## Risiko yang diterima

- Database test berbagi instance dengan database dev; pemisahan memakai nama database berbeda, bukan container berbeda.
- Cookie `sameSite: 'lax'` hanya bekerja bila frontend dan API berada di satu domain. Keputusan topologi deploy ditunda sampai milestone deployment; bila akhirnya beda domain, cookie harus diubah ke `none` + `secure` dan CORS dibuka.
