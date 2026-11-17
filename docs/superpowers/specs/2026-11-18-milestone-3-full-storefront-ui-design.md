# Design: Milestone 3 — Full Storefront UI (Glass Panel)

**Date:** 2026-11-18
**Status:** Approved (approach agreed in conversation)
**Spec source:** `DESIGN.md` (Sneak in Peace style reference)

## Intent

Transform the minimal Task 1 catalog page into the full design-faithful storefront: a full-bleed media backdrop with a translucent glass panel pinned to the right edge carrying all interactive UI (tabs, schedule toggle, view counter, now-playing card, artist bar, scrollable product list). The product list itself stays server-fetched from the catalog API.

## Goals
- Full-bleed `<video>` backdrop (muted, loop, autoplay) with poster image fallback.
- Glass panel: ~35% width, full viewport height, translucent white (70%), backdrop-blur, 6px radius, soft shadow.
- Panel contents (top → bottom, 12–16px gaps): tab bar → schedule toggle → view counter → now-playing card → artist bar → scrollable product list.
- Reuse existing product card (Task 1) inside the scrollable list.
- Load RecklessNeue-Book from provided woff2 for editorial title.
- Use provided Lucide SVGs (eye, circle-arrow-right, external-link).

## Non-goals / out of scope
- No backend for tabs/wishlist/schedule/view counter — these are visual-only (static state) in this milestone.
- No real "now playing" data source — hardcoded editorial placeholder text.
- NTNeuss font: fallback to Inter/system (file not provided); swap later.
- No client-side interactivity beyond `<video>` autoplay; tabs/toggle are static markup (no state).

## Approach

Single Next.js App Router route `/` (server component). All sections server-rendered. Media + glass panel are pure layout (CSS). Product list fetches `GET /products?limit=12` as before. No new dependencies.

Approaches considered:
- **(a) Full layout with placeholders** ← chosen. Matches DESIGN.md; visual-only elements are honest (no fake interactivity).
- **(b) Scope down to panel + list + now playing.** Rejected: user provided all assets and asked for full UI.

## Components (new/changed in `apps/web/src/app/page.tsx` + `layout.tsx`)
- `Backdrop`: `<video>` + poster, `object-cover`, full viewport, muted/loop/autoplay/playsInline.
- `GlassPanel`: translucent container, right-pinned, scroll-y on product list only.
- `TabBar`: 3 segments, "Sneak" active (smoke fill).
- `ScheduleToggle`: LIVE (red) + SCHEDULE (outlined), LIVE active.
- `ViewCounter`: eye icon + "284".
- `NowPlayingCard`: opaque white tile, "NOW PLAYING" label (NTNeuss 10px/500, tracking 0.6px), serif title 21px, body 12px.
- `ArtistBar`: 26px circular avatar (initials) + brand name 12px/500 + URL 11px + arrow icon.
- `ProductList`: reuse existing card, scrollable.

## Assets (in `apps/web/public/`)
- `7877137-uhd_4096_2160_25fps.mp4` — backdrop
- `florian-kurrasch-HyivyCRdz14-unsplash.jpg` — poster fallback
- `eye.svg`, `circle-arrow-right.svg`, `external-link.svg` — icons
- `reckless-neue/RecklessNeue-Book.woff2` — editorial font

## Calls I made
- NTNeuss → Inter (Google Fonts via `next/font/google`) as fallback; documented as substitute per DESIGN.md.
- Now Playing title/description: hardcoded placeholder ("Quiet Motion" / short editorial line).
- Artist bar brand: use first product's brand from API; avatar = first letter; URL = placeholder.
- View counter: static "284".
- Default active tab: "Sneak"; default schedule: "LIVE".
- Video compressed? No — use as-is with `poster` and `preload="metadata"`.

## Verification
- `npm run lint --workspace apps/web` + `npm run build --workspace apps/web` pass.
- Visual check in browser (dev server).

## Risks / known limits
- Video file ~19MB; `preload="metadata"` + poster mitigates initial load.
- Icons are Lucide (stroke-width 2) — design says 1px stroke; acceptable for prototype, swap to 1px later if desired.
- Tabs/schedule/view counter are non-functional (visual only) — upgrade when backends exist.
- Shortcut: `shortcut: visual-only tabs/schedule/view-counter, upgrade when wishlist/schedule/view-counter endpoints exist`.
