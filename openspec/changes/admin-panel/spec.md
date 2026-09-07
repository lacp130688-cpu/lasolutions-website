# Change Spec: Admin Panel for Product Management (Deferred)

> **Status**: IMPLEMENTED — ver REQ-ADM-1 (hecho via `admin_users` + `is_admin()`),
> REQ-ADM-2/3 (form + upload a bucket `product-images`), REQ-ADM-4 (admin.html).

## Requirements

### REQ-ADM-1: Admin-only write access

The system must restrict `INSERT`/`UPDATE`/`DELETE` on `products` and
`promotions` to the administrator.

- RLS policies must reference the admin identity (profiles table or custom
  claim).
- Non-admin authenticated users keep read-only access.
- Anonymous users keep public read access.

### REQ-ADM-2: Product creation with image upload

An authenticated admin must be able to create a product with:

- name, category, price, description, featured flag, stock
- image upload (file input with preview)

### REQ-ADM-3: Stored image URL

Uploaded images must be stored in a Supabase Storage bucket and the product
row must reference the resulting public URL.

### REQ-ADM-4: Admin panel UI

A protected page listing existing products with create / edit / delete
actions, hidden from non-admins.

## Scenarios

- SCEN-ADM-1: Admin logs in, opens the panel, creates a product with an
  image; the product and image appear in the public catalog after save.
- SCEN-ADM-2: Non-admin authenticated user opens the panel URL; they are
  redirected or shown a permission error. Direct API writes are rejected by
  RLS.
- SCEN-ADM-3: Image upload fails (bucket unreachable); the form shows an
  error and no product row is created.

## Non-Requirements

- No image transformation/resizing.
- No multi-level admin roles.