-- ============================================================
-- laSolutions - Storage para imagenes de productos
-- Corre en el SQL Editor del proyecto NUEVO, DESPUES de schema.sql
-- Crea el bucket publico 'product-images' y las politicas de acceso:
--   - lectura publica (las imagenes se muestran a todos)
--   - escritura SOLO para admins del sitio (is_admin)
-- Idempotente: se puede re-ejecutar sin errores.
-- ============================================================

-- 1. Bucket publico 'product-images' (si no existe lo crea)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- 2. Lectura publica de las imagenes
drop policy if exists "product-images public read" on storage.objects;
create policy "product-images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- 3. Escritura (insert/update/delete) solo para administradores
drop policy if exists "product-images admin write" on storage.objects;
create policy "product-images admin write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());