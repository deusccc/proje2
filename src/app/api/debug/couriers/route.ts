import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/index'

export async function GET(request: NextRequest) {
  try {
    // Tüm courier verilerini al
    const { data: couriers, error } = await supabase
      .from('couriers')
      .select('*')
      .order('created_at')

    if (error) {
      throw error
    }

    // Users tablosundan courier kullanıcılarını al
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'courier')
      .order('created_at')

    if (usersError) {
      throw usersError
    }

    return NextResponse.json({
      couriers: couriers || [],
      courier_users: users || [],
      total_couriers: couriers?.length || 0,
      total_courier_users: users?.length || 0
    })

  } catch (error: any) {
    console.error('Debug courier hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Courier verileri alınamadı' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'create_test_courier') {
      // Test courier kullanıcısı oluştur
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          username: 'testkurye',
          password: 'kurye123',
          full_name: 'Test Kurye',
          role: 'courier',
          is_active: true
        })
        .select()
        .single()

      if (userError) {
        throw userError
      }

      // Test courier kaydı oluştur
      const { data: courier, error: courierError } = await supabase
        .from('couriers')
        .insert({
          user_id: user.id,
          full_name: 'Test Kurye',
          phone: '+905551234567',
          vehicle_type: 'motorcycle',
          is_active: true,
          is_available: true,
          current_latitude: 41.0082,
          current_longitude: 28.9784,
          last_location_update: new Date().toISOString()
        })
        .select()
        .single()

      if (courierError) {
        throw courierError
      }

      return NextResponse.json({
        success: true,
        user,
        courier,
        message: 'Test kurye oluşturuldu'
      })
    }

    if (action === 'update_courier_status') {
      const { courierId, is_available } = await request.json()
      
      const { error } = await supabase
        .from('couriers')
        .update({
          is_available,
          last_location_update: new Date().toISOString()
        })
        .eq('id', courierId)

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: 'Kurye durumu güncellendi'
      })
    }

    return NextResponse.json(
      { error: 'Geçersiz action' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Debug courier POST hatası:', error)
    return NextResponse.json(
      { error: error.message || 'İşlem başarısız' },
      { status: 500 }
    )
  }
} 