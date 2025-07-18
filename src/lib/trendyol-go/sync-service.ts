import { createClient } from '@supabase/supabase-js'
import { createTrendyolYemekClient, TrendyolYemekClient } from './client'
import { TrendyolYemekConfig, TrendyolYemekSyncResult } from '@/types/trendyol-go'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export class TrendyolYemekSyncService {
  private client: TrendyolYemekClient
  private restaurantId: string

  constructor(client: TrendyolYemekClient, restaurantId: string) {
    this.client = client
    this.restaurantId = restaurantId
  }

  // Platform mapping'i kaydet
  private async savePlatformMapping(internalId: string, platformId: string, platformName: string, type: 'category' | 'product' = 'product') {
    const { error } = await supabase
      .from('platform_product_mappings')
      .upsert({
        restaurant_id: this.restaurantId,
        platform: 'trendyol',
        internal_product_id: type === 'product' ? internalId : null,
        internal_category_id: type === 'category' ? internalId : null,
        platform_product_id: platformId,
        internal_product_name: platformName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'restaurant_id,platform,internal_product_id,internal_category_id'
      })

    if (error) {
      console.error('Platform mapping kaydetme hatası:', error)
      throw error
    }
  }

  // Kategorileri senkronize et
  private async syncCategories(): Promise<TrendyolYemekSyncResult> {
    try {
      // Trendyol Yemek'ten mevcut kategorileri al
      const categoriesResult = await this.client.getCategories()
      
      if (!categoriesResult.success) {
        return {
          success: false,
          message: 'Trendyol Yemek kategorileri alınamadı',
          syncedItems: 0,
          failedItems: 0,
          errors: [categoriesResult.error || 'Unknown error']
        }
      }

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

      // Şimdilik sadece mevcut kategorileri mapping'e kaydet
      for (const category of internalCategories || []) {
        try {
          // Trendyol Yemek'te benzer isimli kategori var mı kontrol et
          const existingCategory = categoriesResult.data?.find(
            (trendyolCat: any) => trendyolCat.name.toLowerCase() === category.name.toLowerCase()
          )
          
          if (existingCategory) {
            // Platform mapping'i kaydet
            await this.savePlatformMapping(category.id, existingCategory.id, existingCategory.name, 'category')
            synced++
          } else {
            // Kategori bulunamadı, manuel eşleştirme gerekebilir
            failed++
            errors.push(`Kategori "${category.name}" Trendyol Yemek'te bulunamadı`)
          }
        } catch (error) {
          failed++
          errors.push(`Kategori "${category.name}" hatası: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: failed === 0,
        message: `${synced} kategori eşleştirildi`,
        syncedItems: synced,
        failedItems: failed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: 'Kategori senkronizasyonu başarısız',
        syncedItems: 0,
        failedItems: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Ürünleri senkronize et
  private async syncProducts(): Promise<TrendyolYemekSyncResult> {
    try {
      // Trendyol Yemek'ten mevcut ürünleri al
      const menuResult = await this.client.getRestaurantMenu()
      
      if (!menuResult.success) {
        return {
          success: false,
          message: 'Trendyol Yemek menüsü alınamadı',
          syncedItems: 0,
          failedItems: 0,
          errors: [menuResult.error || 'Unknown error']
        }
      }

      // İç sistemdeki ürünleri al
      const { data: internalProducts, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(id, name),
          product_variants(*),
          product_portions(*)
        `)
        .eq('restaurant_id', this.restaurantId)
        .eq('is_available', true)

      if (error) throw error

      let synced = 0
      let failed = 0
      const errors: string[] = []

      // Şimdilik sadece mevcut ürünleri mapping'e kaydet
      for (const product of internalProducts || []) {
        try {
          // Trendyol Yemek'te benzer isimli ürün var mı kontrol et
          const existingProduct = menuResult.data?.products?.find(
            (trendyolProduct: any) => trendyolProduct.name.toLowerCase() === product.name.toLowerCase()
          )
          
          if (existingProduct) {
            // Platform mapping'i kaydet
            await this.savePlatformMapping(product.id, existingProduct.id, existingProduct.name)
            synced++
          } else {
            // Ürün bulunamadı, manuel eşleştirme gerekebilir
            failed++
            errors.push(`Ürün "${product.name}" Trendyol Yemek'te bulunamadı`)
          }
        } catch (error) {
          failed++
          errors.push(`Ürün "${product.name}" hatası: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: failed === 0,
        message: `${synced} ürün eşleştirildi`,
        syncedItems: synced,
        failedItems: failed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: 'Ürün senkronizasyonu başarısız',
        syncedItems: 0,
        failedItems: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Siparişleri senkronize et
  private async syncOrders(): Promise<TrendyolYemekSyncResult> {
    try {
      // Son 24 saat içindeki siparişleri al
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
      
      const ordersResult = await this.client.getOrders({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        size: 50
      })
      
      if (!ordersResult.success) {
        return {
          success: false,
          message: 'Trendyol Yemek siparişleri alınamadı',
          syncedItems: 0,
          failedItems: 0,
          errors: [ordersResult.error || 'Unknown error']
        }
      }

      let synced = 0
      let failed = 0
      const errors: string[] = []

      // Siparişleri işle
      for (const order of ordersResult.data?.orders || []) {
        try {
          // Sipariş zaten sistemde var mı kontrol et
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('platform_order_id', order.id)
            .eq('platform', 'trendyol')
            .single()

          if (!existingOrder) {
            // Yeni sipariş, sisteme ekle
            const { error: insertError } = await supabase
              .from('orders')
              .insert({
                restaurant_id: this.restaurantId,
                platform: 'trendyol',
                platform_order_id: order.id,
                order_number: order.orderNumber,
                status: order.status.toLowerCase(),
                customer_name: order.customer.name,
                customer_phone: order.customer.phone,
                customer_email: order.customer.email,
                delivery_address: JSON.stringify(order.deliveryAddress),
                total_amount: order.finalAmount,
                delivery_fee: order.deliveryFee,
                items: JSON.stringify(order.items),
                payment_method: order.paymentMethod.toLowerCase(),
                payment_status: order.paymentStatus.toLowerCase(),
                delivery_type: order.deliveryType.toLowerCase(),
                estimated_delivery_time: order.estimatedDeliveryTime,
                customer_note: order.customerNote,
                created_at: order.createdAt,
                updated_at: order.updatedAt
              })

            if (insertError) throw insertError
            synced++
          }
        } catch (error) {
          failed++
          errors.push(`Sipariş "${order.orderNumber}" hatası: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: failed === 0,
        message: `${synced} sipariş senkronize edildi`,
        syncedItems: synced,
        failedItems: failed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: 'Sipariş senkronizasyonu başarısız',
        syncedItems: 0,
        failedItems: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Tam senkronizasyon
  async fullSync(): Promise<TrendyolYemekSyncResult> {
    try {
      console.log('🔄 Trendyol Yemek tam senkronizasyon başlatılıyor...')
      
      // Kategorileri senkronize et
      const categoryResult = await this.syncCategories()
      console.log('📁 Kategori senkronizasyonu:', categoryResult)
      
      // Ürünleri senkronize et
      const productResult = await this.syncProducts()
      console.log('🛍️ Ürün senkronizasyonu:', productResult)
      
      // Siparişleri senkronize et
      const orderResult = await this.syncOrders()
      console.log('📦 Sipariş senkronizasyonu:', orderResult)
      
      const totalSynced = categoryResult.syncedItems + productResult.syncedItems + orderResult.syncedItems
      const totalFailed = categoryResult.failedItems + productResult.failedItems + orderResult.failedItems
      const allErrors = [
        ...(categoryResult.errors || []),
        ...(productResult.errors || []),
        ...(orderResult.errors || [])
      ]
      
      return {
        success: totalFailed === 0,
        message: `Toplam ${totalSynced} öğe senkronize edildi`,
        syncedItems: totalSynced,
        failedItems: totalFailed,
        errors: allErrors.length > 0 ? allErrors : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: 'Tam senkronizasyon başarısız',
        syncedItems: 0,
        failedItems: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Restoran menüsünü al (sadece okuma amaçlı)
  async getRestaurantMenu(): Promise<TrendyolYemekSyncResult & { data?: any }> {
    try {
      const result = await this.client.getRestaurantMenu()
      
      if (result.success) {
        return {
          success: true,
          message: 'Menü başarıyla alındı',
          syncedItems: result.data?.products?.length || 0,
          failedItems: 0,
          data: result.data
        }
      } else {
        return {
          success: false,
          message: 'Menü alınamadı',
          syncedItems: 0,
          failedItems: 0,
          errors: [result.error || 'Unknown error']
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Menü alma işlemi başarısız',
        syncedItems: 0,
        failedItems: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Ürün durumunu güncelle
  async updateProductAvailability(productId: string, isAvailable: boolean): Promise<TrendyolYemekSyncResult> {
    try {
      console.log('🔄 Sync service updating product availability...', { productId, isAvailable })
      
      const result = await this.client.updateProductAvailability(productId, isAvailable)
      
      if (result.success) {
        return {
          success: true,
          message: `Ürün durumu ${isAvailable ? 'aktif' : 'pasif'} olarak güncellendi`,
          syncedItems: 1,
          failedItems: 0
        }
      } else {
        return {
          success: false,
          message: 'Ürün durumu güncellenemedi',
          syncedItems: 0,
          failedItems: 1,
          errors: [result.error || 'Unknown error']
        }
      }
    } catch (error) {
      console.error('❌ Sync service product availability update error:', error)
      return {
        success: false,
        message: 'Ürün durumu güncelleme başarısız',
        syncedItems: 0,
        failedItems: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Kategori durumunu güncelle
  async updateCategoryAvailability(categoryId: string, isAvailable: boolean): Promise<TrendyolYemekSyncResult> {
    try {
      console.log('🔄 Sync service updating category availability...', { categoryId, isAvailable })
      
      const result = await this.client.updateCategoryAvailability(categoryId, isAvailable)
      
      if (result.success) {
        return {
          success: true,
          message: `Kategori durumu ${isAvailable ? 'aktif' : 'pasif'} olarak güncellendi`,
          syncedItems: 1,
          failedItems: 0
        }
      } else {
        return {
          success: false,
          message: 'Kategori durumu güncellenemedi',
          syncedItems: 0,
          failedItems: 1,
          errors: [result.error || 'Unknown error']
        }
      }
    } catch (error) {
      console.error('❌ Sync service category availability update error:', error)
      return {
        success: false,
        message: 'Kategori durumu güncelleme başarısız',
        syncedItems: 0,
        failedItems: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Bağlantı testi
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.client.testConnection()
      return result.success
    } catch (error) {
      console.error('Trendyol Yemek bağlantı testi hatası:', error)
      return false
    }
  }
}

// Factory fonksiyonu
export async function createTrendyolYemekSyncService(restaurantId: string): Promise<TrendyolYemekSyncService | null> {
  try {
    // Entegrasyon ayarlarını al
    const { data: integration, error } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('platform', 'trendyol')
      .eq('is_active', true)
      .single()

    if (error || !integration) {
      console.error('Trendyol Yemek entegrasyonu bulunamadı:', error?.message)
      return null
    }

    // Gerekli alanları kontrol et
    if (!integration.seller_id || !integration.trendyol_restaurant_id || !integration.api_key || !integration.api_secret || !integration.token) {
      console.error('Trendyol Yemek entegrasyonu eksik bilgiler:', {
        seller_id: !!integration.seller_id,
        restaurant_id: !!integration.trendyol_restaurant_id,
        api_key: !!integration.api_key,
        api_secret: !!integration.api_secret,
        token: !!integration.token
      })
      return null
    }

    // Trendyol Yemek client'ı oluştur
    const config: TrendyolYemekConfig = {
      environment: 'production', // Veya 'staging'
      sellerId: integration.seller_id,
      restaurantId: integration.trendyol_restaurant_id,
      integrationReferenceCode: integration.integration_reference_code || '',
      apiKey: integration.api_key,
      apiSecret: integration.api_secret,
      token: integration.token
    }

    const client = createTrendyolYemekClient(config)
    return new TrendyolYemekSyncService(client, restaurantId)
  } catch (error) {
    console.error('Trendyol Yemek sync service oluşturma hatası:', error)
    return null
  }
}

// Backward compatibility
export const TrendyolGoSyncService = TrendyolYemekSyncService
export const createTrendyolGoSyncService = createTrendyolYemekSyncService 