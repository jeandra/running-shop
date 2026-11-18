# Milestone 7 — Laporan & Pengujian Wajib Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`\- [x]`) syntax for tracking.

**Goal:** Tutup gap Milestone 6: dashboard ringkasan penjualan admin (ADM-04) dan tiga pengujian wajib PRD (concurrency checkout, webhook x3, checkout setelah `expires_at`).

**Architecture:** Endpoint agregasi langsung dari tabel `Order`/`OrderItem` (tanpa tabel laporan baru). Pengujian wajib ditulis sebagai e2e terpisah; hardening kecil di `PaymentsService.processWebhook` agar status terminal tidak bisa dibalik ke `PAID`.

**Tech Stack:** NestJS + Prisma + PostgreSQL (sudah ada), Jest + Supertest e2e.

**Spec:** `docs/superpowers/specs/2026-11-18-milestone-7-reports-testing-design.md` + `PRd Platform E-commerce dan Sistem Pembayaran.md` (§5.6 ADM-04, §6.2, §290 pengujian wajib, §16).

## Global Constraints

- Semua nominal uang integer rupiah (`Int`); total dihitung di server.
- Stok: satu `UPDATE ... WHERE stock >= qty`; gagal → tidak ada decremen (sudah terpasang).
- Status: `PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → COMPLETED`; cabang `EXPIRED`/`CANCELLED` mengembalikan stok; transisi ilegal ditolak.
- Job terjadwal: query di proses API + advisory lock PostgreSQL.

## Review Focus

1. Laporan hanya menghitung revenue dari status PAID+ (bukan PENDING/CANCELLED/EXPIRED).
2. Concurrency checkout: dua request bersamaan untuk 1 stok → satu sukses, satu gagal, stok tidak negatif.
3. Webhook x3: satu efek pembayaran (idempotency + status guard).
4. Checkout setelah `expires_at`: pesanan kadaluarsa tidak bisa dibayar.

---

### Task 1: Laporan ringkasan penjualan admin (ADM-04)

**Files:**
- Create: `apps/api/src/admin/admin-reports.controller.ts`, `apps/api/src/admin/admin-reports.service.ts`
- Modify: `apps/api/src/admin/admin.module.ts`
- Test: `apps/api/test/admin-reports.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /admin/reports/summary` → `{ totalRevenue: number; totalOrders: number; topProducts: { productId: string; name: string; qty: number }[] }`

\- [x] **Step 1: Write the failing test**

`apps/api/test/admin-reports.e2e-spec.ts`: admin GET `/admin/reports/summary` → 200, shape `{ totalRevenue, totalOrders, topProducts }`; setelah 1 checkout+webhook PAID, `totalRevenue` = total order, `totalOrders` = 1.

\- [x] **Step 2: Run test to verify it fails**

Expected: FAIL (route belum ada)

\- [x] **Step 3: Implement `AdminReportsService.summary` + controller**

Agregasi `_sum.total` status PAID+, `_count` orders, groupBy productId sum qty limit 5, join nama produk.

\- [x] **Step 4: Run test to verify it passes**

Expected: PASS

\- [x] **Step 5: Commit**

### Task 2: Tiga pengujian wajib PRD + hardening processWebhook

**Files:**
- Create: `apps/api/test/concurrency-checkout.e2e-spec.ts`, `apps/api/test/webhook-idempotency.e2e-spec.ts`
- Modify: `apps/api/src/payments/payments.service.ts` (status guard di processWebhook), `apps/api/test/orders-expiry.e2e-spec.ts` (tambah kasus checkout setelah expiry)

**Interfaces:**
- Consumes: `OrdersService.checkout`, `PaymentsService.processWebhook`, `OrdersService.expireDueOrders`
- Produces: 3 pengujian wajib lulus

\- [x] **Step 1: Write the failing tests**

concurrency-checkout: stok 1, dua user checkout bersamaan → satu 201, satu 409, stok 0 (bukan negatif).
webhook-idempotency: webhook PAID dikirim 3x → order PAID, stok berkurang 1x.
orders-expiry: tambah kasus — order expired → webhook payment_finish tidak mengubah status (tetap CANCELLED).

\- [x] **Step 2: Run tests to verify they fail**

Expected: FAIL (hardening belum ada; concurrency/webhook test baru)

\- [x] **Step 3: Implement hardening di processWebhook**

Hanya set `PAID` jika `order.status === 'PENDING_PAYMENT'`; selain itu return `{ processed: true }` tanpa perubahan.

\- [x] **Step 4: Run tests to verify they pass**

Expected: PASS

\- [x] **Step 5: Commit**

### Task 3: Full verification + commit (selesai milestone)

\- [x] **Step 1: Run full verification** — `npm run lint`, `npm run build`, `npm run test:e2e` di `apps/api` (plus lint/build `apps/web`).

\- [x] **Step 2: Commit** milestone work.

---

Setelah rencana lengkap ditulis dan self-reviewed, akankan ke partner manusia, lalu eksekusi dengan metode yang sudah dipilih (native).

