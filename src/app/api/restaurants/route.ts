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
      name, 
      detailed_address, 
      phone, 
      email, 
      city, 
      district, 
      neighborhood, 
      postal_code, 
      latitude, 
      longitude, 
      is_active,
      username,
      password,
      admin_full_name 
    } = body

    // Validation
    if (!name || !detailed_address) {
      return NextResponse.json(
        { error: 'Restoran adı ve adres gereklidir' },
        { status: 400 }
      )
    }

    if (!username || !password || !admin_full_name) {
      return NextResponse.json(
        { error: 'Kullanıcı bilgileri gereklidir' },
        { status: 400 }
      )
    }

    // Kullanıcı adı benzersizlik kontrolü
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu kullanıcı adı zaten kullanılıyor' },
        { status: 409 }
      )
    }

    // Restoran verilerini hazırla
    const restaurantData = {
      name: name.trim(),
      detailed_address: detailed_address.trim(),
      address: detailed_address.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      city: city?.trim() || null,
      district: district?.trim() || null,
      neighborhood: neighborhood?.trim() || null,
      postal_code: postal_code?.trim() || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      is_active: is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Service role key ile restoran oluştur
    const { data: newRestaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .insert(restaurantData)
      .select()
      .single()
    
    if (restaurantError) {
      console.error('Restoran oluşturma hatası:', restaurantError)
      throw restaurantError
    }

    // Admin kullanıcı verilerini hazırla
    const userData = {
      restaurant_id: newRestaurant.id,
      username: username.trim(),
      password: password.trim(),
      full_name: admin_full_name.trim(),
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Service role key ile kullanıcı oluştur
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert(userData)
    
    if (userError) {
      console.error('Kullanıcı oluşturma hatası:', userError)
      
      // Rollback: Restoranı sil
      await supabaseAdmin
        .from('restaurants')
        .delete()
        .eq('id', newRestaurant.id)
      
      throw userError
    }

    return NextResponse.json({
      success: true,
      restaurant: newRestaurant,
      message: 'Restoran ve yönetici hesabı başarıyla oluşturuldu!'
    })

  } catch (error: any) {
    console.error('Restaurant creation error:', error)
    
    let errorMessage = 'Restoran eklenemedi'
    
    if (error.code === '23505') {
      errorMessage = 'Bu kullanıcı adı zaten kullanılıyor'
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
      detailed_address, 
      phone, 
      email, 
      city, 
      district, 
      neighborhood, 
      postal_code, 
      latitude, 
      longitude, 
      is_active 
    } = body

    if (!id || !name || !detailed_address) {
      return NextResponse.json(
        { error: 'ID, restoran adı ve adres gereklidir' },
        { status: 400 }
      )
    }

    const restaurantData = {
      name: name.trim(),
      detailed_address: detailed_address.trim(),
      address: detailed_address.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      city: city?.trim() || null,
      district: district?.trim() || null,
      neighborhood: neighborhood?.trim() || null,
      postal_code: postal_code?.trim() || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      is_active: is_active,
      updated_at: new Date().toISOString()
    }

    // Service role key ile restoran güncelle
    const { error } = await supabaseAdmin
      .from('restaurants')
      .update(restaurantData)
      .eq('id', id)
    
    if (error) {
      console.error('Restoran güncelleme hatası:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Restoran başarıyla güncellendi!'
    })

  } catch (error: any) {
    console.error('Restaurant update error:', error)
    
    return NextResponse.json(
      { error: 'Restoran güncellenemedi' },
      { status: 500 }
    )
  }
} 