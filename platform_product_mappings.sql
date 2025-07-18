-- Platform Ürün Eşleştirmeleri Tablosu
-- Bu tablo farklı platform ürünleri ile iç ürünlerin eşleştirmelerini saklar

CREATE TABLE IF NOT EXISTS platform_product_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'trendyol', 'yemeksepeti', vb.
    internal_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    external_product_id VARCHAR(255) NOT NULL, -- Platform'daki ürün ID'si
    external_product_name VARCHAR(255) NOT NULL, -- Platform'daki ürün adı
    internal_product_name VARCHAR(255) NOT NULL, -- İç sistemdeki ürün adı
    price_sync_enabled BOOLEAN DEFAULT true, -- Fiyat senkronizasyonu aktif mi
    availability_sync_enabled BOOLEAN DEFAULT true, -- Stok senkronizasyonu aktif mi
    last_synced_at TIMESTAMP WITH TIME ZONE, -- Son senkronizasyon zamanı
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'error')), -- Senkronizasyon durumu
    sync_error TEXT, -- Son senkronizasyon hatası
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: Bir platformda bir ürün sadece bir kez eşleştirilebilir
    UNIQUE(restaurant_id, platform, internal_product_id),
    UNIQUE(restaurant_id, platform, external_product_id)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_platform_mappings_restaurant_platform 
ON platform_product_mappings(restaurant_id, platform);

CREATE INDEX IF NOT EXISTS idx_platform_mappings_external_product 
ON platform_product_mappings(restaurant_id, platform, external_product_id);

CREATE INDEX IF NOT EXISTS idx_platform_mappings_sync_status 
ON platform_product_mappings(restaurant_id, platform, sync_status);

-- Row Level Security (RLS) aktif et
ALTER TABLE platform_product_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Politikaları
-- Kullanıcılar sadece kendi restoranlarının eşleştirmelerini görebilir
CREATE POLICY "platform_mappings_select_own_restaurant" ON platform_product_mappings
    FOR SELECT USING (
        restaurant_id IN (
            SELECT restaurant_id FROM users WHERE id = auth.uid()
        )
    );

-- Kullanıcılar sadece kendi restoranlarına eşleştirme ekleyebilir
CREATE POLICY "platform_mappings_insert_own_restaurant" ON platform_product_mappings
    FOR INSERT WITH CHECK (
        restaurant_id IN (
            SELECT restaurant_id FROM users WHERE id = auth.uid()
        )
    );

-- Kullanıcılar sadece kendi restoranlarının eşleştirmelerini güncelleyebilir
CREATE POLICY "platform_mappings_update_own_restaurant" ON platform_product_mappings
    FOR UPDATE USING (
        restaurant_id IN (
            SELECT restaurant_id FROM users WHERE id = auth.uid()
        )
    );

-- Kullanıcılar sadece kendi restoranlarının eşleştirmelerini silebilir
CREATE POLICY "platform_mappings_delete_own_restaurant" ON platform_product_mappings
    FOR DELETE USING (
        restaurant_id IN (
            SELECT restaurant_id FROM users WHERE id = auth.uid()
        )
    );

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_platform_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_mappings_updated_at_trigger
    BEFORE UPDATE ON platform_product_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_mappings_updated_at();

-- Yorum
COMMENT ON TABLE platform_product_mappings IS 'Farklı platform ürünleri ile iç sistem ürünlerinin eşleştirmeleri';
COMMENT ON COLUMN platform_product_mappings.platform IS 'Platform adı (trendyol, yemeksepeti, vb.)';
COMMENT ON COLUMN platform_product_mappings.sync_status IS 'Senkronizasyon durumu (synced, pending, error)';
COMMENT ON COLUMN platform_product_mappings.price_sync_enabled IS 'Fiyat senkronizasyonu aktif mi';
COMMENT ON COLUMN platform_product_mappings.availability_sync_enabled IS 'Stok senkronizasyonu aktif mi'; 