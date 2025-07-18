'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User, Category, Product } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  CubeIcon,
  TagIcon,
  EyeIcon,
  EyeSlashIcon,
  ScaleIcon
} from '@heroicons/react/24/outline'

interface ProductWithCategory extends Product {
  categories?: {
    name: string
  }
}

export default function MenuPage() {
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalProducts: 0,
    activeProducts: 0,
    featuredProducts: 0
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
    await fetchMenuData(currentUser)
  }

  const fetchMenuData = async (user: User) => {
    try {
      // Eğer kullanıcının restaurant_id'si yoksa, ilk aktif restoranı al
      let restaurantId = user.restaurant_id
      if (!restaurantId) {
        const { data: firstRestaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single()
        
        if (restaurantError || !firstRestaurant) {
          console.error('Aktif restoran bulunamadı:', restaurantError)
          throw new Error('Aktif restoran bulunamadı')
        }
        restaurantId = firstRestaurant.id
      }

      // Kategorileri getir
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order')

      // Ürünleri getir
      const { data: productsData } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      setCategories(categoriesData || [])
      setProducts(productsData || [])

      // İstatistikleri hesapla
      setStats({
        totalCategories: categoriesData?.length || 0,
        totalProducts: productsData?.length || 0,
        activeProducts: productsData?.filter(p => p.is_available).length || 0,
        featuredProducts: productsData?.filter(p => p.is_featured).length || 0
      })
    } catch (error) {
      console.error('Menü verileri alınırken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  // Real-time subscription ekle
  useEffect(() => {
    if (!user) return

    const subscription = supabase
      .channel('menu-page')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'categories' },
        (payload) => {
          // Kullanıcının restoranına ait kategori mi kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            fetchMenuData(user)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'categories' },
        (payload) => {
          // Kullanıcının restoranına ait kategori mi kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            fetchMenuData(user)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'categories' },
        (payload) => {
          // Kullanıcının restoranına ait kategori mi kontrol et
          if (payload.old.restaurant_id === user.restaurant_id) {
            fetchMenuData(user)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'products' },
        (payload) => {
          // Kullanıcının restoranına ait ürün mü kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            fetchMenuData(user)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          // Kullanıcının restoranına ait ürün mü kontrol et
          if (payload.new.restaurant_id === user.restaurant_id) {
            fetchMenuData(user)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'products' },
        (payload) => {
          // Kullanıcının restoranına ait ürün mü kontrol et
          if (payload.old.restaurant_id === user.restaurant_id) {
            fetchMenuData(user)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'product_variants' },
        (payload) => {
          fetchMenuData(user)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'product_variants' },
        (payload) => {
          fetchMenuData(user)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'product_portions' },
        (payload) => {
          fetchMenuData(user)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'product_portions' },
        (payload) => {
          fetchMenuData(user)
        }
      )
      .subscribe()

    // 4 saniyede bir otomatik güncelleme
    const autoRefreshInterval = setInterval(() => {
      fetchMenuData(user)
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearInterval(autoRefreshInterval)
    }
  }, [user])

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: !currentStatus })
        .eq('id', productId)

      if (error) throw error

      // Ürün listesini güncelle
      setProducts(products.map(product => 
        product.id === productId 
          ? { ...product, is_available: !currentStatus }
          : product
      ))

      // İstatistikleri güncelle
      const updatedProducts = products.map(product => 
        product.id === productId 
          ? { ...product, is_available: !currentStatus }
          : product
      )
      const activeProducts = updatedProducts.filter(p => p.is_available).length
      setStats(prev => ({ ...prev, activeProducts }))
    } catch (error) {
      console.error('Error updating product status:', error)
    }
  }

  const handleSignOut = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <DashboardLayout user={user} onSignOut={handleSignOut} allowedRoles={['admin', 'manager']}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user} onSignOut={handleSignOut} allowedRoles={['admin', 'manager']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menü Yönetimi</h1>
            <p className="text-gray-600">Kategoriler ve ürünlerinizi yönetin</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Kategori</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <TagIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Ürün</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <CubeIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Ürünler</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeProducts}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500">
                <EyeIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Öne Çıkan</p>
                <p className="text-2xl font-bold text-gray-900">{stats.featuredProducts}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500">
                <CubeIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Categories Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-blue-500">
                <TagIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.totalCategories}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kategoriler</h3>
            <p className="text-gray-600 text-sm mb-4">Ürün kategorilerinizi yönetin</p>
            <Link 
              href="/dashboard/menu/categories"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 w-full justify-center"
            >
              <TagIcon className="h-4 w-4 mr-2" />
              Kategorileri Yönet
            </Link>
          </div>

          {/* Products Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-green-500">
                <CubeIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.totalProducts}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ürünler</h3>
            <p className="text-gray-600 text-sm mb-4">Ürünlerinizi ve seçeneklerini yönetin</p>
            <Link 
              href="/dashboard/menu/products"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 w-full justify-center"
            >
              <CubeIcon className="h-4 w-4 mr-2" />
              Ürünleri Yönet
            </Link>
          </div>

          {/* Units Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-purple-500">
                <ScaleIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">-</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Birimler</h3>
            <p className="text-gray-600 text-sm mb-4">Ölçü birimlerinizi yönetin</p>
            <Link 
              href="/dashboard/menu/units"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 w-full justify-center"
            >
              <ScaleIcon className="h-4 w-4 mr-2" />
              Birimleri Yönet
            </Link>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Ürünler</h2>
              <Link 
                href="/dashboard/menu/products"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700"
              >
                <CubeIcon className="h-4 w-4 mr-2" />
                Ürünleri Yönet
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ürün
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fiyat
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
                {products.slice(0, 10).map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {product.categories?.name || 'Kategori Yok'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₺{product.base_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.is_available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.is_available ? 'Mevcut' : 'Tükendi'}
                        </span>
                        {product.is_featured && (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                            Öne Çıkan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleProductStatus(product.id, product.is_available)}
                          className={`p-1 rounded-full ${
                            product.is_available 
                              ? 'text-red-600 hover:text-red-800' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {product.is_available ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {products.length > 10 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Link
                href="/dashboard/menu/products"
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                Tüm ürünleri görüntüle ({products.length} ürün)
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 