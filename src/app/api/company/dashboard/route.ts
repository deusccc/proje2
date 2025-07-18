import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/index'

// GET: Company Dashboard verilerini al
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const dataType = url.searchParams.get('type') || 'all'

    // Dashboard istatistikleri
    if (dataType === 'stats' || dataType === 'all') {
      const { data: stats, error: statsError } = await supabase
        .from('company_dashboard_stats')
        .select('*')
        .single()

      if (statsError) {
        console.error('Stats error:', statsError)
      }

      if (dataType === 'stats') {
        return NextResponse.json(stats || {})
      }
    }

    // Aktif kurye konumları
    if (dataType === 'couriers' || dataType === 'all') {
      const { data: couriers, error: couriersError } = await supabase
        .from('active_courier_locations')
        .select('*')

      if (couriersError) {
        console.error('Couriers error:', couriersError)
      }

      if (dataType === 'couriers') {
        return NextResponse.json(couriers || [])
      }
    }

    // Aktif siparişler
    if (dataType === 'orders' || dataType === 'all') {
      const { data: orders, error: ordersError } = await supabase
        .from('active_orders_detailed')
        .select('*')

      if (ordersError) {
        console.error('Orders error:', ordersError)
      }

      if (dataType === 'orders') {
        return NextResponse.json(orders || [])
      }
    }

    // Restoran performansı
    if (dataType === 'restaurants' || dataType === 'all') {
      const { data: restaurants, error: restaurantsError } = await supabase
        .from('restaurant_performance')
        .select('*')

      if (restaurantsError) {
        console.error('Restaurants error:', restaurantsError)
      }

      if (dataType === 'restaurants') {
        return NextResponse.json(restaurants || [])
      }
    }

    // Kurye performansı
    if (dataType === 'courier-performance' || dataType === 'all') {
      const { data: courierPerf, error: courierPerfError } = await supabase
        .from('courier_performance')
        .select('*')

      if (courierPerfError) {
        console.error('Courier performance error:', courierPerfError)
      }

      if (dataType === 'courier-performance') {
        return NextResponse.json(courierPerf || [])
      }
    }

    // Tüm veriler
    if (dataType === 'all') {
      const [
        { data: stats },
        { data: couriers },
        { data: orders },
        { data: restaurants },
        { data: courierPerf }
      ] = await Promise.all([
        supabase.from('company_dashboard_stats').select('*').single(),
        supabase.from('active_courier_locations').select('*'),
        supabase.from('active_orders_detailed').select('*'),
        supabase.from('restaurant_performance').select('*'),
        supabase.from('courier_performance').select('*')
      ])

      return NextResponse.json({
        stats: stats || {},
        couriers: couriers || [],
        orders: orders || [],
        restaurants: restaurants || [],
        courierPerformance: courierPerf || []
      })
    }

    return NextResponse.json({ error: 'Geçersiz veri tipi' }, { status: 400 })

  } catch (error: any) {
    console.error('Company dashboard API hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Veriler alınırken hata oluştu' },
      { status: 500 }
    )
  }
}

// POST: Manuel işlemler (sipariş durumu değiştirme, kurye atama vb.)
export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json()

    switch (action) {
      case 'update_order_status':
        const { orderId, newStatus } = params
        
        // Sipariş durumunu güncelle
        const { error: orderError } = await supabase
          .from('orders')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)

        if (orderError) throw orderError

        // Eğer sipariş hazırlanıyor durumuna geçiyorsa ve kurye atanmamışsa otomatik atama yap
        if (newStatus === 'preparing') {
          // Mevcut atama var mı kontrol et
          const { data: existingAssignment } = await supabase
            .from('delivery_assignments')
            .select('id')
            .eq('order_id', orderId)
            .not('status', 'eq', 'cancelled')
            .single()

          if (!existingAssignment) {
            // AI kurye atama sistemini çağır
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3001'}/api/ai-courier-assignment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
              })
              
              const result = await response.json()
              console.log('Otomatik kurye atama sonucu:', result)
            } catch (error) {
              console.error('Otomatik kurye atama hatası:', error)
            }
          }
        }

        return NextResponse.json({ success: true, message: 'Sipariş durumu güncellendi' })

      case 'assign_courier':
        const { orderId: assignOrderId, courierId } = params
        
        // Önce mevcut atamaları kontrol et
        const { data: existingAssignment } = await supabase
          .from('delivery_assignments')
          .select('id')
          .eq('order_id', assignOrderId)
          .not('status', 'eq', 'cancelled')
          .single()

        if (existingAssignment) {
          return NextResponse.json(
            { error: 'Bu siparişe zaten kurye atanmış' },
            { status: 400 }
          )
        }

        // Yeni atama oluştur
        const { error: assignError } = await supabase
          .from('delivery_assignments')
          .insert({
            order_id: assignOrderId,
            courier_id: courierId,
            status: 'assigned',
            delivery_fee: 15, // Varsayılan ücret
            created_at: new Date().toISOString()
          })

        if (assignError) throw assignError

        // Sipariş durumunu güncelle
        await supabase
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', assignOrderId)

        return NextResponse.json({ success: true, message: 'Kurye atandı' })

      case 'toggle_courier_availability':
        const { courierId: toggleCourierId, isAvailable } = params
        
        const { error: courierError } = await supabase
          .from('couriers')
          .update({ is_available: isAvailable })
          .eq('id', toggleCourierId)

        if (courierError) throw courierError

        return NextResponse.json({ success: true, message: 'Kurye durumu güncellendi' })

      case 'toggle_restaurant_status':
        const { restaurantId, isActive } = params
        
        const { error: restaurantError } = await supabase
          .from('restaurants')
          .update({ is_active: isActive })
          .eq('id', restaurantId)

        if (restaurantError) throw restaurantError

        return NextResponse.json({ success: true, message: 'Restoran durumu güncellendi' })

      default:
        return NextResponse.json(
          { error: 'Geçersiz işlem' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('Company dashboard POST API hatası:', error)
    return NextResponse.json(
      { error: error.message || 'İşlem gerçekleştirilemedi' },
      { status: 500 }
    )
  }
} 