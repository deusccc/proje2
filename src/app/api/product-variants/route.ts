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
      price_modifier
    } = body

    // Validation
    if (!product_id || !name || price_modifier === undefined) {
      return NextResponse.json(
        { error: 'Ürün ID, seçenek adı ve fiyat değişikliği gereklidir' },
        { status: 400 }
      )
    }

    // Variant verilerini hazırla
    const variantData = {
      product_id: product_id,
      name: name.trim(),
      price_modifier: Number(price_modifier),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Service role key ile variant oluştur
    const { data: newVariant, error: variantError } = await supabaseAdmin
      .from('product_variants')
      .insert(variantData)
      .select()
      .single()
    
    if (variantError) {
      console.error('Variant oluşturma hatası:', variantError)
      throw variantError
    }

    return NextResponse.json({
      success: true,
      variant: newVariant,
      message: 'Seçenek başarıyla oluşturuldu!'
    })

  } catch (error: any) {
    console.error('Product variant creation error:', error)
    
    let errorMessage = 'Seçenek eklenemedi'
    
    if (error.code === '23505') {
      errorMessage = 'Bu seçenek adı zaten kullanılıyor'
    } else if (error.code === '23503') {
      errorMessage = 'Geçersiz ürün ID'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
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
        { error: 'Seçenek ID gereklidir' },
        { status: 400 }
      )
    }

    // Service role key ile variant sil
    const { error } = await supabaseAdmin
      .from('product_variants')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Variant silme hatası:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Seçenek başarıyla silindi!'
    })

  } catch (error: any) {
    console.error('Product variant delete error:', error)
    
    return NextResponse.json(
      { error: 'Seçenek silinemedi' },
      { status: 500 }
    )
  }
} 