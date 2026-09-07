# Project: laSolutions Website

## Overview

Static e-commerce storefront for laSolutions (computer hardware / gaming
gear). Vanilla HTML/CSS/JS (no build step), data served by Supabase
(Postgres + Auth + Storage), hosted on Netlify. No framework, no build
toolchain: plain ES5-compatible browser JavaScript loaded via CDN.

## Conventions

- UI strings are Spanish **without accents** (e.g. `catalogo`, `sesion`).
- JavaScript is ES5 style (`var`/`function`) across the public site.
- Script order on every page: Supabase CDN → `supabase-config.js` →
  `app.js` → `auth.js` → `data-fallback.js` → page logic → inline init.
- Contract functions (loadSiteData, renderFeaturedProducts,
  renderBrandsStrip, scrollCarousel, initFeaturedCarousel, ...) must not be
  renamed without updating every caller.
- Received credentials (`SUPABASE_URL`, publishable key) are public-client
  values. The `service_role` key must never enter this repository.

## Requirements

### REQ-P1: Public catalog
The site renders products and promotions from Supabase, filtered and sorted
on the client. Any backend/CND failure falls back to the bundled local
dataset (`data-fallback.js`: 28 products, 6 promotions) so the page never
renders empty.

### REQ-P2: Product detail
Clicking a product opens a modal with description, specs, pricing, and
add-to-cart. The modal must show the product's real image (absolute URLs
must never get a base-path prefix).

### REQ-P3: Cart
Client-side cart with add/remove, quantity, and totals. Persist across
sessions without a server.

### REQ-P4: Authentication
Supabase Auth handles register/login/logout (`auth.js`). Session state
renders in the navbar via `onAuthChange`.

### REQ-P5: Contact messages
The contact page persists messages to `contact_messages` (public insert,
admin-only read).

### REQ-P6: Admin panel
`pages/admin.html` is the only admin surface: product/promotion CRUD and
message inbox. Access requires an authenticated session whose user is in
`admin_users` (checked via `is_admin()`).

### REQ-P7: Admin-only database writes
RLS policies restrict `INSERT`/`UPDATE`/`DELETE` on `products`,
`promotions`, and `contact_messages` to admin users. Anonymous users keep
public read access.

### REQ-P8: Product images in Supabase Storage
Images upload to the public `product-images` bucket; the product row stores
the public URL. The catalog must display uploaded images directly from the
Storage URL.

### REQ-P9: Showroom home
The index renders a featured-products carousel (autoplay, pauses on hover /
hidden tab / reduced motion) and an infinite brands marquee.

## Implemented changes

- `changes/supabase-netlify-migration` — Supabase + Netlify migration.
- `changes/admin-panel` — admin panel with product/promotion CRUD, storage
  uploads, and RLS hardening.