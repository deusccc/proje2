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
import { DeliveryService } from '../lib/deliveryService'
import { DeliveryAssignment } from '../types'

interface HistoryScreenProps {
  navigation: any
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const [deliveries, setDeliveries] = useState<DeliveryAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDeliveries = async () => {
    try {
      // Şimdilik örnek data
      const mockDeliveries: DeliveryAssignment[] = [
        {
          id: '1',
          order_id: '1001',
          courier_id: 'courier1',
          status: 'delivered',
          delivery_fee: 15,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          order: {
            id: 1001,
            restaurant_id: 'rest1',
            created_at: new Date().toISOString(),
            customer_name: 'Ahmet Yılmaz',
            customer_phone: '+90 555 123 45 67',
            customer_address: 'Kadıköy, İstanbul',
            customer_address_lat: '40.9909',
            customer_address_lng: '29.0303',
            customer_address_description: 'Apartman girişi',
            status: 'delivered',
            total_amount: 85.50,
            subtotal: 70.50,
            tax_amount: 5.00,
            delivery_fee: 15,
            discount_amount: 0,
            payment_method: 'cash',
            payment_status: 'paid',
            order_items: [],
            location_verification_token: null,
            is_location_verified: true,
            customer_id: null,
          }
        },
        {
          id: '2',
          order_id: '1002',
          courier_id: 'courier1',
          status: 'delivered',
          delivery_fee: 12,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString(),
          delivered_at: new Date(Date.now() - 3600000).toISOString(),
          order: {
            id: 1002,
            restaurant_id: 'rest1',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            customer_name: 'Ayşe Demir',
            customer_phone: '+90 555 987 65 43',
            customer_address: 'Beşiktaş, İstanbul',
            customer_address_lat: '41.0422',
            customer_address_lng: '29.0083',
            customer_address_description: 'Ofis binası',
            status: 'delivered',
            total_amount: 62.00,
            subtotal: 50.00,
            tax_amount: 4.00,
            delivery_fee: 12,
            discount_amount: 4.00,
            payment_method: 'card',
            payment_status: 'paid',
            order_items: [],
            location_verification_token: null,
            is_location_verified: true,
            customer_id: null,
          }
        },
      ]
      setDeliveries(mockDeliveries)
    } catch (error) {
      console.error('Load deliveries error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadDeliveries()
  }

  useEffect(() => {
    loadDeliveries()
  }, [])

  const renderDelivery = ({ item }: { item: DeliveryAssignment }) => (
    <TouchableOpacity
      style={styles.deliveryCard}
      onPress={() => navigation.navigate('OrderDetail', { assignment: item })}
    >
      <View style={styles.deliveryHeader}>
        <Text style={styles.orderId}>Sipariş #{item.order_id}</Text>
        <Text style={styles.deliveryFee}>₺{item.delivery_fee}</Text>
      </View>
      
      <View style={styles.customerInfo}>
        <Ionicons name="person-outline" size={16} color="#6B7280" />
        <Text style={styles.customerName}>{item.order?.customer_name}</Text>
      </View>
      
      <View style={styles.addressInfo}>
        <Ionicons name="location-outline" size={16} color="#6B7280" />
        <Text style={styles.address} numberOfLines={1}>
          {item.order?.customer_address}
        </Text>
      </View>
      
      <View style={styles.deliveryFooter}>
        <View style={styles.timeInfo}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.deliveryTime}>
            {item.delivered_at 
              ? new Date(item.delivered_at).toLocaleString('tr-TR')
              : 'Teslim edilmedi'
            }
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Teslim Edildi</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Teslimat geçmişi yükleniyor...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={deliveries}
        renderItem={renderDelivery}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Henüz teslimat geçmişiniz yok</Text>
            <Text style={styles.emptySubtext}>
              Tamamladığınız teslimatlar burada görünecek
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
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
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  deliveryFee: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deliveryTime: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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