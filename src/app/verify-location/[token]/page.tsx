'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/index'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { loadGoogleMapsApi, isGoogleMapsLoaded } from '@/lib/googleMaps'
import { Order } from '@/types'

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: 39.925533,
  lng: 32.866287
};

export default function VerifyLocationPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markerPosition, setMarkerPosition] = useState<{ lat: number, lng: number } | null>(null)
  const [addressDescription, setAddressDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  // Google Maps API'yi yükle
  useEffect(() => {
    const loadApi = async () => {
      try {
        await loadGoogleMapsApi()
        setIsLoaded(true)
        setLoadError(null)
      } catch (error) {
        console.error('Google Maps API yükleme hatası:', error)
        setLoadError(error as Error)
      }
    }

    // Eğer API zaten yüklüyse (client-side kontrolü)
    if (typeof window !== 'undefined' && window.google?.maps) {
      setIsLoaded(true)
      return
    }

    loadApi()
  }, [])

  useEffect(() => {
    if (!token) {
      setError('Geçersiz doğrulama linki.')
      setLoading(false)
      return
    }

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('location_verification_token', token)
        .single()

      if (error || !data) {
        setError('Sipariş bulunamadı veya linkin süresi dolmuş.')
      } else if (data.is_location_verified) {
        setError('Bu konum zaten doğrulanmış.')
        setOrder(data)
      } else {
        setOrder(data)
        if(data.customer_address_lat && data.customer_address_lng) {
          setMarkerPosition({ lat: Number(data.customer_address_lat), lng: Number(data.customer_address_lng) })
        }
      }
      setLoading(false)
    }

    fetchOrder()
  }, [token])

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      setMarkerPosition(newPos);
      
      // Reverse geocoding ile adres bilgisini al
      performReverseGeocoding(newPos.lat, newPos.lng);
    }
  }, [])

  // Reverse geocoding fonksiyonu
  const performReverseGeocoding = useCallback(async (lat: number, lng: number) => {
    if (!window.google?.maps?.Geocoder) return;

    try {
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const result = results[0];
            const formattedAddress = result.formatted_address || '';
            
            // Adres açıklama alanını otomatik doldur (sadece boşsa)
            if (!addressDescription.trim()) {
              // Formatlanmış adresi temizle
              const cleanAddress = formattedAddress
                .replace(/\d{5,6}\s/, '') // Posta kodunu kaldır
                .replace(/Turkey$/, '') // Sonundaki Turkey'i kaldır
                .replace(/Türkiye$/, '') // Sonundaki Türkiye'yi kaldır
                .trim();
              setAddressDescription(cleanAddress);
            }
            
            console.log('🗺️ Reverse geocoding sonucu:', formattedAddress);
          } else {
            console.warn('⚠️ Reverse geocoding başarısız:', status);
          }
        }
      );
    } catch (error) {
      console.error('💥 Reverse geocoding hatası:', error);
    }
  }, [addressDescription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!markerPosition) {
      alert('Lütfen haritadan konumunuzu işaretleyin.')
      return
    }
    setIsSubmitting(true)

    const { error } = await supabase
      .from('orders')
      .update({
        customer_address_lat: markerPosition.lat,
        customer_address_lng: markerPosition.lng,
        customer_address_description: addressDescription,
        is_location_verified: true,
      })
      .eq('id', order!.id)

    if (error) {
      setMessage('Konum güncellenirken bir hata oluştu. Lütfen tekrar deneyin.')
      console.error(error)
    } else {
      setMessage('Teşekkürler! Konumunuz başarıyla güncellendi. Bu pencereyi kapatabilirsiniz.')
    }
    setIsSubmitting(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Yükleniyor...</div>
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500">{error}</div>
  }
  
  if (message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg p-8 space-y-4 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-green-600">İşlem Başarılı</h1>
            <p className="text-gray-700">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Konumunuzu Doğrulayın</h1>
          <p className="text-gray-600">Merhaba {order?.customer_name}, siparişinizin doğru adrese ulaşması için lütfen teslimat konumunu harita üzerinde işaretleyin.</p>
        </div>

        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={markerPosition || defaultCenter}
            zoom={markerPosition ? 17 : 12}
            onClick={onMapClick}
          >
            {markerPosition && 
             typeof markerPosition.lat === 'number' && 
             typeof markerPosition.lng === 'number' &&
             !isNaN(markerPosition.lat) && 
             !isNaN(markerPosition.lng) && 
             markerPosition.lat !== 0 && 
             markerPosition.lng !== 0 && (
              <Marker position={markerPosition} />
            )}
          </GoogleMap>
        ) : loadError ? (
          <div>Harita yüklenemedi. Lütfen API anahtarınızı kontrol edin.</div>
        ) : (
          <div>Harita yükleniyor...</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Adres Tarifi (İsteğe Bağlı)
            </label>
            <textarea
              id="description"
              rows={3}
              value={addressDescription}
              onChange={(e) => setAddressDescription(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Örn: Mavi kapılı bina, marketin yanı."
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !markerPosition}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Konumu Onayla'}
          </button>
        </form>
      </div>
    </div>
  )
} 