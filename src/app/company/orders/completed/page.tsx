'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/index'
import { 
  CheckCircleIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ClockIcon,
  TruckIcon,
  MapPinIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface CompletedOrder {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_address: string
  restaurant_name: string
  total_amount: number
  delivery_fee: number
  payment_method: string
  status: string
  created_at: string
  delivered_at: string
  courier_name: string
  courier_phone: string
  delivery_time_minutes: number
  rating: number
  customer_notes: string
}

interface Stats {
  total_completed: number
  total_revenue: number
  avg_delivery_time: number
  avg_rating: number
}

export default function CompletedOrdersPage() {
  const router = useRouter()
  
  // Data states
  const [orders, setOrders] = useState<CompletedOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<CompletedOrder[]>([])
  const [stats, setStats] = useState<Stats>({
    total_completed: 0,
    total_revenue: 0,
    avg_delivery_time: 0,
    avg_rating: 0
  })
  
  // UI states
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('today') // today, week, month, all
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [courierFilter, setCourierFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('delivered_at') // delivered_at, total_amount, delivery_time
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const ordersPerPage = 20

  // Teslim edilen siparişleri yükle
  const fetchCompletedOrders = useCallback(async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          customer_address,
          total_amount,
          delivery_fee,
          payment_method,
          status,
          created_at,
          delivered_at,
          customer_notes,
          restaurants!inner(name),
          delivery_assignments!inner(
            courier_id,
            delivery_time_minutes,
            rating,
            couriers!inner(
              full_name,
              phone
            )
          )
        `)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })

      // Tarih filtresi
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (dateFilter) {
        case 'today':
          query = query.gte('delivered_at', today.toISOString())
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          query = query.gte('delivered_at', weekAgo.toISOString())
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          query = query.gte('delivered_at', monthAgo.toISOString())
          break
        case 'all':
        default:
          // Tüm kayıtlar
          break
      }

      const { data, error } = await query

      if (error) throw error

      // Veriyi düzenle
      const formattedOrders: CompletedOrder[] = (data || []).map(order => {
        const restaurant = Array.isArray(order.restaurants) ? order.restaurants[0] : order.restaurants
        const assignment = Array.isArray(order.delivery_assignments) ? order.delivery_assignments[0] : order.delivery_assignments
        const courier = assignment?.couriers && Array.isArray(assignment.couriers) ? assignment.couriers[0] : assignment?.couriers

        return {
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_address: order.customer_address,
          restaurant_name: restaurant?.name || '',
          total_amount: order.total_amount,
          delivery_fee: order.delivery_fee || 0,
          payment_method: order.payment_method,
          status: order.status,
          created_at: order.created_at,
          delivered_at: order.delivered_at,
          courier_name: (courier as any)?.full_name || '',
          courier_phone: (courier as any)?.phone || '',
          delivery_time_minutes: assignment?.delivery_time_minutes || 0,
          rating: assignment?.rating || 0,
          customer_notes: order.customer_notes || ''
        }
      })

      setOrders(formattedOrders)
      
      // İstatistikleri hesapla
      const totalRevenue = formattedOrders.reduce((sum, order) => sum + order.total_amount, 0)
      const avgDeliveryTime = formattedOrders.length > 0 
        ? formattedOrders.reduce((sum, order) => sum + order.delivery_time_minutes, 0) / formattedOrders.length 
        : 0
      const avgRating = formattedOrders.length > 0
        ? formattedOrders.reduce((sum, order) => sum + order.rating, 0) / formattedOrders.length
        : 0

      setStats({
        total_completed: formattedOrders.length,
        total_revenue: totalRevenue,
        avg_delivery_time: Math.round(avgDeliveryTime),
        avg_rating: Math.round(avgRating * 10) / 10
      })

    } catch (error) {
      console.error('Teslim edilen siparişler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }, [dateFilter])

  // Filtreleme ve arama
  useEffect(() => {
    let filtered = [...orders]

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.courier_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Ödeme yöntemi filtresi
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.payment_method === paymentFilter)
    }

    // Kurye filtresi
    if (courierFilter !== 'all') {
      filtered = filtered.filter(order => order.courier_name === courierFilter)
    }

    // Sıralama
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof CompletedOrder]
      let bValue: any = b[sortBy as keyof CompletedOrder]

      if (sortBy === 'delivered_at' || sortBy === 'created_at') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredOrders(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }, [orders, searchTerm, paymentFilter, courierFilter, sortBy, sortOrder])

  // İlk yükleme
  useEffect(() => {
    fetchCompletedOrders()
  }, [fetchCompletedOrders])

  // Unique courier names for filter
  const uniqueCouriers = Array.from(new Set(orders.map(order => order.courier_name))).filter(Boolean)

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage)
  const startIndex = (currentPage - 1) * ordersPerPage
  const endIndex = startIndex + ordersPerPage
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
    
    if (diffDays === 0) return 'Bugün'
    if (diffDays === 1) return 'Dün'
    if (diffDays < 7) return `${diffDays} gün önce`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`
    return `${Math.floor(diffDays / 30)} ay önce`
  }

  const getDeliveryTimeColor = (minutes: number) => {
    if (minutes <= 20) return 'text-green-600'
    if (minutes <= 35) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 3.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Teslim edilen siparişler yükleniyor...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Teslim Edilen Siparişler</h1>
                <p className="text-gray-600">Tamamlanan siparişler ve istatistikler</p>
              </div>
            </div>
            <button
              onClick={() => fetchCompletedOrders()}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Toplam Teslim</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_completed}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Toplam Ciro</dt>
                  <dd className="text-lg font-medium text-gray-900">₺{stats.total_revenue.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ort. Teslimat</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.avg_delivery_time} dk</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ort. Puan</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.avg_rating}/5</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Arama ve Filtreler */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Arama */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Sipariş no, müşteri, restoran, kurye ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filtre Toggle ve Sıralama */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filtreler
              </button>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field)
                  setSortOrder(order as 'asc' | 'desc')
                }}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="delivered_at-desc">En Son Teslim</option>
                <option value="delivered_at-asc">En Eski Teslim</option>
                <option value="total_amount-desc">En Yüksek Tutar</option>
                <option value="total_amount-asc">En Düşük Tutar</option>
                <option value="delivery_time_minutes-asc">En Hızlı Teslimat</option>
                <option value="delivery_time_minutes-desc">En Yavaş Teslimat</option>
              </select>
            </div>
          </div>

          {/* Genişletilmiş Filtreler */}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kurye</label>
                  <select
                    value={courierFilter}
                    onChange={(e) => setCourierFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="all">Tüm Kuryeler</option>
                    {uniqueCouriers.map(courier => (
                      <option key={courier} value={courier}>{courier}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sipariş Listesi */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Sipariş Listesi ({filteredOrders.length})
              </h3>
              <div className="text-sm text-gray-500">
                {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} / {filteredOrders.length}
              </div>
            </div>

            {/* Sipariş Kartları */}
            <div className="space-y-4">
              {currentOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Sipariş Bilgileri */}
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg font-semibold text-gray-900">#{order.order_number}</span>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Teslim Edildi
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{order.customer_name}</p>
                        <p className="text-xs text-gray-500">{order.customer_phone}</p>
                        <p className="text-xs text-gray-400 mt-1">{getTimeAgo(order.delivered_at)}</p>
                      </div>

                      {/* Restoran ve Adres */}
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">{order.restaurant_name}</p>
                        <p className="text-xs text-gray-600 line-clamp-2">{order.customer_address}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(order.delivered_at), 'dd MMM, HH:mm', { locale: tr })}
                        </p>
                      </div>

                      {/* Kurye ve Performans */}
                      <div>
                        <div className="flex items-center space-x-1 mb-1">
                          <TruckIcon className="h-4 w-4 text-gray-400" />
                          <p className="text-sm text-gray-900">{order.courier_name}</p>
                        </div>
                        <p className="text-xs text-gray-500">{order.courier_phone}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs font-medium ${getDeliveryTimeColor(order.delivery_time_minutes)}`}>
                            {order.delivery_time_minutes} dk
                          </span>
                          {order.rating > 0 && (
                            <span className={`text-xs font-medium ${getRatingColor(order.rating)}`}>
                              ⭐ {order.rating}/5
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tutar ve Ödeme */}
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">₺{order.total_amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">
                          {order.payment_method === 'cash' && 'Nakit'}
                          {order.payment_method === 'card' && 'Kart'}
                          {order.payment_method === 'online' && 'Online'}
                        </p>
                        {order.delivery_fee > 0 && (
                          <p className="text-xs text-gray-400">+₺{order.delivery_fee} teslimat</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Müşteri Notları */}
                  {order.customer_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Not:</span> {order.customer_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {currentOrders.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Sipariş bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Arama kriterlerinize uygun teslim edilmiş sipariş bulunmuyor.
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sonraki
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, filteredOrders.length)}</span> arası, 
                      toplam <span className="font-medium">{filteredOrders.length}</span> sonuç
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Önceki</span>
                        <ChevronDownIcon className="h-5 w-5 rotate-90" aria-hidden="true" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNum === currentPage
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Sonraki</span>
                        <ChevronDownIcon className="h-5 w-5 -rotate-90" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 