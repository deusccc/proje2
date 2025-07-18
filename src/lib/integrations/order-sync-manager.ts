import { supabase } from '@/lib/supabase/index';
import { createMigrosYemekSync } from './migros-yemek/order-sync';

export class OrderSyncManager {
  /**
   * Sipariş durumunu tüm aktif entegrasyonlara senkronize et
   */
  static async syncOrderStatus(orderId: string, newStatus: string): Promise<void> {
    try {
      // Siparişin restoran ID'sini al
      const { data: order } = await supabase
        .from('orders')
        .select('restaurant_id')
        .eq('id', orderId)
        .single();

      if (!order) {
        console.error('Sipariş bulunamadı:', orderId);
        return;
      }

      const restaurantId = order.restaurant_id;

      // Restoran için aktif entegrasyonları al
      const { data: integrations } = await supabase
        .from('integration_settings')
        .select('platform')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);

      if (!integrations || integrations.length === 0) {
        console.log('Aktif entegrasyon bulunamadı:', restaurantId);
        return;
      }

      // Her entegrasyon için senkronizasyon yap
      const syncPromises = integrations.map(async (integration) => {
        try {
          switch (integration.platform) {
            case 'migros-yemek':
              const migrosSync = await createMigrosYemekSync(restaurantId);
              if (migrosSync) {
                await migrosSync.syncOrderStatus(orderId, newStatus);
              }
              break;
            
            case 'yemeksepeti':
              // Yemeksepeti entegrasyonu için
              console.log('Yemeksepeti senkronizasyonu henüz implement edilmedi');
              break;
            
            case 'getir':
              // Getir entegrasyonu için
              console.log('Getir senkronizasyonu henüz implement edilmedi');
              break;
            
            default:
              console.log('Bilinmeyen entegrasyon platformu:', integration.platform);
          }
        } catch (error) {
          console.error(`${integration.platform} senkronizasyon hatası:`, error);
        }
      });

      await Promise.all(syncPromises);

      console.log('✅ Sipariş durumu tüm entegrasyonlara senkronize edildi:', {
        orderId,
        newStatus,
        integrations: integrations.map(i => i.platform)
      });

    } catch (error) {
      console.error('💥 Sipariş senkronizasyon hatası:', error);
    }
  }

  /**
   * Sipariş iptal et
   */
  static async cancelOrder(orderId: string, reason: string): Promise<void> {
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('restaurant_id')
        .eq('id', orderId)
        .single();

      if (!order) return;

      const restaurantId = order.restaurant_id;

      // Migros Yemek entegrasyonu
      const migrosSync = await createMigrosYemekSync(restaurantId);
      if (migrosSync) {
        await migrosSync.cancelOrder(orderId, reason);
      }

      // Diğer entegrasyonlar için de iptal işlemi yapılabilir

    } catch (error) {
      console.error('Sipariş iptal senkronizasyon hatası:', error);
    }
  }

  /**
   * Menü öğesi durumunu güncelle
   */
  static async updateMenuItemAvailability(
    restaurantId: string, 
    productId: string, 
    isAvailable: boolean
  ): Promise<void> {
    try {
      // Migros Yemek entegrasyonu
      const migrosSync = await createMigrosYemekSync(restaurantId);
      if (migrosSync) {
        await migrosSync.updateMenuItemAvailability(productId, isAvailable);
      }

      // Diğer entegrasyonlar için de menü güncelleme yapılabilir

    } catch (error) {
      console.error('Menü öğesi senkronizasyon hatası:', error);
    }
  }

  /**
   * Tüm entegrasyonları test et
   */
  static async testAllIntegrations(restaurantId: string): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    try {
      // Migros Yemek testi
      const migrosSync = await createMigrosYemekSync(restaurantId);
      if (migrosSync) {
        results['migros-yemek'] = await migrosSync.testConnection();
      }

      // Diğer entegrasyonlar için de test yapılabilir

    } catch (error) {
      console.error('Entegrasyon test hatası:', error);
    }

    return results;
  }
} 