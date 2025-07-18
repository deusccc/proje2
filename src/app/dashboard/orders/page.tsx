'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { useRouter } from 'next/navigation'
import { Order } from '@/types/index'
import { User } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import NewOrderModal from '@/components/NewOrderModal'
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'

const statusTabs = [
  { name: 'Onay Bekleyenler', status: 'pending' as const },
  { name: 'Hazırlananlar', status: 'preparing' as const },
  { name: 'Teslime Hazır', status: 'ready_for_pickup' as const },
  { name: 'Yolda', status: 'out_for_delivery' as const },
  { name: 'Teslim Edilenler', status: 'delivered' as const },
  { name: 'İptaller', status: 'cancelled' as const },
  { name: 'Tümü', status: 'all' as const },
]

interface Filters {
  searchTerm: string
  startDate: string
  endDate: string
  minAmount: string
  maxAmount: string
  paymentMethod: string
  showFilters: boolean
}

export default function OrdersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('pending')
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    paymentMethod: '',
    showFilters: false
  })
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const currentUser = await getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        await fetchOrders(statusFilter, currentUser)
      } else {
        router.push('/login')
      }
      setLoading(false)
    }
    init()
  }, [])
  
  const fetchOrders = useCallback(async (status: Order['status'] | 'all', currentUser: User) => {
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
          setOrders([])
          setFilteredOrders([])
          setLoading(false)
          return
        }
        restaurantId = firstRestaurant.id
      }

      // İlk olarak siparişleri al
      let query = supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: ordersData, error: ordersError } = await query;
      
      if (ordersError) {
        throw ordersError;
      }

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setFilteredOrders([]);
        setLoading(false);
        return;
      }

      // Sipariş ID'lerini al
      const orderIds = ordersData.map(order => order.id);

      // Order items'ları ayrı olarak al
      const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('id, order_id, product_name, quantity')
        .in('order_id', orderIds);

      if (itemsError) {
        console.warn('Order items alınırken hata:', itemsError);
        // Order items alamasak bile siparişleri göster
      }

      // Siparişleri order items ile birleştir
      const ordersWithItems = ordersData.map(order => ({
        ...order,
        order_number: `ORD-${order.id.slice(-8).toUpperCase()}`, // ID'nin son 8 karakterini kullan
        order_items: orderItemsData?.filter(item => item.order_id === order.id) || []
      }));

      setOrders(ordersWithItems);
      setFilteredOrders(ordersWithItems);
    } catch (error) {
      console.error('Siparişler getirilirken hata oluştu:', error);
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  }, [])

  useEffect(() => {
    const handleOrdersUpdate = () => {
      if(user) fetchOrders(statusFilter, user);
    }
    window.addEventListener('orders-updated', handleOrdersUpdate);
    return () => {
      window.removeEventListener('orders-updated', handleOrdersUpdate);
    };
  }, [statusFilter, user, fetchOrders]);

  // Real-time subscription ekle
  useEffect(() => {
    if (!user) return

    const subscription = supabase
      .channel('orders-page')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          // Kullanıcının restoranına ait sipariş mi kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            fetchOrders(statusFilter, user)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          // Kullanıcının restoranına ait sipariş mi kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            fetchOrders(statusFilter, user)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          // Kullanıcının restoranına ait sipariş mi kontrol et
          if (payload.old.restaurant_id === user.restaurant_id) {
            fetchOrders(statusFilter, user)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items' },
        (payload) => {
          fetchOrders(statusFilter, user)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_items' },
        (payload) => {
          fetchOrders(statusFilter, user)
        }
      )
      .subscribe()

    // 4 saniyede bir otomatik güncelleme
    const autoRefreshInterval = setInterval(() => {
      fetchOrders(statusFilter, user)
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearInterval(autoRefreshInterval)
    }
  }, [user, statusFilter, fetchOrders])

  // Filtreleme fonksiyonu
  useEffect(() => {
    let filtered = [...orders];

    // Arama terimi filtreleme
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.customer_name.toLowerCase().includes(searchLower) ||
        (order.order_number && order.order_number.toLowerCase().includes(searchLower)) ||
        order.customer_phone?.includes(searchLower)
      );
    }

    // Tarih aralığı filtreleme
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(order => 
        new Date(order.created_at) >= startDate
      );
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // Günün sonuna kadar
      filtered = filtered.filter(order => 
        new Date(order.created_at) <= endDate
      );
    }

    // Tutar aralığı filtreleme
    if (filters.minAmount) {
      const minAmount = parseFloat(filters.minAmount);
      filtered = filtered.filter(order => 
        order.total_amount >= minAmount
      );
    }

    if (filters.maxAmount) {
      const maxAmount = parseFloat(filters.maxAmount);
      filtered = filtered.filter(order => 
        order.total_amount <= maxAmount
      );
    }

    // Ödeme yöntemi filtreleme
    if (filters.paymentMethod) {
      filtered = filtered.filter(order => 
        order.payment_method === filters.paymentMethod
      );
    }

    setFilteredOrders(filtered);
  }, [orders, filters]);

  const handleStatusFilterChange = (newStatus: Order['status'] | 'all') => {
    setStatusFilter(newStatus)
    if (user) {
      fetchOrders(newStatus, user)
    }
  }

  const handleOrderCreated = () => {
    setIsNewOrderModalOpen(false)
    handleStatusFilterChange('pending')
  }

  const handleRowClick = (orderId: string) => {
    router.push(`/dashboard/orders/${orderId}`);
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      paymentMethod: '',
      showFilters: false
    });
  };

  const hasActiveFilters = () => {
    return filters.searchTerm || filters.startDate || filters.endDate || 
           filters.minAmount || filters.maxAmount || filters.paymentMethod;
  };

  const getStatusDisplay = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Onay Bekliyor';
      case 'confirmed': return 'Onaylandı';
      case 'preparing': return 'Hazırlanıyor';
      case 'ready_for_pickup': return 'Hazır';
      case 'out_for_delivery': return 'Yolda';
      case 'delivered': return 'Teslim Edildi';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready_for_pickup': return 'bg-green-100 text-green-800';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout 
      user={user}
      onSignOut={() => supabase.auth.signOut()}
      allowedRoles={['admin', 'manager', 'staff']}
    >
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
                <p className="text-gray-600">Restoranınızın tüm siparişlerini yönetin</p>
              </div>
              <button
                onClick={() => setIsNewOrderModalOpen(true)}
                className="mt-4 sm:mt-0 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                Yeni Sipariş
              </button>
            </div>
          </div>

          {/* Filtreler */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Müşteri adı, sipariş no veya telefon ara..."
                      value={filters.searchTerm}
                      onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  <button
                    onClick={() => setFilters({...filters, showFilters: !filters.showFilters})}
                    className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      hasActiveFilters() ? 'ring-2 ring-primary-500' : ''
                    }`}
                  >
                    <FunnelIcon className="h-4 w-4 mr-2" />
                    Filtreler
                    {hasActiveFilters() && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        Aktif
                      </span>
                    )}
                  </button>
                  {hasActiveFilters() && (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <XMarkIcon className="h-4 w-4 mr-2" />
                      Temizle
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {filteredOrders.length} sipariş bulundu
                </div>
              </div>
            </div>

            {/* Gelişmiş Filtreler */}
            {filters.showFilters && (
              <div className="p-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Tarih Aralığı */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bitiş Tarihi
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  {/* Tutar Aralığı */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Tutar (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={filters.minAmount}
                      onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Tutar (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="1000.00"
                      value={filters.maxAmount}
                      onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  {/* Ödeme Yöntemi */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ödeme Yöntemi
                    </label>
                    <select
                      value={filters.paymentMethod}
                      onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Tümü</option>
                      <option value="cash">Nakit</option>
                      <option value="card">Kart</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.name}
                    onClick={() => handleStatusFilterChange(tab.status)}
                    className={`${
                      tab.status === statusFilter
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sipariş No</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teslimat Adresi</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ödeme</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-4">Yükleniyor...</td></tr>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.id} onClick={() => handleRowClick(order.id.toString())} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                          <div className="text-sm text-gray-500">{order.customer_phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={order.customer_address}>
                          {order.customer_address}
                        </div>
                        <div className="mt-1">
                          {order.is_location_verified ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              ✓ Konum Doğrulandı
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              ⚠ Konum Doğrulanmadı
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('tr-TR')}
                        <br />
                        <span className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₺{order.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                          order.payment_method === 'card' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.payment_method === 'cash' ? 'Nakit' :
                           order.payment_method === 'card' ? 'Kart' : order.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusDisplay(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="text-center py-4">Bu filtreye uygun sipariş bulunamadı.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NewOrderModal 
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onOrderCreated={handleOrderCreated}
      />
    </DashboardLayout>
  )
} 