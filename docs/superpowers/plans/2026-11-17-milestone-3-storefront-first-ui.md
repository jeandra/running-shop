# Milestone 3 — First Storefront UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (execution method already chosen by the human partner: Native — implement inline in this session, then one fresh reviewer on the whole branch at the end).

**Goal:** Build the first storefront UI page for Milestone 3 — the public product catalog — consuming the Milestone 2 catalog API and styled per the approved DESIGN.md.

**Architecture:** New `apps/web` workspace (Next.js App Router + Tailwind v4) hosting a single route `/` that server-fetches `GET /products` from the NestJS API and renders the design's glass-panel product list with product cards. Styling via design tokens (CSS custom properties / Tailwind v4 `@theme`).

**Tech Stack:** Next.js (App Router) + React + Tailwind v4 + TypeScript; server-side data fetch against the API via env-configured base URL.

**Spec:** `DESIGN.md` at repo root (user-created style reference for the "Sneak in Peace" concept; noted deviation from the superpowers design-doc location convention `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`).

## Global Constraints

- Color tokens exactly as in DESIGN.md: ink black `#000000`, charcoal `#3d3d3d`, concrete, ash, smoke, paper white `#ffffff`, bone `#f0eeed`, liberty navy `#142161`, signal red `#ba2223`. No additional accent colors.
- Typography: NTNeuss (weights 400/500) for all UI text; RecklessNeue (weight 400) for editorial/narrative titles only. NTNeuss sizes capped at 14px; RecklessNeue capped at 21px. NTNeuss letter spacing 0.036–0.122em at sizes ≤ 12px.
- Spacing scale: 4, 5, 6, 7, 8, 10, 11, 12, 16, 20, 24, 30, 40. Border radius: 6px (26px avatars). Shadow: `rgba(0, 0, 0, 0.08) 1px 1px 6px -1px`. Layout: max-width 420px, card padding 16px, element gap 6px.

## Review Focus

- Mapping the design's Product Card (64px thumbnail + name/SKU + SHOP tag) onto the API's `ProductListItem`, which has no SKU field — display decision.
- Web font loading strategy for NTNeuss / RecklessNeue (fallback stacks acceptable per design substitutes).
- Glass panel `backdrop-filter` behavior in the chosen framework.
- Data-fetch strategy (server component) and API base URL configuration.
- 420px max-width behavior on wide screens.

---

## Tasks

### Task 1: First storefront UI — public product catalog page

**Files:**
- Create: `apps/web/*` (Next.js workspace scaffold), `apps/web/src/app/page.tsx` (or equivalent App Router route file)
- Modify: —

**Interfaces:**
- Consumes: `GET /products?limit=...` → `{ items: [{ id, name, slug, brand, gender, price, image, category, stockTotal }], page, limit, total, totalPages }` from the catalog API (Milestone 2).
- Produces: —

- [ ] **Step 1: Scaffold `apps/web` workspace (Next.js App Router + Tailwind v4) so `npm run build --workspace apps/web` passes**

Setup/config steps fold into the task whose deliverable needs them; no separate setup task.

- [ ] **Step 2: Create the `/` route as a server component that fetches the product list from the API**

- [ ] **Step 3: Render the design-compliant product list UI (glass panel, product cards, design tokens)**

- [ ] **Step 4: Verify the build passes and commit**

## Self-Review

1. **Spec coverage:** Design intent (media-first, glass panel, monochrome, compact tokens) covered by Task 1's render step; design parts beyond the first page (tabs, now playing, wishlist) correctly out of scope for this task (YAGNI on first UI).
2. **Step scan:** Each step = one reasonable action with checkable result (scaffold build passes; route exists fetching; render done; verify+commit). No "TBD"-style vagueness.
3. **Type consistency:** Single task; consumed API shape documented; no cross-task type conflicts.
4. **Review Focus:** All five items mapped to the task's render/verify steps.
5. **Proportion:** Short plan; no code transcribed.

---

Plan saved to `docs/superpowers/plans/2026-11-17-milestone-3-storefront-first-ui.md`.
