'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import {
  ShoppingBagIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  CurrencyDollarIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface TrendyolProduct {
  id: string
  name: string
  description?: string
  price?: number
  originalPrice?: number
  isAvailable: boolean
  categoryId: string
  categoryName: string
  imageUrl?: string
  variants?: any[]
  portions?: any[]
}

interface TrendyolCategory {
  id: string
  name: string
  isAvailable: boolean
  sortOrder: number
}

interface ProductMapping {
  id: string
  internal_product_id: string
  external_product_id: string
  platform: string
  external_product_name: string
  internal_product_name: string
  price_sync_enabled: boolean
  availability_sync_enabled: boolean
  last_synced_at?: string
  sync_status: 'synced' | 'pending' | 'error'
}

interface InternalProduct {
  id: string
  name: string
  description: string
  base_price: number
  is_available: boolean
  categories: { name: string }[]
}

export default function TrendyolMenuPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [trendyolProducts, setTrendyolProducts] = useState<TrendyolProduct[]>([])
  const [trendyolCategories, setTrendyolCategories] = useState<TrendyolCategory[]>([])
  const [internalProducts, setInternalProducts] = useState<InternalProduct[]>([])
  const [productMappings, setProductMappings] = useState<ProductMapping[]>([])
  const [syncing, setSyncing] = useState(false)
  const [fetchingMenu, setFetchingMenu] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [selectedTab, setSelectedTab] = useState<'trendyol' | 'categories' | 'mappings' | 'sync'>('trendyol')
  const [stats, setStats] = useState({
    totalTrendyolProducts: 0,
    totalTrendyolCategories: 0,
    totalMappings: 0,
    syncedProducts: 0,
    pendingProducts: 0
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
    
    if (!currentUser.restaurant_id) {
      setMessage({ type: 'error', text: 'Restoran bilgisi bulunamadı.' })
      setLoading(false)
      return
    }
    
    await Promise.all([
      fetchInternalProducts(currentUser.restaurant_id),
      fetchProductMappings(currentUser.restaurant_id),
      fetchTrendyolMenu(currentUser.restaurant_id)
    ])
    setLoading(false)
  }

  // İç ürünleri getir
  const fetchInternalProducts = async (restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          base_price,
          is_available,
          categories(name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true })

      if (error) {
        console.error('İç ürünler getirilemedi:', error)
        setMessage({ type: 'error', text: 'İç ürünler yüklenemedi' })
        return
      }

      setInternalProducts(data || [])
    } catch (error) {
      console.error('İç ürünler getirilemedi:', error)
      setMessage({ type: 'error', text: 'İç ürünler yüklenemedi' })
    }
  }

  const fetchProductMappings = async (restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('platform_product_mappings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('platform', 'trendyol')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProductMappings(data || [])
      
      // İstatistikleri güncelle
      const synced = data?.filter(m => m.sync_status === 'synced').length || 0
      const pending = data?.filter(m => m.sync_status === 'pending').length || 0
      
      setStats(prev => ({
        ...prev,
        totalMappings: data?.length || 0,
        syncedProducts: synced,
        pendingProducts: pending
      }))
    } catch (error) {
      console.error('Ürün eşleştirmeleri getirilemedi:', error)
      setMessage({ type: 'error', text: 'Ürün eşleştirmeleri yüklenirken hata oluştu.' })
    }
  }

  const fetchTrendyolMenu = async (restaurantId: string) => {
    setFetchingMenu(true)
    try {
      const response = await fetch('/api/integrations/trendyol/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurantId
        })
      })

      const result = await response.json()
      
      if (result.success && result.data) {
        console.log('🔍 Frontend - Trendyol menü verisi:', result.data)
        console.log('🔍 Frontend - İlk ürün:', result.data.products[0])
        console.log('🔍 Frontend - İlk kategori:', result.data.categories[0])
        
        setTrendyolProducts(result.data.products || [])
        setTrendyolCategories(result.data.categories || [])
        setStats(prev => ({
          ...prev,
          totalTrendyolProducts: result.data.products?.length || 0,
          totalTrendyolCategories: result.data.categories?.length || 0
        }))
        setMessage({ 
          type: 'success', 
          text: `✅ Trendyol menüsü başarıyla çekildi: ${result.data.products?.length || 0} ürün, ${result.data.categories?.length || 0} kategori` 
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ ${result.error || 'Trendyol menüsü alınamadı'}` 
        })
      }
    } catch (error) {
      console.error('Trendyol menü hatası:', error)
      setMessage({ type: 'error', text: 'Trendyol menüsü alınırken hata oluştu.' })
    } finally {
      setFetchingMenu(false)
    }
  }

  const handleSyncProducts = async () => {
    if (!user?.restaurant_id) return
    
    setSyncing(true)
    try {
      const response = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: user.restaurant_id,
          platform: 'trendyol',
          sync_type: 'full',
          products: true,
          categories: true
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ ${result.message} - ${result.syncedItems} ürün senkronize edildi` 
        })
        await Promise.all([
          fetchProductMappings(user.restaurant_id),
          fetchTrendyolMenu(user.restaurant_id)
        ])
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ ${result.error || 'Senkronizasyon başarısız'}` 
        })
      }
    } catch (error) {
      console.error('Senkronizasyon hatası:', error)
      setMessage({ type: 'error', text: 'Senkronizasyon sırasında hata oluştu.' })
    } finally {
      setSyncing(false)
    }
  }

  const handleCreateMapping = async (trendyolProduct: TrendyolProduct, internalProductId: string) => {
    if (!user?.restaurant_id) return

    try {
      const { error } = await supabase
        .from('platform_product_mappings')
        .insert([{
          restaurant_id: user.restaurant_id,
          platform: 'trendyol',
          internal_product_id: internalProductId,
          external_product_id: trendyolProduct.id,
          external_product_name: trendyolProduct.name,
          internal_product_name: internalProducts.find(p => p.id === internalProductId)?.name || '',
          price_sync_enabled: true,
          availability_sync_enabled: true,
          sync_status: 'pending'
        }])

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: `✅ Ürün eşleştirmesi oluşturuldu: ${trendyolProduct.name}` 
      })
      
      await fetchProductMappings(user.restaurant_id)
    } catch (error) {
      console.error('Eşleştirme oluşturulamadı:', error)
      setMessage({ type: 'error', text: 'Ürün eşleştirmesi oluşturulurken hata oluştu.' })
    }
  }

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      const { error } = await supabase
        .from('platform_product_mappings')
        .delete()
        .eq('id', mappingId)

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: '✅ Ürün eşleştirmesi silindi' 
      })
      
      if (user?.restaurant_id) {
        await fetchProductMappings(user.restaurant_id)
      }
    } catch (error) {
      console.error('Eşleştirme silinemedi:', error)
      setMessage({ type: 'error', text: 'Ürün eşleştirmesi silinirken hata oluştu.' })
    }
  }

  const handleToggleSyncOption = async (mappingId: string, field: 'price_sync_enabled' | 'availability_sync_enabled', value: boolean) => {
    try {
      const { error } = await supabase
        .from('platform_product_mappings')
        .update({ [field]: value })
        .eq('id', mappingId)

      if (error) throw error

      if (user?.restaurant_id) {
        await fetchProductMappings(user.restaurant_id)
      }
    } catch (error) {
      console.error('Senkronizasyon seçeneği güncellenemedi:', error)
      setMessage({ type: 'error', text: 'Senkronizasyon seçeneği güncellenirken hata oluştu.' })
    }
  }

  const handleToggleProductAvailability = async (productId: string, currentStatus: boolean) => {
    if (!user?.restaurant_id) return

    try {
      console.log('🔄 Toggle product availability:', { productId, currentStatus, newStatus: !currentStatus })
      
      const response = await fetch('/api/integrations/trendyol/product/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: user.restaurant_id,
          product_id: productId,
          is_available: !currentStatus
        })
      })

      const result = await response.json()
      console.log('📥 Toggle response:', result)
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Ürün ${!currentStatus ? 'aktif' : 'pasif'} hale getirildi` 
        })
        
        // Ürünlerin durumunu local state'te güncelle
        setTrendyolProducts(prevProducts => 
          prevProducts.map(product => 
            product.id === productId 
              ? { ...product, isAvailable: !currentStatus }
              : product
          )
        )
        
        // fetchTrendyolMenu çağrısını kaldır - gereksiz ve sorunlu
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ ${result.error || 'Ürün durumu güncellenemedi'}` 
        })
      }
    } catch (error) {
      console.error('Ürün durumu güncellenemedi:', error)
      setMessage({ type: 'error', text: 'Ürün durumu güncellenirken hata oluştu.' })
    }
  }

  const handleToggleCategoryAvailability = async (categoryId: string, currentStatus: boolean) => {
    if (!user?.restaurant_id) return

    try {
      console.log('🔄 Toggle category availability:', { categoryId, currentStatus, newStatus: !currentStatus })
      
      const response = await fetch('/api/integrations/trendyol/category/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: user.restaurant_id,
          category_id: categoryId,
          is_available: !currentStatus
        })
      })

      const result = await response.json()
      console.log('📥 Category toggle response:', result)
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Kategori ${!currentStatus ? 'aktif' : 'pasif'} hale getirildi` 
        })
        
        // Kategorilerin durumunu local state'te güncelle
        setTrendyolCategories(prevCategories => 
          prevCategories.map(category => 
            category.id === categoryId 
              ? { ...category, isAvailable: !currentStatus }
              : category
          )
        )
        
        // Menüyü yenile
        await fetchTrendyolMenu(user.restaurant_id)
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ ${result.error || 'Kategori durumu güncellenemedi'}` 
        })
      }
    } catch (error) {
      console.error('Kategori durumu güncellenemedi:', error)
      setMessage({ type: 'error', text: 'Kategori durumu güncellenirken hata oluştu.' })
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
    <DashboardLayout user={user} onSignOut={() => router.push('/')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
                <ShoppingBagIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Trendyol Menü Yönetimi</h1>
                <p className="text-gray-600">Trendyol ürünlerinizi yönetin ve sisteminizle senkronize edin</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => user?.restaurant_id && fetchTrendyolMenu(user.restaurant_id)}
                disabled={fetchingMenu}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {fetchingMenu ? (
                  <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <CloudArrowDownIcon className="h-4 w-4 mr-2" />
                )}
                Menüyü Çek
              </button>
              <button
                onClick={handleSyncProducts}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {syncing ? (
                  <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                )}
                Senkronize Et
              </button>
            </div>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShoppingBagIcon className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Trendyol Ürünleri</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalTrendyolProducts}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <SparklesIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Kategoriler</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalTrendyolCategories}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <LinkIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Eşleştirmeler</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalMappings}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Senkronize</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.syncedProducts}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Bekleyen</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.pendingProducts}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mesaj */}
        {message && (
          <div className={`rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : message.type === 'error' ? (
                <XCircleIcon className="h-5 w-5 text-red-400" />
              ) : (
                <InformationCircleIcon className="h-5 w-5 text-blue-400" />
              )}
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-green-800' : 
                  message.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setSelectedTab('trendyol')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  selectedTab === 'trendyol'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Trendyol Ürünleri ({stats.totalTrendyolProducts})
              </button>
              <button
                onClick={() => setSelectedTab('categories')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  selectedTab === 'categories'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Kategoriler ({stats.totalTrendyolCategories})
              </button>
              <button
                onClick={() => setSelectedTab('mappings')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  selectedTab === 'mappings'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Ürün Eşleştirmeleri ({stats.totalMappings})
              </button>
              <button
                onClick={() => setSelectedTab('sync')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  selectedTab === 'sync'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Senkronizasyon Ayarları
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Trendyol Ürünleri Tab */}
            {selectedTab === 'trendyol' && (
              <div className="space-y-4">
                {trendyolProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Ürün bulunamadı</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Trendyol menünüzü çekmek için "Menüyü Çek" butonuna tıklayın
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trendyolProducts.map((product) => {
                      const isMapping = productMappings.find(m => m.external_product_id === product.id)
                      
                      return (
                        <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{product.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">{product.categoryName}</p>
                              <div className="mt-2 flex items-center space-x-2">
                                <span className="text-lg font-bold text-orange-600">
                                  ₺{(() => {
                                    const price = product.price;
                                    console.log(`🔍 Ürün ${product.name} fiyatı:`, price, typeof price);
                                    if (price !== undefined && price !== null && !isNaN(price)) {
                                      return Number(price).toFixed(2);
                                    }
                                    return '0.00';
                                  })()}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleToggleProductAvailability(product.id, product.isAvailable)}
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                      product.isAvailable
                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                                    }`}
                                  >
                                    {product.isAvailable ? (
                                      <>
                                        <EyeIcon className="h-3 w-3 mr-1" />
                                        Aktif
                                      </>
                                    ) : (
                                      <>
                                        <EyeSlashIcon className="h-3 w-3 mr-1" />
                                        Pasif
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                              {product.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            {isMapping ? (
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <LinkIcon className="h-3 w-3 mr-1" />
                                  Eşleştirildi
                                </span>
                                <button
                                  onClick={() => handleDeleteMapping(isMapping.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Kaldır
                                </button>
                              </div>
                            ) : (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleCreateMapping(product, e.target.value)
                                    e.target.value = ''
                                  }
                                }}
                                className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              >
                                <option value="">İç ürünle eşleştir...</option>
                                {internalProducts
                                  .filter(ip => !productMappings.find(m => m.internal_product_id === ip.id))
                                  .map(internalProduct => (
                                    <option key={internalProduct.id} value={internalProduct.id}>
                                      {internalProduct.name} - ₺{internalProduct.base_price.toFixed(2)}
                                    </option>
                                  ))
                                }
                              </select>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Kategoriler Tab */}
            {selectedTab === 'categories' && (
              <div className="space-y-4">
                {trendyolCategories.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Kategori bulunamadı</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Trendyol menünüzde kategoriler yüklenmedi. "Menüyü Çek" butonuna tıklayarak menüyü yeniden çekin.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trendyolCategories.map((category) => (
                      <div key={category.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{category.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">ID: {category.id}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleToggleCategoryAvailability(category.id, category.isAvailable)}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                category.isAvailable
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              {category.isAvailable ? (
                                <>
                                  <EyeIcon className="h-3 w-3 mr-1" />
                                  Aktif
                                </>
                              ) : (
                                <>
                                  <EyeSlashIcon className="h-3 w-3 mr-1" />
                                  Pasif
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Ürün Eşleştirmeleri Tab */}
            {selectedTab === 'mappings' && (
              <div className="space-y-4">
                {productMappings.length === 0 ? (
                  <div className="text-center py-12">
                    <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Eşleştirme bulunamadı</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Ürünlerinizi eşleştirmek için "Trendyol Ürünleri" sekmesini kullanın
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Trendyol Ürünü
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İç Ürün
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Senkronizasyon
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Durum
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İşlemler
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {productMappings.map((mapping) => (
                          <tr key={mapping.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {mapping.external_product_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {mapping.external_product_id}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {mapping.internal_product_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-2">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={mapping.price_sync_enabled}
                                    onChange={(e) => handleToggleSyncOption(mapping.id, 'price_sync_enabled', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">Fiyat Sync</span>
                                </label>
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={mapping.availability_sync_enabled}
                                    onChange={(e) => handleToggleSyncOption(mapping.id, 'availability_sync_enabled', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">Stok Sync</span>
                                </label>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {mapping.sync_status === 'synced' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                                  Senkronize
                                </span>
                              ) : mapping.sync_status === 'pending' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                  Bekliyor
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircleIcon className="h-3 w-3 mr-1" />
                                  Hata
                                </span>
                              )}
                              {mapping.last_synced_at && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(mapping.last_synced_at).toLocaleString('tr-TR')}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDeleteMapping(mapping.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Sil
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Senkronizasyon Ayarları Tab */}
            {selectedTab === 'sync' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Senkronizasyon Bilgileri</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Otomatik senkronizasyon entegrasyon ayarlarından yapılabilir</li>
                          <li>Manuel senkronizasyon için "Senkronize Et" butonunu kullanın</li>
                          <li>Ürün eşleştirmeleri oluşturduktan sonra senkronizasyon yapın</li>
                          <li>Fiyat ve stok sync seçeneklerini ürün bazında ayarlayabilirsiniz</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Hızlı İşlemler</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => user?.restaurant_id && fetchTrendyolMenu(user.restaurant_id)}
                        disabled={fetchingMenu}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {fetchingMenu ? (
                          <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                        ) : (
                          <CloudArrowDownIcon className="h-4 w-4 mr-2" />
                        )}
                        Trendyol Menüsünü Yenile
                      </button>
                      
                      <button
                        onClick={handleSyncProducts}
                        disabled={syncing}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {syncing ? (
                          <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                        ) : (
                          <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                        )}
                        Tüm Ürünleri Senkronize Et
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Senkronizasyon İstatistikleri</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Toplam Eşleştirme:</span>
                        <span className="text-sm font-medium">{stats.totalMappings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Senkronize Ürün:</span>
                        <span className="text-sm font-medium text-green-600">{stats.syncedProducts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Bekleyen Ürün:</span>
                        <span className="text-sm font-medium text-yellow-600">{stats.pendingProducts}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 