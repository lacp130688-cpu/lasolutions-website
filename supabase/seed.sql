-- ============================================================
-- laSolutions - SEED de datos (generado desde fallback.ts)
-- Corre en el SQL Editor del proyecto NUEVO, DESPUES de schema.sql
-- Idempotente: se puede re-ejecutar sin duplicar.
-- ============================================================

insert into public.products (id, name, category, brand, price, original_price, description, specs, image, featured, active) values
  (1, 'laSolutions Pro Desktop', 'Escritorio', 'laSolutions', 764, 899, 'Potente escritorio para profesionales. Ideal para oficina, desarrollo y multitarea exigente.', '["Intel Core i5-13400","16GB DDR4 RAM","512GB SSD NVMe","Windows 11 Pro"]'::jsonb, 'assets/placeholder.svg', true, true),
  (2, 'laSolutions Office Station', 'Escritorio', 'laSolutions', 649, 649, 'Estacion de trabajo compacta para tareas de oficina, navegacion y productividad basica.', '["Intel Core i3-12100","8GB DDR4 RAM","256GB SSD","Windows 11 Home"]'::jsonb, 'assets/placeholder.svg', false, true),
  (3, 'laSolutions Creator Desktop', 'Escritorio', 'laSolutions', 1299, 1299, 'Estacion creativa para editores de video, diseno grafico y modelado 3D.', '["Intel Core i7-13700","32GB DDR5 RAM","1TB SSD NVMe","Windows 11 Pro"]'::jsonb, 'assets/placeholder.svg', false, true),
  (4, 'laSolutions Gamer Elite', 'Gaming', 'laSolutions', 1349, 1499, 'PC gaming de gama media-alta para jugar en 1440p con altas tasas de Frames.', '["AMD Ryzen 7 7800X","NVIDIA RTX 4070 12GB","32GB DDR5 RAM","1TB SSD NVMe"]'::jsonb, 'assets/placeholder.svg', true, true),
  (5, 'laSolutions Gamer Ultra', 'Gaming', 'laSolutions', 2199, 2199, 'La bestia gaming definitiva. Rendimiento extremo en 4K y streaming simultaneo.', '["Intel Core i9-13900K","NVIDIA RTX 4080 16GB","64GB DDR5 RAM","2TB SSD NVMe"]'::jsonb, 'assets/placeholder.svg', false, true),
  (6, 'laSolutions Gamer Starter', 'Gaming', 'laSolutions', 999, 999, 'Tu primera PC gaming con rendimiento solido en 1080p para los juegos populares.', '["AMD Ryzen 5 7600","NVIDIA RTX 4060 8GB","16GB DDR5 RAM","512GB SSD NVMe"]'::jsonb, 'assets/placeholder.svg', false, true),
  (7, 'laSolutions Laptop Pro 15', 'Laptop', 'laSolutions', 879, 1099, 'Laptop profesional de 15.6 pulgadas con potencia para trabajar desde cualquier lugar.', '["Intel Core i7-13700H","16GB DDR5 RAM","512GB SSD NVMe","15.6\" Full HD IPS"]'::jsonb, 'assets/placeholder.svg', true, true),
  (8, 'laSolutions Laptop Ultra 14', 'Laptop', 'laSolutions', 1399, 1399, 'Laptop ultradelgada con pantalla 2K, perfecta para profesionales exigentes.', '["Intel Core i7-13700H","32GB DDR5 RAM","1TB SSD NVMe","14\" 2K IPS 120Hz"]'::jsonb, 'assets/placeholder.svg', false, true),
  (9, 'laSolutions Laptop Essential', 'Laptop', 'laSolutions', 449, 599, 'Laptop accesible para estudios, oficina y uso diario. Excelente relacion precio-calidad.', '["Intel Core i5-1235U","8GB DDR4 RAM","256GB SSD","14\" Full HD"]'::jsonb, 'assets/placeholder.svg', false, true),
  (10, 'Asus ROG Strix G16', 'Gaming', 'Asus', 1399, 1399, 'Laptop gaming con RTX 4060 y pantalla de 16 pulgadas a 165Hz. Rendimiento serio para jugar y crear.', '["Intel Core i7-13650HX","NVIDIA RTX 4060 8GB","16GB DDR5 RAM","1TB SSD NVMe","16\" 165Hz"]'::jsonb, 'assets/placeholder.svg', true, true),
  (11, 'Asus TUF Gaming F15', 'Gaming', 'Asus', 854, 949, 'Gaming resistente con certificacion militar, ideal para sesiones largas y uso intensivo.', '["Intel Core i5-12500H","NVIDIA RTX 3050 6GB","16GB DDR5 RAM","512GB SSD NVMe"]'::jsonb, 'assets/placeholder.svg', false, true),
  (12, 'Asus VivoBook 15', 'Laptop', 'Asus', 549, 549, 'Laptop liviana y compacta para estudio, oficina y uso diario sin complicaciones.', '["AMD Ryzen 5 7520U","8GB RAM","512GB SSD","15.6\" Full HD"]'::jsonb, 'assets/placeholder.svg', false, true),
  (13, 'Dell XPS 13', 'Laptop', 'Dell', 1249, 1249, 'Ultrabook premium con panel OLED y chassis de aluminio. Diseno que se nota.', '["Intel Core i7-1355U","16GB RAM","512GB SSD","13.4\" OLED"]'::jsonb, 'assets/placeholder.svg', true, true),
  (14, 'Dell Alienware m16', 'Gaming', 'Dell', 1899, 1899, 'Gaming premium con refrigeracion Cryo-Tech y teclado mecanico para el jugador exigente.', '["Intel Core i9-13900HX","NVIDIA RTX 4070 8GB","32GB DDR5 RAM","1TB SSD NVMe","16\" QHD 240Hz"]'::jsonb, 'assets/placeholder.svg', false, true),
  (15, 'Dell Inspiron 15', 'Laptop', 'Dell', 599, 599, 'Laptop confiable para oficina, estudios y entretenimiento. La opcion segura del dia a dia.', '["Intel Core i5-1335U","8GB RAM","512GB SSD","15.6\" Full HD"]'::jsonb, 'assets/placeholder.svg', false, true),
  (16, 'Dell OptiPlex Tower', 'Escritorio', 'Dell', 729, 729, 'Desktop de oficina confiable con soporte empresarial y facil mantenimiento.', '["Intel Core i5-13500","16GB DDR4 RAM","512GB SSD","Windows 11 Pro"]'::jsonb, 'assets/placeholder.svg', false, true),
  (17, 'HP Pavilion 15', 'Laptop', 'HP', 579, 579, 'Laptop versatil para el dia a dia con buen rendimiento multimedia y audio nitido.', '["Intel Core i5-1235U","8GB RAM","512GB SSD","15.6\" Full HD"]'::jsonb, 'assets/placeholder.svg', false, true),
  (18, 'HP Omen 16', 'Gaming', 'HP', 1249, 1249, 'Gaming con refrigeracion eficiente, RGB personalizable y pantalla de alta tasa de refresco.', '["AMD Ryzen 7 7840HS","NVIDIA RTX 4060 8GB","16GB DDR5 RAM","1TB SSD NVMe","16.1\" 165Hz"]'::jsonb, 'assets/placeholder.svg', false, true),
  (19, 'HP Spectre x360', 'Laptop', 'HP', 1499, 1499, 'Convertible premium 2-en-1 con pantalla tactil 3K y acabado en dos tonos.', '["Intel Core i7-1355U","16GB RAM","1TB SSD","13.5\" 3K Touch"]'::jsonb, 'assets/placeholder.svg', false, true),
  (20, 'HP EliteDesk 800', 'Escritorio', 'HP', 689, 689, 'Desktop compacta para entornos profesionales con alto rendimiento por vatio.', '["Intel Core i5-13500","16GB DDR4 RAM","512GB SSD","Windows 11 Pro"]'::jsonb, 'assets/placeholder.svg', false, true),
  (21, 'Lenovo Legion 5', 'Gaming', 'Lenovo', 1149, 1149, 'Gaming equilibrado con excelente relacion rendimiento-precio y teclado comodo.', '["AMD Ryzen 7 7735HS","NVIDIA RTX 4060 8GB","16GB DDR5 RAM","512GB SSD NVMe","15.6\" 144Hz"]'::jsonb, 'assets/placeholder.svg', false, true),
  (22, 'Lenovo ThinkPad E14', 'Laptop', 'Lenovo', 769, 769, 'El clasico de oficina con teclado legendario y chassis resistente a pruebas rigurosas.', '["Intel Core i5-1335U","16GB RAM","512GB SSD","14\" Full HD"]'::jsonb, 'assets/placeholder.svg', false, true),
  (23, 'Lenovo IdeaPad 3', 'Laptop', 'Lenovo', 382, 449, 'Laptop economica para lo esencial: navegar, estudiar y trabajar sin vueltas.', '["AMD Ryzen 5 5500U","8GB RAM","256GB SSD","15.6\" Full HD"]'::jsonb, 'assets/placeholder.svg', false, true),
  (24, 'MSI Katana 15', 'Gaming', 'MSI', 1099, 1099, 'Gaming agresivo con pantalla 144Hz y refrigeracion dedicada para largas partidas.', '["Intel Core i7-13620H","NVIDIA RTX 4060 8GB","16GB DDR5 RAM","1TB SSD NVMe","15.6\" 144Hz"]'::jsonb, 'assets/placeholder.svg', false, true),
  (25, 'Acer Nitro V 15', 'Gaming', 'Acer', 849, 849, 'Gaming accesible para jugar en 1080p con generoso rendimiento por su precio.', '["Intel Core i5-13420H","NVIDIA RTX 4050 6GB","16GB DDR5 RAM","512GB SSD NVMe","15.6\" 144Hz"]'::jsonb, 'assets/placeholder.svg', false, true),
  (26, 'Acer Swift Go 14', 'Laptop', 'Acer', 749, 749, 'Ultrabook liviano con USB4 y bateria para todo el dia. Ideal para viajar.', '["Intel Core i5-13500H","16GB RAM","512GB SSD","14\" OLED"]'::jsonb, 'assets/placeholder.svg', false, true),
  (27, 'Apple MacBook Air 13 (M3)', 'Laptop', 'Apple', 1099, 1099, 'Ultraportatil con chip M3: silenciosa, sin ventilador y con bateria que dura todo el dia.', '["Apple M3","8GB memoria unificada","256GB SSD","13.6\" Liquid Retina"]'::jsonb, 'assets/placeholder.svg', true, true),
  (28, 'Apple MacBook Pro 14 (M3 Pro)', 'Laptop', 'Apple', 1599, 1599, 'Potencia pro con chip M3 Pro para creadores, desarrolladores y editores exigentes.', '["Apple M3 Pro","18GB memoria unificada","512GB SSD","14.2\" Liquid Retina XDR"]'::jsonb, 'assets/placeholder.svg', false, true)
on conflict (id) do update set name = excluded.name, category = excluded.category, brand = excluded.brand, price = excluded.price, original_price = excluded.original_price, description = excluded.description, specs = excluded.specs, image = excluded.image, featured = excluded.featured, active = true;

insert into public.promotions (product_id, discount, sale_price, label, starts_at, ends_at, active) values
  (1, 15, 764, 'Oferta de escritorio', now(), now() + interval '2 days 5 hours', true),
  (4, 10, 1349, 'Oferta gaming', now(), now() + interval '1 days 12 hours', true),
  (7, 20, 879, 'Oferta laptop', now(), now() + interval '3 days 8 hours', true),
  (9, 25, 449, 'Oferta laptop', now(), now() + interval '5 hours 30 minutes', true),
  (11, 10, 854, 'Oferta Asus TUF', now(), now() + interval '4 days 6 hours', true),
  (23, 15, 382, 'Oferta Lenovo', now(), now() + interval '1 days 20 hours', true)
on conflict (product_id) do update set discount = excluded.discount, sale_price = excluded.sale_price, label = excluded.label, ends_at = excluded.ends_at, active = true;

select setval(pg_get_serial_sequence('public.products', 'id'), (select max(id) from public.products));
