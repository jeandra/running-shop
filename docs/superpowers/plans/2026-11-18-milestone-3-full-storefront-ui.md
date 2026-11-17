# Milestone 3 — Full Storefront UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (execution method already chosen by the human partner: Native — implement inline in this session, then one fresh reviewer on the whole branch at the end). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full design-faithful storefront UI per DESIGN.md — full-bleed media backdrop + glass panel (tabs, schedule toggle, view counter, now-playing card, artist bar, scrollable product list) — reusing the Task 1 product card and catalog fetch.

**Architecture:** Single Next.js App Router route `/` (server component). Full-bleed `<video>` backdrop behind a right-pinned translucent glass panel. Panel contents stacked; product list scrolls internally. RecklessNeue loaded via `@font-face` from `/reckless-neue/RecklessNeue-Book.woff2`. Icons inlined as SVG. No new dependencies; no client state.

**Tech Stack:** Next.js 16 (App Router) + React 19 + Tailwind v4 + TypeScript. Catalog API `GET /products?limit=12`.

**Spec:** `docs/superpowers/specs/2026-11-18-milestone-3-full-storefront-ui-design.md`

## Global Constraints

- Colors exactly as DESIGN.md (ink black, charcoal, concrete, ash, smoke, paper white, bone, liberty navy, signal red). No extra accents.
- Typography: NTNeuss weights 400/500 (fallback Inter) for UI; RecklessNeue-Book weight 400 for editorial title only. NTNeuss ≤14px; RecklessNeue ≤21px.
- Spacing scale 4/5/6/7/8/10/11/12/16/20/24/30/40. Radius 6px (26px avatars). Shadow `rgba(0,0,0,0.08) 1px 1px 6px -1px`.
- Layout: max-width 420px panel, card padding 16px, element gap 6px. Panel ~30–35% viewport width, full height.
- No opaque full-width page backgrounds — media must show through.

## Review Focus

- Video backdrop load (19MB) — `preload="metadata"` + poster must keep initial paint fast.
- Glass panel must not scroll the page; only the product list scrolls internally.
- Backdrop-blur + translucent panel must not break text contrast.
- Now Playing title uses RecklessNeue (serif) — only place serif appears.
- Signal red only on LIVE badge — no other red.

---

### Task 1: Full storefront UI — media backdrop + glass panel + all sections

**Files:**
- Modify: `apps/web/src/app/page.tsx` (rewrite layout)
- Modify: `apps/web/src/app/globals.css` (add @font-face for RecklessNeue, keep tokens)
- Modify: `apps/web/src/app/layout.tsx` (load Inter via next/font/google as NTNeuss fallback)
- Test: `npm run lint --workspace apps/web` + `npm run build --workspace apps/web` + visual check

**Interfaces:**
- Consumes: `GET /products?limit=12` → `ProductList` (existing type).
- Produces: single page `/` with full design layout.

- [ ] **Step 1: Add RecklessNeue @font-face + Inter font loading**

In `globals.css`, add `@font-face` for RecklessNeue-Book (woff2). In `layout.tsx`, load Inter via `next/font/google` and apply as `--font-ntneuss` fallback (or keep system fallback). Keep `--font-recklessneue-book` pointing to the loaded family.

- [ ] **Step 2: Rewrite `page.tsx` with full layout**

Replace the minimal panel with:
- Full-bleed `<video>` backdrop (muted, loop, autoplay, playsInline, poster=jpg).
- Glass panel (right-pinned, full height, translucent, blur, scroll-y on product list only).
- Tab bar, schedule toggle, view counter, now-playing card, artist bar, product list (reuse card).

- [ ] **Step 3: Verify build + lint + visual check**

Run: `npm run lint --workspace apps/web && npm run build --workspace apps/web`
Expected: exit 0. Then open http://localhost:3000 and visually confirm layout.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "feat(web): full storefront UI per DESIGN.md"
```

## Self-Review

1. Spec coverage: all DESIGN.md components mapped (backdrop, glass panel, tabs, schedule, view counter, now playing, artist bar, product list, product card). ✅
2. Step scan: each step one action. ✅
3. Type consistency: reuses existing ProductList/ProductListItem. ✅
4. Review Focus: 5 items listed, each addressed in the layout. ✅
5. Proportion: short plan, no code transcript. ✅
