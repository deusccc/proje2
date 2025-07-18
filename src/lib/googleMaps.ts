// Google Maps API Global Yükleme Sistemi
let isApiLoaded = false
let loadPromise: Promise<void> | null = null
let loadError: Error | null = null
let scriptElement: HTMLScriptElement | null = null

export const loadGoogleMapsApi = (): Promise<void> => {
  // Eğer API zaten yüklüyse, mevcut promise'ı döndür
  if (isApiLoaded) {
    return Promise.resolve()
  }

  // Eğer yükleme devam ediyorsa, mevcut promise'ı döndür
  if (loadPromise) {
    return loadPromise
  }

  // Eğer daha önce hata oluştuysa, hatayı fırlat
  if (loadError) {
    return Promise.reject(loadError)
  }

  // Script zaten yüklenmiş mi kontrol et
  if (typeof window !== 'undefined' && window.google?.maps) {
    isApiLoaded = true
    return Promise.resolve()
  }

  // Script zaten DOM'da var mı kontrol et
  if (typeof window !== 'undefined') {
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      scriptElement = existingScript as HTMLScriptElement
      // Mevcut script'in yüklenmesini bekle
      loadPromise = new Promise<void>((resolve, reject) => {
        const checkLoaded = () => {
          if (window.google?.maps) {
            isApiLoaded = true
            loadPromise = null
            resolve()
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
      })
      return loadPromise
    }
  }

  // API'yi yükle
  loadPromise = new Promise<void>((resolve, reject) => {
    // API anahtarını kontrol et
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      const error = new Error('Google Maps API anahtarı bulunamadı')
      loadError = error
      reject(error)
      return
    }

    // Script'i yükle
    scriptElement = document.createElement('script')
    scriptElement.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=tr&region=TR`
    scriptElement.async = true
    scriptElement.defer = true

    scriptElement.onload = () => {
      isApiLoaded = true
      loadPromise = null
      resolve()
    }

    scriptElement.onerror = () => {
      const error = new Error('Google Maps API yüklenemedi')
      loadError = error
      loadPromise = null
      reject(error)
    }

    document.head.appendChild(scriptElement)
  })

  return loadPromise
}

export const isGoogleMapsLoaded = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  return isApiLoaded && !!window.google?.maps
}

export const resetGoogleMapsState = (): void => {
  isApiLoaded = false
  loadPromise = null
  loadError = null
} 