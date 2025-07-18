'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  PhoneIcon,
  MapPinIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

interface ExternalOrder {
  id: string
  restaurant_id: string
  platform: string
  external_order_id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_address: string
  delivery_latitude?: number
  delivery_longitude?: number
  status: string
  external_status: string
  total_amount: number
  subtotal: number
  delivery_fee: number
  platform_commission: number
  payment_method: string
  payment_status: string
  estimated_delivery_time?: string
  order_date: string
  notes?: string
  raw_data: any
  created_at: string
  updated_at: string
  items?: ExternalOrderItem[]
}

interface ExternalOrderItem {
  id: string
  external_order_id: string
  external_product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  options?: any
  special_instructions?: string
}

export default function ExternalOrdersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<ExternalOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<ExternalOrder | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    daily_revenue: 0
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/')
      return
    }
    setUser(currentUser)
    
    if (!currentUser.restaurant_id) {
      setLoading(false)
      return
    }
    
    await fetchOrders(currentUser.restaurant_id)
    await fetchStats(currentUser.restaurant_id)
    setLoading(false)
  }

  const fetchOrders = async (restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('external_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order_date', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Harici siparişler getirilemedi:', error)
    }
  }

  const fetchStats = async (restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('external_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)

      if (error) throw error

      const today = new Date().toISOString().split('T')[0]
      const dailyOrders = data?.filter(order => 
        order.order_date.startsWith(today)
      ) || []

      const dailyRevenue = dailyOrders
        .filter(order => order.payment_status === 'paid')
        .reduce((sum, order) => sum + order.total_amount, 0)

      setStats({
        total: data?.length || 0,
        pending: data?.filter(order => order.status === 'pending').length || 0,
        completed: data?.filter(order => order.status === 'delivered').length || 0,
        cancelled: data?.filter(order => order.status === 'cancelled').length || 0,
        daily_revenue: dailyRevenue
      })
    } catch (error) {
      console.error('İstatistikler getirilemedi:', error)
    }
  }

  const handleSignOut = () => {
    router.push('/')
  }

  const openOrderModal = async (order: ExternalOrder) => {
    try {
      // Sipariş kalemlerini getir
      const { data: items, error } = await supabase
        .from('external_order_items')
        .select('*')
        .eq('external_order_id', order.id)

      if (error) throw error

      setSelectedOrder({ ...order, items: items || [] })
      setShowModal(true)
    } catch (error) {
      console.error('Sipariş detayları getirilemedi:', error)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedOrder(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'preparing':
        return 'bg-orange-100 text-orange-800'
      case 'ready_for_pickup':
        return 'bg-purple-100 text-purple-800'
      case 'out_for_delivery':
        return 'bg-indigo-100 text-indigo-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Bekliyor'
      case 'confirmed':
        return 'Onaylandı'
      case 'preparing':
        return 'Hazırlanıyor'
      case 'ready_for_pickup':
        return 'Teslim Hazır'
      case 'out_for_delivery':
        return 'Yolda'
      case 'delivered':
        return 'Teslim Edildi'
      case 'cancelled':
        return 'İptal Edildi'
      default:
        return status
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'yemeksepeti':
        return '🍽️'
      case 'getir':
        return '🚚'
      case 'trendyol':
        return '🛍️'
      default:
        return '📱'
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_phone.includes(searchTerm)
    
    const matchesPlatform = selectedPlatform === 'all' || order.platform === selectedPlatform
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus
    
    return matchesSearch && matchesPlatform && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user} onSignOut={handleSignOut} allowedRoles={['admin', 'manager', 'staff']}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Harici Siparişler</h1>
            <p className="mt-2 text-gray-600">
              Yemeksepeti ve diğer platformlardan gelen siparişler
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-500">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Toplam Sipariş</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-500">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Bekleyen</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-500">
                  <CheckCircleIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tamamlanan</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-500">
                  <XCircleIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">İptal Edilen</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-500">
                  <CurrencyDollarIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Günlük Ciro</p>
                  <p className="text-2xl font-bold text-gray-900">₺{stats.daily_revenue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arama
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Müşteri adı, sipariş no, telefon..."
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform
                  </label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tüm Platformlar</option>
                    <option value="yemeksepeti">Yemeksepeti</option>
                    <option value="getir">Getir</option>
                    <option value="trendyol">Trendyol Yemek</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durum
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="pending">Bekliyor</option>
                    <option value="confirmed">Onaylandı</option>
                    <option value="preparing">Hazırlanıyor</option>
                    <option value="ready_for_pickup">Teslim Hazır</option>
                    <option value="out_for_delivery">Yolda</option>
                    <option value="delivered">Teslim Edildi</option>
                    <option value="cancelled">İptal Edildi</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedPlatform('all')
                      setSelectedStatus('all')
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sipariş
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Müşteri
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tutar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{order.order_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {order.external_order_id}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            {order.customer_phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">
                            {getPlatformIcon(order.platform)}
                          </span>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {order.platform}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            ₺{order.total_amount.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Teslimat: ₺{order.delivery_fee.toFixed(2)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.order_date).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openOrderModal(order)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition-colors"
                          title="Detayları Görüntüle"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Sipariş bulunamadı</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Seçili kriterlere uygun harici sipariş bulunmuyor.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Sipariş Detayı - #{selectedOrder.order_number}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Müşteri Bilgileri */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Müşteri Bilgileri</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 w-20">Ad:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedOrder.customer_name}</span>
                    </div>
                    <div className="flex items-center">
                      <PhoneIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600 w-20">Telefon:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedOrder.customer_phone}</span>
                    </div>
                    {selectedOrder.customer_email && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 w-20">Email:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedOrder.customer_email}</span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mr-1 mt-0.5" />
                      <span className="text-sm text-gray-600 w-20">Adres:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedOrder.customer_address}</span>
                    </div>
                  </div>
                </div>

                {/* Sipariş Bilgileri */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Sipariş Bilgileri</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 w-24">Platform:</span>
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getPlatformIcon(selectedOrder.platform)}</span>
                        <span className="text-sm font-medium text-gray-900 capitalize">{selectedOrder.platform}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 w-24">Durum:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusText(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 w-24">Ödeme:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedOrder.payment_method}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 w-24">Tarih:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(selectedOrder.order_date).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    {selectedOrder.estimated_delivery_time && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 w-24">Tahmini:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(selectedOrder.estimated_delivery_time).toLocaleString('tr-TR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sipariş Kalemleri */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Sipariş Kalemleri</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-start border-b border-gray-200 pb-2 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {item.quantity}x {item.product_name}
                            </div>
                            {item.special_instructions && (
                              <div className="text-xs text-gray-500 mt-1">
                                Not: {item.special_instructions}
                              </div>
                            )}
                            {item.options && Object.keys(item.options).length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Seçenekler: {JSON.stringify(item.options)}
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            ₺{item.total_price.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">
                      Sipariş kalemleri bulunamadı
                    </div>
                  )}
                </div>
              </div>

              {/* Fiyat Özeti */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Fiyat Özeti</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Ara Toplam:</span>
                    <span className="text-sm font-medium text-gray-900">₺{selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Teslimat Ücreti:</span>
                    <span className="text-sm font-medium text-gray-900">₺{selectedOrder.delivery_fee.toFixed(2)}</span>
                  </div>
                  {selectedOrder.platform_commission > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Platform Komisyonu:</span>
                      <span className="text-sm font-medium text-red-600">-₺{selectedOrder.platform_commission.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-base font-medium text-gray-900">Toplam:</span>
                    <span className="text-base font-bold text-gray-900">₺{selectedOrder.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="mt-4 bg-yellow-50 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Notlar</h4>
                  <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
} 