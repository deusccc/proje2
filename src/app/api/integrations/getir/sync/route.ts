import { NextRequest, NextResponse } from 'next/server'
import { createGetirFoodSyncService } from '@/lib/getir-food/sync-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      restaurant_id, 
      sync_products = true, 
      sync_categories = true, 
      sync_prices = true, 
      sync_availability = true,
      dry_run = false
    } = body

    console.log('🔄 Getir Food senkronizasyon isteği:', { 
      restaurant_id, 
      sync_products, 
      sync_categories, 
      sync_prices, 
      sync_availability,
      dry_run
    })

    // Validation
    if (!restaurant_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Restaurant ID gereklidir' 
        },
        { status: 400 }
      )
    }

    // Getir Food sync service oluştur
    const syncService = await createGetirFoodSyncService(restaurant_id)
    
    if (!syncService) {
      console.log('❌ Getir Food sync service oluşturulamadı')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Getir Food bağlantı servisi oluşturulamadı' 
        },
        { status: 500 }
      )
    }

    // Senkronizasyon yap
    console.log('🔄 Getir Food senkronizasyonu başlatılıyor...')
    const result = await syncService.syncAll({
      syncProducts: sync_products,
      syncCategories: sync_categories,
      syncPrices: sync_prices,
      syncAvailability: sync_availability,
      dryRun: dry_run
    })
    
    if (result.success) {
      console.log('✅ Getir Food senkronizasyonu tamamlandı:', {
        syncedItems: result.syncedItems,
        failedItems: result.failedItems,
        message: result.message
      })

      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          syncedItems: result.syncedItems,
          failedItems: result.failedItems,
          errors: result.errors,
          timestamp: new Date().toISOString()
        }
      })
    } else {
      console.log('❌ Getir Food senkronizasyonu başarısız:', result.errors)
      return NextResponse.json(
        { 
          success: false, 
          error: result.message,
          details: result.errors
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('💥 Getir Food senkronizasyon hatası:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Getir Food senkronizasyonu sırasında hata oluştu',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 