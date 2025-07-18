import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/index'

// POST: Otomatik kurye atama
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Sipariş ID gerekli' },
        { status: 400 }
      )
    }

    // Supabase fonksiyonunu çağır
    const { data, error } = await supabase.rpc('auto_assign_courier', {
      p_order_id: orderId
    })

    if (error) {
      console.error('Otomatik atama hatası:', error)
      return NextResponse.json(
        { error: 'Otomatik atama sırasında hata oluştu' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('API hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Otomatik atama yapılamadı' },
      { status: 500 }
    )
  }
}

// GET: Otomatik atama durumunu kontrol et
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const orderId = url.searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json(
        { error: 'Sipariş ID gerekli' },
        { status: 400 }
      )
    }

    // Sipariş ve atama bilgilerini al
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        delivery_assignments (
          *,
          couriers (
            id,
            full_name,
            current_latitude,
            current_longitude
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      order: orderData,
      has_assignment: orderData.delivery_assignments && orderData.delivery_assignments.length > 0,
      assignment: orderData.delivery_assignments?.[0] || null
    })

  } catch (error: any) {
    console.error('API hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Durum kontrolü yapılamadı' },
      { status: 500 }
    )
  }
} 