'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import { supabase } from '@/lib/supabase/index'
import GoogleMapsProvider from '@/components/GoogleMapsProvider'
import { 
  Courier, 
  DeliveryAssignment, 
  CourierLocation, 
  CourierStats,
  CourierNotification 
} from '@/types'
import { 
  MapPinIcon, 
  TruckIcon, 
  ClockIcon, 
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  BellIcon,
  StarIcon,
  PlayIcon,
  PauseIcon,
  ArrowLeftIcon,
  PhoneIcon,
  UserIcon,
  CogIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { getOwnCourierIcon, getRestaurantIcon as getRestaurantIconComponent, getCustomerVerifiedIcon as getCustomerVerifiedIconComponent, getCustomerUnverifiedIcon as getCustomerUnverifiedIconComponent } from '@/components/CourierIcons'

// Ses efekti için - güvenli kontrol
const newOrderSound: HTMLAudioElement | null = typeof window !== 'undefined' ? 
  (() => {
    try {
      // Ses dosyası yoksa null döndür
      return null
    } catch (error) {
      console.warn('Ses dosyası yüklenemedi:', error)
      return null
    }
  })() : null

const mapContainerStyle = {
  width: '100%',
  height: '100vh'
}

const defaultCenter = {
  lat: 41.0082,
  lng: 28.9784 // İstanbul
}

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  clickableIcons: false,
  mapTypeControlOptions: {
    mapTypeIds: []
  },
  // Google yazısını kaldır
  mapTypeId: 'roadmap',
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'poi.business',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'transit',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'administrative',
      elementType: 'labels',
      stylers: [{ visibility: 'simplified' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#dadada' }]
    },
    {
      featureType: 'road.arterial',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road.local',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#c9c9c9' }]
    },
    {
      featureType: 'landscape',
      elementType: 'geometry',
      stylers: [{ color: '#f5f5f5' }]
    }
  ]
}

export default function CourierDashboard() {
  return (
    <GoogleMapsProvider>
      <CourierDashboardContent />
    </GoogleMapsProvider>
  )
}

