import { supabase } from '@/lib/supabase/index';
import { MigrosYemekApiClient } from './api-client';
import { MigrosYemekConfig, MigrosYemekOrderStatusUpdate } from './types';

export class MigrosYemekOrderSync {
  private apiClient: MigrosYemekApiClient;
  private restaurantId: string;

  constructor(config: MigrosYemekConfig, restaurantId: string) {
    this.apiClient = new MigrosYemekApiClient(config);
    this.restaurantId = restaurantId;
  }

  /**
   * Sipariş durumunu Migros Yemek'e senkronize et
   */
  async syncOrderStatus(internalOrderId: string, newStatus: string): Promise<boolean> {
    try {
      // External order mapping'ini bul
      const { data: externalOrder } = await supabase
        .from('external_orders')
        .select('external_order_id, external_status')
        .eq('internal_order_id', internalOrderId)
        .eq('platform', 'migros-yemek')
        .single();

      if (!externalOrder) {
        console.log('Migros Yemek external order bulunamadı:', internalOrderId);
        return false;
      }

      const migrosOrderId = parseInt(externalOrder.external_order_id);
      const migrosStatus = this.mapInternalStatusToMigros(newStatus);

      if (!migrosStatus) {
        console.log('Migros Yemek durumu eşleştirilemedi:', newStatus);
        return false;
      }

      // Aynı durum ise senkronize etme
      if (externalOrder.external_status === migrosStatus) {
        console.log('Migros Yemek durumu zaten güncel:', migrosStatus);
        return true;
      }

      // Migros Yemek API'ye durum gönder
      const result = await this.apiClient.updateOrderStatus(
        migrosOrderId, 
        migrosStatus as MigrosYemekOrderStatusUpdate['status']
      );

      if (result.success) {
        // External order durumunu güncelle
        await supabase
          .from('external_orders')
          .update({ 
            external_status: migrosStatus,
            updated_at: new Date().toISOString()
          })
          .eq('internal_order_id', internalOrderId)
          .eq('platform', 'migros-yemek');

        console.log('✅ Migros Yemek durum senkronizasyonu başarılı:', {
          internalOrderId,
          migrosOrderId,
          newStatus: migrosStatus
        });

        return true;
      } else {
        console.error('❌ Migros Yemek durum senkronizasyonu başarısız:', result.error);
        return false;
      }

    } catch (error) {
      console.error('💥 Migros Yemek durum senkronizasyon hatası:', error);
      return false;
    }
  }

  /**
   * Internal sipariş durumunu Migros Yemek durumuna eşleştir
   */
  private mapInternalStatusToMigros(internalStatus: string): MigrosYemekOrderStatusUpdate['status'] | null {
    const statusMap: Record<string, MigrosYemekOrderStatusUpdate['status']> = {
      'pending': 'CONFIRMED',
      'confirmed': 'CONFIRMED',
      'preparing': 'PREPARING',
      'ready': 'READY',
      'ready_for_pickup': 'READY',
      'picked_up': 'ON_THE_WAY',
      'out_for_delivery': 'ON_THE_WAY',
      'on_the_way': 'ON_THE_WAY',
      'delivered': 'DELIVERED',
      'cancelled': 'CANCELLED'
    };

    return statusMap[internalStatus] || null;
  }

  /**
   * Sipariş iptal et
   */
  async cancelOrder(internalOrderId: string, reason: string): Promise<boolean> {
    try {
      const { data: externalOrder } = await supabase
        .from('external_orders')
        .select('external_order_id')
        .eq('internal_order_id', internalOrderId)
        .eq('platform', 'migros-yemek')
        .single();

      if (!externalOrder) {
        return false;
      }

      const migrosOrderId = parseInt(externalOrder.external_order_id);
      const result = await this.apiClient.cancelOrder(migrosOrderId, reason);

      if (result.success) {
        await supabase
          .from('external_orders')
          .update({ 
            external_status: 'CANCELLED',
            updated_at: new Date().toISOString()
          })
          .eq('internal_order_id', internalOrderId)
          .eq('platform', 'migros-yemek');

        return true;
      }

      return false;
    } catch (error) {
      console.error('Migros Yemek sipariş iptal hatası:', error);
      return false;
    }
  }

  /**
   * Menü öğesi durumunu güncelle
   */
  async updateMenuItemAvailability(productId: string, isAvailable: boolean): Promise<boolean> {
    try {
      // Product mapping'ini bul
      const { data: productMapping } = await supabase
        .from('platform_product_mappings')
        .select('external_product_id')
        .eq('internal_product_id', productId)
        .eq('platform', 'migros-yemek')
        .eq('restaurant_id', this.restaurantId)
        .single();

      if (!productMapping) {
        console.log('Migros Yemek product mapping bulunamadı:', productId);
        return false;
      }

      const migrosProductId = parseInt(productMapping.external_product_id);
      const result = await this.apiClient.updateMenuItemAvailability(migrosProductId, isAvailable);

      if (result.success) {
        console.log('✅ Migros Yemek menü öğesi durumu güncellendi:', {
          productId,
          migrosProductId,
          isAvailable
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Migros Yemek menü öğesi durum güncelleme hatası:', error);
      return false;
    }
  }

  /**
   * Bağlantıyı test et
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.apiClient.testConnection();
      return result.success;
    } catch (error) {
      console.error('Migros Yemek bağlantı testi hatası:', error);
      return false;
    }
  }
}

/**
 * Migros Yemek entegrasyonu için factory function
 */
export async function createMigrosYemekSync(restaurantId: string): Promise<MigrosYemekOrderSync | null> {
  try {
    // Restoran için Migros Yemek ayarlarını al
    const { data: integrationSettings } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('platform', 'migros-yemek')
      .eq('is_active', true)
      .single();

    if (!integrationSettings) {
      console.log('Migros Yemek entegrasyonu aktif değil:', restaurantId);
      return null;
    }

    const config: MigrosYemekConfig = {
      secretKey: integrationSettings.app_secret_key || '',
      apiKey: integrationSettings.api_key || '',
      baseUrl: 'https://api.migros.com.tr', // Test/Production URL
      webhookUrl: integrationSettings.webhook_url || '',
      isActive: integrationSettings.is_active
    };

    return new MigrosYemekOrderSync(config, restaurantId);
  } catch (error) {
    console.error('Migros Yemek sync oluşturma hatası:', error);
    return null;
  }
} 