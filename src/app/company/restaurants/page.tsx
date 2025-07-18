'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/index'
import { 
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import RestaurantFormModal from '@/components/RestaurantFormModal'

interface Restaurant {
  id: string
  name: string
  address?: string
  detailed_address?: string
  phone?: string
  email?: string
  city?: string
  district?: string
  neighborhood?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface RestaurantStats {
  total_orders: number
  daily_orders: number
  daily_revenue: number
  active_orders: number
  total_users: number
}

export default function RestaurantsPage() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [restaurantStats, setRestaurantStats] = useState<Record<string, RestaurantStats>>({})
  const [loading, setLoading] = useState(true)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Restoranları getir
  const fetchRestaurants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRestaurants(data || [])

      // Her restoran için istatistikleri al
      if (data && data.length > 0) {
        const statsPromises = data.map(restaurant => fetchRestaurantStats(restaurant.id))
        const stats = await Promise.all(statsPromises)
        
        const statsMap: Record<string, RestaurantStats> = {}
        data.forEach((restaurant, index) => {
          statsMap[restaurant.id] = stats[index]
        })
        setRestaurantStats(statsMap)
      }
    } catch (error) {
      console.error('Restoranlar getirilemedi:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Restoran istatistiklerini getir
  const fetchRestaurantStats = async (restaurantId: string): Promise<RestaurantStats> => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Toplam sipariş sayısı
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)

      // Bugünkü siparişler
      const { count: dailyOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('created_at', `${today}T00:00:00.000Z`)

      // Bugünkü ciro
      const { data: dailyOrdersData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', restaurantId)
        .eq('payment_status', 'paid')
        .gte('created_at', `${today}T00:00:00.000Z`)

      const dailyRevenue = dailyOrdersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      // Aktif siparişler
      const { count: activeOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'])

      // Kullanıcı sayısı
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)

      return {
        total_orders: totalOrders || 0,
        daily_orders: dailyOrders || 0,
        daily_revenue: dailyRevenue,
        active_orders: activeOrders || 0,
        total_users: totalUsers || 0
      }
    } catch (error) {
      console.error('Restoran istatistikleri alınamadı:', error)
      return {
        total_orders: 0,
        daily_orders: 0,
        daily_revenue: 0,
        active_orders: 0,
        total_users: 0
      }
    }
  }

  // Restoran durumunu değiştir
  const toggleRestaurantStatus = async (restaurantId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', restaurantId)

      if (error) throw error

      // Yerel state'i güncelle
      setRestaurants(prev => prev.map(restaurant => 
        restaurant.id === restaurantId 
          ? { ...restaurant, is_active: !currentStatus }
          : restaurant
      ))

      alert(currentStatus ? 'Restoran pasif hale getirildi' : 'Restoran aktif hale getirildi')
    } catch (error) {
      console.error('Restoran durumu güncellenemedi:', error)
      alert('Hata: Restoran durumu güncellenemedi')
    }
  }

  // Restoran sil
  const deleteRestaurant = async (restaurantId: string, restaurantName: string) => {
    if (!confirm(`"${restaurantName}" restoranını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId)

      if (error) throw error

      // Yerel state'i güncelle
      setRestaurants(prev => prev.filter(restaurant => restaurant.id !== restaurantId))
      alert('Restoran başarıyla silindi')
    } catch (error) {
      console.error('Restoran silinemedi:', error)
      alert('Hata: Restoran silinemedi')
    }
  }

  // Modal açma/kapama
  const openCreateModal = () => {
    setSelectedRestaurant(null)
    setIsCreating(true)
    setIsModalOpen(true)
  }

  const openEditModal = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setIsCreating(false)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedRestaurant(null)
    setIsCreating(false)
  }

  // Restoran ekleme/güncelleme başarılı olduğunda
  const handleRestaurantSaved = () => {
    fetchRestaurants()
    closeModal()
  }

  // Filtreleme
  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.district?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sayfa yüklendiğinde
  useEffect(() => {
    fetchRestaurants()
  }, [fetchRestaurants])

  // Real-time güncellemeler
  useEffect(() => {
    const subscription = supabase
      .channel('restaurants-management')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'restaurants' },
        () => fetchRestaurants()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurants' },
        () => fetchRestaurants()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'restaurants' },
        () => fetchRestaurants()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchRestaurants])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Restoranlar yükleniyor...</p>
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
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Restoran Yönetimi</h1>
                <p className="text-gray-600">Restoranları görüntüle, ekle ve yönet</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Yeni Restoran</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Arama ve Filtreler */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Restoran adı, şehir veya ilçe ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-500">
                <BuildingStorefrontIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Restoran</p>
                <p className="text-2xl font-bold text-gray-900">{restaurants.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-500">
                <EyeIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktif Restoran</p>
                <p className="text-2xl font-bold text-gray-900">
                  {restaurants.filter(r => r.is_active).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-500">
                <EyeSlashIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pasif Restoran</p>
                <p className="text-2xl font-bold text-gray-900">
                  {restaurants.filter(r => !r.is_active).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-500">
                <MapPinIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Konum Bilgili</p>
                <p className="text-2xl font-bold text-gray-900">
                  {restaurants.filter(r => r.latitude && r.longitude).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Restoran Listesi */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Restoranlar ({filteredRestaurants.length})
            </h2>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-12">
              <BuildingStorefrontIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Restoran bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Arama kriterlerine uygun restoran yok.' : 'Henüz restoran eklenmemiş.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={openCreateModal}
                  className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  İlk Restoranı Ekle
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Restoran
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İletişim
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Konum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İstatistikler
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRestaurants.map((restaurant) => {
                    const stats = restaurantStats[restaurant.id] || {
                      total_orders: 0,
                      daily_orders: 0,
                      daily_revenue: 0,
                      active_orders: 0,
                      total_users: 0
                    }

                    return (
                      <tr key={restaurant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12">
                              <div className="h-12 w-12 rounded-lg bg-blue-500 flex items-center justify-center">
                                <BuildingStorefrontIcon className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {restaurant.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {restaurant.detailed_address || restaurant.address || 'Adres belirtilmemiş'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {restaurant.phone && (
                              <div className="flex items-center">
                                <PhoneIcon className="h-4 w-4 text-gray-400 mr-1" />
                                {restaurant.phone}
                              </div>
                            )}
                            {restaurant.email && (
                              <div className="flex items-center mt-1">
                                <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-1" />
                                {restaurant.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            {restaurant.city && restaurant.district ? (
                              <>
                                <div>{restaurant.city}</div>
                                <div>{restaurant.district}</div>
                                {restaurant.neighborhood && (
                                  <div className="text-xs">{restaurant.neighborhood}</div>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">Konum belirtilmemiş</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="space-y-1">
                            <div>Toplam: {stats.total_orders} sipariş</div>
                            <div>Bugün: {stats.daily_orders} sipariş</div>
                            <div>Ciro: ₺{stats.daily_revenue.toFixed(0)}</div>
                            <div>Aktif: {stats.active_orders}</div>
                            <div>Kullanıcı: {stats.total_users}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleRestaurantStatus(restaurant.id, restaurant.is_active)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              restaurant.is_active
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            } transition-colors`}
                          >
                            {restaurant.is_active ? 'Aktif' : 'Pasif'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openEditModal(restaurant)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition-colors"
                              title="Düzenle"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteRestaurant(restaurant.id, restaurant.name)}
                              className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition-colors"
                              title="Sil"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Restoran Ekleme/Düzenleme Modalı */}
      {isModalOpen && (
        <RestaurantFormModal
          restaurant={selectedRestaurant}
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleRestaurantSaved}
          isCreating={isCreating}
        />
      )}
    </div>
  )
} 