import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
    const { 
      restaurant_id,
      name, 
      description, 
      base_price,
      category_id,
      image_url,
      is_available,
      is_featured,
      preparation_time
    } = body

    // Validation
    if (!restaurant_id || !name || !category_id || base_price === undefined) {
      return NextResponse.json(
        { error: 'Restoran ID, ürün adı, kategori ve fiyat gereklidir' },
        { status: 400 }
      )
    }

    // Ürün verilerini hazırla
    const productData = {
      restaurant_id: restaurant_id,
      name: name.trim(),
      description: description?.trim() || null,
      base_price: Number(base_price),
      category_id: category_id,
      image_url: image_url?.trim() || null,
      is_available: is_available !== undefined ? is_available : true,
      is_featured: is_featured !== undefined ? is_featured : false,
      preparation_time: preparation_time || 15,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Service role key ile ürün oluştur
    const { data: newProduct, error: productError } = await supabaseAdmin
      .from('products')
      .insert(productData)
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .single()
    
    if (productError) {
      console.error('Ürün oluşturma hatası:', productError)
      throw productError
    }

    return NextResponse.json({
      success: true,
      product: newProduct,
      message: 'Ürün başarıyla oluşturuldu!'
    })

  } catch (error: any) {
    console.error('Product creation error:', error)
    
    let errorMessage = 'Ürün eklenemedi'
    
    if (error.code === '23505') {
      errorMessage = 'Bu ürün adı zaten kullanılıyor'
    } else if (error.code === '23503') {
      errorMessage = 'Geçersiz kategori ID'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id,
      name, 
      description, 
      base_price,
      category_id,
      image_url,
      is_available,
      is_featured,
      preparation_time
    } = body

    if (!id || !name || !category_id || base_price === undefined) {
      return NextResponse.json(
        { error: 'ID, ürün adı, kategori ve fiyat gereklidir' },
        { status: 400 }
      )
    }

    const productData = {
      name: name.trim(),
      description: description?.trim() || null,
      base_price: Number(base_price),
      category_id: category_id,
      image_url: image_url?.trim() || null,
      is_available: is_available !== undefined ? is_available : true,
      is_featured: is_featured !== undefined ? is_featured : false,
      preparation_time: preparation_time || 15,
      updated_at: new Date().toISOString()
    }

    // Service role key ile ürün güncelle
    const { error } = await supabaseAdmin
      .from('products')
      .update(productData)
      .eq('id', id)
    
    if (error) {
      console.error('Ürün güncelleme hatası:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Ürün başarıyla güncellendi!'
    })

  } catch (error: any) {
    console.error('Product update error:', error)
    
    return NextResponse.json(
      { error: 'Ürün güncellenemedi' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Ürün ID gereklidir' },
        { status: 400 }
      )
    }

    // Service role key ile ürün sil
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Ürün silme hatası:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Ürün başarıyla silindi!'
    })

  } catch (error: any) {
    console.error('Product delete error:', error)
    
    return NextResponse.json(
      { error: 'Ürün silinemedi' },
      { status: 500 }
    )
  }
} 