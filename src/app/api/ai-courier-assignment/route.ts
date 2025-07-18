import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/index'
import OpenAI from 'openai'

// OpenAI istemcisini oluştur
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

// Sistem verilerini topla
async function gatherSystemData(orderId: string) {
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

    // Restoran bilgisini al
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', order.restaurant_id)
      .single()

    if (restaurantError || !restaurant) {
      throw new Error('Restoran bulunamadı')
    }

    // Müsait kuryeları al - sadece müsait ve meşgul olmayan kuryeler
    const { data: availableCouriers, error: couriersError } = await supabase
      .from('couriers')
      .select('*')
      .eq('is_active', true)
      .eq('is_available', true)
      .neq('courier_status', 'busy')
      .neq('courier_status', 'on_delivery')
      .neq('courier_status', 'inactive')
      .not('current_latitude', 'is', null)
      .not('current_longitude', 'is', null)

    if (couriersError) {
      throw new Error('Kurye verileri alınamadı')
    }

    // Her kurye için aktif teslimat sayısını al
    const couriersWithActiveDeliveries = await Promise.all(
      (availableCouriers || []).map(async (courier) => {
        const { data: activeDeliveries } = await supabase
          .from('delivery_assignments')
          .select('id')
          .eq('courier_id', courier.id)
          .in('status', ['assigned', 'accepted', 'picked_up', 'on_the_way'])

        const distance = restaurant.latitude && restaurant.longitude
          ? calculateDistance(
              restaurant.latitude,
              restaurant.longitude,
              courier.current_latitude!,
              courier.current_longitude!
            )
          : 999

        return {
          ...courier,
          active_deliveries_count: activeDeliveries?.length || 0,
          distance_to_restaurant: distance,
          delivery_fee: calculateDeliveryFee(distance)
        }
      })
    )

    // Son 24 saatteki tüm atamaları al (sistem performansı için)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data: recentAssignments } = await supabase
      .from('delivery_assignments')
      .select('*')
      .gte('created_at', yesterday.toISOString())

    // Sipariş yoğunluğunu hesapla
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('id, created_at')
      .eq('restaurant_id', order.restaurant_id)
      .gte('created_at', new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')

    return {
      order,
      restaurant,
      availableCouriers: couriersWithActiveDeliveries,
      recentAssignments: recentAssignments || [],
      todayOrdersCount: todayOrders?.length || 0,
      currentTime: new Date().toISOString()
    }
  } catch (error) {
    console.error('Sistem verileri toplama hatası:', error)
    throw error
  }
}

