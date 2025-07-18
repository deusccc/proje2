'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User } from '@/types'
import { Order } from '@/types/index'
import DashboardLayout from '@/components/DashboardLayout'
import { MapPinIcon, PhoneIcon, CheckCircleIcon, ArrowPathIcon, TruckIcon, HomeIcon, CurrencyDollarIcon, XMarkIcon } from '@heroicons/react/24/outline'

type CourierOrder = Order & {
  order_items: { product_name: string, quantity: number }[]
}

export default function CourierDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [activeOrders, setActiveOrders] = useState<CourierOrder[]>([])
  const [pastOrders, setPastOrders] = useState<CourierOrder[]>([])
  const [view, setView] = useState<'active' | 'past'>('active')
  const [loading, setLoading] = useState(true)
  const [loadingPast, setLoadingPast] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)
      fetchActiveOrders(currentUser)
    }
    init()
  }, [router])

  const fetchActiveOrders = async (currentUser: User) => {
    setLoading(true)
    try {
      // Eğer kullanıcının restaurant_id'si yoksa, ilk aktif restoranı al
      let restaurantId = currentUser.restaurant_id
      if (!restaurantId) {
        const { data: firstRestaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single()
        
        if (restaurantError || !firstRestaurant) {
          console.error('Aktif restoran bulunamadı:', restaurantError)
          setActiveOrders([])
          setLoading(false)
          return
        }
        restaurantId = firstRestaurant.id
      }

      // Aktif siparişleri al (teslim edilmemiş)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('status', ['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'])
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      if (!ordersData || ordersData.length === 0) {
        setActiveOrders([])
        setLoading(false)
        return
      }

      // Her sipariş için order_items'ları al
      const ordersWithItems = []
      for (const order of ordersData) {
        const { data: orderItemsData } = await supabase
          .from('order_items')
          .select('product_name, quantity')
          .eq('order_id', order.id)
        
        ordersWithItems.push({
          ...order,
          order_number: `ORD-${order.id.slice(-8).toUpperCase()}`, // ID'den order_number türet
          order_items: orderItemsData || []
        })
      }

      setActiveOrders(ordersWithItems)
    } catch (error) {
      console.error('Aktif siparişler alınırken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPastOrders = async () => {
    if (!user) return
    
    setLoadingPast(true)
    try {
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
          setPastOrders([])
          setLoadingPast(false)
          return
        }
        restaurantId = firstRestaurant.id
      }

      // Tamamlanmış siparişleri al
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('status', ['delivered', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (ordersError) throw ordersError

      if (!ordersData || ordersData.length === 0) {
        setPastOrders([])
        setLoadingPast(false)
        return
      }

      // Her sipariş için order_items'ları al
      const ordersWithItems = []
      for (const order of ordersData) {
        const { data: orderItemsData } = await supabase
          .from('order_items')
          .select('product_name, quantity')
          .eq('order_id', order.id)
        
        ordersWithItems.push({
          ...order,
          order_number: `ORD-${order.id.slice(-8).toUpperCase()}`, // ID'den order_number türet
          order_items: orderItemsData || []
        })
      }

      setPastOrders(ordersWithItems)
    } catch (error) {
      console.error('Geçmiş siparişler alınırken hata:', error)
    } finally {
      setLoadingPast(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setUpdating(orderId)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      
      // Siparişleri yenile
      if (user) {
        await fetchActiveOrders(user)
      }
    } catch (error) {
      console.error('Sipariş durumu güncellenirken hata:', error)
      alert('Sipariş durumu güncellenirken bir hata oluştu.')
    } finally {
      setUpdating(null)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede'
      case 'confirmed': return 'Onaylandı'
      case 'preparing': return 'Hazırlanıyor'
      case 'ready_for_pickup': return 'Alınmaya Hazır'
      case 'out_for_delivery': return 'Yolda'
      case 'delivered': return 'Teslim Edildi'
      case 'cancelled': return 'İptal Edildi'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-orange-100 text-orange-800'
      case 'ready_for_pickup': return 'bg-purple-100 text-purple-800'
      case 'out_for_delivery': return 'bg-green-100 text-green-800'
      case 'delivered': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout user={user} onSignOut={handleSignOut}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Kurye Paneli</h1>
            <p className="text-gray-600">Sipariş durumlarını takip edin ve yönetin</p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setView('active')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    view === 'active'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Aktif Siparişler ({activeOrders.length})
                </button>
                <button
                  onClick={() => {
                    setView('past')
                    if (pastOrders.length === 0) {
                      fetchPastOrders()
                    }
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    view === 'past'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Geçmiş Siparişler ({pastOrders.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Orders List */}
          {view === 'active' ? (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <ArrowPathIcon className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
                  <p className="mt-2 text-gray-500">Siparişler yükleniyor...</p>
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="text-center py-8">
                  <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">Aktif sipariş bulunmuyor.</p>
                </div>
              ) : (
                activeOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg shadow border p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Sipariş #{order.order_number}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('tr-TR')} - {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Müşteri Bilgileri</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="flex items-center">
                            <HomeIcon className="h-4 w-4 mr-2" />
                            {order.customer_name}
                          </p>
                          <p className="flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-2" />
                            {order.customer_phone}
                          </p>
                          <p className="flex items-start">
                            <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{order.customer_address}</span>
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Sipariş Detayları</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          {order.order_items.map((item, index) => (
                            <p key={index}>
                              {item.quantity}x {item.product_name}
                            </p>
                          ))}
                          <p className="flex items-center font-medium text-gray-900 mt-2">
                            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                            ₺{order.total_amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {order.status === 'confirmed' && (
                        <button
                          onClick={() => updateOrderStatus(order.id.toString(), 'preparing')}
                          disabled={updating === order.id.toString()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                        >
                          {updating === order.id.toString() ? 'Güncelleniyor...' : 'Hazırlamaya Başla'}
                        </button>
                      )}
                      
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => updateOrderStatus(order.id.toString(), 'ready_for_pickup')}
                          disabled={updating === order.id.toString()}
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 text-sm"
                        >
                          {updating === order.id.toString() ? 'Güncelleniyor...' : 'Hazır Olarak İşaretle'}
                        </button>
                      )}
                      
                      {order.status === 'ready_for_pickup' && (
                        <button
                          onClick={() => updateOrderStatus(order.id.toString(), 'out_for_delivery')}
                          disabled={updating === order.id.toString()}
                          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 text-sm"
                        >
                          {updating === order.id.toString() ? 'Güncelleniyor...' : 'Teslimat İçin Al'}
                        </button>
                      )}
                      
                      {order.status === 'out_for_delivery' && (
                        <button
                          onClick={() => updateOrderStatus(order.id.toString(), 'delivered')}
                          disabled={updating === order.id.toString()}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm"
                        >
                          {updating === order.id.toString() ? 'Güncelleniyor...' : 'Teslim Edildi'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {loadingPast ? (
                <div className="text-center py-8">
                  <ArrowPathIcon className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
                  <p className="mt-2 text-gray-500">Geçmiş siparişler yükleniyor...</p>
                </div>
              ) : pastOrders.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">Geçmiş sipariş bulunmuyor.</p>
                </div>
              ) : (
                pastOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg shadow border p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Sipariş #{order.order_number}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('tr-TR')} - {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Müşteri Bilgileri</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="flex items-center">
                            <HomeIcon className="h-4 w-4 mr-2" />
                            {order.customer_name}
                          </p>
                          <p className="flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-2" />
                            {order.customer_phone}
                          </p>
                          <p className="flex items-start">
                            <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{order.customer_address}</span>
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Sipariş Detayları</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          {order.order_items.map((item, index) => (
                            <p key={index}>
                              {item.quantity}x {item.product_name}
                            </p>
                          ))}
                          <p className="flex items-center font-medium text-gray-900 mt-2">
                            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                            ₺{order.total_amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 