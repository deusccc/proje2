-- Customer Addresses tablosuna eksik sütunları ekleyen migration
-- Bu dosyayı Supabase SQL Editor'da çalıştırın

-- Önce mevcut sütunları kontrol et
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customer_addresses' 
ORDER BY ordinal_position;

-- Eksik sütunları ekle
ALTER TABLE customer_addresses 
ADD COLUMN IF NOT EXISTS address_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS province VARCHAR(100),
ADD COLUMN IF NOT EXISTS district VARCHAR(100),
ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100),
ADD COLUMN IF NOT EXISTS street VARCHAR(255),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Mevcut verileri güncelle (lat/lng değerlerini latitude/longitude'a kopyala)
UPDATE customer_addresses 
SET 
    latitude = lat,
    longitude = lng,
    address_title = label,
    address_line_1 = description,
    city = 'İstanbul', -- Varsayılan şehir
    updated_at = NOW()
WHERE latitude IS NULL OR longitude IS NULL;

-- Güncellenmiş sütunları kontrol et
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customer_addresses' 
ORDER BY ordinal_position; 