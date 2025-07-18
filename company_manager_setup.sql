-- Company Manager Panel SQL Updates
-- Bu dosya mevcut veritabanını bozmadan yeni özellikleri ekler

-- 0. Role constraint'ini güncelle (companymanager dahil)
-- Mevcut constraint'i kaldır (varsa)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Yeni constraint'i ekle (companymanager dahil)
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'staff', 'courier', 'companymanager'));

-- Başarı mesajı
SELECT 'Role constraint güncellendi: companymanager eklendi' as notice;

-- 1. Company Manager kullanıcısı ekle (eğer yoksa)
-- UUID gerekiyorsa: gen_random_uuid() kullanın veya manuel UUID girin
INSERT INTO users (username, password, full_name, role, is_active, created_at)
VALUES (
  'company1',
  'ufuk1234',
  'Şirket Yöneticisi',
  'companymanager',
  true,
  NOW()
) ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Alternatif: Eğer ID'yi manuel vermek isterseniz:
-- INSERT INTO users (id, username, password, full_name, role, is_active, created_at)
-- VALUES (
--   gen_random_uuid(),
--   'company1',
--   'ufuk1234',
--   'Şirket Yöneticisi',
--   'companymanager',
--   true,
--   NOW()
-- ) ON CONFLICT (username) DO UPDATE SET ...

-- 2. Performans için indexler ekle (eğer yoksa)
CREATE INDEX IF NOT EXISTS idx_couriers_location 
ON couriers (current_latitude, current_longitude) 
WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_couriers_availability 
ON couriers (is_available, is_active, last_location_update);

CREATE INDEX IF NOT EXISTS idx_orders_status_created 
ON orders (status, created_at);

CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status 
ON delivery_assignments (status, created_at);

CREATE INDEX IF NOT EXISTS idx_restaurants_active_location 
ON restaurants (is_active, latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 2.1. Couriers tablosuna eksik sütunları ekle (eğer yoksa)
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50);
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS license_plate VARCHAR(20);

-- 2.2. Orders tablosuna eksik sütunları ekle (eğer yoksa)  
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);

-- 3. Gerçek zamanlı güncellemeler için view'ler
CREATE OR REPLACE VIEW company_dashboard_stats AS
SELECT 
  -- Aktif kurye sayısı
  (SELECT COUNT(*) FROM couriers WHERE is_active = true AND is_available = true) as active_couriers,
  
  -- Çevrimdışı kurye sayısı  
  (SELECT COUNT(*) FROM couriers WHERE is_active = true AND is_available = false) as offline_couriers,
  
  -- Aktif sipariş sayısı
  (SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery')) as active_orders,
  
  -- Aktif restoran sayısı
  (SELECT COUNT(*) FROM restaurants WHERE is_active = true) as active_restaurants,
  
  -- Bugünkü toplam ciro
  (SELECT COALESCE(SUM(total_amount), 0) FROM orders 
   WHERE DATE(created_at) = CURRENT_DATE AND status = 'delivered') as daily_revenue,
   
  -- Bugünkü teslim edilen sipariş sayısı
  (SELECT COUNT(*) FROM orders 
   WHERE DATE(created_at) = CURRENT_DATE AND status = 'delivered') as daily_delivered_orders,
   
  -- Ortalama teslimat süresi (dakika)
  (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (delivered_at - created_at))/60), 0) 
   FROM delivery_assignments 
   WHERE status = 'delivered' AND DATE(created_at) = CURRENT_DATE) as avg_delivery_time;

-- 4. Aktif kurye konumları için view (daha esnek koşullar)
CREATE OR REPLACE VIEW active_courier_locations AS
SELECT 
  c.id,
  c.full_name,
  c.phone,
  c.current_latitude,
  c.current_longitude,
  c.last_location_update,
  c.is_available,
  c.vehicle_type,
  c.license_plate,
  -- Aktif atama sayısı
  (SELECT COUNT(*) FROM delivery_assignments da 
   WHERE da.courier_id = c.id AND da.status IN ('assigned', 'accepted', 'picked_up', 'on_the_way')) as active_assignments
FROM couriers c
WHERE c.is_active = true;
-- Konum ve zaman koşullarını kaldırdık - tüm aktif courier'ları göster
-- Eski koşullar:
-- AND c.current_latitude IS NOT NULL 
-- AND c.current_longitude IS NOT NULL
-- AND c.last_location_update > NOW() - INTERVAL '30 minutes';

-- 5. Aktif siparişler için detaylı view
CREATE OR REPLACE VIEW active_orders_detailed AS
SELECT 
  o.id,
  o.order_number,
  o.created_at,
  o.customer_name,
  o.customer_phone,
  o.customer_address,
  o.customer_address_lat,
  o.customer_address_lng,
  o.is_location_verified,
  o.status,
  o.total_amount,
  o.payment_method,
  o.restaurant_id,
  r.name as restaurant_name,
  r.latitude as restaurant_lat,
  r.longitude as restaurant_lng,
  -- Atama bilgileri
  da.id as assignment_id,
  da.courier_id,
  da.status as assignment_status,
  da.delivery_fee,
  da.estimated_delivery_time,
  -- Kurye bilgileri
  c.full_name as courier_name,
  c.phone as courier_phone,
  c.current_latitude as courier_lat,
  c.current_longitude as courier_lng,
  c.is_available as courier_available
FROM orders o
LEFT JOIN restaurants r ON o.restaurant_id = r.id
LEFT JOIN delivery_assignments da ON o.id = da.order_id AND da.status IN ('assigned', 'accepted', 'picked_up', 'on_the_way')
LEFT JOIN couriers c ON da.courier_id = c.id
WHERE o.status IN ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery')
ORDER BY o.created_at DESC;