function CourierDashboardContent() {
  const router = useRouter()
  const [courier, setCourier] = useState<Courier | null>(null)
  const [currentLocation, setCurrentLocation] = useState(defaultCenter)
  const [mapZoom, setMapZoom] = useState(15)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null)
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<DeliveryAssignment | null>(null)
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([])
  const [stats, setStats] = useState<CourierStats | null>(null)
  const [notifications, setNotifications] = useState<CourierNotification[]>([])
  const [isOnline, setIsOnline] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [isUpdatingLocation, setIsUpdatingLocation] = useState<string | null>(null)
  const [watchId, setWatchId] = useState<number | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [pendingAssignment, setPendingAssignment] = useState<DeliveryAssignment | null>(null)

  // Konum takibi başlat
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation bu tarayıcıda desteklenmiyor.')
      return
    }

    // Eğer zaten takip ediliyorsa, yeni takip başlatma
    if (watchId !== null) {
      return
    }

    // Önce mevcut konumu al
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        // Koordinat değerlerini kontrol et
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          const newLocation = {
            lat: lat,
            lng: lng
          }
          setCurrentLocation(newLocation)
          
          // Supabase'e konum gönder
          if (courier) {
            updateCourierLocation(newLocation, position.coords.accuracy)
          }
        } else {
          console.error('Geçersiz koordinat değerleri:', { lat, lng })
        }
      },
      (error) => {
        console.error('İlk konum alınırken hata:', error)
        // Hata durumunda tekrar dene
        setTimeout(() => {
          startLocationTracking()
        }, 10000)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // 15 saniye
        maximumAge: 10000 // 10 saniye önce alınan konum geçerli
      }
    )

    // Sonra sürekli takip başlat - daha sık güncelleme
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        // Koordinat değerlerini kontrol et
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          const newLocation = {
            lat: lat,
            lng: lng
          }
          setCurrentLocation(newLocation)
          
          // Supabase'e konum gönder - her konum değişikliğinde
          if (courier && courier.is_available) {
            updateCourierLocation(newLocation, position.coords.accuracy)
          }
        } else {
          console.error('Geçersiz koordinat değerleri (watch):', { lat, lng })
        }
      },
      (error) => {
        console.error('Konum hatası:', error)
        // Konum hatası durumunda kullanıcıyı bilgilendir
        if (error.code === error.PERMISSION_DENIED) {
          console.warn('Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini etkinleştirin.')
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          console.warn('Konum bilgisi kullanılamıyor.')
        } else if (error.code === error.TIMEOUT) {
          console.warn('Konum talebi zaman aşımına uğradı.')
        }
        
        // Hata durumunda tekrar dene
        setTimeout(() => {
          startLocationTracking()
        }, 10000)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 saniye
        maximumAge: 15000 // 15 saniye önce alınan konum geçerli
      }
    )
    setWatchId(id)
    setIsTracking(true)

    // Periyodik konum güncellemesi - her 15 saniyede bir manuel güncelleme
    const intervalId = setInterval(() => {
      if (courier && courier.is_available) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
            setCurrentLocation(newLocation)
            updateCourierLocation(newLocation, position.coords.accuracy)
          },
          (error) => {
            console.error('Periyodik konum alınırken hata:', error)
          },
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 10000
          }
        )
      }
    }, 15000) // 15 saniye

    // Cleanup fonksiyonu için interval ID'sini sakla
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [courier, watchId])

  // Konum takibi durdur
  const stopLocationTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
      setIsTracking(false)
    }
  }, [watchId])

  // Kurye konumunu güncelle
  const updateCourierLocation = async (
    location: google.maps.LatLngLiteral,
    accuracy?: number
  ) => {
    if (!courier) return

    // Aynı konum kontrolü - son 5 saniye içinde aynı konum gönderilmişse atla
    const lastUpdateKey = `lastLocationUpdate_${courier.id}`
    const lastUpdate = localStorage.getItem(lastUpdateKey)
    const now = Date.now()
    
    if (lastUpdate) {
      const timeDiff = now - parseInt(lastUpdate)
      if (timeDiff < 5000) { // 5 saniye
        return
      }
    }

    // Sadece kurye aktif olduğunda veritabanına kaydet
    if (!courier.is_available) {
      return
    }

    try {
      // Couriers tablosundaki konum bilgisini güncelle
      const updateData = {
        current_latitude: location.lat,
        current_longitude: location.lng,
        last_location_update: new Date().toISOString(),
        updated_at: new Date().toISOString() // Manuel olarak updated_at ekle
      }

      // Supabase'e güncelleme gönder
      const { error: courierError } = await supabase
        .from('couriers')
        .update(updateData)
        .eq('id', courier.id)

      if (courierError) {
        console.error('Kurye konum güncelleme hatası:', courierError)
        
        // Hata durumunda tekrar deneme
        setTimeout(() => {
          updateCourierLocation(location, accuracy)
        }, 5000)
        return
      } else {
        // Local state'i de güncelle
        setCourier(prev => prev ? {
          ...prev,
          current_latitude: location.lat,
          current_longitude: location.lng,
          last_location_update: updateData.last_location_update,
          updated_at: updateData.updated_at
        } : null)
        
        // Son güncelleme zamanını kaydet
        localStorage.setItem(lastUpdateKey, now.toString())
      }
    } catch (error) {
      console.error('Konum güncelleme hatası:', error)
      
      // Hata durumunda tekrar deneme
      setTimeout(() => {
        updateCourierLocation(location, accuracy)
      }, 5000)
    }
  }

  // Kurye bilgilerini yükle
  const loadCourierData = async () => {
    try {
      const userData = localStorage.getItem('user')
      if (!userData) {
        router.push('/courier/login')
        return
      }

      const user = JSON.parse(userData)
      
      // Kurye bilgilerini couriers tablosundan al
      const { data: courierData, error } = await supabase
        .from('couriers')
        .select(`
          id,
          user_id,
          full_name,
          phone,
          vehicle_type,
          is_active,
          is_available,
          current_latitude,
          current_longitude,
          last_location_update,
          rating,
          total_deliveries,
          created_at,
          updated_at,
          license_plate,
          courier_status
        `)
        .eq('user_id', user.id)
        .single()

      if (error || !courierData) {
        console.error('Kurye bilgisi alınamadı:', error)
        console.log('Hata detayı:', error?.message)
        console.log('Hata kodu:', error?.code)
        localStorage.removeItem('user')
        router.push('/courier/login')
        return
      }

      if (!courierData.is_active) {
        console.error('Kurye hesabı aktif değil')
        localStorage.removeItem('user')
        router.push('/courier/login')
        return
      }

      console.log('Kurye verileri yüklendi:', courierData)
      setCourier(courierData)
      
      // Eğer kurye konumu varsa, harita merkezini oraya ayarla
      if (courierData.current_latitude && courierData.current_longitude) {
        const courierLocation = {
          lat: courierData.current_latitude,
          lng: courierData.current_longitude
        }
        setCurrentLocation(courierLocation)
        console.log('Kurye konumu yüklendi:', courierLocation)
      } else {
        console.log('Kurye konumu bulunamadı, varsayılan konum kullanılıyor')
      }
    } catch (error) {
      console.error('Kurye verileri yükleme hatası:', error)
      localStorage.removeItem('user')
      router.push('/courier/login')
    }
  }

  // Atamaları yükle
  const loadAssignments = async () => {
    if (!courier) return

    try {
      const { data: assignmentsData, error } = await supabase
        .from('delivery_assignments')
        .select('*')
        .eq('courier_id', courier.id)
        .in('status', ['assigned', 'accepted', 'picked_up', 'on_the_way'])
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Atama verilerini yükleme hatası:', error)
        return
      }

      if (!assignmentsData || assignmentsData.length === 0) {
        setAssignments([])
        return
      }

      const assignmentsWithRelations = []
      for (const assignment of assignmentsData) {
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('id', assignment.order_id)
          .single()

        let restaurantData = null
        if (orderData?.restaurant_id) {
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', orderData.restaurant_id)
            .single()
          restaurantData = restaurant
        }

        const { data: courierData } = await supabase
          .from('couriers')
          .select('*')
          .eq('id', assignment.courier_id)
          .single()

        assignmentsWithRelations.push({
          ...assignment,
          order: orderData,
          restaurant: restaurantData,
          courier: courierData
        })
      }

      setAssignments(assignmentsWithRelations)

      // Harita merkezini ayarla
      if (assignmentsWithRelations.length > 0) {
        const validLocations = assignmentsWithRelations
          .filter(assignment => 
            (assignment.order as any)?.customer_address_lat && 
            (assignment.order as any)?.customer_address_lng
          )
          .map(assignment => ({
            lat: parseFloat((assignment.order as any).customer_address_lat),
            lng: parseFloat((assignment.order as any).customer_address_lng),
            verified: (assignment.order as any)?.is_location_verified || false
          }))

        if (validLocations.length > 0) {
          const verifiedLocations = validLocations.filter(loc => loc.verified)
          const locationsToUse = verifiedLocations.length > 0 ? verifiedLocations : validLocations

          const avgLat = locationsToUse.reduce((sum, loc) => sum + loc.lat, 0) / locationsToUse.length
          const avgLng = locationsToUse.reduce((sum, loc) => sum + loc.lng, 0) / locationsToUse.length

          setCurrentLocation({ lat: avgLat, lng: avgLng })
          setMapZoom(14)
        }
      }
    } catch (error) {
      console.error('Atama yükleme hatası:', error)
    }
  }

  // İstatistikleri yükle
  const loadStats = async () => {
    if (!courier) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data: statsData, error } = await supabase
        .from('delivery_assignments')
        .select('delivery_fee')
        .eq('courier_id', courier.id)
        .eq('status', 'delivered')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`)

      if (error) {
        console.error('İstatistik yükleme hatası:', error)
        return
      }

      const earningsToday = statsData?.reduce((sum, item) => sum + (item.delivery_fee || 0), 0) || 0
      const completedToday = statsData?.length || 0

      const { data: allTimeStats, error: allTimeError } = await supabase
        .from('delivery_assignments')
        .select('delivery_fee')
        .eq('courier_id', courier.id)
        .eq('status', 'delivered')

      const totalEarnings = allTimeStats?.reduce((sum, item) => sum + (item.delivery_fee || 0), 0) || 0
      const totalDeliveries = allTimeStats?.length || 0

      const { data: ratingsData } = await supabase
        .from('courier_ratings')
        .select('rating')
        .eq('courier_id', courier.id)

      const averageRating = ratingsData?.length 
        ? ratingsData.reduce((sum, item) => sum + item.rating, 0) / ratingsData.length
        : 0

      setStats({
        earnings_today: earningsToday,
        completed_today: completedToday,
        average_rating: averageRating,
        total_deliveries: totalDeliveries,
        total_earnings: totalEarnings,
        active_since: courier.created_at
      })
    } catch (error) {
      console.error('İstatistik hatası:', error)
    }
  }

  // Atamayı kabul et
  const acceptAssignment = async (assignmentId: string) => {
    try {
      setIsUpdatingLocation(assignmentId)
      const { error } = await supabase
        .from('delivery_assignments')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', assignmentId)

      if (error) {
        console.error('Atama kabul hatası:', error)
        alert('Hata: Sipariş kabul edilemedi')
        return
      }

      // Başarı mesajı göster
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300'
      toast.textContent = '✅ Sipariş kabul edildi! Restorana gidin.'
      document.body.appendChild(toast)
      
      setTimeout(() => {
        toast.remove()
      }, 3000)

      setPendingAssignment(null)
      loadAssignments()
    } catch (error) {
      console.error('Atama kabul hatası:', error)
      alert('Hata: Sipariş kabul edilemedi')
    } finally {
      setIsUpdatingLocation(null)
    }
  }

  // Atamayı reddet
  const rejectAssignment = async (assignmentId: string) => {
    try {
      setIsUpdatingLocation(assignmentId)
      const { error } = await supabase
        .from('delivery_assignments')
        .update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('id', assignmentId)

      if (error) {
        console.error('Atama reddetme hatası:', error)
        alert('Hata: Sipariş reddedilemedi')
        return
      }

      // Başarı mesajı göster
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300'
      toast.textContent = '❌ Sipariş reddedildi.'
      document.body.appendChild(toast)
      
      setTimeout(() => {
        toast.remove()
      }, 3000)

      setPendingAssignment(null)
      loadAssignments()
    } catch (error) {
      console.error('Atama reddetme hatası:', error)
      alert('Hata: Sipariş reddedilemedi')
    } finally {
      setIsUpdatingLocation(null)
    }
  }

  // Atama durumunu güncelle
  const updateAssignmentStatus = async (assignmentId: string, newStatus: string) => {
    try {
      setIsUpdatingLocation(assignmentId)
      
      // İlgili atamayı bul
      const assignment = assignments.find(a => a.id === assignmentId)
      if (!assignment) {
        console.error('Atama bulunamadı:', assignmentId)
        return
      }

      const updateData: any = { status: newStatus }
      
      // Zaman damgalarını ekle
      if (newStatus === 'accepted') {
        updateData.accepted_at = new Date().toISOString()
      } else if (newStatus === 'picked_up') {
        updateData.picked_up_at = new Date().toISOString()
      } else if (newStatus === 'on_the_way') {
        updateData.on_the_way_at = new Date().toISOString()
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      }

      // Delivery assignment'ı güncelle
      const { error: assignmentError } = await supabase
        .from('delivery_assignments')
        .update(updateData)
        .eq('id', assignmentId)

      if (assignmentError) {
        console.error('Atama durum güncelleme hatası:', assignmentError)
        alert('Hata: Atama durumu güncellenemedi')
        return
      }

      // Orders tablosundaki durumu da güncelle
      let orderStatus = assignment.order?.status || 'pending'
      if (newStatus === 'accepted') {
        // Kurye kabul ettiğinde sipariş onaylandı olur ama kurye hala müsait
        orderStatus = 'confirmed'
      } else if (newStatus === 'picked_up') {
        // Kurye siparişi aldığında hazır durumuna geç
        orderStatus = 'ready_for_pickup'
      } else if (newStatus === 'on_the_way') {
        // Kurye yola çıktığında meşgul olur ve sipariş yolda
        orderStatus = 'out_for_delivery'
      } else if (newStatus === 'delivered') {
        // Teslim edilince kurye tekrar müsait olur
        orderStatus = 'delivered'
      }

      // Order durumunu güncelle (sadece desteklenen durumlar)
      if (orderStatus !== assignment.order?.status) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({ 
            status: orderStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignment.order_id)

        if (orderError) {
          console.error('Sipariş durum güncelleme hatası:', orderError)
          // Assignment başarılı oldu ama order güncellenemedi, yine de devam et
        }
      }

      // Kurye durumunu güncelle (assignment değişikliği sonrası)
      if (courier) {
        // Trigger'lar otomatik güncelleyecek, manuel olarak da kontrol edelim
        const { data: updatedCourier } = await supabase
          .from('couriers')
          .select('courier_status, active_assignments')
          .eq('id', courier.id)
          .single()
        
        if (updatedCourier) {
          setCourier(prev => prev ? {
            ...prev,
            courier_status: updatedCourier.courier_status,
            active_assignments: updatedCourier.active_assignments
          } : null)
        }
      }

      // Başarı mesajı göster
      let successMessage = ''
      switch (newStatus) {
        case 'accepted':
          successMessage = 'Sipariş kabul edildi!'
          break
        case 'picked_up':
          successMessage = 'Sipariş alındı! Şimdi müşteriye götürebilirsiniz.'
          break
        case 'on_the_way':
          successMessage = 'Teslimat yolda olarak işaretlendi!'
          break
        case 'delivered':
          successMessage = 'Sipariş teslim edildi! Tebrikler!'
          break
        default:
          successMessage = 'Durum güncellendi!'
      }
      
      // Kısa süre başarı mesajı göster
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300'
      toast.textContent = successMessage
      document.body.appendChild(toast)
      
      setTimeout(() => {
        toast.remove()
      }, 3000)

      loadAssignments()
      
      if (newStatus === 'delivered') {
        loadStats()
        
        // Teslim edildi mesajı ile birlikte ses çal
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200])
        }
      }
    } catch (error) {
      console.error('Durum güncelleme hatası:', error)
      alert('Hata: Durum güncellenemedi')
    } finally {
      setIsUpdatingLocation(null)
    }
  }

  // Müsaitlik durumunu değiştir
  const toggleAvailability = async () => {
    if (!courier) return

    try {
      const newAvailability = !courier.is_available
      
      // Veritabanını güncelle
      const updateData: any = { 
        is_available: newAvailability,
        last_location_update: new Date().toISOString(),
        updated_at: new Date().toISOString() // Manuel olarak updated_at ekle
      }
      
      // Eğer çevrimiçi oluyorsa ve mevcut konum varsa, konumu da güncelle
      if (newAvailability && currentLocation && (currentLocation.lat !== defaultCenter.lat || currentLocation.lng !== defaultCenter.lng)) {
        updateData.current_latitude = currentLocation.lat
        updateData.current_longitude = currentLocation.lng
      }
      
      const { error } = await supabase
        .from('couriers')
        .update(updateData)
        .eq('id', courier.id)

      if (error) {
        console.error('Müsaitlik güncelleme hatası:', error)
        return
      }

      // Local state'i güncelle
      setCourier(prev => prev ? {
        ...prev,
        is_available: newAvailability,
        current_latitude: updateData.current_latitude || courier.current_latitude,
        current_longitude: updateData.current_longitude || courier.current_longitude,
        last_location_update: updateData.last_location_update,
        updated_at: updateData.updated_at
      } : null)
      
      // Konum takibi her zaman aktif kalır, sadece veritabanına kaydetme değişir
      if (newAvailability) {
        // Mevcut konumu hemen güncelle
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const newLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              }
              setCurrentLocation(newLocation)
              updateCourierLocation(newLocation, position.coords.accuracy)
            },
            (error) => {
              console.error('Konum alınırken hata:', error)
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            }
          )
        }
      }
      
      // Atamaları yenile (yeni durum için)
      setTimeout(() => {
        loadAssignments()
      }, 500)
      
    } catch (error) {
      console.error('Müsaitlik hatası:', error)
    }
  }

  // Debug: Supabase bağlantı testi
  const testSupabaseConnection = async () => {
    if (!courier) return
    
    try {
      console.log('=== SUPABASE BAĞLANTI TESTİ ===')
      console.log('Kurye ID:', courier.id)
      console.log('Kurye Adı:', courier.full_name)
      console.log('Kurye User ID:', courier.user_id)
      
      // Önce mevcut veriyi oku
      const { data: readData, error: readError } = await supabase
        .from('couriers')
        .select('id, current_latitude, current_longitude, last_location_update, is_available, user_id')
        .eq('id', courier.id)
        .single()
      
      console.log('Okuma sonucu:', { readData, readError })
      
      if (readError) {
        console.error('Okuma hatası:', readError)
        console.log('Hata detayı:', readError.message)
        console.log('Hata kodu:', readError.code)
        console.log('Hata hint:', readError.hint)
        return
      }
      
      // Sonra güncelleme testi yap
      const testUpdateData = {
        current_latitude: 40.9909,
        current_longitude: 29.0303,
        last_location_update: new Date().toISOString(),
        updated_at: new Date().toISOString() // Manuel olarak updated_at ekle
      }
      
      console.log('Test güncelleme verisi:', testUpdateData)
      
      // Önce sadece güncelleme yap (select olmadan)
      const { error: updateError } = await supabase
        .from('couriers')
        .update(testUpdateData)
        .eq('id', courier.id)
      
      console.log('Güncelleme sonucu (select olmadan):', { updateError })
      
      if (updateError) {
        console.error('Güncelleme hatası:', updateError)
        console.log('Hata detayı:', updateError.message)
        console.log('Hata kodu:', updateError.code)
        console.log('Hata hint:', updateError.hint)
        console.log('Hata details:', updateError.details)
      } else {
        console.log('Test güncelleme başarılı (select olmadan)')
        
        // Şimdi güncellenmiş veriyi oku
        const { data: updatedData, error: readUpdatedError } = await supabase
          .from('couriers')
          .select('id, current_latitude, current_longitude, last_location_update, updated_at')
          .eq('id', courier.id)
          .single()
        
        console.log('Güncellenmiş veri okuma sonucu:', { updatedData, readUpdatedError })
      }
      
      // RLS politikası testi
      console.log('=== RLS POLİTİKA TESTİ ===')
      
      // Farklı bir kurye ID'si ile test
      const { data: otherCourierData, error: otherCourierError } = await supabase
        .from('couriers')
        .update(testUpdateData)
        .eq('id', '00000000-0000-0000-0000-000000000000') // Geçersiz ID
        .select('id')
      
      console.log('Geçersiz ID testi:', { otherCourierData, otherCourierError })
      
      // Tüm kuryeleri listele (RLS testi)
      const { data: allCouriers, error: allCouriersError } = await supabase
        .from('couriers')
        .select('id, full_name, is_available')
        .limit(5)
      
      console.log('Tüm kuryeler testi:', { allCouriers, allCouriersError })
      
      // Kullanıcı bilgilerini kontrol et
      const { data: userData, error: userError } = await supabase.auth.getUser()
      console.log('Kullanıcı bilgileri:', { userData, userError })
      
    } catch (error) {
      console.error('Test hatası:', error)
    }
  }

  // Debug: Manuel konum güncelleme testi
  const testLocationUpdate = async () => {
    if (!courier) return
    
    const testLocation = {
      lat: currentLocation.lat + (Math.random() - 0.5) * 0.001, // Küçük rastgele değişiklik
      lng: currentLocation.lng + (Math.random() - 0.5) * 0.001
    }
    
    console.log('Test konum güncellemesi:', testLocation)
    await updateCourierLocation(testLocation, 10)
  }

  // Debug: Basit güncelleme testi (RLS bypass)
  const testSimpleUpdate = async () => {
    if (!courier) return
    
    try {
      console.log('=== BASİT GÜNCELLEME TESTİ ===')
      console.log('Kurye ID:', courier.id)
      
      // Çok basit bir güncelleme testi
      const simpleUpdateData = {
        last_location_update: new Date().toISOString(),
        updated_at: new Date().toISOString() // Manuel olarak updated_at ekle
      }
      
      console.log('Basit güncelleme verisi:', simpleUpdateData)
      
      // Sadece last_location_update güncelle
      const { error } = await supabase
        .from('couriers')
        .update(simpleUpdateData)
        .eq('id', courier.id)
      
      console.log('Basit güncelleme sonucu:', { error })
      
      if (error) {
        console.error('Basit güncelleme hatası:', error)
        console.log('Hata detayı:', error.message)
        console.log('Hata kodu:', error.code)
        console.log('Hata hint:', error.hint)
        console.log('Hata details:', error.details)
        
        // RLS politikası hatası olup olmadığını kontrol et
        if (error.message.includes('policy') || error.message.includes('RLS')) {
          console.error('RLS POLİTİKASI HATASI TESPİT EDİLDİ!')
          console.log('Çözüm: Supabase dashboard\'da RLS politikalarını kontrol edin')
        }
      } else {
        console.log('Basit güncelleme başarılı!')
        
        // Güncellenmiş veriyi oku
        const { data: updatedData, error: readError } = await supabase
          .from('couriers')
          .select('id, last_location_update')
          .eq('id', courier.id)
          .single()
        
        console.log('Güncellenmiş veri:', updatedData)
        console.log('Okuma hatası:', readError)
      }
      
    } catch (error) {
      console.error('Basit test hatası:', error)
    }
  }

  // Debug: RLS politikası testi
  const testRLSPolicies = async () => {
    if (!courier) return
    
    try {
      console.log('=== RLS POLİTİKA TESTİ ===')
      console.log('Kurye ID:', courier.id)
      console.log('Kurye User ID:', courier.user_id)
      
      // Kullanıcı bilgilerini kontrol et
      const { data: userData, error: userError } = await supabase.auth.getUser()
      console.log('Kullanıcı bilgileri:', { userData, userError })
      
      // Mevcut kurye verisini oku
      const { data: readData, error: readError } = await supabase
        .from('couriers')
        .select('id, user_id, full_name, is_available')
        .eq('id', courier.id)
        .single()
      
      console.log('Kurye okuma sonucu:', { readData, readError })
      
      // Basit güncelleme testi
      const testUpdateData = {
        last_location_update: new Date().toISOString()
      }
      
      console.log('Test güncelleme verisi:', testUpdateData)
      
      const { error: updateError } = await supabase
        .from('couriers')
        .update(testUpdateData)
        .eq('id', courier.id)
      
      console.log('Güncelleme sonucu:', { updateError })
      
      if (updateError) {
        console.error('RLS Politikası Hatası:', updateError)
        console.log('Hata detayı:', updateError.message)
        console.log('Hata kodu:', updateError.code)
        console.log('Hata hint:', updateError.hint)
        console.log('Hata details:', updateError.details)
      } else {
        console.log('RLS Politikası Testi Başarılı')
      }
      
    } catch (error) {
      console.error('RLS Test hatası:', error)
    }
  }

  // Çıkış yap
  const handleSignOut = () => {
    localStorage.removeItem('user')
    router.push('/courier/login')
  }

  // Google Maps yüklendiğinde
  const onMapLoad = useCallback(() => {
    setIsMapLoaded(true)
  }, [])

  // Kurye marker'ı için özel ikon (yuvarlak, mavi)
  const getCourierIcon = () => {
    // Yeni modern ikon sistemini kullan
    return getOwnCourierIcon()
  }

  // Restoran ikonu
  const getRestaurantIcon = () => {
    return getRestaurantIconComponent()
  }

  // Müşteri ikonu (doğrulanmış)
  const getCustomerVerifiedIcon = () => {
    return getCustomerVerifiedIconComponent()
  }

  // Müşteri ikonu (doğrulanmamış)  
  const getCustomerUnverifiedIcon = () => {
    return getCustomerUnverifiedIconComponent()
  }

  // Sayfa yüklendiğinde
  useEffect(() => {
    loadCourierData()
  }, [])

  // Kurye verisi yüklendiğinde
  useEffect(() => {
    if (courier) {
      const loadData = async () => {
        await loadAssignments()
        await loadStats()
      }
      
      loadData()
      
      // Konum takibini sadece bir kez başlat
      if (watchId === null) {
        const cleanup = startLocationTracking()
        return cleanup // Cleanup fonksiyonunu döndür
      }
    }
  }, [courier]) // startLocationTracking dependency'sini kaldırdık

  // Gerçek zamanlı güncellemeler
  useEffect(() => {
    if (!courier) return

    const subscription = supabase
      .channel('courier-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_assignments',
          filter: `courier_id=eq.${courier.id}`
        },
        (payload) => {
          const newAssignment = payload.new as DeliveryAssignment
          
          if (newAssignment.status === 'assigned') {
            // Ses çal (eğer mevcutsa)
            if (newOrderSound) {
              newOrderSound.play().catch((e: any) => console.log('Ses çalınamadı:', e))
            }
            
            // Vibrasyon (mobil cihazlarda)
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200])
            }
            
            setPendingAssignment(newAssignment)
          }
          setTimeout(() => loadAssignments(), 100)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_assignments',
          filter: `courier_id=eq.${courier.id}`
        },
        (payload) => {
          setTimeout(() => loadAssignments(), 100)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'couriers',
          filter: `id=eq.${courier.id}`
        },
        (payload) => {
          const updatedCourier = payload.new
          
          // Local state'i güncelle
          setCourier(prev => prev ? {
            ...prev,
            current_latitude: updatedCourier.current_latitude,
            current_longitude: updatedCourier.current_longitude,
            last_location_update: updatedCourier.last_location_update,
            is_available: updatedCourier.is_available,
            courier_status: updatedCourier.courier_status,
            active_assignments: updatedCourier.active_assignments,
            updated_at: updatedCourier.updated_at
          } : null)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          // Bu kurye ile ilgili siparişleri yenile
          setTimeout(() => loadAssignments(), 100)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'courier_notifications',
          filter: `courier_id=eq.${courier.id}`
        },
        (payload) => {
          // Bildirim toast göster
          const toast = document.createElement('div')
          toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300'
          toast.textContent = `🔔 ${payload.new.title}: ${payload.new.message}`
          document.body.appendChild(toast)
          
          setTimeout(() => {
            toast.remove()
          }, 5000)
        }
      )
      .subscribe()

    // 4 saniyede bir otomatik güncelleme
    const autoRefreshInterval = setInterval(() => {
      loadAssignments()
      loadStats()
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearInterval(autoRefreshInterval)
    }
  }, [courier, newOrderSound, loadAssignments])

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watchId])

  if (!courier) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-white">Kurye bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Ana Harita */}
      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={currentLocation && 
                  typeof currentLocation.lat === 'number' && 
                  typeof currentLocation.lng === 'number' &&
                  !isNaN(currentLocation.lat) && 
                  !isNaN(currentLocation.lng) && 
                  currentLocation.lat !== 0 && 
                  currentLocation.lng !== 0 
                  ? currentLocation 
                  : defaultCenter}
          zoom={mapZoom}
          options={mapOptions}
          onLoad={(map) => {
            setIsMapLoaded(true)
            if (mapBounds) {
              map.fitBounds(mapBounds)
            }
          }}
          onClick={() => setSelectedAssignment(null)}
        >
            {/* Kurye konumu */}
            {isMapLoaded && currentLocation && 
             typeof currentLocation.lat === 'number' && 
             typeof currentLocation.lng === 'number' &&
             !isNaN(currentLocation.lat) && 
             !isNaN(currentLocation.lng) && 
             currentLocation.lat !== 0 && 
             currentLocation.lng !== 0 && (
              <Marker
                position={currentLocation}
                icon={getCourierIcon()}
                title="Kurye Konumu"
                animation={window.google.maps.Animation.DROP}
              />
            )}

            {/* Aktif atamaların konumları */}
            {isMapLoaded && assignments.map((assignment) => {
              // Sipariş durumuna göre hangi marker'ların gösterileceğini belirle
              const shouldShowRestaurant = assignment.status === 'assigned' || assignment.status === 'accepted'
              const shouldShowCustomer = assignment.status === 'assigned' || assignment.status === 'picked_up' || assignment.status === 'on_the_way'
              
              return (
                <div key={assignment.id}>
                  {/* Restoran konumu - sadece assigned ve accepted durumlarında göster */}
                  {shouldShowRestaurant && assignment.restaurant && 
                   assignment.restaurant.latitude && 
                   assignment.restaurant.longitude && 
                   typeof assignment.restaurant.latitude === 'number' && 
                   typeof assignment.restaurant.longitude === 'number' &&
                   !isNaN(assignment.restaurant.latitude) && 
                   !isNaN(assignment.restaurant.longitude) && (
                    <Marker
                      position={{
                        lat: assignment.restaurant.latitude,
                        lng: assignment.restaurant.longitude
                      }}
                      icon={getRestaurantIcon()}
                      onClick={() => setSelectedAssignment(assignment)}
                      title={`Restoran: ${assignment.restaurant.name}`}
                      animation={window.google.maps.Animation.DROP}
                    />
                  )}

                  {/* Müşteri konumu - assigned, picked_up ve on_the_way durumlarında göster */}
                  {shouldShowCustomer && (assignment.order as any)?.customer_address_lat && (assignment.order as any)?.customer_address_lng && (() => {
                    const lat = parseFloat((assignment.order as any).customer_address_lat)
                    const lng = parseFloat((assignment.order as any).customer_address_lng)
                    
                    // Koordinat değerlerini kontrol et
                    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                      return null
                    }
                    
                    return (
                      <Marker
                        position={{
                          lat: lat,
                          lng: lng
                        }}
                        icon={(assignment.order as any).is_location_verified ? getCustomerVerifiedIcon() : getCustomerUnverifiedIcon()}
                        onClick={() => setSelectedAssignment(assignment)}
                        title={`Müşteri: ${assignment.order.customer_name}`}
                        animation={window.google.maps.Animation.DROP}
                      />
                    )
                  })()}
                </div>
              )
            })}

            {/* Seçili atama bilgisi */}
            {selectedAssignment && (() => {
              let position = currentLocation
              
              // Müşteri konumunu kontrol et
              if ((selectedAssignment.order as any)?.customer_address_lat && (selectedAssignment.order as any)?.customer_address_lng) {
                const lat = parseFloat((selectedAssignment.order as any).customer_address_lat)
                const lng = parseFloat((selectedAssignment.order as any).customer_address_lng)
                
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                  position = { lat, lng }
                }
              }
              // Restoran konumunu kontrol et
              else if (selectedAssignment.restaurant?.latitude && selectedAssignment.restaurant?.longitude && 
                       typeof selectedAssignment.restaurant.latitude === 'number' && 
                       typeof selectedAssignment.restaurant.longitude === 'number' &&
                       !isNaN(selectedAssignment.restaurant.latitude) && 
                       !isNaN(selectedAssignment.restaurant.longitude)) {
                position = {
                  lat: selectedAssignment.restaurant.latitude,
                  lng: selectedAssignment.restaurant.longitude
                }
              }
              
              return (
                <InfoWindow
                  position={position}
                  onCloseClick={() => setSelectedAssignment(null)}
                >
                  <div className="p-3 max-w-sm">
                    <h3 className="font-bold text-gray-900 mb-2">
                      {selectedAssignment.restaurant?.name || 'Restoran'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      {selectedAssignment.order.customer_name}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedAssignment.order.customer_address}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-green-600 font-bold">₺{selectedAssignment.delivery_fee}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedAssignment.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                        selectedAssignment.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                        selectedAssignment.status === 'picked_up' ? 'bg-purple-100 text-purple-800' :
                        selectedAssignment.status === 'on_the_way' ? 'bg-orange-100 text-orange-800' :
                        selectedAssignment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedAssignment.status === 'assigned' ? '🆕 Yeni' :
                         selectedAssignment.status === 'accepted' ? '✅ Kabul Edildi' :
                         selectedAssignment.status === 'picked_up' ? '📦 Paket Alındı' :
                         selectedAssignment.status === 'on_the_way' ? '🚗 Yolda' :
                         selectedAssignment.status === 'delivered' ? '🎉 Teslim Edildi' :
                         'Bilinmeyen'}
                      </span>
                    </div>
                  </div>
                </InfoWindow>
              )
            })()}
          </GoogleMap>
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center">
            <MapPinIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-600">Harita yüklenemedi</p>
          </div>
        </div>
      )}

      {/* Üst Bar - Minimal */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleAvailability}
              className={`px-4 py-2 rounded-full text-white font-medium text-sm transition-colors ${
                courier.is_available 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-gray-500 hover:bg-gray-600'
              }`}
            >
              {courier.is_available ? (
                <>
                  <PlayIcon className="h-4 w-4 inline mr-2" />
                  Çevrimiçi
                </>
              ) : (
                <>
                  <PauseIcon className="h-4 w-4 inline mr-2" />
                  Çevrimdışı - Tıkla Aktif Ol
                </>
              )}
            </button>
            
            {/* Kurye Durumu Badge */}
            {courier.courier_status && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                courier.courier_status === 'available' ? 'bg-green-100 text-green-800' :
                courier.courier_status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                courier.courier_status === 'on_delivery' ? 'bg-orange-100 text-orange-800' :
                courier.courier_status === 'offline' ? 'bg-gray-100 text-gray-800' :
                courier.courier_status === 'inactive' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {courier.courier_status === 'available' ? '🟢 Müsait' :
                 courier.courier_status === 'busy' ? '🟡 Meşgul' :
                 courier.courier_status === 'on_delivery' ? '🚗 Teslimat Yapıyor' :
                 courier.courier_status === 'offline' ? '⚪ Çevrimdışı' :
                 courier.courier_status === 'inactive' ? '🔴 Pasif' :
                 '🔵 ' + courier.courier_status}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-black/40 rounded-full px-3 py-1 text-white text-sm">
              ₺{stats?.earnings_today || 0}
            </div>
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 bg-black/40 rounded-full text-white hover:bg-black/60"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Alt Bar - Aktif Siparişler veya Durum Mesajı */}
      {assignments.length > 0 ? (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Aktif Siparişler ({assignments.length})</h3>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">
                    {assignment.restaurant?.name || 'Restoran'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {assignment.order.customer_name}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 font-bold text-sm">
                    ₺{assignment.delivery_fee}
                  </span>
                  
                  {/* Durum butonları */}
                  <div className="flex space-x-2">
                    {assignment.status === 'assigned' && (
                      <button
                        onClick={() => updateAssignmentStatus(assignment.id, 'accepted')}
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        Kabul Et
                      </button>
                    )}
                    
                    {assignment.status === 'accepted' && assignment.order?.status === 'ready_for_pickup' && (
                      <button
                        onClick={() => updateAssignmentStatus(assignment.id, 'picked_up')}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      >
                        Siparişi Aldım
                      </button>
                    )}
                    
                    {assignment.status === 'picked_up' && (
                      <button
                        onClick={() => updateAssignmentStatus(assignment.id, 'on_the_way')}
                        className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
                      >
                        Yola Çıktım
                      </button>
                    )}
                    
                    {assignment.status === 'on_the_way' && (
                      <button
                        onClick={() => updateAssignmentStatus(assignment.id, 'delivered')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Teslim Ettim
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-center">
            {courier.is_available ? (
              <div className="flex items-center space-x-3 text-blue-600">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="font-medium">Siparişler aranıyor...</span>
                <div className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Çevrimiçi
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 text-gray-500">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="font-medium">Siparişler duraklatıldı</span>
                <div className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                  Çevrimdışı
                </div>
                <button
                  onClick={toggleAvailability}
                  className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-medium hover:bg-blue-600 transition-colors"
                >
                  Aktif Ol
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Yeni Sipariş Popup - Yemeksepeti Express Tarzı */}
      {pendingAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-bounce">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <TruckIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Yeni Sipariş!
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Yakınınızda bir teslimat var
              </p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-900">
                  {pendingAssignment.restaurant?.name || 'Restoran'}
                </p>
                <p className="text-sm text-gray-600">
                  {pendingAssignment.order.customer_name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {pendingAssignment.order.customer_address}
                </p>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Teslimat Ücreti:</span>
                <span className="text-2xl font-bold text-green-600">
                  ₺{pendingAssignment.delivery_fee}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sipariş Tutarı:</span>
                <span className="font-semibold text-gray-900">
                  ₺{pendingAssignment.order.total_amount}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => rejectAssignment(pendingAssignment.id)}
                disabled={isUpdatingLocation === pendingAssignment.id}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 disabled:opacity-50"
              >
                {isUpdatingLocation === pendingAssignment.id ? 'İşleniyor...' : '❌ Reddet'}
              </button>
              <button
                onClick={() => acceptAssignment(pendingAssignment.id)}
                disabled={isUpdatingLocation === pendingAssignment.id}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50"
              >
                {isUpdatingLocation === pendingAssignment.id ? 'İşleniyor...' : '✅ Kabul Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yan Menü */}
      {showSidebar && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSidebar(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Profil</h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">{courier.full_name}</h3>
                <p className="text-sm text-gray-600">{courier.phone}</p>
                <div className="mt-2 space-y-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    courier.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {courier.is_available ? 'Çevrimiçi (Aktif)' : 'Çevrimdışı (Pasif)'}
                  </span>
                  
                  {/* Detaylı Kurye Durumu */}
                  {courier.courier_status && (
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                      courier.courier_status === 'available' ? 'bg-green-100 text-green-800' :
                      courier.courier_status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                      courier.courier_status === 'on_delivery' ? 'bg-orange-100 text-orange-800' :
                      courier.courier_status === 'offline' ? 'bg-gray-100 text-gray-800' :
                      courier.courier_status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {courier.courier_status === 'available' ? '🟢 Müsait' :
                       courier.courier_status === 'busy' ? '🟡 Meşgul' :
                       courier.courier_status === 'on_delivery' ? '🚗 Teslimat Yapıyor' :
                       courier.courier_status === 'offline' ? '⚪ Çevrimdışı' :
                       courier.courier_status === 'inactive' ? '🔴 Hesap Pasif' :
                       '🔵 ' + courier.courier_status}
                    </div>
                  )}
                  
                  {/* Aktif Atama Sayısı */}
                  {courier.active_assignments !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      Aktif Atama: {courier.active_assignments || 0}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">₺{stats?.earnings_today || 0}</p>
                  <p className="text-xs text-gray-600">Bugünkü Kazanç</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats?.completed_today || 0}</p>
                  <p className="text-xs text-gray-600">Bugünkü Teslimat</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-600">{stats?.average_rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-gray-600">Ortalama Puan</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats?.total_deliveries || 0}</p>
                  <p className="text-xs text-gray-600">Toplam Teslimat</p>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="w-full py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 