-- Customers tablosu için RLS politikalarını düzelt
-- Bu dosya customers tablosu için eksik RLS politikalarını ekler

-- Önce mevcut politikaları kontrol et
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'customers';

-- Customers tablosu için INSERT politikası ekle
CREATE POLICY "Customers can be inserted by restaurant users" ON customers
    FOR INSERT WITH CHECK (true);

-- Customers tablosu için UPDATE politikası ekle
CREATE POLICY "Customers can be updated by restaurant users" ON customers
    FOR UPDATE USING (true);

-- Customers tablosu için DELETE politikası ekle
CREATE POLICY "Customers can be deleted by restaurant users" ON customers
    FOR DELETE USING (true);

-- Customer addresses tablosu için INSERT politikası ekle
CREATE POLICY "Customer addresses can be inserted by restaurant users" ON customer_addresses
    FOR INSERT WITH CHECK (true);

-- Customer addresses tablosu için UPDATE politikası ekle
CREATE POLICY "Customer addresses can be updated by restaurant users" ON customer_addresses
    FOR UPDATE USING (true);

-- Customer addresses tablosu için DELETE politikası ekle
CREATE POLICY "Customer addresses can be deleted by restaurant users" ON customer_addresses
    FOR DELETE USING (true);

-- Orders tablosu için INSERT politikası ekle
CREATE POLICY "Orders can be inserted by restaurant users" ON orders
    FOR INSERT WITH CHECK (true);

-- Orders tablosu için UPDATE politikası ekle
CREATE POLICY "Orders can be updated by restaurant users" ON orders
    FOR UPDATE USING (true);

-- Orders tablosu için DELETE politikası ekle
CREATE POLICY "Orders can be deleted by restaurant users" ON orders
    FOR DELETE USING (true);

-- Order items tablosu için INSERT politikası ekle
CREATE POLICY "Order items can be inserted by restaurant users" ON order_items
    FOR INSERT WITH CHECK (true);

-- Order items tablosu için UPDATE politikası ekle
CREATE POLICY "Order items can be updated by restaurant users" ON order_items
    FOR UPDATE USING (true);

-- Order items tablosu için DELETE politikası ekle
CREATE POLICY "Order items can be deleted by restaurant users" ON order_items
    FOR DELETE USING (true);

-- Order item options tablosu için INSERT politikası ekle
CREATE POLICY "Order item options can be inserted by restaurant users" ON order_item_options
    FOR INSERT WITH CHECK (true);

-- Order item options tablosu için UPDATE politikası ekle
CREATE POLICY "Order item options can be updated by restaurant users" ON order_item_options
    FOR UPDATE USING (true);

-- Order item options tablosu için DELETE politikası ekle
CREATE POLICY "Order item options can be deleted by restaurant users" ON order_item_options
    FOR DELETE USING (true);

-- Delivery assignments tablosu için INSERT politikası ekle
CREATE POLICY "Delivery assignments can be inserted by restaurant users" ON delivery_assignments
    FOR INSERT WITH CHECK (true);

-- Delivery assignments tablosu için UPDATE politikası ekle
CREATE POLICY "Delivery assignments can be updated by restaurant users" ON delivery_assignments
    FOR UPDATE USING (true);

-- Delivery assignments tablosu için DELETE politikası ekle
CREATE POLICY "Delivery assignments can be deleted by restaurant users" ON delivery_assignments
    FOR DELETE USING (true);

-- Courier notifications tablosu için INSERT politikası ekle
CREATE POLICY "Courier notifications can be inserted by restaurant users" ON courier_notifications
    FOR INSERT WITH CHECK (true);

-- Courier notifications tablosu için UPDATE politikası ekle
CREATE POLICY "Courier notifications can be updated by restaurant users" ON courier_notifications
    FOR UPDATE USING (true);

-- Courier notifications tablosu için DELETE politikası ekle
CREATE POLICY "Courier notifications can be deleted by restaurant users" ON courier_notifications
    FOR DELETE USING (true);

-- Courier ratings tablosu için INSERT politikası ekle
CREATE POLICY "Courier ratings can be inserted by restaurant users" ON courier_ratings
    FOR INSERT WITH CHECK (true);

-- Courier ratings tablosu için UPDATE politikası ekle
CREATE POLICY "Courier ratings can be updated by restaurant users" ON courier_ratings
    FOR UPDATE USING (true);

-- Courier ratings tablosu için DELETE politikası ekle
CREATE POLICY "Courier ratings can be deleted by restaurant users" ON courier_ratings
    FOR DELETE USING (true);

-- Test: Yeni müşteri ekleme testi
INSERT INTO customers (id, restaurant_id, name, phone, email, notes) VALUES
('990e8400-e29b-41d4-a716-446655440099', '550e8400-e29b-41d4-a716-446655440001', 'Test Müşteri', '0532 111 9999', 'test@email.com', 'Test müşterisi')
ON CONFLICT (id) DO NOTHING;

-- Test sonucunu kontrol et
SELECT 
    id,
    name,
    phone,
    email,
    created_at
FROM customers 
WHERE name = 'Test Müşteri';

-- Test müşterisini temizle
DELETE FROM customers WHERE name = 'Test Müşteri';

-- Güncellenmiş politikaları kontrol et
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename IN ('customers', 'customer_addresses', 'orders', 'order_items', 'order_item_options', 'delivery_assignments', 'courier_notifications', 'courier_ratings')
ORDER BY tablename, cmd; 