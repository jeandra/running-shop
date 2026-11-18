# Milestone 6 — Expiry, Email, Status Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tutup gap sisa dari Milestone 5: auto-cancel pesanan kadaluarsa + kembalikan stok (PAY-05), notifikasi email (NOT-01), dan validasi transisi status pesanan di sisi server (ORD-02/ORD-03).

**Architecture:** Job kedaluwarsa memakai query terjadwal di proses API (setInterval + PostgreSQL advisory lock, tanpa Redis/BullMQ — keputusan §16). Notifikasi email lewat `NotificationsService` (provider dari env, mode log saat tanpa kredensial). Transisi status divalidasi di `OrdersService.updateStatus`.

**Tech Stack:** NestJS + Prisma + PostgreSQL (sudah ada), Jest + Supertest e2e.

**Spec:** `PRd Platform E-commerce dan Sistem Pembayaran.md` (§5.6 dashboard admin, §5.7 notifikasi, §6.1 alur & §6.2 status, §7, §8.1, §16) + `docs/superpowers/plans/2026-11-18-milestone-5-checkout.md`.

## Global Constraints

- Semua nominal uang integer rupiah (`Int`); total dihitung di server.
- Stok: satu `UPDATE product_variants SET stock = stock - qty WHERE id = $1 AND stock >= qty`; gagal → tidak ada decremen.
- Status: `PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → COMPLETED`; cabang `EXPIRED`/`CANCELLED` mengembalikan stok.
- Job terjadwal: query di proses API + advisory lock PostgreSQL (bukan Redis/BullMQ).
- Backend stateless; email memakai provider dari env (Resend/Nodemailer/SMTP sandbox).

## Review Focus

1. Job kedaluwarsa tidak berjalan dobel (advisory lock).
2. Auto-cancel expired → stok dikembalikan.
3. Email: event yang di-notify dan mode provider.
4. Transisi status ilegal ditolak di server.

---

### Task 1: Expiry job — auto-cancel pesanan PENDING_PAYMENT kadaluarsa + kembalikan stok

**Files:**
- Modify: `apps/api/src/orders/orders.service.ts` (tambah `expireDueOrders`)
- Modify: `apps/api/src/orders/orders.module.ts` (scheduler setInterval + advisory lock)

**Interfaces:**
- Consumes: `OrdersService.checkout` (order `PENDING_PAYMENT` + `expiresAt`), `OrdersService.cancel` (return stok)
- Produces: `OrdersService.expireDueOrders(): Promise<{ cancelled: number }>`; scheduler terdaftar di module

- [x] **Step 1: Write the failing test**

`apps/api/test/orders-expiry.e2e-spec.ts`: checkout → set `expiresAt` past via prisma → panggil `expireDueOrders()` via `app.get(OrdersService)` → order berstatus `CANCELLED`, stok varian kembali ke nilai awal (wajib: checkout setelah `expires_at` → pesanan kedaluwarsa).

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest --config ./test/jest-e2e.json --runInBand --testPathPattern orders-expiry` di `apps/api`
Expected: FAIL (method belum ada)

- [x] **Step 3: Implement `OrdersService.expireDueOrders`**

Query order `PENDING_PAYMENT` dengan `expiresAt < now`; tiap order lewat `cancel` (return stok); kembalikan jumlah yang dibatalkan.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest --config ./test/jest-e2e.json --runInBand --testPathPattern orders-expiry` di `apps/api`
Expected: PASS

- [x] **Step 5: Commit**

### Task 2: Email notifikasi (NOT-01) — konfirmasi pesanan + sukses pembayaran

**Files:**
- Create: `apps/api/src/notifications/notifications.module.ts`, `apps/api/src/notifications/notifications.service.ts`
- Modify: `apps/api/src/orders/orders.service.ts` (kirim konfirmasi setelah order dibuat), `apps/api/src/payments/payments.service.ts` (kirim sukses setelah webhook PAID)

**Interfaces:**
- Consumes: `OrdersService.checkout` (user + order), `PaymentsService.processWebhook` (order `PAID`)
- Produces: `NotificationsService.sendEmail(input: { to, subject, body })`; dipakai oleh orders & payments

- [x] **Step 1: Write the failing test**

`apps/api/test/notifications.e2e-spec.ts`: checkout → notifikasi konfirmasi terkirim; webhook `payment_finish` → notifikasi sukses terkirim.

- [x] **Step 2: Run test to verify it fails**

Expected: FAIL (module belum ada)

- [x] **Step 3: Implement `NotificationsService` + module + wiring**

Provider email dari env (`EMAIL_PROVIDER`, mode `log` tanpa kredensial); kirim dari checkout dan dari webhook PAID.

- [x] **Step 4: Run test to verify it passes**

Expected: PASS

- [x] **Step 5: Commit**

### Task 3: Validasi transisi status pesanan di server (ORD-02/ORD-03)

**Files:**
- Modify: `apps/api/src/orders/orders.service.ts` (`updateStatus`)
- Test: `apps/api/test/orders-status.e2e-spec.ts`

**Interfaces:**
- Consumes: `OrderStatus` dari `@prisma/client`
- Produces: `OrdersService.updateStatus(id, status, trackingNumber?)` yang hanya mengizinkan transisi valid

- [x] **Step 1: Write the failing test**

Admin `PATCH /admin/orders/:id` dengan transisi ilegal (mis. `PENDING_PAYMENT → SHIPPED`) → `409 Conflict`.

- [x] **Step 2: Run test to verify it fails**

Expected: FAIL (transisi belum divalidasi)

- [x] **Step 3: Implement validasi transisi**

Tabel transisi: `PENDING_PAYMENT → PAID | CANCELLED | EXPIRED`, `PAID → PROCESSING | SHIPPED | COMPLETED`, `PROCESSING → SHIPPED | COMPLETED`, `SHIPPED → COMPLETED`.

- [x] **Step 4: Run test to verify it passes**

Expected: PASS

- [x] **Step 5: Commit**

### Task 4: Full verification + commit (selesai milestone)

- [x] **Step 1: Run full verification** — `npm run lint`, `npm run build`, `npm run test:e2e` di `apps/api` (plus lint/build `apps/web`).

- [x] **Step 2: Commit** milestone work.

---

Setelah rencana lengkap ditulis dan self-reviewed, akankan ke partner manusia, lalu eksekusi dengan metode yang sudah dipilih (native).
