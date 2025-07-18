'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/index'
import { 
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  XCircleIcon,
  BanknotesIcon,
  MapPinIcon,
  TruckIcon,
  ClockIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  UserIcon,
  BuildingStorefrontIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

// Interface tanımları
interface OrderDetails {
  id: string
  order_number: string
  restaurant_id: string
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_address_lat: number | null
  customer_address_lng: number | null
  customer_address_description: string | null
  restaurant_name: string
  restaurant_address: string
  total_amount: number
  subtotal: number
  delivery_fee: number
  tax_amount: number
  discount_amount: number
  payment_method: 'cash' | 'card' | 'online'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  status: 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled'
  created_at: string
  updated_at: string
  estimated_delivery_time: string | null
  is_location_verified: boolean
  location_verification_token: string | null
  notes: string | null
  order_items: OrderItem[]
  courier_assignment?: CourierAssignment
}

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  special_instructions: string | null
}

interface CourierAssignment {
  id: string
  courier_id: string
  courier_name: string
  courier_phone: string
  status: 'assigned' | 'accepted' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled'
  assigned_at: string
  estimated_delivery_time: string | null
  delivery_fee: number
}

interface Courier {
  id: string
  full_name: string
  phone: string
  is_available: boolean
  vehicle_type: string
  current_latitude: number | null
  current_longitude: number | null
}

interface Product {
  id: string
  name: string
  base_price: number
  is_available: boolean
  category_id: string
  restaurant_id: string
}

interface Stats {
  total_orders: number
  pending_orders: number
  active_orders: number
  completed_today: number
  daily_revenue: number
}

// Modal interface'leri
interface OrderActionModalProps {
  isOpen: boolean
  onClose: () => void
  order: OrderDetails | null
  action: 'view' | 'edit_payment' | 'edit_address' | 'assign_courier' | 'cancel' | 'update_status' | 'edit_order'
  onUpdate: () => void
}

