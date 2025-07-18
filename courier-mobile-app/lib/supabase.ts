import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://nijfrqlruefhnjnynnfx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamZycWxydWVmaG5qbnlubmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTY1NTAsImV4cCI6MjA2NjM3MjU1MH0.MFs7dkuOQzyUhLmsjNMrOqA6WBBuUGhSzWxJJh-hBDA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}) 