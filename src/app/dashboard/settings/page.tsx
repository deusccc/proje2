'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User, Restaurant } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import AddressSelector from '@/components/AddressSelector'
import GoogleMapsProvider from '@/components/GoogleMapsProvider'
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    detailed_address: '',
    city: '',
    district: '',
    neighborhood: '',
    postal_code: '',
    latitude: 0,
    longitude: 0
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/')
      return
    }
    setUser(currentUser)
    
    // Restaurant_id kontrolü
    if (!currentUser.restaurant_id) {
      console.error('❌ Kullanıcının restaurant_id değeri null veya undefined')
      setMessage({ type: 'error', text: 'Restoran bilgisi bulunamadı. Lütfen yönetici ile iletişime geçin.' })
      return
    }
    
    await fetchRestaurant(currentUser.restaurant_id)
  }

  const fetchRestaurant = async (restaurantId: string) => {
    try {
      console.log('🔍 Restoran bilgileri getiriliyor, ID:', restaurantId)
      
      // Önce mevcut veriyi kontrol edelim
      const { data: allRestaurants, error: allError } = await supabase
        .from('restaurants')
        .select('*')
        .limit(5)
      
      console.log('🏪 Tüm restoranlar:', allRestaurants)
      console.log('❌ Tüm restoranlar hatası:', allError)
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single()

      if (error) {
        console.error('❌ Restoran bilgileri getirme hatası:', error)
        throw error
      }
      
      console.log('📊 Veritabanından gelen restoran verileri:', data)
      
      if (data) {
        setRestaurant(data)
        const newFormData = {
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          detailed_address: data.detailed_address || data.address || '',
          city: data.city || '',
          district: data.district || '',
          neighborhood: data.neighborhood || '',
          postal_code: data.postal_code || '',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0
        }
        
        console.log('📝 Form verileri ayarlanıyor:', newFormData)
        setFormData(newFormData)
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error)
      setMessage({ type: 'error', text: 'Restoran bilgileri yüklenirken hata oluştu.' })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    router.push('/')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    console.log('📝 Input değişti:', name, '=', value)
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddressSelect = (addressData: {
    address: string
    latitude: number
    longitude: number
    city?: string
    district?: string
    neighborhood?: string
    postal_code?: string
  }) => {
    console.log('📍 Adres seçildi:', addressData)
    
    setFormData(prev => {
      const newFormData = {
        ...prev,
        detailed_address: addressData.address,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        city: addressData.city || prev.city,
        district: addressData.district || prev.district,
        neighborhood: addressData.neighborhood || prev.neighborhood,
        postal_code: addressData.postal_code || prev.postal_code
      }
      
      console.log('📝 Form verileri güncellendi:', newFormData)
      return newFormData
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      console.log('💾 Form gönderiliyor:', formData)
      
      if (!restaurant) {
        throw new Error('Restoran bilgisi bulunamadı')
      }

      const updateData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        detailed_address: formData.detailed_address,
        address: formData.detailed_address, // Eski address alanını da güncelle
        city: formData.city,
        district: formData.district,
        neighborhood: formData.neighborhood,
        postal_code: formData.postal_code,
        latitude: formData.latitude,
        longitude: formData.longitude
      }

      console.log('🔄 Supabase\'e gönderilecek veriler:', updateData)
      console.log('🆔 Güncellenecek restoran ID:', restaurant.id)

      const { error } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', restaurant.id)

      console.log('❌ Supabase response error:', error)

      if (error) {
        console.error('❌ Supabase güncelleme hatası:', error)
        throw error
      }

      console.log('✅ Güncelleme başarılı')
      setMessage({ type: 'success', text: 'Restoran bilgileri başarıyla güncellendi.' })
      
      // Restaurant state'ini güncelle (RLS problemi nedeniyle veri çekme yerine local güncelleme)
      setRestaurant(prev => prev ? {
        ...prev,
        ...updateData
      } : null)
      
    } catch (error) {
      console.error('❌ Güncelleme hatası:', error)
      setMessage({ 
        type: 'error', 
        text: `Güncelleme sırasında hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}` 
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user || !restaurant) {
    return null
  }

  return (
    <DashboardLayout user={user} onSignOut={handleSignOut} allowedRoles={['admin', 'manager']}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Restoran Ayarları
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Restoran bilgilerinizi güncelleyin.</p>
              </div>
            </div>

            {message && (
              <div className={`rounded-lg p-4 mb-6 flex items-center space-x-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
                )}
                <span className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Temel Bilgiler */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Temel Bilgiler</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Restoran Adı *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      E-posta
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Adres Bilgileri */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <MapPinIcon className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Adres Bilgileri</h3>
                </div>
                
                <div className="space-y-6">
                  <GoogleMapsProvider>
                    <AddressSelector
                      onAddressSelect={handleAddressSelect}
                      initialAddress={formData.detailed_address}
                      initialLatitude={formData.latitude}
                      initialLongitude={formData.longitude}
                    />
                  </GoogleMapsProvider>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                        Şehir
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-2">
                        İlçe
                      </label>
                      <input
                        type="text"
                        id="district"
                        name="district"
                        value={formData.district}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-2">
                        Mahalle
                      </label>
                      <input
                        type="text"
                        id="neighborhood"
                        name="neighborhood"
                        value={formData.neighborhood}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
                        Posta Kodu
                      </label>
                      <input
                        type="text"
                        id="postal_code"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {formData.latitude && formData.longitude && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <MapPinIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-900">Konum Belirlendi</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Koordinatlar: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 