export default function CompanyOrdersPage() {
  const router = useRouter()
  
  // Data states
  const [orders, setOrders] = useState<OrderDetails[]>([])
  const [filteredOrders, setFilteredOrders] = useState<OrderDetails[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<Stats>({
    total_orders: 0,
    pending_orders: 0,
    active_orders: 0,
    completed_today: 0,
    daily_revenue: 0
  })
  
  // UI states
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | OrderDetails['status']>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('today') // today, week, month, all
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null)
  const [modalAction, setModalAction] = useState<'view' | 'edit_payment' | 'edit_address' | 'assign_courier' | 'cancel' | 'update_status' | 'edit_order' | null>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const ordersPerPage = 20

  // Status tabs
  const statusTabs = [
    { name: 'Tümü', status: 'all' as const, color: 'text-gray-600' },
    { name: 'Bekleyenler', status: 'pending' as const, color: 'text-yellow-600' },
    { name: 'Onaylanan', status: 'confirmed' as const, color: 'text-blue-600' },
    { name: 'Hazırlanan', status: 'preparing' as const, color: 'text-orange-600' },
    { name: 'Hazır', status: 'ready_for_pickup' as const, color: 'text-purple-600' },
    { name: 'Yolda', status: 'out_for_delivery' as const, color: 'text-indigo-600' },
    { name: 'Teslim', status: 'delivered' as const, color: 'text-green-600' },
    { name: 'İptal', status: 'cancelled' as const, color: 'text-red-600' }
  ]

  // Veri yükleme fonksiyonları
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price,
            special_instructions
          ),
          delivery_assignments(
            id,
            courier_id,
            status,
            assigned_at,
            estimated_delivery_time,
            delivery_fee,
            couriers(
              id,
              full_name,
              phone
            )
          )
        `)
        .order('created_at', { ascending: false })

      // Tarih filtresi
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (dateFilter) {
        case 'today':
          query = query.gte('created_at', today.toISOString())
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          query = query.gte('created_at', weekAgo.toISOString())
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          query = query.gte('created_at', monthAgo.toISOString())
          break
      }

      const { data, error } = await query

      if (error) throw error

      // Veriyi formatla
      const formattedOrders: OrderDetails[] = (data || []).map(order => ({
        ...order,
        order_number: order.order_number || `ORD-${order.id.slice(-8).toUpperCase()}`,
        order_items: order.order_items || [],
        courier_assignment: order.delivery_assignments && order.delivery_assignments.length > 0 
          ? {
              id: order.delivery_assignments[0].id,
              courier_id: order.delivery_assignments[0].courier_id,
              courier_name: order.delivery_assignments[0].couriers?.full_name || '',
              courier_phone: order.delivery_assignments[0].couriers?.phone || '',
              status: order.delivery_assignments[0].status,
              assigned_at: order.delivery_assignments[0].assigned_at,
              estimated_delivery_time: order.delivery_assignments[0].estimated_delivery_time,
              delivery_fee: order.delivery_assignments[0].delivery_fee
            }
          : undefined
      }))

      setOrders(formattedOrders)

      // İstatistikleri hesapla
      const today_orders = formattedOrders.filter(order => 
        new Date(order.created_at) >= today
      )
      
      setStats({
        total_orders: formattedOrders.length,
        pending_orders: formattedOrders.filter(o => o.status === 'pending').length,
        active_orders: formattedOrders.filter(o => 
          ['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(o.status)
        ).length,
        completed_today: today_orders.filter(o => o.status === 'delivered').length,
        daily_revenue: today_orders
          .filter(o => o.status === 'delivered')
          .reduce((sum, o) => sum + o.total_amount, 0)
      })

    } catch (error) {
      console.error('Siparişler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }, [dateFilter])

  const fetchCouriers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('is_active', true)
        .order('full_name')

      if (error) throw error
      setCouriers(data || [])
    } catch (error) {
      console.error('Kuryeler yüklenemedi:', error)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, base_price, is_available, category_id, restaurant_id')
        .eq('is_available', true)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Ürünler yüklenemedi:', error)
    }
  }, [])

  // Filtreleme
  useEffect(() => {
    let filtered = [...orders]

    // Status filtresi
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_phone.includes(searchTerm) ||
        order.customer_address.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Ödeme filtresi
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.payment_method === paymentFilter)
    }

    setFilteredOrders(filtered)
    setCurrentPage(1)
  }, [orders, statusFilter, searchTerm, paymentFilter])

  // İlk yükleme
  useEffect(() => {
    fetchOrders()
    fetchCouriers()
    fetchProducts()
  }, [fetchOrders, fetchCouriers, fetchProducts])

  // Sipariş işlemleri
  const updateOrderStatus = async (orderId: string, newStatus: OrderDetails['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error
      
      // Eğer sipariş hazırlanıyor durumuna geçiyorsa kurye atama işlemini yap
      if (newStatus === 'preparing') {
        // AI kurye atama sistemini çağır
        try {
          const response = await fetch('/api/ai-courier-assignment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
          })
          
          const result = await response.json()
          if (result.success) {
            console.log('Otomatik kurye atama başarılı:', result.courier_name)
          }
        } catch (error) {
          console.error('Otomatik kurye atama hatası:', error)
        }
      }
      
      await fetchOrders()
      alert('Sipariş durumu güncellendi!')
    } catch (error) {
      console.error('Sipariş durumu güncellenemedi:', error)
      alert('Hata: Sipariş durumu güncellenemedi')
    }
  }

  const updatePaymentMethod = async (orderId: string, newMethod: OrderDetails['payment_method']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_method: newMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error
      
      await fetchOrders()
      alert('Ödeme yöntemi güncellendi!')
    } catch (error) {
      console.error('Ödeme yöntemi güncellenemedi:', error)
      alert('Hata: Ödeme yöntemi güncellenemedi')
    }
  }

  const updateAddress = async (orderId: string, newAddress: string, newLat?: number, newLng?: number) => {
    try {
      const updateData: any = {
        customer_address: newAddress,
        updated_at: new Date().toISOString()
      }
      
      if (newLat !== undefined && newLng !== undefined) {
        updateData.customer_address_lat = newLat
        updateData.customer_address_lng = newLng
        updateData.is_location_verified = true
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (error) throw error
      
      await fetchOrders()
      alert('Adres güncellendi!')
    } catch (error) {
      console.error('Adres güncellenemedi:', error)
      alert('Hata: Adres güncellenemedi')
    }
  }

  const assignCourier = async (orderId: string, courierId: string) => {
    try {
      // Önce mevcut atamaları kontrol et
      const { data: existingAssignment } = await supabase
        .from('delivery_assignments')
        .select('id')
        .eq('order_id', orderId)
        .not('status', 'eq', 'cancelled')
        .single()

      if (existingAssignment) {
        alert('Bu siparişe zaten kurye atanmış!')
        return
      }

      // Yeni atama oluştur
      const { error: assignError } = await supabase
        .from('delivery_assignments')
        .insert({
          order_id: orderId,
          courier_id: courierId,
          restaurant_id: selectedOrder?.restaurant_id || '',
          status: 'assigned',
          delivery_fee: 15, // Varsayılan ücret
          assigned_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      if (assignError) throw assignError

      // Sipariş durumunu güncelle
      await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId)

      await fetchOrders()
      alert('Kurye başarıyla atandı!')
    } catch (error) {
      console.error('Kurye atanamadı:', error)
      alert('Hata: Kurye atanamadı')
    }
  }

  const cancelOrder = async (orderId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      // Kurye ataması varsa iptal et
      await supabase
        .from('delivery_assignments')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
      
      await fetchOrders()
      alert('Sipariş iptal edildi!')
    } catch (error) {
      console.error('Sipariş iptal edilemedi:', error)
      alert('Hata: Sipariş iptal edilemedi')
    }
  }

  // Helper functions
  const getStatusColor = (status: OrderDetails['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-orange-100 text-orange-800'
      case 'ready_for_pickup': return 'bg-purple-100 text-purple-800'
      case 'out_for_delivery': return 'bg-indigo-100 text-indigo-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: OrderDetails['status']) => {
    switch (status) {
      case 'pending': return 'Bekliyor'
      case 'confirmed': return 'Onaylandı'
      case 'preparing': return 'Hazırlanıyor'
      case 'ready_for_pickup': return 'Hazır'
      case 'out_for_delivery': return 'Yolda'
      case 'delivered': return 'Teslim Edildi'
      case 'cancelled': return 'İptal Edildi'
      default: return 'Bilinmiyor'
    }
  }

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <BanknotesIcon className="h-4 w-4" />
      case 'card': return <CreditCardIcon className="h-4 w-4" />
      case 'online': return <CreditCardIcon className="h-4 w-4" />
      default: return <BanknotesIcon className="h-4 w-4" />
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Şimdi'
    if (diffMins < 60) return `${diffMins} dk önce`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} saat önce`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} gün önce`
  }

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage)
  const startIndex = (currentPage - 1) * ordersPerPage
  const endIndex = startIndex + ordersPerPage
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Siparişler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/company/dashboard')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sipariş Yönetimi</h1>
                <p className="text-gray-600">Tüm siparişleri görüntüle ve yönet</p>
              </div>
            </div>
            <button
              onClick={() => fetchOrders()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Yenile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardDocumentListIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Toplam Sipariş</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total_orders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Bekleyen</p>
                <p className="text-2xl font-semibold text-yellow-600">{stats.pending_orders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aktif</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.active_orders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Bugün Teslim</p>
                <p className="text-2xl font-semibold text-green-600">{stats.completed_today}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-8 w-8 text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Günlük Ciro</p>
                <p className="text-2xl font-semibold text-purple-600">₺{stats.daily_revenue.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            {/* Status Tabs */}
            <div className="flex flex-wrap space-x-1 mb-4">
              {statusTabs.map((tab) => (
                <button
                  key={tab.status}
                  onClick={() => setStatusFilter(tab.status)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    statusFilter === tab.status
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center space-x-4">
                {/* Search */}
                <div className="relative flex-1 max-w-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Sipariş no, müşteri adı, telefon veya adres ara..."
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Filtreler
                  {showFilters ? (
                    <XMarkIcon className="h-4 w-4 ml-2" />
                  ) : (
                    <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tarih</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="today">Bugün</option>
                      <option value="week">Son 7 Gün</option>
                      <option value="month">Son 30 Gün</option>
                      <option value="all">Tümü</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ödeme Yöntemi</label>
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="all">Tümü</option>
                      <option value="cash">Nakit</option>
                      <option value="card">Kart</option>
                      <option value="online">Online</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setDateFilter('today')
                        setPaymentFilter('all')
                        setStatusFilter('all')
                      }}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Filtreleri Temizle
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Siparişler ({filteredOrders.length})
            </h2>
          </div>

          <div className="overflow-hidden">
            {currentOrders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Sipariş bulunamadı</h3>
                <p className="mt-1 text-sm text-gray-500">Filtrelere uygun sipariş yok.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {currentOrders.map((order) => (
                  <div key={order.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {/* Order Header */}
                        <div className="flex items-center space-x-4 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">#{order.order_number}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                          <span className="text-sm text-gray-500">{getTimeAgo(order.created_at)}</span>
                        </div>

                        {/* Order Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Customer Info */}
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <UserIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">{order.customer_name}</span>
                            </div>
                            <div className="flex items-center space-x-2 mb-2">
                              <PhoneIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{order.customer_phone}</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm text-gray-600 line-clamp-2">{order.customer_address}</p>
                                {order.is_location_verified ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                    ✓ Konum Doğrulandı
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                                    ⚠ Konum Doğrulanmadı
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Sipariş İçeriği</h4>
                            <div className="space-y-1">
                              {order.order_items.slice(0, 3).map((item, index) => (
                                <div key={index} className="text-sm text-gray-600">
                                  {item.quantity}x {item.product_name}
                                </div>
                              ))}
                              {order.order_items.length > 3 && (
                                <div className="text-sm text-gray-400">
                                  +{order.order_items.length - 3} ürün daha
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Payment & Courier */}
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              {getPaymentIcon(order.payment_method)}
                              <span className="text-sm font-medium text-gray-900">₺{order.total_amount.toFixed(2)}</span>
                              <span className="text-sm text-gray-500">
                                ({order.payment_method === 'cash' ? 'Nakit' : order.payment_method === 'card' ? 'Kart' : 'Online'})
                              </span>
                            </div>
                            
                            {order.courier_assignment && (
                              <div className="flex items-center space-x-2">
                                <TruckIcon className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-sm text-gray-900">{order.courier_assignment.courier_name}</p>
                                  <p className="text-xs text-gray-500">{order.courier_assignment.courier_phone}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col space-y-2 ml-6">
                        <button
                          onClick={() => {
                            setSelectedOrder(order)
                            setModalAction('view')
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-3 w-3 mr-1" />
                          Görüntüle
                        </button>

                        {(order.status === 'pending' || order.status === 'confirmed') && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedOrder(order)
                                setModalAction('edit_order')
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                            >
                              <PencilIcon className="h-3 w-3 mr-1" />
                              Düzenle
                            </button>

                            <button
                              onClick={() => {
                                setSelectedOrder(order)
                                setModalAction('edit_payment')
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <CreditCardIcon className="h-3 w-3 mr-1" />
                              Ödeme
                            </button>

                            <button
                              onClick={() => {
                                setSelectedOrder(order)
                                setModalAction('edit_address')
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <MapPinIcon className="h-3 w-3 mr-1" />
                              Adres
                            </button>

                            {!order.courier_assignment && (
                              <button
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setModalAction('assign_courier')
                                }}
                                className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                              >
                                <TruckIcon className="h-3 w-3 mr-1" />
                                Kurye Ata
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedOrder(order)
                                setModalAction('cancel')
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                            >
                              <XCircleIcon className="h-3 w-3 mr-1" />
                              İptal Et
                            </button>
                          </>
                        )}

                        {['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status) && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order)
                              setModalAction('update_status')
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                          >
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Durum
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Önceki
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Sonraki
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, filteredOrders.length)}</span> arası,
                    toplam <span className="font-medium">{filteredOrders.length}</span> sipariş
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Önceki
                    </button>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber
                      if (totalPages <= 5) {
                        pageNumber = i + 1
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i
                      } else {
                        pageNumber = currentPage - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNumber
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      )
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Sonraki
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Action Modal */}
      <OrderActionModal
        isOpen={modalAction !== null}
        onClose={() => {
          setModalAction(null)
          setSelectedOrder(null)
        }}
        order={selectedOrder}
        action={modalAction || 'view'}
        onUpdate={fetchOrders}
        couriers={couriers}
        products={products}
        onUpdateStatus={updateOrderStatus}
        onUpdatePayment={updatePaymentMethod}
        onUpdateAddress={updateAddress}
        onAssignCourier={assignCourier}
        onCancelOrder={cancelOrder}
      />
    </div>
  )
}

// Order Action Modal Component
interface OrderActionModalPropsExtended extends OrderActionModalProps {
  couriers: Courier[]
  products: Product[]
  onUpdateStatus: (orderId: string, status: OrderDetails['status']) => Promise<void>
  onUpdatePayment: (orderId: string, method: OrderDetails['payment_method']) => Promise<void>
  onUpdateAddress: (orderId: string, address: string, lat?: number, lng?: number) => Promise<void>
  onAssignCourier: (orderId: string, courierId: string) => Promise<void>
  onCancelOrder: (orderId: string, reason: string) => Promise<void>
}

function OrderActionModal({ 
  isOpen, 
  onClose, 
  order, 
  action, 
  onUpdate,
  couriers,
  products,
  onUpdateStatus,
  onUpdatePayment,
  onUpdateAddress,
  onAssignCourier,
  onCancelOrder
}: OrderActionModalPropsExtended) {
  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [editOrderData, setEditOrderData] = useState<{
    customer_name: string
    customer_phone: string
    customer_address: string
    delivery_fee: number
    tax_amount: number
    discount_amount: number
    notes: string
    order_items: OrderItem[]
  }>({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    delivery_fee: 0,
    tax_amount: 0,
    discount_amount: 0,
    notes: '',
    order_items: []
  })

  useEffect(() => {
    if (order && isOpen) {
      setFormData({
        status: order.status,
        payment_method: order.payment_method,
        address: order.customer_address,
        courier_id: '',
        cancel_reason: ''
      })

      if (action === 'edit_order') {
        setEditOrderData({
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_address: order.customer_address,
          delivery_fee: order.delivery_fee,
          tax_amount: order.tax_amount,
          discount_amount: order.discount_amount,
          notes: order.notes || '',
          order_items: [...order.order_items]
        })
      }
    }
  }, [order, isOpen, action])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return

    setLoading(true)
    try {
      switch (action) {
        case 'update_status':
          await onUpdateStatus(order.id, formData.status)
          break
        case 'edit_payment':
          await onUpdatePayment(order.id, formData.payment_method)
          break
        case 'edit_address':
          await onUpdateAddress(order.id, formData.address)
          break
        case 'assign_courier':
          await onAssignCourier(order.id, formData.courier_id)
          break
        case 'cancel':
          await onCancelOrder(order.id, formData.cancel_reason)
          break
        case 'edit_order':
          await handleOrderEdit()
          break
      }
      onClose()
      onUpdate()
    } catch (error) {
      console.error('Modal action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderEdit = async () => {
    if (!order) return

    try {
      // Sipariş temel bilgilerini güncelle
      const subtotal = editOrderData.order_items.reduce((sum, item) => sum + item.total_price, 0)
      const total_amount = subtotal + editOrderData.delivery_fee + editOrderData.tax_amount - editOrderData.discount_amount

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_name: editOrderData.customer_name,
          customer_phone: editOrderData.customer_phone,
          customer_address: editOrderData.customer_address,
          delivery_fee: editOrderData.delivery_fee,
          tax_amount: editOrderData.tax_amount,
          discount_amount: editOrderData.discount_amount,
          subtotal: subtotal,
          total_amount: total_amount,
          notes: editOrderData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (orderError) throw orderError

      // Mevcut sipariş ürünlerini sil
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', order.id)

      if (deleteError) throw deleteError

      // Yeni sipariş ürünlerini ekle
      if (editOrderData.order_items.length > 0) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(
            editOrderData.order_items.map(item => ({
              order_id: order.id,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              special_instructions: item.special_instructions
            }))
          )

        if (itemsError) throw itemsError
      }

      alert('Sipariş başarıyla güncellendi!')
    } catch (error) {
      console.error('Sipariş güncellenirken hata:', error)
      alert('Hata: Sipariş güncellenemedi')
      throw error
    }
  }

  const addOrderItem = () => {
    setEditOrderData(prev => ({
      ...prev,
      order_items: [...prev.order_items, {
        id: `temp-${Date.now()}`,
        product_id: '',
        product_name: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        special_instructions: null
      }]
    }))
  }

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    setEditOrderData(prev => {
      const newItems = [...prev.order_items]
      newItems[index] = { ...newItems[index], [field]: value }
      
      if (field === 'quantity' || field === 'unit_price') {
        newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price
      }
      
      if (field === 'product_id' && value) {
        const product = products.find(p => p.id === value)
        if (product) {
          newItems[index].product_name = product.name
          newItems[index].unit_price = product.base_price
          newItems[index].total_price = newItems[index].quantity * product.base_price
        }
      }
      
      return { ...prev, order_items: newItems }
    })
  }

  const removeOrderItem = (index: number) => {
    setEditOrderData(prev => ({
      ...prev,
      order_items: prev.order_items.filter((_, i) => i !== index)
    }))
  }

  const calculateTotals = () => {
    const subtotal = editOrderData.order_items.reduce((sum, item) => sum + item.total_price, 0)
    const total = subtotal + editOrderData.delivery_fee + editOrderData.tax_amount - editOrderData.discount_amount
    return { subtotal, total }
  }

  if (!isOpen || !order) return null

  const getModalTitle = () => {
    switch (action) {
      case 'view': return `Sipariş Detayları - #${order.order_number}`
      case 'edit_order': return `Sipariş Düzenle - #${order.order_number}`
      case 'update_status': return 'Sipariş Durumu Güncelle'
      case 'edit_payment': return 'Ödeme Yöntemi Değiştir'
      case 'edit_address': return 'Adres Düzenle'
      case 'assign_courier': return 'Kurye Ata'
      case 'cancel': return 'Sipariş İptal Et'
      default: return 'Sipariş İşlemi'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${action === 'edit_order' ? 'sm:max-w-6xl' : 'sm:max-w-lg'} sm:w-full`}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {getModalTitle()}
                </h3>

                {action === 'view' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Müşteri</p>
                        <p className="text-sm text-gray-900">{order.customer_name}</p>
                        <p className="text-sm text-gray-600">{order.customer_phone}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Toplam Tutar</p>
                        <p className="text-sm text-gray-900">₺{order.total_amount.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Adres</p>
                      <p className="text-sm text-gray-900">{order.customer_address}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">Sipariş İçeriği</p>
                      <div className="mt-2 space-y-1">
                        {order.order_items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.product_name}</span>
                            <span>₺{item.total_price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.courier_assignment && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Kurye</p>
                        <p className="text-sm text-gray-900">{order.courier_assignment.courier_name}</p>
                        <p className="text-sm text-gray-600">{order.courier_assignment.courier_phone}</p>
                      </div>
                    )}
                  </div>
                )}

                {action === 'edit_order' && (
                  <div className="space-y-6">
                    {/* Müşteri Bilgileri */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Müşteri Adı</label>
                        <input
                          type="text"
                          value={editOrderData.customer_name}
                          onChange={(e) => setEditOrderData(prev => ({ ...prev, customer_name: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Telefon</label>
                        <input
                          type="text"
                          value={editOrderData.customer_phone}
                          onChange={(e) => setEditOrderData(prev => ({ ...prev, customer_phone: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Adres</label>
                        <input
                          type="text"
                          value={editOrderData.customer_address}
                          onChange={(e) => setEditOrderData(prev => ({ ...prev, customer_address: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Sipariş Ürünleri */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-medium text-gray-700">Sipariş Ürünleri</label>
                        <button
                          type="button"
                          onClick={addOrderItem}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Ürün Ekle
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {editOrderData.order_items.map((item, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                              <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-700">Ürün</label>
                                <select
                                  value={item.product_id}
                                  onChange={(e) => updateOrderItem(index, 'product_id', e.target.value)}
                                  className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Ürün seçin</option>
                                  {products.map(product => (
                                    <option key={product.id} value={product.id}>
                                      {product.name} - ₺{product.base_price}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Adet</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Birim Fiyat</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Toplam</label>
                                <input
                                  type="text"
                                  value={`₺${item.total_price.toFixed(2)}`}
                                  readOnly
                                  className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-sm bg-gray-50"
                                />
                              </div>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => removeOrderItem(index)}
                                  className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                                >
                                  <TrashIcon className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-2">
                              <label className="block text-xs font-medium text-gray-700">Özel Not</label>
                              <input
                                type="text"
                                value={item.special_instructions || ''}
                                onChange={(e) => updateOrderItem(index, 'special_instructions', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Özel talimatlar..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ücret Detayları */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Teslimat Ücreti</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editOrderData.delivery_fee}
                          onChange={(e) => setEditOrderData(prev => ({ ...prev, delivery_fee: parseFloat(e.target.value) || 0 }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Vergi</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editOrderData.tax_amount}
                          onChange={(e) => setEditOrderData(prev => ({ ...prev, tax_amount: parseFloat(e.target.value) || 0 }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">İndirim</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editOrderData.discount_amount}
                          onChange={(e) => setEditOrderData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Genel Toplam</label>
                        <input
                          type="text"
                          value={`₺${calculateTotals().total.toFixed(2)}`}
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 font-semibold text-lg"
                        />
                      </div>
                    </div>

                    {/* Not */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sipariş Notu</label>
                      <textarea
                        value={editOrderData.notes}
                        onChange={(e) => setEditOrderData(prev => ({ ...prev, notes: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Sipariş ile ilgili notlar..."
                      />
                    </div>
                  </div>
                )}

                {action !== 'view' && action !== 'edit_order' && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {action === 'update_status' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Yeni Durum</label>
                        <select
                          value={formData.status || ''}
                          onChange={(e) => setFormData({...formData, status: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="confirmed">Onaylandı</option>
                          <option value="preparing">Hazırlanıyor</option>
                          <option value="ready_for_pickup">Hazır</option>
                          <option value="out_for_delivery">Yolda</option>
                          <option value="delivered">Teslim Edildi</option>
                        </select>
                      </div>
                    )}

                    {action === 'edit_payment' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Ödeme Yöntemi</label>
                        <select
                          value={formData.payment_method || ''}
                          onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="cash">Nakit</option>
                          <option value="card">Kart</option>
                          <option value="online">Online</option>
                        </select>
                      </div>
                    )}

                    {action === 'edit_address' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Yeni Adres</label>
                        <textarea
                          value={formData.address || ''}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                          required
                        />
                      </div>
                    )}

                    {action === 'assign_courier' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Kurye Seç</label>
                        <select
                          value={formData.courier_id || ''}
                          onChange={(e) => setFormData({...formData, courier_id: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Kurye seçin</option>
                          {couriers.filter(c => c.is_available).map(courier => (
                            <option key={courier.id} value={courier.id}>
                              {courier.full_name} - {courier.vehicle_type}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {action === 'cancel' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">İptal Nedeni</label>
                        <textarea
                          value={formData.cancel_reason || ''}
                          onChange={(e) => setFormData({...formData, cancel_reason: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                          placeholder="İptal nedenini açıklayın..."
                          required
                        />
                      </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'İşleniyor...' : 'Kaydet'}
                      </button>
                    </div>
                  </form>
                )}

                {action === 'edit_order' && (
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? 'İşleniyor...' : 'Siparişi Güncelle'}
                    </button>
                  </div>
                )}

                {action === 'view' && (
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Kapat
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 