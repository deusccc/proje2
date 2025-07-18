-- 1. Önce mevcut trigger'ı sil
DROP TRIGGER IF EXISTS update_couriers_updated_at ON couriers;

-- 2. Trigger fonksiyonunu güncelle (eğer yoksa oluştur)
CREATE OR REPLACE FUNCTION update_couriers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Yeni trigger'ı oluştur
CREATE TRIGGER update_couriers_updated_at
    BEFORE UPDATE ON couriers
    FOR EACH ROW
    EXECUTE FUNCTION update_couriers_updated_at();

-- 4. Test için basit bir güncelleme yap
-- UPDATE couriers SET last_location_update = NOW() WHERE id = 'test-id' LIMIT 1; 