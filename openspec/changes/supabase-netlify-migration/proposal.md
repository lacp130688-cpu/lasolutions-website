# Change Proposal: Supabase + Netlify Migration

## Intent

Adapt the laSolutions static website from hardcoded data and client-side
`localStorage` authentication to a real backend: **Supabase** for the
database, authentication, and contact-message storage, and **Netlify** for
static hosting and deployment.

## Problem Statement

The website currently ships with:

- Products hardcoded in `catalog.js` (`PRODUCTS` array) — any product change
  requires a code edit and redeploy.
- Promotions hardcoded in `promotions.js` (`PROMOTIONS` array) with runtime
  fake countdowns.
- Authentication based on `localStorage` with a non-cryptographic hash —
  insecure by design, no real session management, no account recovery.
- A contact form that simulates submission and saves nothing.
- No hosting or deployment configuration.

## Goals

1. Centralize product and promotion data in a Postgres database managed by
   Supabase, protected with Row Level Security (RLS).
2. Replace fake auth with Supabase Auth (email/password) and live session
   state in the navbar.
3. Persist contact messages in the database.
4. Make the site deployable on Netlify with security headers, caching, and an
   SPA fallback.
5. Keep the project dependency-free: vanilla JS + Supabase JS client from a
   CDN. No build step.

## Non-Goals

- No e-commerce checkout or payments.
- No admin panel (content is managed via the Supabase Dashboard/SQL).
- No SSR or server functions: the site stays a static SPA.
- No framework migration (React/Vue/etc.).

## Approach

- Move site content under `public/` (Netlify publish directory).
- Add `netlify.toml`, `_headers`, `_redirects`.
- Add `supabase/schema.sql` with tables, indexes, seed data, RLS policies.
- Load data through Supabase REST via `loadSiteData()`.
- Replace `auth.js` with Supabase Auth calls.
- Wire the contact form to the `contact_messages` table.
- Provide `js/supabase-config.js` with placeholder credentials for the owner
  to fill in.

## Open Questions

- Owner must supply the Supabase project URL and anon key before the site
  goes live (placeholders remain until then).
- Owner decides whether Supabase email confirmation is enabled in their
  project (registration flow reports it gracefully either way).