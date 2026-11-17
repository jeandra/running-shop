# Design: Milestone 3 — Product Detail Page

**Date:** 2026-11-18
**Status:** Approved (scope agreed in conversation)
**Spec source:** `DESIGN.md`

## Intent

Add a product detail page at `/products/[slug]` that reuses the storefront shell (full-bleed video backdrop + glass panel) and shows product info, size/variant selector with stock, specs, description, and a visual-only "ADD TO CART" button. Wire the catalog card to navigate to detail.

## Goals
- Route `/products/[slug]` (server component), fetch `GET /products/:slug`.
- Reuse storefront shell (backdrop + glass panel).
- Back link to `/`.
- Product image, brand, name, price.
- Size selector chips from variants (sizeEu), stock-aware (out-of-stock greyed + disabled).
- Specs block (weight, drop, stack, cushioning, support, terrain) — only non-null rows.
- Description.
- "ADD TO CART" button visual-only (disabled, tooltip "Segera").
- Catalog card wraps in `next/link` to detail.

## Non-goals
- No cart backend (next milestone).
- No size selection state persistence (no cart).
- No reviews/ratings.
- No related products.

## Approach

- Extract storefront shell (backdrop + glass panel container) into `apps/web/src/components/storefront-shell.tsx` so catalog and detail share it.
- Catalog page uses shell with existing panel content.
- Detail page uses shell with detail panel content.
- Size chips are static (no state) — visual only; stock shown.

## Verification
- lint + build pass; visual check.

## Risks
- Image large; use next/image with sizes.
- Out-of-stock variants still listed (greyed) per API (variants include stock 0? Actually API returns all active variants including stock 0). Show them greyed.
","path":"C:\\Users\\Pc One\\projek\\E-commerce\\docs/superpowers/specs/2026-11-18-milestone-3-product-detail-design.md