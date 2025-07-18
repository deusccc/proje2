// React Native için Icon Manager (Web CourierIcons.tsx'ten uyarlandı)
import { Platform } from 'react-native'

interface CourierLocation {
  id: string
  full_name: string
  phone: string
  current_latitude: number
  current_longitude: number
  last_location_update: string
  is_available: boolean
  vehicle_type: string
  license_plate: string
  active_assignments: number
  courier_status?: string
}

// React Native için icon sistemi
export class CourierIconManager {
  
  // Ana kurye ikon SVG'si - duruma göre değişen
  static getCourierIcon(courier?: CourierLocation, options?: {
    size?: number
    heading?: number
    showPulse?: boolean
    showNameLabel?: boolean
  }) {
    const size = options?.size || 48
    
    // Durum belirleme
    let statusColor = '#007BFF' // mavi
    
    if (courier) {
      if (!courier.is_available) {
        statusColor = '#9CA3AF' // gri
      } else if (courier.active_assignments && courier.active_assignments > 0) {
        statusColor = '#FF9500' // turuncu
      } else {
        statusColor = '#007BFF' // mavi
      }
    }
    
    // React Native için basit SVG - daha uyumlu
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-6}" 
                fill="${statusColor}" stroke="#ffffff" stroke-width="3"/>
        <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#ffffff" opacity="0.9"/>
        <circle cx="${size/2}" cy="${size/2}" r="4" fill="${statusColor}"/>
        <circle cx="${size-8}" cy="8" r="4" fill="#ffffff" stroke="${statusColor}" stroke-width="2"/>
        <circle cx="${size-8}" cy="8" r="2.5" fill="${statusColor}"/>
      </svg>
    `
    
    return {
      uri: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      width: size,
      height: size,
    }
  }
  
  // Şirket dashboard'ı için kurye ikonu
  static getCompanyCourierIcon(courier: CourierLocation) {
    return CourierIconManager.getCourierIcon(courier, {
      size: 40,
      heading: 0,
      showPulse: courier.is_available,
      showNameLabel: false
    })
  }
  
  // Kendi kurye ikonu (dashboard'da)
  static getOwnCourierIcon(size: number = 44) {
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-6}" 
                fill="#007BFF" stroke="#ffffff" stroke-width="3"/>
        <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#ffffff" opacity="0.9"/>
        <circle cx="${size/2}" cy="${size/2}" r="6" fill="#007BFF"/>
        <circle cx="${size-8}" cy="8" r="4" fill="#ffffff" stroke="#007BFF" stroke-width="2"/>
        <circle cx="${size-8}" cy="8" r="2.5" fill="#10B981"/>
      </svg>
    `
    
    return {
      uri: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      width: size,
      height: size,
    }
  }
  
  // Yönlü kurye ikonu
  static getDirectionalCourierIcon(courier: CourierLocation, heading: number) {
    return CourierIconManager.getCourierIcon(courier, {
      size: 44,
      heading: heading,
      showPulse: courier.is_available,
      showNameLabel: false
    })
  }
  
  // Restoran ikonu
  static getRestaurantIcon(size: number = 32) {
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-4}" 
                fill="#EF4444" stroke="#ffffff" stroke-width="3"/>
        <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#ffffff" opacity="0.9"/>
        <rect x="${size/2-4}" y="${size/2-4}" width="8" height="8" fill="#EF4444"/>
      </svg>
    `
    
    return {
      uri: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      width: size,
      height: size,
    }
  }
  
  // Müşteri ikonu (doğrulanmış)
  static getCustomerVerifiedIcon(size: number = 28) {
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-3}" 
                fill="#10B981" stroke="#ffffff" stroke-width="2"/>
        <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#ffffff" opacity="0.9"/>
        <polygon points="${size/2-3},${size/2-1} ${size/2-1},${size/2+1} ${size/2+3},${size/2-3}" fill="#10B981"/>
        <circle cx="${size-6}" cy="6" r="3" fill="#ffffff"/>
        <polygon points="${size-8},6 ${size-6},8 ${size-4},4" fill="#10B981"/>
      </svg>
    `
    
    return {
      uri: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      width: size,
      height: size,
    }
  }
  
  // Müşteri ikonu (doğrulanmamış)
  static getCustomerUnverifiedIcon(size: number = 28) {
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-3}" 
                fill="#F59E0B" stroke="#ffffff" stroke-width="2"/>
        <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#ffffff" opacity="0.9"/>
        <polygon points="${size/2-3},${size/2-1} ${size/2-1},${size/2+1} ${size/2+3},${size/2-3}" fill="#F59E0B"/>
        <circle cx="${size-6}" cy="6" r="3" fill="#ffffff"/>
        <circle cx="${size-6}" cy="5" r="1" fill="#F59E0B"/>
        <rect x="${size-6.5}" y="6.5" width="1" height="1" fill="#F59E0B"/>
      </svg>
    `
    
    return {
      uri: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      width: size,
      height: size,
    }
  }
}

// Kolay kullanım için direkt export edilmiş fonksiyonlar
export const getCourierIcon = CourierIconManager.getCourierIcon
export const getCompanyCourierIcon = CourierIconManager.getCompanyCourierIcon
export const getOwnCourierIcon = CourierIconManager.getOwnCourierIcon
export const getDirectionalCourierIcon = CourierIconManager.getDirectionalCourierIcon
export const getRestaurantIcon = CourierIconManager.getRestaurantIcon
export const getCustomerVerifiedIcon = CourierIconManager.getCustomerVerifiedIcon
export const getCustomerUnverifiedIcon = CourierIconManager.getCustomerUnverifiedIcon 