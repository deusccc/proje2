'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import { supabase } from '@/lib/supabase/index'
import GoogleMapsProvider from '@/components/GoogleMapsProvider'
import { getCompanyCourierIcon, getRestaurantIcon as getRestaurantIconFromComponent, getCustomerVerifiedIcon, getCustomerUnverifiedIcon } from '@/components/CourierIcons'
import { 
  TruckIcon, 
  MapPinIcon, 
  ClockIcon, 
  BanknotesIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Bars3Icon,
  XMarkIcon,
  EyeIcon,
  PhoneIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

// Tam ekran harita ayarları
const mapContainerStyle = {
  width: '100vw',
  height: '100vh'
}

const defaultCenter = {
  lat: 41.0082,
  lng: 28.9784 // İstanbul
}

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy',
  clickableIcons: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
}

// Interface tanımları
interface CourierLocation {
  id: string
  full_name: string
  phone: string
  vehicle_type: string
  license_plate: string
  current_latitude: number
  current_longitude: number
  is_available: boolean
  courier_status: 'available' | 'busy' | 'offline' | 'on_delivery'
  active_assignments: number
  last_location_update: string
}

interface ActiveOrder {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  delivery_latitude: number
  delivery_longitude: number
  order_status: 'pending' | 'preparing' | 'ready' | 'on_delivery' | 'delivered' | 'cancelled'
  total_amount: number
  created_at: string
  restaurant_name: string
  restaurant_latitude: number
  restaurant_longitude: number
  courier_id?: string
  courier_name?: string
  courier_phone?: string
  courier_lat?: number
  courier_lng?: number
  estimated_delivery_time?: string
  is_verified: boolean
}

interface Stats {
  total_orders: number
  completed_orders: number
  total_couriers: number
  active_couriers: number
  daily_revenue: number
}

