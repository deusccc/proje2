import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/index'

// Haversine formülü ile iki nokta arasındaki mesafeyi hesapla
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Dünya'nın yarıçapı (km)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Teslimat ücretini hesapla
function calculateDeliveryFee(distance: number): number {
  const baseFee = 5 // Temel ücret (₺)
  const perKmFee = 2 // Kilometre başına ücret (₺)
  return baseFee + (distance * perKmFee)
}

// En yakın uygun kuryeyi bul
async function findNearestAvailableCourier(
  restaurantLat: number,
  restaurantLng: number
) {
  try {
    // Müsait kuryeları al - sadece müsait ve meşgul olmayan kuryeler
    const { data: couriers, error } = await supabase
      .from('couriers')
      .select('*')
      .eq('is_active', true)
      .eq('is_available', true)
      .neq('courier_status', 'busy')
      .neq('courier_status', 'on_delivery')
      .neq('courier_status', 'inactive')
      .not('current_latitude', 'is', null)
      .not('current_longitude', 'is', null)

    if (error || !couriers || couriers.length === 0) {
      return null
    }

    // Her kuryenin mesafesini hesapla
    const couriersWithDistance = couriers.map(courier => ({
      ...courier,
      distance: calculateDistance(
        restaurantLat,
        restaurantLng,
        courier.current_latitude!,
        courier.current_longitude!
      )
    }))

    // Mesafeye göre sırala ve en yakınını seç (maksimum 10km içinde)
    const nearestCourier = couriersWithDistance
      .filter(courier => courier.distance <= 10) // 10km limiti
      .sort((a, b) => a.distance - b.distance)[0]

    return nearestCourier || null
  } catch (error) {
    console.error('Kurye arama hatası:', error)
    return null
  }
}

// Kurye atama fonksiyonu
async function assignCourierToOrder(orderId: string) {
  try {
    // Sipariş bilgilerini al
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Sipariş bulunamadı')
    }

    // Restaurant bilgisini ayrı olarak al
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', order.restaurant_id)
      .single()

    if (restaurantError || !restaurant) {
      throw new Error('Restoran bulunamadı')
    }

    // Restoran konumunu kontrol et
    if (!restaurant.latitude || !restaurant.longitude) {
      throw new Error('Restoran konum bilgisi eksik')
    }

    // En yakın kuryeyi bul
    const courier = await findNearestAvailableCourier(
      restaurant.latitude,
      restaurant.longitude
    )

    if (!courier) {
      throw new Error('Uygun kurye bulunamadı')
    }

    // Teslimat ücretini hesapla
    const deliveryFee = calculateDeliveryFee(courier.distance)

    // Atama kaydı oluştur
    const { data: assignment, error: assignmentError } = await supabase
      .from('delivery_assignments')
      .insert({
        order_id: orderId,
        courier_id: courier.id,
        restaurant_id: order.restaurant_id,
        delivery_fee: deliveryFee,
        estimated_delivery_time: new Date(
          Date.now() + (courier.distance * 3 + 20) * 60 * 1000 // Yaklaşık teslimat süresi
        ).toISOString()
      })
      .select()
      .single()

    if (assignmentError) {
      throw new Error('Atama oluşturulamadı')
    }

    // Kuryeye bildirim gönder
    await supabase
      .from('courier_notifications')
      .insert({
        courier_id: courier.id,
        type: 'new_assignment',
        title: 'Yeni Teslimat Teklifi',
        message: `${restaurant.name} restoranından yeni bir teslimat teklifi var. Ücret: ₺${deliveryFee}`,
        data: {
          assignment_id: assignment.id,
          order_id: orderId,
          restaurant_name: restaurant.name,
          delivery_fee: deliveryFee,
          distance: courier.distance.toFixed(1)
        }
      })

    // Siparişi güncelle
    await supabase
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', orderId)

    return {
      success: true,
      assignment_id: assignment.id,
      courier_id: courier.id,
      courier_name: courier.full_name,
      delivery_fee: deliveryFee,
      estimated_distance: courier.distance.toFixed(1)
    }

  } catch (error) {
    console.error('Kurye atama hatası:', error)
    throw error
  }
}

