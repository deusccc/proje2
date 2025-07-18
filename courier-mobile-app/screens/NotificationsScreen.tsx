import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NotificationService } from '../lib/notificationService'
import { CourierNotification } from '../types'

interface NotificationsScreenProps {
  navigation: any
}

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<CourierNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadNotifications = async () => {
    try {
      // Şimdilik örnek data
      const mockNotifications: CourierNotification[] = [
        {
          id: '1',
          courier_id: 'courier1',
          type: 'order_assigned',
          title: 'Yeni Sipariş Atandı',
          message: 'Size yeni bir sipariş atandı. Lütfen kontrol edin.',
          data: {},
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          courier_id: 'courier1',
          type: 'system',
          title: 'Sistem Bildirimi',
          message: 'Uygulama güncellendi. Yeni özellikler mevcut.',
          data: {},
          is_read: true,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ]
      setNotifications(mockNotifications)
    } catch (error) {
      console.error('Load notifications error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const success = await NotificationService.markAsRead(notificationId)
      if (success) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, is_read: true }
              : notification
          )
        )
      }
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadNotifications()
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const renderNotification = ({ item }: { item: CourierNotification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.notificationIcon}>
        <Ionicons 
          name={getNotificationIcon(item.type)} 
          size={24} 
          color={item.is_read ? '#6B7280' : '#3B82F6'} 
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.is_read && styles.unreadTitle]}>
          {item.title}
        </Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>
          {new Date(item.created_at).toLocaleString('tr-TR')}
        </Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Henüz bildiriminiz yok</Text>
            <Text style={styles.emptySubtext}>
              Yeni bildirimler burada görünecek
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'order_assigned':
      return 'bicycle-outline'
    case 'order_completed':
      return 'checkmark-circle-outline'
    case 'system':
      return 'information-circle-outline'
    default:
      return 'notifications-outline'
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unreadCard: {
    borderColor: '#3B82F6',
    backgroundColor: '#F8FAFC',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  unreadTitle: {
    color: '#111827',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
}) 