import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are not configured.')
}

// Service role key ile admin client oluştur
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Kullanıcı adı ve şifre gerekli' },
        { status: 400 }
      )
    }

    // Kullanıcıyı al (Service role key ile)
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        restaurants:restaurants(*)
      `)
      .eq('username', username)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Kullanıcı adı veya şifre hatalı.' },
        { status: 401 }
      )
    }
    
    // Plain text password check
    if (data.password !== password) {
      return NextResponse.json(
        { error: 'Kullanıcı adı veya şifre hatalı.' },
        { status: 401 }
      )
    }

    if (!data.is_active) {
      return NextResponse.json(
        { error: 'Hesabınız aktif değil. Lütfen yönetici ile iletişime geçin.' },
        { status: 403 }
      )
    }

    // Kullanıcı verisini restaurant bilgisi ile birleştir
    const userWithRestaurant = {
      ...data,
      restaurant: data.restaurants || null
    }

    // Rol bazlı yönlendirme bilgisi ekle
    let redirectPath = '/dashboard'
    if (data.role === 'courier') {
      redirectPath = '/courier/dashboard'
    } else if (data.role === 'companymanager') {
      redirectPath = '/company/dashboard'
    }

    return NextResponse.json({
      success: true,
      user: userWithRestaurant,
      redirectPath
    })

  } catch (error: any) {
    console.error('Login API hatası:', error)
    return NextResponse.json(
      { error: 'Giriş yapılırken bir hata oluştu.' },
      { status: 500 }
    )
  }
} 