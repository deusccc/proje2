const { createClient } = require('@supabase/supabase-js');

// Supabase MCP Köprüsü - MCP benzeri işlevsellik
class SupabaseMCPBridge {
  constructor() {
    this.supabase = createClient(
      'https://nijfrqlruefhnjnynnfx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamZycWxydWVmaG5qbnlubmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTY1NTAsImV4cCI6MjA2NjM3MjU1MH0.MFs7dkuOQzyUhLmsjNMrOqA6WBBuUGhSzWxJJh-hBDA'
    );
  }

  // MCP benzeri tool fonksiyonları
  async getCouriers(filters = {}) {
    console.log('🔍 Kurye verilerini alıyor...');
    
    let query = this.supabase
      .from('couriers')
      .select('*');

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    
    if (filters.isAvailable !== undefined) {
      query = query.eq('is_available', filters.isAvailable);
    }

    if (filters.hasLocation) {
      query = query.not('current_latitude', 'is', null)
                   .not('current_longitude', 'is', null);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Kurye verisi alınamadı: ${error.message}`);
    }

    return {
      success: true,
      data: data,
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    };
  }

  async updateCourierLocation(courierId, latitude, longitude, accuracy = null) {
    console.log(`📍 Kurye ${courierId} konumu güncelleniyor...`);
    
    const updateData = {
      current_latitude: latitude,
      current_longitude: longitude,
      last_location_update: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (accuracy) {
      updateData.location_accuracy = accuracy;
    }

    const { data, error } = await this.supabase
      .from('couriers')
      .update(updateData)
      .eq('id', courierId)
      .select();

    if (error) {
      throw new Error(`Konum güncellenemedi: ${error.message}`);
    }

    return {
      success: true,
      data: data[0],
      message: 'Konum başarıyla güncellendi',
      timestamp: new Date().toISOString()
    };
  }

  async getActiveAssignments(courierId = null) {
    console.log('📦 Aktif atamalar alınıyor...');
    
    let query = this.supabase
      .from('delivery_assignments')
      .select(`
        id,
        status,
        courier_id,
        order_id,
        created_at,
        accepted_at,
        picked_up_at,
        delivered_at,
        orders:order_id (
          customer_name,
          customer_address,
          customer_phone,
          total_amount
        ),
        couriers:courier_id (
          full_name,
          phone,
          vehicle_type
        )
      `)
      .in('status', ['assigned', 'accepted', 'picked_up', 'on_the_way']);

    if (courierId) {
      query = query.eq('courier_id', courierId);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Atama verisi alınamadı: ${error.message}`);
    }

