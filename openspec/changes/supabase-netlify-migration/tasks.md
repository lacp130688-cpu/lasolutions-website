# Tasks: Supabase + Netlify Migration

> Status: all implementation tasks complete. The only pending action is the
> owner filling in real credentials in `public/js/supabase-config.js`.

## Database

- [x] T1 — Write `supabase/schema.sql`: tables `products`, `promotions`,
      `contact_messages`; indexes; seed data (9 products, 4 promotions);
      RLS policies; auxiliary `get_products_with_promo()` function.

## Frontend data layer

- [x] T2 — Create `public/js/supabase-config.js` with client factory and
      credential placeholders.
- [x] T3 — Rewrite `public/js/catalog.js`: `loadSiteData()` fetches products
      + promotions, merges promo pricing, keeps filtering/sort/rendering;
      featured products use the `featured` flag.
- [x] T4 — Rewrite `public/js/promotions.js`: data from `window.PROMOTIONS`,
      idempotent `applyPromotions()`, graceful empty states, real countdowns
      from stored `ends_at`.
- [x] T5 — Create `public/js/contact.js` with `submitContactMessage()`.

## Authentication

- [x] T6 — Rewrite `public/js/auth.js` on Supabase Auth: `getCurrentUser`,
      `isLoggedIn`, `login`, `register(name, email, password, phone)`,
      `logout`, `onAuthChange`. Remove all `localStorage` auth.
- [x] T7 — Update `public/js/app.js`: async navbar auth state via
      `renderNavAuth` + `onAuthChange`, async `handleLogout`.

## Pages

- [x] T8 — Add Supabase CDN + `supabase-config.js` script tags to all 7 HTML
      pages with correct relative order.
- [x] T9 — Update inline init: index (`loadSiteData` + featured + promo
      banner), catalog, promotions.
- [x] T10 — Rewrite login page inline script for async Supabase login.
- [x] T11 — Rewrite register page inline script for async Supabase
      registration including the phone field.
- [x] T12 — Rewrite contact page inline script to persist messages via
      `submitContactMessage`.

## Hosting

- [x] T13 — Create `netlify.toml` (publish `public/`, headers, caching, SPA
      redirect), `public/_headers`, `public/_redirects`.
- [x] T14 — Move site content under `public/`.
- [x] T15 — Update `.gitignore` to exclude env/secrets.

## Owner follow-up (blocking go-live)

- [ ] T16 — Replace `SUPABASE_URL` and `SUPABASE_ANON_KEY` placeholders in
      `public/js/supabase-config.js`.
- [ ] T17 — Run `supabase/schema.sql` in the Supabase SQL Editor.
- [ ] T18 — Connect the repo to Netlify (publish dir `public/`, no build
      command) and redeploy after credentials are set.