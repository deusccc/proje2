import { supabase } from './supabase'
import { DeliveryAssignment, Order, CourierStats } from '../types'

export class DeliveryService {
  static async getActiveAssignments(courierId: string): Promise<DeliveryAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          orders (
            *,
            restaurants (*)
          )
        `)
        .eq('courier_id', courierId)
        .in('status', ['assigned', 'picked_up'])
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get active assignments error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Get active assignments error:', error)
      return []
    }
  }

  static async getCompletedAssignments(
    courierId: string,
    limit: number = 20
  ): Promise<DeliveryAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          orders (
            *,
            restaurants (*)
          )
        `)
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Get completed assignments error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Get completed assignments error:', error)
      return []
    }
  }

  // Siparişi teslim al (sadece hazır siparişler için)
  static async markAsPickedUp(assignmentId: string): Promise<boolean> {
    try {
      // Önce assignment ve order bilgilerini al
      const { data: assignment, error: assignmentError } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          orders (
            id,
            status,
            restaurant_id
          )
        `)
        .eq('id', assignmentId)
        .single()

      if (assignmentError) {
        console.error('Assignment fetch error:', assignmentError)
        return false
      }

      const order = (assignment as any).orders
      
      // Sipariş hazır değilse teslim alınamaz
      if (order.status !== 'ready_for_pickup') {
        console.error('Order not ready for pickup. Current status:', order.status)
        return false
      }

      // Transaction ile hem assignment hem de order'ı güncelle
      const { error: updateError } = await supabase.rpc('update_pickup_status', {
        p_assignment_id: assignmentId,
        p_order_id: order.id
      })

      if (updateError) {
        console.error('Update pickup status error:', updateError)
        
        // RPC yoksa manuel güncelleme yap
        const { error: assignmentUpdateError } = await supabase
          .from('delivery_assignments')
          .update({
            status: 'picked_up',
            picked_up_at: new Date().toISOString()
          })
          .eq('id', assignmentId)

        if (assignmentUpdateError) {
          console.error('Assignment update error:', assignmentUpdateError)
          return false
        }

        // Order durumunu 'on_the_way' olarak güncelle
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            status: 'on_the_way',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)

        if (orderUpdateError) {
          console.error('Order update error:', orderUpdateError)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Mark as picked up error:', error)
      return false
    }
  }

  // Siparişi teslim et
  static async markAsDelivered(assignmentId: string): Promise<boolean> {
    try {
      // Önce assignment ve order bilgilerini al
      const { data: assignment, error: assignmentError } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          orders (
            id,
            status
          )
        `)
        .eq('id', assignmentId)
        .single()

      if (assignmentError) {
        console.error('Assignment fetch error:', assignmentError)
        return false
      }

      const order = (assignment as any).orders

      // Transaction ile hem assignment hem de order'ı güncelle
      const { error: updateError } = await supabase.rpc('update_delivery_status', {
        p_assignment_id: assignmentId,
        p_order_id: order.id
      })

      if (updateError) {
        console.error('Update delivery status error:', updateError)
        
        // RPC yoksa manuel güncelleme yap
        const { error: assignmentUpdateError } = await supabase
          .from('delivery_assignments')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('id', assignmentId)

        if (assignmentUpdateError) {
          console.error('Assignment update error:', assignmentUpdateError)
          return false
        }

        // Order durumunu 'delivered' olarak güncelle
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            status: 'delivered',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)

        if (orderUpdateError) {
          console.error('Order update error:', orderUpdateError)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Mark as delivered error:', error)
      return false
    }
  }

  static async rejectAssignment(assignmentId: string, reason?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('delivery_assignments')
        .update({
          status: 'rejected',
          notes: reason || 'Kurye tarafından reddedildi'
        })
        .eq('id', assignmentId)

      if (error) {
        console.error('Reject assignment error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Reject assignment error:', error)
      return false
    }
  }

  // Artık kullanılmayacak fonksiyonlar - kaldırıldı
  static async acceptAssignment(assignmentId: string): Promise<boolean> {
    // Bu fonksiyon artık kullanılmayacak
    return false
  }

  static async markAsOnTheWay(assignmentId: string): Promise<boolean> {
    // Bu fonksiyon artık kullanılmayacak
    return false
  }

  static async getCourierStats(courierId: string): Promise<CourierStats | null> {
    try {
      // Bugünkü tarih
      const today = new Date().toISOString().split('T')[0]

      // Bugünkü tamamlanan teslimatlar
      const { data: todayDeliveries, error: todayError } = await supabase
        .from('delivery_assignments')
        .select('delivery_fee')
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        .gte('delivered_at', `${today}T00:00:00.000Z`)
        .lte('delivered_at', `${today}T23:59:59.999Z`)

      if (todayError) {
        console.error('Get today deliveries error:', todayError)
      }

      // Toplam teslimatlar
      const { data: totalDeliveries, error: totalError } = await supabase
        .from('delivery_assignments')
        .select('delivery_fee')
        .eq('courier_id', courierId)
        .eq('status', 'delivered')

      if (totalError) {
        console.error('Get total deliveries error:', totalError)
      }

      // Kurye başlangıç tarihi
      const { data: courierData, error: courierError } = await supabase
        .from('couriers')
        .select('created_at')
        .eq('id', courierId)
        .single()

      if (courierError) {
        console.error('Get courier data error:', courierError)
      }

      const todayEarnings = todayDeliveries?.reduce((sum, d) => sum + d.delivery_fee, 0) || 0
      const totalEarnings = totalDeliveries?.reduce((sum, d) => sum + d.delivery_fee, 0) || 0

      return {
        earnings_today: todayEarnings,
        completed_today: todayDeliveries?.length || 0,
        average_rating: 4.5, // Şimdilik sabit değer
        total_deliveries: totalDeliveries?.length || 0,
        total_earnings: totalEarnings,
        active_since: courierData?.created_at || new Date().toISOString()
      }
    } catch (error) {
      console.error('Get courier stats error:', error)
      return null
    }
  }

  static async getOrderDetails(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants (*)
        `)
        .eq('id', orderId)
        .single()

      if (error) {
        console.error('Get order details error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Get order details error:', error)
      return null
    }
  }

  static async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)

      if (error) {
        console.error('Update order status error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Update order status error:', error)
      return false
    }
  }
} 