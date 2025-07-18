// Getir Food API Types
export interface GetirFoodConfig {
  appSecretKey: string
  restaurantSecretKey: string
  baseUrl?: string
  environment?: 'sandbox' | 'production'
}

export interface GetirFoodAuthResponse {
  token: string
  expiresIn: number
  tokenType: string
}

export interface GetirFoodResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface GetirFoodRateLimit {
  limit: number
  remaining: number
  resetTime: number
}

// Product Types
export interface GetirFoodProduct {
  id: string
  name: string
  description?: string
  price: number
  originalPrice?: number
  isAvailable: boolean
  categoryId: string
  imageUrl?: string
  ingredients?: string[]
  allergens?: string[]
  nutritionalInfo?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
  variants?: GetirFoodProductVariant[]
  modifierGroups?: GetirFoodModifierGroup[]
}

export interface GetirFoodProductVariant {
  id: string
  name: string
  price: number
  isAvailable: boolean
}

export interface GetirFoodModifierGroup {
  id: string
  name: string
  required: boolean
  minSelection: number
  maxSelection: number
  modifiers: GetirFoodModifier[]
}

export interface GetirFoodModifier {
  id: string
  name: string
  price: number
  isAvailable: boolean
}

// Category Types
export interface GetirFoodCategory {
  id: string
  name: string
  description?: string
  isAvailable: boolean
  sortOrder: number
  imageUrl?: string
  parentId?: string
}

// Order Types
export interface GetirFoodOrder {
  id: string
  orderNumber: string
  status: 'NEW' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  customer: {
    id: string
    name: string
    phone: string
    email?: string
  }
  deliveryAddress: {
    title: string
    address: string
    district: string
    city: string
    coordinates: {
      latitude: number
      longitude: number
    }
    floor?: string
    apartment?: string
    buildingNumber?: string
    doorNumber?: string
    note?: string
  }
  items: GetirFoodOrderItem[]
  totalAmount: number
  deliveryFee: number
  serviceFee: number
  discountAmount: number
  finalAmount: number
  paymentMethod: 'CASH' | 'CARD' | 'ONLINE'
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED'
  deliveryType: 'DELIVERY' | 'PICKUP'
  estimatedDeliveryTime?: string
  actualDeliveryTime?: string
  customerNote?: string
  restaurantNote?: string
}

export interface GetirFoodOrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  variants?: Array<{
    id: string
    name: string
    price: number
  }>
  modifiers?: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  note?: string
}

// Request Types
export interface GetirFoodOrderUpdateRequest {
  orderId: string
  status: GetirFoodOrder['status']
  estimatedDeliveryTime?: string
  rejectReason?: string
  notes?: string
}

export interface GetirFoodMenuUpdateRequest {
  categories?: GetirFoodCategory[]
  products?: GetirFoodProduct[]
}

export interface GetirFoodRestaurantStatusRequest {
  isOpen: boolean
  reason?: string
  reopenTime?: string
}

// Restaurant Types
export interface GetirFoodRestaurant {
  id: string
  name: string
  description: string
  isOpen: boolean
  address: {
    title: string
    address: string
    district: string
    city: string
    coordinates: {
      latitude: number
      longitude: number
    }
  }
  contact: {
    phone: string
    email: string
  }
  operatingHours: Array<{
    day: string
    openTime: string
    closeTime: string
    isOpen: boolean
  }>
  deliverySettings: {
    minOrderAmount: number
    maxDeliveryDistance: number
    deliveryFee: number
    estimatedDeliveryTime: number
  }
  categories: GetirFoodCategory[]
  products: GetirFoodProduct[]
}

// Sync Types
export interface GetirFoodSyncResult {
  success: boolean
  message: string
  syncedItems: number
  failedItems: number
  errors?: string[]
}

export interface GetirFoodSyncOptions {
  syncProducts: boolean
  syncCategories: boolean
  syncPrices: boolean
  syncAvailability: boolean
  dryRun?: boolean
}

// Webhook Types
export interface GetirFoodWebhookPayload {
  event: 'order.created' | 'order.updated' | 'order.cancelled'
  data: GetirFoodOrder
  timestamp: string
  signature: string
}

// Integration Settings
export interface GetirFoodIntegrationSettings {
  id: string
  restaurant_id: string
  platform: 'getir'
  is_active: boolean
  api_key: string
  api_secret: string
  restaurant_external_id: string
  sync_settings: {
    auto_sync_products: boolean
    auto_sync_categories: boolean
    auto_sync_prices: boolean
    auto_sync_availability: boolean
    sync_interval_minutes: number
  }
  webhook_settings: {
    webhook_url?: string
    webhook_secret?: string
    events: string[]
  }
  last_sync_at?: string
  created_at: string
  updated_at: string
} 