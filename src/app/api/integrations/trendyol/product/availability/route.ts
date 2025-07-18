import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTrendyolGoSyncService } from '@/lib/trendyol-go/sync-service'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id, product_id, is_available } = body

    console.log('🔄 Trendyol ürün durumu güncelleme:', { 
      restaurant_id, 
      product_id, 
      is_available 
    })

    // Validation
    if (!restaurant_id || !product_id || is_available === undefined) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Restaurant ID, Product ID ve availability durumu gereklidir' 
        },
        { status: 400 }
      )
    }

    // Trendyol GO sync service oluştur
    const syncService = await createTrendyolGoSyncService(restaurant_id)
    
    if (!syncService) {
      console.log('❌ Trendyol GO sync service oluşturulamadı')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Trendyol GO bağlantı servisi oluşturulamadı' 
        },
        { status: 500 }
      )
    }

    // Ürün durumunu güncelle
    const result = await syncService.updateProductAvailability(product_id, is_available)
    
    if (result.success) {
      console.log('✅ Ürün durumu güncellendi:', {
        product_id,
        is_available,
        message: result.message
      })

      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          product_id,
          is_available
        }
      })
    } else {
      console.log('❌ Ürün durumu güncellenemedi:', result.errors)
      return NextResponse.json(
        { 
          success: false, 
          error: result.errors?.[0] || 'Ürün durumu güncellenemedi' 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Ürün durumu güncelleme hatası:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ürün durumu güncellenirken hata oluştu' 
      },
      { status: 500 }
    )
  }
} 