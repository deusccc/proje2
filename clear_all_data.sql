-- Supabase'deki tüm verileri silmek için SQL kodu
-- DİKKAT: Bu kod tüm verileri kalıcı olarak silecektir!

-- Önce foreign key constraint'leri devre dışı bırak
SET session_replication_role = replica;

-- Tüm tabloları temizle (sıralama önemli - foreign key bağımlılıklarına göre)
-- Önce child tabloları sil
DELETE FROM courier_earnings;
DELETE FROM courier_ratings;
DELETE FROM courier_notifications;
DELETE FROM notifications;
DELETE FROM delivery_routes;
DELETE FROM delivery_assignments;
DELETE FROM courier_locations;
DELETE FROM order_item_options;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM customer_addresses;
DELETE FROM customers;
DELETE FROM product_portions;
DELETE FROM product_variants;
DELETE FROM products;
DELETE FROM units;
DELETE FROM categories;
DELETE FROM couriers;
DELETE FROM users;
DELETE FROM restaurants;

-- Foreign key constraint'leri tekrar etkinleştir
SET session_replication_role = DEFAULT;

-- Sequence'leri sıfırla (eğer varsa)
-- Bu komutlar sequence'lerin mevcut olup olmadığını kontrol eder
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || seq_name || ' RESTART WITH 1';
    END LOOP;
END $$;

-- Sonuçları kontrol etmek için tablo sayılarını göster
SELECT 
    'restaurants' as table_name, COUNT(*) as row_count FROM restaurants
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'units', COUNT(*) FROM units
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL
SELECT 'product_portions', COUNT(*) FROM product_portions
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'customer_addresses', COUNT(*) FROM customer_addresses
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'order_item_options', COUNT(*) FROM order_item_options
UNION ALL
SELECT 'couriers', COUNT(*) FROM couriers
UNION ALL
SELECT 'courier_locations', COUNT(*) FROM courier_locations
UNION ALL
SELECT 'delivery_assignments', COUNT(*) FROM delivery_assignments
UNION ALL
SELECT 'delivery_routes', COUNT(*) FROM delivery_routes
UNION ALL
SELECT 'courier_notifications', COUNT(*) FROM courier_notifications
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'courier_ratings', COUNT(*) FROM courier_ratings
UNION ALL
SELECT 'courier_earnings', COUNT(*) FROM courier_earnings
ORDER BY table_name;

-- Tüm tablolar boş olmalı (0 satır)
-- Eğer hala veri varsa, manuel olarak kontrol edin

-- Ek kontrol: Hangi tabloların hala veri içerdiğini göster
SELECT 
    schemaname,
    relname as table_name,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY relname; 