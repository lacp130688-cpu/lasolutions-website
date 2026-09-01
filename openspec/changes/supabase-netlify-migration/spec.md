# Spec: Supabase + Netlify Migration

## Requirements

### R1 — Production data in Supabase

- **R1.1** Products live in table `public.products` (id, name, category,
  brand, price, original_price, description, specs jsonb, image, featured,
  active, created_at).
- **R1.2** Promotions live in table `public.promotions` (product_id FK,
  discount, sale_price, label, starts_at, ends_at, active).
- **R1.3** The catalog page loads products and active promotions from
  Supabase on page load and merges promo pricing before rendering.
- **R1.4** The home page renders featured products from the `featured` flag.
- **R1.5** The promotions page renders deals and countdowns from the stored
  `ends_at` timestamps.
- **R1.6** `public.products` and `public.promotions` are publicly readable
  (anon) and writable only by authenticated roles.

### R2 — Real authentication

- **R2.1** Registration calls `supabase.auth.signUp` with name and phone in
  user metadata.
- **R2.2** Login calls `supabase.auth.signInWithPassword`; wrong credentials
  produce a friendly Spanish error.
- **R2.3** The navbar reflects the live session via
  `supabase.auth.onAuthStateChange`.
- **R2.4** Logout calls `supabase.auth.signOut` and redirects home.
- **R2.5** No password or user data is ever stored in `localStorage`.

### R3 — Contact messages persisted

- **R3.1** Submitting the contact form inserts a row into
  `public.contact_messages` (name, email, subject, message).
- **R3.2** RLS allows anonymous inserts and restricts reads to authenticated
  roles.
- **R3.3** Success/failure feedback comes from the actual insert result.

### R4 — Netlify deployment

- **R4.1** `netlify.toml` publishes `public/` with no build command.
- **R4.2** Security headers are applied (nosniff, X-Frame-Options DENY,
  Referrer-Policy, Permissions-Policy).
- **R4.3** Static assets under `assets/` are cached immutably.
- **R4.4** Unknown routes fall back to `index.html` (SPA redirect).
- **R4.5** Secrets are excluded via `.gitignore` (`.env`, `.env.*`).

## Scenarios

### SC1 — Catalog with active promotion
Given Supabase has product 4 at 1499 with a promotion at 1349,
When the user opens the catalog,
Then the product is listed with original price 1499, sale price 1349, and a
discount badge.

### SC2 — Registration with existing email
Given a user already registered with `a@b.com`,
When a second user tries to register with the same email,
Then the form shows "Este correo ya esta registrado." and no account is
created.

### SC3 — Contact message persisted
Given the contact form is filled with valid data,
When the user submits,
Then a row appears in `contact_messages` and the form shows the success
alert.

### SC4 — Anonymous data protection
Given RLS is enabled,
When an anonymous visitor queries `contact_messages`,
Then zero rows are returned (select denied) while inserts succeed.

### SC5 — Live navbar session
Given a user signs in,
When the auth state changes,
Then the navbar switches from "Iniciar sesion / Registrarse" to
"Hola, <nombre> / Cerrar sesion" without a page reload.