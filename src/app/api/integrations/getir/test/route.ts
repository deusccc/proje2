import { NextRequest, NextResponse } from 'next/server'
import { createGetirFoodSyncService } from '@/lib/getir-food/sync-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id } = body

    console.log('🧪 Getir Food bağlantı testi:', { restaurant_id })

    // Environment variable'ları kontrol et
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('🔧 Environment Variables:', {
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'SET' : 'MISSING'
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase environment variables eksik',
          details: {
            supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
            supabaseServiceKey: supabaseServiceKey ? 'SET' : 'MISSING'
          }
        },
        { status: 500 }
      )
    }

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
          error: 'Getir Food bağlantı servisi oluşturulamadı. Entegrasyon ayarlarını kontrol edin.' 
        },
        { status: 500 }
      )
    }

    // Bağlantı testi yap
    const result = await syncService.testConnection()
    
    if (result.success) {
      console.log('✅ Getir Food bağlantı testi başarılı')
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          status: 'connected',
          platform: 'getir',
          timestamp: new Date().toISOString()
        }
      })
    } else {
      console.log('❌ Getir Food bağlantı testi başarısız:', result.errors)
      return NextResponse.json(
        { 
          success: false, 
          error: result.errors?.[0] || 'Getir Food bağlantı testi başarısız' 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('💥 Getir Food bağlantı testi hatası:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Getir Food bağlantı testi sırasında hata oluştu',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 