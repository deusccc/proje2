import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/index'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'fix_courier_locations') {
      // Tüm aktif courier'ları al
      const { data: couriers, error: courierError } = await supabase
        .from('couriers')
        .select('*')
        .eq('is_active', true)

      if (courierError) {
        throw courierError
      }

      const updates = []
      
      // Konum bilgisi olmayan courier'lar için varsayılan İstanbul konumu ayarla
      for (const courier of couriers || []) {
        if (!courier.current_latitude || !courier.current_longitude) {
          const { error: updateError } = await supabase
            .from('couriers')
            .update({
              current_latitude: 41.0082,
              current_longitude: 28.9784,
              last_location_update: new Date().toISOString()
            })
            .eq('id', courier.id)

          if (updateError) {
            console.error(`Courier ${courier.id} güncellenirken hata:`, updateError)
          } else {
            updates.push({
              id: courier.id,
              name: courier.full_name,
              message: 'Konum bilgisi güncellendi'
            })
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `${updates.length} courier'ın konum bilgisi güncellendi`,
        updates
      })
    }

    if (action === 'update_all_courier_timestamps') {
      // Tüm aktif courier'ların zaman damgasını güncelle
      const { data: updatedCouriers, error } = await supabase
        .from('couriers')
        .update({
          last_location_update: new Date().toISOString()
        })
        .eq('is_active', true)
        .select()

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: `${updatedCouriers?.length || 0} courier'ın zaman damgası güncellendi`,
        couriers: updatedCouriers
      })
    }

    if (action === 'activate_all_couriers') {
      // Tüm courier'ları aktif yap
      const { data: updatedCouriers, error } = await supabase
        .from('couriers')
        .update({
          is_active: true,
          is_available: true,
          last_location_update: new Date().toISOString()
        })
        .neq('id', '')
        .select()

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: `${updatedCouriers?.length || 0} courier aktif edildi`,
        couriers: updatedCouriers
      })
    }

    if (action === 'check_courier_status') {
      // Courier durumunu kontrol et
      const { data: couriers, error } = await supabase
        .from('couriers')
        .select(`
          id,
          full_name,
          phone,
          is_active,
          is_available,
          current_latitude,
          current_longitude,
          last_location_update,
          user_id
        `)
        .order('full_name')

      if (error) {
        throw error
      }

      // Her courier için user bilgisini de al
      const couriersWithUsers = []
      for (const courier of couriers || []) {
        const { data: user } = await supabase
          .from('users')
          .select('username, is_active, role')
          .eq('id', courier.user_id)
          .single()

        couriersWithUsers.push({
          ...courier,
          user: user || null
        })
      }

      return NextResponse.json({
        success: true,
        couriers: couriersWithUsers,
        total: couriersWithUsers.length,
        active_couriers: couriersWithUsers.filter(c => c.is_active).length,
        available_couriers: couriersWithUsers.filter(c => c.is_available).length,
        couriers_with_location: couriersWithUsers.filter(c => c.current_latitude && c.current_longitude).length
      })
    }

    return NextResponse.json(
      { error: 'Geçersiz action' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Fix couriers API hatası:', error)
    return NextResponse.json(
      { error: error.message || 'İşlem başarısız' },
      { status: 500 }
    )
  }
} 