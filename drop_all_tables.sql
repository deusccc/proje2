-- TÜM TABLOLARI SILMEK ICIN SQL KODU
-- DIKKAT: Bu kod tum tablolari kalici olarak silecektir!

-- Once foreign key constraint'leri devre disi birak
SET session_replication_role = replica;

-- Tum tablolari sil (siralama onemli - foreign key bagimliliklarina gore)
-- Once child tablolari sil
DROP TABLE IF EXISTS courier_earnings CASCADE;
DROP TABLE IF EXISTS courier_ratings CASCADE;
DROP TABLE IF EXISTS courier_notifications CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS delivery_routes CASCADE;
DROP TABLE IF EXISTS delivery_assignments CASCADE;
DROP TABLE IF EXISTS courier_locations CASCADE;
DROP TABLE IF EXISTS order_item_options CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS product_portions CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS couriers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;

-- Foreign key constraint'leri tekrar etkinlestir
SET session_replication_role = DEFAULT;

-- Sequence'leri de sil (eger varsa)
DROP SEQUENCE IF EXISTS product_portions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS product_variants_id_seq CASCADE;
DROP SEQUENCE IF EXISTS units_id_seq CASCADE;

-- Kalan tablolari kontrol et
SELECT 
    schemaname,
    relname as table_name
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY relname;

-- Kalan sequence'leri kontrol et
SELECT 
    sequence_schema,
    sequence_name
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- Kalan constraint'leri kontrol et
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    contype as constraint_type
FROM pg_constraint 
WHERE connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name; 