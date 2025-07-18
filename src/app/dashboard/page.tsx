'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/supabase/index'
import { useRouter } from 'next/navigation'
import { User } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import StatsCards from '@/components/StatsCards'
import OrdersOverview from '@/components/OrdersOverview'
import AICourierManager from '@/components/AICourierManager'
import { supabase } from '@/lib/supabase/index'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      router.push('/')
      return
    }
    setUser(currentUser)
    setLoading(false)
  }, [router])

  // Real-time subscription ekle
  useEffect(() => {
    if (!user) return

    const subscription = supabase
      .channel('main-dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          // Kullanıcının restoranına ait sipariş mi kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            // Tüm bileşenlerde güncelleme tetikle
            window.dispatchEvent(new CustomEvent('orders-updated'))
            window.dispatchEvent(new CustomEvent('stats-updated'))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload: any) => {
          // Kullanıcının restoranına ait sipariş mi kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            // Tüm bileşenlerde güncelleme tetikle
            window.dispatchEvent(new CustomEvent('orders-updated'))
            window.dispatchEvent(new CustomEvent('stats-updated'))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_assignments' },
        (payload: any) => {
          window.dispatchEvent(new CustomEvent('courier-assignments-updated'))
          window.dispatchEvent(new CustomEvent('stats-updated'))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_assignments' },
        (payload: any) => {
          window.dispatchEvent(new CustomEvent('courier-assignments-updated'))
          window.dispatchEvent(new CustomEvent('stats-updated'))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couriers' },
        (payload: any) => {
          window.dispatchEvent(new CustomEvent('couriers-updated'))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'products' },
        (payload: any) => {
          // Kullanıcının restoranına ait ürün mü kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            window.dispatchEvent(new CustomEvent('menu-updated'))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload: any) => {
          // Kullanıcının restoranına ait ürün mü kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            window.dispatchEvent(new CustomEvent('menu-updated'))
          }
        }
      )
      .subscribe()

    // 4 saniyede bir otomatik güncelleme (bileşenler için event'ler tetikle)
    const autoRefreshInterval = setInterval(() => {
      // Bileşenlere güncelleme sinyali gönder
      window.dispatchEvent(new CustomEvent('orders-updated'))
      window.dispatchEvent(new CustomEvent('stats-updated'))
      window.dispatchEvent(new CustomEvent('courier-assignments-updated'))
      window.dispatchEvent(new CustomEvent('couriers-updated'))
      window.dispatchEvent(new CustomEvent('menu-updated'))
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearInterval(autoRefreshInterval)
    }
  }, [user])

  const handleSignOut = () => {
    localStorage.removeItem('user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout user={user} onSignOut={handleSignOut} allowedRoles={['admin', 'manager', 'staff']}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Hoş geldin, {user.full_name}!
          </h1>
          <p className="text-gray-600">
            {user.restaurants?.name || 'Restoran'} - Sipariş yönetim panelinize hoş geldiniz
          </p>
        </div>

        <StatsCards user={user} />
        
        {/* AI Kurye Atama Sistemi */}
        <AICourierManager />
        
        <OrdersOverview user={user} />
      </div>
    </DashboardLayout>
  )
} 