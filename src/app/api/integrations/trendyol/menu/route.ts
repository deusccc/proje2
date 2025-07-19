import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTrendyolGoSyncService } from '@/lib/trendyol-go/sync-service'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are not configured.')
}

// Service role key ile admin client oluştur
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id } = body

    console.log('🍽️ Trendyol menü çekme isteği:', { restaurant_id })

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

    // Entegrasyon ayarlarını kontrol et
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integration_settings')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .eq('platform', 'trendyol')
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      console.log('❌ Aktif Trendyol entegrasyonu bulunamadı:', integrationError?.message)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Aktif Trendyol entegrasyonu bulunamadı',
          details: integrationError?.message
        },
        { status: 404 }
      )
    }

    console.log('✅ Trendyol entegrasyonu bulundu:', {
      platform: integration.platform,
      is_active: integration.is_active,
      vendor_id: integration.vendor_id ? '✅ Mevcut' : '❌ Yok'
    })

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

    // Trendyol'dan menüyü çek
    console.log('🔄 Trendyol menüsü çekiliyor...')
    const menuResult = await syncService.getRestaurantMenu()
    
    if (!menuResult.success) {
      console.log('❌ Trendyol menüsü çekilemedi:', menuResult.errors)
      return NextResponse.json(
        { 
          success: false, 
          error: menuResult.errors?.[0] || 'Trendyol menüsü alınamadı' 
        },
        { status: 500 }
      )
    }

    console.log('✅ Trendyol menüsü başarıyla çekildi:', {
      products: menuResult.data?.products?.length || 0,
      categories: menuResult.data?.categories?.length || 0
    })

    // Debug: İlk ürünü logla
    if (menuResult.data?.products?.length > 0) {
      console.log('🔍 İlk ürün örneği:', JSON.stringify(menuResult.data.products[0], null, 2))
    }

    // Sections'tan kategorileri çıkar
    const formattedCategories = menuResult.data?.sections?.map((section: any) => ({
      id: section.id,
      name: section.name,
      isAvailable: section.status === 'ACTIVE',
      sortOrder: section.position
    })) || []

    // Verileri format'la
    const formattedProducts = menuResult.data?.products?.map((product: any) => {
      // Kategori bilgisini sections'tan bul
      const productSection = menuResult.data?.sections?.find((section: any) => 
        section.products?.some((p: any) => p.id === product.id)
      )
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.sellingPrice || product.price || product.basePrice || 0,
        originalPrice: product.originalPrice,
        isAvailable: product.isAvailable, // Ham data'dan doğrudan al
        categoryId: productSection?.id,
        categoryName: productSection?.name || 'Kategori Yok',
        imageUrl: product.imageUrl,
        variants: product.variants,
        portions: product.portions
      }
    }) || []

    console.log('🔍 Formatlanmış ürün örneği:', formattedProducts[0])
    console.log('🔍 Formatlanmış kategori örneği:', formattedCategories[0])

    return NextResponse.json({
      success: true,
      message: 'Trendyol menüsü başarıyla çekildi',
      data: {
        products: formattedProducts,
        categories: formattedCategories,
        restaurant: menuResult.data?.restaurant || null
      }
    })

  } catch (error) {
    console.error('💥 Trendyol menü çekme hatası:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Trendyol menüsü çekilirken hata oluştu',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 