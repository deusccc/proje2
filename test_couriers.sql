-- Test Kurye Kullanıcıları ve Kurye Kayıtları

-- Kurye kullanıcıları oluştur
INSERT INTO users (id, username, password, full_name, role, is_active, created_at) VALUES
('courier-user-1', 'kurye1', 'kurye123', 'Ahmet Yılmaz', 'courier', true, NOW()),
('courier-user-2', 'kurye2', 'kurye123', 'Mehmet Demir', 'courier', true, NOW()),
('courier-user-3', 'kurye3', 'kurye123', 'Ali Kaya', 'courier', true, NOW());

-- Kurye kayıtları oluştur
INSERT INTO couriers (id, user_id, full_name, phone, email, vehicle_type, license_plate, current_latitude, current_longitude, is_available, is_active, created_at) VALUES
('courier-1', 'courier-user-1', 'Ahmet Yılmaz', '+905551234567', 'ahmet@example.com', 'motorcycle', '34ABC123', 41.0082, 28.9784, true, true, NOW()),
('courier-2', 'courier-user-2', 'Mehmet Demir', '+905559876543', 'mehmet@example.com', 'motorcycle', '34DEF456', 41.0082, 28.9784, true, true, NOW()),
('courier-3', 'courier-user-3', 'Ali Kaya', '+905555555555', 'ali@example.com', 'motorcycle', '34GHI789', 41.0082, 28.9784, true, true, NOW());

-- Kurye konum geçmişi tablosu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS courier_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(5, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kurye bildirimleri tablosu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS courier_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kurye değerlendirmeleri tablosu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS courier_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Örnek bildirimler ekle
INSERT INTO courier_notifications (courier_id, type, title, message, data) VALUES
('courier-1', 'welcome', 'Hoş Geldiniz!', 'Teslimat sistemine başarıyla giriş yaptınız.', '{"action": "welcome"}'),
('courier-2', 'welcome', 'Hoş Geldiniz!', 'Teslimat sistemine başarıyla giriş yaptınız.', '{"action": "welcome"}'),
('courier-3', 'welcome', 'Hoş Geldiniz!', 'Teslimat sistemine başarıyla giriş yaptınız.', '{"action": "welcome"}');

-- Örnek değerlendirmeler ekle
INSERT INTO courier_ratings (courier_id, order_id, rating, comment) VALUES
('courier-1', (SELECT id FROM orders LIMIT 1), 5, 'Çok hızlı teslimat'),
('courier-1', (SELECT id FROM orders LIMIT 1 OFFSET 1), 4, 'İyi hizmet'),
('courier-2', (SELECT id FROM orders LIMIT 1 OFFSET 2), 5, 'Mükemmel');

-- RLS (Row Level Security) politikaları ekle
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_ratings ENABLE ROW LEVEL SECURITY;

-- Kurye tablosu için RLS politikaları
CREATE POLICY "Couriers can view their own data" ON couriers
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Couriers can update their own data" ON couriers
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Kurye konumları için RLS politikaları
CREATE POLICY "Couriers can insert their own locations" ON courier_locations
    FOR INSERT WITH CHECK (courier_id IN (
        SELECT id FROM couriers WHERE user_id = auth.uid()::text
    ));

CREATE POLICY "Couriers can view their own locations" ON courier_locations
    FOR SELECT USING (courier_id IN (
        SELECT id FROM couriers WHERE user_id = auth.uid()::text
    ));

-- Kurye bildirimleri için RLS politikaları
CREATE POLICY "Couriers can view their own notifications" ON courier_notifications
    FOR SELECT USING (courier_id IN (
        SELECT id FROM couriers WHERE user_id = auth.uid()::text
    ));

CREATE POLICY "Couriers can update their own notifications" ON courier_notifications
    FOR UPDATE USING (courier_id IN (
        SELECT id FROM couriers WHERE user_id = auth.uid()::text
    ));

-- Kurye değerlendirmeleri için RLS politikaları
CREATE POLICY "Couriers can view their own ratings" ON courier_ratings
    FOR SELECT USING (courier_id IN (
        SELECT id FROM couriers WHERE user_id = auth.uid()::text
    ));

-- Test verilerini kontrol et
SELECT 
    u.username,
    u.full_name,
    c.phone,
    c.is_available,
    c.is_active
FROM users u
JOIN couriers c ON u.id = c.user_id
WHERE u.role = 'courier'; 