function CompanyDashboardContent() {
  const router = useRouter()
  
  // Map states
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null)
  const [mapCenter, setMapCenter] = useState(defaultCenter)
  
  // Data states
  const [couriers, setCouriers] = useState<CourierLocation[]>([])
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([])
  const [stats, setStats] = useState<Stats>({
    total_orders: 0,
    completed_orders: 0,
    total_couriers: 0,
    active_couriers: 0,
    daily_revenue: 0
  })
  
  // UI states
  const [selectedCourier, setSelectedCourier] = useState<CourierLocation | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showOrderList, setShowOrderList] = useState(true)
  const [loading, setLoading] = useState(true)

  // Veri yükleme fonksiyonları
  const fetchCouriers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*, courier_status')
        .order('full_name')

      if (error) throw error
      setCouriers(data || [])
    } catch (error) {
      console.error('Kurye verisi alınamadı:', error)
    }
  }, [])

  const fetchActiveOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('active_orders_with_details')
        .select('*')
        .in('status', ['confirmed', 'preparing', 'ready', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setActiveOrders(data || [])
    } catch (error) {
      console.error('Aktif sipariş verisi alınamadı:', error)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .single()

      if (error) {
        console.error('İstatistik verisi hatası:', error)
        return
      }
      
      if (data) {
        setStats({
          total_orders: data.total_orders || 0,
          completed_orders: data.completed_orders || 0,
          total_couriers: data.total_couriers || 0,
          active_couriers: data.active_couriers || 0,
          daily_revenue: data.daily_revenue || 0
        })
      }
    } catch (error) {
      console.error('İstatistik verisi alınamadı:', error)
    }
  }, [])

  // İlk veri yükleme
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchCouriers(),
        fetchActiveOrders(),
        fetchStats()
      ])
      setLoading(false)
    }
    loadData()
  }, [fetchCouriers, fetchActiveOrders, fetchStats])

  // Gerçek zamanlı güncellemeler
  useEffect(() => {
    // Eski interval'ı kaldır, yerine Supabase real-time subscription kullan
    if (!mapRef) return

    const subscription = supabase
      .channel('company-dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          fetchActiveOrders()
          fetchStats()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          fetchActiveOrders()
          fetchStats()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_assignments' },
        (payload) => {
          fetchActiveOrders()
          fetchCouriers()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_assignments' },
        (payload) => {
          fetchActiveOrders()
          fetchCouriers()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couriers' },
        (payload) => {
          fetchCouriers()
          fetchStats()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'courier_locations' },
        (payload) => {
          fetchCouriers()
        }
      )
      .subscribe()

    // 4 saniyede bir otomatik güncelleme
    const autoRefreshInterval = setInterval(() => {
      fetchCouriers()
      fetchActiveOrders()
      fetchStats()
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearInterval(autoRefreshInterval)
    }
  }, [mapRef, fetchCouriers, fetchActiveOrders, fetchStats])

  // Helper functions
  const getCourierIcon = (courier: CourierLocation) => {
    return getCompanyCourierIcon(courier)
  }

  const panToCourier = (courier: CourierLocation) => {
    if (mapRef && courier.current_latitude && courier.current_longitude) {
      mapRef.panTo({ lat: courier.current_latitude, lng: courier.current_longitude })
      mapRef.setZoom(16)
      setSelectedCourier(courier)
    }
  }

  const panToOrder = (order: ActiveOrder) => {
    if (mapRef && order.delivery_latitude && order.delivery_longitude) {
      mapRef.panTo({ lat: order.delivery_latitude, lng: order.delivery_longitude })
      mapRef.setZoom(15)
      setSelectedOrder(order)
    }
  }

  const getRestaurantIcon = () => {
    return getRestaurantIconFromComponent()
  }

  const getCustomerIcon = (isVerified: boolean) => {
    if (isVerified) {
      return getCustomerVerifiedIcon()
    }
    return getCustomerUnverifiedIcon()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-yellow-100 text-yellow-800'
      case 'ready': return 'bg-orange-100 text-orange-800'
      case 'picked_up': return 'bg-purple-100 text-purple-800'
      case 'in_transit': return 'bg-indigo-100 text-indigo-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Onaylandı'
      case 'preparing': return 'Hazırlanıyor'
      case 'ready': return 'Hazır'
      case 'picked_up': return 'Alındı'
      case 'in_transit': return 'Yolda'
      case 'delivered': return 'Teslim Edildi'
      default: return 'Bilinmiyor'
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4">Harita yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Tam Ekran Harita */}
      <GoogleMapsProvider>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={12}
          options={mapOptions}
          onLoad={(map) => {
            console.log('Google Map yüklendi')
            setMapRef(map)
          }}
        >
          {/* Kurye konumları */}
          {couriers.map((courier) => {
            const icon = getCourierIcon(courier)
            if (!icon) return null
            
            // Koordinat değerlerini kontrol et
            if (!courier.current_latitude || !courier.current_longitude ||
                isNaN(courier.current_latitude) || isNaN(courier.current_longitude) ||
                courier.current_latitude === 0 || courier.current_longitude === 0) {
              return null
            }
            
            return (
                      <Marker
                        key={courier.id}
                        position={{
                          lat: courier.current_latitude,
                          lng: courier.current_longitude
                        }}
                icon={icon}
                        onClick={() => setSelectedCourier(courier)}
                        title={`${courier.full_name} - ${courier.is_available ? 'Aktif' : 'Pasif'}`}
                        animation={window.google.maps.Animation.DROP}
                      />
            )
          })}

          {/* Sipariş konumları */}
          {activeOrders.map((order) => (
                      <Fragment key={order.id}>
                        {/* Restoran konumu */}
              {order.restaurant_latitude && order.restaurant_longitude && 
               !isNaN(order.restaurant_latitude) && !isNaN(order.restaurant_longitude) &&
               order.restaurant_latitude !== 0 && order.restaurant_longitude !== 0 && (() => {
                const restaurantIcon = getRestaurantIcon()
                if (!restaurantIcon) return null
                
                return (
                          <Marker
                            position={{ lat: order.restaurant_latitude, lng: order.restaurant_longitude }}
                    icon={restaurantIcon}
                            title={`Restoran: ${order.restaurant_name}`}
                          />
                )
              })()}

                        {/* Müşteri konumu */}
              {order.delivery_latitude && order.delivery_longitude && 
               !isNaN(order.delivery_latitude) && !isNaN(order.delivery_longitude) &&
               order.delivery_latitude !== 0 && order.delivery_longitude !== 0 && (() => {
                const customerIcon = getCustomerIcon(order.is_verified)
                if (!customerIcon) return null
                
                return (
                          <Marker
                            position={{ lat: order.delivery_latitude, lng: order.delivery_longitude }}
                    icon={customerIcon}
                            title={`Müşteri: ${order.customer_name}`}
                            onClick={() => setSelectedOrder(order)}
                          />
                )
              })()}

                        {/* Kurye konumu (eğer atanmışsa) */}
              {order.courier_id && order.courier_name && order.courier_phone && 
               order.courier_lat && order.courier_lng && 
               !isNaN(order.courier_lat) && !isNaN(order.courier_lng) &&
               order.courier_lat !== 0 && order.courier_lng !== 0 && (() => {
                const courierIcon = getCourierIcon({
                    id: order.courier_id,
                    full_name: order.courier_name,
                    phone: order.courier_phone,
                    current_latitude: order.courier_lat,
                    current_longitude: order.courier_lng,
                    last_location_update: '',
                    is_available: true, // Assuming courier is available for now
                    vehicle_type: '',
                    license_plate: '',
                    active_assignments: 0,
                    courier_status: 'on_delivery'
                  })
                if (!courierIcon) return null
                
                return (
                  <Marker
                    position={{ lat: order.courier_lat, lng: order.courier_lng }}
                    icon={courierIcon}
                            title={`Kurye: ${order.courier_name}`}
                          />
                )
              })()}
                      </Fragment>
                    ))}

          {/* Seçili kurye bilgi penceresi */}
                    {selectedCourier && (
                      <InfoWindow
                        position={{ lat: selectedCourier.current_latitude, lng: selectedCourier.current_longitude }}
                        onCloseClick={() => setSelectedCourier(null)}
                      >
                        <div className="p-2">
                <h3 className="font-semibold text-gray-900">{selectedCourier.full_name}</h3>
                <p className="text-sm text-gray-600">{selectedCourier.phone}</p>
                <p className="text-sm text-gray-600">{selectedCourier.vehicle_type} - {/* Assuming license_plate is not available in CourierLocation */}</p>
                
                <div className="flex items-center mt-2 space-x-2">
                  <div className={`w-2 h-2 rounded-full ${selectedCourier.is_available ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm">{selectedCourier.is_available ? 'Aktif' : 'Pasif'}</span>
                  
                  {/* Detaylı Durum */}
                  {selectedCourier.courier_status && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedCourier.courier_status === 'available' ? 'bg-green-100 text-green-800' :
                      selectedCourier.courier_status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                      selectedCourier.courier_status === 'on_delivery' ? 'bg-orange-100 text-orange-800' :
                      selectedCourier.courier_status === 'offline' ? 'bg-gray-100 text-gray-800' :
                      selectedCourier.courier_status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedCourier.courier_status === 'available' ? 'Müsait' :
                       selectedCourier.courier_status === 'busy' ? 'Meşgul' :
                       selectedCourier.courier_status === 'on_delivery' ? 'Teslimat Yapıyor' :
                       selectedCourier.courier_status === 'offline' ? 'Çevrimdışı' :
                       selectedCourier.courier_status === 'inactive' ? 'Hesap Pasif' :
                       selectedCourier.courier_status}
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 mt-1">{selectedCourier.active_assignments} aktif görev</p>
                        </div>
                      </InfoWindow>
                    )}

          {/* Seçili sipariş bilgi penceresi */}
                    {selectedOrder && (
                      <InfoWindow
                        position={{ lat: selectedOrder.delivery_latitude, lng: selectedOrder.delivery_longitude }}
                        onCloseClick={() => setSelectedOrder(null)}
                      >
                        <div className="p-2">
                <h3 className="font-semibold text-gray-900">#{selectedOrder.order_number}</h3>
                <p className="text-sm text-gray-600">{selectedOrder.customer_name}</p>
                          <p className="text-xs text-gray-600">₺{selectedOrder.total_amount.toFixed(2)}</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.order_status)}`}>
                            {getStatusText(selectedOrder.order_status)}
                          </span>
                        </div>
                      </InfoWindow>
                    )}
        </GoogleMap>
      </GoogleMapsProvider>

      {/* Üst Bar - İstatistikler */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{activeOrders.length}</div>
              <div className="text-xs text-gray-600">Aktif Sipariş</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active_couriers}</div>
              <div className="text-xs text-gray-600">Aktif Kurye</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.completed_orders}</div>
              <div className="text-xs text-gray-600">Tamamlanan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">₺{stats.daily_revenue.toFixed(0)}</div>
              <div className="text-xs text-gray-600">Günlük Ciro</div>
            </div>
            <div className="text-center">
              <button
                onClick={() => setShowOrderList(!showOrderList)}
                className="text-2xl font-bold text-gray-600 hover:text-gray-800"
              >
                <EyeIcon className="h-6 w-6 mx-auto" />
              </button>
              <div className="text-xs text-gray-600">Siparişler</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sol Sidebar - Aktif Siparişler */}
      {showOrderList && (
        <div className="absolute left-4 top-20 bottom-4 w-80 z-10">
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Aktif Siparişler</h3>
                <button
                  onClick={() => setShowOrderList(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600">{activeOrders.length} sipariş</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => panToOrder(order)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">#{order.order_number}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.order_status)}`}>
                          {getStatusText(order.order_status)}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">{order.customer_name}</p>
                        <p className="text-xs text-gray-500">{order.restaurant_name}</p>
                        <p className="text-sm font-medium text-gray-900">₺{order.total_amount.toFixed(2)}</p>
                      </div>
                      
                      {order.courier_name && (
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <TruckIcon className="h-3 w-3 mr-1" />
                          {order.courier_name}
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center text-xs text-gray-400">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {getTimeAgo(order.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {activeOrders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <BuildingStorefrontIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Henüz aktif sipariş yok</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sağ Sidebar - Kuryeler */}
      {showSidebar && (
        <div className="absolute right-4 top-20 bottom-4 w-72 z-10">
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Kuryeler</h3>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600">{stats.active_couriers}/{couriers.length} aktif</p>
          </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {couriers.map((courier) => (
                    <div
                      key={courier.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => panToCourier(courier)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${courier.is_available ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{courier.full_name}</p>
                          <p className="text-xs text-gray-500">{courier.phone}</p>
                      <p className="text-xs text-gray-400">{courier.vehicle_type}</p>
                      
                      {/* Kurye Durumu Badge */}
                      {courier.courier_status && (
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          courier.courier_status === 'available' ? 'bg-green-100 text-green-800' :
                          courier.courier_status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                          courier.courier_status === 'on_delivery' ? 'bg-orange-100 text-orange-800' :
                          courier.courier_status === 'offline' ? 'bg-gray-100 text-gray-800' :
                          courier.courier_status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {courier.courier_status === 'available' ? '🟢 Müsait' :
                           courier.courier_status === 'busy' ? '🟡 Meşgul' :
                           courier.courier_status === 'on_delivery' ? '🚗 Teslimat' :
                           courier.courier_status === 'offline' ? '⚪ Çevrimdışı' :
                           courier.courier_status === 'inactive' ? '🔴 Pasif' :
                           '🔵 ' + courier.courier_status}
                        </div>
                      )}
                        </div>
                      </div>
                      <div className="text-right">
                    <p className="text-xs text-gray-500">{courier.active_assignments} görev</p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(courier.last_location_update), 'HH:mm', { locale: tr })}
                        </p>
                      </div>
                    </div>
                  ))}
              
              {couriers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Kurye bulunamadı</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alt Kontrol Butonları */}
      <div className="absolute bottom-4 right-4 z-10 space-y-2">
        {!showSidebar && (
          <button
            onClick={() => setShowSidebar(true)}
            className="bg-white/90 backdrop-blur-md p-3 rounded-lg shadow-lg hover:bg-white transition-colors"
          >
            <UsersIcon className="h-5 w-5 text-gray-600" />
          </button>
        )}
        
        {!showOrderList && (
          <button
            onClick={() => setShowOrderList(true)}
            className="bg-white/90 backdrop-blur-md p-3 rounded-lg shadow-lg hover:bg-white transition-colors"
          >
            <BuildingStorefrontIcon className="h-5 w-5 text-gray-600" />
          </button>
        )}
        
        <button
          onClick={() => {
            router.push('/company/couriers')
          }}
          className="bg-blue-500 text-white p-3 rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
          title="Kurye Yönetimi"
        >
          <TruckIcon className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => {
            router.push('/company/restaurants')
          }}
          className="bg-orange-500 text-white p-3 rounded-lg shadow-lg hover:bg-orange-600 transition-colors"
          title="Restoran Yönetimi"
        >
          <BuildingStorefrontIcon className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => {
            router.push('/company/orders')
          }}
          className="bg-purple-500 text-white p-3 rounded-lg shadow-lg hover:bg-purple-600 transition-colors"
        >
          <ClipboardDocumentListIcon className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => {
            router.push('/company/orders/completed')
          }}
          className="bg-green-500 text-white p-3 rounded-lg shadow-lg hover:bg-green-600 transition-colors"
        >
          <CheckCircleIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Yenileme Butonu */}
      <div className="absolute bottom-4 left-4 z-10">
        <button
          onClick={() => {
            fetchCouriers()
            fetchActiveOrders()
            fetchStats()
          }}
          className="bg-blue-500 text-white p-3 rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export default function CompanyDashboard() {
  return (
    <CompanyDashboardContent />
  )
} 