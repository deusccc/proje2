-- Kurye İş Akışı Güncellemesi
-- Bu dosya kuryenin üzerine sipariş atandığında kabul ettiğinde hala müsaitte olması,
-- kurye siparişi yola çıkar dediğinde meşgul olması ve teslim edildi yapınca müsaite geçmesi için gerekli güncellemeleri içerir

-- 1. Courier tablosuna courier_status ve active_assignments alanlarını ekle
ALTER TABLE couriers 
ADD COLUMN IF NOT EXISTS courier_status VARCHAR(50) NOT NULL DEFAULT 'offline' 
CHECK (courier_status IN ('offline', 'online', 'available', 'busy', 'on_delivery', 'break', 'unavailable', 'inactive'));

ALTER TABLE couriers 
ADD COLUMN IF NOT EXISTS active_assignments INTEGER DEFAULT 0;

-- 2. Mevcut kuryeler için varsayılan değerleri ayarla
UPDATE couriers 
SET courier_status = CASE 
    WHEN is_available = true AND is_active = true THEN 'available'
    WHEN is_active = false THEN 'inactive'
    ELSE 'offline'
END
WHERE courier_status IS NULL OR courier_status = 'offline';

-- 3. Aktif atama sayılarını güncelle
UPDATE couriers 
SET active_assignments = (
    SELECT COUNT(*) 
    FROM delivery_assignments 
    WHERE courier_id = couriers.id
    AND status IN ('assigned', 'accepted', 'picked_up', 'on_the_way')
);

-- 4. Kurye durumu otomatik güncelleme fonksiyonu
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

-- 5. Trigger'ları oluştur
DROP TRIGGER IF EXISTS update_courier_status_on_assignment ON delivery_assignments;
CREATE TRIGGER update_courier_status_on_assignment
    AFTER INSERT OR UPDATE OR DELETE ON delivery_assignments
    FOR EACH ROW EXECUTE FUNCTION update_courier_status();

DROP TRIGGER IF EXISTS update_courier_status_on_courier_change ON couriers;
CREATE TRIGGER update_courier_status_on_courier_change
    BEFORE UPDATE ON couriers
    FOR EACH ROW EXECUTE FUNCTION update_courier_status();

-- 6. Mevcut kurye durumlarını güncelle
UPDATE couriers 
SET courier_status = CASE 
    WHEN active_assignments > 0 AND EXISTS (
        SELECT 1 FROM delivery_assignments 
        WHERE courier_id = couriers.id AND status = 'on_the_way'
    ) THEN 'busy'
    WHEN is_available = true AND is_active = true THEN 'available'
    WHEN is_active = false THEN 'inactive'
    ELSE 'offline'
END;

-- 7. Index'leri oluştur performans için
CREATE INDEX IF NOT EXISTS idx_couriers_status ON couriers(courier_status);
CREATE INDEX IF NOT EXISTS idx_couriers_available ON couriers(is_available, is_active, courier_status);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_courier_status ON delivery_assignments(courier_id, status);

-- 8. Kurye durumları için view oluştur
CREATE OR REPLACE VIEW courier_status_summary AS
SELECT 
    courier_status,
    COUNT(*) as count,
    ARRAY_AGG(full_name ORDER BY full_name) as courier_names
FROM couriers 
WHERE is_active = true
GROUP BY courier_status;

COMMENT ON VIEW courier_status_summary IS 'Kurye durumlarının özet görünümü';

-- 9. Kurye performans view'i
CREATE OR REPLACE VIEW courier_performance AS
SELECT 
    c.id,
    c.full_name,
    c.courier_status,
    c.active_assignments,
    c.is_available,
    c.is_active,
    COUNT(da.id) as total_assignments,
    COUNT(CASE WHEN da.status = 'delivered' THEN 1 END) as completed_deliveries,
    AVG(CASE WHEN da.status = 'delivered' THEN 
        EXTRACT(EPOCH FROM (da.delivered_at - da.assigned_at))/60 
    END) as avg_delivery_time_minutes,
    c.rating,
    c.total_deliveries,
    c.last_location_update
FROM couriers c
LEFT JOIN delivery_assignments da ON c.id = da.courier_id
WHERE c.is_active = true
GROUP BY c.id, c.full_name, c.courier_status, c.active_assignments, c.is_available, c.is_active, c.rating, c.total_deliveries, c.last_location_update;

COMMENT ON VIEW courier_performance IS 'Kurye performans metrikleri';

-- 10. Kurye durumu değişiklik logları için tablo
CREATE TABLE IF NOT EXISTS courier_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(50) DEFAULT 'system',
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Kurye durumu değişikliklerini log'layan trigger
CREATE OR REPLACE FUNCTION log_courier_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.courier_status != NEW.courier_status THEN
        INSERT INTO courier_status_logs (courier_id, old_status, new_status, reason)
        VALUES (NEW.id, OLD.courier_status, NEW.courier_status, 'Automatic status update');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_courier_status_change_trigger ON couriers;
CREATE TRIGGER log_courier_status_change_trigger
    AFTER UPDATE ON couriers
    FOR EACH ROW EXECUTE FUNCTION log_courier_status_change();

-- Migration tamamlandı
SELECT 'Kurye iş akışı güncellemesi başarıyla tamamlandı!' as message; 