// POST: Sipariş için kurye ata
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Sipariş ID gerekli' },
        { status: 400 }
      )
    }

    // Daha önce atama yapılmış mı kontrol et
    const { data: existingAssignment } = await supabase
      .from('delivery_assignments')
      .select('id')
      .eq('order_id', orderId)
      .not('status', 'eq', 'cancelled')
      .single()

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Bu siparişe zaten kurye atanmış' },
        { status: 400 }
      )
    }

    const result = await assignCourierToOrder(orderId)

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('API hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Kurye ataması yapılamadı' },
      { status: 500 }
    )
  }
}

// GET: Mevcut atamaları listele
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const orderId = url.searchParams.get('orderId')
    const courierId = url.searchParams.get('courierId')

    let query = supabase
      .from('delivery_assignments')
      .select('*')

    if (orderId) {
      query = query.eq('order_id', orderId)
    } else if (courierId) {
      query = query.eq('courier_id', courierId)
    } else {
      // Son 100 atamayı getir
      query = query
        .order('created_at', { ascending: false })
        .limit(100)
    }

    const { data: assignments, error } = await query

    if (error) {
      throw error
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json([])
    }

    // Her assignment için ilişkili verileri al
    const assignmentsWithRelations = []
    for (const assignment of assignments) {
      // Order bilgisini al
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', assignment.order_id)
        .single()

      // Restaurant bilgisini al
      let restaurantData = null
      if (assignment.restaurant_id) {
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', assignment.restaurant_id)
          .single()
        restaurantData = restaurant
      }

      // Courier bilgisini al
      const { data: courierData } = await supabase
        .from('couriers')
        .select('*')
        .eq('id', assignment.courier_id)
        .single()

      assignmentsWithRelations.push({
        ...assignment,
        order: orderData,
        restaurant: restaurantData,
        courier: courierData
      })
    }

    return NextResponse.json(assignmentsWithRelations)

  } catch (error: any) {
    console.error('API hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Atamalar alınamadı' },
      { status: 500 }
    )
  }
}

// PUT: Atama durumunu güncelle
export async function PUT(request: NextRequest) {
  try {
    const { assignmentId, status, notes } = await request.json()

    if (!assignmentId || !status) {
      return NextResponse.json(
        { error: 'Atama ID ve durum gerekli' },
        { status: 400 }
      )
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (notes) {
      updateData.notes = notes
    }

    // Durum zamanlarını güncelle
    const now = new Date().toISOString()
    switch (status) {
      case 'accepted':
        updateData.accepted_at = now
        break
      case 'picked_up':
        updateData.picked_up_at = now
        break
      case 'delivered':
        updateData.delivered_at = now
        updateData.actual_delivery_time = now
        break
      case 'cancelled':
        updateData.cancelled_at = now
        break
    }

    const { data: assignment, error } = await supabase
      .from('delivery_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    // İlişkili verileri ayrı olarak al
    let orderData = null
    let courierData = null
    
    if (assignment) {
      // Order bilgisini al
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', assignment.order_id)
        .single()
      orderData = order

      // Courier bilgisini al
      const { data: courier } = await supabase
        .from('couriers')
        .select('*')
        .eq('id', assignment.courier_id)
        .single()
      courierData = courier
    }

    const assignmentWithRelations = {
      ...assignment,
      order: orderData,
      courier: courierData
    }

    // Sipariş durumunu da güncelle
    if (assignment) {
      let orderStatus = orderData?.status || 'pending'
      
      switch (status) {
        case 'accepted':
          orderStatus = 'confirmed'
          break
        case 'picked_up':
          orderStatus = 'on_the_way'
          break
        case 'delivered':
          orderStatus = 'delivered'
          break
        case 'cancelled':
          orderStatus = 'cancelled'
          break
      }

      await supabase
        .from('orders')
        .update({ status: orderStatus })
        .eq('id', assignment.order_id)
    }

    return NextResponse.json(assignmentWithRelations)

  } catch (error: any) {
    console.error('API hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Atama güncellenemedi' },
      { status: 500 }
    )
  }
} 