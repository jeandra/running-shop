# Milestone 3 — Product Detail Page Implementation Plan

**Goal:** Add `/products/[slug]` detail page reusing storefront shell; wire catalog card to detail.

**Architecture:** Extract shell (backdrop + glass panel) to shared component. Catalog page refactor to use shell. New detail route. Size chips stock-aware. Visual-only add-to-cart.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-11-18-milestone-3-product-detail-design.md`

## Tasks

### Task 1: Extract storefront shell
- Create `apps/web/src/components/storefront-shell.tsx` (backdrop video + glass panel container, accepts `children`).
- Refactor `page.tsx` (catalog) to use it.

### Task 2: Product detail route
- Create `apps/web/src/app/products/[slug]/page.tsx`.
- Fetch detail, render back link, image, brand/name/price, size chips, specs, description, visual-only button.

### Task 3: Wire catalog card to detail
- Wrap card in `next/link` to `/products/[slug]`.

### Task 4: Verify + commit
- lint + build + visual check.

## Self-Review
- Spec coverage: all goals mapped. ✅
- Type consistency: ProductDetail type added. ✅
","path":"C:\\Users\\Pc One\\projek\\E-commerce\\docs/superpowers/plans/2026-11-18-milestone-3-product-detail.md