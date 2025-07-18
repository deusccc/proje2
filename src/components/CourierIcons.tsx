// Şirket dashboard'ından doğru CourierLocation tipini kullan
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
}

// Google Maps API yüklenme kontrolü
const isGoogleMapsAvailable = () => {
  return typeof window !== 'undefined' && window.google?.maps
}

// Kurye ikon sistemini yönetmek için yardımcı sınıf
export class CourierIconManager {
  
  // Ana kurye ikon SVG'si - duruma göre değişen
  static getCourierIcon(courier?: CourierLocation, options?: {
    size?: number
    heading?: number
    showPulse?: boolean
    showNameLabel?: boolean
  }) {
    // Google Maps API kontrol et - yoksa undefined döndür
    if (!isGoogleMapsAvailable()) {
      return undefined
    }
    
    const size = options?.size || 48
    const heading = options?.heading || 0
    const showPulse = options?.showPulse ?? true
    const showNameLabel = options?.showNameLabel ?? false
    
    // Durum belirleme
    let status = 'available' // varsayılan
    let statusColor = '#007BFF' // mavi
    let statusText = 'Aktif'
    
    if (courier) {
      if (!courier.is_available) {
        status = 'offline'
        statusColor = '#9CA3AF' // gri
        statusText = 'Çevrimdışı'
      } else if (courier.active_assignments && courier.active_assignments > 0) {
        status = 'delivering'
        statusColor = '#FF9500' // turuncu
        statusText = 'Teslimat'
      } else {
        status = 'available'
        statusColor = '#007BFF' // mavi
        statusText = 'Müsait'
      }
    }
    
    // Motosiklet silueti path
    const motorcyclePath = `
      M18.5,14.5c-1.4,0-2.5,1.1-2.5,2.5s1.1,2.5,2.5,2.5s2.5-1.1,2.5-2.5S19.9,14.5,18.5,14.5z
      M7.5,14.5C6.1,14.5,5,15.6,5,17s1.1,2.5,2.5,2.5S10,18.4,10,17S8.9,14.5,7.5,14.5z
      M15,12h-3l-1-3h2c0.6,0,1,0.4,1,1V12z
      M12,8c-0.6,0-1,0.4-1,1s0.4,1,1,1s1-0.4,1-1S12.6,8,12,8z
      M16,13h3l-1-2H16V13z
    `
    
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
          </filter>
          ${showPulse ? `
          <animateTransform id="pulse" attributeName="transform" attributeType="XML" type="scale" 
                          values="1;1.1;1" dur="2s" repeatCount="indefinite"/>
          ` : ''}
        </defs>
        
        <!-- Pulsing outer ring (sadece aktif durumlarda) -->
        ${showPulse && status !== 'offline' ? `
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-4}" 
                fill="none" stroke="${statusColor}" stroke-width="2" opacity="0.3">
          <animate attributeName="r" values="${size/2-8};${size/2-2};${size/2-8}" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        ` : ''}
        
        <!-- Ana daire (gövde) -->
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-6}" 
                fill="${statusColor}" stroke="#ffffff" stroke-width="3" filter="url(#shadow)"/>
        
