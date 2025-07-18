import * as Notifications from 'expo-notifications'
import { supabase } from './supabase'
import { NotificationPermission, CourierNotification } from '../types'
import { Alert, Platform } from 'react-native'
import Constants from 'expo-constants'

// Expo Go kontrolü
const isExpoGo = Constants.appOwnership === 'expo'

// Bildirim davranışını ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export class NotificationService {
  static async requestPermission(): Promise<NotificationPermission> {
    try {
      // Expo Go'da push notification desteklenmediği için sadece local notification izni
      const { status } = await Notifications.requestPermissionsAsync()
      
      if (isExpoGo) {
        console.warn('Expo Go: Push notification desteklenmiyor, sadece local notification kullanılacak')
      }
      
      return {
        granted: status === 'granted',
        canAskAgain: status !== 'denied',
        status: status === 'granted' ? 'granted' : 
                status === 'denied' ? 'denied' : 'undetermined'
      }
    } catch (error) {
      console.error('Notification permission error:', error)
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      }
    }
  }

  static async showLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      // Web platformunda notification gösterme
      if (Platform.OS === 'web') {
        Alert.alert(title, body)
        return
      }

      const permission = await this.requestPermission()
      if (!permission.granted) {
        // İzin yoksa alert göster
        Alert.alert(title, body)
        return
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Hemen göster
      })
    } catch (error) {
      console.error('Local notification error:', error)
      // Hata durumunda alert göster
      Alert.alert(title, body)
    }
  }

  // Expo Go için push notification devre dışı
  static async registerForPushNotifications(): Promise<string | null> {
    if (isExpoGo) {
      console.warn('Expo Go: Push notification desteklenmiyor')
      return null
    }

    try {
      // Development build'de push notification desteği
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== 'granted') {
        return null
      }

      const token = await Notifications.getExpoPushTokenAsync()
      return token.data
    } catch (error) {
      console.error('Push notification registration error:', error)
      return null
    }
  }

  static async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    if (isExpoGo) {
      console.warn('Expo Go: Push notification desteklenmiyor')
      return false
    }

    try {
      const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
      }

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      })

      return response.ok
    } catch (error) {
      console.error('Send push notification error:', error)
      return false
    }
  }

  // Kurye bildirimlerini getir
  static async getCourierNotifications(courierId: string): Promise<CourierNotification[]> {
    try {
      const { data, error } = await supabase
        .from('courier_notifications')
        .select('*')
        .eq('courier_id', courierId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Bildirim getirme hatası:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Bildirim servisi hatası:', error)
      return []
    }
  }

  // Bildirimi okundu olarak işaretle
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('courier_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) {
        console.error('Bildirim güncelleme hatası:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Bildirim güncelleme hatası:', error)
      return false
    }
  }

  // Yeni sipariş bildirimi
  static async showNewOrderNotification(orderData: any): Promise<void> {
    const title = '🆕 Yeni Sipariş!'
    const body = `${orderData.restaurant_name} - ₺${orderData.delivery_fee}`
    
    await this.showLocalNotification(title, body, {
      type: 'new_order',
      orderId: orderData.id,
    })
  }

  // Sipariş durumu bildirimi
  static async showOrderStatusNotification(status: string, orderData: any): Promise<void> {
    let title = ''
    let body = ''
    
    switch (status) {
      case 'accepted':
        title = '✅ Sipariş Kabul Edildi'
        body = `${orderData.restaurant_name} - Restorana gidin`
        break
      case 'picked_up':
        title = '📦 Sipariş Alındı'
        body = `${orderData.customer_name} - Müşteriye götürün`
        break
      case 'delivered':
        title = '🎉 Sipariş Teslim Edildi'
        body = `₺${orderData.delivery_fee} kazandınız!`
        break
      default:
        title = '📱 Sipariş Güncellendi'
        body = `Durum: ${status}`
    }
    
    await this.showLocalNotification(title, body, {
      type: 'order_status',
      orderId: orderData.id,
      status,
    })
  }

  // Sistem bildirimi
  static async showSystemNotification(message: string): Promise<void> {
    await this.showLocalNotification('📢 Sistem Bildirimi', message, {
      type: 'system',
    })
  }

  // Bildirim listener'ı başlat
  static startNotificationListener(courierId: string) {
    if (isExpoGo) {
      console.log('Expo Go: Bildirim listener başlatıldı (sadece local)')
    }
    
    // Bildirim tıklandığında
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data
      console.log('Bildirim tıklandı:', data)
      
      // Bildirim tipine göre aksiyon al
      if (data?.type === 'new_order') {
        // Yeni sipariş sayfasına git
      } else if (data?.type === 'order_status') {
        // Sipariş detay sayfasına git
      }
    })

    return subscription
  }

  // Bildirim listener'ı durdur
  static stopNotificationListener(subscription?: any) {
    if (subscription) {
      subscription.remove()
    }
  }
} 