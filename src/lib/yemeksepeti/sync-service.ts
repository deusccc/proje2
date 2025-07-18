import { supabase } from '@/lib/supabase/index'
import { 
  YemeksepetiClient, 
  createYemeksepetiClient,
  mapInternalProductToYemeksepeti,
  mapYemeksepetiOrderToInternal,
  mapInternalStatusToYemeksepeti,
  YemeksepetiConfig,
  YemeksepetiProduct,
  YemeksepetiCategory,
  YemeksepetiOrder
} from './client'

interface SyncResult {
  success: boolean
  message: string
  synced_items: number
  failed_items: number
  errors?: string[]
}

interface MenuSyncOptions {
  restaurantId: string
  syncType: 'full' | 'incremental'
  categories?: boolean
  products?: boolean
}

export class YemeksepetiSyncService {
  private client: YemeksepetiClient
  private restaurantId: string

  constructor(config: YemeksepetiConfig, restaurantId: string) {
    this.client = createYemeksepetiClient(config)
    this.restaurantId = restaurantId
  }

  // Menü Senkronizasyonu
  async syncMenu(options: MenuSyncOptions): Promise<SyncResult> {
    const syncLogId = await this.createSyncLog(options.syncType)
    
    try {
      let totalSynced = 0
      let totalFailed = 0
      const errors: string[] = []

      // Kategorileri senkronize et
      if (options.categories !== false) {
        const categoryResult = await this.syncCategories()
        totalSynced += categoryResult.synced_items
        totalFailed += categoryResult.failed_items
        if (categoryResult.errors) {
          errors.push(...categoryResult.errors)
        }
      }

      // Ürünleri senkronize et
      if (options.products !== false) {
        const productResult = await this.syncProducts()
        totalSynced += productResult.synced_items
        totalFailed += productResult.failed_items
        if (productResult.errors) {
          errors.push(...productResult.errors)
        }
      }

      await this.updateSyncLog(syncLogId, {
        sync_status: 'completed',
        synced_categories: options.categories !== false ? totalSynced : 0,
        synced_products: options.products !== false ? totalSynced : 0,
        failed_products: totalFailed,
        completed_at: new Date().toISOString()
      })

      return {
        success: true,
        message: 'Menü senkronizasyonu tamamlandı',
        synced_items: totalSynced,
        failed_items: totalFailed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      await this.updateSyncLog(syncLogId, {
        sync_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })

      return {
        success: false,
        message: 'Menü senkronizasyonu başarısız',
        synced_items: 0,
        failed_items: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Kategorileri senkronize et
  private async syncCategories(): Promise<SyncResult> {
    try {
      // İç sistemdeki kategorileri al
      const { data: internalCategories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', this.restaurantId)
        .eq('is_active', true)

      if (error) throw error

      let synced = 0
      let failed = 0
      const errors: string[] = []

      for (const category of internalCategories || []) {
        try {
          const yemeksepetiCategory = {
            name: category.name,
            description: category.description || '',
            sort_order: category.sort_order || 0,
            is_active: category.is_active
          }

          const result = await this.client.createCategory(yemeksepetiCategory)
          
          if (result.success) {
            synced++
          } else {
            failed++
            errors.push(`Kategori "${category.name}" senkronize edilemedi: ${result.error}`)
          }
        } catch (error) {
          failed++
          errors.push(`Kategori "${category.name}" hatası: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: true,
        message: `${synced} kategori senkronize edildi`,
        synced_items: synced,
        failed_items: failed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: 'Kategori senkronizasyonu başarısız',
        synced_items: 0,
        failed_items: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Ürünleri senkronize et
  private async syncProducts(): Promise<SyncResult> {
    try {
      // İç sistemdeki ürünleri al
      const { data: internalProducts, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(id, name),
          product_variants(*)
        `)
        .eq('restaurant_id', this.restaurantId)

      if (error) throw error

      let synced = 0
      let failed = 0
      const errors: string[] = []

      for (const product of internalProducts || []) {
        try {
          const yemeksepetiProduct = mapInternalProductToYemeksepeti(product)
          const result = await this.client.createProduct(yemeksepetiProduct)
          
          if (result.success && result.data) {
            // Ürün eşleştirmesini kaydet
            await this.savePlatformMapping(product.id, result.data.id, result.data.name)
            synced++
          } else {
            failed++
            errors.push(`Ürün "${product.name}" senkronize edilemedi: ${result.error}`)
          }
        } catch (error) {
          failed++
          errors.push(`Ürün "${product.name}" hatası: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: true,
        message: `${synced} ürün senkronize edildi`,
        synced_items: synced,
        failed_items: failed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: 'Ürün senkronizasyonu başarısız',
        synced_items: 0,
        failed_items: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Sipariş Senkronizasyonu
  async syncOrders(dateFrom?: string, dateTo?: string): Promise<SyncResult> {
    try {
      const params = {
        date_from: dateFrom || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Son 24 saat
        date_to: dateTo || new Date().toISOString(),
        limit: 50 // API maksimum 50'yi kabul ediyor
      }

      const result = await this.client.getOrders(params)
      
      if (!result.success || !result.data) {
        return {
          success: false,
          message: 'Siparişler alınamadı',
          synced_items: 0,
          failed_items: 0,
          errors: [result.error || 'Unknown error']
        }
      }

      let synced = 0
      let failed = 0
      const errors: string[] = []

      for (const order of result.data) {
        try {
          await this.saveExternalOrder(order)
          synced++
        } catch (error) {
          failed++
          errors.push(`Sipariş "${order.order_number}" kaydedilemedi: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: true,
        message: `${synced} sipariş senkronize edildi`,
        synced_items: synced,
        failed_items: failed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: 'Sipariş senkronizasyonu başarısız',
        synced_items: 0,
        failed_items: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Sipariş Durumu Güncelleme
  async updateOrderStatus(externalOrderId: string, status: string, notes?: string): Promise<boolean> {
    try {
      const yemeksepetiStatus = mapInternalStatusToYemeksepeti(status)
      const result = await this.client.updateOrderStatus(externalOrderId, yemeksepetiStatus, notes)
      
      if (result.success) {
        // Yerel veritabanında da güncelle
        await supabase
          .from('external_orders')
          .update({ 
            status: status,
            external_status: yemeksepetiStatus,
            updated_at: new Date().toISOString()
          })
          .eq('external_order_id', externalOrderId)
          .eq('platform', 'yemeksepeti')
      }
      
      return result.success
    } catch (error) {
      console.error('Sipariş durumu güncellenemedi:', error)
      return false
    }
  }

  // Ürün Durumu Güncelleme
  async updateProductAvailability(productId: string, isAvailable: boolean): Promise<boolean> {
    try {
      // Platform eşleştirmesini bul
      const { data: mapping } = await supabase
        .from('platform_product_mappings')
        .select('external_product_id')
        .eq('restaurant_id', this.restaurantId)
        .eq('platform', 'yemeksepeti')
        .eq('internal_product_id', productId)
        .single()

      if (!mapping) {
        console.error('Ürün eşleştirmesi bulunamadı')
        return false
      }

      const result = await this.client.updateProductAvailability(mapping.external_product_id, isAvailable)
      
      if (result.success) {
        // Eşleştirme tablosunu güncelle
        await supabase
          .from('platform_product_mappings')
          .update({ 
            is_active: isAvailable,
            last_synced_at: new Date().toISOString()
          })
          .eq('restaurant_id', this.restaurantId)
          .eq('platform', 'yemeksepeti')
          .eq('internal_product_id', productId)
      }
      
      return result.success
    } catch (error) {
      console.error('Ürün durumu güncellenemedi:', error)
      return false
    }
  }

  // Bağlantı Testi
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.client.testConnection()
      return result.success
    } catch (error) {
      console.error('Bağlantı testi başarısız:', error)
      return false
    }
  }

  // Yardımcı Fonksiyonlar
  private async createSyncLog(syncType: 'full' | 'incremental'): Promise<string> {
    const { data, error } = await supabase
      .from('menu_sync_logs')
      .insert([{
        restaurant_id: this.restaurantId,
        platform: 'yemeksepeti',
        sync_type: syncType,
        sync_status: 'started',
        started_at: new Date().toISOString()
      }])
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  private async updateSyncLog(logId: string, updates: any): Promise<void> {
    const { error } = await supabase
      .from('menu_sync_logs')
      .update(updates)
      .eq('id', logId)

    if (error) throw error
  }

  private async savePlatformMapping(internalProductId: string, externalProductId: string, externalProductName: string): Promise<void> {
    const { error } = await supabase
      .from('platform_product_mappings')
      .upsert([{
        restaurant_id: this.restaurantId,
        platform: 'yemeksepeti',
        internal_product_id: internalProductId,
        external_product_id: externalProductId,
        external_product_name: externalProductName,
        is_active: true,
        last_synced_at: new Date().toISOString()
      }])

    if (error) throw error
  }

  private async saveExternalOrder(order: YemeksepetiOrder): Promise<void> {
    const mappedOrder = mapYemeksepetiOrderToInternal(order)
    
    // Harici siparişi kaydet
    const { data: externalOrder, error: orderError } = await supabase
      .from('external_orders')
      .upsert([{
        restaurant_id: this.restaurantId,
        platform: 'yemeksepeti',
        ...mappedOrder
      }])
      .select('id')
      .single()

    if (orderError) throw orderError

    // Sipariş kalemlerini kaydet
    const orderItems = mappedOrder.items.map((item: any) => ({
      external_order_id: externalOrder.id,
      ...item
    }))

    const { error: itemsError } = await supabase
      .from('external_order_items')
      .upsert(orderItems)

    if (itemsError) throw itemsError
  }
}

// Factory fonksiyonu
export const createYemeksepetiSyncService = async (restaurantId: string): Promise<YemeksepetiSyncService | null> => {
  try {
    // Entegrasyon ayarlarını al
    const { data: integration, error } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('platform', 'yemeksepeti')
      .eq('is_active', true)
      .single()

    if (error || !integration) {
      console.error('Aktif Yemeksepeti entegrasyonu bulunamadı')
      return null
    }

    const config: YemeksepetiConfig = {
      vendorId: integration.vendor_id || '',
      restaurantName: integration.restaurant_name || '',
      chainCode: integration.chain_code || '',
      branchCode: integration.branch_code || '',
      integrationCode: integration.integration_code || '',
      webhookUrl: integration.webhook_url || '',
      webhookSecret: integration.webhook_secret || ''
    }

    return new YemeksepetiSyncService(config, restaurantId)
  } catch (error) {
    console.error('Yemeksepeti sync service oluşturulamadı:', error)
    return null
  }
}

// Otomatik senkronizasyon için yardımcı fonksiyonlar
export const scheduleMenuSync = async (restaurantId: string): Promise<void> => {
  const syncService = await createYemeksepetiSyncService(restaurantId)
  if (!syncService) return

  try {
    await syncService.syncMenu({
      restaurantId,
      syncType: 'incremental'
    })
  } catch (error) {
    console.error('Otomatik menü senkronizasyonu başarısız:', error)
  }
}

export const scheduleOrderSync = async (restaurantId: string): Promise<void> => {
  const syncService = await createYemeksepetiSyncService(restaurantId)
  if (!syncService) return

  try {
    await syncService.syncOrders()
  } catch (error) {
    console.error('Otomatik sipariş senkronizasyonu başarısız:', error)
  }
}

export type { SyncResult, MenuSyncOptions } 