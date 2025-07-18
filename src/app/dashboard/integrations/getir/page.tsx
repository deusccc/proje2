'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  PhoneIcon,
  LinkIcon,
  InformationCircleIcon,
  ShoppingBagIcon,
  CogIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface GetirIntegration {
  id: string
  restaurant_id: string
  platform: string
  is_active: boolean
  app_secret_key?: string // Getir App Secret Key
  restaurant_secret_key?: string // Getir Restaurant Secret Key
  webhook_url?: string
  webhook_secret?: string
  last_sync_at?: string
  last_error?: string
  sync_status: 'idle' | 'syncing' | 'error' | 'success'
  created_at: string
  updated_at: string
}

export default function GetirIntegrationPage() {
  const [user, setUser] = useState<User | null>(null)
  const [integration, setIntegration] = useState<GetirIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState({
    is_active: false,
    app_secret_key: '',
    restaurant_secret_key: '',
    webhook_url: '',
    webhook_secret: ''
  })

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
    
    if (!currentUser.restaurant_id) {
      setMessage({ type: 'error', text: 'Restoran bilgisi bulunamadı.' })
      setLoading(false)
      return
    }
    
    await fetchIntegration(currentUser.restaurant_id)
    setLoading(false)
  }

  const fetchIntegration = async (restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('platform', 'getir')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setIntegration(data)
        setFormData({
          is_active: data.is_active,
          app_secret_key: data.app_secret_key || '',
          restaurant_secret_key: data.restaurant_secret_key || '',
          webhook_url: data.webhook_url || '',
          webhook_secret: data.webhook_secret || ''
        })
      }
    } catch (error) {
      console.error('Entegrasyon getirilemedi:', error)
      setMessage({ type: 'error', text: 'Entegrasyon bilgileri yüklenirken hata oluştu.' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    if (!user?.restaurant_id) {
      setMessage({ type: 'error', text: 'Restoran bilgisi bulunamadı.' })
      setSaving(false)
      return
    }

    try {
      const integrationData = {
        restaurant_id: user.restaurant_id,
        platform: 'getir',
        is_active: formData.is_active,
        app_secret_key: formData.app_secret_key || null,
        restaurant_secret_key: formData.restaurant_secret_key || null,
        webhook_url: formData.webhook_url || null,
        webhook_secret: formData.webhook_secret || null,
        updated_at: new Date().toISOString()
      }

      let result
      if (integration) {
        result = await supabase
          .from('integration_settings')
          .update(integrationData)
          .eq('id', integration.id)
          .select()
      } else {
        result = await supabase
          .from('integration_settings')
          .insert([integrationData])
          .select()
      }

      if (result.error) throw result.error

      setMessage({ 
        type: 'success', 
        text: integration ? 'Entegrasyon güncellendi!' : 'Entegrasyon oluşturuldu!' 
      })
      
      await fetchIntegration(user.restaurant_id)
    } catch (error) {
      console.error('Entegrasyon kaydedilemedi:', error)
      setMessage({ type: 'error', text: 'Entegrasyon kaydedilirken hata oluştu.' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!user?.restaurant_id) return

    setTesting(true)
    try {
      const response = await fetch('/api/integrations/getir/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: user.restaurant_id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage({ type: 'success', text: '✅ Getir Food bağlantısı başarılı!' })
      } else {
        setMessage({ type: 'error', text: `❌ ${result.error}` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Bağlantı testi sırasında hata oluştu.' })
    } finally {
      setTesting(false)
    }
  }

  const handleSyncMenu = async () => {
    if (!user?.restaurant_id) return

    setSyncing(true)
    try {
      const response = await fetch('/api/integrations/getir/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: user.restaurant_id,
          sync_products: true,
          sync_categories: true,
          sync_prices: true,
          sync_availability: true
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Senkronizasyon tamamlandı: ${result.data.syncedItems} öğe senkronize edildi` 
        })
      } else {
        setMessage({ type: 'error', text: `❌ ${result.error}` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Senkronizasyon sırasında hata oluştu.' })
    } finally {
      setSyncing(false)
    }
  }

  const handleViewMenu = () => {
    router.push('/dashboard/getir-menu')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user} onSignOut={() => router.push('/')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                <ShoppingBagIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Getir Food Entegrasyonu</h1>
                <p className="text-gray-600">Getir Food API'si ile restoran entegrasyonunuzu yönetin</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {integration?.is_active ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  Pasif
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bilgilendirme */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                Getir Food Entegrasyonu Hakkında
              </h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  <strong>Entegrasyon Süreci:</strong> Getir Food ile entegrasyon için sadece 2 temel bilgiye ihtiyacınız var:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>App Secret Key:</strong> Getir Food'dan size verilen uygulama gizli anahtarı</li>
                  <li><strong>Restaurant Secret Key:</strong> Restoranınıza özel gizli anahtar</li>
                </ul>
                <p>
                  Bu bilgilerle sistem otomatik olarak token alır ve tüm API işlemlerini gerçekleştirir.
                </p>
                <div className="mt-4 p-3 bg-yellow-100 rounded-md">
                  <p className="text-yellow-800 text-sm">
                    <strong>Önemli:</strong> Getir Food entegrasyonu için öncelikle Getir Food Partner Portal'dan onay almanız ve secret key'lerinizi almanız gerekmektedir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* İletişim Bilgileri */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">İletişim Bilgileri</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">E-posta</p>
                  <p className="text-sm text-gray-500">getiryemekapi@getir.com</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Telefon</p>
                  <p className="text-sm text-gray-500">0850 346 0 346</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <LinkIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Partner Portal</p>
                  <a href="https://partner.getir.com" target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:text-purple-800">
                    partner.getir.com
                  </a>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">API Dokümantasyonu</p>
                  <a href="https://developers.getir.com/food/documentation/" target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:text-purple-800">
                    developers.getir.com/food
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`rounded-lg p-4 flex items-center space-x-3 ${
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
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Entegrasyon Formu */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Entegrasyon Ayarları</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Aktif Durumu */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Entegrasyonu aktif et
              </label>
            </div>

            {/* Secret Key'ler */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="app_secret_key" className="block text-sm font-medium text-gray-700">
                  App Secret Key *
                </label>
                <input
                  type="password"
                  id="app_secret_key"
                  value={formData.app_secret_key}
                  onChange={(e) => setFormData({ ...formData, app_secret_key: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Getir Food'dan aldığınız App Secret Key"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Getir Food Partner Portal'dan aldığınız uygulama gizli anahtarı
                </p>
              </div>
              <div>
                <label htmlFor="restaurant_secret_key" className="block text-sm font-medium text-gray-700">
                  Restaurant Secret Key *
                </label>
                <input
                  type="password"
                  id="restaurant_secret_key"
                  value={formData.restaurant_secret_key}
                  onChange={(e) => setFormData({ ...formData, restaurant_secret_key: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Restoranınıza özel Secret Key"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Restoranınıza özel gizli anahtar
                </p>
              </div>
            </div>

            {/* Webhook Ayarları */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="webhook_url" className="block text-sm font-medium text-gray-700">
                  Webhook URL
                </label>
                <input
                  type="url"
                  id="webhook_url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                  placeholder="https://yourdomain.com/webhook/getir"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Sipariş bildirimleri için webhook URL'i (isteğe bağlı)
                </p>
              </div>
              <div>
                <label htmlFor="webhook_secret" className="block text-sm font-medium text-gray-700">
                  Webhook Secret
                </label>
                <input
                  type="password"
                  id="webhook_secret"
                  value={formData.webhook_secret}
                  onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Webhook doğrulama için secret"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Webhook güvenliği için secret anahtar (isteğe bağlı)
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-between">
              <div className="flex space-x-3">
                {integration && (
                  <>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      {testing ? (
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                      )}
                      Bağlantı Testi
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncMenu}
                      disabled={syncing}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      {syncing ? (
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                      )}
                      Menü Senkronize Et
                    </button>
                    <button
                      type="button"
                      onClick={handleViewMenu}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      Menüyü Görüntüle
                    </button>
                  </>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {saving ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CogIcon className="h-4 w-4 mr-2" />
                )}
                {integration ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>

        {/* Entegrasyon Durumu */}
        {integration && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Entegrasyon Durumu</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Son Senkronizasyon</p>
                  <p className="text-sm text-gray-900">
                    {integration.last_sync_at 
                      ? new Date(integration.last_sync_at).toLocaleString('tr-TR')
                      : 'Henüz senkronizasyon yapılmamış'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Durum</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    integration.sync_status === 'success' ? 'bg-green-100 text-green-800' :
                    integration.sync_status === 'error' ? 'bg-red-100 text-red-800' :
                    integration.sync_status === 'syncing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {integration.sync_status === 'success' ? 'Başarılı' :
                     integration.sync_status === 'error' ? 'Hata' :
                     integration.sync_status === 'syncing' ? 'Senkronizasyon' :
                     'Boşta'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Oluşturulma Tarihi</p>
                  <p className="text-sm text-gray-900">
                    {new Date(integration.created_at).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
              {integration.last_error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    <strong>Son Hata:</strong> {integration.last_error}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 