import { NextRequest, NextResponse } from 'next/server'
import { createGetirFoodSyncService } from '@/lib/getir-food/sync-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id } = body

    console.log('🍽️ Getir Food menü çekme isteği:', { restaurant_id })

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

    // Getir Food'dan menüyü çek
    console.log('🔄 Getir Food menüsü çekiliyor...')
    const menuResult = await syncService.getRestaurantMenu()
    
    if (!menuResult.success) {
      console.log('❌ Getir Food menüsü çekilemedi:', menuResult.errors)
      return NextResponse.json(
        { 
          success: false, 
          error: menuResult.errors?.[0] || 'Getir Food menüsü alınamadı' 
        },
        { status: 500 }
      )
    }

    console.log('✅ Getir Food menüsü başarıyla çekildi:', {
      products: menuResult.data?.products?.length || 0,
      categories: menuResult.data?.categories?.length || 0
    })

    // Debug: İlk ürünü logla
    if (menuResult.data?.products?.length > 0) {
      console.log('🔍 İlk ürün örneği:', JSON.stringify(menuResult.data.products[0], null, 2))
    }

    // Verileri format'la
    const formattedProducts = menuResult.data?.products?.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price || 0,
      originalPrice: product.originalPrice,
      isAvailable: product.isAvailable,
      categoryId: product.categoryId,
      categoryName: product.categoryName || 'Kategori Yok',
      imageUrl: product.imageUrl,
      variants: product.variants,
      modifierGroups: product.modifierGroups
    })) || []

    const formattedCategories = menuResult.data?.categories?.map((category: any) => ({
      id: category.id,
      name: category.name,
      isAvailable: category.isAvailable,
      sortOrder: category.sortOrder
    })) || []

    console.log('🔍 Formatlanmış ürün örneği:', formattedProducts[0])
    console.log('🔍 Formatlanmış kategori örneği:', formattedCategories[0])

    return NextResponse.json({
      success: true,
      message: 'Getir Food menüsü başarıyla çekildi',
      data: {
        products: formattedProducts,
        categories: formattedCategories,
        restaurant: menuResult.data?.restaurant || null
      }
    })

  } catch (error) {
    console.error('💥 Getir Food menü çekme hatası:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Getir Food menüsü çekilirken hata oluştu',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 