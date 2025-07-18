'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CogIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  PlusIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface IntegrationSettings {
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

interface SyncStats {
  total_syncs: number
  successful_syncs: number
  failed_syncs: number
  last_sync_date?: string
  total_orders: number
  daily_orders: number
}

interface PlatformInfo {
  id: string
  name: string
  displayName: string
  description: string
  icon: string
  color: string
  bgColor: string
  status: 'available' | 'coming_soon' | 'active' | 'inactive'
  features: string[]
  contactInfo?: {
    email?: string
    phone?: string
    website?: string
  }
}

const platforms: PlatformInfo[] = [
  {
    id: 'yemeksepeti',
    name: 'yemeksepeti',
    displayName: 'Yemeksepeti',
    description: 'Türkiye\'nin en büyük yemek sipariş platformu (HesapApps entegrasyon partneri)',
    icon: '🍽️',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    status: 'available',
    features: ['Otomatik menü senkronizasyonu', 'Sipariş yönetimi', 'Webhook desteği', 'Gerçek zamanlı bildirimler'],
    contactInfo: {
      email: 'hesapapps@yemeksepeti.com',
      phone: '0850 808 0 808',
      website: 'https://hesapapps.yemeksepeti.com'
    }
  },
  {
    id: 'getir',
    name: 'getir',
    displayName: 'Getir Yemek',
    description: 'Hızlı teslimat odaklı yemek platformu',
    icon: '🚚',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    status: 'available',
    features: ['Hızlı teslimat', 'Anlık sipariş takibi', 'Otomatik menü güncelleme', 'Ürün durumu senkronizasyonu'],
    contactInfo: {
      email: 'partner@getir.com',
      phone: '0850 346 0 346',
      website: 'https://partner.getir.com'
    }
  },
  {
    id: 'trendyol',
    name: 'trendyol',
    displayName: 'Trendyol GO',
    description: 'Trendyol\'un yemek sipariş platformu - Restoran entegrasyonu',
    icon: '🛍️',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    status: 'available',
    features: ['Geniş müşteri kitlesi', 'Entegre ödeme sistemi', 'Kampanya yönetimi', 'Otomatik menü senkronizasyonu'],
    contactInfo: {
      email: 'restaurant@trendyol.com',
      website: 'https://partner.trendyol.com'
    }
  },
  {
    id: 'migros',
    name: 'migros',
    displayName: 'Migros Yemek',
    description: 'Migros\'un yemek sipariş platformu',
    icon: '🏪',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    status: 'coming_soon',
    features: ['Market entegrasyonu', 'Toplu sipariş desteği', 'Kurumsal müşteriler'],
    contactInfo: {
      email: 'yemek@migros.com.tr'
    }
  }
]

