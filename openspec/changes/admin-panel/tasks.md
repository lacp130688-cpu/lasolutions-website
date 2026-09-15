# Tasks: Admin Panel for Product Management

> Status: all implementation tasks complete and verified live on 2026-09-07
> (login OK, bucket created, product with image created and shown in the
> public catalog). Owner follow-ups below are optional polish.

## Database hardening

- [x] T1 — Add `admin_users` table (`user_id` → `auth.users`) and the
      `public.is_admin()` SECURITY DEFINER function to `supabase/schema.sql`.
- [x] T2 — Restrict write policies on `products`, `promotions`, and
      `contact_messages` to `public.is_admin()` (anonymous keeps read-only;
      non-admin authenticated users keep read-only).

## Frontend data layer

- [x] T4 — Harden `public/js/supabase-config.js`: create the client **always**
      (the CDN UMD global is the module container, not a client), fall back to
      `window.supabase = null` on CDN failure.
- [x] T5 — Harden `loadSiteData()` in `public/js/catalog.js`: check the
      client, wrap in try/catch, always render (fallback on any error).

## Admin panel

- [x] T6 — Create `public/pages/admin.html`: login view, logout, tabs
      (products / promotions / messages), product and promotion forms with
      image preview.
- [x] T7 — Create `public/js/admin.js`: session check → `is_admin()` gate,
      sign in/out, full CRUD for products and promotions, message inbox,
      image upload validation (JPG/PNG/WEBP/GIF, max 2MB) to the
      `product-images` bucket.
- [x] T8 — Add the Admin link to the index footer.

## Error visibility

- [x] T9 — Add `.catch` handlers to every Promise in `admin.js` (loads,
      saves, deletes, uploads) so failures always surface on screen instead
      of failing silently.

## Live verification

- [x] T10 — Fixed sequence desync (`duplicate key ... products_pkey`) by
      syncing `products_id_seq`/`promotions_id_seq`/`contact_messages_id_seq`
      to `max(id)`.
- [x] T11 — Created the `product-images` storage bucket (public) and the
      admin insert/delete policies on `storage.objects`.
- [x] T12 — Verified live: admin login, product creation with image upload,
      and public catalog showing the uploaded image (fixed via
      `resolveImageUrl()`).

## Owner follow-ups

- [x] T13 — Replicate the Admin footer link to the other pages (about,
      catalog, contact, login, promotions, register) — done 2026-09-07.
- [ ] T14 — Revisit panel loading speed: load timing instrumented
      (`load-stats` shows ms per section); waiting for a live measurement to
      confirm whether any optimization is needed.