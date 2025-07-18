import { GetirFoodClient } from './client'
import { GetirFoodSyncResult, GetirFoodSyncOptions } from '@/types/getir-food'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export class GetirFoodSyncService {
  private client: GetirFoodClient
  private restaurantId: string

  constructor(client: GetirFoodClient, restaurantId: string) {
    this.client = client
    this.restaurantId = restaurantId
  }

  // Tam senkronizasyon
  async syncAll(options: GetirFoodSyncOptions = {
    syncProducts: true,
    syncCategories: true,
    syncPrices: true,
    syncAvailability: true
  }): Promise<GetirFoodSyncResult> {
    try {
      console.log('🔄 Starting full Getir Food sync...')
      
      let totalSynced = 0
      let totalFailed = 0
      const errors: string[] = []

      // Kategorileri senkronize et
      if (options.syncCategories) {
        const categoryResult = await this.syncCategories()
        totalSynced += categoryResult.syncedItems
        totalFailed += categoryResult.failedItems
        if (categoryResult.errors) {
          errors.push(...categoryResult.errors)
        }
      }

      // Ürünleri senkronize et
      if (options.syncProducts) {
        const productResult = await this.syncProducts()
        totalSynced += productResult.syncedItems
        totalFailed += productResult.failedItems
        if (productResult.errors) {
          errors.push(...productResult.errors)
        }
      }

      // Fiyatları senkronize et
      if (options.syncPrices) {
        const priceResult = await this.syncPrices()
        totalSynced += priceResult.syncedItems
        totalFailed += priceResult.failedItems
        if (priceResult.errors) {
          errors.push(...priceResult.errors)
        }
      }

      // Stok durumlarını senkronize et
      if (options.syncAvailability) {
        const availabilityResult = await this.syncAvailability()
        totalSynced += availabilityResult.syncedItems
        totalFailed += availabilityResult.failedItems
        if (availabilityResult.errors) {
          errors.push(...availabilityResult.errors)
        }
      }

      const success = totalFailed === 0
      const message = success 
        ? `Getir Food senkronizasyonu tamamlandı: ${totalSynced} öğe senkronize edildi`
        : `Getir Food senkronizasyonu tamamlandı: ${totalSynced} başarılı, ${totalFailed} hatalı`

      return {
        success,
        message,
        syncedItems: totalSynced,
        failedItems: totalFailed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      console.error('❌ Getir Food sync error:', error)
      return {
        success: false,
        message: 'Getir Food senkronizasyonu başarısız',
        syncedItems: 0,
        failedItems: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Ürünleri senkronize et
  private async syncProducts(): Promise<GetirFoodSyncResult> {
    try {
      // Getir Food'dan mevcut ürünleri al
      const menuResult = await this.client.getMenu()
      
      if (!menuResult.success) {
        return {
          success: false,
          message: 'Getir Food menüsü alınamadı',
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
          // Getir Food'da benzer isimli ürün var mı kontrol et
          const existingProduct = menuResult.data?.products?.find(
            (getirProduct: any) => getirProduct.name.toLowerCase() === product.name.toLowerCase()
          )
          
          if (existingProduct) {
            // Platform mapping'i kaydet
            await this.savePlatformMapping(product.id, existingProduct.id, existingProduct.name)
            synced++
          } else {
            // Ürün bulunamadı, manuel eşleştirme gerekebilir
            failed++
            errors.push(`Ürün "${product.name}" Getir Food'da bulunamadı`)
          }
        } catch (error) {
          failed++
          errors.push(`Ürün "${product.name}" hatası: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: failed === 0,
        message: `Ürün senkronizasyonu tamamlandı: ${synced} başarılı, ${failed} hatalı`,
        syncedItems: synced,
        failedItems: failed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      console.error('❌ Product sync error:', error)
      return {
        success: false,
        message: 'Ürün senkronizasyonu başarısız',
        syncedItems: 0,
        failedItems: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Kategorileri senkronize et
  private async syncCategories(): Promise<GetirFoodSyncResult> {
    try {
      // Getir Food'dan mevcut kategorileri al
      const categoriesResult = await this.client.getCategories()
      
      if (!categoriesResult.success) {
        return {
          success: false,
          message: 'Getir Food kategorileri alınamadı',
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

      // Kategorileri eşleştir
      for (const category of internalCategories || []) {
        try {
          // Getir Food'da benzer isimli kategori var mı kontrol et
          const existingCategory = categoriesResult.data?.find(
            (getirCategory: any) => getirCategory.name.toLowerCase() === category.name.toLowerCase()
          )
          
          if (existingCategory) {
            // Platform mapping'i kaydet (kategoriler için ayrı tablo gerekebilir)
            synced++
          } else {
            // Kategori bulunamadı
            failed++
            errors.push(`Kategori "${category.name}" Getir Food'da bulunamadı`)
          }
        } catch (error) {
          failed++
          errors.push(`Kategori "${category.name}" hatası: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: failed === 0,
        message: `Kategori senkronizasyonu tamamlandı: ${synced} başarılı, ${failed} hatalı`,
        syncedItems: synced,
        failedItems: failed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      console.error('❌ Category sync error:', error)
      return {
        success: false,
        message: 'Kategori senkronizasyonu başarısız',
        syncedItems: 0,
        failedItems: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Fiyatları senkronize et
  private async syncPrices(): Promise<GetirFoodSyncResult> {
    try {
      // Platform mapping'lerini al
      const { data: mappings, error } = await supabase
        .from('platform_product_mappings')
        .select(`
          *,
          products(id, name, base_price)
        `)
        .eq('restaurant_id', this.restaurantId)
        .eq('platform', 'getir')
        .eq('price_sync_enabled', true)

      if (error) throw error

      let synced = 0
      let failed = 0
      const errors: string[] = []

      // Her mapping için fiyat güncelle
      for (const mapping of mappings || []) {
        try {
          const product = (mapping as any).products
          if (!product) continue

          // Getir Food'da ürün fiyatını güncelle
          const updateResult = await this.client.updateProduct(mapping.external_product_id, {
            price: product.base_price
          })

          if (updateResult.success) {
            synced++
            // Son senkronizasyon zamanını güncelle
            await this.updateMappingSync(mapping.id, 'synced')
          } else {
            failed++
            errors.push(`Ürün "${product.name}" fiyat güncelleme hatası: ${updateResult.error}`)
            await this.updateMappingSync(mapping.id, 'error')
          }
        } catch (error) {
          failed++
          errors.push(`Mapping ${mapping.id} hatası: ${error instanceof Error ? error.message : 'Unknown error'}`)
          await this.updateMappingSync(mapping.id, 'error')
        }
      }

      return {
        success: failed === 0,
        message: `Fiyat senkronizasyonu tamamlandı: ${synced} başarılı, ${failed} hatalı`,
        syncedItems: synced,
        failedItems: failed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      console.error('❌ Price sync error:', error)
      return {
        success: false,
        message: 'Fiyat senkronizasyonu başarısız',
        syncedItems: 0,
        failedItems: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Stok durumlarını senkronize et
  private async syncAvailability(): Promise<GetirFoodSyncResult> {
    try {
      // Platform mapping'lerini al
      const { data: mappings, error } = await supabase
        .from('platform_product_mappings')
        .select(`
          *,
          products(id, name, is_available)
        `)
        .eq('restaurant_id', this.restaurantId)
        .eq('platform', 'getir')
        .eq('availability_sync_enabled', true)

      if (error) throw error

      let synced = 0
      let failed = 0
      const errors: string[] = []

      // Her mapping için stok durumu güncelle
      for (const mapping of mappings || []) {
        try {
          const product = (mapping as any).products
          if (!product) continue

          // Getir Food'da ürün stok durumunu güncelle
          const updateResult = await this.client.updateProductAvailability(
            mapping.external_product_id, 
            product.is_available
          )

          if (updateResult.success) {
            synced++
            // Son senkronizasyon zamanını güncelle
            await this.updateMappingSync(mapping.id, 'synced')
          } else {
            failed++
            errors.push(`Ürün "${product.name}" stok durumu güncelleme hatası: ${updateResult.error}`)
            await this.updateMappingSync(mapping.id, 'error')
          }
        } catch (error) {
          failed++
          errors.push(`Mapping ${mapping.id} hatası: ${error instanceof Error ? error.message : 'Unknown error'}`)
          await this.updateMappingSync(mapping.id, 'error')
        }
      }

      return {
        success: failed === 0,
        message: `Stok durumu senkronizasyonu tamamlandı: ${synced} başarılı, ${failed} hatalı`,
        syncedItems: synced,
        failedItems: failed,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      console.error('❌ Availability sync error:', error)
      return {
        success: false,
        message: 'Stok durumu senkronizasyonu başarısız',
        syncedItems: 0,
        failedItems: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Platform mapping'i kaydet
  private async savePlatformMapping(
    internalProductId: string, 
    externalProductId: string, 
    externalProductName: string
  ): Promise<void> {
    try {
      // Mevcut mapping var mı kontrol et
      const { data: existingMapping, error: selectError } = await supabase
        .from('platform_product_mappings')
        .select('id')
        .eq('restaurant_id', this.restaurantId)
        .eq('platform', 'getir')
        .eq('internal_product_id', internalProductId)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError
      }

      // İç ürün bilgisini al
      const { data: internalProduct, error: productError } = await supabase
        .from('products')
        .select('name')
        .eq('id', internalProductId)
        .single()

      if (productError) throw productError

      const mappingData = {
        restaurant_id: this.restaurantId,
        platform: 'getir',
        internal_product_id: internalProductId,
        external_product_id: externalProductId,
        external_product_name: externalProductName,
        internal_product_name: internalProduct.name,
        price_sync_enabled: true,
        availability_sync_enabled: true,
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
        updated_at: new Date().toISOString()
      }

      if (existingMapping) {
        // Mevcut mapping'i güncelle
        const { error: updateError } = await supabase
          .from('platform_product_mappings')
          .update(mappingData)
          .eq('id', existingMapping.id)

        if (updateError) throw updateError
      } else {
        // Yeni mapping oluştur
        const { error: insertError } = await supabase
          .from('platform_product_mappings')
          .insert(mappingData)

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('❌ Platform mapping save error:', error)
      throw error
    }
  }

  // Mapping senkronizasyon durumunu güncelle
  private async updateMappingSync(mappingId: string, status: 'synced' | 'pending' | 'error'): Promise<void> {
    try {
      const { error } = await supabase
        .from('platform_product_mappings')
        .update({
          sync_status: status,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', mappingId)

      if (error) throw error
    } catch (error) {
      console.error('❌ Mapping sync update error:', error)
    }
  }

  // Restoran menüsünü al
  async getRestaurantMenu(): Promise<GetirFoodSyncResult & { data?: any }> {
    try {
      const result = await this.client.getMenu()
      
      if (result.success) {
        return {
          success: true,
          message: 'Getir Food menüsü başarıyla alındı',
          syncedItems: 1,
          failedItems: 0,
          data: result.data
        }
      } else {
        return {
          success: false,
          message: 'Getir Food menüsü alınamadı',
          syncedItems: 0,
          failedItems: 1,
          errors: [result.error || 'Unknown error']
        }
      }
    } catch (error) {
      console.error('❌ Get restaurant menu error:', error)
      return {
        success: false,
        message: 'Getir Food menüsü alınamadı',
        syncedItems: 0,
        failedItems: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Ürün durumunu güncelle
  async updateProductAvailability(productId: string, isAvailable: boolean): Promise<GetirFoodSyncResult> {
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
  async updateCategoryAvailability(categoryId: string, isAvailable: boolean): Promise<GetirFoodSyncResult> {
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
  async testConnection(): Promise<GetirFoodSyncResult> {
    try {
      const result = await this.client.testConnection()
      
      if (result.success) {
        return {
          success: true,
          message: result.data?.message || 'Getir Food bağlantısı başarılı',
          syncedItems: 1,
          failedItems: 0
        }
      } else {
        return {
          success: false,
          message: 'Getir Food bağlantı testi başarısız',
          syncedItems: 0,
          failedItems: 1,
          errors: [result.error || 'Unknown error']
        }
      }
    } catch (error) {
      console.error('❌ Connection test error:', error)
      return {
        success: false,
        message: 'Getir Food bağlantı testi başarısız',
        syncedItems: 0,
        failedItems: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
}

// Factory fonksiyonu
export const createGetirFoodSyncService = async (restaurantId: string): Promise<GetirFoodSyncService | null> => {
  try {
    // Restoran için Getir Food entegrasyonu ayarlarını al
    const { data: integrationSettings, error } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('platform', 'getir')
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('❌ Getir Food integration settings not found:', error)
      return null
    }

    // Getir Food client oluştur
    const client = new GetirFoodClient({
      appSecretKey: integrationSettings.app_secret_key,
      restaurantSecretKey: integrationSettings.restaurant_secret_key,
      environment: integrationSettings.environment || 'production'
    })

    // Sync service oluştur
    return new GetirFoodSyncService(client, restaurantId)
  } catch (error) {
    console.error('❌ Failed to create Getir Food sync service:', error)
    return null
  }
} 