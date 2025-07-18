import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'

import { AuthService } from '../lib/auth'
import { LocationService } from '../lib/locationService'
import { DeliveryService } from '../lib/deliveryService'
import { NotificationService } from '../lib/notificationService'
import { supabase } from '../lib/supabase'
import { User, Courier, DeliveryAssignment, CourierStats } from '../types'
import { RootStackParamList } from '../App'
import { 
  getOwnCourierIcon, 
  getRestaurantIcon, 
  getCustomerVerifiedIcon, 
  getCustomerUnverifiedIcon 
} from '../lib/iconManager'

const { width, height } = Dimensions.get('window')

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>
type DashboardScreenRouteProp = RouteProp<RootStackParamList, 'Dashboard'>

interface DashboardScreenProps {
  navigation: DashboardScreenNavigationProp
  route: DashboardScreenRouteProp
}

// Web uygulamasındaki harita stilleri
const mapStyle = [
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

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

const defaultCenter = {
  latitude: 41.0082,
  longitude: 28.9784 // İstanbul
}

export default function DashboardScreen({ navigation, route }: DashboardScreenProps) {
  const { user } = route.params
  const [courier, setCourier] = useState<Courier>(route.params.courier)
  
  const [isOnline, setIsOnline] = useState(courier.is_available)
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([])
  const [stats, setStats] = useState<CourierStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState(defaultCenter)
  const [mapZoom, setMapZoom] = useState(15)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<DeliveryAssignment | null>(null)
  const [isUpdatingLocation, setIsUpdatingLocation] = useState<string | null>(null)
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [locationPermission, setLocationPermission] = useState<boolean>(false)
  const [notificationSubscription, setNotificationSubscription] = useState<any>(null)
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null)
  const [courierLocationSubscription, setCourierLocationSubscription] = useState<any>(null)
  
  // Refs to prevent unnecessary re-renders
  const courierRef = useRef(courier)
  const assignmentsRef = useRef(assignments)
  const currentLocationRef = useRef(currentLocation)
  const isInitializedRef = useRef(false)
  
  // Update refs when state changes
  useEffect(() => {
    courierRef.current = courier
  }, [courier])
  
  useEffect(() => {
    assignmentsRef.current = assignments
  }, [assignments])
  
  useEffect(() => {
    currentLocationRef.current = currentLocation
  }, [currentLocation])
  
  // Harita merkezi
  const [mapRegion, setMapRegion] = useState({
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })

  // Konum izni iste
  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Konum İzni Gerekli',
          'Kurye uygulamasının çalışması için konum izni gereklidir.',
          [{ text: 'Tamam' }]
        )
        return false
      }
      setLocationPermission(true)
      return true
    } catch (error) {
      console.error('Konum izni hatası:', error)
      return false
    }
  }, [])

  // Konum takibi başlat
  const startLocationTracking = useCallback(async () => {
    const currentCourier = courierRef.current
    
    // Kurye çevrimdışıysa konum takibi başlatma
    if (!currentCourier.is_available) {
      return
    }

    if (!locationPermission) {
      const granted = await requestLocationPermission()
      if (!granted) return
    }

    // Eğer zaten takip ediliyorsa, yeni takip başlatma
    if (locationSubscription) {
      return
    }

    try {
      // Önce konum servislerinin açık olup olmadığını kontrol et
      const isLocationEnabled = await Location.hasServicesEnabledAsync()
      if (!isLocationEnabled) {
        Alert.alert(
          'Konum Servisleri Kapalı',
          'Konum takibi için konum servislerini açın.',
          [
            { text: 'Tamam' },
            { 
              text: 'Ayarları Aç', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  // iOS için Settings app'i açma
                  // Linking.openURL('app-settings:')
                } else {
                  // Android için Location Settings açma
                  // Linking.openURL('android.settings.LOCATION_SOURCE_SETTINGS')
                }
              }
            }
          ]
        )
        return
      }

      // Mevcut konumu al - daha düşük hassasiyet ile başla
      let currentLocation
      try {
        currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 50
        })
      } catch (locationError) {
        console.warn('Yüksek hassasiyet konum alınamadı, düşük hassasiyet deneniyor:', locationError)
        
        // Düşük hassasiyet ile tekrar dene
        try {
          currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeInterval: 15000,
            distanceInterval: 100
          })
        } catch (lowAccuracyError) {
          console.error('Düşük hassasiyet konum da alınamadı:', lowAccuracyError)
          Alert.alert(
            'Konum Alınamadı',
            'Konum bilgisi alınamadı. Lütfen konum servislerinin açık olduğundan emin olun.',
            [{ text: 'Tamam' }]
          )
          return
        }
      }
      
      const lat = currentLocation.coords.latitude
      const lng = currentLocation.coords.longitude
      
      // Koordinat değerlerini kontrol et
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        const newLocation = {
          latitude: lat,
          longitude: lng
        }
        
        setCurrentLocation(newLocation)
        setMapRegion(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }))
        
        // Supabase'e konum gönder
        if (currentCourier) {
          await updateCourierLocation(newLocation, currentLocation.coords.accuracy)
        }
      } else {
        console.error('Geçersiz koordinat değerleri:', { lat, lng })
        return
      }

      // Sürekli konum takibi başlat - daha düşük hassasiyet ile
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000, // 15 saniye
          distanceInterval: 50, // 50 metre
        },
        async (location) => {
          const lat = location.coords.latitude
          const lng = location.coords.longitude
          
          // Koordinat değerlerini kontrol et
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            const newLocation = {
              latitude: lat,
              longitude: lng
            }
            
            setCurrentLocation(newLocation)
            setMapRegion(prev => ({
              ...prev,
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
            }))
            
            // Supabase'e konum gönder (sadece aktif kuryeler için)
            const currentCourierState = courierRef.current
            if (currentCourierState && currentCourierState.is_available) {
              await updateCourierLocation(newLocation, location.coords.accuracy)
            }
          } else {
            console.error('Geçersiz koordinat değerleri (watch):', { lat, lng })
          }
        }
      )
      
      setLocationSubscription(subscription)
      setIsTracking(true)
      console.log('Konum takibi başarıyla başlatıldı')
    } catch (error) {
      console.error('Konum takibi başlatma hatası:', error)
      
      // Hata tipine göre farklı mesajlar göster
      const errorMessage = (error as Error).message || String(error)
      if (errorMessage.includes('location services are disabled') || 
          errorMessage.includes('location is unavailable')) {
        Alert.alert(
          'Konum Servisleri Kapalı',
          'Konum takibi için telefon ayarlarından konum servislerini açın.',
          [{ text: 'Tamam' }]
        )
      } else if (errorMessage.includes('permission')) {
        Alert.alert(
          'Konum İzni Gerekli',
          'Konum takibi için konum iznini verin.',
          [{ text: 'Tamam' }]
        )
      } else {
        Alert.alert(
          'Konum Hatası',
          'Konum takibi başlatılamadı. Lütfen daha sonra tekrar deneyin.',
          [{ text: 'Tamam' }]
        )
      }
    }
  }, [locationPermission, locationSubscription, requestLocationPermission])

  // Kurye konumunu güncelle
  const updateCourierLocation = async (
    location: { latitude: number; longitude: number },
    accuracy?: number | null
  ) => {
    const currentCourier = courierRef.current
    if (!currentCourier) return

    // Sadece kurye aktif olduğunda veritabanına kaydet
    if (!currentCourier.is_available) {
      console.log('Kurye çevrimdışı - konum kaydedilmiyor')
      return
    }

    try {
      // Supabase'e güncelleme gönder
      await LocationService.saveLocationToDatabase(currentCourier.id, {
        coords: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: accuracy || null,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error('Kurye konum güncelleme hatası:', error)
    }
  }

  // Veri yükleme
  const loadAssignments = useCallback(async () => {
    const currentCourier = courierRef.current
    if (!currentCourier) {
      return
    }
    
    try {
      const assignmentsData = await DeliveryService.getActiveAssignments(currentCourier.id)
      setAssignments(assignmentsData)
    } catch (error) {
      console.error('Atama verilerini yükleme hatası:', error)
    }
  }, [])

  // Güncel kurye durumunu yükle
  const loadCourierStatus = useCallback(async () => {
    const currentCourier = courierRef.current
    if (!currentCourier?.id) return

    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('id', currentCourier.id)
        .single()

      if (error) {
        console.error('Kurye durumu yükleme hatası:', error)
        return
      }

      if (data) {
        console.log('Güncel kurye durumu yüklendi:', data)
        setCourier(data)
        setIsOnline(data.is_available)
      }
    } catch (error) {
      console.error('Kurye durumu yükleme hatası:', error)
    }
  }, [])

  const loadStats = useCallback(async () => {
    const currentCourier = courierRef.current
    if (!currentCourier) return

    try {
      const statsData = await DeliveryService.getCourierStats(currentCourier.id)
      setStats(statsData)
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error)
    }
  }, [])

  // Real-time subscription'ları başlat
  const startRealtimeSubscriptions = useCallback(() => {
    const currentCourier = courierRef.current
    if (!currentCourier?.id) {
      return
    }

    // Delivery assignments için realtime subscription
    const assignmentSubscription = supabase
      .channel('delivery_assignments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_assignments',
          filter: `courier_id=eq.${currentCourier.id}`,
        },
        (payload) => {
          // Atamaları yeniden yükle
          loadAssignments()
        }
      )
      .subscribe()

    // Courier locations için realtime subscription (diğer kuryelerin konumları)
    const courierLocSubscription = supabase
      .channel('courier_locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courier_locations',
        },
        (payload) => {
          // Haritayı güncelle (gerekirse)
        }
      )
      .subscribe()

    setRealtimeSubscription(assignmentSubscription)
    setCourierLocationSubscription(courierLocSubscription)
  }, [loadAssignments])

  // Real-time subscription'ları durdur
  const stopRealtimeSubscriptions = useCallback(() => {
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription)
      setRealtimeSubscription(null)
    }
    if (courierLocationSubscription) {
      supabase.removeChannel(courierLocationSubscription)
      setCourierLocationSubscription(null)
    }
  }, [realtimeSubscription, courierLocationSubscription])

  // Atamayı kabul et
  const acceptAssignment = async (assignmentId: string) => {
    try {
      setIsUpdatingLocation(assignmentId)
      const success = await DeliveryService.acceptAssignment(assignmentId)
      
      if (success) {
        Alert.alert('Başarılı', '✅ Sipariş kabul edildi! Restorana gidin.')
        loadAssignments()
      } else {
        Alert.alert('Hata', 'Sipariş kabul edilemedi')
      }
    } catch (error) {
      console.error('Atama kabul hatası:', error)
      Alert.alert('Hata', 'Sipariş kabul edilemedi')
    } finally {
      setIsUpdatingLocation(null)
    }
  }

  // Atama durumunu güncelle - Sadece 2 durum: picked_up ve delivered
  const updateAssignmentStatus = async (assignmentId: string, newStatus: string) => {
    try {
      setIsUpdatingLocation(assignmentId)
      
      let success = false
      let successMessage = ''
      
      switch (newStatus) {
        case 'picked_up':
          success = await DeliveryService.markAsPickedUp(assignmentId)
          successMessage = 'Sipariş teslim alındı! Müşteriye götürülüyor...'
          break
        case 'delivered':
          success = await DeliveryService.markAsDelivered(assignmentId)
          successMessage = 'Sipariş teslim edildi! Tebrikler!'
          break
        default:
          Alert.alert('Hata', 'Geçersiz durum')
          return
      }

      if (success) {
        Alert.alert('Başarılı', successMessage)
        await loadAssignments()
        await loadStats()
      } else {
        if (newStatus === 'picked_up') {
          Alert.alert('Hata', 'Sipariş henüz hazır değil! Restoran siparişi hazırladığında teslim alabilirsiniz.')
        } else {
          Alert.alert('Hata', 'Durum güncellenemedi')
        }
      }
    } catch (error) {
      console.error('Durum güncelleme hatası:', error)
      Alert.alert('Hata', 'Durum güncellenirken hata oluştu')
    } finally {
      setIsUpdatingLocation(null)
    }
  }

  // Müsaitlik durumunu değiştir
  const toggleAvailability = async () => {
    const currentCourier = courierRef.current
    if (!currentCourier) return

    try {
      const newAvailability = !currentCourier.is_available
      
      const success = await AuthService.updateCourierStatus(
        currentCourier.id, 
        newAvailability ? 'available' : 'offline'
      )
      
      if (success) {
        // Courier state'ini güncelle
        const updatedCourier = {
          ...currentCourier,
          is_available: newAvailability,
          courier_status: (newAvailability ? 'available' : 'offline') as 'available' | 'offline'
        }
        setCourier(updatedCourier)
        setIsOnline(newAvailability)
        
        // Başarı mesajı göster
        Alert.alert(
          'Durum Güncellendi',
          newAvailability ? 'Çevrimiçi oldunuz. Sipariş almaya hazırsınız!' : 'Çevrimdışı oldunuz.',
          [{ text: 'Tamam' }]
        )
        
        if (newAvailability) {
          // Mevcut konumu hemen güncelle
          if (locationPermission) {
            await startLocationTracking()
          }
        } else {
          // Çevrimdışı olduğunda konum takibini durdur
          if (locationSubscription) {
            locationSubscription.remove()
            setLocationSubscription(null)
            setIsTracking(false)
          }
        }
        
        // Atamaları yenile
        setTimeout(() => {
          loadAssignments()
        }, 500)
      } else {
        Alert.alert('Hata', 'Durum güncellenemedi. Lütfen tekrar deneyin.')
      }
    } catch (error) {
      console.error('Müsaitlik hatası:', error)
      Alert.alert('Hata', 'Durum güncellenirken hata oluştu.')
    }
  }

  // Test bildirim gönder
  const sendTestNotification = async () => {
    await NotificationService.showLocalNotification(
      'Test Bildirimi',
      'Bu bir test bildirimidir. Bildirim sistemi çalışıyor!',
      { type: 'test' }
    )
  }

  // Çıkış yapma
  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              if (locationSubscription) {
                locationSubscription.remove()
              }
              await AuthService.logout()
              navigation.replace('Login')
            } catch (error) {
              console.error('Logout error:', error)
            }
          }
        }
      ]
    )
  }

  // Harita merkezini otomatik güncelle
  const updateMapCenter = useCallback(() => {
    const currentAssignments = assignmentsRef.current
    const currentLoc = currentLocationRef.current
    
    if (currentAssignments.length === 0) {
      // Eğer atama yoksa mevcut konumu kullan
      if (currentLoc.latitude !== 0 && currentLoc.longitude !== 0) {
        setMapRegion(prev => ({
          ...prev,
          latitude: currentLoc.latitude,
          longitude: currentLoc.longitude,
        }))
      }
      return
    }

    // Tüm konumları topla (kurye + restoran + müşteri)
    const allLocations = []
    
    // Kurye konumu
    if (currentLoc.latitude !== 0 && currentLoc.longitude !== 0) {
      allLocations.push(currentLoc)
    }

    // Atama konumları
    currentAssignments.forEach(assignment => {
      // Nested veri yapısını parse et
      const order = (assignment as any).orders || assignment.order
      const restaurant = order?.restaurants || assignment.restaurant
      
      // Restoran konumu
      if (restaurant?.latitude && restaurant?.longitude) {
        allLocations.push({
          latitude: restaurant.latitude,
          longitude: restaurant.longitude
        })
      }
      
      // Müşteri konumu
      if (order?.customer_address_lat && order?.customer_address_lng) {
        const lat = parseFloat(order.customer_address_lat)
        const lng = parseFloat(order.customer_address_lng)
        
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          allLocations.push({
            latitude: lat,
            longitude: lng
          })
        }
      }
    })

    if (allLocations.length > 0) {
      // Ortalama konum hesapla
      const avgLat = allLocations.reduce((sum, loc) => sum + loc.latitude, 0) / allLocations.length
      const avgLng = allLocations.reduce((sum, loc) => sum + loc.longitude, 0) / allLocations.length
      
      // Delta hesapla (tüm noktaları kapsayacak şekilde)
      const minLat = Math.min(...allLocations.map(loc => loc.latitude))
      const maxLat = Math.max(...allLocations.map(loc => loc.latitude))
      const minLng = Math.min(...allLocations.map(loc => loc.longitude))
      const maxLng = Math.max(...allLocations.map(loc => loc.longitude))
      
      const latDelta = Math.max((maxLat - minLat) * 1.5, 0.01)
      const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.01)

      setMapRegion({
        latitude: avgLat,
        longitude: avgLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      })
    }
  }, [])

  // Sayfa yüklendiğinde - sadece bir kez çalışır
  useFocusEffect(
    useCallback(() => {
      if (isInitializedRef.current) {
        return
      }
      
      isInitializedRef.current = true
      
      const loadData = async () => {
        await loadAssignments()
        await loadStats()
        await loadCourierStatus()
        setLoading(false)
      }
      
      loadData()
      NotificationService.requestPermission()
      
      // Bildirim listener'ı sadece bir kez başlat
      if (!notificationSubscription) {
        const subscription = NotificationService.startNotificationListener(courier.id)
        setNotificationSubscription(subscription)
      }
      
      // Konum takibini başlat
      if (locationSubscription === null) {
        startLocationTracking()
      }

      // Real-time subscription'ları başlat
      startRealtimeSubscriptions()

      // Cleanup function
      return () => {
        isInitializedRef.current = false
        stopRealtimeSubscriptions()
      }
    }, [])
  )

  // Harita merkezini güncelle - sadece assignments veya currentLocation değiştiğinde
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateMapCenter()
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [assignments.length, currentLocation.latitude, currentLocation.longitude])

  // Cleanup
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove()
      }
      if (notificationSubscription) {
        NotificationService.stopNotificationListener(notificationSubscription)
      }
      stopRealtimeSubscriptions()
    }
  }, [])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Kurye bilgileri yükleniyor...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Tam Ekran Harita */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={mapRegion}
        customMapStyle={mapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onMapReady={() => setIsMapLoaded(true)}
        onPress={() => setSelectedAssignment(null)}
      >
        {/* Kurye konumu */}
        {isMapLoaded && currentLocation && 
         typeof currentLocation.latitude === 'number' && 
         typeof currentLocation.longitude === 'number' &&
         !isNaN(currentLocation.latitude) && 
         !isNaN(currentLocation.longitude) && 
         currentLocation.latitude !== 0 && 
         currentLocation.longitude !== 0 && (
          <Marker
            coordinate={currentLocation}
            image={getOwnCourierIcon()}
            title="Kurye Konumu"
            pinColor="#007BFF"
          />
        )}

        {/* Aktif atamaların konumları */}
        {isMapLoaded && assignments.map((assignment) => {
          // Assignment verilerini doğru şekilde parse et
          // Supabase nested query'den gelen veriler
          const order = (assignment as any).orders || assignment.order
          const restaurant = order?.restaurants || assignment.restaurant
          
          // Sipariş durumuna göre hangi marker'ların gösterileceğini belirle
          // Sadece assigned durumunda restoran göster, picked_up durumunda müşteri göster
          const shouldShowRestaurant = assignment.status === 'assigned'
          const shouldShowCustomer = assignment.status === 'picked_up'
          
          return (
            <React.Fragment key={assignment.id}>
              {/* Restoran konumu - sadece assigned durumunda göster */}
              {shouldShowRestaurant && restaurant && 
               restaurant.latitude && restaurant.longitude && 
               typeof restaurant.latitude === 'number' && 
               typeof restaurant.longitude === 'number' &&
               !isNaN(restaurant.latitude) && 
               !isNaN(restaurant.longitude) &&
               restaurant.latitude !== 0 && 
               restaurant.longitude !== 0 && (
                <Marker
                  key={`restaurant-${assignment.id}`}
                  coordinate={{
                    latitude: restaurant.latitude,
                    longitude: restaurant.longitude
                  }}
                  image={getRestaurantIcon()}
                  onPress={() => setSelectedAssignment(assignment)}
                  title={`Restoran: ${restaurant.name}`}
                  description={`Sipariş hazır olduğunda teslim alın`}
                  pinColor="#EF4444"
                />
              )}

              {/* Müşteri konumu - sadece picked_up durumunda göster */}
              {shouldShowCustomer && order?.customer_address_lat && order?.customer_address_lng && (() => {
                const lat = parseFloat(order.customer_address_lat)
                const lng = parseFloat(order.customer_address_lng)
                
                // Koordinat değerlerini kontrol et
                if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                  return null
                }
                
                return (
                  <Marker
                    key={`customer-${assignment.id}`}
                    coordinate={{
                      latitude: lat,
                      longitude: lng
                    }}
                    image={order.is_location_verified ? getCustomerVerifiedIcon() : getCustomerUnverifiedIcon()}
                    onPress={() => setSelectedAssignment(assignment)}
                    title={`Müşteri: ${order.customer_name}`}
                    description={`Adres: ${order.customer_address}\nTelefon: ${order.customer_phone || 'Belirtilmemiş'}`}
                    pinColor={order.is_location_verified ? "#10B981" : "#F59E0B"}
                  />
                )
              })()}
            </React.Fragment>
          )
        })}
      </MapView>

      {/* Üst Bar - Minimal */}
      <View style={styles.topBar}>
        <View style={styles.topBarContent}>
          <TouchableOpacity
            onPress={toggleAvailability}
            style={[
              styles.availabilityButton,
              { backgroundColor: isOnline ? '#10B981' : '#EF4444' }
            ]}
          >
            <Ionicons 
              name={isOnline ? 'checkmark-circle' : 'close-circle'} 
              size={16} 
              color="#FFFFFF" 
              style={{ marginRight: 8 }}
            />
            <Text style={styles.availabilityText}>
              {isOnline ? 'ÇEVRİMİÇİ' : 'ÇEVRİMDIŞI - TIKLA'}
            </Text>
          </TouchableOpacity>
          
          {/* Kurye Durumu Badge */}
          {courier.courier_status && (
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(courier.courier_status) }
            ]}>
              <Text style={styles.statusBadgeText}>
                {getStatusText(courier.courier_status)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Alt Panel - Aktif Siparişler */}
      {assignments.length > 0 ? (
        <View style={styles.bottomPanel}>
          <View style={styles.bottomHeader}>
            <Text style={styles.bottomTitle}>Aktif Siparişler ({assignments.length})</Text>
          </View>
          
          <ScrollView style={styles.assignmentsList} showsVerticalScrollIndicator={false}>
            {assignments.map((assignment) => {
              // Nested veri yapısını parse et
              const order = (assignment as any).orders || assignment.order
              const restaurant = order?.restaurants || assignment.restaurant
              
              // Sipariş durumunu belirle
              const orderStatus = order?.status || 'unknown'
              const isOrderReady = orderStatus === 'ready_for_pickup'
              
              return (
                <View key={assignment.id} style={styles.assignmentCard}>
                  <View style={styles.assignmentHeader}>
                    <Text style={styles.assignmentTitle}>
                      {restaurant?.name || 'Restoran'}
                    </Text>
                    <Text style={styles.assignmentCustomer}>
                      Müşteri: {order?.customer_name}
                    </Text>
                    <Text style={styles.assignmentAddress}>
                      📍 {order?.customer_address}
                    </Text>
                    {order?.customer_phone && (
                      <Text style={styles.assignmentPhone}>
                        📞 {order.customer_phone}
                      </Text>
                    )}
                    <Text style={styles.assignmentStatus}>
                      Durum: {getAssignmentStatusText(assignment.status)}
                    </Text>
                    <Text style={[
                      styles.orderStatus,
                      { color: isOrderReady ? '#10B981' : '#F59E0B' }
                    ]}>
                      Sipariş: {getOrderStatusText(orderStatus)}
                    </Text>
                  </View>
                  
                  <View style={styles.assignmentFooter}>
                    <View style={styles.assignmentFeeContainer}>
                      <Text style={styles.assignmentFee}>
                        ₺{assignment.delivery_fee}
                      </Text>
                      <Text style={styles.assignmentFeeLabel}>
                        Teslimat Ücreti
                      </Text>
                    </View>
                    
                    {/* Sadece 2 durum butonu */}
                    <View style={styles.assignmentActions}>
                      {assignment.status === 'assigned' && (
                        <TouchableOpacity
                          onPress={() => updateAssignmentStatus(assignment.id, 'picked_up')}
                          style={[
                            styles.pickupButton,
                            { opacity: isOrderReady ? 1 : 0.5 }
                          ]}
                          disabled={isUpdatingLocation === assignment.id || !isOrderReady}
                        >
                          {isUpdatingLocation === assignment.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.pickupButtonText}>
                              {isOrderReady ? 'Teslim Al' : 'Sipariş Hazırlanıyor...'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                      
                      {assignment.status === 'picked_up' && (
                        <TouchableOpacity
                          onPress={() => updateAssignmentStatus(assignment.id, 'delivered')}
                          style={styles.deliveredButton}
                          disabled={isUpdatingLocation === assignment.id}
                        >
                          {isUpdatingLocation === assignment.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.deliveredButtonText}>Teslim Et</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )
            })}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.bottomPanel}>
          <View style={styles.emptyState}>
            {isOnline ? (
              <View style={styles.waitingState}>
                <View style={styles.pulseContainer}>
                  <View style={[styles.pulse, styles.pulse1]} />
                  <View style={[styles.pulse, styles.pulse2]} />
                  <View style={[styles.pulse, styles.pulse3]} />
                </View>
                <Text style={styles.waitingText}>Siparişler aranıyor...</Text>
                <View style={styles.onlineBadge}>
                  <Text style={styles.onlineBadgeText}>Çevrimiçi</Text>
                </View>
              </View>
            ) : (
              <View style={styles.offlineState}>
                <Text style={styles.offlineText}>Çevrimdışı</Text>
                <Text style={styles.offlineSubtext}>Sipariş almak için çevrimiçi olun</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Sağ üst köşe butonları */}
      <View style={styles.rightButtons}>
        <TouchableOpacity
          style={styles.rightButton}
          onPress={sendTestNotification}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.rightButton}
          onPress={() => {
            console.log('Mevcut courier state:', courier)
            console.log('isOnline state:', isOnline)
            Alert.alert(
              'Durum Bilgisi',
              `Courier ID: ${courier.id}\nIs Available: ${courier.is_available}\nStatus: ${courier.courier_status}\nIsOnline State: ${isOnline}`,
              [{ text: 'Tamam' }]
            )
          }}
        >
          <Ionicons name="information-circle-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.rightButton}
          onPress={() => {
            Alert.alert(
              'Profil',
              `Kurye: ${courier.full_name}\nTelefon: ${courier.phone || 'Belirtilmemiş'}`,
              [{ text: 'Tamam' }]
            )
          }}
        >
          <Ionicons name="person-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.rightButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// Yardımcı fonksiyonlar
const getStatusColor = (status: string) => {
  switch (status) {
    case 'available': return '#10B981'
    case 'busy': return '#F59E0B'
    case 'on_delivery': return '#FF9500'
    case 'offline': return '#6B7280'
    case 'inactive': return '#EF4444'
    default: return '#3B82F6'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'available': return '🟢 Müsait'
    case 'busy': return '🟡 Meşgul'
    case 'on_delivery': return '🚗 Teslimat Yapıyor'
    case 'offline': return '⚪ Çevrimdışı'
    case 'inactive': return '🔴 Hesap Pasif'
    default: return '🔵 ' + status
  }
}

const getAssignmentStatusText = (status: string) => {
  switch (status) {
    case 'assigned': return 'Atandı'
    case 'picked_up': return 'Teslim Alındı - Yolda'
    case 'delivered': return 'Teslim Edildi'
    default: return status
  }
}

const getOrderStatusText = (status: string) => {
  switch (status) {
    case 'confirmed': return 'Onaylandı'
    case 'preparing': return 'Hazırlanıyor'
    case 'ready_for_pickup': return '✅ Teslim Alınabilir'
    case 'on_the_way': return 'Yolda'
    case 'delivered': return 'Teslim Edildi'
    default: return status
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  map: {
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  availabilityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxHeight: height * 0.4,
  },
  bottomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bottomTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  assignmentsList: {
    maxHeight: height * 0.25,
  },
  assignmentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  assignmentHeader: {
    marginBottom: 8,
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  assignmentCustomer: {
    fontSize: 12,
    color: '#6B7280',
  },
  assignmentAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  assignmentPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  assignmentStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  assignmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentFeeContainer: {
    alignItems: 'center',
  },
  assignmentFee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  assignmentFeeLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  assignmentActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pickupButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pickupButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  onWayButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  onWayButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deliveredButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deliveredButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  waitingState: {
    alignItems: 'center',
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginHorizontal: 2,
  },
  pulse1: {
    // Animation will be handled by Animated API if needed
  },
  pulse2: {
    // Animation delay
  },
  pulse3: {
    // Animation delay
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 8,
  },
  onlineBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineState: {
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  offlineSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  rightButtons: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
  },
  rightButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
}) 