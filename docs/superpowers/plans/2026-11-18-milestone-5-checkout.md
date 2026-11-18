# Milestone 5 — Checkout & Pembayaran Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement end-to-end beli → bayar flow: pembuatan pesanan dari keranjang dengan pengurangan stok atomik, integrasi Midtrans Snap sandbox, webhook, dan transisi status pesanan.

**Architecture:** Modul `orders` baru di API yang consume keranjang (guest/user) → buat `Order` `PENDING_PAYMENT` + `OrderItem` + decrement stok atomik; modul `payments` memanggil Midtrans Snap dan menangani webhook (signature + idempotency) → update status; modul admin mengelola pesanan.

**Tech Stack:** NestJS + Prisma + PostgreSQL (sudah ada), Midtrans Snap sandbox, Jest + Supertest e2e.

**Spec:** `PRd Platform E-commerce dan Sistem Pembayaran.md` (bagian 5.3–5.5, 6.1, 11, 16) + `docs/superpowers/specs/2026-11-18-milestone-4-cart-design.md`.

## Global Constraints

- Semua nominal uang integer rupiah (`Int`) di seluruh skema; total dihitung di server.
- Stok: satu `UPDATE product_variants SET stock = stock - qty WHERE id = $1 AND stock >= qty`; baris terpengaruh = sukses, tidak ada = stok tidak cukup (CART-03, keputusan §16).
- Status: `PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → COMPLETED`; cabang `EXPIRED`/`CANCELLED` dengan pengembalian stok (PAY-05, §6.2).
- Webhook: verifikasi signature + idempotency via `WebhookEvent(provider, eventId)` unique; status dari frontend tidak pernah dipercaya; webhook berulang tidak efek ganda (PAY-02/03/04).

## Review Focus

1. Overselling: dua checkout bersamaan untuk satu unit stok terakhir → satu sukses, satu gagal bersih.
2. Webhook idempotent: pengiriman tiga kali → satu pembayaran/efek.
3. Expiry: setelah `expires_at` → order `EXPIRED`, stok dikembalikan.
4. Transisi status hanya boleh mengikuti alur server-side.
5. PAY-01: halaman pembayaran Midtrans Snap menampilkan token/URL ke frontend.

## Tasks

### Task 1: Checkout — pembuatan pesanan dari keranjang

**Files:**
- Create: `apps/api/src/orders/orders.module.ts`, `apps/api/src/orders/orders.controller.ts`, `apps/api/src/orders/orders.service.ts`, `apps/api/src/orders/dto/checkout-order.dto.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/orders-checkout.e2e-spec.ts`

**Interfaces:**
- Produces: `OrdersService.checkout(input: { userId?: string; sessionId?: string }): Promise<{ order: Order; cartId: string }>`

- [ ] **Step 1: Write the failing test**

```ts
// POST /orders/checkout dengan keranjang guest+item → 201, order PENDING_PAYMENT, stok berkurang
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- --testPathPattern orders-checkout` di `apps/api`
Expected: FAIL (route belum ada)

- [ ] **Step 3: Implement `OrdersService.checkout`**

Satu transaksi DB: ambil keranjang + item → validasi stok → decrement atomic → buat `Order` (status `PENDING_PAYMENT`, `expires_at`) + `OrderItem` (snapshot) → kurangi cart → return order.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:e2e -- --testPathPattern orders-checkout`
Expected: PASS

- [ ] **Step 5: Commit**

### Task 2: Payment gateway — Midtrans Snap sandbox

- [ ] **Step 1: Write the failing test** — `POST /payments` membuat transaksi; `POST /payments/webhook` (verifikasi signature + idempotency) mengupdate status.
- [ ] **Step 2: Run test to verify it fails** — route belum ada.
- [ ] **Step 3: Implement** — `PaymentsService` memanggil Midtrans Snap (sandbox) via server key di env; webhook handler verifikasi signature, cek `WebhookEvent`, update order `PAID`/`FAILED`/`EXPIRED`, kembalikan stok bila gagal/expired.
- [ ] **Step 4: Run test to verify it passes**.
- [ ] **Step 5: Commit**.

### Task 3: Order API pembeli — riwayat, detail, batal

- [ ] **Step 1: Write the failing test** — `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` (customer hanya boleh akses miliknya).
- [ ] **Step 2: Run test to verify it fails**.
- [ ] **Step 3: Implement** — `OrdersController`/`OrdersService` CRUD orders + cancel (hanya bila status masih `PENDING_PAYMENT`).
- [ ] **Step 4: Run test to verify it passes**.
- [ ] **Step 5: Commit**.

### Task 4: Order admin — daftar, update status, resi

- [ ] **Step 1: Write the failing test** — `GET /admin/orders`, `PATCH /admin/orders/:id` (status + tracking_number).
- [ ] **Step 2: Run test to verify it fails**.
- [ ] **Step 3: Implement** — admin module menambah orders endpoints.
- [ ] **Step 4: Run test to verify it passes**.
- [ ] **Step 5: Commit**.

### Task 5: Verify + commit (selesai milestone)

- [ ] **Step 1: Run full verification** — `npm run lint`, `npm run build`, `npm run test:e2e` di `apps/api` (plus visual check halaman /cart → /orders di web).
- [ ] **Step 2: Commit** milestone work.

---

After writing the complete plan, self-review checklist:

1. **Spec coverage:** checkout (CART-03/06), payment (PAY-01..05), orders (ORD-01..04), status flow (§6.2) — covered by Tasks 1–4. Gap: not tasks for email notification (NOT-01) & admin report (ADM-04) — those are roadmap minggu 6/7, out of milestone 5 scope.
2. **Step scan:** steps are one action each; signatures specified; test names asserted.
3. **Type consistency:** `OrdersService.checkout` signature consistent across tasks; `WebhookEvent` unique key used.
4. **Review focus:** covered — oversell, idempotency, expiry, transitions, payment page.
5. **Proportion:** plan vs code — tasks are step-based, OK.

Plan saved to `docs/superpowers/plans/2026-11-18-milestone-5-checkout.md`.

## Execution Handoff

**"Plan complete and saved to `docs/superpowers/plans/2026-11-18-milestone-5-checkout.md`. Please review the plan. Which execution approach would you prefer?**

- **Subagent-driven** - ...
- **Native** - ...
