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

// GET - Kuryeları listele
export async function GET(request: NextRequest) {
  try {
    // Tüm courier verilerini users tablosu ile birlikte al
    const { data: couriers, error } = await supabaseAdmin
      .from('couriers')
      .select(`
        *,
        users (
          id,
          full_name,
          username,
          role,
          is_active
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Courier fetch error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      couriers: couriers || [],
      total: couriers?.length || 0
    })

  } catch (error) {
    console.error('GET /api/couriers error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Kuryeler yüklenirken hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    )
  }
}

// POST - Yeni kurye ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { full_name, phone, email, vehicle_type, license_plate, is_available, is_active, username, password } = body

    // Gerekli alanları kontrol et
    if (!full_name || !phone) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Ad soyad ve telefon alanları zorunludur' 
        },
        { status: 400 }
      )
    }

    // Username kontrolü - eğer verilmediyse telefon numarasını kullan
    const finalUsername = username || phone
    const finalPassword = password || 'kurye123' // Varsayılan şifre

    // Username benzersizlik kontrolü
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', finalUsername)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Bu kullanıcı adı zaten kullanılıyor' 
        },
        { status: 400 }
      )
    }

    // 1. Önce users tablosuna kullanıcı ekle
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        full_name,
        username: finalUsername,
        password: finalPassword,
        role: 'courier',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      throw userError
    }

    // 2. Sonra couriers tablosuna kurye bilgilerini ekle
    const { data: courierData, error: courierError } = await supabaseAdmin
      .from('couriers')
      .insert({
        user_id: userData.id,
        full_name,
        phone,
        email: email || null,
        vehicle_type: vehicle_type || 'Bisiklet',
        license_plate: license_plate || null,
        is_available: is_available !== undefined ? is_available : true,
        is_active: is_active !== undefined ? is_active : true,
        courier_status: 'offline',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (courierError) {
      // Kurye oluşturulamadıysa user'ı da sil
      await supabaseAdmin.from('users').delete().eq('id', userData.id)
      console.error('Courier creation error:', courierError)
      throw courierError
    }

    return NextResponse.json({
      success: true,
      message: 'Kurye başarıyla eklendi',
      courier: courierData,
      user: {
        username: finalUsername,
        password: finalPassword
      }
    })

  } catch (error) {
    console.error('POST /api/couriers error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Kurye eklenirken hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    )
  }
} 