// AI ile kurye atama kararı ver
async function makeAIAssignmentDecision(systemData: any) {
  try {
    const prompt = `
Sen bir akıllı kurye atama sistemisin. Aşağıdaki verilere dayanarak en optimal kurye atamasını yapmalısın.

MEVCUT DURUM:
- Sipariş ID: ${systemData.order.id}
- Restoran: ${systemData.restaurant.name}
- Restoran Konumu: ${systemData.restaurant.latitude}, ${systemData.restaurant.longitude}
- Sipariş Tutarı: ₺${systemData.order.total_amount}
- Sipariş Zamanı: ${systemData.order.created_at}
- Müşteri Adresi: ${systemData.order.customer_address}
- Bugünkü Sipariş Sayısı: ${systemData.todayOrdersCount}

MÜSAIT KURYELER:
${systemData.availableCouriers.map((courier: any, index: number) => `
${index + 1}. ${courier.full_name}
   - ID: ${courier.id}
   - Araç Tipi: ${courier.vehicle_type}
   - Mevcut Konum: ${courier.current_latitude}, ${courier.current_longitude}
   - Restorana Mesafe: ${courier.distance_to_restaurant.toFixed(2)} km
   - Teslimat Ücreti: ₺${courier.delivery_fee}
   - Aktif Teslimat Sayısı: ${courier.active_deliveries_count}
   - Ortalama Puan: ${courier.rating || 0}/5
   - Toplam Teslimat: ${courier.total_deliveries}
   - Son Konum Güncellemesi: ${courier.last_location_update}
`).join('')}

KARAR KRİTERLERİ:
1. Mesafe (en yakın kurye öncelikli)
2. Kurye yoğunluğu (az aktif teslimatı olan öncelikli)
3. Kurye performansı (yüksek puanlı öncelikli)
4. Araç tipi (sipariş büyüklüğüne uygun)
5. Teslimat süresi optimizasyonu

GÖREV:
En optimal kuryeyi seç ve kararının gerekçesini açıkla. Yanıtını şu JSON formatında ver:

{
  "selected_courier_id": "kurye_id",
  "reasoning": "Seçim gerekçesi (kısa ve net)",
  "estimated_delivery_time_minutes": 30,
  "priority_factors": ["mesafe", "yoğunluk", "performans"],
  "confidence_score": 0.95
}

Eğer hiçbir kurye uygun değilse:
{
  "selected_courier_id": null,
  "reasoning": "Uygun kurye bulunamama sebebi",
  "estimated_delivery_time_minutes": null,
  "priority_factors": [],
  "confidence_score": 0
}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sen kurye atama konusunda uzman bir AI asistanısın. Verimli ve hızlı teslimat için en optimal kararları verirsin.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Tutarlı kararlar için düşük temperature
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const aiDecision = JSON.parse(response.choices[0].message.content || '{}')
    
    console.log('🤖 AI Kurye Atama Kararı:', aiDecision)
    
    return aiDecision
  } catch (error) {
    console.error('AI karar verme hatası:', error)
    throw new Error('AI karar verme sistemi hatası')
  }
}

// Kurye atamasını gerçekleştir
async function executeAssignment(orderId: string, courierId: string, aiDecision: any, systemData: any) {
  try {
    const selectedCourier = systemData.availableCouriers.find((c: any) => c.id === courierId)
    if (!selectedCourier) {
      throw new Error('Seçilen kurye bulunamadı')
    }

    // Atama kaydı oluştur
    const { data: assignment, error: assignmentError } = await supabase
      .from('delivery_assignments')
      .insert({
        order_id: orderId,
        courier_id: courierId,
        restaurant_id: systemData.order.restaurant_id,
        delivery_fee: selectedCourier.delivery_fee,
        estimated_delivery_time: new Date(
          Date.now() + (aiDecision.estimated_delivery_time_minutes || 30) * 60 * 1000
        ).toISOString(),
        notes: `AI Atama: ${aiDecision.reasoning}`
      })
      .select()
      .single()

    if (assignmentError) {
      throw new Error('Atama kaydı oluşturulamadı')
    }

    // Kuryeye bildirim gönder
    await supabase
      .from('courier_notifications')
      .insert({
        courier_id: courierId,
        type: 'new_assignment',
        title: '🤖 AI Kurye Ataması',
        message: `${systemData.restaurant.name} restoranından AI tarafından size atanan teslimat. Ücret: ₺${selectedCourier.delivery_fee}`,
        data: {
          assignment_id: assignment.id,
          order_id: orderId,
          restaurant_name: systemData.restaurant.name,
          delivery_fee: selectedCourier.delivery_fee,
          distance: selectedCourier.distance_to_restaurant.toFixed(1),
          ai_reasoning: aiDecision.reasoning,
          confidence_score: aiDecision.confidence_score
        }
      })

    // Siparişi güncelle - hazırlanıyor durumuna geç
    await supabase
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', orderId)

    return {
      success: true,
      assignment_id: assignment.id,
      courier_id: courierId,
      courier_name: selectedCourier.full_name,
      delivery_fee: selectedCourier.delivery_fee,
      estimated_distance: selectedCourier.distance_to_restaurant.toFixed(1),
      ai_reasoning: aiDecision.reasoning,
      confidence_score: aiDecision.confidence_score,
      estimated_delivery_time_minutes: aiDecision.estimated_delivery_time_minutes
    }

  } catch (error) {
    console.error('Atama gerçekleştirme hatası:', error)
    throw error
  }
}

// POST: AI ile kurye atama
export async function POST(request: NextRequest) {
  try {
    const { orderId, forceAssign = false } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Sipariş ID gerekli' },
        { status: 400 }
      )
    }

    // OpenAI API anahtarını kontrol et
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API anahtarı yapılandırılmamış' },
        { status: 500 }
      )
    }

    // Daha önce atama yapılmış mı kontrol et
    if (!forceAssign) {
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
    }

    console.log('🤖 AI Kurye Atama Sistemi başlatılıyor...', { orderId })

    // 1. Sistem verilerini topla
    const systemData = await gatherSystemData(orderId)

    if (!systemData.availableCouriers || systemData.availableCouriers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Müsait kurye bulunamadı',
        ai_reasoning: 'Sistemde aktif ve müsait kurye bulunmuyor'
      })
    }

    // 2. AI ile karar ver
    const aiDecision = await makeAIAssignmentDecision(systemData)

    if (!aiDecision.selected_courier_id) {
      return NextResponse.json({
        success: false,
        error: 'AI uygun kurye bulamadı',
        ai_reasoning: aiDecision.reasoning,
        confidence_score: aiDecision.confidence_score
      })
    }

    // 3. Atamayı gerçekleştir
    const result = await executeAssignment(
      orderId,
      aiDecision.selected_courier_id,
      aiDecision,
      systemData
    )

    console.log('✅ AI Kurye Ataması tamamlandı:', result)

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('💥 AI Kurye Atama hatası:', error)
    return NextResponse.json(
      { 
        error: error.message || 'AI kurye atama sistemi hatası',
        success: false
      },
      { status: 500 }
    )
  }
}

// GET: Atanmamış siparişleri kontrol et ve otomatik atama yap
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const autoAssign = url.searchParams.get('autoAssign') === 'true'

    // Bekleyen siparişleri al
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at, restaurant_id, total_amount')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (ordersError) {
      throw ordersError
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({
        message: 'Bekleyen sipariş bulunamadı',
        unassigned_orders: [],
        auto_assignments: []
      })
    }

    // Hangi siparişlerin zaten ataması var kontrol et
    const orderIds = pendingOrders.map(order => order.id)
    const { data: existingAssignments, error: assignmentsError } = await supabase
      .from('delivery_assignments')
      .select('order_id')
      .in('order_id', orderIds)
      .not('status', 'eq', 'cancelled')

    if (assignmentsError) {
      throw assignmentsError
    }

    // Atanmış sipariş ID'lerini al
    const assignedOrderIds = new Set(existingAssignments?.map(a => a.order_id) || [])
    
    // Atanmamış siparişleri filtrele
    const unassignedOrders = pendingOrders.filter(order => !assignedOrderIds.has(order.id))

    if (unassignedOrders.length === 0) {
      return NextResponse.json({
        message: 'Atanmamış sipariş bulunamadı',
        unassigned_orders: [],
        auto_assignments: []
      })
    }

    let autoAssignments = []

    // Otomatik atama isteniyorsa
    if (autoAssign) {
      console.log('🤖 Otomatik AI atama başlatılıyor...', { orderCount: unassignedOrders.length })

      for (const order of unassignedOrders) {
        try {
          // Her sipariş için AI atama dene
          const assignmentResponse = await fetch(`${request.url.split('/api')[0]}/api/ai-courier-assignment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id })
          })

          const assignmentResult = await assignmentResponse.json()
          
          autoAssignments.push({
            order_id: order.id,
            success: assignmentResult.success,
            courier_name: assignmentResult.courier_name || null,
            error: assignmentResult.error || null,
            ai_reasoning: assignmentResult.ai_reasoning || null
          })

          // API rate limit için kısa bekleme
          await new Promise(resolve => setTimeout(resolve, 200))

        } catch (assignmentError: any) {
          console.error(`💥 Sipariş ${order.id} için otomatik atama hatası:`, assignmentError)
          
          autoAssignments.push({
            order_id: order.id,
            success: false,
            error: assignmentError.message || 'Bilinmeyen hata',
            ai_reasoning: null
          })
        }
      }
    }

    return NextResponse.json({
      message: `${unassignedOrders.length} atanmamış sipariş bulundu`,
      unassigned_orders: unassignedOrders,
      auto_assignments: autoAssignments,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('💥 AI Kurye Assignment GET hatası:', error)
    return NextResponse.json(
      { 
        error: error.message || 'AI kurye assignment sistemi hatası',
        success: false
      },
      { status: 500 }
    )
  }
} 