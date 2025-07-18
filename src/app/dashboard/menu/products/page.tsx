'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User, Product, Category, ProductVariant, ProductPortion, Unit } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CogIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { ArrowLeftIcon, CubeIcon, ScaleIcon } from '@heroicons/react/24/solid'

interface ProductWithCategory extends Product {
  categories?: { name: string };
}

export default function ProductsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [portions, setPortions] = useState<ProductPortion[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showVariantsModal, setShowVariantsModal] = useState(false)
  const [showPortionsModal, setShowPortionsModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([])
  const [productPortions, setProductPortions] = useState<ProductPortion[]>([])
  const [newVariant, setNewVariant] = useState({ name: '', price_modifier: 0 });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: 0,
    category_id: '',
    image_url: '',
    is_available: true,
    is_featured: false,
    preparation_time: 15
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const getTestRestaurantId = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('name', 'Lezzet Durağı')
        .single();
      
      if (error) throw error;
      return data?.id;
    } catch (error) {
      console.error('Error getting test restaurant ID:', error);
      return null;
    }
  };

  const checkAuth = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/')
      return
    }
    console.log('Current user:', currentUser);
    console.log('Restaurant ID:', currentUser.restaurant_id);
    setUser(currentUser)
    
    // Eğer kullanıcının restaurant_id'si yoksa, ilk aktif restoranı al
    let restaurantId = currentUser.restaurant_id;
    if (!restaurantId) {
      const { data: firstRestaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single()
      
      if (restaurantError || !firstRestaurant) {
        console.error('Aktif restoran bulunamadı:', restaurantError)
        setLoading(false);
        return
      }
      restaurantId = firstRestaurant.id
    }
    
    if (restaurantId) {
      await fetchData(restaurantId.toString())
    } else {
      console.log('No restaurant_id available');
      setLoading(false);
    }
  }

  const fetchData = async (restaurantId: string) => {
    try {
      console.log('Fetching data for restaurant:', restaurantId);
      
      const [productsData, categoriesData, unitsData] = await Promise.all([
        supabase.from('products').select('*, categories(name)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('name'),
        supabase.from('units').select('*').eq('restaurant_id', restaurantId).eq('is_active', true).order('name')
      ]);

      console.log('Products data:', productsData);
      console.log('Categories data:', categoriesData);
      console.log('Units data:', unitsData);

      if (productsData.error) throw productsData.error;
      if (categoriesData.error) throw categoriesData.error;
      if (unitsData.error) throw unitsData.error;

      setProducts(productsData.data || []);
      setCategories(categoriesData.data || []);
      setUnits(unitsData.data || []);
      
      console.log('Products set:', productsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductVariants = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('name');

      if (error) throw error;
      setProductVariants(data || []);
    } catch (error) {
      console.error('Error fetching product variants:', error);
    }
  };

  const fetchProductPortions = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_portions')
        .select(`
          *,
          units (
            name,
            symbol
          )
        `)
        .eq('product_id', productId)
        .order('sort_order')

      if (error) throw error
      setProductPortions(data || [])
    } catch (error) {
      console.error('Error fetching product portions:', error)
      setProductPortions([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      if (editingProduct) {
        // API endpoint ile güncelleme
        const response = await fetch('/api/products', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingProduct.id,
            name: formData.name,
            description: formData.description,
            base_price: formData.base_price,
            category_id: formData.category_id,
            image_url: formData.image_url,
            is_available: formData.is_available,
            is_featured: formData.is_featured,
            preparation_time: formData.preparation_time
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Ürün güncellenemedi')
        }

        // Güncellenen ürünü listede güncelle
        const category = categories.find(cat => cat.id === formData.category_id)
        setProducts(products.map(product => 
          product.id === editingProduct.id 
            ? { ...product, ...formData, categories: category }
            : product
        ))

        alert(data.message)
      } else {
        // Yeni ürün - API endpoint kullan
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

        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            name: formData.name,
            description: formData.description,
            base_price: formData.base_price,
            category_id: formData.category_id,
            image_url: formData.image_url,
            is_available: formData.is_available,
            is_featured: formData.is_featured,
            preparation_time: formData.preparation_time
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Ürün eklenemedi')
        }

        if (data.product) {
          setProducts([...products, data.product])
        }

        alert(data.message)
      }

      setShowModal(false)
      setEditingProduct(null)
      setFormData({
        name: '',
        description: '',
        base_price: 0,
        category_id: '',
        image_url: '',
        is_available: true,
        is_featured: false,
        preparation_time: 15
      })
    } catch (error: any) {
      console.error('Error saving product:', error)
      alert(`Hata: ${error.message}`)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      base_price: product.base_price,
      category_id: product.category_id,
      image_url: product.image_url || '',
      is_available: product.is_available,
      is_featured: product.is_featured || false,
      preparation_time: product.preparation_time || 15
    })
    setShowModal(true)
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/products?id=${productId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ürün silinemedi')
      }

      setProducts(products.filter(product => product.id !== productId))
      alert(data.message)
    } catch (error: any) {
      console.error('Error deleting product:', error)
      alert(`Hata: ${error.message}`)
    }
  }

  const toggleAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      const product = products.find(p => p.id === productId)
      if (!product) return

      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: productId,
          name: product.name,
          description: product.description,
          base_price: product.base_price,
          category_id: product.category_id,
          image_url: product.image_url,
          is_available: !currentStatus,
          is_featured: product.is_featured,
          preparation_time: product.preparation_time
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ürün durumu güncellenemedi')
      }

      setProducts(products.map(product => 
        product.id === productId 
          ? { ...product, is_available: !currentStatus }
          : product
      ))
    } catch (error: any) {
      console.error('Error updating product availability:', error)
      alert(`Hata: ${error.message}`)
    }
  }

  const openVariantsModal = (product: ProductWithCategory) => {
    setSelectedProduct(product);
    setShowVariantsModal(true);
    if (user) {
      fetchProductVariants(product.id);
    }
  };

  const openPortionsModal = (product: ProductWithCategory) => {
    setSelectedProduct(product);
    setShowPortionsModal(true);
    if (user) {
      fetchProductPortions(product.id);
    }
  };

  const handleSignOut = () => {
    router.push('/')
  }

  const handleManagePortions = async (product: Product) => {
    setSelectedProduct(product);
    setShowPortionsModal(true);
    await fetchProductPortions(product.id);
  };

  const handleAddPortion = async (portionData: {
    name: string
    description: string
    unit_id?: number
    price_modifier: number
    quantity_multiplier: number
    is_default: boolean
  }) => {
    if (!selectedProduct) return;
    try {
      const response = await fetch('/api/product-portions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          name: portionData.name,
          description: portionData.description,
          unit_id: portionData.unit_id,
          price_modifier: portionData.price_modifier,
          quantity_multiplier: portionData.quantity_multiplier,
          is_default: portionData.is_default,
          sort_order: productPortions.length
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Porsiyon eklenemedi')
      }

      // Porsiyonları yeniden yükle
      await fetchProductPortions(selectedProduct.id);
      alert(data.message)
    } catch (error: any) {
      console.error('Error adding portion:', error);
      alert(`Hata: ${error.message}`)
    }
  };

  const handleDeletePortion = async (portionId: number) => {
    if (!selectedProduct || !confirm('Bu porsiyonu silmek istediğinizden emin misiniz?')) return;
    try {
      const response = await fetch(`/api/product-portions?id=${portionId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Porsiyon silinemedi')
      }

      // Porsiyonları yeniden yükle
      await fetchProductPortions(selectedProduct.id);
      alert(data.message)
    } catch (error: any) {
      console.error('Error deleting portion:', error);
      alert(`Hata: ${error.message}`)
    }
  };

  const handleTogglePortionStatus = async (portionId: number, currentStatus: boolean) => {
    if(!selectedProduct) return;
    try {
      const portion = productPortions.find(p => p.id === portionId)
      if (!portion) return

      const response = await fetch('/api/product-portions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: portionId,
          name: portion.name,
          description: portion.description,
          unit_id: portion.unit_id,
          price_modifier: portion.price_modifier,
          quantity_multiplier: portion.quantity_multiplier,
          is_default: portion.is_default,
          is_active: !currentStatus,
          sort_order: (portion as any).sort_order || 0
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Porsiyon durumu güncellenemedi')
      }

      // Porsiyonları yeniden yükle
      await fetchProductPortions(selectedProduct.id);
    } catch (error: any) {
      console.error('Error toggling portion status:', error);
      alert(`Hata: ${error.message}`)
    }
  };

  const handleAddVariant = async () => {
    if (!selectedProduct || !newVariant.name) return;
    try {
      const response = await fetch('/api/product-variants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          name: newVariant.name,
          price_modifier: newVariant.price_modifier
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Seçenek eklenemedi')
      }

      if (data.variant) {
        setProductVariants([...productVariants, data.variant]);
      }
      setNewVariant({ name: '', price_modifier: 0 }); // Formu sıfırla
      alert(data.message)
    } catch (error: any) {
      console.error('Error adding variant:', error);
      alert(`Hata: ${error.message}`)
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('Bu seçeneği silmek istediğinizden emin misiniz?')) return;
    try {
      const response = await fetch(`/api/product-variants?id=${variantId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Seçenek silinemedi')
      }

      setProductVariants(productVariants.filter((variant) => variant.id !== variantId));
      alert(data.message)
    } catch (error: any) {
      console.error('Error deleting variant:', error);
      alert(`Hata: ${error.message}`)
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} onSignOut={handleSignOut}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      user={user} 
      onSignOut={handleSignOut}
      allowedRoles={['admin', 'manager', 'staff']}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">Ürün Yönetimi</h1>
          <p className="text-gray-600">Menü ürünlerinizi yönetin</p>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="overflow-x-auto">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz ürün eklenmemiş</h3>
                <p className="text-gray-500 mb-6">Menünüze ilk ürününüzü ekleyerek başlayın.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  İlk Ürünü Ekle
                </button>
              </div>
            ) : (
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
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.image_url && (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="h-10 w-10 rounded-full object-cover mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.description}</div>
                            {product.is_featured && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Öne Çıkan
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.categories?.name || 'Kategori Yok'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₺{product.base_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.is_available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.is_available ? 'Mevcut' : 'Tükendi'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openVariantsModal(product)}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded"
                            title="Seçenekler"
                          >
                            <CogIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleManagePortions(product)}
                            className="p-1 text-gray-600 hover:text-blue-600"
                            title="Porsiyonları Yönet"
                          >
                            <ScaleIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => toggleAvailability(product.id, product.is_available)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.is_available
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {product.is_available ? 'Mevcut' : 'Tükendi'}
                          </button>
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-lg bg-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingProduct(null)
                    setFormData({
                      name: '',
                      description: '',
                      base_price: 0,
                      category_id: '',
                      image_url: '',
                      is_available: true,
                      is_featured: false,
                      preparation_time: 15
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sol Kolon */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ürün Adı *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Örn: Karışık Pizza"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Açıklama
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={4}
                        placeholder="Ürün açıklaması..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategori *
                      </label>
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Kategori Seçin</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Sağ Kolon */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temel Fiyat (₺) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.base_price}
                        onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value) || 0})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ürün Görseli
                      </label>
                      <div className="space-y-2">
                        <input
                          type="url"
                          value={formData.image_url}
                          onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://example.com/image.jpg"
                        />
                        {formData.image_url && (
                          <div className="mt-2">
                            <img 
                              src={formData.image_url} 
                              alt="Ürün önizleme" 
                              className="w-full h-32 object-cover rounded-lg border"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hazırlama Süresi (Dakika)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={formData.preparation_time}
                        onChange={(e) => setFormData({...formData, preparation_time: parseInt(e.target.value || '15')})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="15"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Durum Seçenekleri */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Ürün Durumu</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="is_available"
                        checked={formData.is_available}
                        onChange={(e) => setFormData({...formData, is_available: e.target.checked})}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_available" className="text-sm font-medium text-gray-700">
                        Ürün Mevcut
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="is_featured"
                        checked={formData.is_featured}
                        onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_featured" className="text-sm font-medium text-gray-700">
                        Öne Çıkan Ürün
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Butonlar */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingProduct(null)
                      setFormData({
                        name: '',
                        description: '',
                        base_price: 0,
                        category_id: '',
                        image_url: '',
                        is_available: true,
                        is_featured: false,
                        preparation_time: 15
                      })
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingProduct ? 'Güncelle' : 'Ürün Ekle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Variants Modal */}
        {showVariantsModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg relative">
              <button onClick={() => setShowVariantsModal(false)} className="p-2 rounded-full hover:bg-gray-200 absolute top-2 right-2">
                <XMarkIcon className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold mb-4">"{selectedProduct.name}" Seçenekleri</h2>

              {/* Mevcut Varyantlar */}
              <div className="space-y-2 mb-6">
                {productVariants.map((variant) => (
                  <div key={variant.id} className="flex items-center justify-between p-2 border rounded-md">
                    <span>{variant.name} (+{variant.price_modifier} TL)</span>
                    <button onClick={() => handleDeleteVariant(variant.id)} className="p-1 text-red-500 hover:text-red-700">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Yeni Varyant Ekleme Formu */}
              <form onSubmit={(e) => { e.preventDefault(); handleAddVariant(); }}>
                <h3 className="text-xl font-semibold mb-2">Yeni Seçenek Ekle</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    placeholder="Seçenek Adı (Örn: Çift Lavaş)"
                    value={newVariant.name}
                    onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                    className="p-2 border rounded w-full"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Fiyat Farkı"
                    value={newVariant.price_modifier}
                    onChange={(e) => setNewVariant({ ...newVariant, price_modifier: parseFloat(e.target.value) || 0 })}
                    className="p-2 border rounded w-48"
                    required
                  />
                  <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Ekle</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Portions Modal */}
        {showPortionsModal && selectedProduct && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
              <button onClick={() => setShowPortionsModal(false)} className="p-2 rounded-full hover:bg-gray-200 absolute top-2 right-2">
                <XMarkIcon className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold mb-4">"{selectedProduct?.name}" Porsiyonları</h2>

              {/* Mevcut Porsiyonlar */}
              <div className="space-y-2 mb-6">
                {productPortions.map((portion) => (
                  <div key={portion.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <span className="font-semibold">{portion.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({portion.description})</span>
                      <span className="text-sm text-gray-700 ml-2">Fiyat: {portion.price_modifier && portion.price_modifier > 0 ? `+${portion.price_modifier}` : portion.price_modifier || 0} TL</span>
                      <span className="text-sm text-gray-700 ml-2">Çarpan: x{portion.quantity_multiplier}</span>
                      <span className="text-sm text-gray-700 ml-2">Birim: {portion.units?.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTogglePortionStatus(portion.id, portion.is_active || false)}
                        className={`p-1 rounded-full ${portion.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                      >
                        {portion.is_active ? <CheckIcon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
                      </button>
                      <button onClick={() => handleDeletePortion(portion.id)} className="p-1 text-red-500 hover:text-red-700">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Yeni Porsiyon Ekleme Formu */}
              <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const unitIdValue = formData.get('unit_id');
                  const priceModifier = parseFloat(formData.get('price_modifier') as string);
                  
                  // price_modifier validasyonu
                  if (priceModifier < -9.99 || priceModifier > 9.99) {
                    alert('Fiyat farkı -9.99 ile 9.99 arasında olmalıdır. Daha büyük fiyat farkları için lütfen temel ürün fiyatını ayarlayın.');
                    return;
                  }
                  
                  handleAddPortion({
                      name: formData.get('name') as string,
                      description: formData.get('description') as string,
                      unit_id: unitIdValue ? parseInt(unitIdValue as string) : undefined,
                      price_modifier: priceModifier,
                      quantity_multiplier: parseFloat(formData.get('quantity_multiplier') as string),
                      is_default: (formData.get('is_default') === 'on')
                  });
                  e.currentTarget.reset();
              }}>
                  <h3 className="text-xl font-semibold mb-2">Yeni Porsiyon Ekle</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input name="name" placeholder="Porsiyon Adı (Örn: Küçük)" className="p-2 border rounded" required />
                      <input name="description" placeholder="Açıklama (Örn: 25cm Pizza)" className="p-2 border rounded" />
                      <div>
                        <input 
                          name="price_modifier" 
                          type="number" 
                          step="0.01" 
                          min="-9.99" 
                          max="9.99"
                          placeholder="Fiyat Farkı (-9.99 ile 9.99)" 
                          className="p-2 border rounded w-full" 
                          required 
                        />
                        <small className="text-gray-500 text-xs">Not: -9.99 ile 9.99 arasında olmalıdır</small>
                      </div>
                      <input name="quantity_multiplier" type="number" step="0.01" placeholder="Miktar Çarpanı (Örn: 0.75)" className="p-2 border rounded" required />
                      <select name="unit_id" className="p-2 border rounded">
                          <option value="">Birim Seç</option>
                          {units.map(unit => (
                              <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>
                          ))}
                      </select>
                      <div className="flex items-center">
                          <input name="is_default" type="checkbox" className="mr-2" />
                          <label>Varsayılan Porsiyon</label>
                      </div>
                  </div>
                  <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Porsiyon Ekle</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 