export default function IntegrationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [integrations, setIntegrations] = useState<IntegrationSettings[]>([])
  const [syncStats, setSyncStats] = useState<SyncStats>({
    total_syncs: 0,
    successful_syncs: 0,
    failed_syncs: 0,
    total_orders: 0,
    daily_orders: 0
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
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
    
    if (!currentUser.restaurant_id) {
      setMessage({ type: 'error', text: 'Restoran bilgisi bulunamadı.' })
      setLoading(false)
      return
    }
    
    await fetchIntegrations(currentUser.restaurant_id)
    await fetchSyncStats(currentUser.restaurant_id)
    setLoading(false)
  }

  const fetchIntegrations = async (restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setIntegrations(data || [])
    } catch (error) {
      console.error('Entegrasyonlar getirilemedi:', error)
      setMessage({ type: 'error', text: 'Entegrasyonlar yüklenirken hata oluştu.' })
    }
  }

  const fetchSyncStats = async (restaurantId: string) => {
    try {
      // Sync loglarından istatistik al
      const { data: syncLogs, error: syncError } = await supabase
        .from('menu_sync_logs')
        .select('*')
        .eq('restaurant_id', restaurantId)

      if (syncError) throw syncError

      // Harici siparişlerden istatistik al
      const { data: externalOrders, error: ordersError } = await supabase
        .from('external_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)

      if (ordersError) throw ordersError

      const today = new Date().toISOString().split('T')[0]
      const dailyOrders = externalOrders?.filter(order => 
        order.order_date.startsWith(today)
      ).length || 0

      setSyncStats({
        total_syncs: syncLogs?.length || 0,
        successful_syncs: syncLogs?.filter(log => log.sync_status === 'completed').length || 0,
        failed_syncs: syncLogs?.filter(log => log.sync_status === 'failed').length || 0,
        last_sync_date: syncLogs?.[0]?.created_at,
        total_orders: externalOrders?.length || 0,
        daily_orders: dailyOrders
      })
    } catch (error) {
      console.error('Sync istatistikleri getirilemedi:', error)
    }
  }

  const handleSignOut = () => {
    router.push('/')
  }

  const getPlatformIntegration = (platformId: string) => {
    return integrations.find(int => int.platform === platformId)
  }

  const getPlatformStatus = (platform: PlatformInfo) => {
    if (platform.status === 'coming_soon') return 'coming_soon'
    
    const integration = getPlatformIntegration(platform.id)
    if (!integration) return 'available'
    
    return integration.is_active ? 'active' : 'inactive'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'coming_soon':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktif'
      case 'inactive':
        return 'Pasif'
      case 'coming_soon':
        return 'Yakında'
      default:
        return 'Kullanılabilir'
    }
  }

  const handlePlatformClick = (platform: PlatformInfo) => {
    if (platform.status === 'coming_soon') {
      setMessage({ type: 'error', text: `${platform.displayName} entegrasyonu henüz kullanılabilir değil.` })
      return
    }
    
    // Platform'a göre özel routing
    if (platform.id === 'trendyol') {
      router.push(`/dashboard/integrations/trendyol-go`)
    } else if (platform.id === 'getir') {
      router.push(`/dashboard/integrations/getir`)
    } else {
      router.push(`/dashboard/integrations/${platform.id}`)
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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Platform Entegrasyonları</h1>
            <p className="mt-2 text-gray-600">
              Yemek sipariş platformları ile entegrasyon ayarlarını yönetin
            </p>
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-500">
                  <CogIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Aktif Entegrasyonlar</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {integrations.filter(i => i.is_active).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-500">
                  <CloudArrowUpIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Toplam Senkronizasyon</p>
                  <p className="text-2xl font-bold text-gray-900">{syncStats.total_syncs}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-500">
                  <ArrowPathIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Harici Siparişler</p>
                  <p className="text-2xl font-bold text-gray-900">{syncStats.total_orders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-500">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Bugünkü Siparişler</p>
                  <p className="text-2xl font-bold text-gray-900">{syncStats.daily_orders}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((platform) => {
              const integration = getPlatformIntegration(platform.id)
              const status = getPlatformStatus(platform)
              
              return (
                <div
                  key={platform.id}
                  className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer ${
                    platform.status === 'coming_soon' ? 'opacity-75' : ''
                  }`}
                  onClick={() => handlePlatformClick(platform)}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-full ${platform.bgColor}`}>
                          <span className="text-2xl">{platform.icon}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{platform.displayName}</h3>
                          <p className="text-sm text-gray-500">{platform.description}</p>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    </div>

                    <div className="mb-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                        {getStatusText(status)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium text-gray-700">Özellikler:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {platform.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {integration && (
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Son Senkronizasyon:</span>
                          <span className="text-gray-900">
                            {integration.last_sync_at 
                              ? new Date(integration.last_sync_at).toLocaleDateString('tr-TR')
                              : 'Henüz yapılmadı'
                            }
                          </span>
                        </div>
                        {integration.last_error && (
                          <div className="mt-2 text-xs text-red-600">
                            Hata: {integration.last_error}
                          </div>
                        )}
                      </div>
                    )}

                    {platform.status === 'coming_soon' && (
                      <div className="border-t pt-4">
                        <p className="text-sm text-yellow-600">
                          Bu platform entegrasyonu yakında kullanılabilir olacak.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Help Section */}
          <div className="mt-12 bg-blue-50 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  Entegrasyon Yardımı
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    <strong>Yemeksepeti Entegrasyonu:</strong> Entegrasyon için öncelikle Yemeksepeti'ne başvuru yapmanız ve entegrasyon kodlarınızı almanız gerekmektedir.
                  </p>
                  <p>
                    <strong>İletişim:</strong> Entegrasyon sürecinde yardıma ihtiyacınız olursa, ilgili platform destek ekipleriyle iletişime geçebilirsiniz.
                  </p>
                  <p>
                    <strong>Önemli:</strong> Entegrasyon öncesi mutlaka test ortamında deneme yapın ve tüm ayarları doğrulayın.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 