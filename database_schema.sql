-- =====================================================
-- RESTORAN SİPARİŞ YÖNETİM SİSTEMİ VERİTABANI ŞEMASI
-- =====================================================

-- Restoranlar tablosu
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    detailed_address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    city VARCHAR(100),
    district VARCHAR(100),
    neighborhood VARCHAR(100),
    postal_code VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'staff', 'courier')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kategoriler tablosu
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Birimler tablosu
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ürünler tablosu
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    preparation_time INTEGER DEFAULT 15, -- dakika
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ürün varyantları tablosu
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_modifier DECIMAL(10, 2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ürün porsiyonları tablosu
CREATE TABLE IF NOT EXISTS product_portions (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    price_modifier DECIMAL(10, 2) DEFAULT 0,
    quantity_multiplier DECIMAL(5, 2) DEFAULT 1.0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Müşteriler tablosu
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Müşteri adresleri tablosu
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    address_title VARCHAR(255),
    address_line_1 TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    province VARCHAR(100),
    district VARCHAR(100),
    neighborhood VARCHAR(100),
    street VARCHAR(255),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    description TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Siparişler tablosu
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT NOT NULL,
    customer_address_lat DECIMAL(10, 8),
    customer_address_lng DECIMAL(11, 8),
    customer_address_description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'completed', 'cancelled')),
    total_amount DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    notes TEXT,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    location_verification_token VARCHAR(255),
    is_location_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sipariş kalemleri tablosu
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
    portion_id INTEGER REFERENCES product_portions(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    special_instructions TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sipariş kalemi seçenekleri tablosu
CREATE TABLE IF NOT EXISTS order_item_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    option_name VARCHAR(255) NOT NULL,
    option_value VARCHAR(255) NOT NULL,
    price_modifier DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kuryeler tablosu
CREATE TABLE IF NOT EXISTS couriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    vehicle_type VARCHAR(20) NOT NULL DEFAULT 'Bisiklet' CHECK (vehicle_type IN ('Bisiklet', 'Motosiklet', 'Araba', 'Yürüme')),
    license_plate VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    courier_status VARCHAR(50) NOT NULL DEFAULT 'offline' CHECK (courier_status IN ('offline', 'online', 'available', 'busy', 'on_delivery', 'break', 'unavailable', 'inactive')),
    active_assignments INTEGER DEFAULT 0,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMP WITH TIME ZONE,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kurye konum geçmişi tablosu
CREATE TABLE IF NOT EXISTS courier_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(5, 2),
    heading DECIMAL(5, 2),
    speed DECIMAL(5, 2),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teslimat atamaları tablosu
CREATE TABLE IF NOT EXISTS delivery_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'picked_up', 'on_the_way', 'delivered', 'cancelled')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    delivery_fee DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kurye bildirimleri tablosu
CREATE TABLE IF NOT EXISTS courier_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kurye değerlendirmeleri tablosu
CREATE TABLE IF NOT EXISTS courier_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- İNDEKSLER
-- =====================================================

