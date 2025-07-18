-- =====================================================
-- RESTAURANTS TABLOSU ŞEMA DÜZELTMESİ
-- =====================================================

-- Eksik sütunları ekle
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS detailed_address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS district VARCHAR(100),
ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);

-- Mevcut verileri güncelle (eğer varsa)
UPDATE restaurants 
SET 
    detailed_address = address,
    city = CASE 
        WHEN address LIKE '%İstanbul%' THEN 'İstanbul'
        WHEN address LIKE '%Ankara%' THEN 'Ankara'
        WHEN address LIKE '%İzmir%' THEN 'İzmir'
        ELSE 'Belirtilmedi'
    END,
    district = CASE 
        WHEN address LIKE '%Kadıköy%' THEN 'Kadıköy'
        WHEN address LIKE '%Beşiktaş%' THEN 'Beşiktaş'
        WHEN address LIKE '%Şişli%' THEN 'Şişli'
        ELSE 'Belirtilmedi'
    END
WHERE detailed_address IS NULL;

-- Sütunların eklendiğini kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
AND column_name IN ('detailed_address', 'city', 'district', 'neighborhood', 'postal_code')
ORDER BY column_name;

-- Test: Restoran güncelleme testi
UPDATE restaurants 
SET 
    city = 'İstanbul',
    district = 'Kadıköy',
    neighborhood = 'Test Mahallesi',
    postal_code = '34700'
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- Güncelleme sonucunu kontrol et
SELECT 
    id,
    name,
    city,
    district,
    neighborhood,
    postal_code
FROM restaurants 
WHERE id = '550e8400-e29b-41d4-a716-446655440001';