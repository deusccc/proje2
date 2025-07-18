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

interface GetirProduct {
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
  modifierGroups?: any[]
}

interface GetirCategory {
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

export default function GetirMenuPage() {
  const [user, setUser] = useState<User | null>(null)
  const [getirProducts, setGetirProducts] = useState<GetirProduct[]>([])
  const [getirCategories, setGetirCategories] = useState<GetirCategory[]>([])
  const [internalProducts, setInternalProducts] = useState<InternalProduct[]>([])
  const [productMappings, setProductMappings] = useState<ProductMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    totalMappings: 0,
    syncedProducts: 0,
    pendingProducts: 0
  })
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'mappings' | 'internal'>('products')
  const router = useRouter()

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }
        setUser(currentUser)
        
        if (currentUser.restaurant_id) {
          await Promise.all([
            fetchGetirMenu(currentUser.restaurant_id),
            fetchInternalProducts(currentUser.restaurant_id),
            fetchProductMappings(currentUser.restaurant_id)
          ])
        }
      } catch (error) {
        console.error('Kullanıcı bilgileri alınamadı:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    initializeUser()
  }, [router])

  // Getir Food menüsünü getir
  const fetchGetirMenu = async (restaurantId: string) => {
    try {
      const response = await fetch('/api/integrations/getir/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurantId
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setGetirProducts(result.data.products || [])
        setGetirCategories(result.data.categories || [])
        setStats(prev => ({
          ...prev,
          totalProducts: result.data.products?.length || 0,
          totalCategories: result.data.categories?.length || 0
        }))
      } else {
        setMessage({ type: 'error', text: result.error || 'Getir Food menüsü yüklenemedi' })
      }
    } catch (error) {
      console.error('Getir Food menüsü getirilemedi:', error)
      setMessage({ type: 'error', text: 'Getir Food menüsü yüklenemedi' })
    }
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
        .eq('platform', 'getir')
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

  const handleTestConnection = async () => {
    if (!user?.restaurant_id) return

    setLoading(true)
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
      setLoading(false)
    }
  }

  const handleSyncAll = async () => {
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
        
        // Verileri yenile
        await Promise.all([
          fetchGetirMenu(user.restaurant_id),
          fetchProductMappings(user.restaurant_id)
        ])
      } else {
        setMessage({ type: 'error', text: `❌ ${result.error}` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Senkronizasyon sırasında hata oluştu.' })
    } finally {
      setSyncing(false)
    }
  }

  const handleRefreshMenu = async () => {
    if (!user?.restaurant_id) return

    setLoading(true)
    try {
      await fetchGetirMenu(user.restaurant_id)
      setMessage({ type: 'success', text: '✅ Getir Food menüsü yenilendi' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Menü yenilenirken hata oluştu.' })
    } finally {
      setLoading(false)
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
      
      const response = await fetch('/api/integrations/getir/product/availability', {
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
        setGetirProducts(prevProducts => 
          prevProducts.map(product => 
            product.id === productId 
              ? { ...product, isAvailable: !currentStatus }
              : product
          )
        )
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
      const response = await fetch('/api/integrations/getir/category/availability', {
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
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Kategori ${!currentStatus ? 'aktif' : 'pasif'} hale getirildi` 
        })
        
        // Kategorilerin durumunu local state'te güncelle
        setGetirCategories(prevCategories => 
          prevCategories.map(category => 
            category.id === categoryId 
              ? { ...category, isAvailable: !currentStatus }
              : category
          )
        )
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
      <DashboardLayout user={user} onSignOut={() => router.push('/login')}>
        <div className="flex justify-center items-center h-64">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user} onSignOut={() => router.push('/login')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Getir Food Menü Yönetimi</h1>
            <p className="text-gray-600">Getir Food platformundaki menünüzü yönetin</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Bağlantı Testi
            </button>
            <button
              onClick={handleRefreshMenu}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              <CloudArrowDownIcon className="h-4 w-4 mr-2" />
              Menüyü Çek
            </button>
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {syncing ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              )}
              Senkronize Et
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message.text}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setMessage(null)}
                  className="inline-flex text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBagIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Toplam Ürün</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SparklesIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Toplam Kategori</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <LinkIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Eşleştirme</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMappings}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Senkronize</p>
                <p className="text-2xl font-bold text-gray-900">{stats.syncedProducts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Bekleyen</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingProducts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Getir Food Ürünleri ({getirProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Getir Food Kategorileri ({getirCategories.length})
            </button>
            <button
              onClick={() => setActiveTab('mappings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mappings'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ürün Eşleştirmeleri ({productMappings.length})
            </button>
            <button
              onClick={() => setActiveTab('internal')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'internal'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              İç Sistem Ürünleri ({internalProducts.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white shadow rounded-lg">
          {activeTab === 'products' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Getir Food Ürünleri</h3>
              {getirProducts.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Ürün bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">Getir Food'dan menüyü çekerek ürünleri görüntüleyebilirsiniz.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getirProducts.map((product) => {
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
                        
                        {isMapping && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-green-600 font-medium">✓ Eşleştirildi</span>
                              <span className="text-gray-500">{isMapping.internal_product_name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Getir Food Kategorileri</h3>
              {getirCategories.length === 0 ? (
                <div className="text-center py-12">
                  <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Kategori bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">Getir Food'dan menüyü çekerek kategorileri görüntüleyebilirsiniz.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getirCategories.map((category) => (
                    <div key={category.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">Sıralama: {category.sortOrder}</p>
                        </div>
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
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'mappings' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ürün Eşleştirmeleri</h3>
              {productMappings.length === 0 ? (
                <div className="text-center py-12">
                  <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Eşleştirme bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">Senkronizasyon yaparak ürün eşleştirmelerini oluşturabilirsiniz.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İç Sistem Ürünü
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Getir Food Ürünü
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Senkronizasyon
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Son Güncelleme
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {productMappings.map((mapping) => (
                        <tr key={mapping.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{mapping.internal_product_name}</div>
                            <div className="text-sm text-gray-500">{mapping.internal_product_id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{mapping.external_product_name}</div>
                            <div className="text-sm text-gray-500">{mapping.external_product_id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              mapping.sync_status === 'synced' 
                                ? 'bg-green-100 text-green-800'
                                : mapping.sync_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {mapping.sync_status === 'synced' ? 'Senkronize' : 
                               mapping.sync_status === 'pending' ? 'Bekliyor' : 'Hata'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-4">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={mapping.price_sync_enabled}
                                  onChange={(e) => handleToggleSyncOption(mapping.id, 'price_sync_enabled', e.target.checked)}
                                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="ml-2 text-xs">Fiyat</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={mapping.availability_sync_enabled}
                                  onChange={(e) => handleToggleSyncOption(mapping.id, 'availability_sync_enabled', e.target.checked)}
                                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="ml-2 text-xs">Stok</span>
                              </label>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {mapping.last_synced_at ? new Date(mapping.last_synced_at).toLocaleString('tr-TR') : 'Hiç'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'internal' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">İç Sistem Ürünleri</h3>
              {internalProducts.length === 0 ? (
                <div className="text-center py-12">
                  <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">İç ürün bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">Önce iç sisteminize ürün ekleyin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {internalProducts.map((product) => {
                    const isMapping = productMappings.find(m => m.internal_product_id === product.id)
                    
                    return (
                      <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{product.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">{product.categories?.[0]?.name || 'Kategori Yok'}</p>
                            <div className="mt-2 flex items-center space-x-2">
                              <span className="text-lg font-bold text-blue-600">₺{product.base_price.toFixed(2)}</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                product.is_available
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {product.is_available ? 'Aktif' : 'Pasif'}
                              </span>
                            </div>
                            {product.description && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>
                            )}
                          </div>
                        </div>
                        
                        {isMapping ? (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-green-600 font-medium">✓ Getir Food'da eşleştirildi</span>
                              <span className="text-gray-500">{isMapping.external_product_name}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-yellow-600 font-medium">⚠ Eşleştirilmedi</span>
                              <span className="text-gray-500">Senkronizasyon gerekli</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 