// Trendyol Yemek API Types
export interface TrendyolYemekConfig {
  environment: 'production' | 'staging'
  baseUrl?: string
  
  // Authentication bilgileri
  sellerId: string // Satıcı ID (Cari ID)
  restaurantId: string // Restoran ID
  integrationReferenceCode: string // Entegrasyon Referans Kodu
  apiKey: string // API Key
  apiSecret: string // API Secret
  token: string // Token
  
  // Opsiyonel ayarlar
  timeout?: number
  retryCount?: number
}

export interface TrendyolYemekResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface TrendyolYemekRateLimit {
  limit: number
  remaining: number
  resetTime: number
}

// Product Types
export interface TrendyolYemekProduct {
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
  variants?: TrendyolYemekProductVariant[]
  modifierGroups?: TrendyolYemekModifierGroup[]
}

export interface TrendyolYemekProductVariant {
  id: string
  name: string
  price: number
  isAvailable: boolean
}

export interface TrendyolYemekModifierGroup {
  id: string
  name: string
  required: boolean
  minSelection: number
  maxSelection: number
  modifiers: TrendyolYemekModifier[]
}

export interface TrendyolYemekModifier {
  id: string
  name: string
  price: number
  isAvailable: boolean
}

// Category Types
export interface TrendyolYemekCategory {
  id: string
  name: string
  description?: string
  isAvailable: boolean
  sortOrder: number
  imageUrl?: string
  parentId?: string
}

// Order Types
export interface TrendyolYemekOrder {
  id: string
  orderNumber: string
  status: 'NEW' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  
  // Müşteri bilgileri
  customer: {
    name: string
    phone: string
    email?: string
  }
  
  // Adres bilgileri
  deliveryAddress: {
    title: string
    address: string
    district: string
    city: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  
  // Sipariş detayları
  items: TrendyolYemekOrderItem[]
  totalAmount: number
  deliveryFee: number
  serviceFee: number
  discountAmount: number
  finalAmount: number
  
  // Ödeme bilgileri
  paymentMethod: 'CASH' | 'CARD' | 'ONLINE'
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED'
  
  // Teslimat bilgileri
  deliveryType: 'DELIVERY' | 'PICKUP'
  estimatedDeliveryTime?: string
  actualDeliveryTime?: string
  
  // Notlar
  customerNote?: string
  restaurantNote?: string
}

export interface TrendyolYemekOrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  selectedVariant?: {
    id: string
    name: string
    price: number
  }
  selectedModifiers?: Array<{
    groupId: string
    groupName: string
    modifiers: Array<{
      id: string
      name: string
      price: number
      quantity: number
    }>
  }>
  specialInstructions?: string
}

// Request Types
export interface TrendyolYemekOrderUpdateRequest {
  orderId: string
  status: 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  estimatedDeliveryTime?: string
  rejectReason?: string
  notes?: string
}

export interface TrendyolYemekMenuUpdateRequest {
  categories?: TrendyolYemekCategory[]
  products?: TrendyolYemekProduct[]
  deletedCategoryIds?: string[]
  deletedProductIds?: string[]
}

export interface TrendyolYemekRestaurantStatusRequest {
  isOpen: boolean
  reason?: string
  reopenTime?: string
}

// Restaurant Types
export interface TrendyolYemekRestaurant {
  id: string
  name: string
  description?: string
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
    email?: string
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
  categories: TrendyolYemekCategory[]
  products: TrendyolYemekProduct[]
}

// Sync Types
export interface TrendyolYemekSyncResult {
  success: boolean
  message: string
  syncedItems: number
  failedItems: number
  errors?: string[]
}

// Webhook Types
export interface TrendyolYemekWebhookPayload {
  eventType: string
  eventTime: string
  data: any
}

// Backward compatibility - TrendyolGo aliases
export type TrendyolGoConfig = TrendyolYemekConfig
export type TrendyolGoResponse<T> = TrendyolYemekResponse<T>
export type TrendyolGoProduct = TrendyolYemekProduct
export type TrendyolGoCategory = TrendyolYemekCategory
export type TrendyolGoOrder = TrendyolYemekOrder
export type TrendyolGoOrderUpdateRequest = TrendyolYemekOrderUpdateRequest
export type TrendyolGoMenuUpdateRequest = TrendyolYemekMenuUpdateRequest
export type TrendyolGoRestaurantStatusRequest = TrendyolYemekRestaurantStatusRequest
export type TrendyolGoRestaurant = TrendyolYemekRestaurant
export type TrendyolGoRateLimit = TrendyolYemekRateLimit
export type TrendyolGoSyncResult = TrendyolYemekSyncResult
export type TrendyolGoWebhookPayload = TrendyolYemekWebhookPayload 