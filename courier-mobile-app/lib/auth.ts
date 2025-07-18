import { supabase } from './supabase'
import { User, Courier } from '../types'

export interface AuthResponse {
  success: boolean
  user?: User
  courier?: Courier
  error?: string
}

export class AuthService {
  static async login(username: string, password: string): Promise<AuthResponse> {
    try {
      // Kullanıcı bilgilerini kontrol et
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .eq('role', 'courier')
        .single()

      if (userError || !userData) {
        return {
          success: false,
          error: 'Kullanıcı adı veya şifre hatalı'
        }
      }

      // Şifre kontrolü (basit kontrol - production'da hash kullanılmalı)
      if (userData.password !== password) {
        return {
          success: false,
          error: 'Kullanıcı adı veya şifre hatalı'
        }
      }

      // Kurye bilgilerini al
      const { data: courierData, error: courierError } = await supabase
        .from('couriers')
        .select('*')
        .eq('user_id', userData.id)
        .eq('is_active', true)
        .single()

      if (courierError || !courierData) {
        return {
          success: false,
          error: 'Kurye bilgileri bulunamadı'
        }
      }

      return {
        success: true,
        user: userData,
        courier: courierData
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: 'Giriş yaparken hata oluştu'
      }
    }
  }

  static async logout(): Promise<void> {
    // Supabase session'ı temizle
    await supabase.auth.signOut()
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user as any
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  static async updateCourierStatus(courierId: string, status: string): Promise<boolean> {
    try {
      const newStatus = status === 'available' ? 'available' : 'offline'
      const isAvailable = status === 'available'
      
      // Direkt SQL UPDATE kullan (RPC cache sorunu nedeniyle)
      const { data, error } = await supabase
        .from('couriers')
        .update({
          courier_status: newStatus,
          is_available: isAvailable,
          updated_at: new Date().toISOString()
        })
        .eq('id', courierId)
        .select()
        .single()

      if (error) {
        console.error('Supabase UPDATE error:', error)
        return false
      }

      if (!data) {
        console.error('Kurye bulunamadı veya güncellenmedi')
        return false
      }

      // Sonucu doğrula
      if (data.courier_status !== newStatus || data.is_available !== isAvailable) {
        console.error('UPDATE sonucu beklenen değerlerle eşleşmiyor:', {
          expected: { status: newStatus, available: isAvailable },
          actual: { status: data.courier_status, available: data.is_available }
        })
        return false
      }

      return true
    } catch (error) {
      console.error('Update courier status error:', error)
      return false
    }
  }
} 