# Design: Milestone 4 — Keranjang (Cart)

**Date:** 2026-11-18
**Status:** Approved (scope agreed in conversation)

## Intent

Implement a working cart: guest + logged-in users, backed by DB, with add/view/update/remove, and a `/cart` page. Wires the previously visual-only "ADD TO CART" button on the product detail page.

## Goals
- Schema: `Cart` supports optional `userId` and `sessionId` (guest). Migration.
- Cart API: `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`. Works for guest (session cookie) and logged-in (JWT). Merges guest cart into user cart on login.
- Frontend detail page: size selection + functional add-to-cart (with feedback).
- Frontend `/cart` page: items, quantity adjust, remove, subtotal, link to checkout (placeholder).
- Cart count badge in storefront panel header.

## Non-goals
- No checkout/payment (next milestone).
- No stock reservation on add (just display).
- No cart expiration/cleanup.

## Approach
- Guest session id via httpOnly cookie `cart_session` (uuid generated server-side). Parse cookie manually (no new dep).
- Auth login merges guest cart if cookie present.
- Cart service resolves cart from request (user or session).
- Frontend: detail page becomes client component for size selection + add; cart page server-fetched with no-store.

## Verification
- e2e tests for cart endpoints; lint+build; visual check.
","path":"C:\\Users\\Pc One\\projek\\E-commerce\\docs/superpowers/specs/2026-11-18-milestone-4-cart-design.md