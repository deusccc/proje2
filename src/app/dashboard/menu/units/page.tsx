'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/index';
import { getCurrentUser } from '@/lib/supabase/index';
import DashboardLayout from '@/components/DashboardLayout';
import { Unit, User } from '@/types';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function UnitsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    symbol: ''
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      
      // Eğer kullanıcının restaurant_id'si yoksa, ilk aktif restoranı al
      let restaurantId = currentUser.restaurant_id
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
        fetchUnits(restaurantId.toString());
      }
    }
    setLoading(false);
  };

  const fetchUnits = async (restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingUnit) {
        // API endpoint ile güncelleme
        const response = await fetch('/api/units', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingUnit.id,
            name: formData.name,
            symbol: formData.symbol,
            is_active: editingUnit.is_active
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Birim güncellenemedi')
        }

        alert(data.message)
      } else {
        // Yeni birim - API endpoint kullan
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

        const response = await fetch('/api/units', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            name: formData.name,
            symbol: formData.symbol
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Birim eklenemedi')
        }

        if (data.unit) {
          setUnits([...units, data.unit])
        }

        alert(data.message)
      }

      setShowModal(false);
      setEditingUnit(null);
      setFormData({ name: '', symbol: '' });
      
      // Listeyi yenile
      if (user && user.restaurant_id) {
        fetchUnits(user.restaurant_id);
      }
    } catch (error: any) {
      console.error('Error saving unit:', error);
      alert(`Hata: ${error.message}`)
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      symbol: unit.symbol
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    
    if (confirm('Bu birimi silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/units?id=${id}`, {
          method: 'DELETE',
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Birim silinemedi')
        }

        setUnits(units.filter(unit => unit.id !== id))
        alert(data.message)
      } catch (error: any) {
        console.error('Error deleting unit:', error);
        alert(`Hata: ${error.message}`)
      }
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    if (!user) return;
    
    try {
      const unit = units.find(u => u.id === id)
      if (!unit) return

      const response = await fetch('/api/units', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          name: unit.name,
          symbol: unit.symbol,
          is_active: !currentStatus
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Birim durumu güncellenemedi')
      }

      setUnits(units.map(unit => 
        unit.id === id 
          ? { ...unit, is_active: !currentStatus }
          : unit
      ))
    } catch (error: any) {
      console.error('Error updating unit status:', error);
      alert(`Hata: ${error.message}`)
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} onSignOut={handleSignOut}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onSignOut={handleSignOut}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Birim Yönetimi</h1>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Yeni Birim
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {units.map((unit) => (
              <li key={unit.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {unit.symbol}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {unit.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Sembol: {unit.symbol}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleStatus(unit.id, unit.is_active || false)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        unit.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {unit.is_active ? 'Aktif' : 'Pasif'}
                    </button>
                    <button
                      onClick={() => handleEdit(unit)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingUnit ? 'Birim Düzenle' : 'Yeni Birim'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Birim Adı
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sembol
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingUnit(null);
                      setFormData({ name: '', symbol: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {editingUnit ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 