'use client'

import { Fragment, useState, useCallback, useEffect, memo } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { MapPinIcon } from '@heroicons/react/24/solid'
import { loadGoogleMapsApi, isGoogleMapsLoaded } from '@/lib/googleMaps'

interface GoogleMapsComponentProps {
    onLocationChange: (location: { lat: number; lng: number }) => void;
    onAddressChange?: (addressData: {
        province?: string;
        district?: string;
        neighborhood?: string;
        street?: string;
        formattedAddress?: string;
    }) => void;
    initialCenter: { lat: number; lng: number };
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.75rem',
  border: '1px solid #e5e7eb'
};

const GoogleMapsComponent = memo(function GoogleMapsComponent({ 
  onLocationChange, 
  onAddressChange, 
  initialCenter 
}: GoogleMapsComponentProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [markerPosition, setMarkerPosition] = useState(initialCenter);
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);

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
    setMarkerPosition(initialCenter);
  }, [initialCenter]);

  // Reverse geocoding fonksiyonu
  const performReverseGeocoding = useCallback(async (lat: number, lng: number) => {
    if (!onAddressChange || !window.google?.maps?.Geocoder) return;

    setIsGeocodingLoading(true);
    try {
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          setIsGeocodingLoading(false);
          
          if (status === 'OK' && results && results[0]) {
            const result = results[0];
            const addressComponents = result.address_components || [];
            
            // Adres bileşenlerini çıkar
            const addressData = {
              province: '',
              district: '',
              neighborhood: '',
              street: '',
              formattedAddress: result.formatted_address || ''
            };

            addressComponents.forEach((component) => {
              const types = component.types;
              
              if (types.includes('administrative_area_level_1')) {
                // İl
                addressData.province = component.long_name;
              } else if (types.includes('administrative_area_level_2')) {
                // İlçe
                addressData.district = component.long_name;
              } else if (types.includes('sublocality_level_1') || 
                        types.includes('neighborhood') || 
                        types.includes('locality')) {
                // Mahalle/Semt
                addressData.neighborhood = component.long_name;
              } else if (types.includes('route')) {
                // Sokak/Cadde
                addressData.street = component.long_name;
              }
            });

            console.log('🗺️ Reverse geocoding sonucu:', addressData);
            onAddressChange(addressData);
          } else {
            console.warn('⚠️ Reverse geocoding başarısız:', status);
          }
        }
      );
    } catch (error) {
      setIsGeocodingLoading(false);
      console.error('💥 Reverse geocoding hatası:', error);
    }
  }, [onAddressChange]);

  const onMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const newPos = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      };
      setMarkerPosition(newPos);
      onLocationChange(newPos);
      
      // Reverse geocoding işlemini başlat
      performReverseGeocoding(newPos.lat, newPos.lng);
    }
  }, [onLocationChange, performReverseGeocoding]);

  const onMarkerDragEnd = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const newPos = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      };
      setMarkerPosition(newPos);
      onLocationChange(newPos);
      
      // Reverse geocoding işlemini başlat
      performReverseGeocoding(newPos.lat, newPos.lng);
    }
  }, [onLocationChange, performReverseGeocoding]);
  
  const findMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const myLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setMarkerPosition(myLocation);
        onLocationChange(myLocation);
        
        // Reverse geocoding işlemini başlat
        performReverseGeocoding(myLocation.lat, myLocation.lng);
      }, () => {
        alert('Konum bilgisi alınamadı. Lütfen tarayıcı izinlerinizi kontrol edin.');
      });
    } else {
      alert('Tarayıcınız konum servislerini desteklemiyor.');
    }
  };

  if (loadError) return <div>Harita yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</div>;
  if (!isLoaded) return <div>Harita yükleniyor...</div>;

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={markerPosition}
        zoom={16}
        onClick={onMapClick}
      >
        {markerPosition && 
         typeof markerPosition.lat === 'number' && 
         typeof markerPosition.lng === 'number' &&
         !isNaN(markerPosition.lat) && 
         !isNaN(markerPosition.lng) && 
         markerPosition.lat !== 0 && 
         markerPosition.lng !== 0 && (
          <Marker
            position={markerPosition}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
          />
        )}
      </GoogleMap>
      
      <button 
        type="button"
        onClick={findMyLocation}
        className="absolute top-3 right-3 z-10 bg-white shadow-md rounded-md p-2 hover:bg-gray-100"
        title="Mevcut Konumumu Bul"
      >
        <MapPinIcon className="w-6 h-6 text-blue-600" />
      </button>
      
      {/* Geocoding yükleme göstergesi */}
      {isGeocodingLoading && (
        <div className="absolute bottom-3 left-3 z-10 bg-white shadow-md rounded-md p-2 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Adres bilgisi alınıyor...</span>
        </div>
      )}
    </div>
  );
});

export default GoogleMapsComponent; 