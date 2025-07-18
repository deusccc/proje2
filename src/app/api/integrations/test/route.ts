import { NextRequest, NextResponse } from 'next/server'
import { createTrendyolYemekSyncService } from '@/lib/trendyol-go/sync-service'

export async function POST(request: NextRequest) {
  try {
    const { restaurant_id, platform } = await request.json()

    console.log('🧪 Entegrasyon testi başlatılıyor:', { restaurant_id, platform })

    if (!restaurant_id || !platform) {
      return NextResponse.json({
        success: false,
        error: 'Restaurant ID ve platform bilgisi gerekli'
      }, { status: 400 })
    }

    if (platform === 'trendyol') {
      const syncService = await createTrendyolYemekSyncService(restaurant_id)
      
      if (!syncService) {
        return NextResponse.json({
          success: false,
          error: 'Trendyol GO entegrasyonu bulunamadı veya eksik bilgiler var'
        }, { status: 404 })
      }

      console.log('🔄 Trendyol GO test ediliyor...')
      const testResult = await syncService.testConnection()
      
      if (testResult) {
        console.log('✅ Trendyol GO bağlantı testi başarılı')
        return NextResponse.json({
          success: true,
          message: 'Trendyol GO API bağlantısı başarılı',
          test_details: {
            vendor_id: syncService['client']['config'].sellerId,
            api_environment: 'production',
            last_sync: new Date().toISOString(),
            sync_status: 'success'
          }
        })
      } else {
        console.log('❌ Trendyol GO bağlantı testi başarısız')
        return NextResponse.json({
          success: false,
          error: 'Trendyol GO API bağlantısı başarısız',
          test_details: {
            vendor_id: syncService['client']['config'].sellerId,
            api_environment: 'production',
            last_sync: new Date().toISOString(),
            sync_status: 'error'
          }
        })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Desteklenmeyen platform'
    }, { status: 400 })

  } catch (error) {
    console.error('❌ Test hatası:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 })
  }
} 