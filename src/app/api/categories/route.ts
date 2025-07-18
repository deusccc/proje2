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
      sort_order, 
      is_active 
    } = body

    // Validation
    if (!restaurant_id || !name) {
      return NextResponse.json(
        { error: 'Restoran ID ve kategori adı gereklidir' },
        { status: 400 }
      )
    }

    // Kategori verilerini hazırla
    const categoryData = {
      restaurant_id: restaurant_id,
      name: name.trim(),
      description: description?.trim() || null,
      sort_order: sort_order || 0,
      is_active: is_active !== undefined ? is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Service role key ile kategori oluştur
    const { data: newCategory, error: categoryError } = await supabaseAdmin
      .from('categories')
      .insert(categoryData)
      .select()
      .single()
    
    if (categoryError) {
      console.error('Kategori oluşturma hatası:', categoryError)
      throw categoryError
    }

    return NextResponse.json({
      success: true,
      category: newCategory,
      message: 'Kategori başarıyla oluşturuldu!'
    })

  } catch (error: any) {
    console.error('Category creation error:', error)
    
    let errorMessage = 'Kategori eklenemedi'
    
    if (error.code === '23505') {
      errorMessage = 'Bu kategori adı zaten kullanılıyor'
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
      sort_order, 
      is_active 
    } = body

    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID ve kategori adı gereklidir' },
        { status: 400 }
      )
    }

    const categoryData = {
      name: name.trim(),
      description: description?.trim() || null,
      sort_order: sort_order || 0,
      is_active: is_active !== undefined ? is_active : true,
      updated_at: new Date().toISOString()
    }

    // Service role key ile kategori güncelle
    const { error } = await supabaseAdmin
      .from('categories')
      .update(categoryData)
      .eq('id', id)
    
    if (error) {
      console.error('Kategori güncelleme hatası:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Kategori başarıyla güncellendi!'
    })

  } catch (error: any) {
    console.error('Category update error:', error)
    
    return NextResponse.json(
      { error: 'Kategori güncellenemedi' },
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
        { error: 'Kategori ID gereklidir' },
        { status: 400 }
      )
    }

    // Service role key ile kategori sil
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Kategori silme hatası:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Kategori başarıyla silindi!'
    })

  } catch (error: any) {
    console.error('Category delete error:', error)
    
    return NextResponse.json(
      { error: 'Kategori silinemedi' },
      { status: 500 }
    )
  }
} 