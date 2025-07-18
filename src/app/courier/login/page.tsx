'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/index'
import { 
  TruckIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function CourierLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Kurye kullanıcısını kontrol et
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('role', 'courier')
        .single()

      if (userError || !user) {
        throw new Error('Kurye kullanıcısı bulunamadı')
      }

      // Şifre kontrolü
      if (user.password !== password) {
        throw new Error('Kullanıcı adı veya şifre hatalı')
      }

      if (!user.is_active) {
        throw new Error('Hesabınız aktif değil. Lütfen yönetici ile iletişime geçin.')
      }

      // Kurye bilgilerini al
      const { data: courier, error: courierError } = await supabase
        .from('couriers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (courierError || !courier) {
        throw new Error('Kurye bilgileri alınamadı')
      }

      if (!courier.is_active) {
        throw new Error('Kurye hesabınız aktif değil. Lütfen yönetici ile iletişime geçin.')
      }

      // Kurye giriş yaptığında son konum güncellemesini kaydet
      await supabase
        .from('couriers')
        .update({ 
          last_location_update: new Date().toISOString()
        })
        .eq('id', courier.id)

      // Kullanıcı verilerini localStorage'a kaydet
      const userData = {
        ...user,
        courier: courier
      }
      localStorage.setItem('user', JSON.stringify(userData))
      
      // Kurye dashboard'una yönlendir
      router.push('/courier/dashboard')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <TruckIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Kurye Girişi
          </h1>
          <p className="text-gray-600">
            Teslimat sistemine giriş yapın
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
              placeholder="Kullanıcı adınızı girin"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Şifre
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                placeholder="Şifrenizi girin"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Giriş yapılıyor...
              </>
            ) : (
              <>
                <TruckIcon className="w-5 h-5 mr-2" />
                Giriş Yap
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center text-sm text-gray-600">
            <p className="font-medium mb-3">Test Kurye Kullanıcıları:</p>
            <div className="space-y-2">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900">kurye1 / kurye123</p>
                <p className="text-xs text-gray-500">Kurye Bir</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900">kurye2 / kurye123</p>
                <p className="text-xs text-gray-500">Kurye İki</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 