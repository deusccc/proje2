'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User, Category } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

export default function CategoriesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sort_order: 0,
    is_active: true
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
    await fetchCategories(currentUser)
  }

  const fetchCategories = async (user: User) => {
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

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      if (editingCategory) {
        // API endpoint ile güncelleme
        const response = await fetch('/api/categories', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingCategory.id,
            name: formData.name,
            description: formData.description,
            sort_order: formData.sort_order,
            is_active: formData.is_active
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Kategori güncellenemedi')
        }

        setCategories(categories.map(cat => 
          cat.id === editingCategory.id 
            ? { ...cat, ...formData }
            : cat
        ))

        alert(data.message)
      } else {
        // Yeni kategori - API endpoint kullan
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

        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            name: formData.name,
            description: formData.description,
            sort_order: formData.sort_order,
            is_active: formData.is_active
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Kategori eklenemedi')
        }

        if (data.category) {
          setCategories([...categories, data.category])
        }

        alert(data.message)
      }

      setShowModal(false)
      setEditingCategory(null)
      setFormData({
        name: '',
        description: '',
        sort_order: 0,
        is_active: true
      })
    } catch (error: any) {
      console.error('Error saving category:', error)
      alert(`Hata: ${error.message}`)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      sort_order: category.sort_order,
      is_active: category.is_active
    })
    setShowModal(true)
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kategori silinemedi')
      }

      setCategories(categories.filter(cat => cat.id !== categoryId))
      alert(data.message)
    } catch (error: any) {
      console.error('Error deleting category:', error)
      alert(`Hata: ${error.message}`)
    }
  }

  const toggleStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: categoryId,
          name: categories.find(cat => cat.id === categoryId)?.name || '',
          description: categories.find(cat => cat.id === categoryId)?.description || '',
          sort_order: categories.find(cat => cat.id === categoryId)?.sort_order || 0,
          is_active: !currentStatus
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kategori durumu güncellenemedi')
      }

      setCategories(categories.map(cat => 
        cat.id === categoryId 
          ? { ...cat, is_active: !currentStatus }
          : cat
      ))
    } catch (error: any) {
      console.error('Error updating category status:', error)
      alert(`Hata: ${error.message}`)
    }
  }

  const handleSignOut = () => {
    router.push('/')
  }

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
    <DashboardLayout user={user} onSignOut={handleSignOut}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kategori Yönetimi</h1>
            <p className="text-gray-600">Ürün kategorilerinizi yönetin</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Yeni Kategori
          </button>
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sıralama
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
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{category.name}</div>
                        <div className="text-sm text-gray-500">{category.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {category.sort_order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        category.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {category.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(category.id, category.is_active)}
                          className={`${
                            category.is_active 
                              ? 'text-red-600 hover:text-red-800' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {category.is_active ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Kategori Adı
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Açıklama
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sıralama
                    </label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Aktif
                    </label>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingCategory(null)
                        setFormData({
                          name: '',
                          description: '',
                          sort_order: 0,
                          is_active: true
                        })
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                    >
                      {editingCategory ? 'Güncelle' : 'Kaydet'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 