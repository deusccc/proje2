import { NextRequest, NextResponse } from 'next/server'
import { createGetirFoodSyncService } from '@/lib/getir-food/sync-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id, category_id, is_available } = body

    console.log('🔄 Getir Food kategori durumu güncelleme:', { 
      restaurant_id, 
      category_id, 
      is_available 
    })

    // Validation
    if (!restaurant_id || !category_id || is_available === undefined) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Restaurant ID, Category ID ve availability durumu gereklidir' 
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

    // Kategori durumunu güncelle
    const result = await syncService.updateCategoryAvailability(category_id, is_available)
    
    if (result.success) {
      console.log('✅ Kategori durumu güncellendi:', {
        category_id,
        is_available,
        message: result.message
      })

      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          category_id,
          is_available
        }
      })
    } else {
      console.log('❌ Kategori durumu güncellenemedi:', result.errors)
      return NextResponse.json(
        { 
          success: false, 
          error: result.errors?.[0] || 'Kategori durumu güncellenemedi' 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Kategori durumu güncelleme hatası:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Kategori durumu güncellenirken hata oluştu' 
      },
      { status: 500 }
    )
  }
} 