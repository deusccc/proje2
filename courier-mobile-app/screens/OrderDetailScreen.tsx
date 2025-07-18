import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import MapView, { Marker } from 'react-native-maps'
import * as Location from 'expo-location'

import { DeliveryService } from '../lib/deliveryService'
import { LocationService } from '../lib/locationService'
import { DeliveryAssignment, User, Courier, MapRegion } from '../types'
import { getCustomerVerifiedIcon, getCustomerUnverifiedIcon } from '../lib/iconManager'

interface OrderDetailScreenProps {
  navigation: any
  route: {
    params: {
      assignment: DeliveryAssignment
    }
  }
}

export default function OrderDetailScreen({ navigation, route }: OrderDetailScreenProps) {
  const { assignment } = route.params
  
  // Nested veri yapısını parse et
  const order = (assignment as any).orders || assignment.order
  const restaurant = order?.restaurants || assignment.restaurant
  
  const [currentStatus, setCurrentStatus] = useState<DeliveryAssignment['status']>(assignment.status)
  const [loading, setLoading] = useState(false)

  const handleStatusUpdate = async (newStatus: DeliveryAssignment['status']) => {
    setLoading(true)
    try {
      let success = false
      
      switch (newStatus) {
        case 'picked_up':
          success = await DeliveryService.markAsPickedUp(assignment.id)
          break
        case 'on_the_way':
          success = await DeliveryService.markAsOnTheWay(assignment.id)
          break
        case 'delivered':
          success = await DeliveryService.markAsDelivered(assignment.id)
          break
      }

      if (success) {
        setCurrentStatus(newStatus)
        Alert.alert('Başarılı', 'Durum güncellendi')
        
        if (newStatus === 'delivered') {
          navigation.goBack()
        }
      } else {
        Alert.alert('Hata', 'Durum güncellenemedi')
      }
    } catch (error) {
      console.error('Status update error:', error)
      Alert.alert('Hata', 'Durum güncellenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const openMaps = () => {
    if (order?.customer_address_lat && order?.customer_address_lng) {
      const lat = parseFloat(order.customer_address_lat)
      const lng = parseFloat(order.customer_address_lng)
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      Linking.openURL(url)
    }
  }

  const callCustomer = () => {
    if (order?.customer_phone) {
      Linking.openURL(`tel:${order.customer_phone}`)
    }
  }

  const getNextAction = () => {
    switch (currentStatus) {
      case 'accepted':
        return { text: 'Siparişi Aldım', action: 'picked_up' as const }
      case 'picked_up':
        return { text: 'Yola Çıktım', action: 'on_the_way' as const }
      case 'on_the_way':
        return { text: 'Teslim Ettim', action: 'delivered' as const }
      default:
        return null
    }
  }

  const nextAction = getNextAction()

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Order Info */}
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>Sipariş #{assignment.order_id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) }]}>
            <Text style={styles.statusText}>{getStatusText(currentStatus)}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>
          <View style={styles.customerInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>{order?.customer_name}</Text>
            </View>
            <TouchableOpacity style={styles.infoRow} onPress={callCustomer}>
              <Ionicons name="call-outline" size={20} color="#3B82F6" />
              <Text style={[styles.infoText, { color: '#3B82F6' }]}>
                {order?.customer_phone}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teslimat Adresi</Text>
          <TouchableOpacity style={styles.addressCard} onPress={openMaps}>
            <View style={styles.addressInfo}>
              <Ionicons name="location-outline" size={20} color="#6B7280" />
              <Text style={styles.addressText}>
                {order?.customer_address}
              </Text>
            </View>
            <Ionicons name="navigate-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Map */}
        {order?.customer_address_lat && order?.customer_address_lng && (() => {
          const lat = parseFloat(order.customer_address_lat)
          const lng = parseFloat(order.customer_address_lng)
          
          // Koordinat değerlerini kontrol et
          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            return null
          }
          
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Harita</Text>
              {Platform.OS !== 'web' && (
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: lat,
                      longitude: lng,
                    }}
                    image={order?.is_location_verified ? getCustomerVerifiedIcon() : getCustomerUnverifiedIcon()}
                    title="Teslimat Adresi"
                    description={order?.customer_address}
                  />
                </MapView>
              )}
            </View>
          )
        })()}

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sipariş Detayları</Text>
          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Toplam Tutar:</Text>
              <Text style={styles.detailValue}>₺{order?.total_amount}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Teslimat Ücreti:</Text>
              <Text style={styles.detailValue}>₺{assignment.delivery_fee}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ödeme Yöntemi:</Text>
              <Text style={styles.detailValue}>
                {order?.payment_method === 'cash' ? 'Nakit' : 'Kart'}
              </Text>
            </View>
            {order?.notes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Notlar:</Text>
                <Text style={styles.detailValue}>{order.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Durum Geçmişi</Text>
          <View style={styles.timeline}>
            <TimelineItem
              title="Sipariş Atandı"
              time={assignment.created_at}
              isCompleted={true}
            />
            {assignment.accepted_at && (
              <TimelineItem
                title="Sipariş Kabul Edildi"
                time={assignment.accepted_at}
                isCompleted={true}
              />
            )}
            {assignment.picked_up_at && (
              <TimelineItem
                title="Sipariş Alındı"
                time={assignment.picked_up_at}
                isCompleted={true}
              />
            )}
            {assignment.delivered_at && (
              <TimelineItem
                title="Sipariş Teslim Edildi"
                time={assignment.delivered_at}
                isCompleted={true}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Button */}
      {nextAction && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.actionButtonDisabled]}
            onPress={() => handleStatusUpdate(nextAction.action)}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>{nextAction.text}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

// Timeline Item Component
interface TimelineItemProps {
  title: string
  time: string
  isCompleted: boolean
}

const TimelineItem: React.FC<TimelineItemProps> = ({ title, time, isCompleted }) => (
  <View style={styles.timelineItem}>
    <View style={[styles.timelineIcon, isCompleted && styles.timelineIconCompleted]}>
      {isCompleted && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
    </View>
    <View style={styles.timelineContent}>
      <Text style={styles.timelineTitle}>{title}</Text>
      <Text style={styles.timelineTime}>{new Date(time).toLocaleString('tr-TR')}</Text>
    </View>
  </View>
)

// Helper Functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'assigned': return '#F59E0B'
    case 'accepted': return '#10B981'
    case 'picked_up': return '#3B82F6'
    case 'on_the_way': return '#8B5CF6'
    case 'delivered': return '#10B981'
    default: return '#6B7280'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'assigned': return 'Atandı'
    case 'accepted': return 'Kabul Edildi'
    case 'picked_up': return 'Alındı'
    case 'on_the_way': return 'Yolda'
    case 'delivered': return 'Teslim Edildi'
    default: return status
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  customerInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  map: {
    height: 200,
    borderRadius: 8,
  },
  orderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconCompleted: {
    backgroundColor: '#10B981',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timelineTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  actionContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  webMapPlaceholder: {
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webMapText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
}) 