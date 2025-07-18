'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User, Order } from '@/types'
import Link from 'next/link'
import { EyeIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface OrdersOverviewProps {
  user: User | null
}

export default function OrdersOverview({ user }: OrdersOverviewProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && user.restaurant_id) {
      fetchOrders()
    }
  }, [user])

  // Real-time subscription ekle
  useEffect(() => {
    if (!user || !user.restaurant_id) return

    const subscription = supabase
      .channel('orders-overview')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          // Kullanıcının restoranına ait sipariş mi kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            fetchOrders()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload: any) => {
          // Kullanıcının restoranına ait sipariş mi kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            fetchOrders()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload: any) => {
          // Kullanıcının restoranına ait sipariş mi kontrol et
          if (payload.old.restaurant_id === user.restaurant_id) {
            fetchOrders()
          }
        }
      )
      .subscribe()

    // Custom event listener for orders updates
    const handleOrdersUpdate = () => {
      fetchOrders()
    }
    
    window.addEventListener('orders-updated', handleOrdersUpdate)

    // 4 saniyede bir otomatik güncelleme
    const autoRefreshInterval = setInterval(() => {
      fetchOrders()
    }, 4000)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('orders-updated', handleOrdersUpdate)
      clearInterval(autoRefreshInterval)
    }
  }, [user])

  const fetchOrders = async () => {
    try {
      if (!user) {
        console.error('No user information')
        return
      }

      // Eğer kullanıcının restaurant_id'si yoksa, ilk aktif restoranı al
      let restaurantId = user.restaurant_id
      if (!restaurantId) {
        const { data: firstRestaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single()
        
        if (restaurantError || !firstRestaurant) {
          console.error('Aktif restoran bulunamadı:', restaurantError)
          return
        }
        restaurantId = firstRestaurant.id
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      // Order_number alanını ID'den türet
      const ordersWithNumbers = (data || []).map(order => ({
        ...order,
        order_number: `ORD-${order.id.slice(-8).toUpperCase()}`
      }))

      setOrders(ordersWithNumbers)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'preparing': return 'bg-blue-100 text-blue-800'
      case 'ready': return 'bg-green-100 text-green-800'
      case 'delivered': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede'
      case 'preparing': return 'Hazırlanıyor'
      case 'ready': return 'Hazır'
      case 'delivered': return 'Teslim Edildi'
      case 'cancelled': return 'İptal Edildi'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return ClockIcon
      case 'preparing': return ClockIcon
      case 'ready': return CheckCircleIcon
      case 'delivered': return CheckCircleIcon
      default: return ClockIcon
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Son Siparişler</h2>
        <Link
          href="/dashboard/orders"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          Tümünü Gör
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Henüz sipariş bulunmuyor</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const StatusIcon = getStatusIcon(order.status)
            return (
              <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <StatusIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">#{(order as any).order_number}</h3>
                    <p className="text-sm text-gray-600">{order.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₺{order.total_amount}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="text-primary-600 hover:text-primary-700 p-1"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
} 