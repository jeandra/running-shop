# Design: Milestone 7 — Laporan, Testing (Polesan UI)

**Tanggal:** 2026-11-18
**Spec sumber:** `PRd Platform E-commerce dan Sistem Pembayaran.md` (§5.6 ADM-04, §290 pengujian wajib, §16)
**Milestone sebelumnya:** Milestone 6 (expiry, email, status) — selesai & ter-commit di `main`.

## Intent & Why
Tutup gap yang tersisa dari Milestone 6: (1) dashboard ringkasan penjualan untuk admin (ADM-04), dan (2) tiga pengujian wajib PRD yang belum ditulis (concurrency checkout, webhook x3 idempotency, checkout setelah `expires_at`). Voucher ditunda ke v1.1 per §16; filter spesifikasi (RUN-02) dan halaman checkout frontend ditunda ke milestone tersendiri.

## Goals
- `GET /admin/reports/summary` mengembalikan total pendapatan, jumlah pesanan, dan produk terlaris.
- Tiga pengujian wajib PRD (line 290) lulus dan tercatat di repo.
- Lint + build + e2e tetap hijau.

## Non-goals (ditunda)
- Voucher (CART-05) — §16: ditunda ke v1.1.
- Filter spesifikasi sepatu (RUN-02) — P1, milestone terpisah.
- Halaman checkout/orders di web frontend — milestone terpisah.
- Transport email nyata — milestone 8.

## Constraints
- Integer rupiah (`Int`); total dihitung di server.
- Backend stateless; tidak ada infra baru (no Redis/BullMQ).
- Laporan hanya agregasi dari tabel `Order`/`OrderItem` yang sudah ada.

## Approaches considered
- **A (dipilih):** endpoint agregasi langsung dari DB (`_sum`, `_count`, group by product) + test e2e. Minimal, tanpa tabel baru.
- **B:** tabel laporan terpisah + job harian. Overkill untuk demo; ditolak (YAGNI).
- **C:** laporan di frontend (hitung dari list orders). Tidak scalable; ditolak.

## Design (ringkas)
- `AdminReportsController` (`GET /admin/reports/summary`) di modul admin, guard admin.
- `AdminReportsService` mengagregasi: total revenue (sum `Order.total` status PAID/PROCESSING/SHIPPED/COMPLETED), total orders, top products (group `OrderItem` by productId, sum qty, sort desc, limit 5).
- Pengujian wajib: (1) dua checkout bersamaan untuk 1 stok → satu sukses, satu gagal tanpa stok minus; (2) webhook dikirim 3x → satu pembayaran/efek; (3) checkout setelah `expires_at` → pesanan kadaluarsa (ditolak/auto-cancel).

## Open decisions settled by me
- Laporan hanya status yang sudah dibayar (PAID+) untuk revenue; orders count semua status.
- Top products limit 5.
- Pengujian concurrency memakai `Promise.all` dua request checkout (sudah terbukti atomik via `UPDATE ... WHERE stock >= qty`).

## Approaches picked by human partner
Scope M7 yang disetujui: ADM-04 + 3 pengujian wajib; voucher, RUN-02, frontend checkout ditunda.
