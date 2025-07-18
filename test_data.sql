-- =====================================================
-- TEST VERILERI - RESTORAN SIPARIS YONETIM SISTEMI
-- =====================================================

-- Restoranlar
INSERT INTO restaurants (id, name, address, phone, email, latitude, longitude, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Lezzet Durağı', 'Kadıköy, İstanbul', '0216 555 0001', 'info@lezzetduragi.com', 40.9909, 29.0303, true),
('550e8400-e29b-41d4-a716-446655440002', 'Pizza Palace', 'Beşiktaş, İstanbul', '0212 555 0002', 'info@pizzapalace.com', 41.0422, 29.0083, true),
('550e8400-e29b-41d4-a716-446655440003', 'Döner King', 'Şişli, İstanbul', '0212 555 0003', 'info@donerking.com', 41.0602, 28.9877, true);

-- Kullanıcılar
INSERT INTO users (id, restaurant_id, username, password, full_name, role, is_active) VALUES
-- Lezzet Durağı kullanıcıları
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'admin', 'admin123', 'Ahmet Yılmaz', 'admin', true),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'manager', 'manager123', 'Fatma Demir', 'manager', true),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'staff', 'staff123', 'Mehmet Kaya', 'staff', true),

-- Pizza Palace kullanıcıları
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'pizza_admin', 'admin123', 'Ali Özkan', 'admin', true),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'pizza_manager', 'manager123', 'Ayşe Çelik', 'manager', true),

-- Döner King kullanıcıları
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', 'doner_admin', 'admin123', 'Hasan Yıldız', 'admin', true),

-- Kuryeler
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', 'kurye1', 'kurye123', 'Kurye Bir', 'courier', true),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', 'kurye2', 'kurye123', 'Kurye İki', 'courier', true),
('660e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440002', 'kurye3', 'kurye123', 'Kurye Üç', 'courier', true),
('660e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440003', 'kurye4', 'kurye123', 'Kurye Dört', 'courier', true);