    return {
      success: true,
      data: data,
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    };
  }

  async updateAssignmentStatus(assignmentId, newStatus, additionalData = {}) {
    console.log(`🔄 Atama ${assignmentId} durumu güncelleniyor: ${newStatus}`);
    
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      ...additionalData
    };

    // Durum bazlı timestamp'ler
    const statusTimestamps = {
      'accepted': 'accepted_at',
      'picked_up': 'picked_up_at',
      'on_the_way': 'on_the_way_at',
      'delivered': 'delivered_at',
      'cancelled': 'cancelled_at'
    };

    if (statusTimestamps[newStatus]) {
      updateData[statusTimestamps[newStatus]] = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('delivery_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select();

    if (error) {
      throw new Error(`Atama durumu güncellenemedi: ${error.message}`);
    }

    return {
      success: true,
      data: data[0],
      message: `Atama durumu ${newStatus} olarak güncellendi`,
      timestamp: new Date().toISOString()
    };
  }

  async executeQuery(tableName, operation, data = {}, filters = {}) {
    console.log(`🗃️ ${operation} işlemi ${tableName} tablosunda gerçekleştiriliyor...`);
    
    try {
      let query = this.supabase.from(tableName);
      
      switch (operation.toLowerCase()) {
        case 'select':
          query = query.select(data.select || '*');
          
          // Filtreleri uygula
          Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else if (typeof value === 'object' && value.operator) {
              switch (value.operator) {
                case 'gt':
                  query = query.gt(key, value.value);
                  break;
                case 'lt':
                  query = query.lt(key, value.value);
                  break;
                case 'gte':
                  query = query.gte(key, value.value);
                  break;
                case 'lte':
                  query = query.lte(key, value.value);
                  break;
                case 'like':
                  query = query.like(key, value.value);
                  break;
                case 'ilike':
                  query = query.ilike(key, value.value);
                  break;
                case 'not':
                  query = query.not(key, 'eq', value.value);
                  break;
                default:
                  query = query.eq(key, value.value);
              }
            } else {
              query = query.eq(key, value);
            }
          });
          
          if (data.limit) {
            query = query.limit(data.limit);
          }
          
          if (data.order) {
            query = query.order(data.order.column, { ascending: data.order.ascending !== false });
          }
          
          break;
          
        case 'insert':
          query = query.insert(data);
          break;
          
        case 'update':
          query = query.update(data);
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
          break;
          
        case 'delete':
          query = query.delete();
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
          break;
          
        default:
          throw new Error(`Desteklenmeyen işlem: ${operation}`);
      }

      const { data: result, error } = await query;
      
      if (error) {
        throw error;
      }

      return {
        success: true,
        data: result,
        operation: operation,
        table: tableName,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`${operation} işlemi başarısız: ${error.message}`);
    }
  }

  // MCP benzeri subscription/realtime
  subscribeToChanges(tableName, callback, filters = {}) {
    console.log(`🔔 ${tableName} tablosuna subscription başlatılıyor...`);
    
    let channel = this.supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          ...filters
        },
        (payload) => {
          callback({
            event: payload.eventType,
            table: tableName,
            old: payload.old,
            new: payload.new,
            timestamp: new Date().toISOString()
          });
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        console.log(`🔕 ${tableName} subscription sonlandırılıyor...`);
        channel.unsubscribe();
      }
    };
  }
}

// MCP Tool Export
module.exports = {
  SupabaseMCPBridge,
  
  // MCP benzeri tool tanımları
  tools: {
    'supabase_get_couriers': {
      description: 'Kurye verilerini filtrelerle birlikte getirir',
      parameters: {
        isActive: { type: 'boolean', description: 'Aktif kuryeleri filtrele' },
        isAvailable: { type: 'boolean', description: 'Müsait kuryeleri filtrele' },
        hasLocation: { type: 'boolean', description: 'Konumu olan kuryeleri filtrele' }
      }
    },
    
    'supabase_update_location': {
      description: 'Kurye konumunu günceller',
      parameters: {
        courierId: { type: 'string', required: true, description: 'Kurye ID' },
        latitude: { type: 'number', required: true, description: 'Enlem' },
        longitude: { type: 'number', required: true, description: 'Boylam' },
        accuracy: { type: 'number', description: 'Konum doğruluğu' }
      }
    },
    
    'supabase_get_assignments': {
      description: 'Aktif teslimat atamalarını getirir',
      parameters: {
        courierId: { type: 'string', description: 'Belirli kurye için filtrele' }
      }
    },
    
    'supabase_execute_query': {
      description: 'Genel Supabase sorgusu çalıştırır',
      parameters: {
        tableName: { type: 'string', required: true, description: 'Tablo adı' },
        operation: { type: 'string', required: true, description: 'İşlem türü (select, insert, update, delete)' },
        data: { type: 'object', description: 'İşlem verisi' },
        filters: { type: 'object', description: 'Filtreler' }
      }
    }
  }
};

// Test kullanımı
if (require.main === module) {
  async function testMCP() {
    const bridge = new SupabaseMCPBridge();
    
    try {
      // Kuryeleri al
      const couriers = await bridge.getCouriers({ isActive: true, hasLocation: true });
      console.log('Kuryeler:', couriers);
      
      // Aktif atamaları al
      const assignments = await bridge.getActiveAssignments();
      console.log('Atamalar:', assignments);
      
      // Genel sorgu test
      const orders = await bridge.executeQuery('orders', 'select', {
        select: 'id, customer_name, status, created_at',
        limit: 5,
        order: { column: 'created_at', ascending: false }
      }, {
        status: 'pending'
      });
      console.log('Siparişler:', orders);
      
    } catch (error) {
      console.error('MCP Test hatası:', error.message);
    }
  }
  
  testMCP();
} 