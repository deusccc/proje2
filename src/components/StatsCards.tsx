'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User } from '@/types'
import {
  ShoppingBagIcon,
  ClockIcon,
  CheckCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

interface StatsCardsProps {
  user: User | null
}

export default function StatsCards({ user }: StatsCardsProps) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    dailyRevenue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && user.restaurant_id) {
      fetchStats()
    }
  }, [user])

  // Real-time subscription ekle
  useEffect(() => {
    if (!user || !user.restaurant_id) return

    const subscription = supabase
      .channel('stats-cards')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          // Kullanıcının restoranına ait sipariş mi kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            fetchStats()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload: any) => {
          // Kullanıcının restoranına ait sipariş mi kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            fetchStats()
          }
        }
      )
      .subscribe()

    // Custom event listener for stats updates
    const handleStatsUpdate = () => {
      fetchStats()
    }
    
    window.addEventListener('stats-updated', handleStatsUpdate)

    // 4 saniyede bir otomatik güncelleme
    const autoRefreshInterval = setInterval(() => {
      fetchStats()
    }, 4000)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('stats-updated', handleStatsUpdate)
      clearInterval(autoRefreshInterval)
    }
  }, [user])

  const fetchStats = async () => {
    try {
      if (!user || !user.restaurant_id) {
        console.error('No user or restaurant information')
        return
      }

      const restaurantId = user.restaurant_id
      const today = new Date().toISOString().split('T')[0]

      // Get total orders
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)

      // Get pending orders
      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('status', 'pending')

      // Get completed orders
      const { count: completedOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('status', 'delivered')

      // Get daily revenue
      const { data: dailyOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', today)
        .eq('payment_status', 'paid')

      const dailyRevenue = dailyOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      setStats({
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        completedOrders: completedOrders || 0,
        dailyRevenue
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Toplam Sipariş',
      value: stats.totalOrders,
      icon: ShoppingBagIcon,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Bekleyen Siparişler',
      value: stats.pendingOrders,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Tamamlanan Siparişler',
      value: stats.completedOrders,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Günlük Gelir',
      value: `₺${stats.dailyRevenue.toFixed(2)}`,
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
            <div className={`p-3 rounded-full ${card.color}`}>
              <card.icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 