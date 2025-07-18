-- Integration Settings tablosu
-- Platform entegrasyonları için restoran bazlı ayarlar

CREATE TABLE IF NOT EXISTS integration_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'yemeksepeti', 'trendyol', 'getir', vb.
    is_active BOOLEAN DEFAULT false,
    
    -- Platform spesifik bilgiler
    vendor_id VARCHAR(255), -- Platform'daki satıcı ID'si
    restaurant_name VARCHAR(255), -- Platform'daki restoran adı
    chain_code VARCHAR(255), -- Zincir kodu (eğer varsa)
    branch_code VARCHAR(255), -- Şube kodu
    integration_code VARCHAR(255), -- Entegrasyon kodu
    
    -- API bilgileri
    api_key VARCHAR(255), -- API anahtarı
    api_secret VARCHAR(255), -- API gizli anahtarı
    token VARCHAR(255), -- Token
    webhook_url VARCHAR(500), -- Webhook URL'i
    webhook_secret VARCHAR(255), -- Webhook gizli anahtarı
    
    -- Senkronizasyon ayarları
    auto_sync_menu BOOLEAN DEFAULT true,
    auto_sync_orders BOOLEAN DEFAULT true,
    sync_interval INTEGER DEFAULT 30, -- dakika
    
    -- Fiyat ayarları
    price_markup_percentage DECIMAL(5,2) DEFAULT 0, -- Fiyat artış yüzdesi
    delivery_fee_override DECIMAL(10,2), -- Teslimat ücreti override
    
    -- Durum bilgileri
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'syncing', 'error', 'success'
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: Her restoran için her platform sadece bir kez
    UNIQUE(restaurant_id, platform)
);

-- External orders tablosu
-- Dış platformlardan gelen siparişler
CREATE TABLE IF NOT EXISTS external_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'yemeksepeti', 'trendyol', 'getir', vb.
    
    -- Platform spesifik bilgiler
    external_order_id VARCHAR(255) NOT NULL, -- Platform'daki sipariş ID'si
    order_number VARCHAR(255), -- Sipariş numarası
    
    -- Müşteri bilgileri
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    customer_address TEXT,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    
    -- Sipariş durumu
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    external_status VARCHAR(50), -- Platform'daki durum
    
    -- Fiyat bilgileri
    total_amount DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    
    -- Ödeme bilgileri
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),
    
    -- Zaman bilgileri
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    order_date TIMESTAMP WITH TIME ZONE,
    
    -- Notlar
    notes TEXT,
    
    -- Ham veri (JSON)
    raw_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: Her platform için her sipariş ID'si sadece bir kez
    UNIQUE(platform, external_order_id)
);

-- External order items tablosu
-- Dış sipariş kalemleri
CREATE TABLE IF NOT EXISTS external_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_order_id UUID NOT NULL REFERENCES external_orders(id) ON DELETE CASCADE,
    
    -- Ürün bilgileri
    product_name VARCHAR(255) NOT NULL,
    external_product_id VARCHAR(255), -- Platform'daki ürün ID'si
    product_id UUID REFERENCES products(id), -- İç sistemdeki ürün ID'si (eşleştirilmişse)
    
    -- Miktar ve fiyat
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    
    -- Seçenekler
    variant_name VARCHAR(255),
    portion_name VARCHAR(255),
    special_instructions TEXT,
    
    -- Ham veri (JSON)
    raw_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform mapping tablosu
-- İç sistem ürünleri ile platform ürünleri arasındaki eşleştirme
CREATE TABLE IF NOT EXISTS platform_product_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    
    -- İç sistem ürünü
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Platform ürünü
    external_product_id VARCHAR(255) NOT NULL,
    external_product_name VARCHAR(255) NOT NULL,
    
    -- Aktif durum
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(restaurant_id, platform, product_id),
    UNIQUE(restaurant_id, platform, external_product_id)
);

-- Webhook logs tablosu
-- Webhook çağrıları için log
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    
    -- Webhook bilgileri
    event_type VARCHAR(100) NOT NULL,
    webhook_url VARCHAR(500),
    
    -- Request/Response
    request_body JSONB,
    response_body JSONB,
    http_status INTEGER,
    
    -- Durum
    is_processed BOOLEAN DEFAULT false,
    processing_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_integration_settings_restaurant_platform 
ON integration_settings(restaurant_id, platform);

CREATE INDEX IF NOT EXISTS idx_external_orders_restaurant_platform 
ON external_orders(restaurant_id, platform);

CREATE INDEX IF NOT EXISTS idx_external_orders_status 
ON external_orders(status);

CREATE INDEX IF NOT EXISTS idx_external_orders_external_id 
ON external_orders(platform, external_order_id);

CREATE INDEX IF NOT EXISTS idx_external_order_items_external_order 
ON external_order_items(external_order_id);

CREATE INDEX IF NOT EXISTS idx_platform_product_mapping_restaurant_platform 
ON platform_product_mapping(restaurant_id, platform);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_restaurant_platform 
ON webhook_logs(restaurant_id, platform);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at 
ON webhook_logs(created_at);

-- Trigger'lar
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_integration_settings_updated_at 
    BEFORE UPDATE ON integration_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_external_orders_updated_at 
    BEFORE UPDATE ON external_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_product_mapping_updated_at 
    BEFORE UPDATE ON platform_product_mapping 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 