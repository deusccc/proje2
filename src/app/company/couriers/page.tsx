'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  TruckIcon, 
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface CourierWithUser {
  id: string
  user_id: string
  full_name: string
  phone: string
  email?: string
  vehicle_type?: string
  license_plate?: string
  current_latitude?: number
  current_longitude?: number
  last_location_update?: string
  is_available: boolean
  is_active: boolean
  courier_status?: 'offline' | 'online' | 'available' | 'busy' | 'on_delivery' | 'break' | 'unavailable' | 'inactive'
  active_assignments?: number
  created_at?: string
  users?: {
    id: string
    full_name: string
    username: string
    role: string
    is_active: boolean
  }
}

export default function CompanyCouriersPage() {
  const router = useRouter()
  const [couriers, setCouriers] = useState<CourierWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCourier, setEditingCourier] = useState<CourierWithUser | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    vehicle_type: 'Bisiklet',
    license_plate: '',
    is_available: true,
    is_active: true,
    username: '',
    password: ''
  })

  // İstatistikler
  const totalCouriers = couriers.length
  const activeCouriers = couriers.filter(c => c.is_active).length
  const availableCouriers = couriers.filter(c => c.is_available && c.is_active).length
  const totalDeliveries = couriers.reduce((sum, c) => sum + (c.active_assignments || 0), 0)

  // Kuryeları getir
  const fetchCouriers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/couriers')
      if (!response.ok) {
        throw new Error('Kuryeler yüklenemedi')
      }
      const data = await response.json()
      setCouriers(data.couriers || [])
      setError(null)
    } catch (err) {
      console.error('Kurye verisi yükleme hatası:', err)
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCouriers()
  }, [])

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingCourier ? `/api/couriers/${editingCourier.id}` : '/api/couriers'
      const method = editingCourier ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'İşlem başarısız')
      }

      const result = await response.json()
      
      await fetchCouriers()
      setShowModal(false)
      setEditingCourier(null)
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        vehicle_type: 'Bisiklet',
        license_plate: '',
        is_available: true,
        is_active: true,
        username: '',
        password: ''
      })

      // Yeni kurye eklendiyse giriş bilgilerini göster
      if (!editingCourier && result.user) {
        alert(`Kurye başarıyla eklendi!\n\nGiriş Bilgileri:\nKullanıcı Adı: ${result.user.username}\nŞifre: ${result.user.password}\n\nBu bilgileri kuryeye iletin.`)
      } else {
        alert(result.message || 'İşlem başarıyla tamamlandı')
      }
    } catch (err) {
      console.error('Form submit hatası:', err)
      setError(err instanceof Error ? err.message : 'İşlem başarısız')
    }
  }

  // Kurye sil
  const handleDelete = async (courierId: string) => {
    if (!confirm('Bu kuryeyi silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/couriers/${courierId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Kurye silinemedi')
      }

      await fetchCouriers()
    } catch (err) {
      console.error('Kurye silme hatası:', err)
      setError(err instanceof Error ? err.message : 'Silme işlemi başarısız')
    }
  }

  // Durumu değiştir
  const toggleStatus = async (courierId: string, field: 'is_available' | 'is_active', currentValue: boolean) => {
    try {
      const response = await fetch(`/api/couriers/${courierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [field]: !currentValue
        })
      })

      if (!response.ok) {
        throw new Error('Durum güncellenemedi')
      }

      await fetchCouriers()
    } catch (err) {
      console.error('Durum güncelleme hatası:', err)
      setError(err instanceof Error ? err.message : 'Durum güncellenemedi')
    }
  }

  // Kurye düzenle
  const handleEdit = (courier: CourierWithUser) => {
    setEditingCourier(courier)
    setFormData({
      full_name: courier.full_name,
      phone: courier.phone,
      email: courier.email || '',
      vehicle_type: courier.vehicle_type || 'Bisiklet',
      license_plate: courier.license_plate || '',
      is_available: courier.is_available,
      is_active: courier.is_active,
      username: '', // Düzenleme modunda username boş
      password: ''  // Düzenleme modunda password boş
    })
    setShowModal(true)
  }

  // Araç tipi ikonları
  const getVehicleIcon = (type?: string) => {
    switch (type) {
      case 'Bisiklet': return '🚲'
      case 'Motosiklet': return '🏍️'
      case 'Araba': return '🚗'
      case 'Yürüme': return '🚶'
      default: return '🚲'
    }
  }

  // Durum metni
  const getStatusText = (status?: string) => {
    switch (status) {
      case 'available': return '🟢 Müsait'
      case 'busy': return '🟡 Meşgul'
      case 'on_delivery': return '🚗 Teslimat Yapıyor'
      case 'offline': return '⚪ Çevrimdışı'
      case 'inactive': return '🔴 Pasif'
      case 'break': return '☕ Molada'
      case 'unavailable': return '❌ Müsait Değil'
      default: return '🔵 Online'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Kuryeler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/company/dashboard')}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Geri
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <TruckIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Kurye Yönetimi
                </h1>
                <p className="text-sm text-gray-600">Şirket kuryelerini yönetin</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingCourier(null)
                setFormData({
                  full_name: '',
                  phone: '',
                  email: '',
                  vehicle_type: 'Bisiklet',
                  license_plate: '',
                  is_available: true,
                  is_active: true,
                  username: '',
                  password: ''
                })
                setShowModal(true)
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Yeni Kurye
            </button>
          </div>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Toplam Kurye</p>
                <p className="text-2xl font-semibold text-gray-900">{totalCouriers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aktif Kurye</p>
                <p className="text-2xl font-semibold text-gray-900">{activeCouriers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Müsait Kurye</p>
                <p className="text-2xl font-semibold text-gray-900">{availableCouriers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPinIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Toplam Teslimat</p>
                <p className="text-2xl font-semibold text-gray-900">{totalDeliveries}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Kurye Listesi */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Kuryeler ({couriers.length})</h2>
          </div>
          
          {couriers.length === 0 ? (
            <div className="p-6 text-center">
              <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Henüz kurye bulunmuyor</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                İlk kuryeyi ekleyin
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {couriers.map((courier) => (
                <div key={courier.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">{getVehicleIcon(courier.vehicle_type)}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-lg font-medium text-gray-900">
                            {courier.full_name}
                          </p>
                          <span className="text-sm text-gray-500">
                            {getStatusText(courier.courier_status)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center text-sm text-gray-500">
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            {courier.phone}
                          </div>
                          {courier.email && (
                            <div className="flex items-center text-sm text-gray-500">
                              <EnvelopeIcon className="h-4 w-4 mr-1" />
                              {courier.email}
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            {courier.vehicle_type} - {courier.license_plate}
                          </div>
                        </div>
                        {courier.last_location_update && (
                          <div className="flex items-center text-xs text-gray-400 mt-1">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            Son konum: {format(new Date(courier.last_location_update), 'dd MMM yyyy HH:mm', { locale: tr })}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Durumlar */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => toggleStatus(courier.id, 'is_active', courier.is_active)}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            courier.is_active 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {courier.is_active ? 'Aktif' : 'Pasif'}
                        </button>
                        <button
                          onClick={() => toggleStatus(courier.id, 'is_available', courier.is_available)}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            courier.is_available 
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {courier.is_available ? 'Müsait' : 'Meşgul'}
                        </button>
                      </div>

                      {/* Aksiyonlar */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEdit(courier)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(courier.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingCourier ? 'Kurye Düzenle' : 'Yeni Kurye Ekle'}
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ad Soyad
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-posta
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Kullanıcı Bilgileri */}
                    <div className="col-span-1 bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-3">
                        {editingCourier ? 'Giriş Bilgileri Güncelle' : 'Giriş Bilgileri'}
                      </h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kullanıcı Adı
                          </label>
                          <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder={editingCourier ? 
                              `Mevcut: ${editingCourier.users?.username || 'Bilinmiyor'}` : 
                              "Boş bırakılırsa telefon numarası kullanılır"
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                          {editingCourier && (
                            <p className="text-xs text-gray-500 mt-1">
                              Boş bırakılırsa değiştirilmez
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Şifre
                          </label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder={editingCourier ? 
                              "Yeni şifre (boş bırakılırsa değiştirilmez)" : 
                              "Boş bırakılırsa 'kurye123' kullanılır"
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                          {editingCourier && (
                            <p className="text-xs text-gray-500 mt-1">
                              Boş bırakılırsa mevcut şifre korunur
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Araç Tipi
                      </label>
                      <select
                        value={formData.vehicle_type}
                        onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Bisiklet">🚲 Bisiklet</option>
                        <option value="Motosiklet">🏍️ Motosiklet</option>
                        <option value="Araba">🚗 Araba</option>
                        <option value="Yürüme">🚶 Yürüme</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plaka
                      </label>
                      <input
                        type="text"
                        value={formData.license_plate}
                        onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Aktif</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_available}
                          onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Müsait</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingCourier ? 'Güncelle' : 'Ekle'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 