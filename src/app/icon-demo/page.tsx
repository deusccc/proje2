'use client'

import { useState, useEffect } from 'react'
import { CourierIconManager } from '@/components/CourierIcons'
import { loadGoogleMapsApi } from '@/lib/googleMaps'

// Mock kurye verileri
const mockCouriers = [
  {
    id: '1',
    full_name: 'Ahmet Yılmaz',
    phone: '+90 555 123 4567',
    current_latitude: 41.0082,
    current_longitude: 28.9784,
    last_location_update: new Date().toISOString(),
    is_available: true,
    vehicle_type: 'Motosiklet',
    license_plate: '34ABC123',
    active_assignments: 0
  },
  {
    id: '2', 
    full_name: 'Mehmet Demir',
    phone: '+90 555 987 6543',
    current_latitude: 41.0082,
    current_longitude: 28.9784,
    last_location_update: new Date().toISOString(),
    is_available: true,
    vehicle_type: 'Bisiklet',
    license_plate: '34DEF456',
    active_assignments: 2
  },
  {
    id: '3',
    full_name: 'Ali Kaya',
    phone: '+90 555 555 5555',
    current_latitude: 41.0082,
    current_longitude: 28.9784,
    last_location_update: new Date().toISOString(),
    is_available: false,
    vehicle_type: 'Motosiklet',
    license_plate: '34GHI789',
    active_assignments: 0
  }
]

