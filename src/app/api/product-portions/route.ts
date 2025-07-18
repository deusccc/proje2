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
      product_id,
      name, 
      description,
      unit_id,
      price_modifier,
      quantity_multiplier,
      is_default,
      sort_order
    } = body

    // Validation
    if (!product_id || !name || price_modifier === undefined || quantity_multiplier === undefined) {
      return NextResponse.json(
        { error: 'Ürün ID, porsiyon adı, fiyat değişikliği ve miktar çarpanı gereklidir' },
        { status: 400 }
      )
    }

    // Porsiyon verilerini hazırla
    const portionData = {
      product_id: product_id,
      name: name.trim(),
      description: description?.trim() || null,
      unit_id: unit_id || null,
      price_modifier: Number(price_modifier),
      quantity_multiplier: Number(quantity_multiplier),
      is_default: is_default !== undefined ? is_default : false,
      is_active: true,
      sort_order: sort_order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Service role key ile porsiyon oluştur
    const { data: newPortion, error: portionError } = await supabaseAdmin
      .from('product_portions')
      .insert(portionData)
      .select(`
        *,
        units (
          id,
          name,
          symbol
        )
      `)
      .single()
    
    if (portionError) {
      console.error('Porsiyon oluşturma hatası:', portionError)
      throw portionError
    }

    return NextResponse.json({
      success: true,
      portion: newPortion,
      message: 'Porsiyon başarıyla oluşturuldu!'
    })

  } catch (error: any) {
    console.error('Product portion creation error:', error)
    
    let errorMessage = 'Porsiyon eklenemedi'
    
    if (error.code === '23505') {
      errorMessage = 'Bu porsiyon adı zaten kullanılıyor'
    } else if (error.code === '23503') {
      errorMessage = 'Geçersiz ürün veya birim ID'
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
      unit_id,
      price_modifier,
      quantity_multiplier,
      is_default,
      is_active,
      sort_order
    } = body

    if (!id || !name || price_modifier === undefined || quantity_multiplier === undefined) {
      return NextResponse.json(
        { error: 'ID, porsiyon adı, fiyat değişikliği ve miktar çarpanı gereklidir' },
        { status: 400 }
      )
    }

    const portionData = {
      name: name.trim(),
      description: description?.trim() || null,
      unit_id: unit_id || null,
      price_modifier: Number(price_modifier),
      quantity_multiplier: Number(quantity_multiplier),
      is_default: is_default !== undefined ? is_default : false,
      is_active: is_active !== undefined ? is_active : true,
      sort_order: sort_order || 0,
      updated_at: new Date().toISOString()
    }

    // Service role key ile porsiyon güncelle
    const { error } = await supabaseAdmin
      .from('product_portions')
      .update(portionData)
      .eq('id', id)
    
    if (error) {
      console.error('Porsiyon güncelleme hatası:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Porsiyon başarıyla güncellendi!'
    })

  } catch (error: any) {
    console.error('Product portion update error:', error)
    
    return NextResponse.json(
      { error: 'Porsiyon güncellenemedi' },
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
        { error: 'Porsiyon ID gereklidir' },
        { status: 400 }
      )
    }

    // Service role key ile porsiyon sil
    const { error } = await supabaseAdmin
      .from('product_portions')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Porsiyon silme hatası:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Porsiyon başarıyla silindi!'
    })

  } catch (error: any) {
    console.error('Product portion delete error:', error)
    
    return NextResponse.json(
      { error: 'Porsiyon silinemedi' },
      { status: 500 }
    )
  }
} 