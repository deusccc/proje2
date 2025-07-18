-- Kurye konumlarını düzeltme scripti
-- Bu script mevcut kuryeler için farklı konumlar atayacak

-- Mevcut kurye konumlarını kontrol et
SELECT 
    id,
    full_name,
    current_latitude,
    current_longitude,
    is_available,
    last_location_update
FROM couriers 
WHERE is_active = true
ORDER BY full_name;

-- Kurye konumlarını güncelle - her kurye farklı bir konumda olsun
UPDATE couriers 
SET 
    current_latitude = 40.9909,
    current_longitude = 29.0303,
    last_location_update = NOW()
WHERE id = 'bb0e8400-e29b-41d4-a716-446655440001' AND full_name = 'Kurye Bir';

UPDATE couriers 
SET 
    current_latitude = 41.0256,
    current_longitude = 28.9744,
    last_location_update = NOW()
WHERE id = 'bb0e8400-e29b-41d4-a716-446655440002' AND full_name = 'Kurye İki';

UPDATE couriers 
SET 
    current_latitude = 41.0422,
    current_longitude = 29.0083,
    last_location_update = NOW()
WHERE id = 'bb0e8400-e29b-41d4-a716-446655440003' AND full_name = 'Kurye Üç';

UPDATE couriers 
SET 
    current_latitude = 41.0602,
    current_longitude = 28.9877,
    last_location_update = NOW()
WHERE id = 'bb0e8400-e29b-41d4-a716-446655440004' AND full_name = 'Kurye Dört';

-- Güncellenmiş konumları kontrol et
SELECT 
    id,
    full_name,
    current_latitude,
    current_longitude,
    is_available,
    last_location_update
FROM couriers 
WHERE is_active = true
ORDER BY full_name;

-- Kurye konumları view'ını yeniden oluştur (eğer varsa)
DROP VIEW IF EXISTS courier_locations_view;
CREATE VIEW courier_locations_view AS
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
    c.is_active,
    COALESCE(
        (SELECT COUNT(*) 
         FROM delivery_assignments da 
         WHERE da.courier_id = c.id 
         AND da.status IN ('assigned', 'accepted', 'picked_up', 'on_the_way')
        ), 0
    ) as active_assignments
FROM couriers c
WHERE c.is_active = true
ORDER BY c.full_name;

-- View'dan test sorgusu
SELECT * FROM courier_locations_view;

-- Kurye konumlarını debug etmek için ek sorgular
SELECT 
    'Kurye Konum Dağılımı' as info,
    COUNT(*) as total_couriers,
    COUNT(CASE WHEN current_latitude IS NOT NULL AND current_longitude IS NOT NULL THEN 1 END) as with_location,
    COUNT(CASE WHEN is_available = true THEN 1 END) as available_couriers
FROM couriers 
WHERE is_active = true;

-- Aynı konumda olan kuryeler var mı?
SELECT 
    current_latitude,
    current_longitude,
    COUNT(*) as courier_count,
    STRING_AGG(full_name, ', ') as courier_names
FROM couriers 
WHERE is_active = true 
AND current_latitude IS NOT NULL 
AND current_longitude IS NOT NULL
GROUP BY current_latitude, current_longitude
HAVING COUNT(*) > 1; 