export default function IconDemo() {
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState<'courier' | 'restaurant' | 'customerVerified' | 'customerUnverified'>('courier')
  const [iconSize, setIconSize] = useState<number>(48)
  const [showPulse, setShowPulse] = useState<boolean>(true)
  const [showNameLabel, setShowNameLabel] = useState<boolean>(false)
  const [heading, setHeading] = useState<number>(0)

  // Google Maps API'yi yükle
  useEffect(() => {
    const loadApi = async () => {
      try {
        console.log('Google Maps API yükleniyor...')
        await loadGoogleMapsApi()
        console.log('Google Maps API yüklendi!')
        setIsGoogleMapsLoaded(true)
      } catch (error) {
        console.error('Google Maps API yükleme hatası:', error)
      }
    }

    // Eğer API zaten yüklüyse
    if (typeof window !== 'undefined' && window.google?.maps) {
      console.log('Google Maps API zaten yüklü')
      setIsGoogleMapsLoaded(true)
      return
    }

    loadApi()
  }, [])

  // SVG'yi görüntülemek için yardımcı fonksiyon
  const renderSvgIcon = (iconData: any) => {
    // İkon verisi yoksa veya yüklenmemişse loading göster
    if (!iconData || !iconData.url) {
      return (
        <div className="flex flex-col items-center space-y-2">
          <div className="border border-gray-200 rounded p-4 bg-gray-50 w-20 h-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-xs text-gray-500">Yükleniyor...</p>
        </div>
      )
    }

    const svgData = iconData.url.replace('data:image/svg+xml;charset=UTF-8,', '')
    const decodedSvg = decodeURIComponent(svgData)
    
    return (
      <div className="flex flex-col items-center space-y-2">
        <div 
          dangerouslySetInnerHTML={{ __html: decodedSvg }}
          className="border border-gray-200 rounded p-4 bg-gray-50"
        />
        <p className="text-xs text-gray-500">
          Boyut: {iconData.scaledSize?.width || 'Bilinmiyor'}x{iconData.scaledSize?.height || 'Bilinmiyor'}
        </p>
      </div>
    )
  }

  // Google Maps API yüklenmemişse loading ekranı göster
  if (!isGoogleMapsLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Google Maps API yükleniyor...</p>
          <p className="text-sm text-gray-500">İkon sistemi hazırlanıyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Başlık */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🛵 Kurye İkon Sistemi Demo
          </h1>
          <p className="text-lg text-gray-600">
            Modern, dinamik ve duyarlı kurye harita ikonları
          </p>
        </div>

        {/* Kontrol Paneli */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">İkon Ayarları</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* İkon Tipi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İkon Tipi
              </label>
              <select
                value={selectedIcon}
                onChange={(e) => setSelectedIcon(e.target.value as 'courier' | 'restaurant' | 'customerVerified' | 'customerUnverified')}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="courier">Kurye İkonu</option>
                <option value="restaurant">Restoran İkonu</option>
                <option value="customerVerified">Müşteri (Doğrulanmış)</option>
                <option value="customerUnverified">Müşteri (Doğrulanmamış)</option>
              </select>
            </div>

            {/* Boyut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boyut: {iconSize}px
              </label>
              <input
                type="range"
                min="24"
                max="80"
                value={iconSize}
                onChange={(e) => setIconSize(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Yön */}
            {selectedIcon === 'courier' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yön: {heading}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={heading}
                  onChange={(e) => setHeading(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {/* Seçenekler */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showPulse}
                  onChange={(e) => setShowPulse(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Nabız Efekti</span>
              </label>
              
              {selectedIcon === 'courier' && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showNameLabel}
                    onChange={(e) => setShowNameLabel(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">İsim Etiketi</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* İkon Önizlemeleri */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Mevcut İkon */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Önizleme</h3>
            
            <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
              {selectedIcon === 'courier' && 
                renderSvgIcon(CourierIconManager.getCourierIcon(mockCouriers[0], {
                  size: iconSize,
                  heading: heading,
                  showPulse: showPulse,
                  showNameLabel: showNameLabel
                }))
              }
              
              {selectedIcon === 'restaurant' && 
                renderSvgIcon(CourierIconManager.getRestaurantIcon(iconSize))
              }
              
              {selectedIcon === 'customerVerified' && 
                renderSvgIcon(CourierIconManager.getCustomerVerifiedIcon(iconSize))
              }
              
              {selectedIcon === 'customerUnverified' && 
                renderSvgIcon(CourierIconManager.getCustomerUnverifiedIcon(iconSize))
              }
            </div>
          </div>

          {/* Durum Çeşitleri */}
          {selectedIcon === 'courier' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Kurye Durumları</h3>
              
              <div className="grid grid-cols-1 gap-4">
                {/* Müsait Kurye */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Müsait Kurye</h4>
                  <div className="flex justify-center">
                    {renderSvgIcon(CourierIconManager.getCourierIcon(mockCouriers[0], {
                      size: 40,
                      showPulse: true
                    }))}
                  </div>
                  <p className="text-sm text-blue-700 text-center mt-2">
                    Mavi - Aktif ve müsait
                  </p>
                </div>

                {/* Teslimat Yapan Kurye */}
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">Teslimat Yapıyor</h4>
                  <div className="flex justify-center">
                    {renderSvgIcon(CourierIconManager.getCourierIcon(mockCouriers[1], {
                      size: 40,
                      showPulse: true
                    }))}
                  </div>
                  <p className="text-sm text-orange-700 text-center mt-2">
                    Turuncu - Aktif teslimat
                  </p>
                </div>

                {/* Çevrimdışı Kurye */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Çevrimdışı</h4>
                  <div className="flex justify-center">
                    {renderSvgIcon(CourierIconManager.getCourierIcon(mockCouriers[2], {
                      size: 40,
                      showPulse: false
                    }))}
                  </div>
                  <p className="text-sm text-gray-700 text-center mt-2">
                    Gri - Aktif değil
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Özellikler Listesi */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h3 className="text-lg font-semibold mb-4">✨ İkon Sistemi Özellikleri</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">🎨 Dinamik Renkler</h4>
              <p className="text-sm text-gray-600">
                Kurye durumuna göre otomatik renk değişimi:
                <br />• Mavi: Müsait
                <br />• Turuncu: Teslimat yapıyor
                <br />• Gri: Çevrimdışı
              </p>
            </div>
            
            <div className="p-4 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">🌊 Animasyonlar</h4>
              <p className="text-sm text-gray-600">
                Nabız efekti ile canlılık, sadece aktif durumlarda görünür. 
                Smooth CSS animasyonları ile performanslı.
              </p>
            </div>
            
            <div className="p-4 border border-purple-200 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">🧭 Yön Takibi</h4>
              <p className="text-sm text-gray-600">
                GPS heading verisine göre motosiklet ikonu otomatik döner.
                Kurye hangi yöne gidiyorsa ikon da o tarafa bakar.
              </p>
            </div>
            
            <div className="p-4 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-900 mb-2">📏 Duyarlı Boyut</h4>
              <p className="text-sm text-gray-600">
                Harita zoom seviyesine göre otomatik boyutlanma.
                Mobil ve masaüstü için optimize edilmiş.
              </p>
            </div>
            
            <div className="p-4 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">🏷️ İsim Etiketleri</h4>
              <p className="text-sm text-gray-600">
                Opsiyonel kurye isim etiketi desteği.
                Şeffaf arka plan ile okunabilirlik.
              </p>
            </div>
            
            <div className="p-4 border border-indigo-200 rounded-lg">
              <h4 className="font-medium text-indigo-900 mb-2">🎯 Durum Göstergesi</h4>
              <p className="text-sm text-gray-600">
                Sağ üst köşede küçük durum noktası.
                Online/offline durumu hızlı görsel feedback.
              </p>
            </div>
          </div>
        </div>

        {/* Kullanım Örnekleri */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h3 className="text-lg font-semibold mb-4">💻 Kod Kullanımı</h3>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`// Company Dashboard'da
import { getCompanyCourierIcon } from '@/components/CourierIcons'

const icon = getCompanyCourierIcon(courier)

// Kurye Dashboard'da kendi konumu
import { getOwnCourierIcon } from '@/components/CourierIcons'

const icon = getOwnCourierIcon(heading)

// Özelleştirilebilir kullanım
import { CourierIconManager } from '@/components/CourierIcons'

const icon = CourierIconManager.getCourierIcon(courier, {
  size: 48,
  heading: 90,
  showPulse: true,
  showNameLabel: false
})`}
            </pre>
          </div>
        </div>
        
      </div>
    </div>
  )
} 