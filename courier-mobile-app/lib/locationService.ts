import * as Location from 'expo-location'
import { supabase } from './supabase'
import { LocationPermission, CourierLocation } from '../types'
import { Platform } from 'react-native'

export class LocationService {
  private static watchId: Location.LocationSubscription | null = null

  static async requestPermission(): Promise<LocationPermission> {
    try {
      // Web platformunda konum izni yok
      if (Platform.OS === 'web') {
        console.warn('Web platformunda konum servisi desteklenmiyor')
        return {
          granted: false,
          canAskAgain: false,
          status: 'denied'
        }
      }

      const { status } = await Location.requestForegroundPermissionsAsync()
      
      return {
        granted: status === 'granted',
        canAskAgain: status !== 'denied',
        status: status === 'granted' ? 'granted' : 
                status === 'denied' ? 'denied' : 'undetermined'
      }
    } catch (error) {
      console.error('Location permission error:', error)
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      }
    }
  }

  static async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      // Web platformunda konum servisi yok
      if (Platform.OS === 'web') {
        console.warn('Web platformunda konum servisi desteklenmiyor')
        return null
      }

      const { status } = await Location.getForegroundPermissionsAsync()
      
      if (status !== 'granted') {
        const permission = await this.requestPermission()
        if (!permission.granted) {
          return null
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10
      })

      return location
    } catch (error) {
      console.error('Get current location error:', error)
      return null
    }
  }

  static async startLocationTracking(
    courierId: string,
    onLocationUpdate?: (location: Location.LocationObject) => void
  ): Promise<boolean> {
    try {
      // Web platformunda konum takibi yok
      if (Platform.OS === 'web') {
        console.warn('Web platformunda konum takibi desteklenmiyor')
        return false
      }

      const permission = await this.requestPermission()
      if (!permission.granted) {
        return false
      }

      // Önceki tracking'i durdur
      if (this.watchId) {
        this.stopLocationTracking()
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // 10 saniye
          distanceInterval: 20 // 20 metre
        },
        async (location) => {
          // Konum güncelleme callback'i
          if (onLocationUpdate) {
            onLocationUpdate(location)
          }

          // Supabase'e konum kaydet
          await this.saveLocationToDatabase(courierId, location)
        }
      )

      return true
    } catch (error) {
      console.error('Start location tracking error:', error)
      return false
    }
  }

  static stopLocationTracking(): void {
    if (this.watchId) {
      this.watchId.remove()
      this.watchId = null
    }
  }

  static async saveLocationToDatabase(
    courierId: string, 
    location: Location.LocationObject
  ): Promise<boolean> {
    try {
      // Kurye tablosundaki mevcut konumu güncelle - Supabase fonksiyonunu kullan
      const { data, error } = await supabase
        .rpc('update_courier_location', {
          p_courier_id: courierId,
          p_latitude: location.coords.latitude,
          p_longitude: location.coords.longitude,
          p_accuracy: location.coords.accuracy
        })

      if (error) {
        console.error('Supabase RPC error:', error)
        return false
      }

      if (data && !data.success) {
        // Kurye çevrimdışı olabilir, bu normal bir durum - sadece debug için log
        if (data.error_code === 'COURIER_OFFLINE') {
          console.log('Kurye çevrimdışı - konum kaydedilmiyor')
        } else {
          console.warn('Konum güncelleme hatası:', data.error)
        }
        return false
      }

      return true
    } catch (error) {
      console.error('Save location to database error:', error)
      return false
    }
  }

  static async getLocationHistory(
    courierId: string,
    limit: number = 50
  ): Promise<CourierLocation[]> {
    try {
      const { data, error } = await supabase
        .from('courier_locations')
        .select('*')
        .eq('courier_id', courierId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        // RLS hatası detayını kontrol et
        if (error.code === '42501' || error.message?.includes('RLS')) {
          console.warn('RLS policy nedeniyle konum geçmişi alınamadı:', error.message)
        } else {
          console.error('Get location history error:', error)
        }
        return []
      }

      return data || []
    } catch (error) {
      console.error('Get location history error:', error)
      return []
    }
  }

  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c * 1000 // Convert to meters
    return distance
  }

  // Sahte konum verisi (test için)
  static getMockLocation(): Location.LocationObject {
    return {
      coords: {
        latitude: 41.0082,
        longitude: 28.9784,
        altitude: 0,
        accuracy: 5,
        altitudeAccuracy: 1,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    }
  }
} 