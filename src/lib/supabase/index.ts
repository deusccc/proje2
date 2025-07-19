import { createClient } from '@supabase/supabase-js'
import { User } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are not configured. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') {
    return null
  }
  
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      return JSON.parse(userStr) as User
    } catch (e) {
      console.error('Error parsing user from localStorage', e)
      localStorage.removeItem('user')
      return null
    }
  }
  return null
} 