-- Birimler (Sıralı ID'ler ile)
INSERT INTO units (id, restaurant_id, name, symbol, is_active) VALUES
-- Lezzet Durağı birimleri (ID 1-5)
(1, '550e8400-e29b-41d4-a716-446655440001', 'Adet', 'adet', true),
(2, '550e8400-e29b-41d4-a716-446655440001', 'Porsiyon', 'porsiyon', true),
(3, '550e8400-e29b-41d4-a716-446655440001', 'Gram', 'gr', true),
(4, '550e8400-e29b-41d4-a716-446655440001', 'Mililitre', 'ml', true),
(5, '550e8400-e29b-41d4-a716-446655440001', 'Dilim', 'dilim', true),

-- Pizza Palace birimleri (ID 6-10)
(6, '550e8400-e29b-41d4-a716-446655440002', 'Adet', 'adet', true),
(7, '550e8400-e29b-41d4-a716-446655440002', 'Porsiyon', 'porsiyon', true),
(8, '550e8400-e29b-41d4-a716-446655440002', 'Gram', 'gr', true),
(9, '550e8400-e29b-41d4-a716-446655440002', 'Mililitre', 'ml', true),
(10, '550e8400-e29b-41d4-a716-446655440002', 'Dilim', 'dilim', true),

-- Döner King birimleri (ID 11-15)
(11, '550e8400-e29b-41d4-a716-446655440003', 'Adet', 'adet', true),
(12, '550e8400-e29b-41d4-a716-446655440003', 'Porsiyon', 'porsiyon', true),
(13, '550e8400-e29b-41d4-a716-446655440003', 'Gram', 'gr', true),
(14, '550e8400-e29b-41d4-a716-446655440003', 'Mililitre', 'ml', true),
(15, '550e8400-e29b-41d4-a716-446655440003', 'Dilim', 'dilim', true);

-- Kategoriler
INSERT INTO categories (id, restaurant_id, name, description, sort_order, is_active) VALUES
-- Lezzet Durağı kategorileri
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Ana Yemek', 'Ana yemekler', 1, true),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Çorba', 'Çorbalar', 2, true),
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Salata', 'Salatalar', 3, true),
('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'İçecek', 'İçecekler', 4, true),
('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Tatlı', 'Tatlılar', 5, true),

-- Pizza Palace kategorileri
('770e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'Pizzalar', 'Çeşitli pizzalar', 1, true),
('770e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', 'Pasta', 'Makarna çeşitleri', 2, true),
('770e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', 'Salata', 'Salatalar', 3, true),
('770e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440002', 'İçecek', 'İçecekler', 4, true),
('770e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', 'Tatlı', 'Tatlılar', 5, true),

-- Döner King kategorileri
('770e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440003', 'Döner', 'Döner çeşitleri', 1, true),
('770e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440003', 'Kebap', 'Kebap çeşitleri', 2, true),
('770e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440003', 'Pilav', 'Pilav çeşitleri', 3, true),
('770e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440003', 'İçecek', 'İçecekler', 4, true),
('770e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440003', 'Tatlı', 'Tatlılar', 5, true);

-- Ürünler
INSERT INTO products (id, restaurant_id, category_id, name, description, base_price, preparation_time, is_available, is_featured) VALUES
-- Lezzet Durağı ürünleri
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Tavuk Şiş', 'Özel soslu tavuk şiş', 45.00, 20, true, true),
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Kuzu Pirzola', 'Izgara kuzu pirzola', 85.00, 25, true, true),
('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002', 'Mercimek Çorbası', 'Geleneksel mercimek çorbası', 15.00, 10, true, false),
('880e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440003', 'Sezar Salata', 'Tavuklu sezar salata', 35.00, 15, true, false),
('880e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440004', 'Ayran', 'Taze ayran', 8.00, 5, true, false),
('880e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440005', 'Künefe', 'Antep fıstıklı künefe', 25.00, 10, true, true),

-- Pizza Palace ürünleri
('880e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440006', 'Margherita Pizza', 'Domates, mozzarella, fesleğen', 65.00, 20, true, true),
('880e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440006', 'Pepperoni Pizza', 'Pepperoni, mozzarella', 75.00, 20, true, true),
('880e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440007', 'Spaghetti Carbonara', 'Yumurta, peynir, pastırma', 45.00, 15, true, false),
('880e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440008', 'Caesar Salata', 'Marul, parmesan, kruton', 30.00, 10, true, false),
('880e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440009', 'Coca Cola', '330ml Coca Cola', 12.00, 5, true, false),
('880e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440010', 'Tiramisu', 'İtalyan tatlısı', 35.00, 10, true, true),

-- Döner King ürünleri
('880e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440011', 'Tavuk Döner', 'Tavuk döner porsiyon', 35.00, 15, true, true),
('880e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440011', 'Kuzu Döner', 'Kuzu döner porsiyon', 45.00, 15, true, true),
('880e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440012', 'Adana Kebap', 'Adana kebap porsiyon', 55.00, 20, true, true),
('880e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440013', 'Pilav', 'Beyaz pilav', 15.00, 10, true, false),
('880e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440014', 'Ayran', 'Taze ayran', 8.00, 5, true, false),
('880e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440015', 'Baklava', 'Antep fıstıklı baklava', 20.00, 5, true, true);

-- Ürün Varyantları
INSERT INTO product_variants (product_id, name, description, price_modifier, is_default, is_active, sort_order) VALUES
-- Lezzet Durağı ürün varyantları
('880e8400-e29b-41d4-a716-446655440001', 'Normal', 'Normal porsiyon', 0.00, true, true, 1),
('880e8400-e29b-41d4-a716-446655440001', 'Büyük', 'Büyük porsiyon', 15.00, false, true, 2),
('880e8400-e29b-41d4-a716-446655440002', 'Normal', 'Normal porsiyon', 0.00, true, true, 1),
('880e8400-e29b-41d4-a716-446655440002', 'Büyük', 'Büyük porsiyon', 20.00, false, true, 2),

-- Pizza Palace ürün varyantları
('880e8400-e29b-41d4-a716-446655440007', 'Küçük (25cm)', 'Küçük boy pizza', 0.00, true, true, 1),
('880e8400-e29b-41d4-a716-446655440007', 'Orta (30cm)', 'Orta boy pizza', 15.00, false, true, 2),
('880e8400-e29b-41d4-a716-446655440007', 'Büyük (35cm)', 'Büyük boy pizza', 30.00, false, true, 3),
('880e8400-e29b-41d4-a716-446655440008', 'Küçük (25cm)', 'Küçük boy pizza', 0.00, true, true, 1),
('880e8400-e29b-41d4-a716-446655440008', 'Orta (30cm)', 'Orta boy pizza', 15.00, false, true, 2),
('880e8400-e29b-41d4-a716-446655440008', 'Büyük (35cm)', 'Büyük boy pizza', 30.00, false, true, 3),

-- Döner King ürün varyantları
('880e8400-e29b-41d4-a716-446655440013', 'Normal', 'Normal porsiyon', 0.00, true, true, 1),
('880e8400-e29b-41d4-a716-446655440013', 'Büyük', 'Büyük porsiyon', 10.00, false, true, 2),
('880e8400-e29b-41d4-a716-446655440014', 'Normal', 'Normal porsiyon', 0.00, true, true, 1),
('880e8400-e29b-41d4-a716-446655440014', 'Büyük', 'Büyük porsiyon', 15.00, false, true, 2);

-- Ürün Porsiyonları
INSERT INTO product_portions (product_id, name, description, unit_id, price_modifier, quantity_multiplier, is_default, is_active, sort_order) VALUES
-- Lezzet Durağı ürün porsiyonları
('880e8400-e29b-41d4-a716-446655440001', 'Yarım', 'Yarım porsiyon', 2, -10.00, 0.5, false, true, 1),
('880e8400-e29b-41d4-a716-446655440001', 'Normal', 'Normal porsiyon', 2, 0.00, 1.0, true, true, 2),
('880e8400-e29b-41d4-a716-446655440001', 'Büyük', 'Büyük porsiyon', 2, 15.00, 1.5, false, true, 3),
('880e8400-e29b-41d4-a716-446655440002', 'Yarım', 'Yarım porsiyon', 2, -20.00, 0.5, false, true, 1),
('880e8400-e29b-41d4-a716-446655440002', 'Normal', 'Normal porsiyon', 2, 0.00, 1.0, true, true, 2),
('880e8400-e29b-41d4-a716-446655440002', 'Büyük', 'Büyük porsiyon', 2, 20.00, 1.5, false, true, 3),

-- Pizza Palace ürün porsiyonları
('880e8400-e29b-41d4-a716-446655440007', 'İnce Hamur', 'İnce hamur', NULL, 0.00, 1.0, true, true, 1),
('880e8400-e29b-41d4-a716-446655440007', 'Kalın Hamur', 'Kalın hamur', NULL, 5.00, 1.2, false, true, 2),
('880e8400-e29b-41d4-a716-446655440008', 'İnce Hamur', 'İnce hamur', NULL, 0.00, 1.0, true, true, 1),
('880e8400-e29b-41d4-a716-446655440008', 'Kalın Hamur', 'Kalın hamur', NULL, 5.00, 1.2, false, true, 2),

-- Döner King ürün porsiyonları
('880e8400-e29b-41d4-a716-446655440013', 'Yarım', 'Yarım porsiyon', 12, -10.00, 0.5, false, true, 1),
('880e8400-e29b-41d4-a716-446655440013', 'Normal', 'Normal porsiyon', 12, 0.00, 1.0, true, true, 2),
('880e8400-e29b-41d4-a716-446655440013', 'Büyük', 'Büyük porsiyon', 12, 10.00, 1.5, false, true, 3),
('880e8400-e29b-41d4-a716-446655440014', 'Yarım', 'Yarım porsiyon', 12, -15.00, 0.5, false, true, 1),
('880e8400-e29b-41d4-a716-446655440014', 'Normal', 'Normal porsiyon', 12, 0.00, 1.0, true, true, 2),
('880e8400-e29b-41d4-a716-446655440014', 'Büyük', 'Büyük porsiyon', 12, 15.00, 1.5, false, true, 3);

-- Müşteriler
INSERT INTO customers (id, restaurant_id, name, phone, email, notes) VALUES
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Mehmet Yılmaz', '0532 111 0001', 'mehmet@email.com', 'Düzenli müşteri'),
('990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Ayşe Demir', '0532 111 0002', 'ayse@email.com', 'Vejetaryen tercihleri'),
('990e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Ali Özkan', '0532 111 0003', 'ali@email.com', 'Pizza sever'),
('990e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'Fatma Çelik', '0532 111 0004', 'fatma@email.com', 'Döner sever');

-- Müşteri Adresleri
INSERT INTO customer_addresses (id, customer_id, label, lat, lng, description, is_verified) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 'Ev', 40.9909, 29.0303, 'Kadıköy, İstanbul', true),
('aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002', 'İş', 40.9909, 29.0303, 'Kadıköy, İstanbul', true),
('aa0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440003', 'Ev', 41.0422, 29.0083, 'Beşiktaş, İstanbul', true),
('aa0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440004', 'Ev', 41.0602, 28.9877, 'Şişli, İstanbul', true);

-- Kuryeler
INSERT INTO couriers (id, user_id, full_name, phone, vehicle_type, is_active, is_available, current_latitude, current_longitude, last_location_update, rating, total_deliveries) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440007', 'Kurye Bir', '0532 222 0001', 'motorcycle', true, true, 40.9909, 29.0303, NOW(), 4.5, 150),
('bb0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440008', 'Kurye İki', '0532 222 0002', 'motorcycle', true, true, 41.0256, 28.9744, NOW(), 4.2, 120),
('bb0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440009', 'Kurye Üç', '0532 222 0003', 'motorcycle', true, true, 41.0422, 29.0083, NOW(), 4.8, 200),
('bb0e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440010', 'Kurye Dört', '0532 222 0004', 'motorcycle', true, true, 41.0602, 28.9877, NOW(), 4.3, 180);

-- Örnek Siparişler
INSERT INTO orders (id, restaurant_id, customer_id, customer_name, customer_phone, customer_address, customer_address_lat, customer_address_lng, status, total_amount, subtotal, tax_amount, delivery_fee, payment_method, payment_status, notes) VALUES
('cc0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 'Mehmet Yılmaz', '0532 111 0001', 'Kadıköy, İstanbul', 40.9909, 29.0303, 'pending', 68.00, 60.00, 8.00, 0.00, 'cash', 'pending', 'Acil teslimat'),
('cc0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440003', 'Ali Özkan', '0532 111 0003', 'Beşiktaş, İstanbul', 41.0422, 29.0083, 'confirmed', 92.00, 80.00, 12.00, 0.00, 'card', 'paid', 'Ekstra peynir'),
('cc0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440004', 'Fatma Çelik', '0532 111 0004', 'Şişli, İstanbul', 41.0602, 28.9877, 'preparing', 58.00, 50.00, 8.00, 0.00, 'cash', 'pending', 'Soslu');

-- Sipariş Kalemleri
INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price, special_instructions) VALUES
('dd0e8400-e29b-41d4-a716-446655440001', 'cc0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 'Tavuk Şiş', 1, 45.00, 45.00, 'Az pişmiş'),
('dd0e8400-e29b-41d4-a716-446655440002', 'cc0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440003', 'Mercimek Çorbası', 1, 15.00, 15.00, 'Sıcak'),
('dd0e8400-e29b-41d4-a716-446655440003', 'cc0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440005', 'Ayran', 1, 8.00, 8.00, NULL),

('dd0e8400-e29b-41d4-a716-446655440004', 'cc0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440007', 'Margherita Pizza', 1, 65.00, 65.00, 'Ekstra peynir'),
('dd0e8400-e29b-41d4-a716-446655440005', 'cc0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440011', 'Coca Cola', 1, 12.00, 12.00, 'Buzlu'),
('dd0e8400-e29b-41d4-a716-446655440006', 'cc0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440012', 'Tiramisu', 1, 35.00, 35.00, NULL),

('dd0e8400-e29b-41d4-a716-446655440007', 'cc0e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440013', 'Tavuk Döner', 1, 35.00, 35.00, 'Soslu'),
('dd0e8400-e29b-41d4-a716-446655440008', 'cc0e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440016', 'Pilav', 1, 15.00, 15.00, NULL),
('dd0e8400-e29b-41d4-a716-446655440009', 'cc0e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440017', 'Ayran', 1, 8.00, 8.00, NULL);

-- Teslimat Atamaları
INSERT INTO delivery_assignments (id, order_id, courier_id, restaurant_id, status, delivery_fee, notes) VALUES
('ee0e8400-e29b-41d4-a716-446655440001', 'cc0e8400-e29b-41d4-a716-446655440001', 'bb0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'assigned', 10.00, 'Acil teslimat'),
('ee0e8400-e29b-41d4-a716-446655440002', 'cc0e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'accepted', 12.00, 'Ekstra peynir'),
('ee0e8400-e29b-41d4-a716-446655440003', 'cc0e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'picked_up', 8.00, 'Soslu');

-- Kurye Bildirimleri
INSERT INTO courier_notifications (id, courier_id, type, title, message, data, is_read) VALUES
('ff0e8400-e29b-41d4-a716-446655440001', 'bb0e8400-e29b-41d4-a716-446655440001', 'new_assignment', 'Yeni Teslimat', 'Lezzet Durağından yeni teslimat atandı', '{"order_id": "cc0e8400-e29b-41d4-a716-446655440001", "delivery_fee": 10.00}', false),
('ff0e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440003', 'new_assignment', 'Yeni Teslimat', 'Pizza Palace''dan yeni teslimat atandı', '{"order_id": "cc0e8400-e29b-41d4-a716-446655440002", "delivery_fee": 12.00}', false),
('ff0e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440004', 'new_assignment', 'Yeni Teslimat', 'Döner King''den yeni teslimat atandı', '{"order_id": "cc0e8400-e29b-41d4-a716-446655440003", "delivery_fee": 8.00}', false);

-- Kurye Değerlendirmeleri
INSERT INTO courier_ratings (id, courier_id, order_id, rating, comment) VALUES
('ff0e8400-e29b-41d4-a716-446655440004', 'bb0e8400-e29b-41d4-a716-446655440001', 'cc0e8400-e29b-41d4-a716-446655440001', 5, 'Çok hızlı teslimat'),
('ff0e8400-e29b-41d4-a716-446655440005', 'bb0e8400-e29b-41d4-a716-446655440003', 'cc0e8400-e29b-41d4-a716-446655440002', 4, 'Güzel hizmet'),
('ff0e8400-e29b-41d4-a716-446655440006', 'bb0e8400-e29b-41d4-a716-446655440004', 'cc0e8400-e29b-41d4-a716-446655440003', 5, 'Mükemmel');

-- =====================================================
-- VERI DOGRULAMA
-- =====================================================

-- Toplam kayıt sayılarını kontrol et
SELECT 'Restoranlar' as tablo, COUNT(*) as kayit_sayisi FROM restaurants
UNION ALL
SELECT 'Kullanıcılar', COUNT(*) FROM users
UNION ALL
SELECT 'Kategoriler', COUNT(*) FROM categories
UNION ALL
SELECT 'Birimler', COUNT(*) FROM units
UNION ALL
SELECT 'Ürünler', COUNT(*) FROM products
UNION ALL
SELECT 'Ürün Varyantları', COUNT(*) FROM product_variants
UNION ALL
SELECT 'Ürün Porsiyonları', COUNT(*) FROM product_portions
UNION ALL
SELECT 'Müşteriler', COUNT(*) FROM customers
UNION ALL
SELECT 'Müşteri Adresleri', COUNT(*) FROM customer_addresses
UNION ALL
SELECT 'Siparişler', COUNT(*) FROM orders
UNION ALL
SELECT 'Sipariş Kalemleri', COUNT(*) FROM order_items
UNION ALL
SELECT 'Kuryeler', COUNT(*) FROM couriers
UNION ALL
SELECT 'Teslimat Atamaları', COUNT(*) FROM delivery_assignments
UNION ALL
SELECT 'Kurye Bildirimleri', COUNT(*) FROM courier_notifications
UNION ALL
SELECT 'Kurye Değerlendirmeleri', COUNT(*) FROM courier_ratings; 