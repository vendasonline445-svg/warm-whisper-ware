
-- Delete existing products to start fresh
DELETE FROM product_category_items;
DELETE FROM products;

-- Insert all 7 products from achadinhoscasa.com
INSERT INTO products (slug, name, price_cents, original_price_cents, images, featured, active, sold_count, rating, rating_count, free_shipping, shipping_days_min, shipping_days_max, shipping_original_cents, countdown_minutes, badge_text, installments, buyers_last_days, buyers_days_window, description) VALUES
(
  'mesa-dobravel-maleta-180x60',
  'Mesa Dobrável Tipo Maleta Prática e Durável 180x60cm — Portátil, Resistente, Fácil de Montar e Guardar',
  8760, 19990,
  '[{"url":"http://www.achadinhoscasa.com/uploads/product-img/1773054366138-g34w9yjl.webp"},{"url":"http://www.achadinhoscasa.com/uploads/product-img/1773054366116-azfqu55v.webp"},{"url":"http://www.achadinhoscasa.com/uploads/product-img/1773054366092-m74lpe7z.webp"},{"url":"http://www.achadinhoscasa.com/uploads/product-img/1773054366103-t1q1qs9d.webp"},{"url":"http://www.achadinhoscasa.com/uploads/product-img/1773054366106-ko8b0hd1.webp"},{"url":"http://www.achadinhoscasa.com/uploads/product-img/1773054366091-pkzgd5gt.webp"},{"url":"http://www.achadinhoscasa.com/uploads/product-img/1773054366068-txys5fo5.webp"}]'::jsonb,
  true, true, 4473, 4.8, 5, true, 5, 8, 1460, 240, 'Oferta relâmpago', 6, 127, 3,
  'A Mesa Dobrável Tipo Maleta 180x60cm da MesaLar é 2 em 1: Mesa de apoio com a portabilidade de uma maleta. Você pode montar, usar e guardar em segundos, sem nenhuma ferramenta! A capacidade total de 180cm permite acomodar até 8 pessoas confortavelmente.'
),
(
  'parafusadeira-2-baterias-48v',
  'Parafusadeira Com 2 Bateria Recarregável Sem Fio 48v Com Maleta Completo',
  6790, 25590,
  '[{"url":"http://www.achadinhoscasa.com/uploads/product-img/1772007977713-tg45vzm0.png"},{"url":"http://www.achadinhoscasa.com/uploads/product-img/1772007977694-znns5mrg.png"},{"url":"http://www.achadinhoscasa.com/uploads/product-img/1772007977651-ae7khhcd.png"},{"url":"http://www.achadinhoscasa.com/uploads/product-img/1772007977669-9fs3dp7k.png"},{"url":"http://www.achadinhoscasa.com/uploads/product-img/1772007977616-nj9j4ym0.png"},{"url":"http://www.achadinhoscasa.com/uploads/product-img/1772007977627-ltepk6vx.png"}]'::jsonb,
  true, true, 965, 4.7, 3, true, 5, 8, 1460, 240, 'Oferta relâmpago', 6, 85, 3,
  'A furadeira a bateria é uma ferramenta poderosa e versátil projetada para atender às necessidades de perfuração em diversos materiais. Com um design ergonômico e compacto, proporciona conforto durante o uso prolongado e facilita o manuseio em espaços restritos.'
),
(
  'chuveiro-acqua-duo-lorenzetti',
  'Chuveiro Acqua Duo Lorenzetti BIVOLT',
  2990, 14990,
  '[{"url":"http://www.achadinhoscasa.com/uploads/product-img/1771885215541-jiwk2oby.jpg"}]'::jsonb,
  true, true, 0, 4.8, 0, true, 5, 8, 1460, 240, 'Oferta relâmpago', 6, 0, 3,
  'Chuveiro Acqua Duo Lorenzetti BIVOLT de alta qualidade.'
),
(
  'caixa-som-aiwa-boombox',
  'Caixa de Som AIWA Boombox Plus Bluetooth IP66 AWS-BBS-01B AIWA',
  3190, 59700,
  '[{"url":"http://www.achadinhoscasa.com/uploads/product-img/1771885215559-sz8jbfzu.jpg"}]'::jsonb,
  false, true, 12542, 4.9, 48, true, 5, 8, 1460, 240, 'Oferta relâmpago', 6, 342, 3,
  'Caixa de Som AIWA Boombox Plus Bluetooth IP66 com qualidade profissional.'
),
(
  'jbl-partybox-ultimate',
  'JBL Partybox Ultimate Portátil',
  23990, 799900,
  '[{"url":"http://www.achadinhoscasa.com/uploads/product-img/1771885215560-ft8jhwzu.webp"}]'::jsonb,
  false, true, 2761, 4.9, 22, true, 5, 8, 1460, 240, 'Oferta relâmpago', 6, 198, 3,
  'JBL Partybox Ultimate Portátil - Som potente para suas festas.'
),
(
  'macaquinho-fitness-feminino',
  'Macaquinho fitness feminino com tecido canelado/anarruga',
  2290, 6500,
  '[{"url":"http://www.achadinhoscasa.com/uploads/product-img/1772012260150-46zwe3f9.webp"}]'::jsonb,
  false, true, 1435, 4.7, 15, true, 5, 8, 1460, 0, NULL, 6, 67, 3,
  'Macaquinho fitness feminino com tecido canelado/anarruga, ideal para treinos.'
),
(
  'detergente-extratoras-wap',
  'Detergente Limpador Para Extratoras Limpa E Extrai 1L Wap',
  1999, 6980,
  '[{"url":"http://www.achadinhoscasa.com/uploads/product-img/1771885215557-e72692a0.jpg"}]'::jsonb,
  false, true, 0, 4.5, 0, true, 5, 8, 1460, 0, NULL, 6, 0, 3,
  'Detergente Limpador Para Extratoras Limpa E Extrai 1L Wap - Limpeza profissional.'
);
