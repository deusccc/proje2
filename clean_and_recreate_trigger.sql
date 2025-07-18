-- 1. Mevcut trigger'ları kontrol et ve sil
DO $$ 
BEGIN
    -- Mevcut trigger'ı sil (eğer varsa)
    DROP TRIGGER IF EXISTS update_couriers_updated_at ON couriers;
    RAISE NOTICE 'Eski trigger silindi (eğer varsa)';
END $$;

-- 2. Basit trigger fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION update_couriers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Sadece updated_at alanını güncelle
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Yeni trigger'ı oluştur
CREATE TRIGGER update_couriers_updated_at
    BEFORE UPDATE ON couriers
    FOR EACH ROW
    EXECUTE FUNCTION update_couriers_updated_at();

-- 4. Trigger'ın oluştuğunu doğrula
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'update_couriers_updated_at' 
AND event_object_table = 'couriers';

-- 5. Test güncelleme (opsiyonel - yorum olarak bırakıyorum)
-- UPDATE couriers SET last_location_update = NOW() WHERE id = 'bb0e8400-e29b-41d4-a716-446655440001'; 