# Change Proposal: Admin Panel for Product Management

> **Status**: IMPLEMENTED — panel admin construido (admin.html + admin.js) y
> verificado en vivo: login OK, bucket `product-images` creado, alta de
> producto con imagen OK, catálogo público mostrando la imagen.
> Pendiente opcional: replicar el link del footer en las demas paginas.

## Intent

Give the store administrator a protected panel to **add products** with
**image upload**, backed by a real data server (Supabase) instead of code
edits and redeploys.

## Problem Statement

Today the only way to add or change a product is to edit `catalog.js`
(`PRODUCTS` array) or the database seed and redeploy. There is no admin
interface, and product images are static files referenced by URL.

## Requirements (preview)

1. **Admin role/claim**: only the administrator can create/update products
   and promotions. RLS must stop any other authenticated user from writing.
   (The current schema allows any authenticated user to write — this change
   must restrict that.)
2. **Product creation form**: name, category, price, description, featured
   flag, stock, and **image upload**.
3. **Image upload to Supabase Storage**: images live in a Storage bucket
   (`product-images`), public-read; the product row stores the public URL.
4. **Admin auth**: reuse the existing Supabase Auth login flow; the app
   checks an `is_admin` claim/flag before exposing the panel route/nav item.
5. **UI**: a dedicated `admin.html` page (or `/admin` route) listing existing
   products with edit/delete and a create form.

## Non-Goals (this phase)

- No order management, payments, or inventory analytics.
- No image resizing/optimization pipeline (can be added later).

## Resolved Decisions

- Admin identity: dedicated `admin_users` table + `is_admin()` SECURITY
  DEFINER function (not user metadata).
- Storage bucket: `product-images`, fully public read, admin-only write via
  policies on `storage.objects`.
- Client image handling: file input with preview, MIME allow-list
  (JPG/PNG/WEBP/GIF), 2MB max.