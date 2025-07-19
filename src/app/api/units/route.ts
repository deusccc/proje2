import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { 
      restaurant_id,
      name, 
      symbol
    } = body

    // Validation
    if (!restaurant_id || !name || !symbol) {
      return NextResponse.json(
        { error: 'Restoran ID, birim adı ve sembol gereklidir' },
        { status: 400 }
      )
    }

    // Birim verilerini hazırla
    const unitData = {
      restaurant_id: restaurant_id,
      name: name.trim(),
      symbol: symbol.trim(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Service role key ile birim oluştur
    const { data: newUnit, error: unitError } = await supabaseAdmin
      .from('units')
      .insert(unitData)
      .select()
      .single()
    
    if (unitError) {
      console.error('Birim oluşturma hatası:', unitError)
      throw unitError
    }

    return NextResponse.json({
      success: true,
      unit: newUnit,
      message: 'Birim başarıyla oluşturuldu!'
    })

  } catch (error: any) {
    console.error('Unit creation error:', error)
    
    let errorMessage = 'Birim eklenemedi'
    
    if (error.code === '23505') {
      errorMessage = 'Bu birim adı veya sembol zaten kullanılıyor'
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
      symbol,
      is_active
    } = body

    if (!id || !name || !symbol) {
      return NextResponse.json(
        { error: 'ID, birim adı ve sembol gereklidir' },
        { status: 400 }
      )
    }

    const unitData = {
      name: name.trim(),
      symbol: symbol.trim(),
      is_active: is_active !== undefined ? is_active : true,
      updated_at: new Date().toISOString()
    }

    // Service role key ile birim güncelle
    const { error } = await supabaseAdmin
      .from('units')
      .update(unitData)
      .eq('id', id)
    
    if (error) {
      console.error('Birim güncelleme hatası:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Birim başarıyla güncellendi!'
    })

  } catch (error: any) {
    console.error('Unit update error:', error)
    
    return NextResponse.json(
      { error: 'Birim güncellenemedi' },
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
        { error: 'Birim ID gereklidir' },
        { status: 400 }
      )
    }

    // Service role key ile birim sil
    const { error } = await supabaseAdmin
      .from('units')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Birim silme hatası:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Birim başarıyla silindi!'
    })

  } catch (error: any) {
    console.error('Unit delete error:', error)
    
    return NextResponse.json(
      { error: 'Birim silinemedi' },
      { status: 500 }
    )
  }
} 