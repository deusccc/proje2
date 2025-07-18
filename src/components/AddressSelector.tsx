'use client'

import { useState, useCallback, useRef, useEffect, memo } from 'react'
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import { MapPinIcon, MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import GoogleMapsProvider from './GoogleMapsProvider'

interface AddressSelectorProps {
  onAddressSelect: (data: {
    address: string
    latitude: number
    longitude: number
    city?: string
    district?: string
    neighborhood?: string
    postal_code?: string
  }) => void
  initialAddress?: string
  initialLatitude?: number
  initialLongitude?: number
}

const mapContainerStyle = {
  width: '100%',
  height: '320px'
}

const defaultCenter = {
  lat: 39.9334, // Ankara merkezi
  lng: 32.8597
}

const mapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  zoomControl: true,
  disableDefaultUI: false
}

const AddressSelectorContent = memo(function AddressSelectorContent({
  onAddressSelect,
  initialAddress = '',
  initialLatitude = 0,
  initialLongitude = 0
}: AddressSelectorProps) {
  const [address, setAddress] = useState(initialAddress)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualCoordinates, setManualCoordinates] = useState({
    lat: initialLatitude || '',
    lng: initialLongitude || ''
  })
  const [mapCenter, setMapCenter] = useState(() => {
    if (initialLatitude && initialLongitude) {
      return { lat: initialLatitude, lng: initialLongitude }
    }
    return defaultCenter
  })
  const [markerPosition, setMarkerPosition] = useState(() => {
    if (initialLatitude && initialLongitude) {
      return { lat: initialLatitude, lng: initialLongitude }
    }
    return null
  })
  const [retryCount, setRetryCount] = useState(0)

  const autocompleteRef = useRef<google.maps.places.Autocomplete>()
  const mapRef = useRef<google.maps.Map>()

  // onAddressSelect callback'ini useCallback ile optimize et
  const handleAddressSelect = useCallback((data: {
    address: string
    latitude: number
    longitude: number
    city?: string
    district?: string
    neighborhood?: string
    postal_code?: string
  }) => {
    console.log('🗺️ AddressSelector: Konum seçildi:', data)
    onAddressSelect(data)
  }, [onAddressSelect])

  // Initial değerler değiştiğinde state'leri güncelle
  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      setMapCenter({ lat: initialLatitude, lng: initialLongitude })
      setMarkerPosition({ lat: initialLatitude, lng: initialLongitude })
      setManualCoordinates({ 
        lat: initialLatitude.toString(), 
        lng: initialLongitude.toString() 
      })
    }
  }, [initialLatitude, initialLongitude])

  // Initial address değiştiğinde address state'ini güncelle
  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress)
    }
  }, [initialAddress])

  // İlk yükleme sırasında koordinatları güncelle - sadece bir kez çalışsın
  useEffect(() => {
    if (initialLatitude && initialLongitude && mapRef.current && !markerPosition) {
      setMapCenter({ lat: initialLatitude, lng: initialLongitude })
      setMarkerPosition({ lat: initialLatitude, lng: initialLongitude })
      setManualCoordinates({ 
        lat: initialLatitude.toString(), 
        lng: initialLongitude.toString() 
      })
    }
  }, [initialLatitude, initialLongitude, markerPosition])

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setError(null)
  }, [])

  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }

  const extractAddressComponents = (components: google.maps.GeocoderAddressComponent[]) => {
    const result: any = {}
    
    components.forEach((component) => {
      const types = component.types
      
      if (types.includes('administrative_area_level_1')) {
        result.city = component.long_name
      } else if (types.includes('administrative_area_level_2')) {
        result.district = component.long_name
      } else if (types.includes('sublocality_level_1') || types.includes('neighborhood')) {
        result.neighborhood = component.long_name
      } else if (types.includes('postal_code')) {
        result.postal_code = component.long_name
      }
    })
    
    return result
  }

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()
      
      if (!place.geometry?.location) {
        setError('Seçilen konum için koordinat bilgisi bulunamadı.')
        return
      }

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      const selectedAddress = place.formatted_address || place.name || ''

      setAddress(selectedAddress)
      setMapCenter({ lat, lng })
      
      // Önce marker pozisyonunu güncelle
      setMarkerPosition({ lat, lng })
      setManualCoordinates({ lat: lat.toString(), lng: lng.toString() })
      setError(null)
      
      // Adres bileşenlerini çıkar
      const addressComponents = extractAddressComponents(place.address_components || [])
      
      // Parent bileşene konum bilgisini gönder
      handleAddressSelect({
        address: selectedAddress,
        latitude: lat,
        longitude: lng,
        ...addressComponents
      })
    }
  }, [handleAddressSelect])

  const onMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat()
      const lng = event.latLng.lng()
      
      // Önce marker pozisyonunu güncelle
      setMarkerPosition({ lat, lng })
      setManualCoordinates({ lat: lat.toString(), lng: lng.toString() })
      
      // Geçici adres bilgisini güncelle
      const tempAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setAddress(tempAddress)
      
      // Parent bileşene konum bilgisini gönder
      handleAddressSelect({
        address: tempAddress,
        latitude: lat,
        longitude: lng
      })
      
      // Arka planda adres bilgisini güncelle (opsiyonel)
      setTimeout(() => {
        updateLocationFromCoordinates(lat, lng)
      }, 500)
    }
  }, [handleAddressSelect])

  const onMarkerDragEnd = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat()
      const lng = event.latLng.lng()
      
      // Önce marker pozisyonunu güncelle
      setMarkerPosition({ lat, lng })
      setManualCoordinates({ lat: lat.toString(), lng: lng.toString() })
      
      // Geçici adres bilgisini güncelle
      const tempAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setAddress(tempAddress)
      
      // Parent bileşene konum bilgisini gönder
      handleAddressSelect({
        address: tempAddress,
        latitude: lat,
        longitude: lng
      })
      
      // Arka planda adres bilgisini güncelle (opsiyonel)
      setTimeout(() => {
        updateLocationFromCoordinates(lat, lng)
      }, 500)
    }
  }, [handleAddressSelect])

  const updateLocationFromCoordinates = async (lat: number, lng: number) => {
    setIsLoading(true)
    setError(null)

    try {
      if (!window.google?.maps?.Geocoder) {
        throw new Error('Google Maps Geocoder servisi kullanılamıyor.')
      }

      const geocoder = new google.maps.Geocoder()
      
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          setIsLoading(false)
          
          if (status === 'OK' && results && results[0]) {
            const result = results[0]
            const newAddress = result.formatted_address
            setAddress(newAddress)
            
            const addressComponents = extractAddressComponents(result.address_components || [])
            
            // Marker pozisyonunu güncelleme - sadece adres bilgisini güncelle
            handleAddressSelect({
              address: newAddress,
              latitude: lat,
              longitude: lng,
              ...addressComponents
            })
          } else {
            setError('Bu konum için adres bilgisi alınamadı.')
            // Koordinatlar mevcut olsa bile callback'i çağır
            const tempAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            setAddress(tempAddress)
            handleAddressSelect({
              address: tempAddress,
              latitude: lat,
              longitude: lng
            })
          }
        }
      )
    } catch (error) {
      setIsLoading(false)
      setError('Adres bilgisi alınırken hata oluştu.')
      // Hata durumunda da koordinatları kaydet
      const tempAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setAddress(tempAddress)
      handleAddressSelect({
        address: tempAddress,
        latitude: lat,
        longitude: lng
      })
    }
  }

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Tarayıcınız konum servislerini desteklemiyor.')
      return
    }

    setIsLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        // Önce marker pozisyonunu güncelle
        setMarkerPosition({ lat, lng })
        setMapCenter({ lat, lng })
        setManualCoordinates({ lat: lat.toString(), lng: lng.toString() })
        
        // Geçici adres bilgisini güncelle
        const tempAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        setAddress(tempAddress)
        
        // Parent bileşene konum bilgisini gönder
        handleAddressSelect({
          address: tempAddress,
          latitude: lat,
          longitude: lng
        })
        
        setIsLoading(false)
        
        // Arka planda adres bilgisini güncelle (opsiyonel)
        setTimeout(() => {
          updateLocationFromCoordinates(lat, lng)
        }, 500)
      },
      (error) => {
        setIsLoading(false)
        let errorMessage = 'Konum bilgisi alınamadı.'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Konum izni reddedildi. Tarayıcı ayarlarından izin verin.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Konum bilgisi kullanılamıyor.'
            break
          case error.TIMEOUT:
            errorMessage = 'Konum alınırken zaman aşımı oluştu.'
            break
        }
        
        setError(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }, [handleAddressSelect])

  const handleManualCoordinateChange = (field: 'lat' | 'lng', value: string) => {
    setManualCoordinates(prev => ({ ...prev, [field]: value }))
  }

  const applyManualCoordinates = useCallback(() => {
    const lat = parseFloat(manualCoordinates.lat.toString())
    const lng = parseFloat(manualCoordinates.lng.toString())

    if (isNaN(lat) || isNaN(lng)) {
      setError('Geçersiz koordinat değerleri.')
      return
    }

    if (lat < -90 || lat > 90) {
      setError('Enlem -90 ile 90 arasında olmalıdır.')
      return
    }

    if (lng < -180 || lng > 180) {
      setError('Boylam -180 ile 180 arasında olmalıdır.')
      return
    }

    // Önce marker pozisyonunu güncelle
    setMarkerPosition({ lat, lng })
    setMapCenter({ lat, lng })
    setError(null)
    
    // Geçici adres bilgisini güncelle
    const tempAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    setAddress(tempAddress)
    
    // Parent bileşene konum bilgisini gönder
    handleAddressSelect({
      address: tempAddress,
      latitude: lat,
      longitude: lng
    })

    // Arka planda adres bilgisini güncelle (opsiyonel)
    if (mapRef.current) {
      setTimeout(() => {
        updateLocationFromCoordinates(lat, lng)
      }, 500)
    }
  }, [manualCoordinates, handleAddressSelect])

  const retryGoogleMaps = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1)
      window.location.reload()
    }
  }

  // API anahtarı kontrolü
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-red-900">Konfigürasyon Hatası</h4>
            <p className="text-sm text-red-700 mt-1">Google Maps API anahtarı bulunamadı.</p>
            <p className="text-sm text-red-600 mt-1">Lütfen .env.local dosyasında NEXT_PUBLIC_GOOGLE_MAPS_API_KEY değişkenini kontrol edin.</p>
          </div>
        </div>
      </div>
    )
  }

  // Ana UI - Google Maps yüklendiğinde
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="address-search" className="block text-sm font-medium text-gray-700 mb-2">
          Adres Arama ve Seçimi
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
            options={{
              types: ['establishment', 'geocode'],
              componentRestrictions: { country: 'TR' }
            }}
          >
            <input
              type="text"
              id="address-search"
              placeholder="Adres ara veya haritadan konum seç..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </Autocomplete>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <MapPinIcon className="h-4 w-4" />
          <span>{isLoading ? 'Konum alınıyor...' : 'Mevcut Konumu Kullan'}</span>
        </button>
      </div>

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={15}
          onLoad={onLoad}
          onClick={onMapClick}
          options={mapOptions}
        >
          {markerPosition && (
            <Marker
              position={markerPosition}
              draggable={true}
              onDragEnd={onMarkerDragEnd}
              title="Restoran Konumu"
            />
          )}
        </GoogleMap>
      </div>

      {/* Hata mesajı */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900">Uyarı</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Mesajı kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manuel Koordinat Girişi */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Manuel Koordinat Girişi</h4>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label htmlFor="coord-lat" className="block text-sm font-medium text-gray-700 mb-1">
              Enlem (Latitude)
            </label>
            <input
              type="number"
              id="coord-lat"
              step="any"
              value={manualCoordinates.lat}
              onChange={(e) => handleManualCoordinateChange('lat', e.target.value)}
              placeholder="39.9334"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="coord-lng" className="block text-sm font-medium text-gray-700 mb-1">
              Boylam (Longitude)
            </label>
            <input
              type="number"
              id="coord-lng"
              step="any"
              value={manualCoordinates.lng}
              onChange={(e) => handleManualCoordinateChange('lng', e.target.value)}
              placeholder="32.8597"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={applyManualCoordinates}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <MapPinIcon className="h-4 w-4" />
          <span>Koordinatları Haritaya Uygula</span>
        </button>
      </div>

      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        <p className="font-medium mb-1">Nasıl kullanılır:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Yukarıdaki arama kutusunu kullanarak adres arayın</li>
          <li>Haritaya tıklayarak konum seçin</li>
          <li>Kırmızı pin'i sürükleyerek konumu ayarlayın</li>
          <li>"Mevcut Konumu Kullan" butonuyla GPS konumunuzu alın</li>
          <li>Manuel koordinat girişi ile de konum belirleyebilirsiniz</li>
        </ul>
      </div>

      {markerPosition && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <MapPinIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Konum Belirlendi</h4>
              <p className="text-sm text-blue-700 mt-1">
                Koordinatlar: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
              </p>
              {address && (
                <p className="text-sm text-blue-700 mt-1">
                  Adres: {address}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

const AddressSelector = memo(function AddressSelector(props: AddressSelectorProps) {
  return (
    <GoogleMapsProvider>
      <AddressSelectorContent {...props} />
    </GoogleMapsProvider>
  )
})

export default AddressSelector; 