-- 6. Restoran performans view'i
CREATE OR REPLACE VIEW restaurant_performance AS
SELECT 
  r.id,
  r.name,
  r.address,
  r.latitude,
  r.longitude,
  r.is_active,
  -- Bugünkü siparişler
  (SELECT COUNT(*) FROM orders o 
   WHERE o.restaurant_id = r.id AND DATE(o.created_at) = CURRENT_DATE) as daily_orders,
   
  -- Bugünkü ciro
  (SELECT COALESCE(SUM(total_amount), 0) FROM orders o 
   WHERE o.restaurant_id = r.id AND DATE(o.created_at) = CURRENT_DATE AND status = 'delivered') as daily_revenue,
   
  -- Aktif sipariş sayısı
  (SELECT COUNT(*) FROM orders o 
   WHERE o.restaurant_id = r.id AND status IN ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery')) as active_orders,
   
  -- Ortalama hazırlık süresi
  (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60), 0) 
   FROM orders o 
   WHERE o.restaurant_id = r.id AND status = 'ready_for_pickup' AND DATE(created_at) = CURRENT_DATE) as avg_prep_time
FROM restaurants r
WHERE r.is_active = true
ORDER BY daily_orders DESC;

-- 7. Kurye performans view'i
CREATE OR REPLACE VIEW courier_performance AS
SELECT 
  c.id,
  c.full_name,
  c.phone,
  c.current_latitude,
  c.current_longitude,
  c.is_available,
  c.is_active,
  c.last_location_update,
  -- Bugünkü teslimatlar
  (SELECT COUNT(*) FROM delivery_assignments da 
   WHERE da.courier_id = c.id AND da.status = 'delivered' AND DATE(da.created_at) = CURRENT_DATE) as daily_deliveries,
   
  -- Bugünkü kazanç
  (SELECT COALESCE(SUM(delivery_fee), 0) FROM delivery_assignments da 
   WHERE da.courier_id = c.id AND da.status = 'delivered' AND DATE(da.created_at) = CURRENT_DATE) as daily_earnings,
   
  -- Aktif atama sayısı
  (SELECT COUNT(*) FROM delivery_assignments da 
   WHERE da.courier_id = c.id AND da.status IN ('assigned', 'accepted', 'picked_up', 'on_the_way')) as active_assignments,
   
  -- Ortalama teslimat süresi
  (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (delivered_at - accepted_at))/60), 0) 
   FROM delivery_assignments da 
   WHERE da.courier_id = c.id AND da.status = 'delivered' AND DATE(da.created_at) = CURRENT_DATE) as avg_delivery_time,
   
  -- Toplam teslimat sayısı
  (SELECT COUNT(*) FROM delivery_assignments da 
   WHERE da.courier_id = c.id AND da.status = 'delivered') as total_deliveries,
   
  -- Toplam kazanç
  (SELECT COALESCE(SUM(delivery_fee), 0) FROM delivery_assignments da 
   WHERE da.courier_id = c.id AND da.status = 'delivered') as total_earnings
FROM couriers c
WHERE c.is_active = true
ORDER BY daily_deliveries DESC;

-- 8. Gerçek zamanlı bildirimler için trigger fonksiyonu
CREATE OR REPLACE FUNCTION notify_company_manager()
RETURNS TRIGGER AS $$
BEGIN
  -- Yeni sipariş bildirimi
  IF TG_TABLE_NAME = 'orders' AND TG_OP = 'INSERT' THEN
    PERFORM pg_notify('company_new_order', json_build_object(
      'order_id', NEW.id,
      'restaurant_id', NEW.restaurant_id,
      'customer_name', NEW.customer_name,
      'total_amount', NEW.total_amount,
      'created_at', NEW.created_at
    )::text);
  END IF;
  
  -- Sipariş durumu değişikliği
  IF TG_TABLE_NAME = 'orders' AND TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM pg_notify('company_order_status', json_build_object(
      'order_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'updated_at', NEW.updated_at
    )::text);
  END IF;
  
  -- Kurye durumu değişikliği
  IF TG_TABLE_NAME = 'couriers' AND TG_OP = 'UPDATE' AND OLD.is_available != NEW.is_available THEN
    PERFORM pg_notify('company_courier_status', json_build_object(
      'courier_id', NEW.id,
      'courier_name', NEW.full_name,
      'is_available', NEW.is_available,
      'updated_at', NOW()
    )::text);
  END IF;
  
  -- Kurye konum güncellemesi
  IF TG_TABLE_NAME = 'couriers' AND TG_OP = 'UPDATE' AND 
     (OLD.current_latitude != NEW.current_latitude OR OLD.current_longitude != NEW.current_longitude) THEN
    PERFORM pg_notify('company_courier_location', json_build_object(
      'courier_id', NEW.id,
      'latitude', NEW.current_latitude,
      'longitude', NEW.current_longitude,
      'updated_at', NEW.last_location_update
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger'ları oluştur
DROP TRIGGER IF EXISTS company_orders_trigger ON orders;
CREATE TRIGGER company_orders_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_company_manager();

DROP TRIGGER IF EXISTS company_couriers_trigger ON couriers;
CREATE TRIGGER company_couriers_trigger
  AFTER UPDATE ON couriers
  FOR EACH ROW EXECUTE FUNCTION notify_company_manager();

-- 10. Yetkilendirme için RLS politikaları (eğer RLS aktifse)
-- Bu kısım isteğe bağlı, mevcut sistemde RLS yoksa gerekli değil

-- Tamamlandı!
-- Bu SQL dosyasını çalıştırdıktan sonra company manager paneli için gerekli
-- veritabanı yapısı hazır olacak.

SELECT 'Company Manager veritabanı yapısı başarıyla kuruldu!' as message; 