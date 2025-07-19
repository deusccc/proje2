import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createYemeksepetiSyncService } from '@/lib/yemeksepeti/sync-service'
import { createTrendyolGoSyncService } from '@/lib/trendyol-go/sync-service'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are not configured.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id, platform, sync_type, categories, products, orders } = body

    // Validation
    if (!restaurant_id || !platform) {
      return NextResponse.json(
        { error: 'Restaurant ID ve platform gereklidir' },
        { status: 400 }
      )
    }

    // Entegrasyon ayarlarını kontrol et
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integration_settings')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .eq('platform', platform)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Aktif entegrasyon bulunamadı' },
        { status: 404 }
      )
    }

    // Platform'a göre senkronizasyon servisini oluştur
    let syncService: any = null
    
    if (platform === 'yemeksepeti') {
      syncService = await createYemeksepetiSyncService(restaurant_id)
    } else if (platform === 'trendyol') {
      syncService = await createTrendyolGoSyncService(restaurant_id)
    }
    
    if (!syncService) {
      return NextResponse.json(
        { error: 'Senkronizasyon servisi oluşturulamadı' },
        { status: 500 }
      )
    }

    let result: any = null

    // Senkronizasyon türüne göre işlem yap
    if (sync_type === 'menu' || categories || products) {
      // Menü senkronizasyonu
      result = await syncService.syncMenu({
        restaurantId: restaurant_id,
        syncType: sync_type === 'full' ? 'full' : 'incremental',
        categories: categories !== false,
        products: products !== false
      })
    } else if (sync_type === 'orders' || orders) {
      // Sipariş senkronizasyonu
      result = await syncService.syncOrders()
    } else {
      // Tam senkronizasyon
      const menuResult = await syncService.syncMenu({
        restaurantId: restaurant_id,
        syncType: 'full'
      })
      
      const orderResult = await syncService.syncOrders()
      
      result = {
        success: menuResult.success && orderResult.success,
        message: 'Tam senkronizasyon tamamlandı',
        menu_result: menuResult,
        order_result: orderResult,
        synced_items: menuResult.synced_items + orderResult.synced_items,
        failed_items: menuResult.failed_items + orderResult.failed_items
      }
    }

    // Entegrasyon ayarlarını güncelle
    await supabaseAdmin
      .from('integration_settings')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: result.success ? 'success' : 'error',
        last_error: result.success ? null : result.errors?.join(', ') || 'Unknown error'
      })
      .eq('id', integration.id)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result
    })

  } catch (error) {
    console.error('Senkronizasyon API hatası:', error)
    
    return NextResponse.json(
      { error: 'Senkronizasyon sırasında hata oluştu' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    const platform = searchParams.get('platform')

    if (!restaurantId || !platform) {
      return NextResponse.json(
        { error: 'Restaurant ID ve platform gereklidir' },
        { status: 400 }
      )
    }

    // Senkronizasyon geçmişini getir
    const { data: syncLogs, error: logsError } = await supabaseAdmin
      .from('menu_sync_logs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('platform', platform)
      .order('created_at', { ascending: false })
      .limit(10)

    if (logsError) throw logsError

    // Entegrasyon durumunu getir
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integration_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('platform', platform)
      .single()

    if (integrationError) throw integrationError

    return NextResponse.json({
      success: true,
      data: {
        integration,
        sync_logs: syncLogs || []
      }
    })

  } catch (error) {
    console.error('Senkronizasyon geçmişi getirilemedi:', error)
    
    return NextResponse.json(
      { error: 'Senkronizasyon geçmişi getirilemedi' },
      { status: 500 }
    )
  }
} 