        <!-- İç gölge efekti -->
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-8}" 
                fill="none" stroke="#ffffff" stroke-width="1" opacity="0.2"/>
        
        <!-- Motosiklet ikonu (merkez) -->
        <g transform="translate(${size/2-12}, ${size/2-10}) scale(1) rotate(${heading}, 12, 10)">
          <path d="${motorcyclePath}" fill="#ffffff" opacity="0.9"/>
          <!-- Kurye kaskı -->
          <circle cx="12" cy="6" r="2.5" fill="#ffffff" opacity="0.9"/>
          <ellipse cx="12" cy="7" rx="1.5" ry="1" fill="#ffffff" opacity="0.7"/>
        </g>
        
        <!-- Durum göstergesi (küçük nokta) -->
        <circle cx="${size-8}" cy="8" r="4" fill="#ffffff" stroke="${statusColor}" stroke-width="2"/>
        <circle cx="${size-8}" cy="8" r="2.5" fill="${statusColor}"/>
        
        <!-- İsim etiketi (opsiyonel) -->
        ${showNameLabel && courier ? `
        <rect x="${size/2-20}" y="${size+5}" width="40" height="16" rx="8" 
              fill="#000" fill-opacity="0.7"/>
        <text x="${size/2}" y="${size+14}" text-anchor="middle" 
              fill="#ffffff" font-size="10" font-family="Arial, sans-serif" font-weight="bold">
          ${courier.full_name?.split(' ')[0] || 'Kurye'}
        </text>
        ` : ''}
      </svg>
    `
    
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(size, size + (showNameLabel ? 20 : 0)),
      anchor: new window.google.maps.Point(size/2, size/2)
    }
  }
  
  // Şirket dashboard için kurye ikonu
  static getCompanyCourierIcon(courier: CourierLocation) {
    return CourierIconManager.getCourierIcon(courier, {
      size: 36,
      showPulse: true,
      showNameLabel: false
    })
  }
  
  // Kurye dashboard için kendi ikon
  static getOwnCourierIcon(heading?: number) {
    return CourierIconManager.getCourierIcon(undefined, {
      size: 40,
      heading: heading,
      showPulse: true,
      showNameLabel: false
    })
  }
  
  // Yön takipli kurye ikonu (GPS heading ile)
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
    // Google Maps API kontrol et - yoksa undefined döndür
    if (!isGoogleMapsAvailable()) {
      return undefined
    }
    
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
          </filter>
        </defs>
        
        <!-- Ana daire -->
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-4}" 
                fill="#EF4444" stroke="#ffffff" stroke-width="3" filter="url(#shadow)"/>
        
        <!-- Restoran ikonu -->
        <g transform="translate(${size/2-8}, ${size/2-8})">
          <!-- Bina -->
          <rect x="2" y="6" width="12" height="8" fill="#ffffff" opacity="0.9"/>
          <rect x="4" y="8" width="2" height="2" fill="#EF4444"/>
          <rect x="7" y="8" width="2" height="2" fill="#EF4444"/>
          <rect x="10" y="8" width="2" height="2" fill="#EF4444"/>
          <!-- Çatı -->
          <polygon points="1,6 8,2 15,6" fill="#ffffff" opacity="0.9"/>
          <!-- Kapı -->
          <rect x="6" y="11" width="4" height="3" fill="#EF4444"/>
        </g>
      </svg>
    `
    
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size/2, size/2)
    }
  }
  
  // Müşteri ikonu (doğrulanmış)
  static getCustomerVerifiedIcon(size: number = 28) {
    // Google Maps API kontrol et - yoksa undefined döndür
    if (!isGoogleMapsAvailable()) {
      return undefined
    }
    
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
          </filter>
        </defs>
        
        <!-- Ana daire -->
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-3}" 
                fill="#10B981" stroke="#ffffff" stroke-width="2" filter="url(#shadow)"/>
        
        <!-- Ev ikonu -->
        <g transform="translate(${size/2-6}, ${size/2-6})">
          <polygon points="6,2 2,6 2,10 10,10 10,6" fill="#ffffff" opacity="0.9"/>
          <rect x="4" y="7" width="4" height="3" fill="#ffffff" opacity="0.9"/>
          <rect x="5" y="8" width="1" height="1" fill="#10B981"/>
          <rect x="7" y="8" width="1" height="1" fill="#10B981"/>
        </g>
        
        <!-- Doğrulama tik işareti -->
        <circle cx="${size-6}" cy="6" r="3" fill="#ffffff"/>
        <path d="M${size-8},6 L${size-6},8 L${size-4},4" stroke="#10B981" stroke-width="1.5" fill="none"/>
      </svg>
    `
    
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size/2, size/2)
    }
  }
  
  // Müşteri ikonu (doğrulanmamış)
  static getCustomerUnverifiedIcon(size: number = 28) {
    // Google Maps API kontrol et - yoksa undefined döndür
    if (!isGoogleMapsAvailable()) {
      return undefined
    }
    
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
          </filter>
        </defs>
        
        <!-- Ana daire -->
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-3}" 
                fill="#F59E0B" stroke="#ffffff" stroke-width="2" filter="url(#shadow)"/>
        
        <!-- Ev ikonu -->
        <g transform="translate(${size/2-6}, ${size/2-6})">
          <polygon points="6,2 2,6 2,10 10,10 10,6" fill="#ffffff" opacity="0.9"/>
          <rect x="4" y="7" width="4" height="3" fill="#ffffff" opacity="0.9"/>
          <rect x="5" y="8" width="1" height="1" fill="#F59E0B"/>
          <rect x="7" y="8" width="1" height="1" fill="#F59E0B"/>
        </g>
        
        <!-- Uyarı işareti -->
        <circle cx="${size-6}" cy="6" r="3" fill="#ffffff"/>
        <circle cx="${size-6}" cy="5" r="1" fill="#F59E0B"/>
        <rect x="${size-6.5}" y="6.5" width="1" height="1" fill="#F59E0B"/>
      </svg>
    `
    
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size/2, size/2)
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