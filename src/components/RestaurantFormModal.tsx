'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/index'
import { 
  XMarkIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  UserIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

interface Restaurant {
  id: string
  name: string
  address?: string
  detailed_address?: string
  phone?: string
  email?: string
  city?: string
  district?: string
  neighborhood?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface RestaurantFormModalProps {
  restaurant: Restaurant | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  isCreating: boolean
}

export default function RestaurantFormModal({
  restaurant,
  isOpen,
  onClose,
  onSave,
  isCreating
}: RestaurantFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    detailed_address: '',
    phone: '',
    email: '',
    city: '',
    district: '',
    neighborhood: '',
    postal_code: '',
    latitude: '',
    longitude: '',
    is_active: true,
    // Yeni eklenen alanlar
    username: '',
    password: '',
    admin_full_name: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Modal açıldığında veya restoran değiştiğinde form verilerini güncelle
  useEffect(() => {
    if (isOpen) {
      if (restaurant && !isCreating) {
        setFormData({
          name: restaurant.name || '',
          detailed_address: restaurant.detailed_address || restaurant.address || '',
          phone: restaurant.phone || '',
          email: restaurant.email || '',
          city: restaurant.city || '',
          district: restaurant.district || '',
          neighborhood: restaurant.neighborhood || '',
          postal_code: restaurant.postal_code || '',
          latitude: restaurant.latitude?.toString() || '',
          longitude: restaurant.longitude?.toString() || '',
          is_active: restaurant.is_active,
          // Düzenleme modunda kullanıcı bilgileri boş
          username: '',
          password: '',
          admin_full_name: ''
        })
      } else {
        // Yeni restoran için varsayılan değerler
        setFormData({
          name: '',
          detailed_address: '',
          phone: '',
          email: '',
          city: '',
          district: '',
          neighborhood: '',
          postal_code: '',
          latitude: '',
          longitude: '',
          is_active: true,
          username: '',
          password: '',
          admin_full_name: ''
        })
      }
      setErrors({})
    }
  }, [isOpen, restaurant, isCreating])

  // Input değişikliklerini handle et
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }))
    
    // Hata varsa temizle
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  // Form validasyonu
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Restoran bilgileri validasyonu
    if (!formData.name.trim()) {
      newErrors.name = 'Restoran adı gereklidir'
    }

    if (!formData.detailed_address.trim()) {
      newErrors.detailed_address = 'Adres gereklidir'
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Geçerli bir telefon numarası girin'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir email adresi girin'
    }

    if (formData.latitude && (isNaN(Number(formData.latitude)) || Number(formData.latitude) < -90 || Number(formData.latitude) > 90)) {
      newErrors.latitude = 'Geçerli bir enlem değeri girin (-90 ile 90 arası)'
    }

    if (formData.longitude && (isNaN(Number(formData.longitude)) || Number(formData.longitude) < -180 || Number(formData.longitude) > 180)) {
      newErrors.longitude = 'Geçerli bir boylam değeri girin (-180 ile 180 arası)'
    }

    // Yeni restoran oluştururken kullanıcı bilgileri gerekli
    if (isCreating) {
      if (!formData.username.trim()) {
        newErrors.username = 'Kullanıcı adı gereklidir'
      } else if (formData.username.length < 3) {
        newErrors.username = 'Kullanıcı adı en az 3 karakter olmalıdır'
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir'
      }

      if (!formData.password.trim()) {
        newErrors.password = 'Şifre gereklidir'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Şifre en az 6 karakter olmalıdır'
      }

      if (!formData.admin_full_name.trim()) {
        newErrors.admin_full_name = 'Yönetici adı soyadı gereklidir'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Form gönderimi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      if (isCreating) {
        // API endpoint ile yeni restoran oluştur
        const response = await fetch('/api/restaurants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            detailed_address: formData.detailed_address,
            phone: formData.phone,
            email: formData.email,
            city: formData.city,
            district: formData.district,
            neighborhood: formData.neighborhood,
            postal_code: formData.postal_code,
            latitude: formData.latitude,
            longitude: formData.longitude,
            is_active: formData.is_active,
            username: formData.username,
            password: formData.password,
            admin_full_name: formData.admin_full_name
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Restoran eklenemedi')
        }

        onSave()
        alert(data.message)
      } else {
        // API endpoint ile mevcut restoranı güncelle
        const response = await fetch('/api/restaurants', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: restaurant!.id,
            name: formData.name,
            detailed_address: formData.detailed_address,
            phone: formData.phone,
            email: formData.email,
            city: formData.city,
            district: formData.district,
            neighborhood: formData.neighborhood,
            postal_code: formData.postal_code,
            latitude: formData.latitude,
            longitude: formData.longitude,
            is_active: formData.is_active
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Restoran güncellenemedi')
        }

        onSave()
        alert(data.message)
      }
    } catch (error: any) {
      console.error('Restoran kaydedilemedi:', error)
      alert(`Hata: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isCreating ? 'Yeni Restoran Ekle' : 'Restoran Düzenle'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isCreating ? 'Sisteme yeni bir restoran ve yönetici hesabı ekleyin' : 'Restoran bilgilerini güncelleyin'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-8">
              {/* Temel Bilgiler */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Restoran Bilgileri</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Restoran Adı *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Restoran adını girin"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <PhoneIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`block w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.phone ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0212 555 0000"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`block w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.email ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="restoran@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Yönetici Hesap Bilgileri - Sadece yeni restoran oluştururken */}
              {isCreating && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-gray-600" />
                    Yönetici Hesap Bilgileri
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Bu bilgiler restoranın yönetici hesabı için kullanılacaktır.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Yönetici Adı Soyadı *
                      </label>
                      <input
                        type="text"
                        name="admin_full_name"
                        value={formData.admin_full_name}
                        onChange={handleInputChange}
                        className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.admin_full_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Yönetici adı soyadı"
                      />
                      {errors.admin_full_name && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.admin_full_name}
                        </p>
                      )}
                    </div>

                    <div />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kullanıcı Adı *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className={`block w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.username ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="restoran_adi"
                        />
                      </div>
                      {errors.username && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.username}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        En az 3 karakter, sadece harf, rakam ve alt çizgi kullanılabilir
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Şifre *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <KeyIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className={`block w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.password ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="En az 6 karakter"
                        />
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.password}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        En az 6 karakter olmalıdır
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Adres Bilgileri */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2 text-gray-600" />
                  Adres Bilgileri
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Detaylı Adres *
                    </label>
                    <textarea
                      name="detailed_address"
                      value={formData.detailed_address}
                      onChange={handleInputChange}
                      rows={3}
                      className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.detailed_address ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Tam adres bilgisini girin"
                    />
                    {errors.detailed_address && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.detailed_address}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Şehir
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="İstanbul"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        İlçe
                      </label>
                      <input
                        type="text"
                        name="district"
                        value={formData.district}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Kadıköy"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mahalle
                      </label>
                      <input
                        type="text"
                        name="neighborhood"
                        value={formData.neighborhood}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Moda Mahallesi"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Posta Kodu
                      </label>
                      <input
                        type="text"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="34710"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enlem (Latitude)
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.latitude ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="41.0082"
                      />
                      {errors.latitude && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.latitude}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Boylam (Longitude)
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.longitude ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="28.9784"
                      />
                      {errors.longitude && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.longitude}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Durum */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Durum</h4>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Restoran aktif
                  </label>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Pasif restoranlar sipariş alamaz ve haritada görünmez.
                </p>
              </div>
            </div>

            {/* Form Footer */}
            <div className="flex justify-end space-x-4 pt-6 mt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Kaydediliyor...' : (isCreating ? 'Restoran ve Hesap Oluştur' : 'Değişiklikleri Kaydet')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 