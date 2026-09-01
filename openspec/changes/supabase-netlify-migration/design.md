# Design: Supabase + Netlify Migration

## Architecture

```
Browser (static SPA — public/)
  │
  ├── supabase-js (CDN UMD) ──> js/supabase-config.js (client factory)
  │       │
  │       ├── js/auth.js        Supabase Auth: signUp / signInWithPassword / signOut / onAuthStateChange
  │       ├── js/catalog.js     loadSiteData(): products + promotions merge; filtering/rendering
  │       ├── js/promotions.js  deals, countdowns, promo banner (data from window.PROMOTIONS)
  │       └── js/contact.js     insert into contact_messages
  │
  └── Netlify (publish: public/)
        ├── netlify.toml        build config, security headers, caching, SPA redirect
        ├── _headers             plain file headers (same rules)
        └── _redirects           SPA fallback
```

## Data Model

- `products` — catalog items. `specs` is a `jsonb` array of feature strings.
  `featured` marks home-page items; `active` soft-deletes.
- `promotions` — sale price (`sale_price`), `discount` percentage, and a real
  `ends_at` timestamp that drives countdowns.
- `contact_messages` — immutable inbound form rows, RLS: insert for anon,
  select for authenticated only.

## Key Decisions

1. **No build step.** The site is vanilla HTML/CSS/JS. Supabase JS client is
   loaded from `cdn.jsdelivr.net` as a UMD global, and
   `supabase-config.js` replaces the global with the configured client
   instance (`window.supabase`). This keeps every existing relative path and
   the zero-dependency property intact.
2. **Single load function.** `loadSiteData()` fetches both products and
   active promotions, derives the legacy `window.PROMOTIONS` shape, merges
   promo prices into product objects, and guards against double loads via
   `PRODUCTS_LOADED`.
3. **Async-first auth.** All auth functions return Promises. `app.js`
   renders the navbar from a session callback (`onAuthChange`) so the UI
   updates live.
4. **Numeric coercion.** Postgres `numeric` columns arrive as strings; the
   data layer converts with `Number()` before rendering/sorting prices.
5. **Placeholder credentials.** `supabase-config.js` ships with
   `SUPABASE_URL` / `SUPABASE_ANON_KEY` placeholders; the owner replaces
   them. The anon key is public by design (RLS protects the data), but real
   values must not be committed for sensitive projects.
6. **Graceful degradation.** If the DB is unreachable, `loadSiteData()`
   resolves to empty arrays and logs, so pages render empty states instead
   of throwing.

## RLS Matrix

| Table | Select | Insert | Update/Delete |
|---|---|---|---|
| `products` | anon: true | authenticated | authenticated |
| `promotions` | anon: true | authenticated | authenticated |
| `contact_messages` | authenticated | anon: true | — |

## Deployment Flow

1. Owner runs `supabase/schema.sql` in the Supabase SQL Editor.
2. Owner sets `SUPABASE_URL` and `SUPABASE_ANON_KEY` in
   `js/supabase-config.js`.
3. Owner connects the repo to Netlify (publish dir `public/`, no build
   command) or runs the Netlify CLI.