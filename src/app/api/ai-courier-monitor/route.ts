import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/index'

// Otomatik AI kurye atama monitörü
export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AI Kurye Atama Monitörü başlatılıyor...')

    // Atanmamış siparişleri kontrol et (delivery_assignments tablosunda kaydı olmayanlar)
    const { data: allPendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at, restaurant_id, total_amount, customer_name')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (ordersError) {
      throw ordersError
    }

    if (!allPendingOrders || allPendingOrders.length === 0) {
      return NextResponse.json({
        message: 'Bekleyen sipariş bulunamadı',
        processed_orders: 0,
        success_count: 0,
        failed_count: 0
      })
    }

    // Hangi siparişlerin zaten ataması var kontrol et
    const orderIds = allPendingOrders.map(order => order.id)
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
    const unassignedOrders = allPendingOrders.filter(order => !assignedOrderIds.has(order.id))

    if (unassignedOrders.length === 0) {
      return NextResponse.json({
        message: 'Atanmamış sipariş bulunamadı',
        processed_orders: 0,
        success_count: 0,
        failed_count: 0
      })
    }

    console.log(`📋 ${unassignedOrders.length} atanmamış sipariş bulundu`)

    let successCount = 0
    let failedCount = 0
    const results = []

    // Her sipariş için AI atama dene
    for (const order of unassignedOrders) {
      try {
        console.log(`🔄 Sipariş ${order.id} için AI atama deneniyor...`)

        // AI kurye atama API'sini çağır
        const assignmentResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3001'}/api/ai-courier-assignment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id })
        })

        const assignmentResult = await assignmentResponse.json()

        if (assignmentResult.success) {
          successCount++
          console.log(`✅ Sipariş ${order.id} başarıyla atandı: ${assignmentResult.courier_name}`)
        } else {
          failedCount++
          console.log(`❌ Sipariş ${order.id} atanamadı: ${assignmentResult.error}`)
        }

        results.push({
          order_id: order.id,
          customer_name: order.customer_name,
          success: assignmentResult.success,
          courier_name: assignmentResult.courier_name || null,
          error: assignmentResult.error || null,
          ai_reasoning: assignmentResult.ai_reasoning || null
        })

        // API rate limit için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (assignmentError: any) {
        failedCount++
        console.error(`💥 Sipariş ${order.id} için atama hatası:`, assignmentError)
        
        results.push({
          order_id: order.id,
          customer_name: order.customer_name,
          success: false,
          error: assignmentError.message || 'Bilinmeyen hata',
          ai_reasoning: null
        })
      }
    }

    console.log(`🎯 AI Kurye Atama Tamamlandı: ${successCount} başarılı, ${failedCount} başarısız`)

    return NextResponse.json({
      message: `${unassignedOrders.length} sipariş işlendi`,
      processed_orders: unassignedOrders.length,
      success_count: successCount,
      failed_count: failedCount,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('💥 AI Kurye Atama Monitörü hatası:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Monitör sistemi hatası',
        success: false
      },
      { status: 500 }
    )
  }
}

// GET: Sistem durumunu kontrol et
export async function GET(request: NextRequest) {
  try {
    // Bekleyen siparişleri al
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at')
      .eq('status', 'pending')

    if (ordersError) {
      throw ordersError
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({
        system_status: 'active',
        unassigned_orders_count: 0,
        available_couriers_count: 0,
        recent_ai_assignments_count: 0,
        last_check: new Date().toISOString(),
        recommendation: 'Bekleyen sipariş yok'
      })
    }

    // Hangi siparişlerin ataması var kontrol et
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
    
    // Atanmamış siparişleri say
    const unassignedOrdersCount = pendingOrders.filter(order => !assignedOrderIds.has(order.id)).length

    // Müsait kurye sayısını al
    const { data: availableCouriers, error: couriersError } = await supabase
      .from('couriers')
      .select('id')
      .eq('is_active', true)
      .eq('is_available', true)

    if (couriersError) {
      throw couriersError
    }

    // Son 1 saatteki AI atamalarını al
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { data: recentAIAssignments, error: aiAssignmentsError } = await supabase
      .from('delivery_assignments')
      .select('id, created_at, notes')
      .like('notes', '%AI Atama%')
      .gte('created_at', oneHourAgo.toISOString())

    if (aiAssignmentsError) {
      throw aiAssignmentsError
    }

    return NextResponse.json({
      system_status: 'active',
      unassigned_orders_count: unassignedOrdersCount,
      available_couriers_count: availableCouriers?.length || 0,
      recent_ai_assignments_count: recentAIAssignments?.length || 0,
      last_check: new Date().toISOString(),
      recommendation: unassignedOrdersCount > 0 && (availableCouriers?.length || 0) > 0 
        ? 'AI atama çalıştırılabilir' 
        : 'AI atama için uygun koşullar yok'
    })

  } catch (error: any) {
    console.error('Sistem durumu kontrol hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Sistem durumu kontrol hatası' },
      { status: 500 }
    )
  }
} 