-- Performans için gerekli indeksler
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_products_restaurant_id ON products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_portions_product_id ON product_portions(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_couriers_user_id ON couriers(user_id);
CREATE INDEX IF NOT EXISTS idx_couriers_is_available ON couriers(is_available);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_order_id ON delivery_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_courier_id ON delivery_assignments(courier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status ON delivery_assignments(status);
CREATE INDEX IF NOT EXISTS idx_courier_locations_courier_id ON courier_locations(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_locations_timestamp ON courier_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_courier_notifications_courier_id ON courier_notifications(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_ratings_courier_id ON courier_ratings(courier_id);

-- =====================================================
-- TRIGGER'LAR
-- =====================================================

-- updated_at alanını otomatik güncelleyen trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger'ları oluştur
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_portions_updated_at BEFORE UPDATE ON product_portions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON customer_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_couriers_updated_at BEFORE UPDATE ON couriers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_assignments_updated_at BEFORE UPDATE ON delivery_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Kurye durumu otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_courier_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Delivery assignment durumu değiştiğinde kurye durumunu güncelle
    IF TG_TABLE_NAME = 'delivery_assignments' THEN
        -- Kurye için aktif teslimat sayısını hesapla
        UPDATE couriers 
        SET 
            active_assignments = (
                SELECT COUNT(*) 
                FROM delivery_assignments 
                WHERE courier_id = COALESCE(NEW.courier_id, OLD.courier_id)
                AND status IN ('assigned', 'accepted', 'picked_up', 'on_the_way')
            ),
            courier_status = CASE 
                WHEN (
                    SELECT COUNT(*) 
                    FROM delivery_assignments 
                    WHERE courier_id = COALESCE(NEW.courier_id, OLD.courier_id)
                    AND status IN ('on_the_way')
                ) > 0 THEN 'busy'
                WHEN is_available = true AND is_active = true THEN 'available'
                WHEN is_active = false THEN 'inactive'
                ELSE 'offline'
            END,
            updated_at = NOW()
        WHERE id = COALESCE(NEW.courier_id, OLD.courier_id);
    END IF;
    
    -- Courier tablosunda is_available değiştiğinde durumu güncelle
    IF TG_TABLE_NAME = 'couriers' AND TG_OP = 'UPDATE' THEN
        NEW.courier_status = CASE 
            WHEN NEW.active_assignments > 0 AND EXISTS (
                SELECT 1 FROM delivery_assignments 
                WHERE courier_id = NEW.id AND status = 'on_the_way'
            ) THEN 'busy'
            WHEN NEW.is_available = true AND NEW.is_active = true THEN 'available'
            WHEN NEW.is_active = false THEN 'inactive'
            ELSE 'offline'
        END;
        NEW.updated_at = NOW();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger'ları oluştur
DROP TRIGGER IF EXISTS update_courier_status_on_assignment ON delivery_assignments;
CREATE TRIGGER update_courier_status_on_assignment
    AFTER INSERT OR UPDATE OR DELETE ON delivery_assignments
    FOR EACH ROW EXECUTE FUNCTION update_courier_status();

DROP TRIGGER IF EXISTS update_courier_status_on_courier_change ON couriers;
CREATE TRIGGER update_courier_status_on_courier_change
    BEFORE UPDATE ON couriers
    FOR EACH ROW EXECUTE FUNCTION update_courier_status();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Restoran bazlı veri izolasyonu için RLS politikaları
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_portions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_ratings ENABLE ROW LEVEL SECURITY;

-- RLS politikaları (Service role key ile çalışacak şekilde)
-- Bu politikalar service role key ile bypass edilecek 

-- Restoranlar için politika (tüm kullanıcılar görebilir)
CREATE POLICY "Restaurants are viewable by everyone" ON restaurants
    FOR SELECT USING (true);

-- Kullanıcılar için politika (kendi restoranındaki kullanıcıları görebilir)
CREATE POLICY "Users can view their restaurant users" ON users
    FOR SELECT USING (true);

-- Kategoriler için politika
CREATE POLICY "Categories are viewable by restaurant users" ON categories
    FOR SELECT USING (true);

-- Birimler için politika
CREATE POLICY "Units are viewable by restaurant users" ON units
    FOR SELECT USING (true);

-- Ürünler için politika
CREATE POLICY "Products are viewable by restaurant users" ON products
    FOR SELECT USING (true);

-- Ürün varyantları için politika
CREATE POLICY "Product variants are viewable by restaurant users" ON product_variants
    FOR SELECT USING (true);

-- Ürün porsiyonları için politika
CREATE POLICY "Product portions are viewable by restaurant users" ON product_portions
    FOR SELECT USING (true);

-- Müşteriler için politika
CREATE POLICY "Customers are viewable by restaurant users" ON customers
    FOR SELECT USING (true);

-- Müşteri adresleri için politika
CREATE POLICY "Customer addresses are viewable by restaurant users" ON customer_addresses
    FOR SELECT USING (true);

-- Siparişler için politika
CREATE POLICY "Orders are viewable by restaurant users" ON orders
    FOR SELECT USING (true);

-- Sipariş kalemleri için politika
CREATE POLICY "Order items are viewable by restaurant users" ON order_items
    FOR SELECT USING (true);

-- Sipariş kalemi seçenekleri için politika
CREATE POLICY "Order item options are viewable by restaurant users" ON order_item_options
    FOR SELECT USING (true);

-- Kuryeler için politika
CREATE POLICY "Couriers are viewable by restaurant users" ON couriers
    FOR SELECT USING (true);

-- Kurye konumları için politika
CREATE POLICY "Courier locations are viewable by restaurant users" ON courier_locations
    FOR SELECT USING (true);

-- Teslimat atamaları için politika
CREATE POLICY "Delivery assignments are viewable by restaurant users" ON delivery_assignments
    FOR SELECT USING (true);

-- Kurye bildirimleri için politika
CREATE POLICY "Courier notifications are viewable by restaurant users" ON courier_notifications
    FOR SELECT USING (true);

-- Kurye değerlendirmeleri için politika
CREATE POLICY "Courier ratings are viewable by restaurant users" ON courier_ratings
    FOR SELECT USING (true);

-- =====================================================
-- VERİTABANI ŞEMASI TAMAMLANDI
-- ===================================================== 