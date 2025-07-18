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
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface YemeksepetiIntegration {
  id: string
  restaurant_id: string
  platform: string
  is_active: boolean
  vendor_id?: string
  restaurant_name?: string
  chain_code?: string
  branch_code?: string
  integration_code?: string
  webhook_url?: string
  webhook_secret?: string
  auto_sync_menu: boolean
  auto_sync_orders: boolean
  sync_interval: number
  price_markup_percentage: number
  delivery_fee_override?: number
  last_sync_at?: string
  last_error?: string
  sync_status: 'idle' | 'syncing' | 'error' | 'success'
  created_at: string
  updated_at: string
}

export default function YemeksepetiIntegrationPage() {
  const [user, setUser] = useState<User | null>(null)
  const [integration, setIntegration] = useState<YemeksepetiIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState({
    is_active: false,
    vendor_id: '',
    restaurant_name: '',
    chain_code: '',
    branch_code: '',
    integration_code: '',
    webhook_url: '',
    webhook_secret: '',
    auto_sync_menu: true,
    auto_sync_orders: true,
    sync_interval: 30,
    price_markup_percentage: 0,
    delivery_fee_override: ''
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
        .eq('platform', 'yemeksepeti')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setIntegration(data)
        setFormData({
          is_active: data.is_active,
          vendor_id: data.vendor_id || '',
          restaurant_name: data.restaurant_name || '',
          chain_code: data.chain_code || '',
          branch_code: data.branch_code || '',
          integration_code: data.integration_code || '',
          webhook_url: data.webhook_url || '',
          webhook_secret: data.webhook_secret || '',
          auto_sync_menu: data.auto_sync_menu,
          auto_sync_orders: data.auto_sync_orders,
          sync_interval: data.sync_interval,
          price_markup_percentage: data.price_markup_percentage,
          delivery_fee_override: data.delivery_fee_override?.toString() || ''
        })
      }
    } catch (error) {
      console.error('Entegrasyon getirilemedi:', error)
      setMessage({ type: 'error', text: 'Entegrasyon bilgileri yüklenirken hata oluştu.' })
    }
  }

  const handleSignOut = () => {
    router.push('/')
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
        platform: 'yemeksepeti',
        is_active: formData.is_active,
        vendor_id: formData.vendor_id || null,
        restaurant_name: formData.restaurant_name || null,
        chain_code: formData.chain_code || null,
        branch_code: formData.branch_code || null,
        integration_code: formData.integration_code || null,
        webhook_url: formData.webhook_url || null,
        webhook_secret: formData.webhook_secret || null,
        auto_sync_menu: formData.auto_sync_menu,
        auto_sync_orders: formData.auto_sync_orders,
        sync_interval: formData.sync_interval,
        price_markup_percentage: formData.price_markup_percentage,
        delivery_fee_override: formData.delivery_fee_override ? parseFloat(formData.delivery_fee_override) : null,
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

  const handleManualSync = async () => {
    if (!integration) return
    
    setSyncing(true)
    try {
      const response = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: user?.restaurant_id,
          platform: 'yemeksepeti',
          sync_type: 'full'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Senkronizasyon tamamlandı!' })
        await fetchIntegration(user!.restaurant_id!)
      } else {
        setMessage({ type: 'error', text: result.error || 'Senkronizasyon başarısız!' })
      }
    } catch (error) {
      console.error('Senkronizasyon hatası:', error)
      setMessage({ type: 'error', text: 'Senkronizasyon sırasında hata oluştu.' })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user} onSignOut={handleSignOut} allowedRoles={['admin', 'manager']}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">YS</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Yemeksepeti Entegrasyonu</h1>
                <p className="mt-2 text-gray-600">
                  Yemeksepeti platformu ile entegrasyon ayarlarını yönetin
                </p>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 rounded-lg p-4 flex items-center space-x-3 ${
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

          {/* Entegrasyon Bilgileri */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  Yemeksepeti Entegrasyonu Hakkında
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    <strong>Entegrasyon Süreci:</strong> Yemeksepeti ile entegrasyon için aşağıdaki adımları takip etmeniz gerekmektedir:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>HesapApps'e (Yemeksepeti'nin resmi entegrasyon partneri) e-posta göndererek entegrasyon talebinde bulunun</li>
                    <li>HesapApps'ten entegrasyon kodunuzu (Integration Code) alın</li>
                    <li>Platform Satıcı ID'nizi (Vendor ID) öğrenin</li>
                    <li>Aşağıdaki formu doldurun ve entegrasyonu aktif edin</li>
                  </ol>
                  <div className="mt-4 p-3 bg-yellow-100 rounded-md">
                    <p className="text-yellow-800 text-sm">
                      <strong>Önemli:</strong> Yemeksepeti entegrasyonu için öncelikle HesapApps (Yemeksepeti'nin entegrasyon partneri) ile iletişime geçmeniz ve onaylanmanız gerekmektedir. HesapApps, Yemeksepeti'nin resmi entegrasyon hizmet sağlayıcısıdır.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Entegrasyon Süreci Adımları */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Entegrasyon Süreci</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Başvuru</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      HesapApps'e (Yemeksepeti'nin resmi entegrasyon partneri) e-posta göndererek entegrasyon talebinde bulunun. 
                      Restoran bilgilerinizi ve entegrasyon ihtiyacınızı belirtin.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Onay ve Bilgiler</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Başvurunuz onaylandıktan sonra size Vendor ID, Integration Code ve diğer gerekli bilgiler gönderilecektir.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Konfigürasyon</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Aldığınız bilgileri aşağıdaki forma girerek entegrasyonu aktif edin. 
                      Test siparişleri ile doğrulamayı unutmayın.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Canlı Geçiş</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Test sürecini tamamladıktan sonra entegrasyonunuz canlı olarak çalışmaya başlayacaktır.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* İletişim Bilgileri */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">İletişim Bilgileri</h2>
              <p className="text-sm text-gray-500 mt-1">
                HesapApps - Yemeksepeti'nin Resmi Entegrasyon Partneri
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Entegrasyon E-posta</p>
                      <p className="text-sm text-gray-500">hesapapps@yemeksepeti.com</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Destek Telefonu</p>
                      <p className="text-sm text-gray-500">0850 808 0 808</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <LinkIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">HesapApps Portal</p>
                      <a 
                        href="https://hesapapps.yemeksepeti.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        hesapapps.yemeksepeti.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">API Dokümantasyonu</p>
                      <a 
                        href="https://developers.yemeksepeti.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        developers.yemeksepeti.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Entegrasyon Formu */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Entegrasyon Ayarları</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Aktif Durumu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entegrasyon Durumu
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={() => setFormData(prev => ({ ...prev, is_active: true }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Aktif</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="is_active"
                        checked={!formData.is_active}
                        onChange={() => setFormData(prev => ({ ...prev, is_active: false }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Pasif</span>
                    </label>
                  </div>
                </div>

                {/* Temel Bilgiler */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Temel Bilgiler</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vendor ID (Platform Satıcı ID) *
                      </label>
                      <input
                        type="text"
                        value={formData.vendor_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, vendor_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Yemeksepeti'den aldığınız Vendor ID"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Restoran Adı *
                      </label>
                      <input
                        type="text"
                        value={formData.restaurant_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, restaurant_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Yemeksepeti'deki restoran adınız"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chain Code (Zincir Kodu)
                      </label>
                      <input
                        type="text"
                        value={formData.chain_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, chain_code: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Zincir işletmesi ise Chain Code"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Branch Code (Şube Kodu)
                      </label>
                      <input
                        type="text"
                        value={formData.branch_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, branch_code: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Şube kodunuz"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Integration Code (Entegrasyon Kodu)
                      </label>
                      <input
                        type="text"
                        value={formData.integration_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, integration_code: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Yemeksepeti'den aldığınız entegrasyon kodu"
                      />
                    </div>
                  </div>
                </div>

                {/* Webhook Bilgileri */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Webhook Bilgileri</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Webhook URL
                      </label>
                      <input
                        type="url"
                        value={formData.webhook_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://yourdomain.com/api/webhooks/yemeksepeti"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Webhook Secret
                      </label>
                      <input
                        type="password"
                        value={formData.webhook_secret}
                        onChange={(e) => setFormData(prev => ({ ...prev, webhook_secret: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Webhook doğrulama anahtarı"
                      />
                    </div>
                  </div>
                </div>

                {/* Senkronizasyon Ayarları */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Senkronizasyon Ayarları</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.auto_sync_menu}
                          onChange={(e) => setFormData(prev => ({ ...prev, auto_sync_menu: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Otomatik Menü Senkronizasyonu</span>
                      </label>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.auto_sync_orders}
                          onChange={(e) => setFormData(prev => ({ ...prev, auto_sync_orders: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Otomatik Sipariş Senkronizasyonu</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Senkronizasyon Aralığı (dakika)
                      </label>
                      <input
                        type="number"
                        value={formData.sync_interval}
                        onChange={(e) => setFormData(prev => ({ ...prev, sync_interval: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="5"
                        max="1440"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fiyat Artış Oranı (%)
                      </label>
                      <input
                        type="number"
                        value={formData.price_markup_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, price_markup_percentage: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                {/* Teslimat Ayarları */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Teslimat Ayarları</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teslimat Ücreti Override (₺)
                    </label>
                    <input
                      type="number"
                      value={formData.delivery_fee_override}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_fee_override: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      placeholder="Boş bırakılırsa varsayılan ücret kullanılır"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-between pt-6 border-t">
                  <div>
                    {integration && integration.is_active && (
                      <button
                        type="button"
                        onClick={handleManualSync}
                        disabled={syncing}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors disabled:opacity-50"
                      >
                        <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{syncing ? 'Senkronize Ediliyor...' : 'Manuel Senkronizasyon'}</span>
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/integrations')}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Geri Dön
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Kaydediliyor...' : (integration ? 'Güncelle' : 'Kaydet')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 